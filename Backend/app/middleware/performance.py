"""App-level performance middleware utilities."""
from __future__ import annotations

import logging
import time
from typing import Callable, Awaitable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("nexus.performance")


class ResponseTimeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
        response.headers.setdefault("X-Powered-By", "Nexus CRM")
        logger.debug("%s %s - %.2fms", request.method, request.url.path, duration_ms)
        return response
