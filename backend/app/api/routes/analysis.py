from fastapi import APIRouter, HTTPException

from app.models.market import AnalysisParams, AnalysisResponse
from app.services.analysis.service import analyze_market

router = APIRouter()


@router.post("/analysis", response_model=AnalysisResponse)
async def fetch_analysis(params: AnalysisParams) -> AnalysisResponse:
    try:
        return await analyze_market(params)
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
