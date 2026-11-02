"""Schritte 2 und 3 der Pipeline: Download, Caption-Check, Audio, Transkription, OCR."""
import difflib
import json
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from dataclasses import dataclass, field
from pathlib import Path

from .config import Settings


class PipelineError(Exception):
    """Fehler mit verständlicher deutscher Meldung (für die Gopa-Sprechblase)."""

    def __init__(self, message: str, code: str = "fehler", fallback: bool = True):
        super().__init__(message)
        self.message = message
        self.code = code
        self.fallback = fallback  # Soll die App Text/Screenshot-Fallback anbieten?


@dataclass
class Downloaded:
    title: str | None = None
    caption: str = ""
    creator: str | None = None
    video_path: Path | None = None


# ---------- Download ----------

def download(url: str, workdir: Path, cfg: Settings) -> Downloaded:
    workdir.mkdir(parents=True, exist_ok=True)
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--no-playlist", "--no-warnings", "--write-info-json",
        "--max-filesize", f"{cfg.max_video_mb}M",
        "--socket-timeout", "20",
        "-f", "best[height<=720]/best",
        "-o", str(workdir / "video.%(ext)s"),
        url,
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=cfg.timeout_download)
    except subprocess.TimeoutExpired:
        raise PipelineError("Das Laden des Videos hat zu lange gedauert.", "download_timeout")
    info_file = workdir / "video.info.json"
    info = {}
    if info_file.exists():
        info = json.loads(info_file.read_text(encoding="utf-8"))
    video = next((p for p in workdir.glob("video.*") if p.suffix not in (".json", ".part")), None)
    # Längenlimit selbst prüfen: yt-dlps --match-filter bricht bei TikTok mit einem Typfehler ab
    try:
        too_long = float(info.get("duration") or 0) > cfg.max_video_seconds
    except (TypeError, ValueError):
        too_long = False
    if too_long:
        if video:
            video.unlink(missing_ok=True)
        raise PipelineError("Das Video ist zu lang für Gopa.", "too_large")
    if proc.returncode != 0 and not info:
        err = (proc.stderr or "")[-400:]
        if "login" in err.lower() or "rate-limit" in err.lower() or "empty media response" in err.lower():
            raise PipelineError(
                "Instagram lässt Gopa dieses Video nicht ansehen. Füge den Text aus der Beschreibung "
                "oder einen Screenshot hinzu.", "login_required")
        if "filesize" in err.lower() or "does not pass filter" in err.lower():
            raise PipelineError("Das Video ist zu lang oder zu groß für Gopa.", "too_large")
        raise PipelineError("Gopa konnte das Video nicht laden. Füge den Text oder einen Screenshot hinzu.",
                            "download_failed")
    return Downloaded(
        title=info.get("title"),
        caption=(info.get("description") or "").strip(),
        creator=info.get("uploader") or info.get("channel") or info.get("creator"),
        video_path=video,
    )


# ---------- Caption-Heuristik ----------

_QTY = re.compile(
    r"^\s*(?:[-•*·]\s*)?(?:\d+[\d.,/½¼¾]*|½|¼|¾)\s*(?:g|kg|ml|l|el|tl|cups?|tbsp|tsp|oz|lbs?|stück|prise|dose|zehen?)\b",
    re.IGNORECASE | re.MULTILINE,
)
_STEP_WORDS = re.compile(r"\b(mix|bake|cook|add|stir|heat|minutes?|mischen|backen|kochen|geben|rühren|minuten|erhitzen|anrichten)\b", re.I)


def caption_has_full_recipe(caption: str) -> bool:
    """Caption enthält ein vollständiges Rezept: mind. 4 Zutatenzeilen mit Menge und Zubereitungswörter."""
    return len(_QTY.findall(caption)) >= 4 and bool(_STEP_WORDS.search(caption))


# ---------- Audio, Whisper ----------

def _need_ffmpeg() -> str:
    path = shutil.which("ffmpeg")
    if not path:
        raise PipelineError("ffmpeg fehlt auf dem Server.", "ffmpeg_missing", fallback=False)
    return path


def extract_audio(video: Path, workdir: Path, timeout: int = 60) -> Path | None:
    out = workdir / "audio.wav"
    try:
        subprocess.run([_need_ffmpeg(), "-y", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000", str(out)],
                       capture_output=True, timeout=timeout, check=True)
    except subprocess.CalledProcessError:
        return None  # Video ohne Tonspur
    except subprocess.TimeoutExpired:
        raise PipelineError("Die Tonspur zu extrahieren hat zu lange gedauert.", "audio_timeout")
    return out


_model = None


def _transcribe_blocking(audio: Path, model_name: str) -> str:
    global _model
    from faster_whisper import WhisperModel  # lazy: schwere Abhängigkeit

    if _model is None:
        _model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, _info = _model.transcribe(read_wav(audio), vad_filter=True)  # Sprache wird automatisch erkannt
    return " ".join(s.text.strip() for s in segments).strip()


def read_wav(path: Path):
    """16-kHz-Mono-WAV (von ffmpeg erzeugt) als float32-Array. So decodiert faster-whisper nicht selbst
    (sein Dekoder über PyAV bricht bei neueren PyAV-Versionen ab)."""
    import wave

    import numpy as np

    with wave.open(str(path), "rb") as w:
        raw = w.readframes(w.getnframes())
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def transcribe(audio: Path, cfg: Settings) -> str:
    # Thread mit Timeout: bei Überschreitung bricht die Pipeline ab (der Thread läuft zu Ende, blockiert aber nichts)
    ex = ThreadPoolExecutor(max_workers=1)
    fut = ex.submit(_transcribe_blocking, audio, cfg.whisper_model)
    try:
        return fut.result(timeout=cfg.timeout_transcribe)
    except FutureTimeout:
        raise PipelineError("Das Erkennen des gesprochenen Textes hat zu lange gedauert.", "whisper_timeout")
    except Exception as e:  # noqa: BLE001 - Modell fehlt, kaputte Datei, nicht installiert
        raise PipelineError("Gopa konnte den gesprochenen Text nicht erkennen. Füge den Text oder einen Screenshot hinzu.",
                            "whisper_failed") from e
    finally:
        ex.shutdown(wait=False)


# ---------- OCR ----------

def dedupe_texts(texts: list[str], threshold: float = 0.85) -> list[str]:
    kept: list[str] = []
    for t in texts:
        norm = re.sub(r"\s+", " ", t).strip()
        if len(norm) < 4:
            continue
        if any(difflib.SequenceMatcher(None, norm.lower(), k.lower()).ratio() >= threshold for k in kept):
            continue
        kept.append(norm)
    return kept


def ocr_frames(video: Path, workdir: Path, cfg: Settings) -> str:
    if not shutil.which("tesseract"):
        return ""  # optional: ohne Tesseract einfach überspringen
    frames = workdir / "frames"
    frames.mkdir(exist_ok=True)
    try:
        subprocess.run([_need_ffmpeg(), "-y", "-i", str(video), "-vf", "fps=0.5", str(frames / "f%04d.png")],
                       capture_output=True, timeout=cfg.timeout_ocr, check=True)
        import pytesseract
        from PIL import Image

        texts = [pytesseract.image_to_string(Image.open(p), lang="deu+eng") for p in sorted(frames.glob("f*.png"))[:150]]
    except (subprocess.SubprocessError, OSError):
        return ""
    return "\n".join(dedupe_texts(texts))
