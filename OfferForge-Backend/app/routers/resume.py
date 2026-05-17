from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.dependencies import get_current_user
from app.file_parser import extract_text, is_supported
from app.minimax import analyze_resume
from app.models import User
from app.schemas import ResumeAnalyzeResponse

router = APIRouter()


@router.post("/resume/analyze", response_model=ResumeAnalyzeResponse)
async def analyze_resume_endpoint(
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

        result = await analyze_resume(raw_text, target_position)

        return ResumeAnalyzeResponse(
            predicted_questions=result["predicted_questions"],
            overall_analysis=result["overall_analysis"],
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ImportError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"简历分析失败: {str(e)}")