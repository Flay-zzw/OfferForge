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


# ---------- Resume Review ----------
class DimensionScore(BaseModel):
    name: str
    score: int
    comment: str


class ResumeSuggestion(BaseModel):
    section: str
    original_text: str = ""
    issue: str
    suggestion: str
    priority: str  # high / medium / low


class PositionMatch(BaseModel):
    matched: list[str]
    missing: list[str]
    score: int
    advice: str


class ResumeReviewResponse(BaseModel):
    overall_score: int
    dimensions: list[DimensionScore]
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[ResumeSuggestion]
    position_match: PositionMatch | None = None
    summary: str


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
    skip_action: str = ""  # "", "skip", "dont_know"


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


# ---------- Evaluations ----------
class EvaluationResponse(BaseModel):
    id: int
    user_id: int
    overall_score: int
    strengths: list[str]
    weaknesses: list[str]
    learning_path: list[str]
    detailed_feedback: str
    target_position: str | None = None
    created_at: datetime | None = None
    model_config = {"from_attributes": True}


class EvaluationListItem(BaseModel):
    id: int
    overall_score: int
    strengths: list[str]
    weaknesses: list[str]
    target_position: str | None = None
    created_at: datetime | None = None
    model_config = {"from_attributes": True}


class EvaluationStatsResponse(BaseModel):
    scores: list[int]
    average_score: float
    total_count: int
    latest_score: int | None
    score_change: int | None


class StudyPlanResponse(BaseModel):
    focus_areas: list[str]
    weekly_plan: list[dict]
    long_term_goals: list[str]
    resource_recommendations: list[str]
