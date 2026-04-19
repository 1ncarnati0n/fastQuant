from app.cache.ttl import TTLCache, get_default_cache


def get_cache() -> TTLCache:
    return get_default_cache()
