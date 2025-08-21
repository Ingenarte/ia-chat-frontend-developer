# app/services/validator.py
import re
from typing import List, Dict, Tuple, Optional

# --- Regex helpers (compiled once) ---
FENCE_HTML      = re.compile(r"```html\s*([\s\S]*?)```", re.IGNORECASE)
FENCE_CSS       = re.compile(r"```css\s*([\s\S]*?)```", re.IGNORECASE)
FENCE_JS        = re.compile(r"```js\s*([\s\S]*?)```", re.IGNORECASE)
FENCE_ANY       = re.compile(r"```[\w-]*\s*([\s\S]*?)```", re.IGNORECASE)

# External references and forbidden tags
IFRAME_TAG          = re.compile(r"(?is)<\s*iframe\b")
LINK_STYLESHEET     = re.compile(r"(?is)<\s*link\b[^>]*rel\s*=\s*['\"]stylesheet['\"][^>]*>")
SCRIPT_SRC_HTTP     = re.compile(r"(?is)<\s*script\b[^>]*\bsrc\s*=\s*['\"]https?://")
ANY_HTTP_URL        = re.compile(r"(?is)\b(?:src|href)\s*=\s*['\"]\s*https?://")
IMG_TAG             = re.compile(r"(?is)<\s*img\b")
SVG_IMAGE_HREF_HTTP = re.compile(r"(?is)<\s*image\b[^>]*\b(?:href|xlink:href)\s*=\s*['\"]\s*https?://")

# Document structure
DOCTYPE_RE      = re.compile(r"(?is)<!doctype\s+html>")
TAG_OPEN_RE     = lambda tag: re.compile(rf"(?is)<\s*{tag}\b")
TAG_CLOSE_RE    = lambda tag: re.compile(rf"(?is)</\s*{tag}\s*>")

# Basic semantics
HEADER_RE       = re.compile(r"(?is)<\s*header\b")
MAIN_RE         = re.compile(r"(?is)<\s*main\b")
FOOTER_RE       = re.compile(r"(?is)<\s*footer\b")
HTML_LANG_RE    = re.compile(r"(?is)<\s*html\b[^>]*\blang\s*=\s*['\"][^'\">]+['\"]")
META_CHARSET_RE = re.compile(r"(?is)<\s*meta\b[^>]*\bcharset\s*=\s*['\"][^'\">]+['\"]")
TITLE_RE        = re.compile(r"(?is)<\s*title\b[^>]*>.*?</\s*title\s*>")

STYLE_TAG_RE  = re.compile(r"(?is)<\s*style\b[^>]*>(.*?)</\s*style\s*>")
SCRIPT_TAG_RE = re.compile(r"(?is)<\s*script\b[^>]*>(.*?)</\s*script\s*>")

# Interaction semantics: click handlers on non-interactive without role/tabindex
CLICK_HANDLER_NON_INTERACTIVE = re.compile(
    r"(?is)<\s*(div|span)\b(?![^>]*\brole\s*=\s*['\"]button['\"])(?![^>]*\btabindex\s*=\s*['\"]0['\"])"
    r"[^>]*\bon(?:click|keydown|keyup)\s*=",
)

def _count_tag(html: str, tag: str) -> int:
    return len(re.findall(rf"(?is)<\s*{tag}\b", html))

def _has_single_tag_pair(html: str, tag: str) -> bool:
    return _count_tag(html, tag) == 1 and bool(TAG_CLOSE_RE(tag).search(html))

def _css_has_rules(css: str) -> bool:
    # Very light rule detection: any "selector { property: value; }"
    return bool(re.search(r"(?s)[^\s{][^{]+\{[^}]+\}", css.strip()))

def _js_has_only_safe_patterns(js_code: str) -> Tuple[bool, List[str]]:
    """
    Minimal JS safety gate. Extend as needed.
    - Disallow eval, new Function, import(), document.write
    - Allow vanilla DOM APIs
    """
    violations = []
    bad = [
        (r"(?i)\beval\s*\(", "eval()"),
        (r"(?i)\bnew\s+Function\s*\(", "new Function()"),
        (r"(?i)\bimport\s*\(", "dynamic import()"),
        (r"(?i)\bdocument\.write\s*\(", "document.write()"),
    ]
    for pat, name in bad:
        if re.search(pat, js_code or ""):
            violations.append(name)
    return (len(violations) == 0, violations)

def _strip_fences_and_markers(txt: str) -> str:
    """Remove any code fences and trivial markdown noise."""
    no_fences = FENCE_HTML.sub("", FENCE_CSS.sub("", FENCE_JS.sub("", FENCE_ANY.sub("", txt))))
    lines: List[str] = []
    for line in no_fences.splitlines():
        l = line.strip()
        if not l:
            continue
        if l.lower() in ("[chat]", "[codepacks]"):
            continue
        if l.startswith("#"):
            continue
        if l in ("---", "...", "===", "***"):
            continue
        lines.append(l)
    return "\n".join(lines).strip()

def _extract_fenced_blocks(content: str) -> Dict[str, str]:
    """Return fenced code blocks by language if present."""
    blocks: Dict[str, str] = {}
    m_html = FENCE_HTML.search(content)
    if m_html:
        blocks["html"] = m_html.group(1)
    m_css = FENCE_CSS.search(content)
    if m_css:
        blocks["css"] = m_css.group(1)
    m_js = FENCE_JS.search(content)
    if m_js:
        blocks["js"] = m_js.group(1)
    return blocks

def score_compliance(
    content: str,
    blocks: List[Dict[str, str]] | None = None,
    *,
    expected_svg: Optional[int] = None,
    require_semantics: bool = True,
) -> Tuple[float, List[str]]:
    """
    Compute a compliance score in [0,1] and a list of issues.
    Weights sum to 1.0:

      - document_structure (doctype + single html/head/body) ............ 0.18
      - head_basics (lang on <html>, <meta charset>, <title>) ........... 0.07
      - fenced_html_present ............................................. 0.18
      - fenced_css_present_nonempty ..................................... 0.14
      - fenced_js_present ............................................... 0.06
      - no_prose_outside_fences ......................................... 0.10
      - no_forbidden_features (iframe, script src, http URLs) ........... 0.12
      - self_contained_html (no <link rel=stylesheet>) .................. 0.05
      - image_policy_svg_only (no <img>, no svg <image href=http>) ...... 0.05
      - basic_semantics (header/main/footer, handlers on non-interactive) 0.05
    """
    issues: List[str] = []
    score = 0.0

    # Gather fenced content if not provided
    if not blocks:
        bmap = _extract_fenced_blocks(content)
        blocks = [{"lang": k, "code": v} for k, v in bmap.items()]

    # Presence checks from fences
    langs = {b["lang"] for b in blocks}
    html_block = next((b["code"] for b in blocks if b["lang"] == "html"), "")
    css_block  = next((b["code"] for b in blocks if b["lang"] == "css"), "")
    js_block   = next((b["code"] for b in blocks if b["lang"] == "js"), "")

    has_html      = "html" in langs and bool((html_block or "").strip())
    has_css_rules = _css_has_rules(css_block or "")
    has_js        = "js" in langs

    # 0) Choose html_to_check
    html_to_check = html_block if has_html else content

    # 1) Document structure
    doc_ok = (
        bool(DOCTYPE_RE.search(html_to_check)) and
        _has_single_tag_pair(html_to_check, "html") and
        _has_single_tag_pair(html_to_check, "head") and
        _has_single_tag_pair(html_to_check, "body")
    )
    if doc_ok:
        score += 0.18
    else:
        issues.append("Invalid document structure: missing doctype or single html/head/body.")

    # 2) Head basics
    head_ok = bool(HTML_LANG_RE.search(html_to_check)) and bool(META_CHARSET_RE.search(html_to_check)) and bool(TITLE_RE.search(html_to_check))
    if head_ok:
        score += 0.07
    else:
        missing = []
        if not HTML_LANG_RE.search(html_to_check):    missing.append("html[lang]")
        if not META_CHARSET_RE.search(html_to_check): missing.append("meta[charset]")
        if not TITLE_RE.search(html_to_check):        missing.append("<title>")
        issues.append("Head basics missing: " + ", ".join(missing))

    # 3) Fenced HTML present
    if has_html:
        score += 0.18
    else:
        issues.append("Missing fenced HTML block.")

    # 4) CSS present with rules
    if has_css_rules:
        score += 0.14
    else:
        # fallback: check inline <style>
        inline_css_match = STYLE_TAG_RE.search(html_to_check)
        if inline_css_match and _css_has_rules(inline_css_match.group(1)):
            score += 0.14
        else:
            issues.append("CSS block missing or empty (no rules).")

    # 5) JS fenced presence
    if has_js:
        score += 0.06
    else:
        # fallback: check inline <script>
        inline_js_match = SCRIPT_TAG_RE.search(html_to_check)
        if inline_js_match:
            score += 0.06
        else:
            issues.append("Missing JS block.")

    # 6) No prose outside fences
    leftover = _strip_fences_and_markers(content)
    if len(leftover) <= 8:
        score += 0.10
    else:
        issues.append("Prose or extra text outside code fences.")

    # 7) No forbidden features
    dangerous: List[str] = []
    if IFRAME_TAG.search(html_to_check):      dangerous.append("<iframe>")
    if SCRIPT_SRC_HTTP.search(html_to_check): dangerous.append("<script src=http(s)>")
    if ANY_HTTP_URL.search(html_to_check):    dangerous.append("external http(s) URL in src/href")
    js_ok_flag, js_viol = _js_has_only_safe_patterns(js_block or "")
    if not js_ok_flag:
        dangerous.extend([f"{v} in JS" for v in js_viol])
    if not dangerous:
        score += 0.12
    else:
        issues.append("Forbidden features: " + ", ".join(dangerous))

    # 8) Self-contained HTML
    if not LINK_STYLESHEET.search(html_to_check):
        score += 0.05
    else:
        issues.append("External <link rel=stylesheet> found.")

    # 9) Image policy: SVG-only
    img_violations: List[str] = []
    if IMG_TAG.search(html_to_check):
        img_violations.append("<img> tag found - images must be inline <svg> only.")
    if SVG_IMAGE_HREF_HTTP.search(html_to_check):
        img_violations.append("<svg><image href='http(s)://...'> is not allowed.")
    if expected_svg is not None:
        svg_count = _count_tag(html_to_check, "svg")
        if svg_count != expected_svg:
            img_violations.append(f"Expected exactly {expected_svg} <svg> elements, found {svg_count}.")
    if not img_violations:
        score += 0.05
    else:
        issues.extend(img_violations)

    # 10) Basic semantics
    sem_issues: List[str] = []
    if require_semantics:
        if not (HEADER_RE.search(html_to_check) or MAIN_RE.search(html_to_check) or FOOTER_RE.search(html_to_check)):
            sem_issues.append("Missing semantic landmarks (header/main/footer).")
        if CLICK_HANDLER_NON_INTERACTIVE.search(html_to_check):
            sem_issues.append("Click handlers on non-interactive elements without role='button' or tabindex='0'.")
    if not sem_issues:
        score += 0.05
    else:
        issues.extend(sem_issues)

    return max(0.0, min(1.0, score)), issues
