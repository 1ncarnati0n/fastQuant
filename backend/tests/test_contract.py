from fastapi.testclient import TestClient

from app.main import app
from app.models.market import Candle
from app.services.market_data.intervals import IntervalPlan


def test_analysis_contract_uses_camel_case(monkeypatch) -> None:
    client = TestClient(app)

    async def fake_fetch_market_candles(symbol, interval, market, output_limit=500):
        return (
            [
                Candle(time=1_700_000_000, open=100, high=105, low=99, close=103, volume=1000),
                Candle(time=1_700_086_400, open=103, high=108, low=101, close=106, volume=1200),
            ],
            "binance",
            IntervalPlan(requested=interval, source=interval, factor=1, needs_resample=False),
        )

    monkeypatch.setattr(
        "app.services.analysis.service.fetch_market_candles",
        fake_fetch_market_candles,
    )

    response = client.post(
        "/api/analysis",
        json={
            "symbol": "BTCUSDT",
            "interval": "1d",
            "bbPeriod": 20,
            "bbMultiplier": 2,
            "rsiPeriod": 14,
            "market": "crypto",
            "smaPeriods": [],
            "emaPeriods": [],
            "hmaPeriods": [],
            "macd": None,
            "stochastic": None,
            "showObv": False,
            "showCvd": False,
            "signalStrategies": {},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["symbol"] == "BTCUSDT"
    assert "bollingerBands" in body
    assert "dataSource" in body
