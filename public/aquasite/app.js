/* global L */
const API = window.AQUASITE_API;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const state = { species: [], pin: null, last: null, stationLayer: null, siteLayer: null, ownerKey: '' };

// ---------- API ----------
async function api(path, options = {}) {
  const headers = { 'content-type': 'application/json' };
  if (state.ownerKey) headers['x-admin-key'] = state.ownerKey;
  let res;
  try {
    res = await fetch(`${API}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Can't reach the AquaSite API at ${API}.`);
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

function setStatus(text) { $('status').textContent = text; }

// ---------- Map ----------
const map = L.map('map', { zoomControl: true, worldCopyJump: true }).setView([47.6, -122.6], 8);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 13, attribution: 'Tiles © Esri — GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, Esri',
}).addTo(map);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 13,
}).addTo(map);
state.stationLayer = L.layerGroup().addTo(map);
state.siteLayer = L.layerGroup().addTo(map);

const pinIcon = L.divIcon({
  className: '',
  html: `<svg width="28" height="36" viewBox="0 0 28 36" aria-hidden="true"><path d="M14 35s12-12.3 12-21A12 12 0 0 0 2 14c0 8.7 12 21 12 21z" fill="${css('--coral')}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14" r="4.5" fill="#fff"/></svg>`,
  iconSize: [28, 36], iconAnchor: [14, 35],
});
const stationIcon = L.divIcon({ className: 'station-icon', iconSize: [12, 12] });

map.on('click', (e) => runAssessment(e.latlng.lat, e.latlng.lng));

// ---------- Species ----------
async function loadSpecies() {
  state.species = await api('/api/species');
  $('species').innerHTML = state.species.map((s) => `<option value="${esc(s.slug)}">${esc(s.common_name)} · ${esc(s.scientific_name)}</option>`).join('');
  const saved = sessionStorageGet('aquasite-species');
  if (saved && state.species.some((s) => s.slug === saved)) $('species').value = saved;
  showSpeciesNotes();
}
function showSpeciesNotes() {
  const s = state.species.find((x) => x.slug === $('species').value);
  $('species-notes').textContent = s?.notes ?? '';
}
$('species').addEventListener('change', () => {
  sessionStorageSet('aquasite-species', $('species').value);
  showSpeciesNotes();
  if (state.pin) runAssessment(state.pin.lat, state.pin.lng);
});

// ---------- Assessment ----------
let requestSeq = 0;
async function runAssessment(lat, lon) {
  const seq = ++requestSeq;
  state.pin?.remove?.();
  state.pin = L.marker([lat, lon], { icon: pinIcon, keyboard: false }).addTo(map);
  state.pin.lat = lat; state.pin.lng = lon;
  state.stationLayer.clearLayers();
  $('result').innerHTML = '<div class="loading" aria-label="Loading"><i></i><i></i><i></i><i></i></div>';
  setStatus('Gathering ocean data…');
  try {
    const r = await api('/api/assess', { method: 'POST', body: JSON.stringify({ lat, lon, species: $('species').value }) });
    if (seq !== requestSeq) return; // a newer click won
    state.last = r;
    renderResult(r);
    drawStations(r.conditions);
    setStatus(`${lat.toFixed(3)}, ${lon.toFixed(3)}`);
  } catch (err) {
    if (seq !== requestSeq) return;
    $('result').innerHTML = `<p class="error">${esc(err.message)}</p>`;
    setStatus('');
  }
}

function scoreColor(score) {
  if (score >= 80) return css('--kelp');
  if (score >= 60) return css('--sea');
  if (score >= 40) return css('--sand');
  return css('--coral');
}

function ring(score) {
  const r = 40; const c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 92 92" role="img" aria-label="Score ${score} out of 100">
    <circle class="track" cx="46" cy="46" r="${r}" fill="none" stroke-width="8"/>
    <circle class="value" cx="46" cy="46" r="${r}" fill="none" stroke-width="8" stroke-linecap="round"
      stroke="${scoreColor(score)}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - score / 100)}" transform="rotate(-90 46 46)"/>
    <text x="46" y="54" text-anchor="middle">${score}</text></svg>`;
}

function renderResult(r) {
  const c = r.conditions;
  const factors = r.factors.map((f) => {
    const has = f.score != null;
    const pct = has ? Math.round(f.score * 100) : 0;
    return `<li class="factor ${has ? '' : 'no-data'}">
      <div class="factor-top"><strong>${esc(f.label)}</strong><span>${f.value != null ? `${f.value} ${esc(f.unit)}` : 'no data'}</span></div>
      <div class="bar"><i style="width:${pct}%;background:${scoreColor(pct)}"></i></div>
      <small>${esc(f.target)}${f.source ? ` · ${esc(f.source)}` : ''}</small>
    </li>`;
  }).join('');

  const flags = r.flags.length ? `<div class="flags"><ul>${r.flags.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>` : '';

  const rows = [];
  if (c.depth) rows.push(['Elevation', `${c.depth.elevationM} m`]);
  if (c.sst) rows.push(['Satellite SST', `${c.sst.value} °C · ${shortDate(c.sst.time)}`]);
  if (c.waterTemp) rows.push([`Gauge temp · ${c.waterTemp.station.name}`, `${c.waterTemp.value} °C · ${c.waterTemp.station.distanceKm} km`]);
  if (c.chlorophyll) rows.push(['Chlorophyll-a', `${c.chlorophyll.value} mg/m³ · ${shortDate(c.chlorophyll.time)}`]);
  if (c.tides) rows.push([`Tidal range · ${c.tides.station.name}`, `${c.tides.rangeM} m · ${c.tides.station.distanceKm} km`]);
  if (c.currents) rows.push([`Currents · ${c.currents.station.name}`, `${c.currents.peakCmS} cm/s peak · ${c.currents.station.distanceKm} km`]);

  const tides = c.tides?.events?.slice(0, 4).map((e) => `<tr><td>${e.type === 'high' ? 'High' : 'Low'} · ${esc(e.time)} UTC</td><td>${e.height} m</td></tr>`).join('') ?? '';
  const missing = c.unavailable.length
    ? `<p class="unavailable">Unavailable: ${c.unavailable.map((u) => `${esc(u.source)} (${esc(u.reason)})`).join('; ')}</p>` : '';

  $('result').innerHTML = `
    <div class="score-head">${ring(r.score)}
      <div><p class="grade">${esc(r.grade)}</p>
      <p class="meta">${esc(r.species.commonName)} · ${Math.round(r.confidence * 100)}% of factors had data</p></div>
    </div>
    <ul class="factors">${factors}</ul>
    ${flags}
    <div class="details">
      <h3>Readings</h3><table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
      ${tides ? `<h3>Next tides</h3><table>${tides}</table>` : ''}
      ${missing}
    </div>
    ${state.ownerKey ? '<div class="actions"><button class="btn primary" id="save-site">Save site</button></div>' : ''}`;
  $('save-site')?.addEventListener('click', saveSite);
}

const shortDate = (t) => (t ? String(t).slice(0, 10) : '');

function drawStations(c) {
  const lines = css('--sea');
  for (const key of ['waterTemp', 'tides', 'currents']) {
    const s = c[key]?.station;
    if (!s) continue;
    L.polyline([[c.location.lat, c.location.lon], [s.lat, s.lon]], { color: lines, weight: 1.5, dashArray: '4 4', opacity: 0.7 }).addTo(state.stationLayer);
    L.marker([s.lat, s.lon], { icon: stationIcon })
      .bindTooltip(`${esc(s.name)} (${esc(s.id)}) · ${s.distanceKm} km`)
      .addTo(state.stationLayer);
  }
}

// ---------- Search ----------
$('search').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('q').value.trim();
  const list = $('search-results');
  if (q.length < 2) return;
  list.hidden = false;
  list.innerHTML = '<li class="muted" style="padding:8px 11px">Searching…</li>';
  try {
    const results = await api(`/api/geocode?q=${encodeURIComponent(q)}`);
    list.innerHTML = results.length
      ? results.map((r, i) => `<li><button type="button" data-i="${i}">${esc(r.name)}</button></li>`).join('')
      : '<li class="muted" style="padding:8px 11px">No matches.</li>';
    list.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const r = results[Number(b.dataset.i)];
      map.setView([r.lat, r.lon], 11);
      list.hidden = true;
    }));
  } catch (err) {
    list.innerHTML = `<li class="error" style="padding:8px 11px">${esc(err.message)}</li>`;
  }
});

// ---------- Saved sites ----------
async function loadSites() {
  const sites = await api('/api/sites');
  state.siteLayer.clearLayers();
  $('sites').innerHTML = sites.length ? sites.map((s, i) => `
    <li><button type="button" data-i="${i}">
      <span>${esc(s.name)}<small>${esc(s.species_name)}</small></span>
      <b>${s.score ?? '–'}</b>
    </button></li>`).join('') : '<li class="muted">None yet.</li>';
  $('sites').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    const s = sites[Number(b.dataset.i)];
    $('species').value = s.species_slug; showSpeciesNotes();
    map.setView([s.lat, s.lon], 11);
    runAssessment(s.lat, s.lon);
  }));
  for (const s of sites) {
    L.circleMarker([s.lat, s.lon], { radius: 6, color: '#fff', weight: 2, fillColor: scoreColor(s.score ?? 0), fillOpacity: 1 })
      .bindTooltip(`${esc(s.name)} · ${s.score ?? '–'}`).addTo(state.siteLayer);
  }
}

async function saveSite() {
  const r = state.last;
  const name = prompt('Name this site');
  if (!r || !name) return;
  try {
    await api('/api/sites', { method: 'POST', body: JSON.stringify({ name, lat: r.conditions.location.lat, lon: r.conditions.location.lon, species: r.species.slug }) });
    await loadSites();
    setStatus('Site saved');
  } catch (err) { alert(err.message); }
}

// Owner mode: visit /aquasite/?owner to enter the admin key (kept for this tab only).
if (new URLSearchParams(location.search).has('owner')) {
  $('owner').hidden = false;
  state.ownerKey = sessionStorageGet('aquasite-owner') ?? '';
  $('owner-key').value = state.ownerKey;
  $('owner-key').addEventListener('change', (e) => {
    state.ownerKey = e.target.value.trim();
    sessionStorageSet('aquasite-owner', state.ownerKey);
    if (state.last) renderResult(state.last);
  });
}

function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch { /* storage unavailable */ } }

// ---------- Boot ----------
(async () => {
  setStatus('Connecting…');
  try {
    await Promise.all([loadSpecies(), loadSites()]);
    setStatus('Click the water to assess');
  } catch (err) {
    setStatus('');
    $('result').innerHTML = `<p class="error">${esc(err.message)}</p><p class="muted">If you're running locally, start the API with <code>npm run dev</code> in <code>server/</code>.</p>`;
  }
})();
