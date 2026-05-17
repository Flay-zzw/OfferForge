import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.file_parser import extract_text, is_supported
from app.minimax import format_resume_markdown, interview_chat, evaluate_interview, generate_question_answer
from app.models import User, Question, Evaluation
from app.schemas import (
    ResumeExtractResponse,
    InterviewChatRequest,
    InterviewChatResponse,
    InterviewEvaluateRequest,
    InterviewEvaluateResponse,
)

router = APIRouter()


@router.post("/mock-interview/resume/extract", response_model=ResumeExtractResponse)
async def resume_extract_endpoint(
    file: UploadFile = File(...),
    target_position: str = Form(""),
    user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="请上传一个文件")

    if not is_supported(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式，请上传 PDF / Word / 图片文件: {file.filename}",
        )

    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="上传的文件为空")

        if len(content) > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="文件大小超过 20MB 限制")

        raw_text = await extract_text(file.filename, content)

        resume_markdown = await format_resume_markdown(raw_text)

        return ResumeExtractResponse(
            resume_markdown=resume_markdown,
            resume_raw=raw_text,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ImportError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"简历提取失败: {str(e)}")


@router.post("/mock-interview/chat", response_model=InterviewChatResponse)
async def interview_chat_endpoint(
    request: InterviewChatRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        history_dicts = [
            {"role": m.role, "content": m.content}
            for m in request.conversation_history
        ]

        # If user clicked "我不知道", save question + AI-generated answer to question bank
        if request.skip_action == "dont_know" and history_dicts:
            last_interviewer_msg = None
            for m in reversed(history_dicts):
                if m.get("role") == "interviewer":
                    last_interviewer_msg = m.get("content", "")
                    break

            if last_interviewer_msg:
                try:
                    answer = await generate_question_answer(last_interviewer_msg)
                    db_question = Question(
                        company="未知",
                        difficulty="中等",
                        question=last_interviewer_msg,
                        answer=answer,
                    )
                    db.add(db_question)
                    await db.commit()
                except Exception:
                    pass  # Don't block the interview flow if saving fails

        message, is_complete = await interview_chat(
            resume_text=request.resume_text,
            history=history_dicts,
            target_position=request.target_position,
            skip_action=request.skip_action,
        )

        return InterviewChatResponse(message=message, is_complete=is_complete)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"面试对话失败: {str(e)}")


@router.post("/mock-interview/evaluate", response_model=InterviewEvaluateResponse)
async def interview_evaluate_endpoint(
    request: InterviewEvaluateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        history_dicts = [
            {"role": m.role, "content": m.content}
            for m in request.conversation_history
        ]

        result = await evaluate_interview(
            resume_text=request.resume_text,
            history=history_dicts,
            target_position=request.target_position,
        )

        # Save evaluation to DB
        evaluation = Evaluation(
            user_id=user.userid,
            overall_score=result["overall_score"],
            strengths=json.dumps(result["strengths"], ensure_ascii=False),
            weaknesses=json.dumps(result["weaknesses"], ensure_ascii=False),
            learning_path=json.dumps(result["learning_path"], ensure_ascii=False),
            detailed_feedback=result["detailed_feedback"],
            target_position=request.target_position or None,
        )
        db.add(evaluation)
        await db.commit()

        return InterviewEvaluateResponse(
            overall_score=result["overall_score"],
            strengths=result["strengths"],
            weaknesses=result["weaknesses"],
            learning_path=result["learning_path"],
            detailed_feedback=result["detailed_feedback"],
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"面试评估失败: {str(e)}")