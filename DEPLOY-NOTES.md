# DEPLOY-NOTES — распознавание v2 (коммит 63493e4)

## Что изменилось относительно статики (v1)

| | v1 (было) | v2 (стало) |
|---|-----------|------------|
| Вход | корневой `index.html` | Express `server.js` → раздаёт `public/` |
| Стили/скрипты | `styles.css`, `script.js` в корне | `public/css/main.css`, `public/js/main.js` |
| Заявки | без бэкенда (или mailto) | `POST /api/lead` → Telegram Bot API |
| Локальный запуск | любой static server | `npm start` (Node ≥18, порт 3000) |
| Версия | — | `package.json` → `2.0.0` |

Контакты: телефон **+7 903 419-16-92**, бот **https://t.me/li4niirobotbot_bot**.

## Файлы фронта (`public/`)

```
public/
  index.html        лендинг (относительные пути css/js/assets)
  css/main.css
  js/main.js        форма → fetch("/api/lead") + fallback
  assets/favicon.svg
  assets/og.svg
```

Это **полный** статический артефакт: его достаточно для GitHub Pages.

## Что требует Node

| Файл / сервис | Зачем |
|---------------|--------|
| `server.js` | Express, статика, `POST /api/lead`, rate-limit, helmet |
| Telegram long-polling | `/start` закрепляет admin chat_id; заявки → чат |
| `.env` | `TELEGRAM_BOT_TOKEN` (обязателен), `TELEGRAM_CHAT_ID`, `PORT`, `SITE_URL` |
| `data/` | очередь/лог заявок, chat_id (не в git) |

Без переменных окружения и токена бота `server.js` завершается с ошибкой.

## Почему чистый GitHub Pages не запускает Express

1. GitHub Pages — **только статический хостинг** (HTML/CSS/JS). Нет runtime для Node, нет process env, нет long-polling.
2. После v1 корневого `index.html` больше нет → Pages source `main /` отдаёт Jekyll-страницу из `README.md`.
3. `POST /api/lead` на Pages не существует: запрос уходит на `*.github.io/api/lead` и получает 404.

**Решение:** workflow `.github/workflows/pages.yml` публикует **только** `public/` как артефакт Pages; Express остаётся в репозитории и по-прежнему крутится локально/на VPS через `npm start`. Форма на Pages показывает ошибку с запасным путём (Telegram / tel), успешный путь через API не тронут.
