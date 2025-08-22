# app/services/llm.py
import os
import re
import json
import httpx
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load .env for local runs. In Docker, compose env_file plus environment take precedence.
load_dotenv()

# ---------- Environment helpers ----------
def _get_env(*names: str, default: str | None = None) -> str:
    for n in names:
        v = os.getenv(n)
        if v is not None and v != "":
            return v
    return default

def _get_float(*names: str, default: float) -> float:
    for n in names:
        v = os.getenv(n)
        if v:
            try:
                return float(v)
            except ValueError:
                pass
    return float(default)

def _get_int(*names: str, default: int) -> int:
    for n in names:
        v = os.getenv(n)
        if v:
            try:
                return int(v)
            except ValueError:
                pass
    return int(default)

# ---------- Environment ----------
API_TOKEN       = os.getenv("API_ACCESS_TOKEN", "")
OLLAMA_BASE_URL = _get_env("OLLAMA_BASE_URL", default="http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL    = _get_env("OLLAMA_MODEL", "MODEL_NAME", default="qwen2.5-coder:3b")
DEBUG_MODE      = os.getenv("DEBUG", "0") == "1"

READ_TIMEOUT_S  = _get_float("OLLAMA_TIMEOUT_SECONDS", "GENERATION_TIMEOUT_SECONDS", default=600.0)
CONNECT_TIMEOUT = 30.0
WRITE_TIMEOUT   = 30.0
POOL_TIMEOUT    = 30.0

HTTPX_TIMEOUT = httpx.Timeout(
    connect=CONNECT_TIMEOUT,
    read=READ_TIMEOUT_S,
    write=WRITE_TIMEOUT,
    pool=POOL_TIMEOUT,
)

DEFAULT_NUM_PREDICT = _get_int("DEFAULT_NUM_PREDICT", default=512)
DEFAULT_NUM_CTX     = _get_int("DEFAULT_NUM_CTX",     default=4096)

SYSTEM_INSTRUCTION = """
You are an expert frontend engineer.
Task: Produce a SINGLE, fully self-contained HTML5 document that can be pasted directly into a blank .html file and run offline.

Hard requirements:
1) Output ONLY HTML code with a valid <!doctype html> at the top. No explanations, no backticks, no comments outside HTML.
2) The document must contain exactly ONE <html>, ONE <head>, and ONE <body> element in the correct order.
3) The HTML must be fully valid and well-formed: every opening tag must have a closing tag, and the structure must pass a W3C validator.
4) Put all CSS inside ONE <style> tag in the <head>. Never output more than one <style>.
5) Put all JS inside ONE <script> tag at the bottom of <body>. Never output more than one <script>.
6) Do NOT import or reference ANY external resources:
   - No <link>, <script>, or <iframe> with src pointing to the web.
   - No <img> elements at all.
   - All graphics must be inline <svg> elements directly in the HTML (not base64, not external).
   - Alternatively, use simple CSS shapes (e.g., background-color, borders, gradients).
7) Do not escape HTML entities. Output raw HTML tags: <div>, <style>, <svg>, etc. Never output &lt;div&gt;.
8) Accessibility: sensible semantics, focus handling for modals, and keyboard support for close buttons (Escape key).
9) Keep it minimal, readable, and well structured. Prefer vanilla JavaScript.

Hard requirements (additions):
- Absolutely NO <img> tags for SVG. Do not use base64 or data URIs for images.
- All graphics must be inline <svg> ... </svg> elements directly in the HTML DOM.
- Each <svg> must contain at least one visible shape (<circle>, <rect>, <path>, <polygon>, etc.). Empty <svg> is not allowed.
- When the user specifies a number of SVGs or elements (e.g. "6 svg", "3 cards", "2 buttons"), you MUST include exactly that number in the DOM - no more, no less.
- Always return the FULL HTML5 document from <!doctype html> to </html>.

If the user provided a PREVIOUS HTML document, interpret it as the current baseline. Apply the new instruction by updating and improving the whole page. Return the FULL updated HTML document.

Return the final HTML document wrapped in a single fenced block:
```html
...full document...
```
"""

# Fences for sanitization helpers
FENCE_HTML = re.compile(r"```html\s*([\s\S]*?)```", re.IGNORECASE)
FENCE_ANY  = re.compile(r"```[\w-]*\s*([\s\S]*?)```", re.IGNORECASE)

class LLMError(Exception):
    """Raised when the LLM call fails or returns an invalid payload."""

def build_prompt(message: str, previous_html: Optional[str]) -> str:
    context = ""
    if previous_html:
        context = f"\n\nCurrent HTML document:\n```html\n{previous_html}\n```\n"
    user_block = f"User instruction:\n{message}\n"
    return f"{SYSTEM_INSTRUCTION}\n{context}\n{user_block}\nReturn only the final HTML document."

async def call_ollama(prompt: str, req: Dict[str, Any]) -> str:
    temperature = float(req.get("temperature", 0.35) or 0.35)
    top_p       = float(req.get("top_p", 0.95) or 0.95)
    seed        = req.get("seed", None)
    num_ctx     = int(req.get("num_ctx", DEFAULT_NUM_CTX))
    num_predict = int(req.get("num_predict", DEFAULT_NUM_PREDICT))

    options: Dict[str, Any] = {
        "temperature": temperature,
        "top_p": top_p,
        "num_ctx": num_ctx,
        "num_predict": num_predict,
    }
    if seed is not None:
        options["seed"] = int(seed)


    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": options,
    }

    if DEBUG_MODE:
        print("---- OLLAMA REQUEST ----")
        print(json.dumps({
            "url": f"{OLLAMA_BASE_URL}/api/generate",
            "payload": payload
        }, indent=2))

    url = f"{OLLAMA_BASE_URL}/api/generate"
    try:
        async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as e:
        raise LLMError(f"HTTP error calling Ollama: {e}") from e
    except Exception as e:
        raise LLMError(f"Unexpected error calling Ollama: {e}") from e

    resp = data.get("response", "")
    if not isinstance(resp, str):
        raise LLMError("Ollama returned an invalid payload: missing 'response' string.")
    return resp

# app/services/llm.py  (replace only this function)

def sanitize_model_output(text: str) -> str:
    """
    Canonicalize LLM output into a SINGLE, valid HTML5 document that satisfies:
    - <!doctype html> at top
    - exactly one <html>, <head>, <body>
    - exactly one <style> (merged)
    - exactly one <script> (merged, no external src)
    - no prose outside tags
    - presence of <header>, <main>, <footer>
    """
    # --- helpers -------------------------------------------------------------
    def _strip_fences(t: str) -> str:
        m = FENCE_HTML.search(t or "")
        if m:
            return m.group(1).strip()
        m = FENCE_ANY.search(t or "")
        if m:
            return m.group(1).strip()
        return (t or "").strip()

    def _extract(tag: str, doc: str) -> str | None:
        # returns inner HTML of the first tag if present
        m = re.search(rf"<{tag}[^>]*>([\s\S]*?)</{tag}\s*>", doc, re.IGNORECASE)
        return m.group(1) if m else None

    def _collect_styles(doc: str) -> str:
        css_parts: list[str] = []
        for m in re.finditer(r"<style[^>]*>([\s\S]*?)</style\s*>", doc, re.IGNORECASE):
            css_parts.append(m.group(1).strip())
        return "\n".join(p for p in css_parts if p)

    def _collect_inline_scripts(doc: str) -> str:
        js_parts: list[str] = []
        # ignore scripts with src= (external) by requiring absence of src attribute
        for m in re.finditer(r"<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script\s*>", doc, re.IGNORECASE):
            js_parts.append(m.group(1).strip())
        return "\n".join(p for p in js_parts if p)

    def _strip_all_tags(doc: str, tag: str) -> str:
        # remove all occurrences of a tag (used before rebuilding)
        return re.sub(rf"</?{tag}[^>]*>", "", doc, flags=re.IGNORECASE)

    # --- pipeline ------------------------------------------------------------
    raw = _strip_fences(text)

    # If model returned a full doc, we still normalize by extracting head/body
    # to enforce singletons and landmarks.
    head_inner = _extract("head", raw) or ""
    body_inner = _extract("body", raw)

    if body_inner is None:
        # treat entire raw as a fragment if no <body> found
        fragment = raw
    else:
        # reconstruct fragment from body contents only
        fragment = body_inner

    # Gather and merge CSS & JS from anywhere (head/body), then strip them from fragment
    merged_css = _collect_styles(raw)
    merged_js  = _collect_inline_scripts(raw)

    # Remove any existing style/script tags from fragment to avoid duplicates
    fragment_wo_assets = re.sub(r"<style[^>]*>[\s\S]*?</style\s*>", "", fragment, flags=re.IGNORECASE)
    fragment_wo_assets = re.sub(r"<script[^>]*>[\s\S]*?</script\s*>", "", fragment_wo_assets, flags=re.IGNORECASE)

    # Trim stray text outside tags
    fragment_wo_assets = fragment_wo_assets.strip()

    # Ensure semantic landmarks: header, main, footer.
    has_header = re.search(r"<header\b", fragment_wo_assets, re.IGNORECASE)
    has_main   = re.search(r"<main\b",   fragment_wo_assets, re.IGNORECASE)
    has_footer = re.search(r"<footer\b", fragment_wo_assets, re.IGNORECASE)

    # If landmarks are missing, wrap the content inside them.
    # Minimal, non-opinionated scaffolding.
    if not (has_header and has_main and has_footer):
        content_for_main = fragment_wo_assets if fragment_wo_assets else "<section></section>"
        header_block = "<header></header>" if not has_header else ""
        main_block   = content_for_main if has_main else f"<main>{content_for_main}</main>"
        footer_block = "<footer></footer>" if not has_footer else ""
        body_canonical = f"{header_block}\n{main_block}\n{footer_block}".strip()
    else:
        body_canonical = fragment_wo_assets

    # Guarantee we have exactly one <style> and one <script>
    if not merged_css:
        merged_css = "*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Noto Sans','Helvetica Neue',Arial,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol'}"
    if not merged_js:
        merged_js = ""  # keep a single, possibly empty script block

    # Build canonical document
    canonical = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Generated Page</title>
  <style>
{merged_css}
  </style>
</head>
<body>
{body_canonical}
  <script>
{merged_js}
  </script>
</body>
</html>"""

    # Final trim to remove leading/trailing whitespace before/after doctype/html
    return canonical.strip()
