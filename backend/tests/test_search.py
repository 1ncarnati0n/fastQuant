from app.providers.yahoo import parse_search_response


def test_search_response_returns_remote_equity_and_kr_stock_results() -> None:
    results = parse_search_response(
        {
            "quotes": [
                {
                    "symbol": "NVDA",
                    "shortname": "NVIDIA Corporation",
                    "exchDisp": "NasdaqGS",
                    "quoteType": "EQUITY",
                },
                {
                    "symbol": "005930.KS",
                    "shortname": "Samsung Electronics Co., Ltd.",
                    "exchDisp": "Korea Stock Exchange",
                    "quoteType": "EQUITY",
                },
            ]
        }
    )

    assert [(result.symbol, result.market) for result in results] == [
        ("NVDA", "usStock"),
        ("005930.KS", "krStock"),
    ]


def test_search_response_normalizes_crypto_for_binance_registration_and_allows_forex() -> None:
    results = parse_search_response(
        {
            "quotes": [
                {
                    "symbol": "BTC-USD",
                    "shortname": "Bitcoin USD",
                    "exchDisp": "CCC",
                    "quoteType": "CRYPTOCURRENCY",
                },
                {
                    "symbol": "EURUSD=X",
                    "shortname": "EUR/USD",
                    "exchDisp": "CCY",
                    "quoteType": "CURRENCY",
                },
            ]
        }
    )

    assert results[0].symbol == "BTCUSDT"
    assert results[0].market == "crypto"
    assert results[0].exchange == "Binance"
    assert results[1].market == "forex"


def test_search_response_filters_remote_results_and_deduplicates_symbols() -> None:
    results = parse_search_response(
        {
            "quotes": [
                {"symbol": "AAPL", "shortname": "Apple", "quoteType": "EQUITY"},
                {"symbol": "AAPL", "longname": "Apple Inc.", "quoteType": "EQUITY"},
                {"symbol": "BTC-USD", "shortname": "Bitcoin USD", "quoteType": "CRYPTOCURRENCY"},
            ]
        },
        market_filter="usStock",
    )

    assert [result.symbol for result in results] == ["AAPL"]
