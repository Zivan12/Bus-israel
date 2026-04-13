const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_API = process.env.BUS_API_BASE || 'https://open-bus-stride-api.hasadna.org.il';

app.use(express.static(path.join(__dirname, 'public')));

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { 'accept': 'application/json' }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upstream ${response.status}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

app.get('/api/agencies', async (req, res) => {
  try {
    const data = await fetchJson(`${BASE_API}/gtfs_agencies/list`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Не удалось загрузить список компаний', details: err.message });
  }
});

app.get('/api/buses', async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.limit) params.set('limit', req.query.limit);
    if (req.query.route) params.set('route_short_name', req.query.route);
    if (req.query.agency) params.set('agency_name', req.query.agency);
    if (req.query.city) params.set('city', req.query.city);

    const qs = params.toString();
    const url = `${BASE_API}/siri_vehicle_locations/list${qs ? '?' + qs : ''}`;
    const data = await fetchJson(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Не удалось загрузить автобусы', details: err.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Bus Israel app started on port ${PORT}`);
});