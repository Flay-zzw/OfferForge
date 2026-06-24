import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.minimax import chat_with_minimax, parse_interview
from app.models import Question, User
from app.schemas import (
    ChatRequest,
    ChatResponse,
    InterviewParseRequest,
    InterviewParseResponse,
    ParsedQuestion,
    QuestionCreate,
    QuestionResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/interviews/parse", response_model=InterviewParseResponse)
async def parse_interview_endpoint(
    request: InterviewParseRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        parsed_questions = await parse_interview(request.content, request.company)
    except Exception as e:
        detail = str(e).strip() or "AI 解析面经失败，请稍后重试或精简面经内容后再次提交"
        logger.exception("Parse interview failed")
        raise HTTPException(status_code=500, detail=detail)

    saved = []
    for q in parsed_questions:
        db_question = Question(
            company=request.company,
            difficulty=q.get("difficulty", "中等"),
            question=q.get("question", ""),
            answer=q.get("answer", ""),
        )
        db.add(db_question)
        saved.append(
            ParsedQuestion(
                question=q.get("question", ""),
                difficulty=q.get("difficulty", "中等"),
                answer=q.get("answer", ""),
            )
        )

    await db.commit()

    return InterviewParseResponse(questions=saved)


@router.get("/questions", response_model=list[QuestionResponse])
async def list_questions(
    company: str | None = None,
    difficulty: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Question).order_by(Question.created_at.desc())
    if company:
        stmt = stmt.where(Question.company.contains(company))
    if difficulty:
        stmt = stmt.where(Question.difficulty == difficulty)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/questions/{question_id}", response_model=QuestionResponse)
async def get_question(question_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    return question


@router.delete("/questions/{question_id}")
async def delete_question(question_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    await db.delete(question)
    await db.commit()
    return {"message": "删除成功"}


@router.post("/questions", response_model=QuestionResponse)
async def create_question(
    question: QuestionCreate, db: AsyncSession = Depends(get_db)
):
    db_question = Question(**question.model_dump())
    db.add(db_question)
    await db.commit()
    await db.refresh(db_question)
    return db_question


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    user: User = Depends(get_current_user),
):
    try:
        reply = await chat_with_minimax(request.message, request.history)
        return ChatResponse(reply=reply)
    except Exception as e:
        detail = str(e).strip() or "AI 助手暂时无法响应，请稍后重试"
        logger.exception("Chat failed")
        raise HTTPException(status_code=500, detail=detail)
