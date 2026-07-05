# MergeGuard AI Backend

Python backend for real LLM-powered pull request review. It supports OpenAI and Gemini.

## Local Run

```bash
pip install -r requirements.txt
set OPENAI_API_KEY=your_key_here
set OPENAI_MODEL=gpt-4o-mini
set GEMINI_API_KEY=your_gemini_key_here
set GEMINI_MODEL=gemini-3.5-flash
set LLM_PROVIDER=auto
set ALLOWED_ORIGIN=http://127.0.0.1:5173
python main.py
```

## Render Deploy

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `python main.py`
- Environment variables:
  - `LLM_PROVIDER`: `auto`, `openai`, or `gemini`
  - `OPENAI_API_KEY`: required only for OpenAI
  - `OPENAI_MODEL`: example `gpt-4o-mini`
  - `GEMINI_API_KEY`: required only for Gemini
  - `GEMINI_MODEL`: example `gemini-3.5-flash`
  - `ALLOWED_ORIGIN`

For the fastest free-tier setup, use:

```txt
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-3.5-flash
GEMINI_API_KEY=your_key_from_google_ai_studio
ALLOWED_ORIGIN=https://merge-guard-ai-theta.vercel.app
```
