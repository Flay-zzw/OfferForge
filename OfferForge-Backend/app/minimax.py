import json
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

PARSE_SYSTEM_PROMPT = """你是一个面试题分析专家。用户会给你一段面试经历（面经），你需要：
1. 仔细阅读面经内容，识别出每一道独立的面试题
2. 评估每道题的难度（简单/中等/困难）
3. 为每道题生成详细、有条理的参考答案

注意事项：
- 如果面经中有"几道题"、"多个问题"等模糊描述，请尽量还原具体问题
- 如果面经中提到"系统设计"、"架构设计"等，请展开为具体的设计问题
- 参考答案要用清晰的分点方式回答，便于阅读
- 不要使用 Markdown 表格，保持文本格式
- 每道题的参考答案应该包含核心思路和关键要点

请严格按照以下 JSON 格式返回，不要返回任何其他内容：
[
  {
    "question": "面试题内容（完整表述）",
    "difficulty": "简单/中等/困难",
    "answer": "参考答案（用数字列表格式，如：1. 第一点\\n2. 第二点\\n3. 第三点）"
  }
]"""

CHAT_SYSTEM_PROMPT = """你是 OfferForge 面试助手，一个专业的面试辅导 AI。你可以帮助用户：
- 解答面试相关的问题
- 提供面试技巧和建议
- 分析面试题目并给出参考答案
- 模拟面试场景

请用专业、友好的语气回答用户的问题。"""

RESUME_ANALYZE_PROMPT = """你是一个资深技术面试官和简历分析专家。用户会提供一份简历内容，你需要：

1. 仔细分析简历中的技能、项目经历、工作经历、教育背景等
2. 基于简历内容，预测面试官可能会问哪些面试题
3. 每道题需要标注：
   - 难度（简单/中等/困难）
   - 分类（如：Java基础、数据库、系统设计、项目经验、算法、前端、网络、操作系统等）
   - 预测理由（为什么面试官会根据简历中的哪部分内容问这道题）
4. 给出整体评估和建议（简历的优势、可能被深挖的点、准备建议）

注意事项：
- 问题要紧密结合简历中的实际内容，不要问与简历无关的问题
- 对简历中提到的技术栈要深入挖掘
- 项目经历部分要问具体的实现细节、挑战、技术选型等
- 难度要根据问题深度合理分配
- 答案用清晰的分点方式
- 不要使用 Markdown 表格
- 预测 5-10 道题为宜

请严格按照以下 JSON 格式返回，不要返回任何其他内容：
{
  "predicted_questions": [
    {
      "question": "面试题内容（完整表述）",
      "difficulty": "简单/中等/困难",
      "category": "分类名称",
      "reason": "根据简历中 XXXX 内容，面试官可能会问这个问题"
    }
  ],
  "overall_analysis": "整体面试准备建议，包含简历优势、可能被深挖的点、建议重点准备的方向等"
}"""


async def call_minimax(messages: list[dict]) -> str:
    url = f"{settings.MINIMAX_BASE_URL}/text/chatcompletion_v2"
    headers = {
        "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "MiniMax-M2.7",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 4096,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def parse_interview(content: str, company: str) -> list[dict]:
    user_message = f"公司：{company}\n\n面经内容：\n{content}" if company else f"面经内容：\n{content}"

    messages = [
        {"role": "system", "content": PARSE_SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    try:
        result = await call_minimax(messages)
        cleaned = result.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        parsed = json.loads(cleaned)
        if not isinstance(parsed, list):
            parsed = [parsed]

        for item in parsed:
            item.setdefault("question", "")
            item.setdefault("difficulty", "中等")
            item.setdefault("answer", "")

        valid_questions = [q for q in parsed if q.get("question")]
        if not valid_questions:
            raise ValueError("未能从面经中提取到有效题目，请确保面经内容包含面试问题")

        return valid_questions
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse MiniMax response as JSON: {e}, response: {result}")
        raise ValueError(f"AI 返回格式错误，解析失败：{str(e)}")
    except Exception as e:
        logger.error(f"Error calling MiniMax API: {e}")
        raise


async def chat_with_minimax(message: str, history: list[dict] | None = None) -> str:
    messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]

    if history:
        for msg in history:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

    messages.append({"role": "user", "content": message})

    try:
        return await call_minimax(messages)
    except Exception as e:
        logger.error(f"Error in chat with MiniMax: {e}")
        raise


async def analyze_resume(resume_content: str, target_position: str = "") -> dict:
    user_message = f"目标岗位：{target_position}\n\n简历内容：\n{resume_content}" if target_position else f"简历内容：\n{resume_content}"

    messages = [
        {"role": "system", "content": RESUME_ANALYZE_PROMPT},
        {"role": "user", "content": user_message},
    ]

    try:
        result = await call_minimax(messages)
        cleaned = result.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        parsed = json.loads(cleaned)

        if not isinstance(parsed, dict):
            parsed = {"predicted_questions": [] if not isinstance(parsed, list) else parsed, "overall_analysis": ""}

        parsed.setdefault("predicted_questions", [])
        parsed.setdefault("overall_analysis", "")

        for q in parsed["predicted_questions"]:
            q.setdefault("question", "")
            q.setdefault("difficulty", "中等")
            q.setdefault("category", "通用")
            q.setdefault("reason", "")

        if not parsed["predicted_questions"]:
            raise ValueError("未能从简历中提取到预测的面试题，请确保简历内容包含足够的技术细节")

        return parsed
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse MiniMax response as JSON: {e}, response: {result}")
        raise ValueError(f"AI 返回格式错误，解析失败：{str(e)}")
    except Exception as e:
        logger.error(f"Error analyzing resume with MiniMax: {e}")
        raise
