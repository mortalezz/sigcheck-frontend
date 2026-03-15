import { useState, useCallback, useRef, useEffect } from "react";

const API = window.location.hostname === "localhost"
  ? "http://localhost:8000"
  : "https://sigcheck.leapcell.app";

const STATES = { IDLE: "idle", UPLOADING: "uploading", ANALYZING: "analyzing", DONE: "done", ERROR: "error" };

export default function SigCheck() {
  const [state, setState] = useState(STATES.IDLE);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [htmlReport, setHtmlReport] = useState("");
  const [jsonReport, setJsonReport] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("html");
  const fileRef = useRef(null);
  const iframeRef = useRef(null);

  const reset = () => {
    setState(STATES.IDLE);
    setFile(null);
    setHtmlReport("");
    setJsonReport(null);
    setError("");
    setActiveTab("html");
  };

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      setState(STATES.ERROR);
      return;
    }
    setFile(f);
    setError("");
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const analyze = async () => {
    if (!file) return;
    setState(STATES.UPLOADING);
    const form = new FormData();
    form.append("file", file);

    try {
      setState(STATES.ANALYZING);

      const [htmlRes, jsonRes] = await Promise.all([
        fetch(`${API}/report/html`, { method: "POST", body: form }),
        fetch(`${API}/analyze`, { method: "POST", body: (() => { const f2 = new FormData(); f2.append("file", file); return f2; })() }),
      ]);

      if (!htmlRes.ok) throw new Error(`Analysis failed: ${htmlRes.status}`);
      const html = await htmlRes.text();
      const json = await jsonRes.json();

      setHtmlReport(html);
      setJsonReport(json);
      setState(STATES.DONE);
    } catch (err) {
      setError(err.message || "Analysis failed. Please try again.");
      setState(STATES.ERROR);
    }
  };

  const downloadReport = async (format) => {
    const form = new FormData();
    form.append("file", file);
    const endpoint = format === "pdf" ? "/report/pdf" : "/report/md";
    const res = await fetch(`${API}${endpoint}`, { method: "POST", body: form });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.name}_report.${format === "pdf" ? "pdf" : "md"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (htmlReport && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      doc.open();
      doc.write(htmlReport);
      doc.close();
    }
  }, [htmlReport, activeTab]);

  const verdict = jsonReport?.summary?.verdict || "";
  const attackClasses = jsonReport?.summary?.attack_classes || [];
  const totalFindings = jsonReport?.summary?.total_findings || 0;
  const bySeverity = jsonReport?.summary?.by_severity || {};
  const hasExploited = attackClasses.length > 0 && jsonReport?.signatures?.some(
    s => Object.entries(s.properties || {}).some(([k, v]) => k.endsWith("_status") && v === "EXPLOITED")
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F7F7F5", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::selection { background: #1A1A2E; color: #FFF; }

        .header {
          background: #1A1A2E;
          color: #FFF;
          padding: 20px 0;
        }
        .header-inner {
          max-width: 960px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo {
          font-family: 'JetBrains Mono', monospace;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .logo span { color: #FFB74D; }
        .header-links {
          display: flex;
          gap: 20px;
          font-size: 13px;
        }
        .header-links a {
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          transition: color 0.2s;
        }
        .header-links a:hover { color: #FFF; }

        .hero {
          max-width: 960px;
          margin: 0 auto;
          padding: 48px 24px 0;
          text-align: center;
        }
        .hero h1 {
          font-size: 36px;
          font-weight: 700;
          color: #1A1A2E;
          margin-bottom: 12px;
          letter-spacing: -1px;
        }
        .hero p {
          font-size: 16px;
          color: #666;
          max-width: 600px;
          margin: 0 auto 32px;
          line-height: 1.6;
        }
        .hero .badges {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 36px;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.3px;
        }
        .badge-navy { background: #E3F2FD; color: #0D47A1; }

        .main { max-width: 960px; margin: 0 auto; padding: 0 24px 48px; }

        .drop-zone {
          border: 2px dashed #CCC;
          border-radius: 16px;
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.25s ease;
          background: #FFF;
          margin-bottom: 24px;
        }
        .drop-zone:hover, .drop-zone.active {
          border-color: #0D47A1;
          background: #F5F9FF;
        }
        .drop-zone.has-file {
          border-color: #1B5E20;
          background: #F1F8F1;
          border-style: solid;
        }
        .drop-zone .icon { font-size: 40px; margin-bottom: 12px; }
        .drop-zone .label {
          font-size: 15px;
          color: #666;
          margin-bottom: 4px;
        }
        .drop-zone .filename {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          color: #1A1A2E;
          font-weight: 500;
        }
        .drop-zone .filesize {
          font-size: 12px;
          color: #999;
        }

        .analyze-btn {
          display: block;
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 32px;
        }
        .analyze-btn.ready {
          background: #0D47A1;
          color: #FFF;
        }
        .analyze-btn.ready:hover {
          background: #1565C0;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(13,71,161,0.3);
        }
        .analyze-btn:disabled {
          background: #E0E0E0;
          color: #999;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .progress {
          text-align: center;
          padding: 48px 24px;
        }
        .spinner {
          width: 48px; height: 48px;
          border: 3px solid #E0E0E0;
          border-top-color: #0D47A1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .progress p { color: #666; font-size: 14px; }

        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .verdict-pill {
          display: inline-block;
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          color: #FFF;
        }
        .verdict-red { background: #B71C1C; }
        .verdict-amber { background: #E65100; }
        .verdict-green { background: #1B5E20; }

        .stats {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .stat {
          background: #FFF;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .stat b { font-family: 'JetBrains Mono', monospace; }

        .tabs {
          display: flex;
          gap: 0;
          border-bottom: 2px solid #E0E0E0;
          margin-bottom: 0;
        }
        .tab {
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 600;
          color: #999;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
          background: none;
          border-top: none; border-left: none; border-right: none;
          font-family: 'DM Sans', sans-serif;
        }
        .tab:hover { color: #666; }
        .tab.active {
          color: #0D47A1;
          border-bottom-color: #0D47A1;
        }

        .report-frame {
          width: 100%;
          border: 1px solid #E0E0E0;
          border-top: none;
          border-radius: 0 0 12px 12px;
          background: #FFF;
          min-height: 600px;
        }

        .json-view {
          background: #1A1A2E;
          color: #E0E0E0;
          padding: 20px;
          border-radius: 0 0 12px 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          line-height: 1.6;
          overflow-x: auto;
          max-height: 700px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .download-bar {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .dl-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          border: 1.5px solid #E0E0E0;
          background: #FFF;
          color: #1A1A2E;
          transition: all 0.2s;
        }
        .dl-btn:hover {
          border-color: #0D47A1;
          color: #0D47A1;
          background: #F5F9FF;
        }
        .new-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          border: none;
          background: #1A1A2E;
          color: #FFF;
          transition: all 0.2s;
          margin-left: auto;
        }
        .new-btn:hover { background: #2A2A3E; }

        .error-box {
          background: #FFF5F5;
          border: 1px solid #FFCDD2;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin-bottom: 24px;
        }
        .error-box p { color: #B71C1C; margin-bottom: 12px; }

        .privacy {
          text-align: center;
          font-size: 11px;
          color: #BBB;
          margin-top: 24px;
        }

        footer {
          text-align: center;
          padding: 24px;
          font-size: 11px;
          color: #BBB;
          border-top: 1px solid #E8E8E8;
          margin-top: 32px;
        }
        footer a { color: #999; }

        @media (max-width: 640px) {
          .header-inner { flex-direction: column; gap: 8px; text-align: center; }
          .hero h1 { font-size: 26px; }
          .hero p { font-size: 14px; }
          .drop-zone { padding: 32px 16px; }
          .drop-zone .icon { font-size: 32px; }
          .results-header { flex-direction: column; align-items: flex-start; }
          .verdict-pill { font-size: 12px; padding: 6px 14px; }
          .stats { gap: 8px; }
          .stat { font-size: 11px; padding: 6px 10px; }
          .tabs { gap: 0; }
          .tab { padding: 8px 12px; font-size: 12px; }
          .download-bar {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            flex-wrap: nowrap;
          }
          .dl-btn, .new-btn {
            width: 100%;
            text-align: center;
            margin-left: 0;
            padding: 12px 10px;
            font-size: 12px;
            box-sizing: border-box;
          }
          .report-frame { min-height: 400px; }
          .json-view { font-size: 10px; max-height: 400px; }
        }
      `}</style>

      {/* HEADER */}
      <div className="header">
        <div className="header-inner">
          <div className="logo">Sig<span>Check</span></div>
          <div className="header-links">
            <a href="https://sigcheck.leapcell.app/docs" target="_blank" rel="noreferrer">API Docs</a>
            <a href="https://github.com/mortalezz/pdf-shadow-engine" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </div>
      </div>

      {/* HERO — only on idle */}
      {(state === STATES.IDLE || state === STATES.ERROR) && (
        <div className="hero">
          <h1>Was this document attacked?</h1>
          <p>
            Upload a signed PDF and find out whether its digital signatures were
            exploited or merely vulnerable — based on two peer-reviewed papers
            from Ruhr University Bochum.
          </p>
          <div className="badges">
            {["USF", "ISA", "SWA", "PKCS", "SHADOW"].map(c => (
              <span key={c} className="badge badge-navy">{c}</span>
            ))}
          </div>
        </div>
      )}

      <div className="main">
        {/* ERROR */}
        {state === STATES.ERROR && (
          <div className="error-box">
            <p>{error}</p>
            <button className="new-btn" onClick={reset}>Try Again</button>
          </div>
        )}

        {/* UPLOAD */}
        {(state === STATES.IDLE || state === STATES.ERROR) && (
          <>
            <div
              className={`drop-zone ${dragOver ? "active" : ""} ${file ? "has-file" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {file ? (
                <>
                  <div className="icon">📄</div>
                  <div className="filename">{file.name}</div>
                  <div className="filesize">{(file.size / 1024).toFixed(0)} KB</div>
                </>
              ) : (
                <>
                  <div className="icon">🔍</div>
                  <div className="label">Drop a signed PDF here or click to browse</div>
                </>
              )}
            </div>

            <button
              className={`analyze-btn ${file ? "ready" : ""}`}
              disabled={!file}
              onClick={analyze}
            >
              {file ? "Analyze Signatures" : "Select a PDF to begin"}
            </button>
          </>
        )}

        {/* ANALYZING */}
        {(state === STATES.UPLOADING || state === STATES.ANALYZING) && (
          <div className="progress">
            <div className="spinner" />
            <p>{state === STATES.UPLOADING ? "Uploading..." : "Running forensic analysis..."}</p>
          </div>
        )}

        {/* RESULTS */}
        {state === STATES.DONE && (
          <>
            <div className="results-header">
              <span className={`verdict-pill ${
                verdict.includes("COMPROMISED") ? "verdict-red" :
                verdict.includes("SIGNIFICANT") ? "verdict-amber" : "verdict-green"
              }`}>
                {verdict}
              </span>
              <div className="stats">
                <div className="stat"><b>{totalFindings}</b> findings</div>
                {bySeverity.CRITICAL && <div className="stat" style={{color:"#B71C1C"}}><b>{bySeverity.CRITICAL}</b> critical</div>}
                {bySeverity.HIGH && <div className="stat" style={{color:"#E65100"}}><b>{bySeverity.HIGH}</b> high</div>}
                {attackClasses.length > 0 && (
                  <div className="stat">
                    {attackClasses.map(c => (
                      <span key={c} className="badge badge-navy" style={{marginRight:4}}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* TABS */}
            <div className="tabs">
              <button className={`tab ${activeTab === "html" ? "active" : ""}`} onClick={() => setActiveTab("html")}>
                Report
              </button>
              <button className={`tab ${activeTab === "json" ? "active" : ""}`} onClick={() => setActiveTab("json")}>
                JSON
              </button>
            </div>

            {activeTab === "html" && (
              <iframe
                ref={iframeRef}
                className="report-frame"
                title="Forensic Report"
                sandbox="allow-same-origin"
              />
            )}

            {activeTab === "json" && (
              <div className="json-view">
                {JSON.stringify(jsonReport, null, 2)}
              </div>
            )}

            {/* DOWNLOAD BAR */}
            <div className="download-bar">
              <button className="dl-btn" onClick={() => downloadReport("pdf")}>📄 Download PDF</button>
              <button className="dl-btn" onClick={() => downloadReport("md")}>📝 Download Markdown</button>
              <button className="dl-btn" onClick={() => {
                const blob = new Blob([htmlReport], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `${file.name}_report.html`; a.click();
                URL.revokeObjectURL(url);
              }}>🌐 Download HTML</button>
              <button className="new-btn" onClick={reset}>↻ New Analysis</button>
            </div>
          </>
        )}

        <div className="privacy">
          🔒 No documents are stored. Files are deleted immediately after processing.
        </div>
      </div>

      <footer>
        SigCheck — PDF Shadow Attack Forensic Engine v2 ·
        Implements <a href="https://doi.org/10.1145/3319535.3339812" target="_blank" rel="noreferrer">Mladenov et al., CCS 2019</a> and Mainka et al., NDSS 2021
      </footer>
    </div>
  );
}
