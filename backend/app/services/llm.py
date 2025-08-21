# app/services/llm.py
import os
import re
import json
import httpx
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Environment
API_TOKEN = os.getenv("API_ACCESS_TOKEN", "")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:3b")
DEBUG_MODE = os.getenv("DEBUG", "0") == "1"

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
    """
    Build the final prompt: system instruction + optional baseline + user instruction.
    """
    context = ""
    if previous_html:
        # Mark baseline explicitly as HTML fenced block to improve model parsing
        context = f"\n\nCurrent HTML document:\n```html\n{previous_html}\n```\n"

    user_block = f"User instruction:\n{message}\n"
    final = f"{SYSTEM_INSTRUCTION}\n{context}\n{user_block}\nReturn only the final HTML document."
    return final


async def call_ollama(prompt: str, req: Dict[str, Any]) -> str:
    """
    Sends request to Ollama with a clean, JSON-serializable payload.
    Only pass scalar options into `options`.
    """
    # Extract scalar knobs safely
    temperature = float(req.get("temperature", 0.35) or 0.35)
    top_p       = float(req.get("top_p", 0.95) or 0.95)
    seed        = req.get("seed", None)
    num_ctx     = req.get("num_ctx", None)
    num_predict = req.get("num_predict", None)

    options: Dict[str, Any] = {
        "temperature": temperature,
        "top_p": top_p,
    }
    if seed is not None:
        options["seed"] = int(seed)
    if num_ctx is not None:
        options["num_ctx"] = int(num_ctx)
    if num_predict is not None:
        options["num_predict"] = int(num_predict)

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
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as e:
        raise LLMError(f"HTTP error calling Ollama: {e}") from e
    except Exception as e:
        raise LLMError(f"Unexpected error calling Ollama: {e}") from e

    # Ollama's non-streaming endpoint returns {"response": "...", ...}
    resp = data.get("response", "")
    if not isinstance(resp, str):
        raise LLMError("Ollama returned an invalid payload: missing 'response' string.")
    return resp


def sanitize_model_output(text: str) -> str:
    """
    Extract fenced HTML if present and ensure <!doctype html> wrapper.
    Returns a full HTML document string.
    """
    def _strip_fences(t: str) -> str:
        m = FENCE_HTML.search(t)
        if m:
            return m.group(1).strip()
        m = FENCE_ANY.search(t)
        if m:
            return m.group(1).strip()
        return t.strip()

    def _ensure_doctype(html: str) -> str:
        if not re.search(r"<!doctype\s+html>", html, re.IGNORECASE):
            html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Generated Page</title>
  <style>
    *,*::before,*::after{{box-sizing:border-box}} body{{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Noto Sans','Helvetica Neue',Arial,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';}}
  </style>
</head>
<body>
{html}
<script>
</script>
</body>
</html>"""
        return html

    cleaned = _strip_fences(text or "")
    return _ensure_doctype(cleaned)
