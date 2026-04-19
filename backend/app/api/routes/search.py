from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.models.market import MarketType, SymbolSearchResult
from app.services.market_data import yahoo

router = APIRouter()


@router.get("/symbols", response_model=list[SymbolSearchResult])
async def search_symbols(
    query: str = Query(..., min_length=1),
    market_filter: Annotated[MarketType | None, Query(alias="marketFilter")] = None,
) -> list[SymbolSearchResult]:
    if len(query.strip()) < 2:
        return []

    try:
        return await yahoo.search_symbols(query.strip(), market_filter)
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
