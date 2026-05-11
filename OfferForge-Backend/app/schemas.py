from datetime import datetime

from pydantic import BaseModel


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    account: str
    password: str
    nickname: str = ""


class LoginRequest(BaseModel):
    account: str
    password: str


class UserResponse(BaseModel):
    userid: int
    account: str
    nickname: str
    avatar: str
    email: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ---------- Questions ----------
class QuestionCreate(BaseModel):
    company: str = ""
    difficulty: str = ""
    question: str
    answer: str = ""


class QuestionResponse(BaseModel):
    id: int
    company: str
    difficulty: str
    question: str
    answer: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class InterviewParseRequest(BaseModel):
    content: str
    company: str = ""


class ParsedQuestion(BaseModel):
    question: str
    difficulty: str
    answer: str


class InterviewParseResponse(BaseModel):
    questions: list[ParsedQuestion]


class ChatRequest(BaseModel):
    message: str
    history: list[dict] | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatResponse(BaseModel):
    reply: str


class ResumeAnalyzeRequest(BaseModel):
    resume_content: str
    target_position: str = ""


class PredictedQuestion(BaseModel):
    question: str
    difficulty: str
    category: str
    reason: str


class ResumeAnalyzeResponse(BaseModel):
    predicted_questions: list[PredictedQuestion]
    overall_analysis: str


# ---------- Mock Interview: Resume Extract ----------
class ResumeExtractResponse(BaseModel):
    resume_markdown: str
    resume_raw: str


# ---------- Mock Interview: Chat ----------
class InterviewMessage(BaseModel):
    role: str
    content: str


class InterviewChatRequest(BaseModel):
    resume_text: str
    conversation_history: list[InterviewMessage] = []
    target_position: str = ""


class InterviewChatResponse(BaseModel):
    message: str
    is_complete: bool = False


# ---------- Mock Interview: Evaluate ----------
class InterviewEvaluateRequest(BaseModel):
    resume_text: str
    conversation_history: list[InterviewMessage]
    target_position: str = ""


class InterviewEvaluateResponse(BaseModel):
    overall_score: int
    strengths: list[str]
    weaknesses: list[str]
    learning_path: list[str]
    detailed_feedback: str
