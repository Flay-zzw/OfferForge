from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    userid: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    nickname: Mapped[str] = mapped_column(String(100), default="")
    avatar: Mapped[str] = mapped_column(String(500), default="")
    email: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company: Mapped[str] = mapped_column(String(200), default="")
    difficulty: Mapped[str] = mapped_column(String(50), default="")
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.userid"), nullable=False, index=True)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    strengths: Mapped[str] = mapped_column(Text, default="[]")
    weaknesses: Mapped[str] = mapped_column(Text, default="[]")
    learning_path: Mapped[str] = mapped_column(Text, default="[]")
    detailed_feedback: Mapped[str] = mapped_column(Text, default="")
    target_position: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
