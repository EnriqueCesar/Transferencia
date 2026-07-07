
'use strict';
const app=(()=>{
const DATA_MANIFEST_URL='data/manifest-data.json';
const idx={year:0,week:1,date:2,ceco:3,store:4,ingredient:5,unit:6,provider:7,quantity:8,unitCost:9,totalCost:10,region:11,dm:12};
const monthNames=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const states=['Correcto','Sin ingreso','Diferencia de monto','Diferencia de cantidad','Fecha diferente','Revisar','Excepción válida Coffee Patrol'];
const state={manifest:null,loadedChunks:new Map(),month:'',week:'',region:'',dm:'',store:'',ingredient:'',provider:'',status:'',search:'',view:'inicio',selectedStore:'',audit:[],summary:[]};
const el=id=>document.getElementById(id);
const money=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2});
const int=new Intl.NumberFormat('es-MX',{maximumFractionDigits:0});
const num=new Intl.NumberFormat('es-MX',{maximumFractionDigits:2});
const peso=n=>money.format(Number(n)||0);
const qty=n=>num.format(Number(n)||0);
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function debounce(fn,delay){let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),delay);};}
const decode={store:r=>state.manifest.dicts.tienda[r[idx.store]]||'',ingredient:r=>state.manifest.dicts.ingrediente[r[idx.ingredient]]||'',unit:r=>state.manifest.dicts.unidad[r[idx.unit]]||'',provider:r=>state.manifest.dicts.proveedor[r[idx.provider]]||'',region:r=>state.manifest.dicts.region[r[idx.region]]||'',dm:r=>state.manifest.dicts.dm[r[idx.dm]]||''};
function setMessage(text){const target=el('friendlyStatus');if(target)target.textContent=text;}
function setCount(text){const target=el('filterCount');if(target)target.textContent=text;}
function fillSelect(id,items,selected='',label='Todos'){
  const select=el(id); if(!select)return;
  const old=selected || select.value || '';
  select.innerHTML=`<option value="">${label}</option>`+items.map(item=>{
    const value=typeof item==='object'?item.value:item;
    const text=typeof item==='object'?item.label:item;
    return `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`;
  }).join('');
  select.value=[...select.options].some(o=>o.value===old)?old:'';
}
function sortedUnique(values){return [...new Set(values)].filter(Boolean).sort((a,b)=>String(a).localeCompare(String(b),'es',{sensitivity:'base'}));}
function parseProviderCeco(provider){const m=String(provider||'').match(/^(\d{5})\b/);return m?m[1]:'';}
function isCoffeePatrol(provider){const p=String(provider||'').toLowerCase();return p.includes('38100')&&p.includes('coffee_patrol');}
function cents(v){return Math.round(Math.abs(Number(v)||0)*100);}
function closeMoney(a,b,tol=2){return Math.abs(cents(a)-cents(b))<=tol;}
function closeQty(a,b,tol=.0001){return Math.abs(Math.abs(Number(a)||0)-Math.abs(Number(b)||0))<=tol;}
function rowSearchText(r){return `${r[idx.ceco]} ${decode.store(r)} ${decode.ingredient(r)} ${decode.provider(r)} ${decode.region(r)} ${decode.dm(r)}`.toLowerCase();}
async function init(){
  try{
    setMessage('Preparando información...');
    const res=await fetch(DATA_MANIFEST_URL,{cache:'no-cache'});
    if(!res.ok)throw new Error('No se pudo cargar la información principal.');
    state.manifest=await res.json();
    initFilters(); bindNav(); registerServiceWorker(); await apply();
  }catch(err){console.error(err);setMessage('No fue posible preparar la información.');setCount('Revisa la publicación del sitio.');}
}
function initFilters(){
  const m=state.manifest;
  const months=(m.months||[]).map(x=>({value:String(x.value),label:monthNames[x.value-1]||String(x.value)})).sort((a,b)=>Number(a.value)-Number(b.value));
  fillSelect('monthFilter',months,state.month,'Todos');
  fillSelect('weekFilter',(m.weeks||[]).slice().sort((a,b)=>Number(a)-Number(b)).map(String),state.week,'Todas');
  fillSelect('statusFilter',states,state.status,'Todos');
  updateDependentFilters();
  ['monthFilter','weekFilter','regionFilter','dmFilter','storeFilter','ingredientFilter','providerFilter','statusFilter','searchFilter'].forEach(id=>el(id)?.addEventListener('input',debounce(readFilters,160)));
  el('resetFilters')?.addEventListener('click',resetFilters);
}
function updateDependentFilters(rowsForOptions=[]){
  const dirs=state.manifest.directory||[];
  const regions=sortedUnique(dirs.map(d=>d.region));
  fillSelect('regionFilter',regions,state.region,'Todas');
  if(state.region && !regions.includes(state.region))state.region='';
  const dmList=sortedUnique(dirs.filter(d=>!state.region||d.region===state.region).map(d=>d.dm));
  fillSelect('dmFilter',dmList,state.dm,'Todos');
  if(state.dm && !dmList.includes(state.dm)){state.dm='';}
  const stores=sortedUnique(dirs.filter(d=>(!state.region||d.region===state.region)&&(!state.dm||d.dm===state.dm)).map(d=>d.tienda));
  fillSelect('storeFilter',stores,state.store,'Todas');
  if(state.store && !stores.includes(state.store)){state.store='';}
  const base=rowsForOptions.length?rowsForOptions:currentRows(chunksForCurrentFilters());
  const scoped=base.filter(r=>(!state.region||decode.region(r)===state.region)&&(!state.dm||decode.dm(r)===state.dm)&&(!state.store||decode.store(r)===state.store));
  fillSelect('ingredientFilter',sortedUnique(scoped.map(decode.ingredient)).slice(0,1200),state.ingredient,'Todos');
  fillSelect('providerFilter',sortedUnique(scoped.map(decode.provider)).slice(0,1200),state.provider,'Todos');
}
function readFilters(){
  state.month=el('monthFilter')?.value||''; state.week=el('weekFilter')?.value||''; state.region=el('regionFilter')?.value||''; state.dm=el('dmFilter')?.value||''; state.store=el('storeFilter')?.value||''; state.ingredient=el('ingredientFilter')?.value||''; state.provider=el('providerFilter')?.value||''; state.status=el('statusFilter')?.value||''; state.search=(el('searchFilter')?.value||'').trim().toLowerCase(); state.selectedStore=''; apply();
}
function resetFilters(){Object.assign(state,{month:'',week:'',region:'',dm:'',store:'',ingredient:'',provider:'',status:'',search:'',selectedStore:''});['monthFilter','weekFilter','regionFilter','dmFilter','storeFilter','ingredientFilter','providerFilter','statusFilter','searchFilter'].forEach(id=>{if(el(id))el(id).value='';});apply();}
function chunksForCurrentFilters(){return state.manifest.chunks.filter(c=>(!state.month||String(c.month)===String(state.month))&&(!state.week||c.weeks.map(String).includes(String(state.week))));}
async function loadChunks(chunks){
  const needed=chunks.filter(c=>!state.loadedChunks.has(c.id));
  for(const chunk of needed){
    setMessage('Cargando transferencias filtradas...');
    const res=await fetch(chunk.path); if(!res.ok)throw new Error(`No se pudo cargar ${chunk.path}`);
    const payload=await res.json(); state.loadedChunks.set(chunk.id,payload.rows||[]);
    await new Promise(requestAnimationFrame);
  }
}
function currentRows(chunks){return chunks.flatMap(c=>state.loadedChunks.get(c.id)||[]);}
function rowPassesFilters(r){
  if(state.region&&decode.region(r)!==state.region)return false;
  if(state.dm&&decode.dm(r)!==state.dm)return false;
  if(state.store&&decode.store(r)!==state.store)return false;
  if(state.ingredient&&decode.ingredient(r)!==state.ingredient)return false;
  if(state.provider&&decode.provider(r)!==state.provider)return false;
  if(state.week&&String(r[idx.week])!==state.week)return false;
  if(state.month&&Number(r[idx.date].slice(5,7))!==Number(state.month))return false;
  if(state.search&&!rowSearchText(r).includes(state.search))return false;
  return true;
}
function makeInputIndex(rows){
  const map=new Map();
  for(const r of rows){
    const q=Number(r[idx.quantity])||0, total=Number(r[idx.totalCost])||0;
    if(q<=0||total<=0)continue;
    const sourceCeco=parseProviderCeco(decode.provider(r));
    const key=[r[idx.ceco],sourceCeco,r[idx.ingredient],r[idx.unit]].join('|');
    const list=map.get(key)||[]; list.push({row:r,used:false}); map.set(key,list);
  }
  return map;
}
function compareSalida(salida,inputIndex){
  const provider=decode.provider(salida);
  if(isCoffeePatrol(provider))return {status:'Excepción válida Coffee Patrol',ingreso:null,diff:0,alert:'Coffee Patrol no requiere ingreso.'};
  const destCeco=parseProviderCeco(provider);
  if(!destCeco)return {status:'Revisar',ingreso:null,diff:Math.abs(Number(salida[idx.totalCost])||0),alert:'Proveedor no identificado.'};
  const key=[destCeco,salida[idx.ceco],salida[idx.ingredient],salida[idx.unit]].join('|');
  const candidates=(inputIndex.get(key)||[]).filter(x=>!x.used);
  if(!candidates.length)return {status:'Sin ingreso',ingreso:null,diff:Math.abs(Number(salida[idx.totalCost])||0),alert:'Esta salida aún no tiene ingreso relacionado.'};
  let best=null, score=999;
  for(const c of candidates){
    const r=c.row; let s=0;
    if(!closeQty(salida[idx.quantity],r[idx.quantity]))s+=20;
    if(!closeMoney(salida[idx.unitCost],r[idx.unitCost],2))s+=10;
    if(!closeMoney(salida[idx.totalCost],r[idx.totalCost],2))s+=12;
    if(salida[idx.date]!==r[idx.date])s+=1;
    if(s<score){score=s;best=c;}
  }
  if(!best)return {status:'Sin ingreso',ingreso:null,diff:Math.abs(Number(salida[idx.totalCost])||0),alert:'Esta salida aún no tiene ingreso relacionado.'};
  best.used=true;
  const ingreso=best.row;
  const qtyOk=closeQty(salida[idx.quantity],ingreso[idx.quantity]);
  const unitOk=closeMoney(salida[idx.unitCost],ingreso[idx.unitCost],2);
  const totalOk=closeMoney(salida[idx.totalCost],ingreso[idx.totalCost],2);
  const diff=Math.abs(Math.abs(Number(salida[idx.totalCost])||0)-Math.abs(Number(ingreso[idx.totalCost])||0));
  if(!qtyOk)return {status:'Diferencia de cantidad',ingreso,diff,alert:'Revisa cantidad transferida.'};
  if(!unitOk)return {status:'Revisar',ingreso,diff,alert:'Revisa costo unitario.'};
  if(!totalOk)return {status:'Diferencia de monto',ingreso,diff,alert:'Revisa diferencia de monto.'};
  if(salida[idx.date]!==ingreso[idx.date])return {status:'Fecha diferente',ingreso,diff,alert:'Ingreso con fecha diferente.'};
  return {status:'Correcto',ingreso,diff,alert:'Esta salida tiene ingreso confirmado.'};
}
function buildAudit(rows){
  const baseRows=rows.filter(rowPassesFilters);
  const inputIndex=makeInputIndex(rows.filter(r=>(!state.region||decode.region(r)===state.region)&&(!state.dm||decode.dm(r)===state.dm)));
  const salidas=baseRows.filter(r=>Number(r[idx.quantity])<0&&Number(r[idx.totalCost])<0);
  const audit=salidas.map(s=>{const res=compareSalida(s,inputIndex);return {salida:s,ingreso:res.ingreso,status:res.status,diff:res.diff,alert:res.alert};}).filter(a=>!state.status||a.status===state.status);
  const byStore=new Map();
  for(const a of audit){
    const s=a.salida, store=decode.store(s), key=s[idx.ceco]+'|'+store;
    const item=byStore.get(key)||{ceco:s[idx.ceco],store,dm:decode.dm(s),region:decode.region(s),salidas:0,ingresos:0,montoSalida:0,montoIngreso:0,diff:0,statuses:new CounterShim()};
    item.salidas++; if(a.ingreso)item.ingresos++;
    item.montoSalida+=Math.abs(Number(s[idx.totalCost])||0); item.montoIngreso+=a.ingreso?Math.abs(Number(a.ingreso[idx.totalCost])||0):0; item.diff+=a.diff||0; item.statuses.add(a.status); byStore.set(key,item);
  }
  const summary=[...byStore.values()].map(item=>{item.status=overallStatus(item);return item;}).sort((a,b)=>statusRank(a.status)-statusRank(b.status)||b.diff-a.diff||a.store.localeCompare(b.store,'es'));
  return {audit,summary,baseRows};
}
function CounterShim(){this.map=new Map();this.add=k=>this.map.set(k,(this.map.get(k)||0)+1);this.has=k=>this.map.has(k);this.count=k=>this.map.get(k)||0;}
function statusRank(s){return {'Sin ingreso':0,'Diferencia de monto':1,'Diferencia de cantidad':2,'Revisar':3,'Fecha diferente':4,'Excepción válida Coffee Patrol':5,'Correcto':6}[s]??9;}
function overallStatus(item){if(item.statuses.has('Sin ingreso'))return 'Sin ingreso';if(item.statuses.has('Diferencia de monto'))return 'Diferencia de monto';if(item.statuses.has('Diferencia de cantidad'))return 'Diferencia de cantidad';if(item.statuses.has('Revisar'))return 'Revisar';if(item.statuses.has('Fecha diferente'))return 'Fecha diferente';if(item.ingresos>0&&item.ingresos<item.salidas)return 'Parcial';if(item.statuses.has('Excepción válida Coffee Patrol'))return 'Excepción válida Coffee Patrol';return 'Correcto';}
async function apply(){
  try{
    setMessage('Preparando información...');
    const chunks=chunksForCurrentFilters(); await loadChunks(chunks);
    const rows=currentRows(chunks); updateDependentFilters(rows);
    const result=buildAudit(rows); state.audit=result.audit; state.summary=result.summary;
    renderAll(result); setMessage(result.audit.some(a=>a.status!=='Correcto'&&a.status!=='Excepción válida Coffee Patrol')?'Hay salidas que requieren atención':'Revisión lista');
  }catch(err){console.error(err);setMessage('No fue posible completar la revisión.');}
}
function renderAll(result){
  const audit=result.audit, summary=result.summary;
  const ingreso= audit.filter(a=>a.ingreso).length;
  const atencion=audit.filter(a=>!['Correcto','Excepción válida Coffee Patrol'].includes(a.status)).length;
  const montoSalida=audit.reduce((s,a)=>s+Math.abs(Number(a.salida[idx.totalCost])||0),0);
  const montoIngreso=audit.reduce((s,a)=>s+(a.ingreso?Math.abs(Number(a.ingreso[idx.totalCost])||0):0),0);
  el('kpiGrid').innerHTML=[['Salidas revisadas',int.format(audit.length),'transferencias de salida'],['Ingresos encontrados',int.format(ingreso),'relacionados'],['Monto salida',peso(montoSalida),'valor auditado'],['Diferencia',peso(Math.abs(montoSalida-montoIngreso)),'contra ingresos'],['Requieren atención',int.format(atencion),'salidas por revisar'],['Tiendas',int.format(summary.length),'con salidas filtradas']].map(([t,v,s])=>`<article class="kpi"><p>${t}</p><strong>${v}</strong><span>${s}</span></article>`).join('');
  setCount(audit.length?`${int.format(audit.length)} salidas listas para revisar`:'Selecciona filtros para iniciar');
  renderSummary('summaryRows',summary); renderSummary('auditRows',summary); el('summaryBadge').textContent=`${int.format(summary.length)} tiendas`; el('auditBadge').textContent=`${int.format(summary.length)} tiendas`;
  renderDetails(); renderAlerts(audit); renderDirectory();
}
function statusClass(s){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-');}
function renderSummary(id,summary){
  el(id).innerHTML=summary.map(item=>`<tr class="clickable" data-store="${escapeHtml(item.store)}"><td><strong>${escapeHtml(item.store)}</strong></td><td>${escapeHtml(item.ceco)}</td><td>${escapeHtml(item.dm)}</td><td>${escapeHtml(item.region)}</td><td class="number">${int.format(item.salidas)}</td><td class="number">${int.format(item.ingresos)}</td><td class="number negative">${peso(item.montoSalida)}</td><td class="number positive">${peso(item.montoIngreso)}</td><td class="number">${peso(item.diff)}</td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td></tr>`).join('')||'<tr><td colspan="10">No hay salidas con los filtros actuales.</td></tr>';
  el(id).querySelectorAll('tr[data-store]').forEach(tr=>tr.addEventListener('click',()=>{state.selectedStore=tr.dataset.store;switchView('transferencias');renderDetails();}));
}
function renderDetails(){
  let rows=state.audit; if(state.selectedStore)rows=rows.filter(a=>decode.store(a.salida)===state.selectedStore);
  el('detailTitle').textContent=state.selectedStore?`Detalle de ${state.selectedStore}`:'Detalle básico por producto';
  el('detailBadge').textContent=`${int.format(rows.length)} salidas`;
  el('detailRows').innerHTML=rows.slice(0,500).map(a=>{const s=a.salida,i=a.ingreso;const dest=decode.provider(s);return `<tr><td>${escapeHtml(s[idx.date])}</td><td>${escapeHtml(decode.store(s))}</td><td>${escapeHtml(dest)}</td><td>${escapeHtml(decode.ingredient(s))}</td><td class="number negative">${qty(s[idx.quantity])}</td><td class="number positive">${i?qty(i[idx.quantity]):'—'}</td><td class="number">${peso(s[idx.unitCost])}</td><td class="number negative">${peso(s[idx.totalCost])}</td><td class="number positive">${i?peso(i[idx.totalCost]):'—'}</td><td class="number">${peso(a.diff)}</td><td><span class="status ${statusClass(a.status)}">${escapeHtml(a.status)}</span></td></tr>`;}).join('')||'<tr><td colspan="11">Selecciona una tienda o ajusta filtros para ver detalle.</td></tr>';
}
function renderAlerts(audit){
  const alerts=audit.filter(a=>!['Correcto'].includes(a.status)).slice(0,120);
  el('alertBadge').textContent=`${int.format(alerts.length)} alertas`;
  el('alertList').innerHTML=alerts.map(a=>`<div class="alert-item"><strong>${escapeHtml(a.status)}</strong><span>${escapeHtml(decode.store(a.salida))} → ${escapeHtml(decode.provider(a.salida))}</span><small>${escapeHtml(decode.ingredient(a.salida))} · ${escapeHtml(a.alert)}</small></div>`).join('')||'<p class="empty-state">Transferencias revisadas sin diferencias relevantes.</p>';
}
function renderDirectory(){
  const rows=(state.manifest.directory||[]).filter(d=>(!state.region||d.region===state.region)&&(!state.dm||d.dm===state.dm)&&(!state.store||d.tienda===state.store)).slice(0,600);
  el('directoryBadge').textContent=`${int.format(rows.length)} tiendas`;
  el('directoryRows').innerHTML=rows.map(d=>`<tr><td>${escapeHtml(d.ceco)}</td><td>${escapeHtml(d.tienda)}</td><td>${escapeHtml(d.region)}</td><td>${escapeHtml(d.dm)}</td></tr>`).join('')||'<tr><td colspan="4">Sin tiendas para los filtros actuales.</td></tr>';
}
function bindNav(){document.querySelectorAll('.nav-card').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.section)));}
function switchView(view){state.view=view;document.querySelectorAll('.nav-card').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.section===view));document.querySelectorAll('.content-section').forEach(sec=>sec.classList.toggle('is-visible',sec.dataset.view===view));if(view==='transferencias')renderDetails();}
function registerServiceWorker(){if('serviceWorker'in navigator){navigator.serviceWorker.register('./service-worker.js').catch(console.warn);}}
document.addEventListener('DOMContentLoaded',init);
return{state,apply};
})();
