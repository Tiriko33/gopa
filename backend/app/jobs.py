"""Asynchrone Jobs (im Speicher; Ergebnis wird in Meilenstein 2 in SQLite gespeichert)."""
import threading
import time
import uuid
from collections import defaultdict, deque
from dataclasses import dataclass, field
from pathlib import Path

from .config import Settings
from .pipeline import PipelineInput, run_pipeline
from .sources import PipelineError
from .urls import InvalidLink

STEPS = ["download", "transcribe", "translate"]


@dataclass
class Job:
    id: str
    status: str = "running"  # running | done | error
    step: str = "download"
    result: dict | None = None
    error: dict | None = None
    created: float = field(default_factory=time.time)


class RateLimited(Exception):
    pass


class JobManager:
    def __init__(self, cfg: Settings):
        self.cfg = cfg
        self.jobs: dict[str, Job] = {}
        self._hits: deque[float] = deque()
        self._lock = threading.Lock()

    def _check_rate(self) -> None:
        now = time.time()
        while self._hits and now - self._hits[0] > 3600:
            self._hits.popleft()
        if len(self._hits) >= self.cfg.rate_limit_per_hour:
            raise RateLimited()
        self._hits.append(now)

    def start(self, inp: PipelineInput) -> Job:
        with self._lock:
            self._check_rate()
            job = Job(id=uuid.uuid4().hex)
            self.jobs[job.id] = job
        threading.Thread(target=self._run, args=(job, inp), daemon=True).start()
        return job

    def _run(self, job: Job, inp: PipelineInput) -> None:
        try:
            rezept = run_pipeline(inp, self.cfg, progress=lambda s: setattr(job, "step", s))
            job.result = rezept.model_dump()
            job.status = "done"
        except InvalidLink as e:
            job.error, job.status = {"code": "invalid_link", "message": str(e), "fallback": False}, "error"
        except PipelineError as e:
            job.error, job.status = {"code": e.code, "message": e.message, "fallback": e.fallback}, "error"
        except Exception:  # noqa: BLE001
            job.error = {"code": "unknown", "message": "Da ist etwas schiefgelaufen. Versuche es noch einmal.",
                         "fallback": True}
            job.status = "error"
        finally:
            if inp.upload_path:
                inp.upload_path.unlink(missing_ok=True)
