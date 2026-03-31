import { useState, useRef, useEffect, useCallback } from "react";

// ─── Constantes ───────────────────────────────────────────────

const COLORS = [
  "#e2e8f0","#fde68a","#bbf7d0","#bfdbfe","#fecaca",
  "#ddd6fe","#fed7aa","#99f6e4","#e9d5ff","#fda4af",
];

const REL_COLORS = [
  "#4ade80","#f472b6","#fb923c","#60a5fa","#a78bfa",
  "#facc15","#f87171","#34d399","#818cf8","#fb7185",
];

const DEFAULT_RELATION_TYPES = [
  { id: "ami",      label: "Ami·e",    color: "#4ade80", emoji: "🤝" },
  { id: "couple",   label: "Couple",   color: "#f472b6", emoji: "💕" },
  { id: "famille",  label: "Famille",  color: "#fb923c", emoji: "🏠" },
  { id: "collegue", label: "Collègue", color: "#60a5fa", emoji: "💼" },
  { id: "autre",    label: "Autre",    color: "#a78bfa", emoji: "🔗" },
];

const STORAGE_KEY    = "relgraph_data";
const RELTYPES_KEY   = "relgraph_reltypes";
const AUTH_KEY       = "relgraph_auth";
const PASSWORD       = import.meta.env.VITE_PASSWORD;

const BASE_RADIUS    = 28;
const CHAR_WIDTH     = 5.5;   // px par caractère à fontSize 13
const RADIUS_PADDING = 14;    // padding horizontal dans le cercle

// ─── Helpers ─────────────────────────────────────────────────

function nodeRadius(name) {
  return Math.max(BASE_RADIUS, name.length * CHAR_WIDTH / 2 + RADIUS_PADDING);
}

function getRelationConfig(type, relTypes) {
  return relTypes.find((r) => r.id === type) || { label: type, color: "#a78bfa", emoji: "🔗" };
}

function findFreePosition(existing, radii = {}, svgW = 800, svgH = 600) {
  const margin = 50;
  for (let t = 0; t < 300; t++) {
    const x = margin + Math.random() * (svgW - margin * 2);
    const y = margin + Math.random() * (svgH - margin * 2);
    const tooClose = existing.some((p) => {
      const minD = (radii[p.id] || BASE_RADIUS) + BASE_RADIUS + 16;
      return Math.hypot(p.x - x, p.y - y) < minD;
    });
    if (!tooClose) return { x, y };
  }
  return { x: margin + Math.random() * (svgW - margin * 2), y: margin + Math.random() * (svgH - margin * 2) };
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { nodes: [], edges: [] };
    return JSON.parse(raw);
  } catch { return { nodes: [], edges: [] }; }
}

function saveToStorage(nodes, edges) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
}

function loadRelTypes() {
  try {
    const raw = localStorage.getItem(RELTYPES_KEY);
    if (!raw) return DEFAULT_RELATION_TYPES;
    return JSON.parse(raw);
  } catch { return DEFAULT_RELATION_TYPES; }
}

function saveRelTypes(types) {
  localStorage.setItem(RELTYPES_KEY, JSON.stringify(types));
}

// ─── Login Screen ─────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  const handleSubmit = () => {
    if (!password) return;
    if (password === PASSWORD) {
      localStorage.setItem(AUTH_KEY, "1");
      onLogin();
    } else {
      setError("Mot de passe incorrect.");
    }
  };

  return (
      <div className="login-overlay">
        <div className="login-card">
          <div className="login-logo">◈</div>
          <h1 className="login-title">RelGraph</h1>
          <p className="login-sub">Entrez le mot de passe pour accéder</p>
          <div className="login-field">
            <input className="input login-input" type="password" placeholder="Mot de passe..."
                   value={password} onChange={(e) => setPassword(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && handleSubmit()} autoFocus />
            <button className="btn-add login-btn" onClick={handleSubmit}>→</button>
          </div>
          {error && <p className="login-error">{error}</p>}
        </div>
      </div>
  );
}

// ─── Graph Canvas ─────────────────────────────────────────────

function GraphCanvas({ nodes, edges, relTypes }) {
  const svgRef = useRef(null);
  const [positions, setPositions] = useState({});
  const [dragging, setDragging]   = useState(null);
  const [offset, setOffset]       = useState({ x: 0, y: 0 });

  // Calcul des rayons par nœud
  const radii = Object.fromEntries(nodes.map((n) => [n.id, nodeRadius(n.name)]));

  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (!nodes.find((n) => n.id === id)) delete next[id];
      });
      nodes.forEach((n) => {
        if (!next[n.id]) {
          const existing = nodes
              .filter((m) => next[m.id])
              .map((m) => ({ ...next[m.id], id: m.id }));
          next[n.id] = findFreePosition(existing, radii);
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

  const getSVGPoint = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    const pt  = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }, []);

  const handleTouchStart = useCallback((e, id) => {
    e.preventDefault();
    const touch = e.touches[0];
    const svgP  = getSVGPoint(touch.clientX, touch.clientY);
    setDragging(id);
    setOffset({ x: svgP.x - (positions[id]?.x || 0), y: svgP.y - (positions[id]?.y || 0) });
  }, [positions, getSVGPoint]);

  const handleTouchMove = useCallback((e) => {
    if (!dragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const svgP  = getSVGPoint(touch.clientX, touch.clientY);
    setPositions((prev) => ({
      ...prev,
      [dragging]: { x: svgP.x - offset.x, y: svgP.y - offset.y },
    }));
  }, [dragging, offset, getSVGPoint]);

  return (
      <svg ref={svgRef} viewBox="0 0 800 600" className="graph-svg"
           onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
           onTouchMove={(e) => handleTouchMove(e)} onTouchEnd={handleMouseUp}
           style={{ touchAction: "none" }}>
        <defs>
          {relTypes.map((r) => (
              <marker key={r.id} id={`arrow-${r.id}`} markerWidth="8" markerHeight="8" refX="20" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={r.color} opacity="0.7" />
              </marker>
          ))}
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = positions[edge.from];
          const to   = positions[edge.to];
          if (!from || !to) return null;
          const cfg = getRelationConfig(edge.type, relTypes);
          const pairKey   = [edge.from, edge.to].sort().join("_");
          const pairEdges = edges.filter((e) => [e.from, e.to].sort().join("_") === pairKey);
          const pairIndex = pairEdges.indexOf(edge);
          const pairCount = pairEdges.length;
          const dx = to.x - from.x, dy = to.y - from.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          const offsetMag = pairCount === 1 ? 0 : (pairIndex - (pairCount - 1) / 2) * 36;
          const mx = (from.x + to.x) / 2 + nx * offsetMag;
          const my = (from.y + to.y) / 2 + ny * offsetMag;
          return (
              <g key={i}>
                <path d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                      fill="none" stroke={cfg.color} strokeWidth="2.5" strokeOpacity="0.75" />
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
          const r = radii[node.id];
          const fontSize = Math.max(10, Math.min(14, r * 0.42));
          return (
              <g key={node.id} transform={`translate(${pos.x},${pos.y})`}
                 onMouseDown={(e) => handleMouseDown(e, node.id)}
                 onTouchStart={(e) => handleTouchStart(e, node.id)}
                 style={{ cursor: dragging === node.id ? "grabbing" : "grab" }}>
                <circle r={r} fill={node.color} stroke="#1e293b" strokeWidth="2.5" />
                <circle r={r - 2} fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.4" />
                <text textAnchor="middle" dy="0.35em" fontSize={fontSize} fontWeight="700"
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

// ─── Relation Types Panel ─────────────────────────────────────

const COMMON_EMOJIS = ["🤝","💕","🏠","💼","🔗","❤️","🌟","⚡","🎯","🎨","🏆","🤜","🦋","🌈","🔥","💫","🎭","🧩","🌺","💎"];

function RelTypesPanel({ relTypes, onUpdate }) {
  const [labelInput, setLabelInput] = useState("");
  const [colorInput, setColorInput] = useState(REL_COLORS[0]);
  const [emojiInput, setEmojiInput] = useState("🔗");
  const [colorIdx, setColorIdx]     = useState(0);

  const addType = () => {
    const label = labelInput.trim();
    if (!label) return;
    if (relTypes.find((r) => r.label.toLowerCase() === label.toLowerCase())) return;
    const newType = {
      id: crypto.randomUUID(),
      label,
      color: colorInput,
      emoji: emojiInput,
    };
    const updated = [...relTypes, newType];
    onUpdate(updated);
    setLabelInput("");
    setColorIdx((c) => c + 1);
    setColorInput(REL_COLORS[(colorIdx + 1) % REL_COLORS.length]);
    setEmojiInput("🔗");
  };

  const removeType = (id) => {
    onUpdate(relTypes.filter((r) => r.id !== id));
  };

  return (
      <div className="panel">
        <div className="rel-type-form">
          <div className="rel-type-row">
            <input className="input emoji-input" value={emojiInput}
                   onChange={(e) => setEmojiInput(e.target.value)} maxLength={2} placeholder="🔗" />
            <input className="input" placeholder="Nom du type..." style={{ flex: 1 }}
                   value={labelInput} onChange={(e) => setLabelInput(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && addType()} />
            <input type="color" className="color-picker" value={colorInput}
                   onChange={(e) => setColorInput(e.target.value)} title="Couleur" />
            <button className="btn-add" onClick={addType}>＋</button>
          </div>
          <div className="emoji-grid">
            {COMMON_EMOJIS.map((em) => (
                <button key={em} className={`emoji-btn ${emojiInput === em ? "active" : ""}`}
                        onClick={() => setEmojiInput(em)}>{em}</button>
            ))}
          </div>
        </div>

        <ul className="list">
          {relTypes.length === 0 && <li className="empty">Aucun type de relation</li>}
          {relTypes.map((r) => (
              <li key={r.id} className="list-item">
                <span className="rel-type-dot" style={{ background: r.color }}>{r.emoji}</span>
                <span className="item-name" style={{ color: r.color }}>{r.label}</span>
                <button className="btn-remove" onClick={() => removeType(r.id)}>✕</button>
              </li>
          ))}
        </ul>
      </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────

export default function App() {
  const [auth, setAuth]         = useState(() => localStorage.getItem(AUTH_KEY) === "1");
  const [nodes, setNodes]       = useState(() => loadFromStorage().nodes);
  const [edges, setEdges]       = useState(() => loadFromStorage().edges);
  const [relTypes, setRelTypes] = useState(() => loadRelTypes());
  const [nameInput, setNameInput] = useState("");
  const [relFrom, setRelFrom]   = useState("");
  const [relTo, setRelTo]       = useState("");
  const [relType, setRelType]   = useState(() => loadRelTypes()[0]?.id || "");
  const [colorIdx, setColorIdx] = useState(() => loadFromStorage().nodes.length);
  const [tab, setTab]           = useState("persons");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const save = useCallback((n, e) => saveToStorage(n, e), []);

  // S'assurer que relType est valide quand relTypes change
  useEffect(() => {
    if (!relTypes.find((r) => r.id === relType)) {
      setRelType(relTypes[0]?.id || "");
    }
  }, [relTypes]);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuth(false);
  };

  const handleRelTypesUpdate = (updated) => {
    setRelTypes(updated);
    saveRelTypes(updated);
  };

  const addNode = () => {
    const name = nameInput.trim();
    if (!name || nodes.find((n) => n.name.toLowerCase() === name.toLowerCase())) return;
    const newNode = { id: crypto.randomUUID(), name, color: COLORS[colorIdx % COLORS.length] };
    const newNodes = [...nodes, newNode];
    setNodes(newNodes); setColorIdx((c) => c + 1); setNameInput("");
    save(newNodes, edges);
  };

  const removeNode = (id) => {
    const newNodes = nodes.filter((n) => n.id !== id);
    const newEdges = edges.filter((e) => e.from !== id && e.to !== id);
    setNodes(newNodes); setEdges(newEdges); save(newNodes, newEdges);
  };

  const addEdge = () => {
    if (!relFrom || !relTo || relFrom === relTo || !relType) return;
    const duplicate = edges.find(
        (e) => e.type === relType &&
            ((e.from === relFrom && e.to === relTo) || (e.from === relTo && e.to === relFrom))
    );
    if (duplicate) return;
    const newEdges = [...edges, { from: relFrom, to: relTo, type: relType }];
    setEdges(newEdges); setRelFrom(""); setRelTo("");
    save(nodes, newEdges);
  };

  const removeEdge = (i) => {
    const newEdges = edges.filter((_, idx) => idx !== i);
    setEdges(newEdges); save(nodes, newEdges);
  };

  const getName = (id) => nodes.find((n) => n.id === id)?.name || "?";

  if (!auth) return <LoginScreen onLogin={() => setAuth(true)} />;

  return (
      <div className="app">
        <header className="header">
          <div className="header-inner">
            <span className="logo">◈ RelGraph</span>
            <p className="tagline">Visualisez vos liens humains</p>
          </div>
          <div className="header-right">
            <button className="btn-sidebar-toggle" onClick={() => setSidebarOpen((o) => !o)} title={sidebarOpen ? "Réduire le panneau" : "Ouvrir le panneau"}>
              {sidebarOpen ? "◀" : "▶"}
            </button>
            <span className="save-status save-status--saved">💾 Sauvegarde auto</span>
            <button className="btn-logout" onClick={handleLogout}>⎋ Déconnexion</button>
          </div>
        </header>

        <main className="main">
          <aside className={`sidebar ${sidebarOpen ? "" : "sidebar--closed"}`}>
            <div className="tabs">
              <button className={`tab ${tab === "persons" ? "active" : ""}`} onClick={() => setTab("persons")}>
                👤 Personnes
              </button>
              <button className={`tab ${tab === "relations" ? "active" : ""}`} onClick={() => setTab("relations")}>
                🔗 Liens
              </button>
              <button className={`tab ${tab === "types" ? "active" : ""}`} onClick={() => setTab("types")}>
                ✦ Types
              </button>
            </div>

            {tab === "persons" && (
                <div className="panel">
                  <div className="field-group">
                    <input className="input" placeholder="Prénom..."
                           value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                           onKeyDown={(e) => e.key === "Enter" && addNode()} />
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
                  {relTypes.length === 0 ? (
                      <p className="empty" style={{ padding: "12px 0" }}>
                        Crée d'abord un type de relation dans l'onglet ✦ Types
                      </p>
                  ) : (
                      <div className="relation-form">
                        <select className="select" value={relFrom} onChange={(e) => setRelFrom(e.target.value)}>
                          <option value="">Personne A</option>
                          {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                        </select>
                        <select className="select" value={relType} onChange={(e) => setRelType(e.target.value)}>
                          {relTypes.map((r) => (
                              <option key={r.id} value={r.id}>{r.emoji} {r.label}</option>
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
                  )}
                  <ul className="list">
                    {edges.length === 0 && <li className="empty">Aucune relation définie</li>}
                    {edges.map((e, i) => {
                      const cfg = getRelationConfig(e.type, relTypes);
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

            {tab === "types" && (
                <RelTypesPanel relTypes={relTypes} onUpdate={handleRelTypesUpdate} />
            )}
          </aside>

          <section className="canvas-area">
            <button
                className="btn-fab"
                onClick={() => setSidebarOpen((o) => !o)}
                title={sidebarOpen ? "Masquer" : "Afficher le panneau"}
            >
              {sidebarOpen ? "✕" : "☰"}
            </button>
            {nodes.length === 0 ? (
                <div className="empty-graph">
                  <div className="empty-icon">◈</div>
                  <p>Ajoutez des personnes pour voir le graphe</p>
                </div>
            ) : (
                <GraphCanvas nodes={nodes} edges={edges} relTypes={relTypes} />
            )}
          </section>
        </main>
      </div>
  );
}
