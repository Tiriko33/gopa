from urllib.parse import urlparse

ALLOWED = {
    "TikTok": ("tiktok.com", "vm.tiktok.com", "vt.tiktok.com"),
    "Instagram": ("instagram.com",),
}


class InvalidLink(ValueError):
    pass


def validate_link(raw: str) -> tuple[str, str]:
    """Gibt (bereinigte_url, plattform) zurück oder wirft InvalidLink."""
    raw = (raw or "").strip()
    # Share-Texte enthalten oft Text + Link: ersten http-Token nehmen
    for token in raw.split():
        if token.startswith(("http://", "https://")):
            raw = token
            break
    p = urlparse(raw)
    if p.scheme not in ("http", "https") or not p.hostname:
        raise InvalidLink("Das sieht nicht wie ein Link aus.")
    host = p.hostname.lower()
    for plattform, domains in ALLOWED.items():
        if any(host == d or host.endswith("." + d) for d in domains):
            # Query/Fragment (Tracking-Parameter) werden verworfen
            return f"https://{host}{p.path}", plattform
    raise InvalidLink("Gopa kann nur Links von TikTok und Instagram lesen.")
