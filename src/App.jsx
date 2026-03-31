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

const STORAGE_KEY  = "relgraph_data";
const RELTYPES_KEY = "relgraph_reltypes";
const AUTH_KEY     = "relgraph_auth";
const PASSWORD     = import.meta.env.VITE_PASSWORD;

const BASE_RADIUS    = 28;
const CHAR_WIDTH     = 5.5;
const RADIUS_PADDING = 14;

// ─── Helpers ─────────────────────────────────────────────────

function nodeRadius(name) {
  return Math.max(BASE_RADIUS, name.length * CHAR_WIDTH / 2 + RADIUS_PADDING);
}
function getRelationConfig(type, relTypes) {
  return relTypes.find((r) => r.id === type) || { label: type, color: "#a78bfa", emoji: "🔗" };
}
function findFreePosition(existing, svgW = 800, svgH = 600) {
  const margin = 80;
  for (let t = 0; t < 300; t++) {
    const x = margin + Math.random() * (svgW - margin * 2);
    const y = margin + Math.random() * (svgH - margin * 2);
    const tooClose = existing.some((p) => Math.hypot(p.x - x, p.y - y) < 90);
    if (!tooClose) return { x, y };
  }
  return { x: margin + Math.random() * (svgW - margin * 2), y: margin + Math.random() * (svgH - margin * 2) };
}
function loadFromStorage() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : { nodes: [], edges: [] }; }
  catch { return { nodes: [], edges: [] }; }
}
function saveToStorage(nodes, edges) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
}
function loadRelTypes() {
  try { const r = localStorage.getItem(RELTYPES_KEY); return r ? JSON.parse(r) : DEFAULT_RELATION_TYPES; }
  catch { return DEFAULT_RELATION_TYPES; }
}
function saveRelTypes(types) { localStorage.setItem(RELTYPES_KEY, JSON.stringify(types)); }

function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

// ─── Login ────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const handleSubmit = () => {
    if (!password) return;
    if (password === PASSWORD) { localStorage.setItem(AUTH_KEY, "1"); onLogin(); }
    else setError("Mot de passe incorrect.");
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
// viewBox fixe 1600×1200 — le canvas est un "monde" plus grand que l'écran,
// navigable par pan (glisser le fond) + zoom (pinch ou molette).

const WORLD_W = 1600;
const WORLD_H = 1200;

function GraphCanvas({ nodes, edges, relTypes }) {
  const svgRef        = useRef(null);
  const [positions, setPositions] = useState({});

  // ── Drag nœud ──
  const [draggingNode, setDraggingNode] = useState(null);
  const [nodeOffset,   setNodeOffset]   = useState({ x: 0, y: 0 });

  // ── Pan / zoom ──
  const [pan,  setPan]  = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPanning       = useRef(false);
  const panStart        = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  // Pinch
  const lastPinch = useRef(null);

  const radii = Object.fromEntries(nodes.map((n) => [n.id, nodeRadius(n.name)]));

  // Placer les nouveaux nœuds dans le monde fixe
  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => { if (!nodes.find((n) => n.id === id)) delete next[id]; });
      nodes.forEach((n) => {
        if (!next[n.id]) {
          const existing = Object.values(next);
          next[n.id] = findFreePosition(existing, WORLD_W, WORLD_H);
        }
      });
      return next;
    });
  }, [nodes]);

  // ── Convertir coords écran → monde ──
  const screenToWorld = useCallback((clientX, clientY) => {
    const svg  = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const sx   = (clientX - rect.left) / zoom - pan.x / zoom;
    const sy   = (clientY - rect.top)  / zoom - pan.y / zoom;
    return { x: sx, y: sy };
  }, [zoom, pan]);

  // ── Molette → zoom ──
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(3, Math.max(0.3, z * factor)));
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Mouse pan (fond) ──
  const handleSVGMouseDown = useCallback((e) => {
    if (draggingNode) return;
    isPanning.current = true;
    panStart.current  = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  }, [draggingNode, pan]);

  const handleMouseMove = useCallback((e) => {
    if (draggingNode) {
      const w = screenToWorld(e.clientX, e.clientY);
      setPositions((prev) => ({ ...prev, [draggingNode]: { x: w.x - nodeOffset.x, y: w.y - nodeOffset.y } }));
    } else if (isPanning.current) {
      const dx = e.clientX - panStart.current.mx;
      const dy = e.clientY - panStart.current.my;
      setPan({ x: panStart.current.px + dx, y: panStart.current.py + dy });
    }
  }, [draggingNode, nodeOffset, screenToWorld]);

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
    isPanning.current = false;
  }, []);

  // ── Node mouse down ──
  const handleNodeMouseDown = useCallback((e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const w = screenToWorld(e.clientX, e.clientY);
    setDraggingNode(id);
    setNodeOffset({ x: w.x - (positions[id]?.x || 0), y: w.y - (positions[id]?.y || 0) });
  }, [positions, screenToWorld]);

  // ── Touch ──
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      // Pinch init
      lastPinch.current = {
        d: dist({ x: e.touches[0].clientX, y: e.touches[0].clientY },
            { x: e.touches[1].clientX, y: e.touches[1].clientY }),
        mid: midpoint({ x: e.touches[0].clientX, y: e.touches[0].clientY },
            { x: e.touches[1].clientX, y: e.touches[1].clientY }),
        zoom, pan: { ...pan },
      };
      setDraggingNode(null);
    } else if (e.touches.length === 1 && !draggingNode) {
      isPanning.current = true;
      panStart.current  = { mx: e.touches[0].clientX, my: e.touches[0].clientY, px: pan.x, py: pan.y };
    }
  }, [zoom, pan, draggingNode]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastPinch.current) {
      const t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const t1 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const newDist = dist(t0, t1);
      const scale   = newDist / lastPinch.current.d;
      const newZoom = Math.min(3, Math.max(0.3, lastPinch.current.zoom * scale));
      // Pan suivant le déplacement du centre du pinch
      const newMid = midpoint(t0, t1);
      const dx = newMid.x - lastPinch.current.mid.x;
      const dy = newMid.y - lastPinch.current.mid.y;
      setZoom(newZoom);
      setPan({ x: lastPinch.current.pan.x + dx, y: lastPinch.current.pan.y + dy });
    } else if (e.touches.length === 1) {
      if (draggingNode) {
        const w = screenToWorld(e.touches[0].clientX, e.touches[0].clientY);
        setPositions((prev) => ({ ...prev, [draggingNode]: { x: w.x - nodeOffset.x, y: w.y - nodeOffset.y } }));
      } else if (isPanning.current) {
        const dx = e.touches[0].clientX - panStart.current.mx;
        const dy = e.touches[0].clientY - panStart.current.my;
        setPan({ x: panStart.current.px + dx, y: panStart.current.py + dy });
      }
    }
  }, [draggingNode, nodeOffset, screenToWorld]);

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) lastPinch.current = null;
    if (e.touches.length === 0) { setDraggingNode(null); isPanning.current = false; }
  }, []);

  // ── Node touch start ──
  const handleNodeTouchStart = useCallback((e, id) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    isPanning.current = false;
    const w = screenToWorld(e.touches[0].clientX, e.touches[0].clientY);
    setDraggingNode(id);
    setNodeOffset({ x: w.x - (positions[id]?.x || 0), y: w.y - (positions[id]?.y || 0) });
  }, [positions, screenToWorld]);

  // Transform appliqué au groupe principal
  const transform = `translate(${pan.x} ${pan.y}) scale(${zoom})`;

  return (
      <svg
          ref={svgRef}
          className="graph-svg"
          style={{ touchAction: "none", cursor: isPanning.current ? "grabbing" : "grab" }}
          onMouseDown={handleSVGMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
      >
        <defs>
          {relTypes.map((r) => (
              <marker key={r.id} id={`arrow-${r.id}`} markerWidth="8" markerHeight="8" refX="20" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={r.color} opacity="0.7" />
              </marker>
          ))}
        </defs>

        {/* Tout le contenu est dans un groupe transformé pan+zoom */}
        <g transform={transform}>

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
                <g key={node.id}
                   transform={`translate(${pos.x},${pos.y})`}
                   onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                   onTouchStart={(e) => handleNodeTouchStart(e, node.id)}
                   style={{ cursor: draggingNode === node.id ? "grabbing" : "grab" }}>
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
        </g>

        {/* Indicateur de zoom */}
        <text x="12" y="20" fontSize="11" fill="rgba(255,255,255,0.3)"
              fontFamily="'DM Mono', monospace" style={{ pointerEvents: "none", userSelect: "none" }}>
          {Math.round(zoom * 100)}%
        </text>
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
    if (!label || relTypes.find((r) => r.label.toLowerCase() === label.toLowerCase())) return;
    onUpdate([...relTypes, { id: crypto.randomUUID(), label, color: colorInput, emoji: emojiInput }]);
    setLabelInput("");
    const next = (colorIdx + 1) % REL_COLORS.length;
    setColorIdx(next); setColorInput(REL_COLORS[next]); setEmojiInput("🔗");
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
            <button className="btn-add" onClick={addType}>＋</button>
          </div>
          <div className="color-palette">
            {REL_COLORS.map((c) => (
                <button key={c} className={`color-swatch ${colorInput === c ? "active" : ""}`}
                        style={{ background: c }} onClick={() => setColorInput(c)} title={c} />
            ))}
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
                <button className="btn-remove" onClick={() => onUpdate(relTypes.filter((x) => x.id !== r.id))}>✕</button>
              </li>
          ))}
        </ul>
      </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────

export default function App() {
  const [auth, setAuth]           = useState(() => localStorage.getItem(AUTH_KEY) === "1");
  const [nodes, setNodes]         = useState(() => loadFromStorage().nodes);
  const [edges, setEdges]         = useState(() => loadFromStorage().edges);
  const [relTypes, setRelTypes]   = useState(() => loadRelTypes());
  const [nameInput, setNameInput] = useState("");
  const [relFrom, setRelFrom]     = useState("");
  const [relTo, setRelTo]         = useState("");
  const [relType, setRelType]     = useState(() => loadRelTypes()[0]?.id || "");
  const [colorIdx, setColorIdx]   = useState(() => loadFromStorage().nodes.length);
  const [tab, setTab]             = useState("persons");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const save = useCallback((n, e) => saveToStorage(n, e), []);

  useEffect(() => {
    if (!relTypes.find((r) => r.id === relType)) setRelType(relTypes[0]?.id || "");
  }, [relTypes]);

  const handleLogout    = () => { localStorage.removeItem(AUTH_KEY); setAuth(false); };
  const handleRelUpdate = (updated) => { setRelTypes(updated); saveRelTypes(updated); };

  const addNode = () => {
    const name = nameInput.trim();
    if (!name || nodes.find((n) => n.name.toLowerCase() === name.toLowerCase())) return;
    const newNodes = [...nodes, { id: crypto.randomUUID(), name, color: COLORS[colorIdx % COLORS.length] }];
    setNodes(newNodes); setColorIdx((c) => c + 1); setNameInput("");
    save(newNodes, edges);
  };

  const removeNode = (id) => {
    const nn = nodes.filter((n) => n.id !== id);
    const ne = edges.filter((e) => e.from !== id && e.to !== id);
    setNodes(nn); setEdges(ne); save(nn, ne);
  };

  const addEdge = () => {
    if (!relFrom || !relTo || relFrom === relTo || !relType) return;
    if (edges.find((e) => e.type === relType &&
        ((e.from === relFrom && e.to === relTo) || (e.from === relTo && e.to === relFrom)))) return;
    const ne = [...edges, { from: relFrom, to: relTo, type: relType }];
    setEdges(ne); setRelFrom(""); setRelTo(""); save(nodes, ne);
  };

  const removeEdge = (i) => { const ne = edges.filter((_, j) => j !== i); setEdges(ne); save(nodes, ne); };
  const getName    = (id) => nodes.find((n) => n.id === id)?.name || "?";

  if (!auth) return <LoginScreen onLogin={() => setAuth(true)} />;

  return (
      <div className="app">
        <header className="header">
          <div className="header-inner">
            <span className="logo">◈ RelGraph</span>
            <p className="tagline">Visualisez vos liens humains</p>
          </div>
          <div className="header-right">
            <span className="save-status save-status--saved">💾 Sauvegarde auto</span>
            <button className="btn-toggle" onClick={() => setSidebarOpen((o) => !o)}
                    title={sidebarOpen ? "Plein écran" : "Afficher le panneau"}>
              {sidebarOpen ? "⛶" : "☰"}
            </button>
            <button className="btn-logout" onClick={handleLogout}>⎋</button>
          </div>
        </header>

        <main className="main">
          <aside className={`sidebar ${sidebarOpen ? "" : "sidebar--closed"}`}>
            <div className="tabs">
              <button className={`tab ${tab === "persons"   ? "active" : ""}`} onClick={() => setTab("persons")}>👤 Personnes</button>
              <button className={`tab ${tab === "relations" ? "active" : ""}`} onClick={() => setTab("relations")}>🔗 Liens</button>
              <button className={`tab ${tab === "types"     ? "active" : ""}`} onClick={() => setTab("types")}>✦ Types</button>
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
                      <p className="empty" style={{ padding: "12px 0" }}>Crée d'abord un type dans ✦ Types</p>
                  ) : (
                      <div className="relation-form">
                        <select className="select" value={relFrom} onChange={(e) => setRelFrom(e.target.value)}>
                          <option value="">Personne A</option>
                          {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                        </select>
                        <select className="select" value={relType} onChange={(e) => setRelType(e.target.value)}>
                          {relTypes.map((r) => <option key={r.id} value={r.id}>{r.emoji} {r.label}</option>)}
                        </select>
                        <select className="select" value={relTo} onChange={(e) => setRelTo(e.target.value)}>
                          <option value="">Personne B</option>
                          {nodes.filter((n) => n.id !== relFrom).map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
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

            {tab === "types" && <RelTypesPanel relTypes={relTypes} onUpdate={handleRelUpdate} />}
          </aside>

          <section className="canvas-area">
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
