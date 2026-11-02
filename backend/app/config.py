import os
from dataclasses import dataclass
from pathlib import Path


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    anthropic_api_key: str
    claude_model: str
    app_password: str
    whisper_model: str
    max_video_mb: int
    max_video_seconds: int
    timeout_download: int
    timeout_transcribe: int
    timeout_ocr: int
    timeout_llm: int
    enable_ocr: bool
    rate_limit_per_hour: int
    data_dir: Path
    static_dir: Path | None = None


def load_settings() -> Settings:
    return Settings(
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
        claude_model=os.environ.get("CLAUDE_MODEL", ""),
        app_password=os.environ.get("APP_PASSWORD", ""),
        whisper_model=os.environ.get("WHISPER_MODEL", "small"),
        max_video_mb=_int("MAX_VIDEO_MB", 150),
        max_video_seconds=_int("MAX_VIDEO_SECONDS", 600),
        timeout_download=_int("STEP_TIMEOUT_DOWNLOAD", 120),
        timeout_transcribe=_int("STEP_TIMEOUT_TRANSCRIBE", 300),
        timeout_ocr=_int("STEP_TIMEOUT_OCR", 120),
        timeout_llm=_int("STEP_TIMEOUT_LLM", 90),
        enable_ocr=os.environ.get("ENABLE_OCR", "true").lower() == "true",
        rate_limit_per_hour=_int("RATE_LIMIT_PER_HOUR", 20),
        data_dir=Path(os.environ.get("DATA_DIR", "./data")),
        static_dir=Path(os.environ["STATIC_DIR"]) if os.environ.get("STATIC_DIR") else None,
    )
