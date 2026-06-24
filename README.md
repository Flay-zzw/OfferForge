<div align="center">

# 🔨 OfferForge · 面试锻造坊

**AI 驱动的面试全流程辅助系统** — 从面经解析、简历分析、模拟面试，到能力评估与学习路径规划。

让每一次面试都成为可复盘、可成长的能力锻造过程。

</div>

---

## 📖 项目介绍

OfferForge 是一个面向求职者的全栈面试辅助平台，整合大模型能力，覆盖面试准备的完整链路：

- 📝 **面经 → 题库**：粘贴面经，AI 自动拆题、判定难度、生成参考答案，批量入库。
- 📄 **简历智能分析**：上传 PDF / Word / 图片简历，AI 预测面试官会问的问题，并给出简历评审报告。
- 🎤 **AI 模拟面试**：基于你的简历进行多轮追问式模拟面试；支持**五档难度**选择，每档对应一位风格鲜明的 AI 面试官；遇到不会的题可跳过，**面试结束后跳过的题自动提炼干净题目并生成参考答案，整理进入题库**。
- 📊 **能力评估 & 学习路径**：面试结束后 AI 生成评分报告、优劣势分析与个性化学习计划。
- 💬 **AI 面试助手**：随时向 AI 提问，获取面试技巧与题目解析。

---

## ✨ 核心功能

| 模块 | 功能 | 说明 |
| :--- | :--- | :--- |
| 🔐 用户认证 | 注册 / 登录 / 个人信息 | JWT 鉴权，bcrypt 密码加密 |
| 📝 面经解析 | 智能拆题入库 | AI 识别面经中的每道题、评估难度、生成参考答案 |
| 📚 题库管理 | 题目浏览 / 详情 / 新增 | 支持按公司、难度筛选 |
| 📄 简历分析 | 简历预测面试题 | 基于简历内容预测面试官可能提问并给出理由 |
| 📋 简历评审 | 简历评分报告 | 多维度评分、改进建议、岗位匹配度分析 |
| 🎤 模拟面试 | 多轮追问式 AI 面试 | 五档难度可选，基于简历生成针对性问题，支持跳过，结束自动收题入库 |
| 📊 进度跟踪 | 评估历史 / 学习计划 | 历次评估记录与 AI 生成的学习路径 |
| 💬 AI 助手 | 智能问答 | 面试相关问题即时解答 |

### 🎚️ 模拟面试难度

模拟面试提供 **五档难度**，每档对应一位风格鲜明的 AI 面试官人设，难度越高追问越犀利、问题越深。开始面试前可在「选择难度」步骤中挑选：

| 难度 | 面试官人设 | 风格说明 |
| :--- | :--- | :--- |
| 🌱 简单 | 温和鼓励型 | 像带新人的前辈，只问基础题，卡住时主动给提示，建立信心 |
| 📘 中等 | 标准专业型 | 大厂一面常规难度，基础+适量进阶，适度追问考查理解深度 |
| 🔥 困难 | 严格犀利型 | 大厂二面 / 资深岗，深挖底层原理、边界条件与设计取舍 |
| ⚡ 噩梦 | 高压压力型 | 连珠炮追问、故意质疑正确答案，模拟高压面与压力测试 |
| 💀 地狱 | 天花板级 | 系统设计 + 原理 + 工程权衡 + 事故复盘连环纵深拷问 |

---

## 🛠️ 技术栈

### 后端 `OfferForge-Backend/`

- **FastAPI** 0.115 — 异步 Web 框架
- **SQLAlchemy** 2.0 + **aiosqlite** — 异步 ORM + SQLite 数据库
- **python-jose** + **passlib[bcrypt]** — JWT 鉴权与密码加密
- **httpx** — 调用 MiniMax 大模型 API
- **pypdf / python-docx / easyocr** — PDF、Word、图片简历解析
- **pydantic-settings** — 配置管理

### 前端 `OfferForge-Frontend/`

- **React** 19 + **TypeScript**
- **Vite** 8 — 构建与开发服务器
- **React Router** 7 — 路由管理
- **lucide-react** — 图标库
- **react-markdown** + **react-syntax-highlighter** — Markdown 渲染与代码高亮

### AI 能力

- 接入 **MiniMax** 大模型，承担面经拆题、简历分析、模拟面试、能力评估、学习路径生成等核心智能任务。

---

## 📁 项目结构

```
OfferForge/
├── OfferForge-Backend/            # 后端服务
│   ├── app/
│   │   ├── main.py                # FastAPI 入口、路由注册、CORS
│   │   ├── config.py              # 配置（环境变量读取）
│   │   ├── database.py            # 异步数据库引擎与建表
│   │   ├── models.py              # SQLAlchemy 数据模型
│   │   ├── schemas.py             # Pydantic 请求/响应模型
│   │   ├── dependencies.py        # 鉴权、密码哈希、JWT 工具
│   │   ├── minimax.py             # MiniMax 大模型调用与 Prompt
│   │   ├── file_parser.py         # PDF/Word/图片 文本提取
│   │   └── routers/               # 业务路由
│   │       ├── auth.py            # 认证
│   │       ├── questions.py       # 面经解析 / 题库 / AI 助手
│   │       ├── resume.py          # 简历分析 / 评审
│   │       ├── mock_interview.py  # 模拟面试 / 评估 / 收题入库
│   │       └── evaluations.py     # 评估历史 / 学习计划
│   ├── requirements.txt
│   ├── .env.example
│   └── offerforge.db              # SQLite 数据库（自动生成）
│
└── OfferForge-Frontend/           # 前端应用
    ├── src/
    │   ├── main.tsx               # 应用入口
    │   ├── App.tsx                # 路由配置
    │   ├── api.ts                 # 后端 API 封装
    │   ├── types.ts               # 类型定义
    │   ├── components/            # 通用组件（Layout 等）
    │   ├── contexts/              # 全局状态（Auth / Theme）
    │   ├── pages/                 # 页面组件
    │   └── styles/                # 全局样式
    ├── vite.config.ts             # Vite 配置（含 /api 代理）
    ├── package.json
    └── index.html
```

---

## 🚀 快速开始

### 环境要求

- **Python** ≥ 3.10
- **Node.js** ≥ 18（推荐 20+）
- **npm** 或其他包管理器（pnpm / yarn 均可）

### 1️⃣ 启动后端（端口 `8000`）

```bash
# 进入后端目录
cd OfferForge-Backend

# 创建并激活虚拟环境
python -m venv venv

# Windows (Git Bash / CMD)
venv\Scripts\activate
# macOS / Linux
# source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 然后编辑 .env，填入你的 MiniMax API Key 等信息：
#   MINIMAX_API_KEY=你的_api_key
#   MINIMAX_GROUP_ID=你的_group_id
#   MINIMAX_BASE_URL=https://api.minimax.chat/v1
#   JWT_SECRET=请改成你自己的随机字符串

# 启动开发服务器（支持热重载）
uvicorn app.main:app --reload --port 8000
```

启动成功后可访问：

- 📑 API 文档（Swagger）：http://localhost:8000/docs
- 🩺 健康检查：http://localhost:8000/api/health

> 💡 数据库使用 SQLite，首次启动会自动建表，无需手动迁移。

### 2️⃣ 启动前端（端口 `3000`）

**新开一个终端窗口：**

```bash
# 进入前端目录
cd OfferForge-Frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

启动成功后访问：**http://localhost:3000**

> ⚙️ `vite.config.ts` 已配置代理：前端所有 `/api` 请求会自动转发到 `http://localhost:8000`，因此**前后端需同时运行**，无需担心跨域。

### 3️⃣ 开始使用

1. 打开 http://localhost:3000，注册一个账号并登录。
2. 上传简历 → 进入模拟面试 → 结束面试查看评估报告。
3. 跳过的题目会自动进入题库，随时复习。

---

## 🔧 环境变量说明

后端配置文件 `OfferForge-Backend/.env`：

| 变量名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `MINIMAX_API_KEY` | MiniMax 大模型 API Key | `sk-xxxx` |
| `MINIMAX_GROUP_ID` | MiniMax Group ID | `2030xxxxxxxx` |
| `MINIMAX_BASE_URL` | MiniMax 接口地址 | `https://api.minimax.chat/v1` |
| `JWT_SECRET` | JWT 签名密钥（**生产务必修改**） | `your-random-secret` |

> ⚠️ `.env` 已在 `.gitignore` 中，不会提交到仓库。请勿将真实密钥泄露。

---

## 📜 常用命令

### 前端

```bash
npm run dev       # 启动开发服务器（热重载）
npm run build     # 生产构建，输出到 dist/
npm run preview   # 本地预览生产构建
```

### 后端

```bash
uvicorn app.main:app --reload --port 8000   # 开发模式（热重载）
uvicorn app.main:app --port 8000            # 生产模式
```

---

## 📡 API 概览

所有接口统一前缀 `/api`，详细参数与返回结构见 `/docs`。

| 方法 | 路径 | 功能 |
| :--- | :--- | :--- |
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET  | `/api/auth/me` | 获取当前用户 |
| POST | `/api/interviews/parse` | 面经智能拆题入库 |
| GET  | `/api/questions` | 题库列表 |
| GET  | `/api/questions/{id}` | 题目详情 |
| POST | `/api/questions` | 新增题目 |
| POST | `/api/chat` | AI 面试助手问答 |
| POST | `/api/resume/analyze` | 简历预测面试题 |
| POST | `/api/resume/review` | 简历评审报告 |
| POST | `/api/mock-interview/resume/extract` | 上传简历提取文本 |
| POST | `/api/mock-interview/chat` | 模拟面试对话 |
| POST | `/api/mock-interview/evaluate` | 面试结束生成评估 |
| POST | `/api/mock-interview/skipped-questions` | 跳过的题目入库 |
| GET  | `/api/evaluations` | 评估历史列表 |
| GET  | `/api/evaluations/stats` | 评估统计 |
| GET  | `/api/evaluations/{id}` | 评估详情 |
| POST | `/api/evaluations/generate-study-plan` | 生成学习计划 |

---

## 🤝 贡献

欢迎提 Issue 或 Pull Request。提交前请确保：

- 后端 `uvicorn` 启动无报错，`/api/health` 返回正常。
- 前端 `npm run build` 构建通过。

---

## 📄 License

本项目仅用于学习与个人求职准备，请勿用于商业用途。

<div align="center">

<sub>Built with ❤️ for every job seeker. 祝你早日拿到心仪的 Offer！</sub>

</div>
