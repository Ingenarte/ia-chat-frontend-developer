# app/services/runner.py
import asyncio
import logging
import os
from typing import Optional, Tuple, List

from ..schemas import GenerateRequest, GenerateResponse, JobStatus
from .jobs import job_store
from ..services.llm import call_ollama, build_prompt, LLMError, sanitize_model_output
from ..services.validator import score_compliance

logger = logging.getLogger(__name__)

GENERATION_TIMEOUT_SECONDS = int(os.getenv("GENERATION_TIMEOUT_SECONDS", "60"))
MIN_SCORE = float(os.getenv("GEN_MIN_SCORE", "0.80"))
MAX_RETRIES = int(os.getenv("GEN_MAX_RETRIES", "5"))
RETRY_BASE_DELAY_SECONDS = float(os.getenv("GEN_RETRY_BASE_DELAY_SECONDS", "1.0"))


def _is_full_html(doc: str) -> bool:
    if not doc:
        return False
    low = doc.strip().lower()
    return low.startswith("<!doctype html") and "</html>" in low


def _build_prompt_from_request(req: GenerateRequest) -> Tuple[str, Optional[int]]:
    previous_html = getattr(req, "previous_html", None)
    prompt = build_prompt(req.message, previous_html)
    expected_svgs = None
    return prompt, expected_svgs


def _score_html(html: str, req: GenerateRequest, expected_svgs: Optional[int]) -> Tuple[float, List[str]]:
    """
    Compatibility shim: tries multiple known signatures for score_compliance.
    Supports:
      - score_compliance(html, require_inline_assets=..., require_semantics=..., expected_svgs=...)
      - score_compliance(html, req)
      - score_compliance(html)
    Each may return:
      - float
      - (float,)
      - (float, issues)
    """
    # 1) Preferred signature with kwargs
    try:
        sc = score_compliance(
            html,
            require_inline_assets=True,
            require_semantics=True,
            expected_svgs=expected_svgs,
        )
        if isinstance(sc, tuple):
            score = float(sc[0])
            issues = list(sc[1]) if len(sc) > 1 and isinstance(sc[1], (list, tuple)) else []
            return score, issues
        return float(sc), []
    except TypeError:
        pass

    # 2) Signature (html, req)
    try:
        sc = score_compliance(html, req)
        if isinstance(sc, tuple):
            score = float(sc[0])
            issues = list(sc[1]) if len(sc) > 1 and isinstance(sc[1], (list, tuple)) else []
            return score, issues
        return float(sc), []
    except TypeError:
        pass

    # 3) Signature (html)
    sc = score_compliance(html)
    if isinstance(sc, tuple):
        score = float(sc[0])
        issues = list(sc[1]) if len(sc) > 1 and isinstance(sc[1], (list, tuple)) else []
        return score, issues
    return float(sc), []


async def run_generation_job(job_id: str, req: GenerateRequest) -> None:
    await job_store.set_status(job_id, JobStatus.processing)
    error: Optional[str] = None
    result_obj: Optional[GenerateResponse] = None

    try:
        prompt, expected_svgs = _build_prompt_from_request(req)
        req_payload = req.model_dump() if hasattr(req, "model_dump") else req.dict()

        last_issues: List[str] = []
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                logger.info("[job %s] attempt %d: calling LLM", job_id, attempt)
                raw = await asyncio.wait_for(
                    call_ollama(prompt, req_payload),
                    timeout=GENERATION_TIMEOUT_SECONDS,
                )

                html = sanitize_model_output(raw)

                if not _is_full_html(html):
                    raise ValueError("Model did not return a full HTML document.")

                fenced_for_validator = f"```html\n{html}\n```"
                score, issues = _score_html(fenced_for_validator, req, expected_svgs)

                logger.info(
                    "[job %s] attempt %d: score=%.3f, issues=%s",
                    job_id, attempt, float(score), issues or "[]"
                )

                if score < MIN_SCORE:
                    last_issues = issues or []
                    await asyncio.sleep(RETRY_BASE_DELAY_SECONDS * attempt)
                    continue

                result_obj = GenerateResponse(error=False, html=html, detail=None)
                break

            except asyncio.TimeoutError:
                error = f"Generation timed out after {GENERATION_TIMEOUT_SECONDS}s"
                logger.warning("[job %s] timeout: %s", job_id, error)
                break
            except LLMError as e:
                error = str(e)
                logger.error("[job %s] LLMError: %s", job_id, error)
                break
            except Exception as e:
                error = f"Unhandled server error: {e}"
                logger.exception("[job %s] exception on attempt %d", job_id, attempt)
                break

        if result_obj is None and error is None:
            issue_text = "; ".join(last_issues) if last_issues else "Quality threshold not met."
            error = issue_text
            logger.info("[job %s] final quality rejection: %s", job_id, error)

    except Exception as e:
        error = f"Unhandled server error: {e}"
        logger.exception("[job %s] fatal exception", job_id)

    if error:
        await job_store.set_result(job_id, None, error)
        await job_store.set_status(job_id, JobStatus.failed)
        logger.info("[job %s] finished with status=failed", job_id)
    else:
        await job_store.set_result(job_id, result_obj, None)
        await job_store.set_status(job_id, JobStatus.finished)
        logger.info("[job %s] finished with status=finished", job_id)
