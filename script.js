const reviewForm = document.querySelector("#reviewForm");
const appShell = document.querySelector(".app-shell");
const authGate = document.querySelector("#authGate");
const report = document.querySelector("#report");
const fetchStatus = document.querySelector("#fetchStatus");
const historyList = document.querySelector("#historyList");
const authStatus = document.querySelector("#authStatus");
const userBadge = document.querySelector("#userBadge");

const fields = {
  prUrl: document.querySelector("#prUrl"),
  prTitle: document.querySelector("#prTitle"),
  prDescription: document.querySelector("#prDescription"),
  changedFiles: document.querySelector("#changedFiles"),
  codeDiff: document.querySelector("#codeDiff"),
};

const authFields = {
  email: document.querySelector("#authEmail"),
  password: document.querySelector("#authPassword"),
};

const buttons = {
  login: document.querySelector("#loginButton"),
  signup: document.querySelector("#signupButton"),
  logout: document.querySelector("#logoutButton"),
  fetch: document.querySelector("#fetchButton"),
  sample: document.querySelector("#sampleButton"),
  copy: document.querySelector("#copyButton"),
  download: document.querySelector("#downloadButton"),
  print: document.querySelector("#printButton"),
  clearHistory: document.querySelector("#clearHistoryButton"),
};

const historyKey = "mergeguard-review-history";
let latestReview = null;
let currentUser = null;
let firebaseAuth = null;
let firestoreDb = null;
let visibleHistory = [];

const firebaseConfig = {
  apiKey: "AIzaSyAY52_ie5L5I-Il2LHbc0xPp3uSBDvBCH0",
  authDomain: "mergeguard-ai-web.firebaseapp.com",
  projectId: "mergeguard-ai-web",
  storageBucket: "mergeguard-ai-web.firebasestorage.app",
  messagingSenderId: "116354161265",
  appId: "1:116354161265:web:d15d3b762b6799b4b459d0",
  measurementId: "G-4Z1RD7JFXR",
};

const sampleData = {
  prTitle: "Add simple login function",
  prDescription:
    "Adds a basic login function for admin users and updates the auth flow.",
  changedFiles: "auth.py\nroutes/login.py\nREADME.md",
  codeDiff: `def login(username, password):
    if username == "admin" and password == "1234":
        return True
    return False

const token = localStorage.getItem("token");
fetch("/api/users", { method: "POST", body: JSON.stringify(user) });`,
};

function getFormData() {
  return {
    prUrl: fields.prUrl.value.trim(),
    prTitle: fields.prTitle.value.trim(),
    prDescription: fields.prDescription.value.trim(),
    changedFiles: fields.changedFiles.value.trim(),
    codeDiff: fields.codeDiff.value.trim(),
  };
}

function setFormData(data) {
  fields.prUrl.value = data.prUrl || "";
  fields.prTitle.value = data.prTitle || "";
  fields.prDescription.value = data.prDescription || "";
  fields.changedFiles.value = data.changedFiles || "";
  fields.codeDiff.value = data.codeDiff || "";
}

function initializeFirebase() {
  if (!window.firebase) {
    setAuthStatus("Firebase SDK did not load. Check internet connection.", "error");
    return;
  }

  try {
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
    firebaseAuth = app.auth();
    firestoreDb = app.firestore();

    firebaseAuth.onAuthStateChanged((user) => {
      currentUser = user;
      updateAuthUi(user);
      renderHistory();
    });
  } catch (error) {
    setAuthStatus(error.message, "error");
  }
}

function updateAuthUi(user) {
  if (user) {
    authGate.classList.add("hidden");
    appShell.classList.add("visible");
    userBadge.textContent = user.email;
    setAuthStatus("Logged in. Reviews will save to Firebase Firestore.", "success");
    buttons.logout.disabled = false;
    return;
  }

  appShell.classList.remove("visible");
  authGate.classList.remove("hidden");
  userBadge.textContent = "Guest";
  setAuthStatus("Login or signup to enter MergeGuard AI.", "");
  buttons.logout.disabled = true;
}

function setAuthStatus(message, state = "") {
  authStatus.textContent = message;
  authStatus.className = `auth-status ${state}`.trim();
}

function getAuthInput() {
  const email = authFields.email.value.trim();
  const password = authFields.password.value;

  if (!email) {
    throw new Error("Enter your email.");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  return { email, password };
}

async function signupUser() {
  if (!firebaseAuth) return;

  try {
    const { email, password } = getAuthInput();
    setAuthStatus("Creating account...", "loading");
    await firebaseAuth.createUserWithEmailAndPassword(email, password);
    authFields.password.value = "";
    setAuthStatus("Account created and logged in.", "success");
  } catch (error) {
    setAuthStatus(error.message, "error");
  }
}

async function loginUser() {
  if (!firebaseAuth) return;

  try {
    const { email, password } = getAuthInput();
    setAuthStatus("Logging in...", "loading");
    await firebaseAuth.signInWithEmailAndPassword(email, password);
    authFields.password.value = "";
    setAuthStatus("Logged in successfully.", "success");
  } catch (error) {
    setAuthStatus(error.message, "error");
  }
}

async function logoutUser() {
  if (!firebaseAuth) return;

  await firebaseAuth.signOut();
  latestReview = null;
  report.className = "report empty-state";
  report.innerHTML = "<p>Enter PR details or fetch a public GitHub pull request to generate a review report.</p>";
  setAuthStatus("Logged out. Login again to continue.", "");
}

function parsePullRequestUrl(url) {
  const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
  if (!match) {
    throw new Error("Use a public GitHub pull request URL.");
  }

  return {
    owner: match[1],
    repo: match[2],
    pullNumber: match[3],
  };
}

async function fetchPullRequest() {
  try {
    const { owner, repo, pullNumber } = parsePullRequestUrl(fields.prUrl.value.trim());
    setFetchStatus("Fetching pull request details...", "loading");

    const prResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
    );

    if (!prResponse.ok) {
      throw new Error("GitHub could not fetch this pull request.");
    }

    const pr = await prResponse.json();
    setFetchStatus("Fetching changed files...", "loading");

    const filesResponse = await fetch(pr.url + "/files");
    if (!filesResponse.ok) {
      throw new Error("GitHub could not fetch changed files.");
    }

    const files = await filesResponse.json();
    setFormData({
      prUrl: fields.prUrl.value.trim(),
      prTitle: pr.title || "",
      prDescription: pr.body || "",
      changedFiles: files.map((file) => file.filename).join("\n"),
      codeDiff: files
        .map((file) => `diff -- ${file.filename}\n${file.patch || "[Binary or too large to display]"}`)
        .join("\n\n"),
    });

    setFetchStatus("Pull request loaded. You can review it now.", "success");
  } catch (error) {
    setFetchStatus(error.message, "error");
  }
}

function setFetchStatus(message, state = "") {
  fetchStatus.textContent = message;
  fetchStatus.className = `fetch-status ${state}`.trim();
}

function analyzePullRequest(data) {
  const text = `${data.prTitle}\n${data.prDescription}\n${data.changedFiles}\n${data.codeDiff}`;
  const lower = text.toLowerCase();
  const files = data.changedFiles
    .split(/\n|,/)
    .map((file) => file.trim())
    .filter(Boolean);

  const issues = [];
  const addIssue = (severity, title, detail, recommendation, weight) => {
    issues.push({ severity, title, detail, recommendation, weight });
  };

  if (/(password|secret|api[_-]?key|token)\s*[:=]\s*["'][^"']+/i.test(text)) {
    addIssue(
      "critical",
      "Possible hardcoded secret",
      "The diff appears to include a credential-like value.",
      "Move secrets to environment variables or a secret manager before merging.",
      30,
    );
  }

  if (/admin.+1234|password.+1234|username.+admin/i.test(text)) {
    addIssue(
      "high",
      "Weak authentication logic",
      "The change includes simple credential checks that are unsafe for production.",
      "Use a real authentication provider, password hashing, and access controls.",
      24,
    );
  }

  if (/localstorage|sessionstorage/i.test(text) && /token|jwt|auth/i.test(text)) {
    addIssue(
      "medium",
      "Sensitive token stored in browser storage",
      "Browser storage can expose tokens to cross-site scripting attacks.",
      "Prefer secure, HttpOnly cookies or review the threat model carefully.",
      14,
    );
  }

  if (/delete\s+from|drop\s+table|truncate\s+table/i.test(text)) {
    addIssue(
      "critical",
      "Destructive database operation",
      "The diff contains a potentially destructive database statement.",
      "Confirm migrations, backups, and rollback plans before merging.",
      30,
    );
  }

  if (/innerhtml|dangerouslysetinnerhtml|eval\(|new Function/i.test(text)) {
    addIssue(
      "high",
      "Potential injection risk",
      "The change uses dynamic HTML or code execution patterns.",
      "Sanitize input and replace dynamic execution with safer APIs.",
      22,
    );
  }

  if (/fetch\(|axios\.|http:\/\//i.test(text) && !/catch\(|try\s*{|\.catch\(/i.test(text)) {
    addIssue(
      "medium",
      "Network call lacks visible error handling",
      "The diff appears to add a network call without a clear failure path.",
      "Add loading, error, retry, or fallback behavior.",
      12,
    );
  }

  const hasTests = files.some((file) => /test|spec|__tests__/i.test(file));
  if (!hasTests) {
    addIssue(
      "medium",
      "No test files changed",
      "The pull request does not include an obvious test update.",
      "Add or update tests for the changed behavior.",
      12,
    );
  }

  if (files.length >= 12) {
    addIssue(
      "low",
      "Large review surface",
      "This pull request touches many files, which can hide regressions.",
      "Consider splitting unrelated work into smaller pull requests.",
      8,
    );
  }

  if (/\btodo\b|\bfixme\b|console\.log/i.test(text)) {
    addIssue(
      "low",
      "Debug or unfinished markers",
      "The diff includes TODO, FIXME, or console logging.",
      "Clean up temporary markers before merge unless they are intentional.",
      6,
    );
  }

  const risk = Math.min(100, issues.reduce((sum, issue) => sum + issue.weight, 0));
  const scores = buildScores(risk, issues, hasTests);

  return {
    ...data,
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: new Date().toISOString(),
    files,
    issues,
    risk,
    label: risk >= 70 ? "High Risk" : risk >= 40 ? "Medium Risk" : risk >= 15 ? "Low Risk" : "Safe",
    recommendation:
      risk >= 70
        ? "Block merge"
        : risk >= 40
          ? "Request major changes"
          : risk >= 15
            ? "Request minor changes"
            : "Approve",
    scores,
    strengths: buildStrengths(data, files, hasTests),
  };
}

function buildScores(risk, issues, hasTests) {
  const count = (severity) => issues.filter((issue) => issue.severity === severity).length;

  return {
    Security: Math.max(0, 100 - count("critical") * 35 - count("high") * 25),
    Quality: Math.max(0, 100 - risk * 0.55),
    Performance: /loop|query|select \*/i.test(fields.codeDiff.value) ? 68 : 88,
    Maintainability: Math.max(0, 92 - issues.length * 8),
    Testability: hasTests ? 90 : 58,
  };
}

function buildStrengths(data, files, hasTests) {
  const strengths = [];

  if (data.prDescription.length > 80) {
    strengths.push("PR description provides useful context for reviewers.");
  }

  if (hasTests) {
    strengths.push("The change includes test coverage updates.");
  }

  if (files.length > 0 && files.length <= 6) {
    strengths.push("The review surface is small enough for focused review.");
  }

  if (!strengths.length) {
    strengths.push("The report is ready for manual reviewer follow-up.");
  }

  return strengths;
}

function renderReview(review) {
  latestReview = review;
  report.className = "report dashboard-report";
  report.innerHTML = `
    <section class="dashboard-hero">
      <div>
        <h3>${escapeHtml(review.prTitle || "Untitled pull request")}</h3>
        <p>${escapeHtml(review.prDescription || "No PR description provided.")}</p>
      </div>
      <span class="recommendation ${recommendationClass(review.recommendation)}">${review.recommendation}</span>
    </section>

    <section class="dashboard-grid">
      <div class="dashboard-card risk-card">
        <h3>Risk Score</h3>
        <div class="risk-ring" style="--risk: ${review.risk}">
          <div>
            <span>${review.risk}</span>
            <small>/ 100</small>
          </div>
        </div>
        <strong class="risk-label ${riskClass(review.risk)}">${review.label}</strong>
      </div>

      <div class="dashboard-card">
        <h3>Summary</h3>
        <div class="info-row"><span>Files</span><strong>${review.files.length || "Manual diff"}</strong></div>
        <div class="info-row"><span>Findings</span><strong>${review.issues.length}</strong></div>
        <div class="info-row"><span>Reviewed</span><strong>${formatDate(review.createdAt)}</strong></div>
        <div class="info-row"><span>Source</span><strong>${review.prUrl ? escapeHtml(review.prUrl) : "Manual input"}</strong></div>
      </div>

      <div class="dashboard-card wide-card">
        <h3>Severity Counts</h3>
        <div class="severity-strip">
          ${["critical", "high", "medium", "low"]
            .map(
              (severity) => `
                <div class="severity-count ${severity}">
                  <strong>${review.issues.filter((issue) => issue.severity === severity).length}</strong>
                  <span>${capitalize(severity)}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>

      <div class="dashboard-card wide-card">
        <h3>Findings</h3>
        ${
          review.issues.length
            ? review.issues
                .map(
                  (issue) => `
                    <div class="finding-row">
                      <span class="finding-icon ${issue.severity}">!</span>
                      <div>
                        <div class="issue-header">
                          <strong class="issue-title">${escapeHtml(issue.title)}</strong>
                          <span class="severity ${issue.severity}">${capitalize(issue.severity)}</span>
                        </div>
                        <p>${escapeHtml(issue.detail)}</p>
                        <p><strong>Recommendation:</strong> ${escapeHtml(issue.recommendation)}</p>
                      </div>
                    </div>
                  `,
                )
                .join("")
            : "<p>No major rule-based issues were detected. Human review is still recommended.</p>"
        }
      </div>

      <div class="dashboard-card wide-card">
        <h3>Quality Scores</h3>
        <div class="score-grid">
          ${Object.entries(review.scores)
            .map(
              ([label, value]) => `
                <div class="score-item">
                  <span class="score-label">${label}</span>
                  <strong class="score-value">${Math.round(value)}</strong>
                  <span class="score-bar"><span style="width: ${Math.round(value)}%"></span></span>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>

      <div class="dashboard-card wide-card">
        <h3>Positive Signals</h3>
        <ul class="check-list">
          ${review.strengths.map((strength) => `<li>${escapeHtml(strength)}</li>`).join("")}
        </ul>
      </div>
    </section>
  `;
}

function recommendationClass(recommendation) {
  if (/block|major/i.test(recommendation)) return "major";
  if (/minor/i.test(recommendation)) return "minor";
  return "";
}

function riskClass(risk) {
  if (risk >= 70) return "high-risk";
  if (risk >= 40) return "medium-risk";
  if (risk >= 15) return "low-risk";
  return "safe-risk";
}

async function saveReview(review) {
  if (currentUser && firestoreDb) {
    try {
      await firestoreDb
        .collection("users")
        .doc(currentUser.uid)
        .collection("reviews")
        .doc(review.id)
        .set({
          ...review,
          userId: currentUser.uid,
          userEmail: currentUser.email,
        });
      await renderHistory();
      return;
    } catch (error) {
      setAuthStatus(`Firestore save failed: ${error.message}`, "error");
    }
  }

  setAuthStatus("Login is required to save reviews.", "error");
}

function loadLocalHistory() {
  try {
    return JSON.parse(localStorage.getItem(historyKey)) || [];
  } catch {
    return [];
  }
}

async function loadCloudHistory() {
  if (!currentUser || !firestoreDb) return [];

  const snapshot = await firestoreDb
    .collection("users")
    .doc(currentUser.uid)
    .collection("reviews")
    .orderBy("createdAt", "desc")
    .limit(8)
    .get();

  return snapshot.docs.map((doc) => doc.data());
}

async function renderHistory() {
  let history = [];

  if (currentUser && firestoreDb) {
    try {
      history = await loadCloudHistory();
    } catch (error) {
      historyList.innerHTML = `<p class="muted-text">Could not load Firestore history: ${escapeHtml(error.message)}</p>`;
      return;
    }
  }

  visibleHistory = history;

  if (!history.length) {
    historyList.innerHTML = '<p class="muted-text">No cloud reviews saved yet.</p>';
    return;
  }

  historyList.innerHTML = history
    .map(
      (item) => `
        <button type="button" class="history-item" data-id="${item.id}">
          <span>
            <strong>${escapeHtml(item.prTitle || "Untitled pull request")}</strong>
            <small>${formatDate(item.createdAt)}</small>
          </span>
          <span class="history-meta">
            <b>${item.risk}</b>
            <em>${escapeHtml(item.label)}</em>
          </span>
        </button>
      `,
    )
    .join("");
}

async function clearHistory() {
  if (currentUser && firestoreDb) {
    try {
      const snapshot = await firestoreDb
        .collection("users")
        .doc(currentUser.uid)
        .collection("reviews")
        .get();

      await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
      await renderHistory();
      setAuthStatus("Cloud review history cleared.", "success");
      return;
    } catch (error) {
      setAuthStatus(`Could not clear Firestore history: ${error.message}`, "error");
      return;
    }
  }

  renderHistory();
}

function makeMarkdown(review) {
  if (!review) return "";

  return `# MergeGuard AI Review

## ${review.prTitle || "Untitled pull request"}

- Risk score: ${review.risk}/100
- Recommendation: ${review.recommendation}
- Files: ${review.files.length || "Manual diff"}
- Reviewed: ${formatDate(review.createdAt)}

## Findings

${
  review.issues.length
    ? review.issues
        .map(
          (issue) =>
            `- [${issue.severity.toUpperCase()}] ${issue.title}: ${issue.detail} Recommendation: ${issue.recommendation}`,
        )
        .join("\n")
    : "- No major rule-based issues were detected."
}

## Scores

${Object.entries(review.scores)
  .map(([label, value]) => `- ${label}: ${Math.round(value)}/100`)
  .join("\n")}
`;
}

function downloadReview() {
  if (!latestReview) return;

  const blob = new Blob([makeMarkdown(latestReview)], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mergeguard-review.md";
  link.click();
  URL.revokeObjectURL(url);
}

async function copyReview() {
  if (!latestReview) return;
  await navigator.clipboard.writeText(makeMarkdown(latestReview));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

reviewForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const review = analyzePullRequest(getFormData());
  renderReview(review);
  saveReview(review);
});

buttons.login.addEventListener("click", loginUser);
buttons.signup.addEventListener("click", signupUser);
buttons.logout.addEventListener("click", logoutUser);
buttons.fetch.addEventListener("click", fetchPullRequest);
buttons.sample.addEventListener("click", () => {
  setFormData(sampleData);
  setFetchStatus("Sample PR details loaded.", "success");
});
buttons.copy.addEventListener("click", copyReview);
buttons.download.addEventListener("click", downloadReview);
buttons.print.addEventListener("click", () => window.print());
buttons.clearHistory.addEventListener("click", clearHistory);

historyList.addEventListener("click", (event) => {
  const item = event.target.closest(".history-item");
  if (!item) return;

  const review = visibleHistory.find((entry) => entry.id === item.dataset.id);
  if (review) {
    setFormData(review);
    renderReview(review);
  }
});

initializeFirebase();
renderHistory();
