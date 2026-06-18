# BigQuery Release Notes Dashboard

A modern, high-performance Single-Page Application (SPA) that pulls, parses, and displays Google's official BigQuery release notes. It separates mixed-type entries into granular updates (Features, Announcements, Deprecations, Issues) and features interactive drafts that can be directly shared to X / Twitter.

---

## ✨ Features

* **Granular Update Splitting**: Automatically parses daily release note entries containing multiple categories (e.g. standard `Feature` and `Issue` entries on the same day) and displays them as individual cards.
* **Filter & Search controls**: Perform full-text queries across update content, categories, and dates. Apply filter pills for specific classes (`Feature`, `Announcement`, `Issue`, `Deprecation`).
* **Post Draft Composer**: Draft single updates or multiple selected updates into standard X/Twitter posts directly inside the UI. Tracks character lengths against the 280-character limit with indicators and live preview.
* **Ambient Dark UI**: Premium glassmorphic look built using CSS HSL colors, hover highlights, glowing status badges, and loading indicators.
* **CORS Safe Retrieval**: Employs a Flask proxy endpoint to safely fetch the Atom feed, avoiding browser-based Cross-Origin resource issues.
* **Instant Utilities**: Fast copy of formatted update contents to clipboard, and instant jump links to official Google Cloud documentation sources.

---

## 🛠️ Tech Stack

* **Backend**: Python 3.13+, Flask 3.1.3, Requests
* **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6)
* **Assets**: FontAwesome 6 (Icons), Plus Jakarta Sans & Space Grotesk (Fonts)
* **Environment/Package Management**: `uv`

---

## 📂 Project Structure

```text
├── .gitignore          # Complete standard ignore patterns for Python & web IDEs
├── .python-version     # Target Python version descriptor
├── pyproject.toml      # Project manifest and backend dependencies (Flask, requests)
├── uv.lock             # Resolved dependency lock file
├── app.py              # Flask server routes and Atom XML feed parser
├── main.py             # Entry point script to launch the app
├── templates/
│   └── index.html      # UI template skeleton and Modal composer structure
└── static/
    ├── css/
    │   └── style.css   # Dark theme rules, responsive layouts, and transitions
    └── js/
        └── app.js      # Parser client logic, UI filters, selections, and X intent integration
```

---

## 🚀 Setup & Run Instructions

### Prerequisites
Make sure you have [uv](https://github.com/astral-sh/uv) installed on your system.

### 1. Clone the repository
```bash
git clone https://github.com/StijnRis/tutorial-antigravity-cli-hands-on.git
cd tutorial-antigravity-cli-hands-on
```

### 2. Run the application
Using `uv`, you don't need to manually configure virtual environments or install pip packages; `uv run` handles everything on the fly:
```bash
uv run main.py
```

The application will start, download feed details, and serve the dashboard locally at:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🔗 APIs & Feeds
* **Google BigQuery Release Notes RSS Atom Feed**:
  `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`
* **Local Proxy JSON Endpoint**:
  `http://127.0.0.1:5000/api/releases`
