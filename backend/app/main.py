import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from .config import Settings, load_settings
from .db import RecipeRepo
from .jobs import JobManager, RateLimited
from .pipeline import PipelineInput
from .schema import Kategorie, Rezept


class Patch(BaseModel):
    kategorie: Kategorie | None = None
    favorit: bool | None = None


def create_app(cfg: Settings, repo: RecipeRepo | None = None, manager: JobManager | None = None) -> FastAPI:
    repo = repo or RecipeRepo(cfg.data_dir / "gopa.db")
    manager = manager or JobManager(cfg)
    app = FastAPI(title="Gopa")

    @app.get("/api/health")
    def health():
        return {"ok": True}

    # ---- Jobs (Link -> Rezept-Entwurf) ----
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
                    tmp.close()
                    Path(tmp.name).unlink(missing_ok=True)
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

    # ---- Rezepte ----
    @app.get("/api/recipes")
    def list_recipes(kategorie: str | None = None, q: str | None = None, favorit: bool | None = None):
        return repo.list(kategorie, q, favorit)

    @app.post("/api/recipes", status_code=201)
    def save_recipe(r: Rezept):
        return repo.create(r)

    @app.get("/api/recipes/{rid}")
    def get_recipe(rid: str):
        rec = repo.get(rid)
        if not rec:
            raise HTTPException(404, "Rezept nicht gefunden")
        return rec

    @app.put("/api/recipes/{rid}")
    def update_recipe(rid: str, r: Rezept):
        rec = repo.update(rid, r)
        if not rec:
            raise HTTPException(404, "Rezept nicht gefunden")
        return rec

    @app.patch("/api/recipes/{rid}")
    def patch_recipe(rid: str, p: Patch):
        rec = repo.patch(rid, p.kategorie, p.favorit)
        if not rec:
            raise HTTPException(404, "Rezept nicht gefunden")
        return rec

    @app.delete("/api/recipes/{rid}", status_code=204)
    def delete_recipe(rid: str):
        if not repo.delete(rid):
            raise HTTPException(404, "Rezept nicht gefunden")

    return app


app = create_app(load_settings())
