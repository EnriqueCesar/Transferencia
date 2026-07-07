'use strict';
const app=(()=>{
const DATA_MANIFEST_URL='data/manifest-data.json';
const idx={year:0,week:1,date:2,ceco:3,store:4,ingredient:5,unit:6,provider:7,quantity:8,unitCost:9,totalCost:10,region:11,dm:12};
const monthNames=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const auditStates=['Correcta','Ingreso encontrado','Ingreso con fecha diferente','Sin ingreso','Diferencia de cantidad','Diferencia de costo','Coffee Patrol','Revisar'];
const state={manifest:null,loadedChunks:new Map(),month:'',week:'',region:'',dm:'',store:'',ingredient:'',provider:'',status:'',search:'',hideCoffee:true,view:'inicio',selectedTransfer:'',transfers:[],summary:[],allRows:[]};
const el=id=>document.getElementById(id);
const money=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2});
const qtyFmt=new Intl.NumberFormat('es-MX',{maximumFractionDigits:2});
const intFmt=new Intl.NumberFormat('es-MX',{maximumFractionDigits:0});
function peso(n){return money.format(Number(n)||0);} function qty(n){return qtyFmt.format(Number(n)||0);} function count(n){return intFmt.format(Number(n)||0);}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function debounce(fn,delay){let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),delay);};}
function setMessage(msg){el('friendlyStatus').textContent=msg;} function setCount(msg){el('filterCount').textContent=msg;}
const decode={store:r=>state.manifest.dicts.tienda[r[idx.store]]||'',ingredient:r=>state.manifest.dicts.ingrediente[r[idx.ingredient]]||'',unit:r=>state.manifest.dicts.unidad[r[idx.unit]]||'',provider:r=>state.manifest.dicts.proveedor[r[idx.provider]]||'',region:r=>state.manifest.dicts.region[r[idx.region]]||'',dm:r=>state.manifest.dicts.dm[r[idx.dm]]||''};
function normalize(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function parseProviderCeco(provider){const m=String(provider||'').match(/^(\d{4,6})\b/);return m?m[1]:'';}
function cleanProviderName(provider){return String(provider||'').replace(/^\d{4,6}\s*SBUX\s*/i,'').replace(/_/g,' ').replace(/\s+/g,' ').trim();}
function shortDate(iso){const d=new Date(`${iso}T00:00:00`); if(Number.isNaN(d.getTime()))return iso; return `${String(d.getDate()).padStart(2,'0')} ${monthNames[d.getMonth()].slice(0,3)}`;}
function directionLabel(t){return `${t.originStore} → ${t.destinationStore}`;}
function isCoffeeProvider(provider){return /^38100\b/i.test(String(provider||''))||/coffee[_\s-]*patrol/i.test(String(provider||''));}
function closeAbs(a,b,tol=0.02){return Math.abs(Math.abs(Number(a)||0)-Math.abs(Number(b)||0))<=tol;}
function closeUnit(a,b,tol=0.02){return Math.abs((Number(a)||0)-(Number(b)||0))<=tol;}
function statusClass(s){return normalize(s).replace(/\s+/g,'-');}
function fillSelect(select,values,selected,allLabel='Todos'){
  const current=selected||'';
  select.innerHTML=`<option value="">${allLabel}</option>`+values.map(v=>`<option value="${escapeHtml(v.value)}">${escapeHtml(v.label)}</option>`).join('');
  select.value=values.some(v=>String(v.value)===String(current))?current:'';
}
async function init(){
  setMessage('Preparando información...');
  state.manifest=await fetch(DATA_MANIFEST_URL,{cache:'no-store'}).then(r=>r.json());
  bindNav(); bindFilters(); populateStaticFilters(); await apply(); registerServiceWorker();
}
function populateStaticFilters(){
  const monthValues=(state.manifest.months||[]).slice().sort((a,b)=>a.value-b.value).map(m=>({value:m.value,label:monthNames[m.value-1]}));
  fillSelect(el('monthFilter'),monthValues,state.month,'Todos');
  const weeks=(state.manifest.weeks||[]).slice().sort((a,b)=>Number(a)-Number(b)).map(w=>({value:w,label:String(w)}));
  fillSelect(el('weekFilter'),weeks,state.week,'Todas');
  const regions=[...new Set((state.manifest.directory||[]).map(d=>d.region).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')).map(v=>({value:v,label:v}));
  fillSelect(el('regionFilter'),regions,state.region,'Todas');
  fillSelect(el('statusFilter'),auditStates.map(s=>({value:s,label:s})),state.status,'Todos');
}
function bindFilters(){
  const bind=(id,key,fn)=>el(id).addEventListener('change',async e=>{state[key]=e.target.type==='checkbox'?e.target.checked:e.target.value; if(fn)fn(); await apply();});
  bind('monthFilter','month'); bind('weekFilter','week');
  bind('regionFilter','region',()=>{state.dm='';state.store='';});
  bind('dmFilter','dm',()=>{state.store='';});
  bind('storeFilter','store'); bind('ingredientFilter','ingredient'); bind('providerFilter','provider'); bind('statusFilter','status'); bind('coffeeFilter','hideCoffee');
  el('searchFilter').addEventListener('input',debounce(async e=>{state.search=e.target.value.trim(); await apply();},250));
  el('resetFilters').addEventListener('click',async()=>{Object.assign(state,{month:'',week:'',region:'',dm:'',store:'',ingredient:'',provider:'',status:'',search:'',hideCoffee:true,selectedTransfer:''}); document.querySelectorAll('select').forEach(s=>s.value=''); el('searchFilter').value=''; el('coffeeFilter').checked=true; populateStaticFilters(); await apply();});
}
function chunksForCurrentFilters(){
  let chunks=(state.manifest.chunks||[]).slice();
  if(state.month)chunks=chunks.filter(c=>String(c.month)===String(state.month));
  if(state.week)chunks=chunks.filter(c=>(c.weeks||[]).map(String).includes(String(state.week)));
  return chunks;
}
async function loadChunks(chunks){
  for(const chunk of chunks){
    if(!state.loadedChunks.has(chunk.id)){
      setMessage('Cargando transferencias filtradas...');
      const data=await fetch(chunk.path,{cache:'no-store'}).then(r=>r.json());
      state.loadedChunks.set(chunk.id,data.rows||[]);
    }
  }
}
function currentRows(chunks){return chunks.flatMap(c=>state.loadedChunks.get(c.id)||[]);}
function rowMatchesTime(r){return (!state.month||String(new Date(`${r[idx.date]}T00:00:00`).getMonth()+1)===String(state.month))&&(!state.week||String(r[idx.week])===String(state.week));}
function rowMatchesOrg(r){return (!state.region||decode.region(r)===state.region)&&(!state.dm||decode.dm(r)===state.dm)&&(!state.store||decode.store(r)===state.store);}
function rowMatchesText(r){
  if(state.ingredient&&decode.ingredient(r)!==state.ingredient)return false;
  if(state.provider&&decode.provider(r)!==state.provider)return false;
  if(!state.search)return true;
  const hay=[r[idx.ceco],decode.store(r),decode.provider(r),decode.ingredient(r),decode.region(r),decode.dm(r)].join(' ');
  return normalize(hay).includes(normalize(state.search));
}
function rowPassesSalidaFilters(r){return rowMatchesTime(r)&&rowMatchesOrg(r)&&rowMatchesText(r);}
function updateDependentFilters(rows){
  const timeRows=rows.filter(rowMatchesTime);
  const regionDms=new Set(timeRows.filter(r=>!state.region||decode.region(r)===state.region).map(decode.dm).filter(Boolean));
  const dms=[...regionDms].sort((a,b)=>a.localeCompare(b,'es')).map(v=>({value:v,label:v}));
  if(state.dm&&!dms.some(d=>d.value===state.dm))state.dm='';
  fillSelect(el('dmFilter'),dms,state.dm,'Todos');
  const storeRows=timeRows.filter(r=>(!state.region||decode.region(r)===state.region)&&(!state.dm||decode.dm(r)===state.dm));
  const stores=[...new Set(storeRows.map(decode.store).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')).map(v=>({value:v,label:v}));
  if(state.store&&!stores.some(s=>s.value===state.store))state.store='';
  fillSelect(el('storeFilter'),stores,state.store,'Todas');
  const visibleRows=timeRows.filter(r=>rowMatchesOrg(r));
  const ingredients=[...new Set(visibleRows.map(decode.ingredient).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')).slice(0,1600).map(v=>({value:v,label:v}));
  const providers=[...new Set(visibleRows.map(decode.provider).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')).slice(0,1600).map(v=>({value:v,label:v}));
  if(state.ingredient&&!ingredients.some(x=>x.value===state.ingredient))state.ingredient='';
  if(state.provider&&!providers.some(x=>x.value===state.provider))state.provider='';
  fillSelect(el('ingredientFilter'),ingredients,state.ingredient,'Todos'); fillSelect(el('providerFilter'),providers,state.provider,'Todos');
}
function makeInputIndex(rows){
  const map=new Map();
  for(const r of rows){
    if(!rowMatchesTime(r))continue;
    if(Number(r[idx.quantity])<=0||Number(r[idx.totalCost])<=0)continue;
    const providerCeco=parseProviderCeco(decode.provider(r)); if(!providerCeco)continue;
    const key=[String(r[idx.ceco]),providerCeco,r[idx.ingredient],r[idx.unit]].join('|');
    if(!map.has(key))map.set(key,[]); map.get(key).push({row:r,used:false});
  }
  for(const list of map.values())list.sort((a,b)=>a.row[idx.date].localeCompare(b.row[idx.date]));
  return map;
}
function compareProduct(salida,inputIndex){
  const provider=decode.provider(salida);
  if(isCoffeeProvider(provider))return {status:'Coffee Patrol',ingreso:null,diff:0,alert:'Movimiento informativo. No exige ingreso.'};
  const destCeco=parseProviderCeco(provider);
  if(!destCeco)return {status:'Revisar',ingreso:null,diff:Math.abs(Number(salida[idx.totalCost])||0),alert:'Proveedor no identificado.'};
  const key=[destCeco,String(salida[idx.ceco]),salida[idx.ingredient],salida[idx.unit]].join('|');
  const candidates=(inputIndex.get(key)||[]).filter(c=>!c.used);
  if(!candidates.length)return {status:'Sin ingreso',ingreso:null,diff:Math.abs(Number(salida[idx.totalCost])||0),alert:'Esta salida aún no tiene ingreso relacionado.'};
  let best=null,score=999;
  for(const c of candidates){
    const r=c.row; let s=0;
    if(!closeAbs(salida[idx.quantity],r[idx.quantity],0.001))s+=30;
    if(!closeUnit(salida[idx.unitCost],r[idx.unitCost],0.02))s+=12;
    if(!closeAbs(salida[idx.totalCost],r[idx.totalCost],0.02))s+=20;
    if(salida[idx.date]!==r[idx.date])s+=1;
    const days=Math.abs(new Date(`${salida[idx.date]}T00:00:00`)-new Date(`${r[idx.date]}T00:00:00`))/(86400000);
    if(Number.isFinite(days))s+=Math.min(days,20)/20;
    if(s<score){score=s;best=c;}
  }
  if(!best)return {status:'Sin ingreso',ingreso:null,diff:Math.abs(Number(salida[idx.totalCost])||0),alert:'Esta salida aún no tiene ingreso relacionado.'};
  best.used=true;
  const ingreso=best.row;
  const qtyOk=closeAbs(salida[idx.quantity],ingreso[idx.quantity],0.001);
  const unitOk=closeUnit(salida[idx.unitCost],ingreso[idx.unitCost],0.02);
  const totalDiff=Math.abs(Math.abs(Number(salida[idx.totalCost])||0)-Math.abs(Number(ingreso[idx.totalCost])||0));
  const totalOk=totalDiff<=0.02;
  if(!qtyOk)return {status:'Diferencia de cantidad',ingreso,diff:totalDiff,alert:'Revisa cantidad transferida.'};
  if(!unitOk||!totalOk)return {status:'Diferencia de costo',ingreso,diff:totalDiff,alert:totalDiff<=0.05?'Diferencia menor por redondeo.':'Revisa diferencia de costo.'};
  if(salida[idx.date]!==ingreso[idx.date])return {status:'Ingreso con fecha diferente',ingreso,diff:totalDiff,alert:'El ingreso se encontró en otra fecha.'};
  return {status:'Correcta',ingreso,diff:totalDiff,alert:'Esta salida tiene ingreso confirmado.'};
}
function transferStatus(products){
  const statuses=products.map(p=>p.status);
  if(statuses.every(s=>s==='Coffee Patrol'))return 'Coffee Patrol';
  if(statuses.includes('Sin ingreso'))return 'Sin ingreso';
  if(statuses.includes('Diferencia de cantidad'))return 'Diferencia de cantidad';
  if(statuses.includes('Diferencia de costo'))return 'Diferencia de costo';
  if(statuses.includes('Revisar'))return 'Revisar';
  if(statuses.includes('Ingreso con fecha diferente'))return 'Ingreso con fecha diferente';
  if(statuses.every(s=>s==='Correcta'))return 'Correcta';
  return products.some(p=>p.ingreso)?'Ingreso encontrado':'Revisar';
}
function statusRank(s){return {'Sin ingreso':0,'Diferencia de cantidad':1,'Diferencia de costo':2,'Revisar':3,'Ingreso con fecha diferente':4,'Coffee Patrol':5,'Ingreso encontrado':6,'Correcta':7}[s]??9;}
function buildAudit(rows){
  const inputIndex=makeInputIndex(rows);
  const salidas=rows.filter(r=>Number(r[idx.quantity])<0&&Number(r[idx.totalCost])<0&&rowPassesSalidaFilters(r)).filter(r=>!state.hideCoffee||!isCoffeeProvider(decode.provider(r)));
  const groups=new Map();
  for(const s of salidas){
    const res=compareProduct(s,inputIndex);
    const provider=decode.provider(s);
    const destCeco=parseProviderCeco(provider);
    const dest=cleanProviderName(provider)||provider;
    const key=[s[idx.date],s[idx.ceco],provider].join('|');
    if(!groups.has(key))groups.set(key,{id:key,date:s[idx.date],originCeco:String(s[idx.ceco]),originStore:decode.store(s),region:decode.region(s),dm:decode.dm(s),provider,destCeco,destinationStore:dest,products:[]});
    groups.get(key).products.push({salida:s,ingreso:res.ingreso,status:res.status,diff:res.diff,alert:res.alert});
  }
  let transfers=[...groups.values()].map(t=>{
    t.productCount=t.products.length;
    t.montoSalida=t.products.reduce((sum,p)=>sum+Math.abs(Number(p.salida[idx.totalCost])||0),0);
    t.montoIngreso=t.products.reduce((sum,p)=>sum+(p.ingreso?Math.abs(Number(p.ingreso[idx.totalCost])||0):0),0);
    t.diff=Math.abs(t.montoSalida-t.montoIngreso);
    t.ingresos=t.products.filter(p=>p.ingreso).length;
    t.status=transferStatus(t.products);
    return t;
  });
  if(state.status)transfers=transfers.filter(t=>state.status==='Ingreso encontrado'?t.products.some(p=>p.ingreso):t.status===state.status);
  transfers.sort((a,b)=>statusRank(a.status)-statusRank(b.status)||b.diff-a.diff||a.date.localeCompare(b.date)||a.originStore.localeCompare(b.originStore,'es'));
  const byStore=new Map();
  for(const t of transfers){
    const key=t.originCeco+'|'+t.originStore;
    const item=byStore.get(key)||{ceco:t.originCeco,store:t.originStore,dm:t.dm,region:t.region,transfers:0,correct:0,pending:0,montoSalida:0,montoIngreso:0,diff:0,statuses:new Map()};
    item.transfers++; if(['Correcta','Ingreso encontrado','Ingreso con fecha diferente','Coffee Patrol'].includes(t.status))item.correct++; else item.pending++;
    item.montoSalida+=t.montoSalida; item.montoIngreso+=t.montoIngreso; item.diff+=t.diff;
    item.statuses.set(t.status,(item.statuses.get(t.status)||0)+1); byStore.set(key,item);
  }
  const summary=[...byStore.values()].map(item=>{item.status=overallStatus(item); return item;}).sort((a,b)=>statusRank(a.status)-statusRank(b.status)||b.diff-a.diff||a.store.localeCompare(b.store,'es'));
  return {transfers,summary};
}
function overallStatus(item){if(item.statuses.has('Sin ingreso'))return 'Sin ingreso'; if(item.statuses.has('Diferencia de cantidad'))return 'Diferencia de cantidad'; if(item.statuses.has('Diferencia de costo'))return 'Diferencia de costo'; if(item.statuses.has('Revisar'))return 'Revisar'; if(item.statuses.has('Ingreso con fecha diferente'))return 'Ingreso con fecha diferente'; if(item.statuses.has('Coffee Patrol')&&item.statuses.size===1)return 'Coffee Patrol'; return 'Correcta';}
async function apply(){
  try{
    setMessage('Preparando información...');
    const chunks=chunksForCurrentFilters(); await loadChunks(chunks);
    const rows=currentRows(chunks); state.allRows=rows; updateDependentFilters(rows);
    const result=buildAudit(rows); state.transfers=result.transfers; state.summary=result.summary;
    if(state.selectedTransfer&&!state.transfers.some(t=>t.id===state.selectedTransfer))state.selectedTransfer='';
    renderAll();
    setMessage(state.transfers.some(t=>!['Correcta','Ingreso encontrado','Coffee Patrol'].includes(t.status))?'Hay salidas que requieren atención':'Revisión lista');
  }catch(err){console.error(err); setMessage('No fue posible completar la revisión.');}
}
function renderAll(){
  const transfers=state.transfers, summary=state.summary;
  const correct=transfers.filter(t=>['Correcta','Ingreso encontrado','Ingreso con fecha diferente','Coffee Patrol'].includes(t.status)).length;
  const pending=transfers.length-correct;
  const montoSalida=transfers.reduce((s,t)=>s+t.montoSalida,0); const montoIngreso=transfers.reduce((s,t)=>s+t.montoIngreso,0);
  el('kpiGrid').innerHTML=[['Transferencias revisadas',count(transfers.length),'movimientos entre tiendas'],['Transferencias correctas',count(correct),'con ingreso o excepción'],['Transferencias pendientes',count(pending),'requieren atención'],['Monto enviado',peso(montoSalida),'salidas auditadas'],['Monto recibido',peso(montoIngreso),'ingresos relacionados'],['Diferencia',peso(Math.abs(montoSalida-montoIngreso)),'por revisar']].map(([t,v,s])=>`<article class="kpi"><p>${t}</p><strong>${v}</strong><span>${s}</span></article>`).join('');
  setCount(transfers.length?'Revisión lista':'Selecciona filtros para iniciar');
  renderSummary('summaryRows',summary); renderSummary('auditRows',summary);
  el('summaryBadge').textContent=`${count(summary.length)} tiendas`; el('auditBadge').textContent=`${count(summary.length)} tiendas`;
  renderTransferCards(); renderDetails(); renderAlerts();
}
function renderSummary(id,summary){
  el(id).innerHTML=summary.map(item=>`<tr class="clickable" data-store="${escapeHtml(item.store)}"><td><strong>${escapeHtml(item.store)}</strong></td><td>${escapeHtml(item.ceco)}</td><td>${escapeHtml(item.region)}</td><td>${escapeHtml(item.dm)}</td><td class="number">${count(item.transfers)}</td><td class="number positive">${count(item.correct)}</td><td class="number negative">${count(item.pending)}</td><td class="number negative">${peso(item.montoSalida)}</td><td class="number positive">${peso(item.montoIngreso)}</td><td class="number">${peso(item.diff)}</td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td></tr>`).join('')||'<tr><td colspan="11">Selecciona filtros para iniciar la revisión.</td></tr>';
  el(id).querySelectorAll('tr[data-store]').forEach(tr=>tr.addEventListener('click',()=>{state.store=tr.dataset.store; el('storeFilter').value=state.store; state.selectedTransfer=''; switchView('transferencias'); apply();}));
}
function renderTransferCards(){
  const selected=state.selectedTransfer;
  el('transferBadge').textContent=`${count(state.transfers.length)} transferencias`;
  el('transferCards').innerHTML=state.transfers.slice(0,320).map(t=>`<button class="transfer-card ${selected===t.id?'is-selected':''}" data-id="${escapeHtml(t.id)}" type="button"><span class="transfer-date">${escapeHtml(shortDate(t.date))}</span><strong>${escapeHtml(t.originStore)}</strong><span class="transfer-arrow">↓</span><span>${escapeHtml(t.destinationStore)}</span><div class="transfer-meta"><span>${count(t.productCount)} productos</span><span>${peso(t.montoSalida)}</span></div><span class="status ${statusClass(t.status)}">${escapeHtml(t.status)}</span></button>`).join('')||'<p class="empty-state">No hay transferencias con los filtros actuales.</p>';
  el('transferCards').querySelectorAll('button[data-id]').forEach(btn=>btn.addEventListener('click',()=>{state.selectedTransfer=btn.dataset.id; renderTransferCards(); renderDetails();}));
}
function renderDetails(){
  const t=state.transfers.find(x=>x.id===state.selectedTransfer) || state.transfers[0];
  if(!t){el('detailTitle').textContent='Selecciona una transferencia'; el('detailBadge').textContent=''; el('detailRows').innerHTML='<tr><td colspan="9">No hay productos para mostrar.</td></tr>'; return;}
  if(!state.selectedTransfer)state.selectedTransfer=t.id;
  el('detailTitle').textContent=`${shortDate(t.date)} · ${t.originStore} → ${t.destinationStore}`;
  el('detailBadge').textContent=`${count(t.productCount)} productos`;
  el('detailRows').innerHTML=t.products.map(p=>{const s=p.salida,i=p.ingreso;return `<tr><td><strong>${escapeHtml(decode.ingredient(s))}</strong></td><td>${escapeHtml(decode.unit(s))}</td><td class="number negative">${qty(s[idx.quantity])}</td><td class="number positive">${i?qty(i[idx.quantity]):'—'}</td><td class="number">${peso(s[idx.unitCost])}</td><td class="number negative">${peso(s[idx.totalCost])}</td><td class="number positive">${i?peso(i[idx.totalCost]):'—'}</td><td class="number">${peso(p.diff)}</td><td><span class="status ${statusClass(p.status)}">${escapeHtml(p.status)}</span></td></tr>`;}).join('');
}
function renderAlerts(){
  const alerts=state.transfers.filter(t=>!['Correcta','Ingreso encontrado','Coffee Patrol'].includes(t.status)).slice(0,160);
  el('alertBadge').textContent=`${count(alerts.length)} alertas`;
  el('alertList').innerHTML=alerts.map(t=>`<div class="alert-item"><strong>${escapeHtml(t.status)}</strong><span>${escapeHtml(shortDate(t.date))} · ${escapeHtml(directionLabel(t))}</span><small>${count(t.productCount)} productos · ${peso(t.diff)} de diferencia</small></div>`).join('')||'<p class="empty-state">Transferencias revisadas sin diferencias relevantes.</p>';
}
function bindNav(){document.querySelectorAll('.nav-card').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.section)));}
function switchView(view){state.view=view; document.querySelectorAll('.nav-card').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.section===view)); document.querySelectorAll('.content-section').forEach(sec=>sec.classList.toggle('is-visible',sec.dataset.view===view)); if(view==='transferencias'){renderTransferCards(); renderDetails();}}
function registerServiceWorker(){if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(console.warn);}
document.addEventListener('DOMContentLoaded',init);
return{state,apply};
})();
