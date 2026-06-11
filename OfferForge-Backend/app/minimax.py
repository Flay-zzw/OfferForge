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

RESUME_REVIEW_PROMPT = """你是一位资深 HR 和简历优化专家。用户会提供一份简历内容和目标岗位，你需要对这份简历进行全面评估，给出具体的修改建议和评分。

## 评估维度（每个维度 0-100 分）

1. **格式排版**：简历的结构是否清晰、排版是否美观、层次是否分明
2. **内容完整度**：是否包含了必要的模块（个人信息、教育背景、工作经历、项目经验、技能等）
3. **技能匹配度**：简历中的技能与目标岗位的匹配程度
4. **经历描述质量**：工作/项目经历是否使用了 STAR 法则、是否有量化成果
5. **语言表达**：用词是否专业、表达是否简洁有力、是否有错别字或语病

## 综合评分

综合评分 = 各维度加权平均（格式排版 10%、内容完整度 15%、技能匹配度 30%、经历描述质量 30%、语言表达 15%），结果四舍五入取整。

## 建议要求

- 修改建议要具体到某个模块或某段内容，指出原文问题和具体改进方案
- 按优先级排序：high（紧急）> medium（一般）> low（可选）
- 如果提供了目标岗位，分析简历与岗位的匹配度
- 列出详细匹配的技能点和缺失的技能点

## 输出格式

请严格按照以下 JSON 格式返回，不要返回任何其他内容：
{
  "overall_score": 72,
  "dimensions": [
    {"name": "格式排版", "score": 80, "comment": "整体结构清晰，但部分段落过于密集，建议增加留白"},
    {"name": "内容完整度", "score": 70, "comment": "缺少个人总结/求职意向模块"},
    {"name": "技能匹配度", "score": 65, "comment": "Java 相关技能描述充分，但缺少微服务相关经验"},
    {"name": "经历描述质量", "score": 68, "comment": "项目经历有一定描述但缺少量化指标"},
    {"name": "语言表达", "score": 75, "comment": "用词基本专业，个别描述冗长需要精简"}
  ],
  "strengths": [
    "技术栈描述完整，涵盖主流框架",
    "项目经验丰富，有多样化的项目背景"
  ],
  "weaknesses": [
    "缺少量化成果，难以评估实际贡献",
    "技能描述偏泛，没有突出重点技能",
    "排版过于紧凑，可读性不足"
  ],
  "suggestions": [
    {
      "section": "项目经历",
      "original_text": "负责后端接口开发与维护",
      "issue": "描述过于笼统，缺少量化成果",
      "suggestion": "改为「设计并开发了 15+ RESTful API 接口，QPS 从 200 提升至 800，系统可用性达到 99.9%」，使用具体数据量化成果",
      "priority": "high"
    },
    {
      "section": "技能列表",
      "original_text": "熟悉 Java、Python、Spring、MySQL、Redis、Docker",
      "issue": "技能罗列平铺直叙，没有突出精通程度",
      "suggestion": "按熟练度分层展示，将最擅长的技能前置，如「精通：Java、Spring Boot、MySQL；熟悉：Python、Redis；了解：Docker、K8s」",
      "priority": "medium"
    }
  ],
  "position_match": {
    "matched": ["Java 开发经验", "Spring 框架", "数据库设计"],
    "missing": ["微服务架构经验", "容器化部署经验", "团队管理经验"],
    "score": 60,
    "advice": "建议补充微服务相关的项目经验，或通过学习 Docker/K8s 相关课程来弥补不足"
  },
  "summary": "## 简历评估总结\\n\\n您的简历整体结构清晰，技术栈描述较为完整。主要问题集中在：\\n\\n1. **缺少量化成果**：项目经历中几乎没有使用数据来支撑你的贡献\\n2. **技能描述过于宽泛**：建议按熟练度分层\\n3. **与目标岗位有差距**：缺少微服务和容器化相关经验\\n\\n重点关注高优先级的修改建议，它们对简历质量提升效果最明显。"
}

## 注意事项
- 必须返回合法的 JSON，不要使用 Markdown 代码块包裹
- 所有字段都必须填写，不能为空
- dimensions 必须包含全部 5 个维度
- suggestions 建议 3-8 条
- strengths 和 weaknesses 各 3-5 条
- 如果用户没有提供目标岗位，position_match 字段设为 null
- summary 字段使用 Markdown 格式，结构清晰"""

FORMAT_RESUME_PROMPT = """你是一个专业的简历格式化助手。用户会给你一段从 PDF/Word/图片中提取的简历原始文本，你需要将其整理为结构清晰、格式美观的 Markdown 格式。

要求：
- 保留原文中的所有信息，不要遗漏任何内容
- 使用 ## 作为主要章节标题（如：个人信息、教育背景、工作经历、项目经验、技能等）
- 使用 ### 作为子章节标题
- 技能用无序列表 - 呈现
- 公司名称、学校名称、职位名称使用 **粗体** 标记
- 时间信息保持原样
- 不要添加原文中没有的信息
- 不要添加任何解释、评论或分析
- 如果有联系方式（电话、邮箱等），保持原样呈现

请只返回 Markdown 格式的简历内容，不要包含任何其他文字。"""

INTERVIEW_SYSTEM_PROMPT = """你是一个资深技术面试官，正在为候选人进行一场模拟面试。你手中有一份候选人的简历，你需要根据简历内容进行提问和追问。

## 面试流程

1. **开场**：面试开始时，先说一句简短的开场白（如"面试开始，我们直接进入正题"），然后提出第一个问题。
2. **提问策略**：根据简历内容提问，覆盖以下维度（轮换使用）：
   - 技术基础（根据简历中提到的技术栈深入提问）
   - 项目经验（追问具体项目的实现细节、挑战、技术选型、成果）
   - 系统设计（如果简历中有架构相关经验）
   - 问题解决（场景题或实际遇到过的问题）
   - 行为面试（团队协作、冲突处理、职业规划等）
3. **回答评估**：候选人回答后，根据回答质量决定：
   - 如果回答**浅显、有漏洞、缺乏细节、含糊不清** → 追问同一个话题，要求候选人补充细节或澄清
   - 如果回答**扎实、有深度、条理清晰** → 简短评价（一两句话）后，提出关于**不同话题**的新问题
4. **问题难度**：与候选人简历中体现的经验水平匹配
5. **面试时长**：目标是总共约15次交流回合（包括追问）。当接近目标时（约12-15轮），如果当前回答已经完整，可以说"感谢你的回答，本次面试到此结束。"并给出简短总结
6. **风格**：专业但友善，像真实的面试官一样交流。问题简洁明了，不要冗长。

## 重要约束
- 不要一次性问多个问题，每次只问一个问题
- 不要在提问时自己回答
- 用人称"你"来称呼候选人
- 不要在消息中输出问号开头的标签或格式标记
- 如果面试结束时，必须在消息中包含"面试结束"或"面试到此结束"这样的明确结束信号

## 输出格式
直接输出你要说的话，不需要 JSON 格式，不需要任何前缀或后缀标记。

目标岗位：{target_position}

简历内容：
{resume_text}

现在开始面试。"""

EVALUATION_PROMPT = """你是一位资深面试评估专家。你需要根据候选人的简历和完整的面试对话记录，对候选人的面试表现进行全面评估。

## 评估维度
1. 技术能力：对技术问题的回答深度和准确性
2. 项目经验：对项目细节的掌握程度和表达能力
3. 沟通表达：回答的条理性、逻辑性
4. 临场反应：对追问的应对能力
5. 综合素养：整体表现的成熟度和专业度

## 评分标准
- 90-100：表现优秀，回答深入且有见地，能很好应对追问
- 75-89：表现良好，大部分回答有深度，基本能应对追问
- 60-74：表现一般，回答偏浅，追问时暴露不足
- 40-59：表现较差，多项问题回答不到点上
- 0-39：表现很差，大部分问题无法有效回答

## 输出要求
请严格按照以下 JSON 格式返回，不要返回任何其他内容：
{
  "overall_score": 85,
  "strengths": [
    "对 XXX 技术栈有扎实的理解，在 XXX 问题上回答详细",
    "项目经验描述清晰，能准确说出自己的贡献"
  ],
  "weaknesses": [
    "对 XXX 概念理解不够深入，被追问时出现偏差",
    "系统设计方面缺乏实际经验"
  ],
  "learning_path": [
    "深入学习 XXX 的底层原理",
    "练习更多系统设计场景",
    "准备 XXX 相关的进阶知识"
  ],
  "detailed_feedback": "## 面试评估报告\\n\\n### 总体表现\\n[用 2-3 句话概述整体表现]\\n\\n### 详细分析\\n[分维度分析]\\n\\n### 改进建议\\n[按优先级列出改进方向]"
}

重要：
- overall_score 是 0-100 的整数
- strengths 列出 3-5 条具体优点
- weaknesses 列出 3-5 条具体不足
- learning_path 列出 3-6 条具体学习建议
- detailed_feedback 使用 Markdown 格式，结构清晰"""


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

        choices = data.get("choices")
        if not choices or not isinstance(choices, list):
            logger.error(f"MiniMax API returned unexpected response: {json.dumps(data, ensure_ascii=False)[:500]}")
            raise ValueError(f"MiniMax API 返回了异常的响应格式，choices 为空或不存在")

        message = choices[0].get("message")
        if not message or not isinstance(message, dict):
            logger.error(f"MiniMax API returned unexpected choice: {json.dumps(choices[0], ensure_ascii=False)[:500]}")
            raise ValueError(f"MiniMax API 返回的消息为空")

        content = message.get("content")
        if not content or not isinstance(content, str):
            logger.error(f"MiniMax API returned empty content in message: {json.dumps(message, ensure_ascii=False)[:500]}")
            raise ValueError(f"MiniMax API 返回的内容为空")

        return content


def _clean_json_response(result: str) -> str:
    """Strip markdown code fences from a JSON response."""
    cleaned = result.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


async def parse_interview(content: str, company: str) -> list[dict]:
    user_message = f"公司：{company}\n\n面经内容：\n{content}" if company else f"面经内容：\n{content}"

    messages = [
        {"role": "system", "content": PARSE_SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    try:
        result = await call_minimax(messages)
        cleaned = _clean_json_response(result)

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
        cleaned = _clean_json_response(result)

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


async def review_resume(resume_content: str, target_position: str = "") -> dict:
    user_message = f"目标岗位：{target_position}\n\n简历内容：\n{resume_content}" if target_position else f"简历内容：\n{resume_content}"

    messages = [
        {"role": "system", "content": RESUME_REVIEW_PROMPT},
        {"role": "user", "content": user_message},
    ]

    try:
        result = await call_minimax(messages)
        cleaned = _clean_json_response(result)

        parsed = json.loads(cleaned)

        if not isinstance(parsed, dict):
            raise ValueError("AI 返回格式错误，不是有效的 JSON 对象")

        parsed.setdefault("overall_score", 60)
        parsed.setdefault("dimensions", [])
        parsed.setdefault("strengths", [])
        parsed.setdefault("weaknesses", [])
        parsed.setdefault("suggestions", [])
        parsed.setdefault("position_match", None)
        parsed.setdefault("summary", "")

        score = parsed["overall_score"]
        if not isinstance(score, int) or score < 0 or score > 100:
            parsed["overall_score"] = max(0, min(100, int(score) if isinstance(score, (int, float)) else 60))

        for dim in parsed["dimensions"]:
            dim.setdefault("name", "")
            dim.setdefault("score", 60)
            dim.setdefault("comment", "")
            d_score = dim["score"]
            if not isinstance(d_score, int) or d_score < 0 or d_score > 100:
                dim["score"] = max(0, min(100, int(d_score) if isinstance(d_score, (int, float)) else 60))

        for sug in parsed["suggestions"]:
            sug.setdefault("section", "")
            sug.setdefault("original_text", "")
            sug.setdefault("issue", "")
            sug.setdefault("suggestion", "")
            sug.setdefault("priority", "medium")

        if parsed["position_match"] and isinstance(parsed["position_match"], dict):
            parsed["position_match"].setdefault("matched", [])
            parsed["position_match"].setdefault("missing", [])
            parsed["position_match"].setdefault("score", 0)
            parsed["position_match"].setdefault("advice", "")

        return parsed
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse resume review response: {e}, response: {result}")
        raise ValueError(f"AI 返回格式错误，解析失败：{str(e)}")
    except Exception as e:
        logger.error(f"Error reviewing resume with MiniMax: {e}")
        raise


async def format_resume_markdown(raw_text: str) -> str:
    """将简历原始文本格式化为 Markdown。"""
    messages = [
        {"role": "system", "content": FORMAT_RESUME_PROMPT},
        {"role": "user", "content": raw_text},
    ]
    try:
        result = await call_minimax(messages)
        return _clean_json_response(result)
    except Exception as e:
        logger.error(f"Error formatting resume: {e}")
        raise


async def interview_chat(
    resume_text: str,
    history: list[dict],
    target_position: str = "",
    skip_action: str = "",
) -> tuple[str, bool]:
    """进行一次面试对话。返回 (AI消息, 是否结束)。"""
    system_prompt = INTERVIEW_SYSTEM_PROMPT.format(
        target_position=target_position or "未指定",
        resume_text=resume_text,
    )

    messages: list[dict] = [{"role": "system", "content": system_prompt}]

    if not history:
        messages.append({"role": "user", "content": "开始面试"})

    for msg in history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        api_role = "assistant" if role == "interviewer" else "user"
        messages.append({"role": api_role, "content": content})

    if skip_action == "skip":
        messages.append({"role": "user", "content": "这道题我选择跳过，请换一道新的面试题（不要重复之前问过的话题）。"})

    try:
        result = await call_minimax(messages)
        is_complete = "面试结束" in result or "面试到此结束" in result
        return result.strip(), is_complete
    except Exception as e:
        logger.error(f"Error in interview chat: {e}")
        raise


async def generate_question_answer(question: str) -> str:
    """为一道面试题生成参考答案。"""
    messages = [
        {
            "role": "system",
            "content": "你是一个资深技术面试官。请为以下面试题生成一份详细、有条理的参考答案。使用清晰的分点方式回答，便于阅读。不要使用 Markdown 表格。",
        },
        {"role": "user", "content": f"请为这道面试题生成参考答案：\n{question}"},
    ]

    try:
        result = await call_minimax(messages)
        return result.strip()
    except Exception as e:
        logger.error(f"Error generating answer for question: {e}")
        raise


STUDY_PLAN_PROMPT = """你是一位资深面试教练和学习规划专家。你需要根据候选人过去多次模拟面试的评估结果，制定一份个性化的学习提升计划。

## 输入说明
你会收到一组历史评估数据的摘要，包含每次评估的分数、优点和不足。

## 分析步骤
1. 找出最常出现的弱点（高频弱项）
2. 分析分数变化趋势（进步还是退步）
3. 结合优缺点，制定可行的学习计划

## 输出要求
请严格按照以下 JSON 格式返回，不要返回任何其他内容：
{
  "focus_areas": [
    "最需要提升的方向1（基于高频弱项）",
    "最需要提升的方向2",
    "最需要提升的方向3"
  ],
  "weekly_plan": [
    {"day": "周一", "task": "具体学习任务描述"},
    {"day": "周二", "task": "具体学习任务描述"},
    {"day": "周三", "task": "具体学习任务描述"},
    {"day": "周四", "task": "具体学习任务描述"},
    {"day": "周五", "task": "具体学习任务描述"},
    {"day": "周六", "task": "具体学习任务描述"},
    {"day": "周日", "task": "具体学习任务描述"}
  ],
  "long_term_goals": [
    "30天目标1：具体可衡量的目标",
    "30天目标2",
    "30天目标3"
  ],
  "resource_recommendations": [
    "推荐资源1：具体的书籍/课程/练习方向",
    "推荐资源2",
    "推荐资源3"
  ]
}

重要：
- 每周计划要具体、可执行，每天一个明确任务
- 长期目标要有时限和可衡量标准
- 资源推荐要具体到领域或平台
- 不要使用 Markdown 表格"""


async def generate_study_plan(evaluations_summary: str) -> dict:
    messages = [
        {"role": "system", "content": STUDY_PLAN_PROMPT},
        {"role": "user", "content": f"历史评估记录：\n{evaluations_summary}"},
    ]

    try:
        result = await call_minimax(messages)
        cleaned = _clean_json_response(result)
        parsed = json.loads(cleaned)

        if not isinstance(parsed, dict):
            raise ValueError("AI 返回格式错误，不是有效的 JSON 对象")

        parsed.setdefault("focus_areas", [])
        parsed.setdefault("weekly_plan", [])
        parsed.setdefault("long_term_goals", [])
        parsed.setdefault("resource_recommendations", [])

        return parsed
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse study plan: {e}, response: {result}")
        raise ValueError(f"AI 返回格式错误，解析失败：{str(e)}")
    except Exception as e:
        logger.error(f"Error generating study plan: {e}")
        raise


async def evaluate_interview(
    resume_text: str,
    history: list[dict],
    target_position: str = "",
) -> dict:
    """评估整场面试表现，返回评分和分析。"""
    # Format conversation history as text
    history_text_parts = []
    for msg in history:
        role_label = "面试官" if msg.get("role") == "interviewer" else "候选人"
        history_text_parts.append(f"{role_label}：{msg.get('content', '')}")
    history_text = "\n\n".join(history_text_parts)

    user_message = f"目标岗位：{target_position}\n\n简历内容：\n{resume_text}\n\n面试对话记录：\n{history_text}" if target_position else f"简历内容：\n{resume_text}\n\n面试对话记录：\n{history_text}"

    messages = [
        {"role": "system", "content": EVALUATION_PROMPT},
        {"role": "user", "content": user_message},
    ]

    try:
        result = await call_minimax(messages)
        cleaned = _clean_json_response(result)
        parsed = json.loads(cleaned)

        if not isinstance(parsed, dict):
            raise ValueError("AI 返回格式错误，不是有效的 JSON 对象")

        parsed.setdefault("overall_score", 60)
        parsed.setdefault("strengths", [])
        parsed.setdefault("weaknesses", [])
        parsed.setdefault("learning_path", [])
        parsed.setdefault("detailed_feedback", "")

        # Ensure score is a valid int
        score = parsed["overall_score"]
        if not isinstance(score, int) or score < 0 or score > 100:
            parsed["overall_score"] = max(0, min(100, int(score) if isinstance(score, (int, float)) else 60))

        return parsed
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse evaluation response: {e}, response: {result}")
        raise ValueError(f"AI 评估返回格式错误：{str(e)}")
    except Exception as e:
        logger.error(f"Error evaluating interview: {e}")
        raise
