import json
import os
from typing import Any

from openai import OpenAI
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")

app = FastAPI(title="MergeGuard AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN] if ALLOWED_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReviewRequest(BaseModel):
    prUrl: str = ""
    prTitle: str = ""
    prDescription: str = ""
    changedFiles: str = ""
    codeDiff: str


def build_prompt(payload: ReviewRequest) -> str:
    return f"""
You are an expert AI GitHub Pull Request Review Agent.

Review only the changed code and return strict JSON with these keys:
summary, issues, securityAnalysis, scores, missingTests, risk, recommendation, finalComment.

issues must be an array of objects:
severity, title, file, detail, recommendation.

scores must contain:
Security, Quality, Performance, Maintainability, Testability.

Recommendation must be one of:
Approve, Request minor changes, Request major changes, Block merge.

Pull Request URL:
{payload.prUrl}

Pull Request Title:
{payload.prTitle}

Pull Request Description:
{payload.prDescription}

Changed Files:
{payload.changedFiles}

Code Diff:
{payload.codeDiff}
""".strip()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/ai-review")
def ai_review(payload: ReviewRequest) -> dict[str, Any]:
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")

    client = OpenAI(api_key=OPENAI_API_KEY)

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": "You are a senior pull request reviewer. Return only valid JSON.",
            },
            {"role": "user", "content": build_prompt(payload)},
        ],
    )

    content = response.choices[0].message.content or "{}"
    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="OpenAI returned invalid JSON.") from exc

    return {"review": data}
