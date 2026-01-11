from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime

from src.api.auth import get_current_user

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    workspace_id: str | None = None
    template_id: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str | None
    owner_id: str
    workspace_id: str | None
    status: str
    created_at: str
    updated_at: str


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate, current_user: dict = Depends(get_current_user)
):
    # TODO: Create project in database
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    workspace_id: str | None = None, current_user: dict = Depends(get_current_user)
):
    # TODO: List projects for current user
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    # TODO: Get project by ID
    raise HTTPException(status_code=501, detail="Not implemented")


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str, updates: ProjectUpdate, current_user: dict = Depends(get_current_user)
):
    # TODO: Update project
    raise HTTPException(status_code=501, detail="Not implemented")


@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    # TODO: Delete project (soft delete)
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/{project_id}/share")
async def share_project(
    project_id: str,
    user_id: str,
    permission: str = "view",
    current_user: dict = Depends(get_current_user),
):
    # TODO: Share project with user
    raise HTTPException(status_code=501, detail="Not implemented")
