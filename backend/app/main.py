from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analysis, fundamentals, search, strategy, watchlist
from app.core.config import settings
from app.core.errors import ApiError, api_error_handler


def create_app() -> FastAPI:
    app = FastAPI(
        title="fastQuant API",
        version="0.1.0",
        description="FastAPI backend for Quanting's SvelteKit migration.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_exception_handler(ApiError, api_error_handler)  # type: ignore[arg-type]

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "fastquant-api"}

    app.include_router(analysis.router, prefix="/api", tags=["analysis"])
    app.include_router(watchlist.router, prefix="/api/watchlist", tags=["watchlist"])
    app.include_router(fundamentals.router, prefix="/api", tags=["fundamentals"])
    app.include_router(strategy.router, prefix="/api/strategy", tags=["strategy"])
    app.include_router(search.router, prefix="/api/search", tags=["search"])

    return app


app = create_app()
