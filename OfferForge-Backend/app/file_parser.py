import io
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# ---------- PDF ----------
def _extract_pdf_text(content: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        raise ImportError("请安装 pypdf: pip install pypdf")

    reader = PdfReader(io.BytesIO(content))
    texts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            texts.append(text)
    return "\n".join(texts)


# ---------- Word ----------
def _extract_docx_text(content: bytes) -> str:
    try:
        from docx import Document
    except ImportError:
        raise ImportError("请安装 python-docx: pip install python-docx")

    doc = Document(io.BytesIO(content))
    texts = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(texts)


# ---------- Image OCR ----------
_EASYOCR_READER = None


def _get_ocr_reader():
    global _EASYOCR_READER
    if _EASYOCR_READER is None:
        try:
            import easyocr
        except ImportError:
            raise ImportError(
                "请安装 easyocr: pip install easyocr\n"
                "如果安装速度慢，建议先安装 PyTorch (CPU 版即可):\n"
                "  pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu\n"
                "  pip install easyocr"
            )
        logger.info("正在初始化 OCR 模型（首次运行会下载模型，约 100MB）...")
        _EASYOCR_READER = easyocr.Reader(["ch_sim", "en"], gpu=False)
        logger.info("OCR 模型加载完成")
    return _EASYOCR_READER


def _extract_image_text(content: bytes) -> str:
    try:
        from PIL import Image
    except ImportError:
        raise ImportError("请安装 Pillow: pip install Pillow")

    reader = _get_ocr_reader()
    image = Image.open(io.BytesIO(content))
    results = reader.readtext(image, detail=0, paragraph=True)
    return "\n".join(results)


# ---------- Public API ----------
SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".docx", ".doc",
    ".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp",
}


def get_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def is_supported(filename: str) -> bool:
    return get_extension(filename) in SUPPORTED_EXTENSIONS


async def extract_text(filename: str, content: bytes) -> str:
    """根据文件扩展名自动选择解析方式，返回纯文本内容。"""
    ext = get_extension(filename)

    if ext == ".pdf":
        text = _extract_pdf_text(content)
    elif ext in (".docx", ".doc"):
        text = _extract_docx_text(content)
    elif ext in (".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp"):
        text = _extract_image_text(content)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")

    text = text.strip()
    if not text:
        raise ValueError(f"未能从文件中提取到任何文字，请检查文件是否有效: {filename}")

    logger.info(f"成功从 {filename} 提取 {len(text)} 字")
    return text
