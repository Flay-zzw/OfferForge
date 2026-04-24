from datetime import datetime

from pydantic import BaseModel


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
