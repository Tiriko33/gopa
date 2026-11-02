import shutil
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from . import sources
from .config import Settings
from .llm import structure_recipe
from .schema import Rezept
from .sources import PipelineError
from .urls import validate_link

_MEDIA = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}

Progress = Callable[[str], None]  # Schritt: "download" | "transcribe" | "translate"


@dataclass
class PipelineInput:
    url: str
    manual_text: str = ""
    upload_path: Path | None = None  # hochgeladenes Video (Fallback)
    image_paths: list[Path] = field(default_factory=list)  # Screenshots (Fallback)


def run_pipeline(inp: PipelineInput, cfg: Settings, progress: Progress = lambda s: None,
                 llm_client=None) -> Rezept:
    url, plattform = validate_link(inp.url)  # 1. Link validieren
    workdir = Path(tempfile.mkdtemp(prefix="gopa_"))
    try:
        # 2. Download (Fehler nur dann fatal, wenn auch kein Fallback-Material vorliegt)
        progress("download")
        dl = sources.Downloaded()
        try:
            dl = sources.download(url, workdir, cfg)
        except PipelineError:
            if not (inp.manual_text.strip() or inp.upload_path or inp.image_paths):
                raise
        video = inp.upload_path or dl.video_path

        # 3a. Caption reicht?
        transcript = ocr = ""
        if not sources.caption_has_full_recipe(dl.caption) and video:
            # 3b. Audio -> Whisper
            progress("transcribe")
            audio = sources.extract_audio(video, workdir)
            if audio:
                transcript = sources.transcribe(audio, cfg)
            # 3c. OCR (optional)
            if cfg.enable_ocr:
                ocr = sources.ocr_frames(video, workdir, cfg)

        # 4. Claude
        progress("translate")
        texts = {"title": dl.title, "caption": dl.caption, "transcript": transcript,
                 "ocr": ocr, "manual": inp.manual_text}
        images = [(_MEDIA.get(p.suffix.lower(), "image/jpeg"), p.read_bytes()) for p in inp.image_paths]
        return structure_recipe(texts, {"url": url, "plattform": plattform, "creator": dl.creator}, cfg,
                                client=llm_client, images=images)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)  # 5. Video und Zwischendateien löschen
