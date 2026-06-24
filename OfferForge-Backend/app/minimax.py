import asyncio
import json
import logging
import re

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def _sleep(seconds: float) -> None:
    """异步等待，用于 API 重试退避。"""
    await asyncio.sleep(seconds)


# ----- 答案 Markdown 后处理：自动给裸英文术语包反引号 -----
# 模型对「所有英文术语都加反引号」执行不稳定，靠 prompt 压不住，这里做兜底。
# 规则：保护已有代码块（```...```）和行内代码（`...`）不动；对其余文本中
# 的裸英文术语自动包反引号。相邻术语（仅由一个空格连接）合并成一个反引号
# 块，避免 `Hit` `Rate@5` 这种拆碎的渲染。
_CODE_BLOCK_RE = re.compile(r"```.*?```", re.DOTALL)
_INLINE_CODE_RE = re.compile(r"`[^`\n]+`")
# 英文术语 token：字母开头，可含字母数字及 -_.@ 分隔的延续段，如 BM25、top-K、Rate@5、enable.auto.commit
_TERM_RE = re.compile(r"[A-Za-z][A-Za-z0-9]*(?:[-_.@][A-Za-z0-9]+)*")


def _is_english_term(token: str) -> bool:
    """判断一个 token 是否值得包反引号：长度>=2 或含数字。
    避免把单个字母（如「方案 A」「Q 和 A」）误包。"""
    return len(token) >= 2 or any(c.isdigit() for c in token)


def _auto_backtick_english(text: str) -> str:
    """给答案里的裸英文术语自动包反引号，已有代码块/行内代码不受影响。"""
    if not text:
        return text

    # 1. 先把已有代码块和行内代码占位保护起来，避免内部内容被重复处理
    placeholders: list[str] = []

    def _save(m: re.Match) -> str:
        placeholders.append(m.group(0))
        return f"\x00{len(placeholders) - 1}\x00"

    text = _CODE_BLOCK_RE.sub(_save, text)
    text = _INLINE_CODE_RE.sub(_save, text)

    # 2. 找出所有术语匹配，过滤掉单字母非术语
    term_matches = [m for m in _TERM_RE.finditer(text) if _is_english_term(m.group(0))]
    if not term_matches:
        # 还原占位后返回
        return re.sub(r"\x00(\d+)\x00", lambda m: placeholders[int(m.group(1))], text)

    # 3. 重写文本，相邻（恰好一个空格连接）的术语合并成一个反引号块
    out: list[str] = []
    pos = 0
    i = 0
    while i < len(term_matches):
        m = term_matches[i]
        out.append(text[pos:m.start()])
        chunk = m.group(0)
        end = m.end()
        j = i + 1
        while j < len(term_matches) and text[end:term_matches[j].start()] == " ":
            chunk = chunk + " " + term_matches[j].group(0)
            end = term_matches[j].end()
            j += 1
        out.append(f"`{chunk}`")
        pos = end
        i = j
    out.append(text[pos:])
    text = "".join(out)

    # 4. 还原占位
    text = re.sub(r"\x00(\d+)\x00", lambda m: placeholders[int(m.group(1))], text)
    return text

PARSE_SYSTEM_PROMPT = """你是一个面试题分析专家。用户会给你一段面试经历（面经），你需要：
1. 仔细阅读面经内容，识别出每一道独立的面试题
2. 评估每道题的难度（简单/中等/困难）
3. 为每道题生成详细、有条理的参考答案

注意事项：
- 如果面经中有"几道题"、"多个问题"等模糊描述，请尽量还原具体问题
- 如果面经中提到"系统设计"、"架构设计"等，请展开为具体的设计问题
- 每道题的参考答案应该包含核心思路和关键要点，每题答案控制在 4-6 个要点，不要过长
- **题量上限**：最多解析 15 道题。如果面经中题目超过 15 道，只取前 15 道最有代表性的，其余忽略。这样可避免输出过长导致超时。

## 答案排版铁律（必须严格遵守，渲染后以 Markdown 展示）
答案必须是**规范的 Markdown**。严格遵守以下规则：

铁律 1【分层只用二级标题】：每一个大要点以 `##` 开头作为标题，例如 `## 1. 解决检索粒度矛盾`。标题前后各空一行（换行写成 `\\n\\n`）。

铁律 2【子要点用列表，每项一行】：标题下的子要点用 `-` 列表，**每个 `-` 单独占一行**（写作 `\\n- 要点`），列表前后各空一行。

铁律 3【禁止数字堆叠】：**禁止** `1.1`、`1.2`、`2.1` 这类把子编号塞进同一段落正文的写法，子要点一律用铁律 2 的 `-` 列表。

铁律 4【英文术语必须加反引号】：中文句子里出现的**任何英文单词、缩写、配置项、函数名、参数名、命令**，用反引号包成行内代码，例如 `Minor GC`、`SO_SNDBUF`、`accept()`、`enable.auto.commit`。含英文字母就加反引号。

铁律 5【不要用粗体包英文术语】：英文术语用反引号（铁律 4），不要用 `**粗体**` 包裹。粗体仅用于强调少数中文关键词。禁止 `**中文（english）**` 这种整体粗体写法。

铁律 6【段落空行分隔】：段落与段落、段落与列表之间空一行（`\\n\\n`），不要连成一坨。

铁律 7【多行代码用代码块】：配置或代码示例用带语言标识的代码块，例如：
```bash
net.ipv4.tcp_max_syn_backlog = 8192
```

铁律 8【不要用表格】。

## ✅ 答案格式示例（只学格式，不抄内容）
## 1. 父子索引的核心思路

- 索引阶段用小块（子块）做精确匹配，命中后将对应的大块（父块）作为上下文返回给 `LLM`。
- 小块提高向量检索的精度，父块补充完整语义，使生成结果更连贯。

**实现方式**：固定窗口切分（如 `200 token` 子块 / `500 token` 父块），或按段落、标题层级构建父子映射。

## 输出格式（极其重要，违反会导致解析失败）
你必须返回一个 JSON 数组。JSON 中字符串值（question / answer）里**严禁出现未转义的英文双引号 `"`**，否则 JSON 会解析失败。具体要求：
- 答案中如需引用术语、专有名词或强调，一律使用中文引号「」或『』，**不要用英文双引号 `"`**。
  - 正确：术语「Lost in the Middle」、指令「忽略之前的指令」
  - 错误：术语"Lost in the Middle"（这会破坏 JSON）
- 答案中的换行必须写成 `\\n` 转义序列，不要直接换行。
- 不要在 JSON 外面包 Markdown 代码块，直接输出 JSON 数组本身。
- 一次输出全部题目，不要中途截断。

请严格按照以下 JSON 格式返回，不要返回任何其他内容：
[
  {
    "question": "面试题内容（完整表述）",
    "difficulty": "简单/中等/困难",
    "answer": "参考答案（规范 Markdown，换行用 \\n 转义）"
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


# ===== 按难度分级的面试官人设 =====
# 五个难度：简单 / 中等 / 困难 / 噩梦 / 地狱，每个对应一位风格鲜明的面试官。
# 所有 prompt 共享相同的位置参数 {target_position} / {resume_text} 与统一的结束信号约定。

_INTERVIEW_PROMPT_COMMON_TAIL = """
## 重要约束
- 每次只问一个问题，不要一次性抛出多个问题
- 不要在提问时替候选人回答
- 用"你"称呼候选人
- 不要输出任何标签或格式标记前缀
- 面试结束时，消息中必须包含"面试结束"或"面试到此结束"作为明确结束信号

## 输出格式
直接输出你要说的话，不需要 JSON，不需要任何前后缀标记。

目标岗位：{target_position}

简历内容：
{resume_text}

现在开始面试。"""


INTERVIEW_PROMPTS = {
    "简单": """你是一位"温和鼓励型"面试官，正在为候选人进行一场**简单难度**的模拟面试。你的角色像一位耐心的导师，目的是让候选人建立信心、把基础答好。

## 人设
- 语气亲切、鼓励，像带新人的前辈
- 你只问**基础题**：简历中技术栈的基本概念、常见用法、项目里做了什么
- 候选人卡住时，你会主动给一点提示或换个更小的角度重新问
- 不会故意刁难，不追问过于底层的原理

## 面试流程
1. 开场：简短友好的开场白（如"别紧张，我们就当聊天"），然后提第一个基础问题。
2. 提问策略：覆盖技术基础、项目经验、行为面试，但都停留在入门到基础层面。
3. 回答评估：
   - 回答基本正确 → 简短肯定（如"嗯，没问题"），换一个新话题的简单题
   - 回答不全或卡住 → 给提示或降低难度，引导候选人说出关键点，不要一直追问施压
4. 面试时长：约 10-12 次交流回合即可结束，结束时说"面试结束"并给一两句鼓励性总结。
""" + _INTERVIEW_PROMPT_COMMON_TAIL,

    "中等": """你是一位"标准专业型"面试官，正在为候选人进行一场**中等难度**的模拟面试，风格接近大厂一面的常规水平。

## 人设
- 语气专业、客观、不卑不亢
- 题目难度与候选人简历体现的经验水平匹配：基础+适量进阶，覆盖原理与项目细节
- 适度追问，考查理解深度，但不会无止境深挖

## 面试流程
1. 开场：简短开场白（如"面试开始，我们直接进入正题"），提出第一个问题。
2. 提问策略：轮换覆盖技术基础、项目经验、系统设计、问题解决、行为面试。
3. 回答评估：
   - 回答浅显、有漏洞、含糊 → 追问同一话题，要求补充细节或澄清
   - 回答扎实、有条理 → 简短评价一两句，换**不同话题**的新问题
4. 面试时长：目标约 15 次交流回合（含追问）。接近尾声且当前回答完整时，说"面试结束"并给简短总结。
""" + _INTERVIEW_PROMPT_COMMON_TAIL,

    "困难": """你是一位"严格犀利型"面试官，正在为候选人进行一场**困难难度**的模拟面试，风格接近大厂二面 / 资深岗，会深挖细节、抓住漏洞不放。

## 人设
- 语气冷静、直接，有点严肃
- 你问**进阶题**：底层原理、源码级理解、边界条件、为什么这样设计而不是那样
- 候选人回答有含糊或漏洞时，你会精准指出并继续追问，要求给出具体方案与取舍
- 不接受"大概""可能"这类模糊回答，要求明确的技术细节

## 面试流程
1. 开场：简短开场白，然后直接抛出一个有深度的开场问题。
2. 提问策略：重点考查技术原理、项目架构与取舍、系统设计、复杂场景问题，行为面试为辅。
3. 回答评估：
   - 回答停留在表面 → 深挖一层（"为什么？""底层是怎么实现的？""换个场景会怎样？"）
   - 回答有深度且自洽 → 简短认可，换一个**同样有难度**的新话题继续
4. 面试时长：目标约 15-18 次交流回合。结束时说"面试结束"，总结中要点出关键不足。
""" + _INTERVIEW_PROMPT_COMMON_TAIL,

    "噩梦": """你是一位"高压压力型"面试官，正在为候选人进行一场**噩梦难度**的模拟面试。你会持续施压、连珠炮式追问、对回答挑刺，模拟高压面与压力测试。

## 人设
- 语气强势、咄咄逼人，会打断、质疑、反问
- 你抛出**刁钻题**：极端场景、容量瓶颈、故障与一致性、被面试官故意质疑正确答案
- 候选人答对也会被追问"如果再极端一点呢""有没有更优解""代价是什么"
- 你会质疑候选人的方案，迫使其在压力下自证、权衡、修正

## 面试流程
1. 开场：直接进入正题，抛出一个有压迫感的开场问题（如大规模、高并发、故障场景）。
2. 提问策略：聚焦系统设计、容量与瓶颈、分布式一致性、故障容灾、技术选型的代价权衡，辅以犀利的行为压力题。
3. 回答评估：
   - 几乎始终追问：质疑方案、追问边界、要求量化（QPS、延迟、容量）、要求对比备选方案
   - 候选人在压力下仍能自洽论证 → 才认可并推进，但仍保持高压节奏
4. 面试时长：目标约 18-20 次交流回合。结束时说"面试结束"，总结犀利、直击要害。
""" + _INTERVIEW_PROMPT_COMMON_TAIL,

    "地狱": """你是一位"地狱级"面试官，正在为候选人进行一场**地狱难度**的模拟面试。你代表技术天花板级别的拷问，融合资深架构师 + 原理狂魔 + 系统设计魔鬼的极限考查。

## 人设
- 语气冷峻、几乎不留情面，问题密度极高
- 你只问**天花板级问题**：从底层原理到架构设计到工程取舍到线上事故复盘，连环纵深
- 一个话题可以连续追问 4-6 层，直到候选人答不上来再换方向
- 考查候选人在知识盲区、矛盾约束、不可能三角面前的思考方式，而非标准答案

## 面试流程
1. 开场：开门见山，抛出一个需要多层思考的复杂开场问题（系统设计或原理深挖）。
2. 提问策略：系统设计 + 底层原理 + 工程权衡 + 极端场景 + 事故复盘，密度拉满，几乎题题是难题。
3. 回答评估：
   - 持续纵深追问：每层"为什么""代价是什么""换成 XX 量级呢""线上挂了你怎么办"
   - 候选人触及盲区时，考查其能否诚实承认、给出合理推断与排查思路，而非强行编造
4. 面试时长：目标约 18-22 次交流回合。结束时说"面试结束"，总结直接、不留情面，明确指出与顶尖水平的差距。
""" + _INTERVIEW_PROMPT_COMMON_TAIL,
}


def _get_interview_prompt(difficulty: str) -> str:
    """根据难度返回对应的面试官人设 prompt，未知难度回退到中等。"""
    return INTERVIEW_PROMPTS.get(difficulty, INTERVIEW_PROMPTS["中等"])

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


async def call_minimax(messages: list[dict], timeout: float = 180.0) -> str:
    """调用 MiniMax 对话接口，带自动重试。

    timeout 默认 180s：生成型任务（如解析面经，需要为每道题生成参考答案、
    输出 token 量大）耗时长，120s 容易 ReadTimeout。生成型长任务可进一步
    传入更大的 timeout。
    """
    url = f"{settings.MINIMAX_BASE_URL}/text/chatcompletion_v2"
    headers = {
        "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "MiniMax-M3",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 8192,
    }

    # MiniMax 偶发会返回 429（限流）或 5xx，这类瞬时错误重试通常即可成功。
    # 对它们做带退避的自动重试，避免把瞬时抖动直接抛给用户变成 500。
    max_retries = 3
    last_exc: Exception | None = None
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, headers=headers, json=payload)

                # 把 HTTP 错误转成带状态码+响应体的可读异常，避免空消息
                if response.status_code >= 400:
                    body = ""
                    try:
                        body = response.text
                    except Exception:
                        pass
                    logger.error(
                        "MiniMax API returned HTTP %s: %s",
                        response.status_code,
                        body[:500],
                    )
                    err = RuntimeError(
                        f"MiniMax API 返回 HTTP {response.status_code}"
                        + (f": {body[:200]}" if body else "")
                    )
                    # 429 / 5xx 才重试，4xx（除 429）是请求本身的问题，重试无用
                    if response.status_code == 429 or response.status_code >= 500:
                        last_exc = err
                        if attempt < max_retries - 1:
                            # 退避：1s, 2s
                            await _sleep(1.0 * (2 ** attempt))
                            continue
                    raise err

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
        except httpx.TimeoutException as e:
            # 超时通常是生成耗时过长（题量大、输出长），不是网络故障。
            # 重试时给更长退避，并标注是超时，便于上层给出针对性提示。
            last_exc = RuntimeError(
                f"调用 MiniMax 超时（{type(e).__name__}）：模型响应时间过长，可能是题量过大，请精简面经后重试"
            )
            logger.error(f"MiniMax timeout (attempt {attempt + 1}/{max_retries}): {type(e).__name__}")
            if attempt < max_retries - 1:
                await _sleep(2.0 * (2 ** attempt))
                continue
            raise last_exc
        except httpx.HTTPError as e:
            # 其他网络层错误（连接中断等）
            last_exc = RuntimeError(f"调用 MiniMax 网络错误: {type(e).__name__}: {e}")
            logger.error(f"MiniMax HTTP transport error (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                await _sleep(1.0 * (2 ** attempt))
                continue
            raise last_exc

    # 重试用尽
    raise last_exc or RuntimeError("MiniMax API 调用失败")


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


def _repair_json_string_literals(text: str) -> str:
    """Best-effort repair of LLM JSON that contains unescaped control chars
    or unescaped double quotes inside string values.

    LLMs frequently emit real newlines/tabs inside JSON string values instead
    of the escaped ``\\n`` / ``\\t`` sequences, and — more perniciously — emit
    raw ``"`` inside an answer (e.g. 术语"Lost in the Middle") which breaks the
    JSON structure with "Expecting ',' delimiter" / "Unterminated string".

    We walk the text char by char tracking whether we are inside a string.
    Inside a string:
    - real newlines/tabs/CR are escaped to ``\\n`` / ``\\t`` / ``\\r``;
    - already-escaped sequences (``\\n`` etc.) are left untouched;
    - a ``"`` that does NOT look like the closing quote of the string is
      escaped to ``\\"``. We decide "closing quote" heuristically: a ``"`` is
      treated as closing only if it is followed (after optional whitespace) by
      one of `,` `}` `]` `:` or end-of-text — i.e. a character that can
      legitimately follow a string value in JSON. Any other ``"`` inside the
      string is escaped.
    """
    out = []
    in_string = False
    escaped = False
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if not in_string:
            out.append(ch)
            if ch == '"':
                in_string = True
            i += 1
            continue

        if escaped:
            # Previous char was a backslash: pass this one through verbatim.
            out.append(ch)
            escaped = False
            i += 1
            continue

        if ch == "\\":
            out.append(ch)
            escaped = True
            i += 1
            continue

        if ch == '"':
            # Decide whether this quote closes the string. It closes only if
            # the next non-whitespace char is one of , } ] : or end-of-text.
            j = i + 1
            while j < n and text[j] in " \t\r\n":
                j += 1
            nxt = text[j] if j < n else ""
            if nxt in (",", "}", "]", ":") or nxt == "":
                out.append(ch)
                in_string = False
            else:
                # An unescaped " inside the string value — escape it.
                out.append('\\"')
            i += 1
            continue

        if ch == "\n":
            out.append("\\n")
            i += 1
            continue
        if ch == "\r":
            out.append("\\r")
            i += 1
            continue
        if ch == "\t":
            out.append("\\t")
            i += 1
            continue

        out.append(ch)
        i += 1
    return "".join(out)


def _safe_json_loads(text: str) -> object:
    """Parse JSON from an LLM response, tolerating common formatting errors.

    Tries a strict ``json.loads`` first; on failure, repairs unescaped control
    characters inside string literals and retries. Raises ``json.JSONDecodeError``
    with the original message if repair still fails.
    """
    try:
        return json.loads(text)
    except json.JSONDecodeError as original_err:
        try:
            repaired = _repair_json_string_literals(text)
            return json.loads(repaired)
        except json.JSONDecodeError:
            raise original_err


def _normalize_parsed_questions(parsed: object) -> list[dict]:
    """把解析结果规整为 list[dict]，补齐缺失字段。"""
    if not isinstance(parsed, list):
        parsed = [parsed]
    for item in parsed:
        if isinstance(item, dict):
            item.setdefault("question", "")
            item.setdefault("difficulty", "中等")
            item.setdefault("answer", "")
            # 模型对「英文术语加反引号」执行不稳定，这里统一兜底，保证渲染一致
            if isinstance(item.get("answer"), str):
                item["answer"] = _auto_backtick_english(item["answer"])
    return [q for q in parsed if isinstance(q, dict) and q.get("question")]


async def parse_interview(content: str, company: str) -> list[dict]:
    user_message = f"公司：{company}\n\n面经内容：\n{content}" if company else f"面经内容：\n{content}"

    messages = [
        {"role": "system", "content": PARSE_SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    # 解析面经是生成型长任务：要为每道题生成参考答案，输出 token 量大、
    # 耗时长。给 300s 超时，避免题量稍大就 ReadTimeout。
    result = ""
    try:
        result = await call_minimax(messages, timeout=300.0)
        cleaned = _clean_json_response(result)
        try:
            parsed = _safe_json_loads(cleaned)
        except json.JSONDecodeError as e:
            # 第一次解析失败（通常是答案里混入了未转义双引号或控制字符）。
            # 让模型基于上次输出自我纠正，重新输出严格合法的 JSON，再试一次。
            logger.warning(f"First parse_interview parse failed ({e}); retrying with strict-JSON prompt.")
            retry_messages = messages + [
                {"role": "assistant", "content": result},
                {
                    "role": "user",
                    "content": (
                        "你上一次返回的内容不是合法的 JSON，解析失败。常见原因：answer 字符串值里"
                        "出现了未转义的英文双引号 \\\", 或出现了真实换行。请严格只输出一个合法的 "
                        "JSON 数组：不要使用 Markdown 代码块；answer 中如需引用术语一律用中文引号"
                        "「」而不要用英文双引号；所有换行用 \\n 转义；引号用 \\\" 转义。"
                    ),
                },
            ]
            result = await call_minimax(retry_messages, timeout=300.0)
            cleaned = _clean_json_response(result)
            parsed = _safe_json_loads(cleaned)

        valid_questions = _normalize_parsed_questions(parsed)
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

        parsed = _safe_json_loads(cleaned)

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

        parsed = _safe_json_loads(cleaned)

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
    difficulty: str = "中等",
) -> tuple[str, bool]:
    """进行一次面试对话。返回 (AI消息, 是否结束)。

    difficulty 决定使用哪一位面试官人设（简单/中等/困难/噩梦/地狱）。
    """
    system_prompt = _get_interview_prompt(difficulty).format(
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


SKIPPED_QUESTION_PROMPT = """你是一个资深技术面试官与题库编辑。用户会给你一段模拟面试中面试官的发言，其中可能包含"好的""嗯""那么接下来下一个问题""我们来看看"等口语化过渡语，以及对候选人上一轮回答的评价。你需要从中提炼出一道干净的面试题，并生成参考答案。

## 任务一：提炼题目
去除所有口语化过渡语和评价性话语，只保留问题本身。表述要完整、独立、清晰，不依赖上下文也能看懂。多个问题只保留最主要的一个。

## 任务二：生成参考答案
答案必须是**规范的 Markdown**，渲染后展示。请严格遵守以下排版铁律（违反任何一条都会导致显示混乱）：

铁律 1【分层只用二级标题】：每一个大要点必须以 `##` 开头作为标题，例如 `## 1. 三次握手阶段`。标题前后各空一行。

铁律 2【子要点用列表，每项一行】：标题下的子要点用 `-` 列表呈现，**每个 `-` 必须单独占一行**，列表前后各空一行。

铁律 3【禁止数字堆叠】：**绝对禁止**使用 `4.1`、`4.2`、`2.1` 这类把子编号塞进同一段落正文里的写法。子要点一律用铁律 2 的 `-` 列表，不要给子要点编号。

铁律 4【英文术语必须加反引号】：中文句子里出现的**任何英文单词、缩写、配置项、函数名、参数名、命令、路径**，都必须用反引号包成行内代码。例如写 `Minor GC`、`age`、`mark word`、`SO_SNDBUF`、`accept()`、`enable.auto.commit`、`/proc/net/snmp`，而不是裸写。判断标准：只要含英文字母，就加反引号。

铁律 5【不要用粗体包英文术语】：英文术语用反引号（铁律 4），不要用 `**粗体**` 包裹。粗体仅用于强调少数中文关键词，且不要滥用。特别禁止 `**中文（english）**` 这种把中英文整体粗体的写法。

铁律 6【段落空行分隔】：段落与段落、段落与列表之间必须空一行，不要连成一坨。

铁律 7【多行代码用代码块】：配置或代码示例用带语言标识的代码块：
```bash
net.ipv4.tcp_max_syn_backlog = 8192
```

铁律 8【不要用表格】。

## ✅ 正确示例（只学格式，不抄内容）
## 1. 对象晋升老年代的时机

- JVM 通过对象的 `age` 字段记录它经历 `Minor GC` 的次数，对象头中有 4 bit 的 `mark word` 区域用于记录 `age`。
- 每经历一次 `Minor GC`，存活对象的 `age` 加 1。

**年龄阈值判断**：当 `age` 达到阈值时晋升，阈值由 `-XX:MaxTenuringThreshold` 控制。

## ❌ 错误示例（禁止这样写）
4. 对象晋升老年代的时机与阈值
JVM 通过对象的**年龄（age）**字段记录它经历 Minor GC 的次数。
4.1 年龄阈值判断（年龄到了就晋升）
每经历一次 Minor GC，存活对象的 age 加 1。

## 输出格式
严格按以下格式输出，不要输出任何其他内容，不要在整体输出外面包 Markdown 代码块：

===题目===
<提炼后的干净题目>

===答案===
<参考答案，规范 Markdown>

注意：题目和答案内容中请勿出现"===题目==="或"===答案==="这样的标记字符串。"""


def _strip_outer_code_fence(text: str) -> str:
    """Strip a code fence that wraps the *entire* output.

    Only removes a leading ```` ``` ```` (with optional language tag) and a
    matching trailing ```` ``` ```` when both are present — i.e. the model
    wrapped the whole response in a fence. This is careful NOT to touch a
    trailing ```` ``` ```` that actually closes a code block *inside* the
    answer (which would corrupt it), which ``_clean_json_response`` would do
    blindly.
    """
    cleaned = text.strip()
    if not cleaned.startswith("```"):
        return cleaned
    # Drop the opening fence line (``` or ```lang).
    first_newline = cleaned.find("\n")
    if first_newline == -1:
        return cleaned
    inner = cleaned[first_newline + 1:]
    # Only strip a trailing fence if one is actually there.
    if inner.rstrip().endswith("```"):
        inner = inner.rstrip()
        inner = inner[:-3].rstrip()
    return inner


def _parse_skipped_question_response(result: str, raw_question: str) -> dict:
    """从模型返回中解析题目与答案。

    采用 ``===题目===`` / ``===答案===`` 分隔符格式而非 JSON，因为参考答案
    中常含有未转义的双引号、换行等字符，JSON 在这种情况下极易解析失败。
    分隔符格式对答案正文里的引号、代码、换行都不敏感，鲁棒性远好于 JSON。

    解析失败时回退：题目用原始发言，答案留空，保证题目不丢。
    """
    cleaned = _strip_outer_code_fence(result).strip()

    q_marker = "===题目==="
    a_marker = "===答案==="

    q_idx = cleaned.find(q_marker)
    a_idx = cleaned.find(a_marker)

    if q_idx != -1 and a_idx != -1 and q_idx < a_idx:
        question = cleaned[q_idx + len(q_marker):a_idx].strip()
        answer = cleaned[a_idx + len(a_marker):].strip()
        if question:
            return {"question": question, "answer": answer}

    # 回退：模型未按格式输出，至少保留原始题目，不丢题
    logger.warning(
        "Skipped-question response did not contain expected markers; "
        "falling back to raw question. response: %s",
        result[:300],
    )
    return {"question": raw_question.strip(), "answer": ""}


async def generate_question_answer(question: str) -> dict:
    """从面试官发言中提炼干净题目，并生成参考答案。

    面试官在模拟面试中的原始发言常带有"好的，那么接下来下一个问题"等口语
    过渡语，直接入库会导致题目表述冗长、不规范。本函数让模型提炼干净的
    题目并给出参考答案。

    返回 {"question", "answer"}。采用分隔符格式输出，规避 JSON 未转义
    双引号导致的解析失败。
    """
    messages = [
        {"role": "system", "content": SKIPPED_QUESTION_PROMPT},
        {"role": "user", "content": f"面试官发言：\n{question}"},
    ]

    try:
        result = await call_minimax(messages)
        parsed = _parse_skipped_question_response(result, question)
        # 与解析面经保持一致：后处理统一给裸英文术语包反引号
        if parsed.get("answer"):
            parsed["answer"] = _auto_backtick_english(parsed["answer"])
        return parsed
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
        parsed = _safe_json_loads(cleaned)

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

    def _normalize(parsed: object) -> dict:
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

    try:
        result = await call_minimax(messages)
        try:
            return _normalize(_safe_json_loads(_clean_json_response(result)))
        except (json.JSONDecodeError, ValueError) as e:
            # First attempt failed to parse — ask the model once more for pure
            # JSON and retry. This is the core end-of-interview summary, so a
            # single self-correcting retry is worth the extra round-trip.
            logger.warning(f"First evaluation parse failed ({e}); retrying with a strict-JSON prompt.")
            retry_messages = messages + [
                {
                    "role": "assistant",
                    "content": result,
                },
                {
                    "role": "user",
                    "content": (
                        "你上一次返回的内容不是合法的 JSON（字符串值中包含了未转义的换行或引号），解析失败。"
                        "请严格只输出一个合法的 JSON 对象，不要使用 Markdown 代码块，"
                        "并确保所有字符串值中的换行使用 \\n 转义、引号使用 \\\" 转义。"
                    ),
                },
            ]
            result = await call_minimax(retry_messages)
            return _normalize(_safe_json_loads(_clean_json_response(result)))
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Failed to parse evaluation response: {e}, response: {result}")
        raise ValueError(f"AI 评估返回格式错误：{str(e)}")
    except Exception as e:
        logger.error(f"Error evaluating interview: {e}")
        raise
