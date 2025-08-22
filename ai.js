// Liste + filtre + favoritter + detaljside-link
const state = { data: [], q: "", pricing: "", sort: "name-asc", favsOnly: false, activeCat: "", platform: "", language: "" };
const categoryDescriptions = {
  "Tekst / Assistent":"Hjelpere til skriving, chat, research og idéarbeid.",
  "Tekst / Skriving":"For tekstforbedring, innholdsproduksjon og markedsføring.",
  "Bildegenerering":"Lag bilder, illustrasjoner og grafikk fra tekst.",
  "Video / Bilde":"Generer eller rediger video/bilde med AI.",
  "Oversettelse":"Verktøy for oversettelse av tekst og dokumenter.",
  "AI-musikk":"Komponer, miks eller forbedre lyd med AI.",
  "AI-stemmer":"Syntetiske stemmer, talegenerering og dubbing.",
};
const $ = (s, r=document)=>r.querySelector(s); const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const slug = s => (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const uniq = a => [...new Set(a)];
const loadFavs = () => JSON.parse(localStorage.getItem('ai:favs')||'[]'); const saveFavs=v=>localStorage.setItem('ai:favs',JSON.stringify(v));
document.addEventListener('DOMContentLoaded', init);

async function init(){
  bindControls();
  await loadData();
  restoreFromURL();
  buildCategoryChips(); buildPlatformLanguage();
  render();
}
async function loadData(){
  try{ const r = await fetch('ai.json',{cache:'no-store'}); state.data = await r.json(); }
  catch(e){ console.warn('ai.json feilet', e); state.data=[]; }
  state.data.forEach(t=>{ t.name=t.name||'Uten navn'; t.description=t.description||''; t.category=t.category||'Uten kategori'; t.pricing=normPrice(t.pricing); t.slug = t.slug || slug(t.name); t.logo=t.logo||''; t.platforms=Array.isArray(t.platforms)?t.platforms: (t.platforms?String(t.platforms).split(',').map(s=>s.trim()):[]); t.languages=Array.isArray(t.languages)?t.languages: (t.languages?String(t.languages).split(',').map(s=>s.trim()):[]); });
}
function normPrice(v){ if(!v) return 'Ukjent'; const p=(''+v).toLowerCase(); if(p.includes('gratis')&&p.includes('betalt')) return 'Gratis & Betalt'; if(p.includes('gratis')) return 'Gratis'; if(p.includes('betalt')) return 'Betalt'; return v; }
function bindControls(){ const f=$('#filters'); f.addEventListener('input',()=>{ state.q=$('#q').value.trim(); state.pricing=$('#pricing').value; state.sort=$('#sort').value; state.favsOnly=$('#favsOnly').checked; state.platform=$('#platform')?$('#platform').value:''; state.language=$('#language')?$('#language').value:''; updateURL(); render(); }); }
function buildCategoryChips(){
  const wrap=$('#catChips'); wrap.innerHTML='';
  const cats=uniq(state.data.map(t=>t.category)).sort((a,b)=>a.localeCompare(b,'nb'));
  const allBtn=document.createElement('button'); allBtn.textContent='Alle kategorier'; allBtn.setAttribute('aria-pressed', String(!state.activeCat));
  allBtn.addEventListener('click',()=>{state.activeCat=''; updateURL(); render(); setActiveChip();}); wrap.appendChild(allBtn);
  cats.forEach(c=>{ const b=document.createElement('button'); b.textContent=c; b.dataset.slug=slug(c); b.setAttribute('aria-pressed', String(state.activeCat===b.dataset.slug));
    b.addEventListener('click',()=>{ state.activeCat=(state.activeCat===b.dataset.slug)?'':b.dataset.slug; updateURL(); render(); setActiveChip(); $('#content').scrollIntoView({behavior:'smooth',block:'start'}); });
    wrap.appendChild(b);
  });
}
function setActiveChip(){ $$('#catChips button').forEach(btn=>{ const isAct=(!state.activeCat && btn.textContent==='Alle kategorier') || btn.dataset.slug===state.activeCat; btn.setAttribute('aria-pressed', String(isAct)); }); }
function render(){
  const favs = new Set(loadFavs()); const list=$('#list'); list.innerHTML='';
  let items=[...state.data];
  if(state.q){ const q=state.q.toLowerCase(); items=items.filter(t=>(t.name+' '+t.description+' '+t.category).toLowerCase().includes(q)); }
  if(state.pricing){ const p=state.pricing.toLowerCase(); items=items.filter(t=>t.pricing && t.pricing.toLowerCase().includes(p)); }
  if(state.favsOnly){ items=items.filter(t=>favs.has(t.name)); }
  if(state.platform){ const p=state.platform.toLowerCase(); items=items.filter(t=> (t.platforms||[]).some(x=>String(x).toLowerCase()===p)); }
  if(state.language){ const l=state.language.toLowerCase(); items=items.filter(t=> (t.languages||[]).some(x=>String(x).toLowerCase()===l)); }
  if(state.activeCat){ items=items.filter(t=>slug(t.category)===state.activeCat); }
  items.sort((a,b)=> state.sort==='name-asc'? a.name.localeCompare(b.name,'nb'): state.sort==='name-desc'? b.name.localeCompare(a.name,'nb'): (a.category.localeCompare(b.category,'nb')||a.name.localeCompare(b.name,'nb')) );
  const cats=uniq(items.map(t=>t.category)).sort((a,b)=>a.localeCompare(b,'nb'));
  const secTpl=$('#sectionTpl'); const cardTpl=$('#cardTpl');
  cats.forEach(cat=>{
    const section=secTpl.content.firstElementChild.cloneNode(true); section.dataset.cat=slug(cat);
    section.querySelector('.cat-title').textContent=cat; section.querySelector('.cat-desc').textContent=categoryDescriptions[cat]||'';
    const grid=section.querySelector('.grid'); const catItems=items.filter(t=>t.category===cat);
    section.querySelector('.cat-count').textContent = String(catItems.length);
    catItems.forEach(tool=>{
      const card=cardTpl.content.firstElementChild.cloneNode(true);
      card.dataset.name=tool.name; card.dataset.category=tool.category; card.dataset.pricing=tool.pricing||'';
      const nameEl = card.querySelector('.tool-name');
const logo = tool.logo;
if (logo) {
  nameEl.innerHTML = `<span class="tool-logo"><img src="${logo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px"></span> ${tool.name}`;
} else {
  const initials = tool.name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase();
  nameEl.innerHTML = `<span class=\"tool-logo\">${initials}</span> ${tool.name}`;
} card.querySelector('.tool-desc').textContent=tool.description||'';
      card.querySelector('.price').textContent=tool.pricing||'Ukjent';
      const link=card.querySelector('.link'); link.href=tool.url||'#'; link.textContent='Åpne';
      const review=card.querySelector('.review'); if(tool.review){ review.hidden=false; review.href=tool.review; }
      const favBtn=card.querySelector('.fav-btn'); const isFav=favs.has(tool.name);
      favBtn.setAttribute('aria-pressed', String(isFav)); favBtn.title=isFav?'Fjern fra favoritter':'Legg til i favoritter';
      favBtn.addEventListener('click',()=>{ const cur=new Set(loadFavs()); if(cur.has(tool.name)) cur.delete(tool.name); else cur.add(tool.name); saveFavs([...cur]); render(); });
      const detailA=card.querySelector('.detail-link');
      detailA.href = `details.html?tool=${encodeURIComponent(tool.slug)}`;
      detailA.textContent = 'Mer';
      grid.appendChild(card);
    });
    const headBtn=section.querySelector('.section-head');
    headBtn.addEventListener('click',()=>{ const exp=headBtn.getAttribute('aria-expanded')==='true'; headBtn.setAttribute('aria-expanded', String(!exp)); section.classList.toggle('collapsed', exp); });
    list.appendChild(section);
  });
  $('#resultsMeta').textContent = items.length ? `Viser ${items.length} verktøy${state.q?` for “${state.q}”`:''}${state.activeCat?` i ${cats.length} kategori(er)`:''}.` : 'Ingen treff – prøv å tømme noen filtre.';
}
function updateURL(){ const p=new URLSearchParams(); if(state.q) p.set('q',state.q); if(state.pricing) p.set('pricing',state.pricing); if(state.sort && state.sort!=='name-asc') p.set('sort',state.sort); if(state.favsOnly) p.set('favs','1'); if(state.platform) p.set('platform', state.platform); if(state.language) p.set('language', state.language); const hash=state.activeCat?`#cat=${state.activeCat}`:''; const qs=p.toString(); history.replaceState(null,'',(qs?`?${qs}`:location.pathname)+hash); }
function restoreFromURL(){ const p=new URLSearchParams(location.search); $('#q').value=state.q=p.get('q')||''; $('#pricing').value=state.pricing=p.get('pricing')||''; $('#sort').value=state.sort=p.get('sort')||'name-asc'; $('#favsOnly').checked=state.favsOnly=p.get('favs')==='1'; state.platform = p.get('platform')||''; state.language = p.get('language')||''; if(document.getElementById('platform')) document.getElementById('platform').value = state.platform; if(document.getElementById('language')) document.getElementById('language').value = state.language; const m=location.hash.match(/cat=([a-z0-9-]+)/); state.activeCat=m?m[1]:''; }

function buildPlatformLanguage(){
  const ps = new Set(); const ls = new Set();
  state.data.forEach(t=>{ (t.platforms||[]).forEach(x=>ps.add(x)); (t.languages||[]).forEach(x=>ls.add(x)); });
  const pSel = document.getElementById('platform'); const lSel = document.getElementById('language');
  if(pSel){ const cur = pSel.value; pSel.innerHTML = '<option value="">Alle plattformer</option>' + [...ps].sort((a,b)=>a.localeCompare(b,'nb')).map(x=>`<option value="${x}">${x}</option>`).join(''); pSel.value = cur; }
  if(lSel){ const cur = lSel.value; lSel.innerHTML = '<option value="">Alle språk</option>' + [...ls].sort((a,b)=>a.localeCompare(b,'nb')).map(x=>`<option value="${x}">${x}</option>`).join(''); lSel.value = cur; }
}
(function(){
    const btn = document.getElementById('filterToggle');
    const adv = document.getElementById('filtersAdvanced');
    if(btn && adv){
      btn.addEventListener('click', ()=> adv.classList.toggle('is-open'));
    }
  })();