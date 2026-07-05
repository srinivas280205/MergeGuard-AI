import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")
PORT = int(os.getenv("PORT", "8000"))


def build_prompt(payload):
    return f"""
You are an expert AI GitHub Pull Request Review Agent.

Review only the changed code. Return strict JSON only, with these keys:
summary, issues, securityAnalysis, scores, missingTests, risk, recommendation, finalComment.

issues must be an array of objects with:
severity, title, file, detail, recommendation.

scores must contain numeric values from 0 to 100 for:
Security, Quality, Performance, Maintainability, Testability.

recommendation must be one of:
Approve, Request minor changes, Request major changes, Block merge.

Pull Request URL:
{payload.get("prUrl", "")}

Pull Request Title:
{payload.get("prTitle", "")}

Pull Request Description:
{payload.get("prDescription", "")}

Changed Files:
{payload.get("changedFiles", "")}

Code Diff:
{payload.get("codeDiff", "")}
""".strip()


def openai_review(payload):
    if not OPENAI_API_KEY:
        return 500, {"detail": "OPENAI_API_KEY is not configured."}

    body = {
        "model": OPENAI_MODEL,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": "You are a senior pull request reviewer. Return only valid JSON.",
            },
            {"role": "user", "content": build_prompt(payload)},
        ],
    }

    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        return error.code, {"detail": detail}
    except Exception as error:
        return 502, {"detail": str(error)}

    content = data["choices"][0]["message"]["content"] or "{}"
    try:
        review = json.loads(content)
    except json.JSONDecodeError:
        return 502, {"detail": "OpenAI returned invalid JSON."}

    return 200, {"review": review}


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_json(204, {})

    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.end_headers()

    def do_GET(self):
        if self.path in ("/", "/health"):
            self.send_json(200, {"status": "ok"})
            return
        self.send_json(404, {"detail": "Not found"})

    def do_POST(self):
        if self.path != "/api/ai-review":
            self.send_json(404, {"detail": "Not found"})
            return

        length = int(self.headers.get("Content-Length", "0"))
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except json.JSONDecodeError:
            self.send_json(400, {"detail": "Invalid JSON request body."})
            return

        if not payload.get("codeDiff"):
            self.send_json(400, {"detail": "codeDiff is required."})
            return

        status, response = openai_review(payload)
        self.send_json(status, response)


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"MergeGuard AI backend running on port {PORT}")
    server.serve_forever()
