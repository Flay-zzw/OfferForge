from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.file_parser import extract_text, is_supported
from app.minimax import analyze_resume
from app.schemas import ResumeAnalyzeResponse, PredictedQuestion

router = APIRouter()


@router.post("/resume/analyze", response_model=ResumeAnalyzeResponse)
async def analyze_resume_endpoint(
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

        # 文件大小限制 20MB
        if len(content) > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="文件大小超过 20MB 限制")

        # 从文件中提取文字
        resume_text = await extract_text(file.filename, content)

        # AI 分析
        result = await analyze_resume(resume_text, target_position)

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
    except ImportError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 分析失败: {str(e)}")
