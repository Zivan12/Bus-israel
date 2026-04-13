
import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const UPSTREAM_BASE = process.env.UPSTREAM_BASE || 'https://open-bus-stride-api.hasadna.org.il';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 15000);
const AGENCIES_TTL_MS = Number(process.env.AGENCIES_TTL_MS || 12 * 60 * 60 * 1000);

let agenciesCache = { ts: 0, data: null };

app.disable('x-powered-by');
app.use(compression());
app.use(morgan('tiny'));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '5m',
  extensions: ['html'],
}));

function buildUrl(base, params = {}) {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  return url;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'israel-bus-live-proxy/1.0'
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const err = new Error(`Upstream HTTP ${response.status}`);
      err.status = response.status;
      err.body = body.slice(0, 500);
      throw err;
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function pickRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

app.get('/api/health', async (_req, res) => {
  res.json({ ok: true, upstream: UPSTREAM_BASE, now: new Date().toISOString() });
});

app.get('/api/agencies', async (_req, res, next) => {
  try {
    const now = Date.now();
    if (agenciesCache.data && now - agenciesCache.ts < AGENCIES_TTL_MS) {
      return res.json(agenciesCache.data);
    }
    const url = buildUrl(`${UPSTREAM_BASE}/gtfs_agencies/list`, { get_count: 'false' });
    const data = await fetchJson(url);
    agenciesCache = { ts: now, data };
    res.set('Cache-Control', 'public, max-age=300');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

app.get('/api/vehicles', async (req, res, next) => {
  try {
    const now = new Date();
    const recordedAt = req.query.recorded_at_time_from || new Date(now.getTime() - 3 * 60 * 1000).toISOString();
    const limit = Math.min(Math.max(Number(req.query.limit || 150), 1), 800);

    const upstreamParams = {
      get_count: 'false',
      limit,
      recorded_at_time_from: recordedAt,
      recorded_at_time_to: req.query.recorded_at_time_to || '',
      siri_routes__line_ref: req.query.siri_routes__line_ref || req.query.line_ref || '',
      siri_routes__operator_ref: req.query.siri_routes__operator_ref || req.query.operator_ref || '',
      lon_from: req.query.lon_from || '',
      lon_to: req.query.lon_to || '',
      lat_from: req.query.lat_from || '',
      lat_to: req.query.lat_to || '',
      order_by: req.query.order_by || 'id desc',
    };

    const url = buildUrl(`${UPSTREAM_BASE}/siri_vehicle_locations/list`, upstreamParams);
    const data = await fetchJson(url);
    res.set('Cache-Control', 'no-store');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, _req, res, _next) => {
  const status = Number(err.status || 502);
  res.status(status).json({
    ok: false,
    error: err.message || 'Proxy error',
    upstream: UPSTREAM_BASE,
    details: err.body || null,
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Israel bus live proxy running on http://${HOST}:${PORT}`);
});
