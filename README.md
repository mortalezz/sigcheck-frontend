# SigCheck Frontend

React frontend for the [PDF Shadow Attack Forensic Engine](https://github.com/mortalezz/pdf-shadow-engine).

**Live at [sigcheck-app.leapcell.app](https://sigcheck-app.leapcell.app)**

Upload a signed PDF and get a forensic report that classifies every digital signature as ⛔ EXPLOITED (attack was performed) or ⚠️ SUSCEPTIBLE (vulnerability exists but was not exploited), based on five attack classes from two peer-reviewed papers by Ruhr University Bochum.

## What It Does

Drag a PDF onto the upload zone, click Analyze, and the app calls the SigCheck API to run the forensic engine. Results render as a styled HTML report directly in the browser, with a verdict banner, crime scene analysis for exploited signatures, and question prompts for susceptible ones. Download buttons offer the same report as PDF, Markdown, or HTML.

No documents are stored — files are sent directly to the API, analyzed in memory, and deleted immediately.

## Stack

Single React component built with Vite. DM Sans for body text, JetBrains Mono for technical elements. Crimson/amber/navy color system matching the engine's report output. Fully responsive down to mobile.

## Local Development

```bash
git clone https://github.com/mortalezz/sigcheck-frontend.git
cd sigcheck-frontend
npm install
npm run dev
```

Opens at `localhost:5173`. Calls the live API at `sigcheck.leapcell.app` by default, or `localhost:8000` if you're running the backend locally.

To run the backend locally alongside it:

```bash
git clone https://github.com/mortalezz/pdf-shadow-engine.git
cd pdf-shadow-engine
pip install -r requirements.txt
uvicorn api:app --reload --port 8000
```

## Deployment

Deployed on Leapcell as a static Node.js service:

| Field | Value |
|---|---|
| **Build Command** | `npm install && npm run build && npm install serve` |
| **Start Command** | `npx serve dist -l 8080` |
| **Port** | `8080` |

Auto-deploys on push to `main`.

## Related

- **Backend + Engine:** [pdf-shadow-engine](https://github.com/mortalezz/pdf-shadow-engine)
- **API Docs:** [sigcheck.leapcell.app/docs](https://sigcheck.leapcell.app/docs)
- **Research:** Mladenov et al., ACM CCS 2019 · Mainka et al., NDSS 2021

## License

MIT
