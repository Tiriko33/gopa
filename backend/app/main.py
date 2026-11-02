import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from .config import load_settings
from .jobs import JobManager, RateLimited
from .pipeline import PipelineInput

cfg = load_settings()
manager = JobManager(cfg)
app = FastAPI(title="Gopa")


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/jobs")
async def create_job(link: str = Form(...), text: str = Form(""), video: UploadFile | None = File(None)):
    upload_path = None
    if video is not None:
        limit = cfg.max_video_mb * 1024 * 1024
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=Path(video.filename or "v.mp4").suffix)
        size = 0
        while chunk := await video.read(1024 * 1024):
            size += len(chunk)
            if size > limit:
                tmp.close(); Path(tmp.name).unlink(missing_ok=True)
                raise HTTPException(413, "Das Video ist zu groß.")
            tmp.write(chunk)
        tmp.close()
        upload_path = Path(tmp.name)
    try:
        job = manager.start(PipelineInput(link, text, upload_path))
    except RateLimited:
        raise HTTPException(429, "Gopa braucht eine kleine Pause. Versuche es in einer Stunde wieder.")
    return {"id": job.id}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    job = manager.jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job nicht gefunden")
    return {"id": job.id, "status": job.status, "step": job.step, "result": job.result, "error": job.error}
