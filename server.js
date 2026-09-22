/**
 * Электрик · СПб — backend
 * - Статика из /public
 * - POST /api/lead → Telegram
 * - Long-polling бот: /start закрепляет admin chat_id
 */
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;
const DATA_DIR = path.join(__dirname, "data");
const ADMIN_FILE = path.join(DATA_DIR, "admin-chat.json");
const PENDING_FILE = path.join(DATA_DIR, "leads-pending.json");
const LOG_FILE = path.join(DATA_DIR, "leads.jsonl");

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN не задан в .env");
  process.exit(1);
}

const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;
const PHONE_RE = /^[\d\s()+\-]{10,20}$/;

function ensureData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function appendLeadLog(entry) {
  ensureData();
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
}

function loadPending() {
  ensureData();
  try {
    const raw = JSON.parse(fs.readFileSync(PENDING_FILE, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function savePending(items) {
  ensureData();
  fs.writeFileSync(PENDING_FILE, JSON.stringify(items, null, 2));
}

function enqueueLead(lead, id = crypto.randomBytes(4).toString("hex")) {
  const item = {
    id,
    at: new Date().toISOString(),
    lead,
    delivered: false,
  };
  const items = loadPending();
  items.push(item);
  // keep last 200 undelivered leads
  const undelivered = items.filter((x) => !x.delivered).slice(-200);
  savePending(undelivered);
  appendLeadLog({ ...item, event: "queued" });
  return id;
}

async function flushPending(chatId) {
  const items = loadPending();
  if (!items.length) return 0;
  let sent = 0;
  for (const item of items) {
    if (item.delivered) continue;
    try {
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: formatLeadMessage(item.lead) + `\n\n<i>Отложено до подключения чата</i>`,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
      item.delivered = true;
      sent += 1;
      appendLeadLog({ ...item, event: "flushed" });
    } catch (e) {
      console.error("flush lead:", e.message);
    }
  }
  savePending(items.filter((x) => !x.delivered));
  return sent;
}

function loadAdminChatId() {
  ensureData();
  if (process.env.TELEGRAM_CHAT_ID) return String(process.env.TELEGRAM_CHAT_ID);
  try {
    const raw = JSON.parse(fs.readFileSync(ADMIN_FILE, "utf8"));
    return raw?.chatId ? String(raw.chatId) : "";
  } catch {
    return "";
  }
}

function saveAdminChatId(chatId) {
  ensureData();
  fs.writeFileSync(ADMIN_FILE, JSON.stringify({ chatId: String(chatId), at: new Date().toISOString() }, null, 2));
}

async function tgApi(method, payload) {
  const res = await fetch(`${TG}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`${method}: ${data.description || res.status}`);
  }
  return data.result;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizePhone(phone) {
  return phone.replace(/[^\d+]/g, "");
}

function validateLead(body) {
  const errors = [];
  const name = String(body.name || "").trim().slice(0, 80);
  const phone = String(body.phone || "").trim().slice(0, 32);
  const task = String(body.task || "").trim().slice(0, 1500);
  const source = String(body.source || "site").trim().slice(0, 40);

  if (!name || name.length < 2) errors.push("Имя: минимум 2 символа");
  if (!phone || !PHONE_RE.test(phone)) errors.push("Телефон: неверный формат");
  if (!task || task.length < 5) errors.push("Задача: минимум 5 символов");
  if (task.length > 1500) errors.push("Задача: слишком длинно");

  return { errors, lead: { name, phone, task, source } };
}

function formatLeadMessage(lead) {
  const now = new Date();
  const time = now.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const wa = normalizePhone(lead.phone).replace(/^\+/, "");
  return (
    `<b>⚡ НОВАЯ ЗАЯВКА · Электрик СПб</b>\n\n` +
    `<b>Имя:</b> ${escapeHtml(lead.name)}\n` +
    `<b>Телефон:</b> ${escapeHtml(lead.phone)}\n` +
    `<b>WhatsApp:</b> https://wa.me/${escapeHtml(wa)}\n` +
    `<b>Задача:</b>\n${escapeHtml(lead.task)}\n\n` +
    `<b>Источник:</b> ${escapeHtml(lead.source)}\n` +
    `<b>Время:</b> ${time} (МСК)\n` +
    `<b>Сайт:</b> ${escapeHtml(SITE_URL)}`
  );
}

// --- Express ---
const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "https://cdn.jsdelivr.net"],
        "style-src": ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
        "frame-ancestors": ["'none'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "16kb" }));
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

const leadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Слишком много заявок. Попробуйте позже." },
});

app.get("/api/health", (_req, res) => {
  const chatId = loadAdminChatId();
  res.json({ ok: true, botReady: Boolean(chatId), site: SITE_URL });
});

app.post("/api/lead", leadLimiter, async (req, res) => {
  const { errors, lead } = validateLead(req.body || {});
  if (errors.length) {
    return res.status(400).json({ ok: false, error: errors.join(" · "), errors });
  }

  const chatId = loadAdminChatId();
  // Opaque id — клиент не получает PII повторно
  const id = crypto.randomBytes(4).toString("hex");

  if (!chatId) {
    // Приём без жёсткого отказа: заявка встанет в очередь до /start
    enqueueLead(lead, id);
    return res.json({ ok: true, id, queued: true });
  }

  try {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: formatLeadMessage(lead),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    appendLeadLog({ id, at: new Date().toISOString(), lead, event: "delivered" });
    // Досылаем всё, что копилось без чата
    await flushPending(chatId).catch(() => 0);
    return res.json({ ok: true, id });
  } catch (err) {
    console.error("Telegram error:", err.message);
    // Не теряем заявку: кладём в очередь, клиенту — успех
    enqueueLead(lead, id);
    return res.json({ ok: true, id, queued: true });
  }
});

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Telegram long-polling bot ---
let pollingOffset = 0;

async function handleUpdate(update) {
  const msg = update.message || update.edited_message;
  if (!msg || !msg.chat) return;

  const chatId = msg.chat.id;
  const text = String(msg.text || "").trim();
  const from = msg.from?.first_name || "друг";

  if (text === "/start" || text === "/start@ElectricFix_Bot") {
    saveAdminChatId(chatId);
    const flushed = await flushPending(chatId);
    await tgApi("sendMessage", {
      chat_id: chatId,
      text:
        `Привет, ${escapeHtml(from)}! 👋\n\n` +
        `Я принимаю заявки с сайта «Электрик · СПб».\n` +
        `Этот чат закреплён как <b>админский</b>.\n\n` +
        `<b>Chat ID:</b> <code>${chatId}</code>\n\n` +
        (flushed
          ? `Дослал отложенных заявок: <b>${flushed}</b>.\n`
          : "") +
        `Сюда будут приходить новые заявки с сайта.`,
      parse_mode: "HTML",
    });
    console.log(`📨 Chat ID сохранён: ${chatId}${flushed ? ` (flush ${flushed})` : ""}`);
    return;
  }

  if (text === "/chatid" || text === "/id") {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: `<b>Chat ID:</b> <code>${chatId}</code>`,
      parse_mode: "HTML",
    });
    return;
  }

  if (text === "/help") {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text:
        "<b>Команды</b>\n" +
        "/start — закрепить этот чат для заявок\n" +
        "/chatid — показать chat_id\n" +
        "/help — помощь\n\n" +
        "Просто держите бота в этом чате — заявки с сайта придут сюда.",
      parse_mode: "HTML",
    });
    return;
  }

  await tgApi("sendMessage", {
    chat_id: chatId,
    text: "Я бот заявок. Наберите /help",
    parse_mode: "HTML",
  });
}

async function pollLoop() {
  while (true) {
    try {
      const updates = await fetch(`${TG}/getUpdates?timeout=50&offset=${pollingOffset + 1}`);
      const data = await updates.json();
      if (!data.ok) {
        console.error("getUpdates:", data.description);
        await sleep(3000);
        continue;
      }
      for (const update of data.result || []) {
        pollingOffset = Math.max(pollingOffset, update.update_id);
        try {
          await handleUpdate(update);
        } catch (e) {
          console.error("update handler:", e.message);
        }
      }
    } catch (e) {
      console.error("poll error:", e.message);
      await sleep(3000);
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Start ---
async function main() {
  ensureData();
  try {
    const me = await tgApi("getMe", {});
    console.log(`🤖 Бот: @${me.username} (${me.first_name})`);
  } catch (e) {
    console.error("getMe failed:", e.message);
    process.exit(1);
  }

  const chatId = loadAdminChatId();
  if (chatId) {
    console.log(`📨 Заявки → chat_id ${chatId}`);
  } else {
    console.log("⚠️  Chat ID не сохранён. Напишите боту /start — он закрепит чат.");
    console.log("   https://t.me/ElectricFix_Bot");
  }

  app.listen(PORT, () => {
    console.log(`🚀 http://localhost:${PORT}`);
  });

  pollLoop();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
