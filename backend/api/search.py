from fastapi import APIRouter, Request
from pydantic import BaseModel
import os
from backend.model.inference import run_classification_pipeline

router = APIRouter()

class SearchRequest(BaseModel):
    location: str
    radius: float

@router.post("/")
async def search(data: SearchRequest):
    location = data.location
    radius = data.radius

    results = run_classification_pipeline(location, radius)
    return {"interesting": results}
