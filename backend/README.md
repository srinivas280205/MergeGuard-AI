# MergeGuard AI Backend

FastAPI backend for real OpenAI-powered pull request review.

## Local Run

```bash
pip install -r requirements.txt
set OPENAI_API_KEY=your_key_here
set OPENAI_MODEL=gpt-4o-mini
set ALLOWED_ORIGIN=http://127.0.0.1:5173
uvicorn main:app --reload
```

## Render Deploy

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment variables:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `ALLOWED_ORIGIN`
