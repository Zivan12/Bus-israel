# Автобусы Израиля — версия с сервером

Это полноценная версия сайта с **Node.js‑сервером‑прокси**. Она нужна, потому что прямой запрос из браузера к Open Bus Stride часто упирается в CORS.

## Что внутри

- `public/index.html` — сам сайт
- `server.js` — прокси к Open Bus Stride API
- `package.json` — зависимости Node.js
- `render.yaml` — готово для Render

## Локальный запуск

```bash
npm install
npm start
```

Открыть:

```text
http://localhost:3000
```

## Бесплатный деплой на Render

1. Создай репозиторий на GitHub и загрузи туда эту папку целиком.
2. Зайди на Render и создай **Web Service** из этого репозитория.
3. Render сам увидит `render.yaml`.
4. После деплоя открой ссылку `onrender.com`.

## Переменные окружения

Обычно ничего менять не нужно.

- `PORT` — порт сервера
- `UPSTREAM_BASE` — базовый адрес upstream API
- `REQUEST_TIMEOUT_MS` — таймаут запросов

## Важно

Эта версия зависит от доступности `open-bus-stride-api.hasadna.org.il`. Если сам upstream недоступен, сайт тоже не сможет показать автобусы.
