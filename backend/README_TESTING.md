# Testing & Coverage

## Install test dependencies
```bash
pip install -r requirements.txt
pip install pytest pytest-cov
```

## Run tests with coverage
```bash
pytest --cov=app --cov-report=term-missing --cov-fail-under=50
```

- `--cov-fail-under=50` enforces a minimum of 50% coverage.
- If you want an HTML report:
```bash
pytest --cov=app --cov-report=html
# open htmlcov/index.html in your browser
```

## Notes
- The test suite expects the FastAPI app to be exposed from `app.main:app` and
  the router to mount the API at `/api/ai`.
- If `/api/ai/jobs/stats` is not present, you can skip or adjust `test_jobs_stats.py`.
- The CORS test assumes permissive CORS (`"*"`), as configured in `app.main`.
