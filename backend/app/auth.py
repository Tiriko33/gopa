"""Einfacher Passwortschutz für genau eine Person: Passwort aus APP_PASSWORD, kein Benutzersystem.
Der Token ist ein HMAC über eine feste Zeichenkette mit dem Passwort als Schlüssel. Er bleibt auf dem Handy
gespeichert und wird ungültig, sobald das Passwort geändert wird."""
import hashlib
import hmac
import time
from collections import deque

from fastapi import Header, HTTPException

MAX_FAILS = 10
WINDOW_SECONDS = 600


def make_token(password: str) -> str:
    return hmac.new(password.encode(), b"gopa-session-v1", hashlib.sha256).hexdigest()


class Auth:
    def __init__(self, password: str):
        self.password = password
        self._fails: deque[float] = deque()

    def login(self, given: str) -> str:
        if not self.password:
            raise HTTPException(503, "Gopa ist noch nicht eingerichtet (APP_PASSWORD fehlt).")
        now = time.time()
        while self._fails and now - self._fails[0] > WINDOW_SECONDS:
            self._fails.popleft()
        if len(self._fails) >= MAX_FAILS:
            raise HTTPException(429, "Zu viele Versuche. Warte ein paar Minuten.")
        if not hmac.compare_digest(given.encode(), self.password.encode()):
            self._fails.append(now)
            raise HTTPException(401, "Das Passwort stimmt nicht.")
        return make_token(self.password)

    def require(self, authorization: str | None = Header(default=None)) -> None:
        if not self.password:
            raise HTTPException(503, "Gopa ist noch nicht eingerichtet (APP_PASSWORD fehlt).")
        token = (authorization or "").removeprefix("Bearer ").strip()
        if not hmac.compare_digest(token.encode(), make_token(self.password).encode()):
            raise HTTPException(401, "Bitte melde dich an.")
