from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.file_parser import extract_text, is_supported
from app.minimax import format_resume_markdown, interview_chat, evaluate_interview
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
async def interview_chat_endpoint(request: InterviewChatRequest):
    try:
        history_dicts = [
            {"role": m.role, "content": m.content}
            for m in request.conversation_history
        ]

        message, is_complete = await interview_chat(
            resume_text=request.resume_text,
            history=history_dicts,
            target_position=request.target_position,
        )

        return InterviewChatResponse(message=message, is_complete=is_complete)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"面试对话失败: {str(e)}")


@router.post("/mock-interview/evaluate", response_model=InterviewEvaluateResponse)
async def interview_evaluate_endpoint(request: InterviewEvaluateRequest):
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

        return InterviewEvaluateResponse(
            overall_score=result["overall_score"],
            strengths=result["strengths"],
            weaknesses=result["weaknesses"],
            learning_path=result["learning_path"],
            detailed_feedback=result["detailed_feedback"],
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"面试评估失败: {str(e)}")