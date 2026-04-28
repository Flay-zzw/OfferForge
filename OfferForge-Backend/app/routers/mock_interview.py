from fastapi import APIRouter, HTTPException

from app.minimax import analyze_resume
from app.schemas import (
    ResumeAnalyzeRequest,
    ResumeAnalyzeResponse,
    PredictedQuestion,
)

router = APIRouter()


@router.post("/resume/analyze", response_model=ResumeAnalyzeResponse)
async def analyze_resume_endpoint(request: ResumeAnalyzeRequest):
    try:
        result = await analyze_resume(request.resume_content, request.target_position)
        predicted_questions = [
            PredictedQuestion(
                question=q.get("question", ""),
                difficulty=q.get("difficulty", "中等"),
                category=q.get("category", "通用"),
                reason=q.get("reason", ""),
            )
            for q in result.get("predicted_questions", [])
        ]
        return ResumeAnalyzeResponse(
            predicted_questions=predicted_questions,
            overall_analysis=result.get("overall_analysis", ""),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 分析失败: {str(e)}")
