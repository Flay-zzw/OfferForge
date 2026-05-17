import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.minimax import generate_study_plan
from app.models import User, Evaluation
from app.schemas import (
    EvaluationResponse,
    EvaluationListItem,
    EvaluationStatsResponse,
    StudyPlanResponse,
)

router = APIRouter()


@router.get("/evaluations", response_model=list[EvaluationListItem])
async def list_evaluations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Evaluation)
        .where(Evaluation.user_id == user.userid)
        .order_by(desc(Evaluation.created_at))
        .limit(20)
    )
    evaluations = result.scalars().all()
    return [
        EvaluationListItem(
            id=ev.id,
            overall_score=ev.overall_score,
            strengths=json.loads(ev.strengths),
            weaknesses=json.loads(ev.weaknesses),
            target_position=ev.target_position,
            created_at=ev.created_at,
        )
        for ev in evaluations
    ]


@router.get("/evaluations/stats", response_model=EvaluationStatsResponse)
async def get_evaluation_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Evaluation.overall_score)
        .where(Evaluation.user_id == user.userid)
        .order_by(Evaluation.created_at.asc())
    )
    scores = [row[0] for row in result.all()]
    total_count = len(scores)

    if total_count == 0:
        return EvaluationStatsResponse(
            scores=[],
            average_score=0.0,
            total_count=0,
            latest_score=None,
            score_change=None,
        )

    avg = sum(scores) / total_count
    latest = scores[-1]
    score_change = scores[-1] - scores[-2] if total_count >= 2 else None

    return EvaluationStatsResponse(
        scores=scores,
        average_score=round(avg, 1),
        total_count=total_count,
        latest_score=latest,
        score_change=score_change,
    )


@router.get("/evaluations/{evaluation_id}", response_model=EvaluationResponse)
async def get_evaluation(
    evaluation_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Evaluation).where(
            Evaluation.id == evaluation_id,
            Evaluation.user_id == user.userid,
        )
    )
    ev = result.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="评估记录不存在")

    return EvaluationResponse(
        id=ev.id,
        user_id=ev.user_id,
        overall_score=ev.overall_score,
        strengths=json.loads(ev.strengths),
        weaknesses=json.loads(ev.weaknesses),
        learning_path=json.loads(ev.learning_path),
        detailed_feedback=ev.detailed_feedback,
        target_position=ev.target_position,
        created_at=ev.created_at,
    )


@router.post("/evaluations/generate-study-plan", response_model=StudyPlanResponse)
async def generate_study_plan_endpoint(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Evaluation)
        .where(Evaluation.user_id == user.userid)
        .order_by(Evaluation.created_at.asc())
    )
    evaluations = result.scalars().all()

    if not evaluations:
        raise HTTPException(status_code=400, detail="暂无评估记录，请先完成至少一次模拟面试评估")

    summary_parts = []
    for i, ev in enumerate(evaluations, 1):
        strengths = json.loads(ev.strengths)
        weaknesses = json.loads(ev.weaknesses)
        date_str = ev.created_at.strftime("%Y-%m-%d") if ev.created_at else "未知日期"
        summary_parts.append(
            f"第{i}次评估（{date_str}）：\n"
            f"分数：{ev.overall_score}/100\n"
            f"优点：{'；'.join(strengths) if strengths else '无'}\n"
            f"不足：{'；'.join(weaknesses) if weaknesses else '无'}\n"
        )
    summary = "\n---\n".join(summary_parts)

    try:
        plan = await generate_study_plan(summary)
        return StudyPlanResponse(
            focus_areas=plan["focus_areas"],
            weekly_plan=plan["weekly_plan"],
            long_term_goals=plan["long_term_goals"],
            resource_recommendations=plan["resource_recommendations"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成学习计划失败: {str(e)}")