/**
 * Servidor local: serve o site e grava novas fotos em magens/ + manifest.json
 * Uso: node server.js
 * Depois abra http://localhost:3789/ (ou o IP do PC na mesma rede, no celular).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const MAGENS = path.join(ROOT, "magens");
const PORT = Number(process.env.PORT) || 3789;
const MAX_BODY = 15 * 1024 * 1024;
/** Se você definir no PC (ex.: PowerShell: $env:ALBUM_SECRET='...'; node server.js), o site exige a mesma chave pra gravar/apagar. */
const REQUIRED_SECRET = (process.env.ALBUM_SECRET || "").trim();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function ensureMagens() {
  if (!fs.existsSync(MAGENS)) fs.mkdirSync(MAGENS, { recursive: true });
  const manifestPath = path.join(MAGENS, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, "[]\n", "utf8");
  }
}

function readManifest() {
  const manifestPath = path.join(MAGENS, "manifest.json");
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeManifest(arr) {
  const manifestPath = path.join(MAGENS, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(arr, null, 2) + "\n", "utf8");
}

function collectBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("PAYLOAD_TOO_LARGE"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function corsJsonHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Album-Secret, Authorization",
  };
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  const headers = Object.assign(
    {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
    },
    corsJsonHeaders()
  );
  res.writeHead(status, headers);
  res.end(body);
}

function albumAuthOk(req) {
  if (!REQUIRED_SECRET) return true;
  const header = (req.headers["x-album-secret"] || "").trim();
  const auth = String(req.headers["authorization"] || "");
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const got = header || bearer;
  return got === REQUIRED_SECRET;
}

function rejectAlbumAuth(res) {
  sendJson(res, 401, {
    ok: false,
    error:
      "Chave inválida ou em falta. No PC define ALBUM_SECRET e aqui no site usa a mesma chave no campo «Chave do servidor».",
  });
}

function safeBasename(f) {
  return path.basename(String(f || "").replace(/\\/g, "/")).replace(/[^a-zA-Z0-9._-]/g, "");
}

function extFromMime(m) {
  const x = (m || "").toLowerCase();
  if (x === "jpeg" || x === "jpg") return "jpg";
  if (x === "png") return "png";
  if (x === "webp") return "webp";
  return "jpg";
}

function handleSaveAlbum(req, res) {
  if (!albumAuthOk(req)) {
    rejectAlbumAuth(res);
    return;
  }
  collectBody(req, MAX_BODY)
    .then((buf) => {
      let body;
      try {
        body = JSON.parse(buf.toString("utf8"));
      } catch {
        sendJson(res, 400, { ok: false, error: "JSON inválido." });
        return;
      }
      const title = String(body.title || "").trim().slice(0, 200);
      const description = String(body.description || "").trim().slice(0, 5000);
      const date = String(body.date || "").trim().slice(0, 32);
      const location = String(body.location || "").trim().slice(0, 300);
      const imageDataUrl = String(body.imageDataUrl || "").trim();

      if (!title) {
        sendJson(res, 400, { ok: false, error: "Falta o título." });
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        sendJson(res, 400, { ok: false, error: "Data inválida (usa AAAA-MM-DD)." });
        return;
      }
      const m = imageDataUrl.match(/^data:image\/(\w+);base64,([\s\S]+)$/i);
      if (!m) {
        sendJson(res, 400, { ok: false, error: "Imagem em base64 inválida." });
        return;
      }
      let bufImg;
      try {
        bufImg = Buffer.from(m[2], "base64");
      } catch {
        sendJson(res, 400, { ok: false, error: "Base64 da imagem inválido." });
        return;
      }
      if (!bufImg.length || bufImg.length > 12 * 1024 * 1024) {
        sendJson(res, 400, { ok: false, error: "Imagem demasiado grande." });
        return;
      }

      const id = crypto.randomUUID();
      const ext = extFromMime(m[1]);
      const fileName = `${id}.${ext}`;
      const fullPath = path.join(MAGENS, fileName);

      const entry = {
        id,
        file: fileName,
        title,
        description,
        date,
        location,
      };

      const manifest = readManifest();
      manifest.push(entry);

      try {
        fs.writeFileSync(fullPath, bufImg);
        writeManifest(manifest);
      } catch (e) {
        try {
          fs.unlinkSync(fullPath);
        } catch (_) {}
        sendJson(res, 500, { ok: false, error: "Não foi possível gravar no disco." });
        return;
      }

      sendJson(res, 200, { ok: true, entry });
    })
    .catch((e) => {
      if (e && e.message === "PAYLOAD_TOO_LARGE") {
        sendJson(res, 413, { ok: false, error: "Pedido demasiado grande." });
        return;
      }
      sendJson(res, 500, { ok: false, error: "Erro ao ler o pedido." });
    });
}

function handleRemoveAlbum(req, res) {
  if (!albumAuthOk(req)) {
    rejectAlbumAuth(res);
    return;
  }
  collectBody(req, 65536)
    .then((buf) => {
      let body;
      try {
        body = JSON.parse(buf.toString("utf8"));
      } catch {
        sendJson(res, 400, { ok: false, error: "JSON inválido." });
        return;
      }
      const id = String(body.id || "").trim();
      if (!id) {
        sendJson(res, 400, { ok: false, error: "Falta o id." });
        return;
      }
      const manifest = readManifest();
      const idx = manifest.findIndex((x) => String(x.id) === id);
      if (idx === -1) {
        sendJson(res, 404, { ok: false, error: "Entrada não encontrada." });
        return;
      }
      const item = manifest[idx];
      const base = safeBasename(item.file);
      const fullPath = base ? path.join(MAGENS, base) : null;
      manifest.splice(idx, 1);
      try {
        writeManifest(manifest);
        if (fullPath && fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      } catch (e) {
        sendJson(res, 500, { ok: false, error: "Não foi possível apagar." });
        return;
      }
      sendJson(res, 200, { ok: true });
    })
    .catch(() => {
      sendJson(res, 500, { ok: false, error: "Erro ao ler o pedido." });
    });
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  const relative = path.normalize(urlPath.replace(/^\/+/, "")).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(ROOT, relative);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(filePath).pipe(res);
  });
}

ensureMagens();

const server = http.createServer((req, res) => {
  const u = (req.url || "").split("?")[0];

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Album-Secret, Authorization",
      "Access-Control-Max-Age": "86400",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && u === "/api/album-config") {
    sendJson(res, 200, {
      ok: true,
      needsSecret: !!REQUIRED_SECRET,
    });
    return;
  }

  if (req.method === "POST" && u === "/api/save-album") {
    handleSaveAlbum(req, res);
    return;
  }

  if (req.method === "POST" && u === "/api/remove-album") {
    handleRemoveAlbum(req, res);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, "0.0.0.0", () => {
  const sec = REQUIRED_SECRET ? "SIM (usa a mesma chave no site)" : "não (recomendado se expuseres na internet)";
  console.log(`
  Nosso tempo — servidor
  ----------------------
  Local:      http://localhost:${PORT}/
  Mesma Wi‑Fi: http://<IP-deste-PC>:${PORT}/
  ALBUM_SECRET: ${sec}

  Pasta das fotos: ${MAGENS}

  Fora de casa / outra rede: expõe esta porta com um túnel (ex.: ngrok ou
  «cloudflared tunnel --url http://localhost:${PORT}») e abre o HTTPS que te
  derem no celular. Veja REMOTO.txt na pasta do projeto.
`);
});
