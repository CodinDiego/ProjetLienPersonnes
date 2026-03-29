import { useState, useRef, useEffect, useCallback } from "react";

const RELATION_TYPES = [
  { label: "Ami·e",    value: "ami",      color: "#4ade80", emoji: "" },
  { label: "Couple",   value: "couple",   color: "#f472b6", emoji: "" },
  { label: "Lycée",  value: "lycée",  color: "#fb923c", emoji: "" },
  { label: "Ex", value: "ex", color: "#60a5fa", emoji: "" },
  { label: "Collège",    value: "collège",    color: "#a78bfa", emoji: "" },
];

const COLORS = [
  "#e2e8f0","#fde68a","#bbf7d0","#bfdbfe","#fecaca",
  "#ddd6fe","#fed7aa","#99f6e4","#e9d5ff","#fda4af",
];

const NODE_RADIUS = 32;
const MIN_DIST = NODE_RADIUS * 2 + 20;

function getRelationConfig(type) {
  return RELATION_TYPES.find((r) => r.value === type) || RELATION_TYPES[4];
}

function findFreePosition(existing, svgW = 800, svgH = 600) {
  const margin = NODE_RADIUS + 10;
  for (let t = 0; t < 200; t++) {
    const x = margin + Math.random() * (svgW - margin * 2);
    const y = margin + Math.random() * (svgH - margin * 2);
    if (!existing.some((p) => Math.hypot(p.x - x, p.y - y) < MIN_DIST))
      return { x, y };
  }
  return { x: margin + Math.random() * (svgW - margin * 2), y: margin + Math.random() * (svgH - margin * 2) };
}

// ─── API helpers ────────────────────────────────────────────────────────────

async function apiLogin(password) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

async function apiLogout() {
  await fetch("/api/logout", { method: "POST" });
}

async function apiMe() {
  const res = await fetch("/api/me");
  const data = await res.json();
  return data.authenticated;
}

async function apiLoadData() {
  const res = await fetch("/api/data");
  if (!res.ok) return null;
  return res.json();
}

async function apiSaveData(nodes, edges) {
  await fetch("/api/data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodes, edges }),
  });
}

// ─── Login Screen ────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!password) return;
    setLoading(true);
    setError("");
    const ok = await apiLogin(password);
    if (ok) {
      onLogin();
    } else {
      setError("Mot de passe incorrect.");
    }
    setLoading(false);
  };

  return (
      <div className="login-overlay">
        <div className="login-card">

          <h1 className="login-title">GraphiqueTouintouin</h1>
          <p className="login-sub">Entrez le mot de passe pour accéder</p>
          <div className="login-field">
            <input
                className="input login-input"
                type="password"
                placeholder="Mot de passe..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                autoFocus
            />
            <button
                className="btn-add login-btn"
                onClick={handleSubmit}
                disabled={loading}
            >
              {loading ? "…" : "→"}
            </button>
          </div>
          {error && <p className="login-error">{error}</p>}
        </div>
      </div>
  );
}

// ─── Save indicator ──────────────────────────────────────────────────────────

function SaveStatus({ status }) {
  if (status === "idle") return null;
  return (
      <span className={`save-status save-status--${status}`}>
      {status === "saving" && " Sauvegarde…"}
        {status === "saved"  && "✓ Sauvegardé"}
        {status === "error"  && "⚠ Erreur de sauvegarde"}
    </span>
  );
}

// ─── Graph Canvas ────────────────────────────────────────────────────────────

function GraphCanvas({ nodes, edges }) {
  const svgRef = useRef(null);
  const [positions, setPositions] = useState({});
  const [dragging, setDragging]   = useState(null);
  const [offset, setOffset]       = useState({ x: 0, y: 0 });

  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (!nodes.find((n) => n.id === id)) delete next[id];
      });
      nodes.forEach((n) => {
        if (!next[n.id]) {
          next[n.id] = findFreePosition(Object.values(next));
        }
      });
      return next;
    });
  }, [nodes]);

  const handleMouseDown = useCallback((e, id) => {
    e.preventDefault();
    const svg = svgRef.current;
    const pt  = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    setDragging(id);
    setOffset({ x: svgP.x - (positions[id]?.x || 0), y: svgP.y - (positions[id]?.y || 0) });
  }, [positions]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const svg = svgRef.current;
    const pt  = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    setPositions((prev) => ({
      ...prev,
      [dragging]: { x: svgP.x - offset.x, y: svgP.y - offset.y },
    }));
  }, [dragging, offset]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  return (
      <svg
          ref={svgRef}
          viewBox="0 0 800 600"
          className="graph-svg"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
      >
        <defs>
          {RELATION_TYPES.map((r) => (
              <marker key={r.value} id={`arrow-${r.value}`} markerWidth="8" markerHeight="8" refX="20" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={r.color} opacity="0.7" />
              </marker>
          ))}
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = positions[edge.from];
          const to   = positions[edge.to];
          if (!from || !to) return null;
          const cfg = getRelationConfig(edge.type);

          const pairKey   = [edge.from, edge.to].sort().join("_");
          const pairEdges = edges.filter((e) => [e.from, e.to].sort().join("_") === pairKey);
          const pairIndex = pairEdges.indexOf(edge);
          const pairCount = pairEdges.length;

          const dx = to.x - from.x, dy = to.y - from.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          const offsetMag = pairCount === 1 ? 0 : (pairIndex - (pairCount - 1) / 2) * 32;
          const mx = (from.x + to.x) / 2 + nx * offsetMag;
          const my = (from.y + to.y) / 2 + ny * offsetMag;
          const pathD = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;

          return (
              <g key={i}>
                <path d={pathD} fill="none" stroke={cfg.color} strokeWidth="2.5" strokeOpacity="0.75"
                      strokeDasharray={edge.type === "autre" ? "6,3" : "none"} />
                <text x={mx} y={my - 7} textAnchor="middle" fontSize="11" fill={cfg.color}
                      fontFamily="'DM Mono', monospace" fontWeight="600"
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                  {cfg.emoji} {cfg.label}
                </text>
              </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;
          return (
              <g key={node.id} transform={`translate(${pos.x},${pos.y})`}
                 onMouseDown={(e) => handleMouseDown(e, node.id)}
                 style={{ cursor: dragging === node.id ? "grabbing" : "grab" }}>
                <circle r="32" fill={node.color} stroke="#1e293b" strokeWidth="2.5" />
                <circle r="30" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.4" />
                <text textAnchor="middle" dy="0.35em" fontSize="13" fontWeight="700"
                      fontFamily="'DM Serif Display', serif" fill="#1e293b"
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                  {node.name}
                </text>
              </g>
          );
        })}
      </svg>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [auth, setAuth]           = useState(null); // null = en cours de vérif
  const [nodes, setNodes]         = useState([]);
  const [edges, setEdges]         = useState([]);
  const [nameInput, setNameInput] = useState("");
  const [relFrom, setRelFrom]     = useState("");
  const [relTo, setRelTo]         = useState("");
  const [relType, setRelType]     = useState("ami");
  const [colorIdx, setColorIdx]   = useState(0);
  const [tab, setTab]             = useState("persons");
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const saveTimer = useRef(null);

  useEffect(() => {
    apiMe().then((ok) => {
      setAuth(ok);
      if (ok) loadData();
    });
  }, []);

  const loadData = async () => {
    const data = await apiLoadData();
    if (data) {
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setColorIdx((data.nodes || []).length);
    }
  };

  // Sauvegarde automatique avec debounce (1.5s après le dernier changement)
  const triggerSave = useCallback((newNodes, newEdges) => {
    clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await apiSaveData(newNodes, newEdges);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
      }
    }, 1500);
  }, []);

  const handleLogin = async () => {
    setAuth(true);
    await loadData();
  };

  const handleLogout = async () => {
    await apiLogout();
    setAuth(false);
    setNodes([]);
    setEdges([]);
  };

  const addNode = () => {
    const name = nameInput.trim();
    if (!name || nodes.find((n) => n.name.toLowerCase() === name.toLowerCase())) return;
    const newNode = { id: crypto.randomUUID(), name, color: COLORS[colorIdx % COLORS.length] };
    const newNodes = [...nodes, newNode];
    setNodes(newNodes);
    setColorIdx((c) => c + 1);
    setNameInput("");
    triggerSave(newNodes, edges);
  };

  const removeNode = (id) => {
    const newNodes = nodes.filter((n) => n.id !== id);
    const newEdges = edges.filter((e) => e.from !== id && e.to !== id);
    setNodes(newNodes);
    setEdges(newEdges);
    triggerSave(newNodes, newEdges);
  };

  const addEdge = () => {
    if (!relFrom || !relTo || relFrom === relTo) return;
    const duplicate = edges.find(
        (e) => e.type === relType &&
            ((e.from === relFrom && e.to === relTo) || (e.from === relTo && e.to === relFrom))
    );
    if (duplicate) return;
    const newEdges = [...edges, { from: relFrom, to: relTo, type: relType }];
    setEdges(newEdges);
    setRelFrom(""); setRelTo("");
    triggerSave(nodes, newEdges);
  };

  const removeEdge = (i) => {
    const newEdges = edges.filter((_, idx) => idx !== i);
    setEdges(newEdges);
    triggerSave(nodes, newEdges);
  };

  const getName = (id) => nodes.find((n) => n.id === id)?.name || "?";



  if (auth === null) {
    return (
        <div className="login-overlay">
          <div className="login-logo" style={{ fontSize: "2.5rem", color: "var(--accent)" }}>◈</div>
        </div>
    );
  }

  if (!auth) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
      <div className="app">
        <header className="header">
          <div className="header-inner">
            <span className="logo">Pour Touintouin</span>

          </div>
          <div className="header-right">
            <SaveStatus status={saveStatus} />
            <button className="btn-logout" onClick={handleLogout} title="Se déconnecter">
               Déconnexion
            </button>
          </div>
        </header>

        <main className="main">
          <aside className="sidebar">
            <div className="tabs">
              <button className={`tab ${tab === "persons" ? "active" : ""}`} onClick={() => setTab("persons")}>
                 Personnes
              </button>
              <button className={`tab ${tab === "relations" ? "active" : ""}`} onClick={() => setTab("relations")}>
                 Relations
              </button>
            </div>

            {tab === "persons" && (
                <div className="panel">
                  <div className="field-group">
                    <input
                        className="input"
                        placeholder="Prénom..."
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addNode()}
                    />
                    <button className="btn-add" onClick={addNode}>＋</button>
                  </div>
                  <ul className="list">
                    {nodes.length === 0 && <li className="empty">Aucune personne ajoutée</li>}
                    {nodes.map((n) => (
                        <li key={n.id} className="list-item">
                          <span className="dot" style={{ background: n.color }} />
                          <span className="item-name">{n.name}</span>
                          <button className="btn-remove" onClick={() => removeNode(n.id)}>✕</button>
                        </li>
                    ))}
                  </ul>
                </div>
            )}

            {tab === "relations" && (
                <div className="panel">
                  <div className="relation-form">
                    <select className="select" value={relFrom} onChange={(e) => setRelFrom(e.target.value)}>
                      <option value="">Personne A</option>
                      {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                    <select className="select" value={relType} onChange={(e) => setRelType(e.target.value)}>
                      {RELATION_TYPES.map((r) => (
                          <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>
                      ))}
                    </select>
                    <select className="select" value={relTo} onChange={(e) => setRelTo(e.target.value)}>
                      <option value="">Personne B</option>
                      {nodes.filter((n) => n.id !== relFrom).map((n) => (
                          <option key={n.id} value={n.id}>{n.name}</option>
                      ))}
                    </select>
                    <button className="btn-add full" onClick={addEdge}>Ajouter le lien</button>
                  </div>
                  <ul className="list">
                    {edges.length === 0 && <li className="empty">Aucune relation définie</li>}
                    {edges.map((e, i) => {
                      const cfg = getRelationConfig(e.type);
                      return (
                          <li key={i} className="list-item">
                            <span className="rel-dot">{cfg.emoji}</span>
                            <span className="item-name">
                        {getName(e.from)} <span style={{ color: cfg.color }}>↔</span> {getName(e.to)}
                      </span>
                            <button className="btn-remove" onClick={() => removeEdge(i)}>✕</button>
                          </li>
                      );
                    })}
                  </ul>
                </div>
            )}
          </aside>

          <section className="canvas-area">
            {nodes.length === 0 ? (
                <div className="empty-graph">
                  <div className="empty-icon">◈</div>
                </div>
            ) : (
                <GraphCanvas nodes={nodes} edges={edges} />
            )}
          </section>
        </main>
      </div>
  );
}
