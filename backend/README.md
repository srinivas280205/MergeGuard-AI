# MergeGuard AI Backend

Python backend for real OpenAI-powered pull request review.

## Local Run

```bash
pip install -r requirements.txt
set OPENAI_API_KEY=your_key_here
set OPENAI_MODEL=gpt-4o-mini
set ALLOWED_ORIGIN=http://127.0.0.1:5173
python main.py
```

## Render Deploy

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `python main.py`
- Environment variables:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `ALLOWED_ORIGIN`
