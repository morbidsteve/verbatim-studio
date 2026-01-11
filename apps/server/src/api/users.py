from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List

from src.api.auth import get_current_user

router = APIRouter()


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_approved: bool
    created_at: str


class UserUpdate(BaseModel):
    name: str | None = None
    avatar_url: str | None = None


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    # TODO: Fetch full user profile from database
    raise HTTPException(status_code=501, detail="Not implemented")


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    updates: UserUpdate, current_user: dict = Depends(get_current_user)
):
    # TODO: Update user profile
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(get_current_user)):
    # TODO: List users (admin only)
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/{user_id}/approve")
async def approve_user(user_id: str, current_user: dict = Depends(get_current_user)):
    # TODO: Approve user (admin only)
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/{user_id}/suspend")
async def suspend_user(user_id: str, current_user: dict = Depends(get_current_user)):
    # TODO: Suspend user (admin only)
    raise HTTPException(status_code=501, detail="Not implemented")
