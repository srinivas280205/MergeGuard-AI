# MergeGuard AI

MergeGuard AI is a GitHub Pull Request Review and Risk Scoring Agent demo. It fetches public GitHub pull request data, reviews changed code patterns, scores risk, and generates a dashboard-style review report.

## Features

- Public GitHub pull request URL input
- Automatic PR title, description, changed files, and patch fetching
- Local rule-based review for common risks
- Security, quality, performance, maintainability, and testability scores
- Risk score and merge recommendation
- Dashboard report with severity counts and recommendations
- Local saved review history
- Firebase Auth login/signup
- Firestore cloud review history for logged-in users
- Optional Python backend for OpenAI-powered AI review
- Copy, Markdown download, and print/save-as-PDF options

## Free Tech Used

- HTML, CSS, and JavaScript
- GitHub REST API for public PR data
- Firebase Auth for login/signup
- Cloud Firestore for saved review history
- Browser localStorage for guest history
- Python backend + OpenAI API for real AI review
- Vercel or GitHub Pages for free hosting

## Backend AI Review

The frontend includes an `AI Review` button. After deploying the backend on Render, set `API_BASE_URL` in `script.js` to your Render URL:

```js
const API_BASE_URL = "https://your-service.onrender.com";
```

Render backend setup:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `python main.py`
- Environment variables:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `ALLOWED_ORIGIN`

## Run Locally

Open `index.html` directly in a browser, or run a local server:

```bash
npx serve .
```

Then open the shown local URL.

## Deploy Free On Vercel

1. Push this folder to a GitHub repository.
2. Go to Vercel and import the repository.
3. Keep the framework preset as `Other`.
4. Leave the build command empty.
5. Set the output directory to `.` if Vercel asks.
6. Deploy.

## Deploy Free On GitHub Pages

1. Push this folder to a GitHub repository.
2. Open the repository on GitHub.
3. Go to Settings > Pages.
4. Set Source to `GitHub Actions`.
5. Push to the `main` branch.
6. The included workflow publishes the static site.

## Project Phases

1. Manual PR review demo
2. GitHub PR URL fetching
3. Dashboard report UI
4. Easy navigation and local history
5. Deployment-ready static project

## Note

This version uses local rule-based analysis for demonstration. A future phase can add Gemini or OpenAI API support through a backend so API keys stay private.
