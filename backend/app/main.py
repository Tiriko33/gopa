import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .auth import Auth
from .config import Settings, load_settings
from .db import RecipeRepo
from .jobs import JobManager, RateLimited
from .pipeline import PipelineInput
from .schema import Kategorie, Rezept


class Login(BaseModel):
    password: str


class Patch(BaseModel):
    kategorie: Kategorie | None = None
    favorit: bool | None = None


def create_app(cfg: Settings, repo: RecipeRepo | None = None, manager: JobManager | None = None) -> FastAPI:
    repo = repo or RecipeRepo(cfg.data_dir / "gopa.db")
    manager = manager or JobManager(cfg)
    app = FastAPI(title="Gopa")
    auth = Auth(cfg.app_password)
    api = APIRouter(dependencies=[Depends(auth.require)])

    @app.get("/api/health")
    def health():
        return {"ok": True}

    @app.post("/api/login")
    def login(body: Login):
        return {"token": auth.login(body.password)}

    # ---- Jobs (Link -> Rezept-Entwurf) ----
    async def _save_upload(f: UploadFile, limit: int) -> Path:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=Path(f.filename or "x").suffix)
        size = 0
        while chunk := await f.read(1024 * 1024):
            size += len(chunk)
            if size > limit:
                tmp.close()
                Path(tmp.name).unlink(missing_ok=True)
                raise HTTPException(413, "Die Datei ist zu groß.")
            tmp.write(chunk)
        tmp.close()
        return Path(tmp.name)

    @api.post("/api/jobs")
    async def create_job(link: str = Form(...), text: str = Form(""), files: list[UploadFile] = File(default=[])):
        """Fallback-Material: ein Video und/oder bis zu 8 Screenshots (Bilder)."""
        video: Path | None = None
        images: list[Path] = []
        saved: list[Path] = []
        try:
            for f in files:
                ct = f.content_type or ""
                if ct.startswith("video/") and video is None:
                    video = await _save_upload(f, cfg.max_video_mb * 1024 * 1024)
                    saved.append(video)
                elif ct.startswith("image/") and len(images) < 8:
                    img = await _save_upload(f, 8 * 1024 * 1024)
                    images.append(img)
                    saved.append(img)
            job = manager.start(PipelineInput(link, text, video, images))
        except RateLimited:
            for p in saved:
                p.unlink(missing_ok=True)
            raise HTTPException(429, "Gopa braucht eine kleine Pause. Versuche es in einer Stunde wieder.")
        except HTTPException:
            for p in saved:
                p.unlink(missing_ok=True)
            raise
        return {"id": job.id}

    @api.get("/api/jobs/{job_id}")
    def get_job(job_id: str):
        job = manager.jobs.get(job_id)
        if not job:
            raise HTTPException(404, "Job nicht gefunden")
        return {"id": job.id, "status": job.status, "step": job.step, "result": job.result, "error": job.error}

    # ---- Rezepte ----
    @api.get("/api/recipes")
    def list_recipes(kategorie: str | None = None, q: str | None = None, favorit: bool | None = None):
        return repo.list(kategorie, q, favorit)

    @api.post("/api/recipes", status_code=201)
    def save_recipe(r: Rezept):
        return repo.create(r)

    @api.get("/api/recipes/{rid}")
    def get_recipe(rid: str):
        rec = repo.get(rid)
        if not rec:
            raise HTTPException(404, "Rezept nicht gefunden")
        return rec

    @api.put("/api/recipes/{rid}")
    def update_recipe(rid: str, r: Rezept):
        rec = repo.update(rid, r)
        if not rec:
            raise HTTPException(404, "Rezept nicht gefunden")
        return rec

    @api.patch("/api/recipes/{rid}")
    def patch_recipe(rid: str, p: Patch):
        rec = repo.patch(rid, p.kategorie, p.favorit)
        if not rec:
            raise HTTPException(404, "Rezept nicht gefunden")
        return rec

    @api.delete("/api/recipes/{rid}", status_code=204)
    def delete_recipe(rid: str):
        if not repo.delete(rid):
            raise HTTPException(404, "Rezept nicht gefunden")

    app.include_router(api)

    # Gebautes Frontend ausliefern (im Docker-Image), mit Fallback auf index.html für die App-Routen
    static = cfg.static_dir
    if static and (static / "index.html").exists():
        root = static.resolve()

        @app.get("/{path:path}", include_in_schema=False)
        def spa(path: str):
            if path.startswith("api/"):
                raise HTTPException(404)
            f = (root / path).resolve()
            if path and f.is_file() and root in f.parents:
                headers = {"Cache-Control": "no-cache"} if f.name in ("sw.js", "index.html", "manifest.webmanifest") else {}
                return FileResponse(f, headers=headers)
            return FileResponse(root / "index.html", headers={"Cache-Control": "no-cache"})

    return app


app = create_app(load_settings())
