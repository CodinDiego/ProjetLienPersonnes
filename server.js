import express from "express";
import session from "express-session";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, "data.json");
const PASSWORD = process.env.APP_PASSWORD;

if (!PASSWORD) {
    console.error("❌  APP_PASSWORD manquant dans .env");
    process.exit(1);
}

// Créer data.json s'il n'existe pas
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ nodes: [], edges: [] }, null, 2));
}

app.use(express.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET || "relgraph-secret-key-change-me",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
        },
    })
);

// Middleware d'authentification
function requireAuth(req, res, next) {
    if (req.session?.authenticated) return next();
    res.status(401).json({ error: "Non authentifié" });
}

// ── Routes Auth ──────────────────────────────────────────────

// POST /api/login
app.post("/api/login", (req, res) => {
    const { password } = req.body;
    if (password === PASSWORD) {
        req.session.authenticated = true;
        return res.json({ ok: true });
    }
    res.status(401).json({ error: "Mot de passe incorrect" });
});

// POST /api/logout
app.post("/api/logout", (req, res) => {
    req.session.destroy();
    res.json({ ok: true });
});

// GET /api/me — vérifie si la session est active
app.get("/api/me", (req, res) => {
    res.json({ authenticated: !!req.session?.authenticated });
});

// ── Routes Data ──────────────────────────────────────────────

// GET /api/data
app.get("/api/data", requireAuth, (req, res) => {
    try {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        res.json(JSON.parse(raw));
    } catch {
        res.json({ nodes: [], edges: [] });
    }
});

// PUT /api/data
app.put("/api/data", requireAuth, (req, res) => {
    try {
        const { nodes, edges } = req.body;
        fs.writeFileSync(DATA_FILE, JSON.stringify({ nodes, edges }, null, 2));
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: "Erreur d'écriture" });
    }
});

// ── Servir le frontend en production ────────────────────────
const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
    });
}

app.listen(PORT, () => {
    console.log(`✅  RelGraph server → http://localhost:${PORT}`);
    console.log(`   Frontend Vite   → http://localhost:5173  (en dev)`);
});
