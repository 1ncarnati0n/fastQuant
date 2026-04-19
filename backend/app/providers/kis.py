import asyncio
import os
from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

import httpx

from app.models.market import Candle, FundamentalsResponse, MarketType

BASE_URL = "https://openapi.koreainvestment.com:9443"
KST = ZoneInfo("Asia/Seoul")
_cached_token: tuple[str, datetime] | None = None
_token_lock = asyncio.Lock()


async def fetch_klines(symbol: str, interval: str, limit: int) -> list[Candle]:
    app_key, app_secret = load_credentials()
    stock_code = parse_symbol(symbol)
    if interval in {"1m", "5m", "15m", "30m", "1h", "60m"}:
        return await fetch_minute_candles(stock_code, interval, limit, app_key, app_secret)
    return await fetch_daily_candles(stock_code, interval, limit, app_key, app_secret)


def load_credentials() -> tuple[str, str]:
    app_key = os.getenv("KIS_APP_KEY")
    app_secret = os.getenv("KIS_APP_SECRET")
    if app_key and app_secret:
        return app_key, app_secret
    raise RuntimeError(
        "KIS_APP_KEY/KIS_APP_SECRET 환경변수가 없어 KIS 데이터를 조회할 수 없습니다."
    )


async def get_token(app_key: str, app_secret: str) -> str:
    global _cached_token
    now = datetime.now(UTC)
    if _cached_token is not None and _cached_token[1] - now > timedelta(minutes=5):
        return _cached_token[0]

    async with _token_lock:
        now = datetime.now(UTC)
        if _cached_token is not None and _cached_token[1] - now > timedelta(minutes=5):
            return _cached_token[0]

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                f"{BASE_URL}/oauth2/tokenP",
                json={
                    "grant_type": "client_credentials",
                    "appkey": app_key,
                    "appsecret": app_secret,
                },
            )
            response.raise_for_status()
            payload = response.json()

        access_token = payload.get("access_token")
        if not isinstance(access_token, str) or not access_token:
            raise RuntimeError("KIS token response missing access_token")
        expires_in = int(payload.get("expires_in", 86_400))
        _cached_token = (access_token, now + timedelta(seconds=expires_in))
        return access_token


async def fetch_daily_candles(
    stock_code: str,
    interval: str,
    limit: int,
    app_key: str,
    app_secret: str,
) -> list[Candle]:
    token = await get_token(app_key, app_secret)
    period = {"1w": "W", "1M": "M"}.get(interval, "D")
    today = datetime.now(KST).strftime("%Y%m%d")
    start_date = "19900101" if interval == "1M" else "20000101" if interval == "1w" else "20200101"

    payload = await request_kis(
        "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
        token,
        app_key,
        app_secret,
        "FHKST03010100",
        {
            "fid_cond_mrkt_div_code": "J",
            "fid_input_iscd": stock_code,
            "fid_input_date_1": start_date,
            "fid_input_date_2": today,
            "fid_period_div_code": period,
            "fid_org_adj_prc": "0",
        },
    )
    candles = [
        candle
        for item in payload.get("output2", [])
        if (candle := parse_daily_item(item)) is not None
    ]
    candles.sort(key=lambda candle: candle.time)
    return trim_non_empty(candles, limit, "KIS daily API")


async def fetch_minute_candles(
    stock_code: str,
    interval: str,
    limit: int,
    app_key: str,
    app_secret: str,
) -> list[Candle]:
    token = await get_token(app_key, app_secret)
    tick_unit = {"1m": "1", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "60m": "60"}.get(
        interval, "1"
    )
    all_candles: list[Candle] = []
    cursor_time = "160000"

    for _ in range(50):
        if len(all_candles) >= limit:
            break
        payload = await request_kis(
            "/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice",
            token,
            app_key,
            app_secret,
            "FHKST03010200",
            {
                "fid_cond_mrkt_div_code": "J",
                "fid_input_iscd": stock_code,
                "fid_input_hour_1": cursor_time,
                "fid_pw_data_incu_yn": "Y",
                "fid_etc_cls_code": tick_unit,
            },
        )
        items = payload.get("output2", [])
        page = [candle for item in items if (candle := parse_minute_item(item)) is not None]
        if not page:
            break
        all_candles.extend(page)
        last_time = next(
            (item.get("stck_cntg_hour") for item in reversed(items) if item.get("stck_cntg_hour")),
            None,
        )
        if not isinstance(last_time, str):
            break
        cursor_time = last_time
        await asyncio.sleep(0.05)

    all_candles.sort(key=lambda candle: candle.time)
    deduped = {candle.time: candle for candle in all_candles}
    return trim_non_empty(list(deduped.values()), limit, "KIS minute API")


async def request_kis(
    path: str,
    token: str,
    app_key: str,
    app_secret: str,
    tr_id: str,
    params: dict[str, str],
) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{BASE_URL}{path}",
            headers={
                "authorization": f"Bearer {token}",
                "appkey": app_key,
                "appsecret": app_secret,
                "tr_id": tr_id,
                "content-type": "application/json; charset=utf-8",
            },
            params=params,
        )
        response.raise_for_status()
        payload = response.json()
    check_kis_error(payload)
    return payload


def parse_daily_item(item: dict) -> Candle | None:
    date_text = item.get("stck_bsop_date")
    if not isinstance(date_text, str):
        return None
    timestamp = datetime.combine(
        datetime.strptime(date_text, "%Y%m%d").date(),
        time(hour=9),
        tzinfo=KST,
    ).timestamp()
    return Candle(
        time=int(timestamp),
        open=parse_float(item.get("stck_oprc")),
        high=parse_float(item.get("stck_hgpr")),
        low=parse_float(item.get("stck_lwpr")),
        close=parse_float(item.get("stck_clpr")),
        volume=parse_float(item.get("acml_vol")),
    )


def parse_minute_item(item: dict) -> Candle | None:
    date_text = item.get("stck_bsop_date")
    time_text = item.get("stck_cntg_hour")
    if not isinstance(date_text, str) or not isinstance(time_text, str):
        return None
    timestamp = (
        datetime.strptime(f"{date_text}{time_text}", "%Y%m%d%H%M%S").replace(tzinfo=KST).timestamp()
    )
    return Candle(
        time=int(timestamp),
        open=parse_float(item.get("stck_oprc")),
        high=parse_float(item.get("stck_hgpr")),
        low=parse_float(item.get("stck_lwpr")),
        close=parse_float(item.get("stck_prpr")),
        volume=parse_float(item.get("cntg_vol")),
    )


def parse_symbol(symbol: str) -> str:
    code = symbol.split(".", 1)[0].strip()
    if not code:
        raise ValueError(f"Invalid KR symbol format: {symbol}")
    return code


def parse_float_or_none(value: object) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text in ("0", "0.00", ""):
        return None
    try:
        return float(text)
    except ValueError:
        return None


def parse_float(value: object) -> float:
    if value is None:
        return 0.0
    try:
        return float(str(value).strip() or "0")
    except ValueError:
        return 0.0


async def fetch_quote(stock_code: str, app_key: str, app_secret: str) -> dict:
    token = await get_token(app_key, app_secret)
    return await request_kis(
        "/uapi/domestic-stock/v1/quotations/inquire-price",
        token,
        app_key,
        app_secret,
        "FHKST01010100",
        {"fid_cond_mrkt_div_code": "J", "fid_input_iscd": stock_code},
    )


async def fetch_stock_info(stock_code: str, app_key: str, app_secret: str) -> dict:
    token = await get_token(app_key, app_secret)
    return await request_kis(
        "/uapi/domestic-stock/v1/quotations/search-stock-info",
        token,
        app_key,
        app_secret,
        "CTPF1002R",
        {"PRDT_TYPE_CD": "300", "PDNO": stock_code},
    )


async def fetch_fundamentals(symbol: str, market: MarketType) -> FundamentalsResponse:
    app_key, app_secret = load_credentials()
    stock_code = parse_symbol(symbol)

    quote_result, info_result = await asyncio.gather(
        fetch_quote(stock_code, app_key, app_secret),
        fetch_stock_info(stock_code, app_key, app_secret),
        return_exceptions=True,
    )

    output: dict = quote_result.get("output", {}) if isinstance(quote_result, dict) else {}
    info_output: dict = info_result.get("output", {}) if isinstance(info_result, dict) else {}

    market_cap_oku = parse_float_or_none(output.get("hts_avls"))
    dval = parse_float_or_none(output.get("hts_dval"))

    short_name = (
        info_output.get("hts_kor_isnm")
        or info_output.get("prdt_name")
        or None
    )

    return FundamentalsResponse(
        symbol=symbol,
        market=market,
        short_name=short_name,
        currency="KRW",
        market_cap=market_cap_oku * 1e8 if market_cap_oku is not None else None,
        trailing_pe=parse_float_or_none(output.get("per")),
        price_to_book=parse_float_or_none(output.get("pbr")),
        trailing_eps=parse_float_or_none(output.get("eps")),
        dividend_yield=dval / 100 if dval is not None else None,
        fifty_two_week_high=parse_float_or_none(output.get("w52_hgpr")),
        fifty_two_week_low=parse_float_or_none(output.get("w52_lwpr")),
    )


def check_kis_error(payload: dict) -> None:
    if payload.get("rt_cd", "1") != "0":
        msg_code = payload.get("msg_cd", "")
        message = payload.get("msg1", "Unknown error")
        raise RuntimeError(f"KIS API error [{msg_code}]: {message}")


def trim_non_empty(candles: list[Candle], limit: int, source: str) -> list[Candle]:
    output = candles[-limit:] if len(candles) > limit else candles
    if not output:
        raise RuntimeError(f"{source}: 캔들 데이터가 없습니다")
    return output
