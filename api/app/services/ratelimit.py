"""A small limit on how often one visitor may send replies to one wedding.

It lives in this server's memory, so it resets when the server restarts and is not shared between servers.
That is enough to stop a script from filling a wedding's guest list by accident or for fun; it is not a security
boundary. The visitor is told apart by the address the web app passes along in X-Forwarded-For.
"""

import time
from collections import defaultdict, deque
from collections.abc import Callable


class RateLimiter:
    def __init__(self, limit: int, window_seconds: float, clock: Callable[[], float] = time.monotonic):
        self.limit, self.window, self.clock = limit, window_seconds, clock
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        """True and counted if the visitor is under the limit; False (not counted) if over."""
        now = self.clock()
        hits = self._hits[key]
        while hits and now - hits[0] >= self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        # Forget visitors who have gone quiet so the table cannot grow without end.
        if len(self._hits) > 5000:
            for stale in [k for k, v in self._hits.items() if not v or now - v[-1] >= self.window]:
                del self._hits[stale]
        return True


# Ten replies or changes in ten minutes from one address to one wedding is far more than a family needs.
rsvp_limiter = RateLimiter(limit=10, window_seconds=600)

# Five blessings from one address to one wedding in ten minutes is plenty for a family of guests on one connection.
blessing_limiter = RateLimiter(limit=5, window_seconds=600)

# Five messages from one address to one invitation in ten minutes.
guestbook_limiter = RateLimiter(limit=5, window_seconds=600)
