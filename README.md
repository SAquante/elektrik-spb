# Вольта · электрик СПб

Лендинг частного электрика + Telegram-бот для заявок.

## Стек

- **Frontend:** HTML / CSS / GSAP + ScrollTrigger + Lenis (smooth scroll)
- **Backend:** Node.js 18+ / Express
- **Уведомления:** Telegram Bot API

## Быстрый старт

```bash
npm install
copy .env.example .env
# впишите TELEGRAM_BOT_TOKEN
npm start
```

Откройте http://localhost:3000

### Подключение Telegram

1. Откройте бота: https://t.me/ElectricFix_Bot
2. Отправьте `/start` — чат закрепится, chat_id сохранится
3. Заявки с формы будут приходить в этот чат

Команды бота:

| Команда | Описание |
|---------|----------|
| `/start` | Закрепить текущий чат для заявок |
| `/chatid` | Показать chat_id |
| `/help` | Справка |

## API

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/health` | Статус и готовность бота |
| `POST` | `/api/lead` | Заявка `{ name, phone, task, source? }` |

Ограничение: 8 заявок / 10 мин с IP.

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `TELEGRAM_BOT_TOKEN` | Токен бота |
| `TELEGRAM_CHAT_ID` | Опционально: если уже знаете chat_id |
| `PORT` | Порт сервера (по умолчанию 3000) |
| `SITE_URL` | Публичный URL (для ссылок в уведомлениях) |

## Деплой

Подойдёт любой VPS / Railway / Render / Fly.io:

```bash
npm ci
npm start
```

В продакшене задайте `SITE_URL=https://ваш-домен` и HTTPS на reverse-proxy (Caddy / nginx).

### GitHub Pages

Workflow `.github/workflows/pages.yml` публикует **только содержимое `public/`** (HTML/CSS/JS/assets) на GitHub Pages.

- Express (`server.js`), `package.json` и `.env` остаются в репозитории — Pages их не использует.
- **Заявки формы (`POST /api/lead`) и Telegram-бот работают только когда крутится Node** (VPS / Railway / Render). На чистом Pages API нет: форма показывает ошибку и предлагает написать в [Telegram](https://t.me/ElectricFix_Bot) или позвонить.
- Локально и на сервере: `npm install && npm start` — как раньше.

В Settings → Pages выберите Source: **GitHub Actions** (не branch `main` / root).

## Структура

```
public/                      статика (index, css, js, assets) — артефакт Pages
server.js                    Express + Telegram long-polling
.github/workflows/pages.yml  деплой только public/ на GitHub Pages
data/                        локальный chat_id (не в git)
```
