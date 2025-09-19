// === Konfig ===
const DATA_URL = './ai.json'; // bruker din datafil
const EL = sel => document.querySelector(sel);
const ELS = sel => Array.from(document.querySelectorAll(sel));

const state = {
  tools: [],
  categories: [],
  activeCategory: 'Alle',
  favOnly: false,
  freeOnly: false,
  trialOnly: false,
  favs: new Set(JSON.parse(localStorage.getItem('favs') || '[]')),
};

// Hindre overlapp bak sticky filter
function setHeaderOffset() {
  const h = (EL('#site-header')?.offsetHeight || 0) + (EL('#filters')?.offsetHeight || 0);
  document.documentElement.style.setProperty('--header-h', h + 'px');
}
window.addEventListener('load', setHeaderOffset);
window.addEventListener('resize', setHeaderOffset);
new ResizeObserver(setHeaderOffset).observe(document.body);

// Slug-helper
const toSlug = (s='') => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

// Normaliser ai.json til feltene UI forventer
function normalize(raw) {
  return raw.map((t) => {
    const id   = t.slug || toSlug(t.name || '');
    const pricingText = typeof t.pricing === 'string' ? t.pricing : (t.pricing?.label || '');
    const hasFree = /gratis/i.test(pricingText);
    // review/demo felt – details.html ser etter "review"
    const review = t.review || t.demo || t.test;

    return {
      ...t,
      id,
      slug: id,
      hasFree,
      pricing: typeof t.pricing === 'string' ? { label: t.pricing } : t.pricing,
      trial: t.trial,     // legg til i ai.json hvis ønskelig: { "available": true, "note": "7 dager" }
      review,
    };
  });
}

// Hent data
fetch(DATA_URL)
  .then(r => r.json())
  .then(data => {
    state.tools = normalize(data);
    state.categories = buildCategoryList(state.tools);
    renderCategoryChips();
    applyURLParams();
    render();
  })
  .catch(console.error);

// Kategorier
function buildCategoryList(data) {
  const set = new Set(data.map(x => x.category));
  return ['Alle', ...Array.from(set).sort((a,b)=>a.localeCompare(b,'no'))];
}

// Chips + toggles
function renderCategoryChips() {
  const wrap = EL('#categoryChips');
  wrap.innerHTML = '';
  state.categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (state.activeCategory === cat ? ' active' : '');
    chip.textContent = cat;
    chip.dataset.cat = cat;
    chip.addEventListener('click', () => {
      state.activeCategory = cat;
      setURLParams();
      render();
      ELS('.chip').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
    });
    wrap.appendChild(chip);
  });

  EL('#favOnly').checked = state.favOnly;
  EL('#freeOnly').checked = state.freeOnly;
  EL('#trialOnly').checked = state.trialOnly;

  EL('#favOnly').onchange  = e => { state.favOnly  = e.target.checked; setURLParams(); render(); };
  EL('#freeOnly').onchange  = e => { state.freeOnly = e.target.checked; setURLParams(); render(); };
  EL('#trialOnly').onchange = e => { state.trialOnly = e.target.checked; setURLParams(); render(); };
}

// Filtrering
function getFiltered() {
  return state.tools.filter(t => {
    if (state.activeCategory !== 'Alle' && t.category !== state.activeCategory) return false;
    if (state.favOnly && !state.favs.has(t.id)) return false;
    if (state.freeOnly && !t.hasFree) return false;
    if (state.trialOnly && !(t.trial && t.trial.available)) return false;
    return true;
  });
}

// Gruppér ved "Alle"
function groupByCategory(arr){
  const map = new Map();
  arr.forEach(t => {
    const k = t.category || 'Uten kategori';
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(t);
  });
  return map;
}

// Render
function render(){
  const container = EL('#results');
  container.innerHTML = '';

  const list = getFiltered();
  const groups = (state.activeCategory === 'Alle')
    ? groupByCategory(list)
    : new Map([[state.activeCategory, list]]);

  if (!list.length){
    container.innerHTML = `<div class="section"><em>Ingen treff med valgte filter.</em></div>`;
    return;
  }

  for (const [cat, items] of groups.entries()){
    const section = document.createElement('section');
    section.className = 'section';
    section.innerHTML = `
      <div class="section-head">
        <h2>${cat}</h2>
        <span class="count">${items.length}</span>
      </div>
      <div class="grid"></div>
    `;
    const grid = section.querySelector('.grid');
    items.forEach(tool => grid.appendChild(toolCard(tool)));
    container.appendChild(section);
  }
  setHeaderOffset();
}

// Kort
function toolCard(t){
  const card = document.createElement('article');
  card.className = 'card';
  const favActive = state.favs.has(t.id);

  const priceTag = typeof t.pricing === 'string'
    ? t.pricing
    : (t.pricing?.label || (t.hasFree ? 'Gratis' : '—'));

  const trial = t.trial?.available
    ? `<span class="tag ok">Gratis prøve${t.trial.note ? ' – ' + t.trial.note : ''}</span>`
    : `<span class="tag no">Ingen prøve</span>`;

  const freeTag = t.hasFree ? `<span class="tag ok">Gratis</span>` : '';

  const detailsURL = `details.html?tool=${encodeURIComponent(t.slug)}`;

  card.innerHTML = `
    <div class="top">
      <a href="${detailsURL}" class="title-link" style="color:inherit;text-decoration:none">
        <strong>${t.name}</strong>
      </a>
      <button class="fav ${favActive?'active':''}" title="Merk som favoritt" aria-label="Favoritt">⭐</button>
    </div>
    <div class="desc">${t.description || ''}</div>
    <div class="meta">
      <span class="badge">${priceTag}</span>
      ${trial}
      ${freeTag}
    </div>
    <div class="actions">
      <a class="btn" href="${detailsURL}">Detaljer</a>
      ${t.url    ? `<a class="btn primary" href="${t.url}"    target="_blank" rel="noopener">Åpne</a>` : ''}
      ${t.review ? `<a class="btn"         href="${t.review}" target="_blank" rel="noopener">Test</a>` : ''}
      ${t.more   ? `<a class="btn"         href="${t.more}"   target="_blank" rel="noopener">Mer</a>` : ''}
    </div>
  `;

  card.querySelector('.fav').addEventListener('click', () => {
    if (state.favs.has(t.id)) state.favs.delete(t.id);
    else state.favs.add(t.id);
    localStorage.setItem('favs', JSON.stringify(Array.from(state.favs)));
    render();
  });

  return card;
}

// URL-parametre for deling
function setURLParams(){
  const p = new URLSearchParams(location.search);
  p.set('cat', state.activeCategory);
  state.favOnly  ? p.set('fav','1')   : p.delete('fav');
  state.freeOnly ? p.set('free','1')  : p.delete('free');
  state.trialOnly? p.set('trial','1') : p.delete('trial');
  history.replaceState(null, '', `${location.pathname}?${p}`);
}
function applyURLParams(){
  const p = new URLSearchParams(location.search);
  const cat = p.get('cat');
  if (cat && state.categories.includes(cat)) state.activeCategory = cat;
  state.favOnly  = p.has('fav');
  state.freeOnly = p.has('free');
  state.trialOnly= p.has('trial');
}
