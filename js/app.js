(() => {
'use strict';
const REQUIRED_SHEETS=['Compras_Dtto_EC','Clasificacion'];
const EXCLUDED=new Set(['baja','baja merch']);
const PAGE_SIZE=100;
const FILTER_STORAGE='compras-filtros-v2';
const $=id=>document.getElementById(id);
const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const text=v=>String(v??'').trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const ceco=v=>{const s=text(v).replace(/\.0+$/,'');return s?s.padStart(5,'0'):''};
const fmtMoney=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2});
const fmtNum=new Intl.NumberFormat('es-MX',{maximumFractionDigits:2});
const fmtDate=new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'});
const fmtShort=new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'2-digit'});
const fmtMonth=new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'});
const state={all:[],filtered:[],directory:new Map(),filters:{},sort:{key:'date',dir:-1},page:1,view:'inicio',sourceName:'',audit:{}};
const aliases={
 year:['año','ano'],week:['semana'],date:['dia','día','fecha'],operation:['tipo operacion','tipo operación'],ceco:['ceco','centro de costos'],store:['tienda'],ingredient:['ingrediente'],unit:['unidad de medida','unidad'],provider:['proveedor'],quantity:['cantidad'],unitCost:['costo unitario'],total:['costo total','compra','compra $'],classification:['clasificacion','clasificación','categoria','categoría'],region:['region','región'],dm:['dm','district manager']
};
function keyMap(headers){const m={};for(const [logical,names] of Object.entries(aliases)){const found=headers.find(h=>names.includes(normalize(h)));if(found)m[logical]=found;}return m;}
function asDate(v){if(v instanceof Date&&!isNaN(v))return new Date(v.getFullYear(),v.getMonth(),v.getDate());if(typeof v==='number'){const d=XLSX.SSF.parse_date_code(v);return d?new Date(d.y,d.m-1,d.d):null;}const s=text(v);if(!s)return null;const iso=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);if(iso)return new Date(+iso[1],+iso[2]-1,+iso[3]);const mx=/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/.exec(s);if(mx)return new Date(mx[3].length===2?2000+Number(mx[3]):Number(mx[3]),Number(mx[2])-1,Number(mx[1]));const d=new Date(s);return isNaN(d)?null:new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function dateKey(d){return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';}
function monthKey(d){return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`:'';}
function isoWeek(d){const u=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));u.setUTCDate(u.getUTCDate()+4-(u.getUTCDay()||7));const start=new Date(Date.UTC(u.getUTCFullYear(),0,1));return String(Math.ceil((((u-start)/86400000)+1)/7));}
function rowSignature(r){return [r.dateKey,r.ceco,normalize(r.ingredient),normalize(r.provider),r.quantity,r.unitCost,r.total].join('|');}
function sheetRows(wb,name){const ws=wb.Sheets[name];if(!ws)throw new Error(`Falta la pestaña ${name}`);return XLSX.utils.sheet_to_json(ws,{defval:'',raw:true});}
function findSheet(wb,name){return wb.SheetNames.find(s=>normalize(s)===normalize(name));}
function defaultFilters(){return{region:'',dm:'',store:'',month:'',week:'',classifications:[],ingredient:'',provider:'',dateFrom:'',dateTo:'',search:''};}
function restoreFilters(){try{const saved=JSON.parse(localStorage.getItem(FILTER_STORAGE)||'{}');return{...defaultFilters(),...saved,classifications:Array.isArray(saved.classifications)?saved.classifications:[]};}catch{return defaultFilters();}}
function persistFilters(){try{localStorage.setItem(FILTER_STORAGE,JSON.stringify(state.filters));}catch{}}
async function loadBuffer(buffer,name){
  const wb=XLSX.read(buffer,{type:'array',cellDates:true});
  const missing=REQUIRED_SHEETS.filter(n=>!findSheet(wb,n));if(missing.length)throw new Error(`Faltan pestañas: ${missing.join(', ')}`);
  const className=findSheet(wb,'Clasificacion'),purchaseName=findSheet(wb,'Compras_Dtto_EC'),directoryName=findSheet(wb,'Directorio');
  const classRows=sheetRows(wb,className),classHeaders=Object.keys(classRows[0]||{}),ck=keyMap(classHeaders);
  if(!ck.ingredient||!ck.classification)throw new Error('Clasificacion requiere Ingrediente y Clasificación/Categoria.');
  const classMap=new Map();let duplicateClass=0;
  for(const r of classRows){const k=normalize(r[ck.ingredient]);if(!k)continue;if(classMap.has(k))duplicateClass++;else classMap.set(k,text(r[ck.classification]));}
  const directory=new Map();let directoryDuplicates=0,directorySourceRows=0;
  if(directoryName){const rows=sheetRows(wb,directoryName),dk=keyMap(Object.keys(rows[0]||{}));directorySourceRows=rows.length;if(!dk.ceco)throw new Error('Directorio requiere encabezado CeCo.');for(const r of rows){const k=ceco(r[dk.ceco]);if(!k)continue;if(directory.has(k)){directoryDuplicates++;continue;}directory.set(k,{store:dk.store?text(r[dk.store]):'',region:dk.region?text(r[dk.region]):'',dm:dk.dm?text(r[dk.dm]):''});}}
  const purchaseRows=sheetRows(wb,purchaseName),pk=keyMap(Object.keys(purchaseRows[0]||{}));
  for(const req of ['date','ceco','store','ingredient','provider','quantity','total'])if(!pk[req])throw new Error(`Compras_Dtto_EC requiere encabezado ${req}.`);
  const out=[],signatures=new Set();let excluded=0,unclassified=0,duplicates=0,invalid=0;
  for(const r of purchaseRows){
    const ingredient=text(r[pk.ingredient]),classification=classMap.get(normalize(ingredient))||'Sin clasificación';
    if(classification==='Sin clasificación')unclassified++;
    if(EXCLUDED.has(normalize(classification))){excluded++;continue;}
    const d=asDate(r[pk.date]);if(!d){invalid++;continue;}
    const cc=ceco(r[pk.ceco]),dir=directory.get(cc)||{};
    const item={year:text(r[pk.year])||String(d.getFullYear()),week:text(pk.week?r[pk.week]:'')||isoWeek(d),month:monthKey(d),date:d,dateKey:dateKey(d),operation:text(pk.operation?r[pk.operation]:''),ceco:cc,store:dir.store||text(r[pk.store]),region:dir.region||'',dm:dir.dm||'',ingredient,classification,unit:text(pk.unit?r[pk.unit]:''),provider:text(r[pk.provider]),quantity:num(r[pk.quantity]),unitCost:num(pk.unitCost?r[pk.unitCost]:0),total:num(r[pk.total])};
    const sig=rowSignature(item);if(signatures.has(sig)){duplicates++;continue;}signatures.add(sig);out.push(item);
  }
  state.all=out;state.directory=directory;state.sourceName=name;state.audit={sourceRows:purchaseRows.length,processed:out.length,excluded,unclassified,duplicates,invalid,classRows:classRows.length,directoryRows:directory.size,directorySourceRows,duplicateClass,directoryDuplicates};
  state.filters=restoreFilters();state.page=1;
  updateFilterOptions();syncFilterControls();applyFilters(false);
  const max=out.reduce((m,r)=>!m||r.date>m?r.date:m,null);$('lastUpdated').textContent=max?`Actualizado: ${fmtShort.format(max)}`:'Actualizado: --/--';$('friendlyStatus').textContent=`${fmtNum.format(out.length)} compras disponibles para análisis`;$('sourceState').textContent='Excel cargado';$('rowState').textContent=`${fmtNum.format(purchaseRows.length)} filas leídas`;
}
function optionHtml(values,current,allLabel,labels={}){return `<option value="">${allLabel}</option>`+values.map(v=>`<option value="${escapeHtml(v)}"${v===current?' selected':''}>${escapeHtml(labels[v]||v)}</option>`).join('');}
function rowMatchesFilters(r,skip=''){const f=state.filters;if(skip!=='region'&&f.region&&r.region!==f.region)return false;if(skip!=='dm'&&f.dm&&r.dm!==f.dm)return false;if(skip!=='store'&&f.store&&r.store!==f.store)return false;if(skip!=='month'&&f.month&&r.month!==f.month)return false;if(skip!=='week'&&f.week&&r.week!==f.week)return false;if(skip!=='classifications'&&f.classifications.length&&!f.classifications.includes(r.classification))return false;if(skip!=='ingredient'&&f.ingredient&&r.ingredient!==f.ingredient)return false;if(skip!=='provider'&&f.provider&&r.provider!==f.provider)return false;if(skip!=='dateFrom'&&f.dateFrom&&r.dateKey<f.dateFrom)return false;if(skip!=='dateTo'&&f.dateTo&&r.dateKey>f.dateTo)return false;return true;}
function valuesFor(field){const rows=state.all.filter(r=>rowMatchesFilters(r,field));const key=field==='classifications'?'classification':field;return [...new Set(rows.map(r=>r[key]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));}
function updateFilterOptions(){
  const monthLabels={};for(const r of state.all)if(r.month&&!monthLabels[r.month])monthLabels[r.month]=fmtMonth.format(r.date).replace(/^./,c=>c.toUpperCase());
  const specs=[['region','regionFilter','Todas',{}],['dm','dmFilter','Todos',{}],['store','storeFilter','Todas',{}],['month','monthFilter','Todos',monthLabels],['week','weekFilter','Todas',{}],['ingredient','ingredientFilter','Todos',{}],['provider','providerFilter','Todos',{}]];
  for(const [field,id,label,labels] of specs){const vals=valuesFor(field);if(state.filters[field]&&!vals.includes(state.filters[field]))state.filters[field]='';$(id).innerHTML=optionHtml(vals,state.filters[field],label,labels);}
  renderClassificationOptions(valuesFor('classifications'));
}
function syncFilterControls(){const map={regionFilter:'region',dmFilter:'dm',storeFilter:'store',monthFilter:'month',weekFilter:'week',ingredientFilter:'ingredient',providerFilter:'provider',dateFromFilter:'dateFrom',dateToFilter:'dateTo',searchFilter:'search'};for(const [id,key] of Object.entries(map))if($(id))$(id).value=state.filters[key]||'';}
function renderClassificationOptions(values){
  const globalValues=[...new Set(state.all.map(r=>r.classification).filter(Boolean))];
  state.filters.classifications=state.filters.classifications.filter(v=>globalValues.includes(v));
  const available=[...new Set([...state.filters.classifications,...values])].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
  const q=normalize($('classificationSearch')?.value||'');const visible=available.filter(v=>!q||normalize(v).includes(q));
  $('classificationOptions').innerHTML=visible.map(v=>`<label class="multi-option"><input type="checkbox" value="${escapeHtml(v)}"${state.filters.classifications.includes(v)?' checked':''}><span>${escapeHtml(v)}</span></label>`).join('')||'<p class="multi-empty">Sin opciones.</p>';
  const count=state.filters.classifications.length;$('classificationLabel').textContent=count?`${count} seleccionada${count===1?'':'s'}`:'Todas';
}
function applyFilters(save=true){const q=normalize(state.filters.search);state.filtered=state.all.filter(r=>rowMatchesFilters(r)&&(!q||normalize([r.store,r.ceco,r.ingredient,r.provider,r.classification,r.region,r.dm,r.month,r.week].join(' ')).includes(q)));state.page=1;if(save)persistFilters();renderAll();}
function metrics(rows){const total=rows.reduce((s,r)=>s+r.total,0),units=rows.reduce((s,r)=>s+r.quantity,0);return{total,units,ingredients:new Set(rows.map(r=>normalize(r.ingredient))).size,stores:new Set(rows.map(r=>r.ceco)).size,ticket:rows.length?total/rows.length:0,last:rows.reduce((m,r)=>!m||r.date>m?r.date:m,null)};}
function renderKpis(){const m=metrics(state.filtered);const cards=[['Total Compra $',fmtMoney.format(m.total),'Importe filtrado'],['Total Unidades',fmtNum.format(m.units),'Cantidad acumulada'],['Total Ingredientes',fmtNum.format(m.ingredients),'Ingredientes únicos'],['Total Tiendas',fmtNum.format(m.stores),'CeCo únicos'],['Ticket Promedio',fmtMoney.format(m.ticket),'Por registro'],['Última actualización',m.last?fmtShort.format(m.last):'--/--','Fecha más reciente']];$('kpiGrid').innerHTML=cards.map(([a,b,c])=>`<article class="kpi"><p>${a}</p><strong title="${escapeHtml(b)}">${escapeHtml(b)}</strong><small>${c}</small></article>`).join('');}
function aggregate(rows,key,limit=999){const m=new Map();for(const r of rows){const k=r[key]||'Sin información';m.set(k,(m.get(k)||0)+r.total);}return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,limit);}
function aggregateByDate(rows){const m=new Map();for(const r of rows){const current=m.get(r.dateKey)||{date:r.date,total:0,quantity:0,count:0};current.total+=r.total;current.quantity+=r.quantity;current.count++;m.set(r.dateKey,current);}return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0]));}
function renderRanking(id,data){const max=data[0]?.[1]||1;$(id).innerHTML=data.slice(0,7).map(([k,v])=>`<div class="rank-row"><div><strong>${escapeHtml(k)}</strong><span>${fmtMoney.format(v)}</span><div class="rank-bar"><i style="width:${Math.max(2,v/max*100)}%"></i></div></div></div>`).join('')||'<p class="empty-state">Sin información.</p>';}
function sortedRows(){const {key,dir}=state.sort;return state.filtered.slice().sort((a,b)=>{let x=a[key],y=b[key];if(x instanceof Date)x=x.getTime();if(y instanceof Date)y=y.getTime();if(typeof x==='string')return x.localeCompare(y,'es',{numeric:true})*dir;return((x||0)-(y||0))*dir;});}
function renderTable(){const rows=sortedRows(),pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));state.page=Math.min(state.page,pages);const start=(state.page-1)*PAGE_SIZE,visible=rows.slice(start,start+PAGE_SIZE),totals=metrics(rows);$('tableBadge').textContent=`${fmtNum.format(rows.length)} registros`;$('subtotalQuantity').textContent=fmtNum.format(totals.units);$('subtotalPurchase').textContent=fmtMoney.format(totals.total);$('purchaseRows').innerHTML=visible.map(r=>`<tr><td><strong>${escapeHtml(r.store)}</strong></td><td>${escapeHtml(r.ingredient)}</td><td class="num">${fmtNum.format(r.quantity)}</td><td class="num"><strong>${fmtMoney.format(r.total)}</strong></td><td>${fmtDate.format(r.date)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty-state">No hay compras con los filtros actuales.</td></tr>';$('pageState').textContent=`Página ${state.page} de ${pages}`;$('prevPage').disabled=state.page<=1;$('nextPage').disabled=state.page>=pages;}
function svgBars(data){if(!data.length)return'<p class="empty-state">Sin información.</p>';const width=720,height=320,left=190,right=24,top=12,row=44,max=data[0][1]||1;const h=Math.min(height,top+data.length*row+10);return `<svg viewBox="0 0 ${width} ${h}" role="img">${data.map(([k,v],i)=>{const y=top+i*row,w=(width-left-right)*(v/max);return`<text x="${left-10}" y="${y+17}" text-anchor="end">${escapeHtml(truncate(k,28))}</text><rect class="bar ${i%2?'alt':''}" x="${left}" y="${y}" width="${Math.max(2,w)}" height="22" rx="8"></rect><text x="${left+Math.max(8,w)+7}" y="${y+16}">${escapeHtml(compactMoney(v))}</text>`}).join('')}</svg>`;}
function svgTrend(rows){const data=aggregateByDate(rows);if(!data.length)return'<p class="empty-state">Sin información.</p>';const width=720,height=320,pad={l:60,r:24,t:20,b:42},max=Math.max(...data.map(x=>x[1].total))||1;const x=i=>pad.l+(width-pad.l-pad.r)*(data.length===1?.5:i/(data.length-1));const y=v=>height-pad.b-(height-pad.t-pad.b)*(v/max);const pts=data.map((d,i)=>`${x(i)},${y(d[1].total)}`).join(' ');const area=`${pad.l},${height-pad.b} ${pts} ${x(data.length-1)},${height-pad.b}`;const ticks=[0,.25,.5,.75,1];return`<svg viewBox="0 0 ${width} ${height}" role="img"><polygon class="area" points="${area}"></polygon>${ticks.map(t=>`<line class="axis" x1="${pad.l}" y1="${y(max*t)}" x2="${width-pad.r}" y2="${y(max*t)}"></line><text x="${pad.l-8}" y="${y(max*t)+4}" text-anchor="end">${compactMoney(max*t)}</text>`).join('')}<polyline class="line" points="${pts}"></polyline>${data.map((d,i)=>`<circle class="trend-point" cx="${x(i)}" cy="${y(d[1].total)}" r="4"><title>${fmtDate.format(d[1].date)} · ${fmtNum.format(d[1].quantity)} unidades · ${fmtMoney.format(d[1].total)}</title></circle>`).join('')}${data.filter((_,i)=>i===0||i===data.length-1||i%Math.ceil(data.length/6)===0).map(d=>{const idx=data.indexOf(d);return`<text x="${x(idx)}" y="${height-16}" text-anchor="middle">${d[0].slice(5)}</text>`}).join('')}</svg>`;}
function renderCharts(){const r=state.filtered;$('chartClassification').innerHTML=svgBars(aggregate(r,'classification',7));$('chartStore').innerHTML=svgBars(aggregate(r,'store',7));$('chartDm').innerHTML=svgBars(aggregate(r,'dm',7));$('chartProvider').innerHTML=svgBars(aggregate(r,'provider',7));$('chartIngredient').innerHTML=svgBars(aggregate(r,'ingredient',7));$('chartTrend').innerHTML=svgTrend(r);}
function renderAll(){renderKpis();renderRanking('homeClassification',aggregate(state.filtered,'classification',7));renderRanking('homeStores',aggregate(state.filtered,'store',7));renderTable();renderCharts();$('filterCount').textContent=`${fmtNum.format(state.filtered.length)} de ${fmtNum.format(state.all.length)} registros visibles`;}
function compactMoney(v){return new Intl.NumberFormat('es-MX',{notation:'compact',style:'currency',currency:'MXN',maximumFractionDigits:1}).format(v);}
function truncate(s,n){s=text(s);return s.length>n?s.slice(0,n-1)+'…':s;}
function escapeHtml(v){return text(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function bind(){
  document.querySelectorAll('.nav-card').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.section)));
  const map=[['regionFilter','region'],['dmFilter','dm'],['storeFilter','store'],['monthFilter','month'],['weekFilter','week'],['ingredientFilter','ingredient'],['providerFilter','provider'],['dateFromFilter','dateFrom'],['dateToFilter','dateTo']];
  for(const [id,key] of map)$(id).addEventListener('change',e=>{state.filters[key]=e.target.value;updateFilterOptions();applyFilters();});
  $('classificationToggle').addEventListener('click',()=>{$('classificationMenu').classList.toggle('is-open');$('classificationToggle').setAttribute('aria-expanded',$('classificationMenu').classList.contains('is-open'));});
  $('classificationSearch').addEventListener('input',()=>renderClassificationOptions(valuesFor('classifications')));
  $('classificationOptions').addEventListener('change',e=>{if(!e.target.matches('input[type="checkbox"]'))return;const v=e.target.value;if(e.target.checked){if(!state.filters.classifications.includes(v))state.filters.classifications.push(v);}else state.filters.classifications=state.filters.classifications.filter(x=>x!==v);updateFilterOptions();applyFilters();});
  $('classificationAll').addEventListener('click',()=>{state.filters.classifications=valuesFor('classifications');updateFilterOptions();applyFilters();});
  $('classificationClear').addEventListener('click',()=>{state.filters.classifications=[];updateFilterOptions();applyFilters();});
  document.addEventListener('click',e=>{if(!e.target.closest('.multi-select')){$('classificationMenu').classList.remove('is-open');$('classificationToggle').setAttribute('aria-expanded','false');}});
  let timer;$('searchFilter').addEventListener('input',e=>{clearTimeout(timer);timer=setTimeout(()=>{state.filters.search=e.target.value;applyFilters();},180);});
  $('resetFilters').addEventListener('click',()=>{state.filters=defaultFilters();document.querySelectorAll('.filters-grid select,.filters-grid input').forEach(x=>{if(x.type==='checkbox')x.checked=false;else x.value='';});updateFilterOptions();applyFilters();});
  $('prevPage').addEventListener('click',()=>{state.page--;renderTable();});$('nextPage').addEventListener('click',()=>{state.page++;renderTable();});
  document.querySelectorAll('th[data-sort]').forEach(th=>th.addEventListener('click',()=>{const key=th.dataset.sort;state.sort=state.sort.key===key?{key,dir:-state.sort.dir}:{key,dir:key==='date'?-1:1};renderTable();}));
  $('exportExcel').addEventListener('click',exportExcel);
}
function switchView(view){state.view=view;document.querySelectorAll('.nav-card').forEach(b=>b.classList.toggle('is-active',b.dataset.section===view));document.querySelectorAll('.content-section').forEach(s=>s.classList.toggle('is-visible',s.dataset.view===view));}
function exportExcel(){const rows=sortedRows().map(r=>({Tienda:r.store,CeCo:r.ceco,Región:r.region,DM:r.dm,Mes:r.month,Semana:r.week,Ingrediente:r.ingredient,Clasificación:r.classification,'Unidad de Medida':r.unit,Cantidad:r.quantity,'Costo Unitario':r.unitCost,'Compra $':r.total,Proveedor:r.provider,Fecha:r.date}));const ws=XLSX.utils.json_to_sheet(rows,{cellDates:true});ws['!autofilter']={ref:ws['!ref']};ws['!cols']=[{wch:28},{wch:9},{wch:18},{wch:22},{wch:10},{wch:10},{wch:42},{wch:24},{wch:18},{wch:12},{wch:14},{wch:14},{wch:30},{wch:12}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Compras Filtradas');XLSX.writeFile(wb,'Compras_Centro_Norte.xlsx');}
function toast(msg,error=false){const n=$('toast');n.textContent=msg;n.style.background=error?'#8f1d21':'';n.classList.add('show');setTimeout(()=>n.classList.remove('show'),3200);}
async function init(){bind();try{const res=await fetch('data/Compras_Dtto_EC.xlsx',{cache:'no-store'});if(!res.ok)throw new Error('No fue posible cargar el Excel base.');await loadBuffer(await res.arrayBuffer(),'Compras_Dtto_EC.xlsx');}catch(err){console.error(err);$('friendlyStatus').textContent='No fue posible cargar la información';$('sourceState').textContent='Excel no disponible';toast(err.message,true);}if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(console.warn);}
document.addEventListener('DOMContentLoaded',init);
})();
