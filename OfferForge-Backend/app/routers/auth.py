from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter()


@router.post("/auth/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not request.account.strip():
        raise HTTPException(status_code=400, detail="账号不能为空")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="密码至少 6 位")

    existing = await db.execute(
        select(User).where(User.account == request.account.strip())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="该账号已被注册")

    nickname = request.nickname.strip() or request.account.strip()
    user = User(
        account=request.account.strip(),
        password_hash=hash_password(request.password),
        nickname=nickname,
        avatar="",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.userid)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.account == request.account.strip())
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="账号或密码错误")

    token = create_access_token(user.userid)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/auth/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)