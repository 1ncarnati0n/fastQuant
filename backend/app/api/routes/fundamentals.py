from fastapi import APIRouter, HTTPException

from app.models.market import FundamentalsParams, FundamentalsResponse
from app.providers import kis
from app.services.market_data import yahoo

router = APIRouter()


@router.post("/fundamentals", response_model=FundamentalsResponse)
async def fetch_fundamentals(params: FundamentalsParams) -> FundamentalsResponse:
    if params.market == "crypto":
        raise HTTPException(
            status_code=400,
            detail="재무 데이터는 주식/ETF/외환 심볼에서만 지원됩니다",
        )
    try:
        if params.market == "krStock":
            try:
                return await kis.fetch_fundamentals(params.symbol, params.market)
            except Exception:
                pass
        return await yahoo.fetch_fundamentals(params.symbol, params.market)
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
