from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


class ApiError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 500,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


class ProviderError(ApiError):
    def __init__(
        self,
        provider: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="provider_error",
            message=message,
            status_code=502,
            details={"provider": provider, **(details or {})},
        )


class InvalidSymbolError(ApiError):
    def __init__(self, symbol: str) -> None:
        super().__init__(
            code="invalid_symbol",
            message=f"Symbol '{symbol}' not found or invalid",
            status_code=404,
        )


class NoDataError(ApiError):
    def __init__(self, detail: str = "No market data available") -> None:
        super().__init__(code="no_data", message=detail, status_code=404)


async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:  # noqa: ARG001
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )
