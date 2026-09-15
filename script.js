/* ===================== CONFIGURACIÓN BASE ===================== */
const MATERIALES_BASE = [
  {id:'romero', nombre:'Romero', unidad:'gr'},
  {id:'jengibre', nombre:'Jengibre', unidad:'gr'},
  {id:'curcuma', nombre:'Cúrcuma', unidad:'gr'},
  {id:'cebolla', nombre:'Cebolla', unidad:'u'},
  {id:'cera', nombre:'Cera de abejas', unidad:'gr'},
  {id:'pomos30', nombre:'Pomos vacíos de 30 ml', unidad:'u'},
  {id:'pomos60', nombre:'Pomos vacíos de 60 ml', unidad:'u'},
  {id:'goteros', nombre:'Pomos de gotero', unidad:'u'},
  {id:'pomosCrema', nombre:'Pomos vacíos de crema', unidad:'u'},
  {id:'pomosLimpios', nombre:'Pomos limpios', unidad:'u'}
];
const ETIQUETAS_BASE = ['romero','jengibre','curcuma','cebolla'];

function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
function hoyStr(){ return new Date().toISOString().slice(0,10); }
function fmt(n){ n=Number(n)||0; return '$'+n.toLocaleString('es-ES',{maximumFractionDigits:2}); }
function fmtCant(n){ n=Number(n)||0; return (Math.round(n*100)/100).toString(); }

function materialVacio(){ return {stock:0, avgCosto:0, gastoTotal:0}; }

function estadoInicial(){
  const inv = {
    girasol: materialVacio(),
    etiquetas: {},
    otros: []
  };
  MATERIALES_BASE.forEach(m=> inv[m.id] = materialVacio());
  ETIQUETAS_BASE.forEach(e=> inv.etiquetas[e] = materialVacio());

  const recetas = {
    aceiteRomero: {nombre:'Aceite de Romero', rinde:1, ultimaInversionUnidad:0, ingredientes:[
      {tipo:'girasol', cantidad:30}, {tipo:'etiqueta_romero', cantidad:1},
      {tipo:'pomos30', cantidad:1}, {tipo:'romero', cantidad:0.16}
    ]},
    aceiteJengibre: {nombre:'Aceite de Jengibre', rinde:1, ultimaInversionUnidad:0, ingredientes:[
      {tipo:'girasol', cantidad:30}, {tipo:'etiqueta_jengibre', cantidad:1},
      {tipo:'pomos30', cantidad:1}, {tipo:'jengibre', cantidad:0.16}
    ]},
    aceiteCurcuma: {nombre:'Aceite de Cúrcuma', rinde:1, ultimaInversionUnidad:0, ingredientes:[
      {tipo:'girasol', cantidad:30}, {tipo:'etiqueta_curcuma', cantidad:1},
      {tipo:'pomos30', cantidad:1}, {tipo:'curcuma', cantidad:0.16}
    ]},
    cremaCebolla: {nombre:'Crema de Cebolla', rinde:34, ultimaInversionUnidad:0, ingredientes:[
      {tipo:'cebolla', cantidad:2}, {tipo:'cera', cantidad:50}, {tipo:'girasol', cantidad:500}
    ]},
    otras: []
  };

  const tamanoDefault = ml => ({ml});
  const ventasCfg = {
    aceiteRomero: {tamanos:[tamanoDefault(30), tamanoDefault(60)]},
    aceiteJengibre: {tamanos:[tamanoDefault(30), tamanoDefault(60)]},
    aceiteCurcuma: {tamanos:[tamanoDefault(30), tamanoDefault(60)]},
    cremaCebolla: {tamanos:[tamanoDefault(null)]},
    domicilio: {precio:0}
  };

  return {
    pagina:'inicio',
    fabAbierto:false,
    fechaConsulta: hoyStr(),
    inv,
    recetas,
    stockFabricado: {aceiteRomero:0, aceiteJengibre:0, aceiteCurcuma:0, cremaCebolla:0},
    ventasCfg,
    ventas:[],
    ocultos: {materiales:[], recetas:[]}
  };
}

let state = estadoInicial();
let ingFormAbierto = {};

/* ===================== PERSISTENCIA ===================== */
function guardar(){
  try{ localStorage.setItem('negocio-app-v2', JSON.stringify(state)); }catch(e){}
}
function cargar(){
  try{
    const raw = localStorage.getItem('negocio-app-v2');
    if(raw){
      const parsed = JSON.parse(raw);
      state = {...estadoInicial(), ...parsed};
      state.inv = {...estadoInicial().inv, ...(parsed.inv||{})};
      state.recetas = {...estadoInicial().recetas, ...(parsed.recetas||{})};
      if(!Array.isArray(state.recetas.otras)) state.recetas.otras = [];
      state.ventasCfg = {...estadoInicial().ventasCfg, ...(parsed.ventasCfg||{})};
      state.ocultos = {materiales:[], recetas:[], ...(parsed.ocultos||{})};
      if(!Array.isArray(state.ocultos.materiales)) state.ocultos.materiales=[];
      if(!Array.isArray(state.ocultos.recetas)) state.ocultos.recetas=[];
    }
  }catch(e){}
  render();
}
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 1600);
}

/* ===================== MATERIALES ===================== */
function getMaterial(tipo){
  if(tipo==='girasol') return state.inv.girasol;
  if(tipo.startsWith('etiqueta_')) return state.inv.etiquetas[tipo.replace('etiqueta_','')];
  if(tipo.startsWith('otro_')) return state.inv.otros.find(o=>o.id===tipo);
  return state.inv[tipo];
}
function nombreMaterial(tipo){
  if(tipo==='girasol') return 'Aceite de girasol';
  if(tipo.startsWith('etiqueta_')) return 'Etiqueta '+cap(tipo.replace('etiqueta_',''));
  if(tipo.startsWith('otro_')){ const o=state.inv.otros.find(x=>x.id===tipo); return o?o.nombre:tipo; }
  const b = MATERIALES_BASE.find(m=>m.id===tipo);
  return b?b.nombre:tipo;
}
function unidadMaterial(tipo){
  if(tipo==='girasol') return 'ml';
  if(tipo.startsWith('etiqueta_')) return 'u';
  if(tipo.startsWith('otro_')){ const o=state.inv.otros.find(x=>x.id===tipo); return o?o.unidad:'u'; }
  const b = MATERIALES_BASE.find(m=>m.id===tipo);
  return b?b.unidad:'u';
}
function optionsMateriales(){
  let opts = [`<option value="girasol">Aceite de girasol (ml)</option>`];
  MATERIALES_BASE.forEach(m=>opts.push(`<option value="${m.id}">${m.nombre}</option>`));
  ETIQUETAS_BASE.forEach(e=>opts.push(`<option value="etiqueta_${e}">Etiqueta ${cap(e)}</option>`));
  state.inv.otros.forEach(o=>opts.push(`<option value="${o.id}">${o.nombre}</option>`));
  return opts.join('');
}
function registrarCompra(tipo, cantidad, precioTotal){
  const m = getMaterial(tipo);
  if(!m || !(cantidad>0)) return;
  const nuevoStock = (m.stock||0) + cantidad;
  m.avgCosto = nuevoStock>0 ? (((m.stock||0)*(m.avgCosto||0)+precioTotal)/nuevoStock) : 0;
  m.stock = nuevoStock;
  m.gastoTotal = (m.gastoTotal||0) + precioTotal;
}
function consumirMaterial(tipo, cantidad){
  const m = getMaterial(tipo);
  if(!m) return;
  m.stock = Math.max(0, (m.stock||0) - cantidad);
}
function costoUnitario(tipo){
  const m = getMaterial(tipo);
  return m ? (m.avgCosto||0) : 0;
}

/* ===================== RECETAS / FABRICACIÓN ===================== */
function getRecetaRef(id){
  if(state.recetas[id]) return state.recetas[id];
  return state.recetas.otras.find(r=>r.id===id);
}
function listaRecetas(){
  const fijas = ['aceiteRomero','aceiteJengibre','aceiteCurcuma','cremaCebolla']
    .filter(id=>!estaOcultaReceta(id))
    .map(id=>({id, ...state.recetas[id]}));
  const otras = state.recetas.otras.filter(r=>!estaOcultaReceta(r.id)).map(r=>({...r}));
  return [...fijas, ...otras];
}
function fabricar(id, cantidadFabricada){
  const r = getRecetaRef(id);
  if(!r || !(cantidadFabricada>0)) return;
  const factor = cantidadFabricada/(r.rinde||1);
  let costoTotal = 0;
  r.ingredientes.forEach(ing=>{
    const cantUsada = ing.cantidad*factor;
    costoTotal += cantUsada*costoUnitario(ing.tipo);
    consumirMaterial(ing.tipo, cantUsada);
  });
  r.ultimaInversionUnidad = costoTotal/cantidadFabricada;
  if(!(id in state.stockFabricado)) state.stockFabricado[id]=0;
  state.stockFabricado[id] += cantidadFabricada;
}
function getVentasCfgFor(id){
  if(!state.ventasCfg[id]) state.ventasCfg[id] = {tamanos:[{ml:null}]};
  return state.ventasCfg[id];
}

/* ===================== VENTAS ===================== */
function guardarVentaPuntual(productoId, ml, cantU, precioU, cantC, precioC){
  const cantidadTotal = cantU+cantC;
  if(cantidadTotal<=0) return false;
  const total = cantU*precioU + cantC*precioC;
  const receta = getRecetaRef(productoId);
  const inversionUnidad = receta ? (receta.ultimaInversionUnidad||0) : 0;
  state.ventas.push({id:Date.now()+Math.random(), fecha:hoyStr(), productoId, ml: ml==='null'?null:Number(ml), cantidad:cantidadTotal, total, inversionUnidad});
  return true;
}
function registrarDomicilio(precio){
  if(!(precio>0)) return;
  state.ventas.push({id:Date.now()+Math.random(), fecha:hoyStr(), productoId:'domicilio', ml:null, cantidad:1, total:precio, inversionUnidad:0});
}
function disponibles(id){
  const totalFab = state.stockFabricado[id]||0;
  const vendidos = state.ventas.filter(v=>v.productoId===id).reduce((s,v)=>s+(Number(v.cantidad)||0),0);
  return Math.max(0, totalFab - vendidos);
}
function estaOculto(tipo){ return state.ocultos.materiales.includes(tipo); }
function estaOcultaReceta(id){ return state.ocultos.recetas.includes(id); }
function calcResumen(){
  let ventasTotal=0, inversionTotal=0, pomosVendidos=0;
  state.ventas.forEach(v=>{
    ventasTotal += Number(v.total)||0;
    if(v.productoId!=='domicilio'){
      inversionTotal += (Number(v.inversionUnidad)||0)*(Number(v.cantidad)||0);
      pomosVendidos += Number(v.cantidad)||0;
    }
  });
  let gastoTotal = (state.inv.girasol.gastoTotal||0);
  MATERIALES_BASE.forEach(m=> gastoTotal += (state.inv[m.id].gastoTotal||0));
  ETIQUETAS_BASE.forEach(e=> gastoTotal += (state.inv.etiquetas[e].gastoTotal||0));
  state.inv.otros.forEach(o=> gastoTotal += (o.gastoTotal||0));
  return {ventasTotal, inversionTotal, gananciaTotal: ventasTotal-inversionTotal, gastoTotal, pomosVendidos};
}
function exportarMes(){
  const hoy = new Date();
  const ym = hoy.toISOString().slice(0,7);
  const nombreMes = hoy.toLocaleDateString('es-ES',{month:'long', year:'numeric'});
  const ventasMes = state.ventas.filter(v=>v.fecha && v.fecha.startsWith(ym));
  let total=0, inversion=0;
  const lineas = ventasMes.map(v=>{
    total += Number(v.total)||0;
    if(v.productoId!=='domicilio') inversion += (Number(v.inversionUnidad)||0)*(Number(v.cantidad)||0);
    const nombreProd = v.productoId==='domicilio' ? 'Domicilio' : nombreProducto(v.productoId);
    return `${v.fecha} | ${nombreProd}${v.ml?` (${v.ml}ml)`:''} x${v.cantidad} = ${fmt(v.total)}`;
  }).join('\n') || 'Sin ventas registradas este mes.';
  const contenido = `Registro de ${nombreMes}\n\n${lineas}\n\nTotal vendido: ${fmt(total)}\nInversión: ${fmt(inversion)}\nGanancia: ${fmt(total-inversion)}\n`;
  const blob = new Blob([contenido], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Registro-${nombreMes.replace(' ','-')}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function nombreProducto(id){
  const r = getRecetaRef(id);
  return r ? r.nombre : id;
}

/* ===================== RENDER ===================== */
function render(){
  const cont = document.getElementById('app');
  let html = '';
  if(state.pagina==='inicio') html = viewInicio();
  else if(state.pagina==='inventario') html = viewInventario();
  else if(state.pagina==='fabricacion') html = viewFabricacion();
  else if(state.pagina==='ventas') html = viewVentas();

  html += `
    <div class="fab-wrap">
      ${state.fabAbierto ? `
        <button class="fab-mini" data-ir="ventas"><span class="ico">💵</span> Ventas</button>
        <button class="fab-mini" data-ir="fabricacion"><span class="ico">🌿</span> Fabricación</button>
        <button class="fab-mini" data-ir="inventario"><span class="ico">🪑</span> Inventario</button>
      ` : ''}
      <button class="fab" id="btn-fab">${state.fabAbierto?'✕':'☰'}</button>
    </div>
  `;
  cont.innerHTML = html;
  bindEventos();
}

function viewInicio(){
  const r = calcResumen();
  return `
    <header>
      <h1>Mi Negocio</h1>
      <p>Cosmética natural · resumen general</p>
    </header>
    <div class="card">
      <h2>Resumen</h2>
      <div class="resumen-grid">
        <div class="mini"><div class="num">${fmt(r.ventasTotal)}</div><div class="lab">VENTAS TOTALES</div></div>
        <div class="mini"><div class="num">${fmt(r.gananciaTotal)}</div><div class="lab">GANANCIA</div></div>
        <div class="mini"><div class="num">${fmt(r.inversionTotal)}</div><div class="lab">INVERSIÓN EN VENTAS</div></div>
        <div class="mini"><div class="num">${fmt(r.gastoTotal)}</div><div class="lab">GASTO EN MATERIA PRIMA</div></div>
      </div>
      <div class="prod-row"><div class="prod-name">Pomos vendidos en total</div><div style="font-weight:700;">${r.pomosVendidos}</div></div>
    </div>
    <div class="card">
      <h2>Registro y respaldo</h2>
      <button class="btn btn-sec" id="btn-guardar-todo">💾 Guardar todo ahora</button>
      <button class="btn btn-ghost" id="btn-exportar-mes">📄 Descargar registro del mes</button>
      <div class="acc-info">Todo se guarda solo, en este teléfono, dentro del navegador — no necesita internet ni una base de datos externa. El botón de arriba es por si quieres forzar el guardado o exportar el mes a un archivo descargable.</div>
    </div>
    <div class="vacio">Toca el botón ☰ de abajo a la derecha para ir a Inventario, Fabricación o Ventas.</div>
  `;
}

function paginaHeader(titulo){
  return `<div class="page-header"><button class="back-btn" id="btn-volver">←</button><h1>${titulo}</h1></div>`;
}

/* ---------- INVENTARIO ---------- */
function filaCompraMaterial(tipo){
  const m = getMaterial(tipo);
  const nombre = nombreMaterial(tipo);
  const unidad = unidadMaterial(tipo);
  return `
    <details class="acc">
      <summary>${nombre} <span class="acc-stock">${fmtCant(m.stock)} ${unidad}</span></summary>
      <div class="acc-body">
        <div class="campo"><label>Cantidad comprada (${unidad})</label><input type="number" step="any" id="compra-cant-${tipo}" placeholder="0"></div>
        <div class="campo"><label>Precio total pagado</label><input type="number" step="any" id="compra-precio-${tipo}" placeholder="0"></div>
        <button class="btn btn-sec" data-agregar-compra="${tipo}">Agregar al inventario</button>
        <div class="acc-info">Costo promedio: ${fmt(m.avgCosto)} por ${unidad} · Gastado en total: ${fmt(m.gastoTotal)}</div>
        <button class="btn-mini" style="border-color:#e3b9b0;color:var(--cebolla);margin-top:8px;" data-eliminar-material="${tipo}">🗑 Eliminar este producto</button>
      </div>
    </details>`;
}
function viewInventario(){
  const g = state.inv.girasol;
  let html = paginaHeader('Inventario');

  if(!estaOculto('girasol')){
    html += `
      <details class="acc">
        <summary>Aceite de girasol <span class="acc-stock">${fmtCant(g.stock)} ml</span></summary>
        <div class="acc-body">
          <div class="campo"><label>Tamaño del pomo comprado</label>
            <select id="girasol-tam"><option value="700">700 ml</option><option value="900">900 ml</option><option value="1000">1000 ml</option></select>
          </div>
          <div class="campo"><label>Cantidad de pomos comprados</label><input type="number" id="girasol-cant" placeholder="0"></div>
          <div class="campo"><label>Precio por pomo</label><input type="number" id="girasol-precio" placeholder="0"></div>
          <button class="btn btn-sec" id="btn-agregar-girasol">Agregar al inventario</button>
          <div class="acc-info">Costo promedio: ${fmt(g.avgCosto)} por ml · Gastado en total: ${fmt(g.gastoTotal)}</div>
          <button class="btn-mini" style="border-color:#e3b9b0;color:var(--cebolla);margin-top:8px;" data-eliminar-material="girasol">🗑 Eliminar este producto</button>
        </div>
      </details>
    `;
  }

  ['romero','jengibre','curcuma','cebolla','cera','pomos30','pomos60','goteros','pomosCrema'].filter(id=>!estaOculto(id)).forEach(id=>{
    html += filaCompraMaterial(id);
  });

  const etiquetasVisibles = ETIQUETAS_BASE.filter(e=>!estaOculto('etiqueta_'+e));
  if(etiquetasVisibles.length){
    html += `<details class="acc"><summary>Etiquetas</summary><div class="acc-body">`;
    etiquetasVisibles.forEach(e=>{ html += filaCompraMaterial('etiqueta_'+e); });
    html += `</div></details>`;
  }

  if(!estaOculto('pomosLimpios')) html += filaCompraMaterial('pomosLimpios');

  state.inv.otros.forEach(o=>{ html += filaCompraMaterial(o.id); });

  html += `
    <div class="card">
      <button class="btn-mini" id="btn-toggle-otro">+ Agregar otro producto</button>
      <div class="form-inline" id="form-otro">
        <div class="campo"><label>Nombre del producto</label><input type="text" id="otro-nombre" placeholder="ej. Manzanilla"></div>
        <div class="campo"><label>Unidad de medida</label><input type="text" id="otro-unidad" placeholder="ej. gr, ml, u"></div>
        <button class="btn" id="btn-confirmar-otro">Agregar al inventario</button>
      </div>
    </div>
  `;
  return html;
}

/* ---------- FABRICACIÓN ---------- */
function viewFabricacion(){
  let html = paginaHeader('Fabricación');
  listaRecetas().forEach(r=>{
    const stockFab = disponibles(r.id);
    html += `
      <details class="acc">
        <summary>${r.nombre} <span class="acc-stock">${stockFab} listos</span></summary>
        <div class="acc-body">
          <div class="acc-info" style="margin-bottom:6px;">Ingredientes para ${r.rinde>1?`un lote de ${r.rinde} unidades`:'1 unidad'}:</div>
          ${r.ingredientes.map((ing,i)=>`
            <div class="ing-row">
              <span>${nombreMaterial(ing.tipo)}</span>
              <input type="number" step="any" value="${ing.cantidad}" data-receta="${r.id}" data-ing-index="${i}">
              <span class="unidad">${unidadMaterial(ing.tipo)}</span>
              <button class="del-x" data-del-ing="${r.id}" data-del-ing-index="${i}">✕</button>
            </div>
          `).join('') || '<div class="acc-info">Aún no tiene ingredientes.</div>'}
          <button class="btn-mini" data-toggle-ing="${r.id}">+ agregar ingrediente</button>
          <div class="ing-nuevo${ingFormAbierto[r.id]?' show':''}" id="ing-nuevo-${r.id}">
            <select id="ing-tipo-${r.id}">${optionsMateriales()}</select>
            <input type="number" id="ing-cant-${r.id}" placeholder="cantidad">
            <button class="btn-mini" style="width:auto;padding:8px 10px;margin:0;" data-confirmar-ing="${r.id}">Agregar</button>
          </div>
          <div class="campo"><label>Cantidad fabricada ahora</label><input type="number" id="fab-cant-${r.id}" placeholder="0"></div>
          <button class="btn" data-fabricar="${r.id}">Fabricar y descontar del inventario</button>
          <div class="acc-info">Inversión por unidad (última fabricación): ${fmt(r.ultimaInversionUnidad)}</div>
          <button class="btn-mini" style="border-color:#e3b9b0;color:var(--cebolla);margin-top:8px;" data-eliminar-receta="${r.id}">🗑 Eliminar este producto</button>
        </div>
      </details>
    `;
  });
  html += `
    <div class="card">
      <button class="btn-mini" id="btn-toggle-receta">+ Agregar producto nuevo</button>
      <div class="form-inline" id="form-nueva-receta">
        <div class="campo"><label>Nombre del producto</label><input type="text" id="nueva-receta-nombre" placeholder="ej. Aceite de manzanilla"></div>
        <div class="campo"><label>¿Cuántas unidades rinden estos ingredientes? (deja 1 si es por unidad)</label><input type="number" id="nueva-receta-rinde" placeholder="1"></div>
        <button class="btn" id="btn-confirmar-receta">Crear producto</button>
      </div>
    </div>
  `;
  return html;
}

/* ---------- VENTAS ---------- */
function viewVentas(){
  let html = paginaHeader('Ventas');

  listaRecetas().forEach(r=>{
    const cfg = getVentasCfgFor(r.id);
    const stockFab = disponibles(r.id);
    html += `
      <details class="acc">
        <summary>${r.nombre} <span class="acc-stock">${stockFab} disponibles</span></summary>
        <div class="acc-body">
          ${cfg.tamanos.map((t,i)=>`
            <div class="acc-info" style="margin:6px 0 2px;font-weight:700;color:var(--verde-oscuro);">${t.ml?`Presentación de ${t.ml} ml`:'Venta'}</div>
            <div class="campo"><label>Cantidad de pomos por unidad</label><input type="number" step="any" id="v-cantU-${r.id}-${i}" placeholder="0"></div>
            <div class="campo"><label>Precio por unidad</label><input type="number" step="any" id="v-precioU-${r.id}-${i}" placeholder="0"></div>
            <div class="campo"><label>Cantidad de pomos por cantidad</label><input type="number" step="any" id="v-cantC-${r.id}-${i}" placeholder="0"></div>
            <div class="campo"><label>Precio por cantidad</label><input type="number" step="any" id="v-precioC-${r.id}-${i}" placeholder="0"></div>
            <button class="btn" data-guardar-venta="${r.id}" data-guardar-venta-tam="${i}" data-guardar-venta-ml="${t.ml}">Guardar venta</button>
            ${cfg.tamanos.length>1?`<button class="btn-mini" style="border-color:#e3b9b0;color:var(--cebolla);" data-eliminar-tam="${r.id}" data-eliminar-tam-index="${i}">🗑 Quitar esta presentación</button>`:''}
          `).join('')}
          <button class="btn-mini" data-toggle-tam="${r.id}">+ agregar otra cantidad (ml)</button>
          <div class="form-inline" id="form-tam-${r.id}">
            <div class="campo"><label>¿Cuántos ml tiene esta nueva presentación?</label><input type="number" id="nuevotam-ml-${r.id}" placeholder="ej. 15"></div>
            <button class="btn-mini" style="width:auto;padding:8px 10px;" data-confirmar-tam="${r.id}">Agregar presentación</button>
          </div>
          <div class="acc-info">Inversión por pomo: ${fmt(r.ultimaInversionUnidad)}</div>
          <button class="btn-mini" style="border-color:#e3b9b0;color:var(--cebolla);" data-eliminar-receta="${r.id}">🗑 Eliminar este producto de Ventas</button>
        </div>
      </details>
    `;
  });

  html += `
    <details class="acc">
      <summary>Domicilio</summary>
      <div class="acc-body">
        <div class="campo"><label>Precio del domicilio</label><input type="number" id="domicilio-precio" placeholder="0"></div>
        <button class="btn" id="btn-registrar-domicilio">Registrar domicilio (se suma a la ganancia)</button>
      </div>
    </details>
  `;

  const ventasDia = state.ventas.filter(v=>v.fecha===state.fechaConsulta);
  const totalDia = ventasDia.reduce((s,v)=>s+Number(v.total),0);
  const cantDia = ventasDia.reduce((s,v)=>s+ (v.productoId==='domicilio'?0:Number(v.cantidad)),0);
  const inversionDia = ventasDia.reduce((s,v)=>s + (v.productoId==='domicilio'?0:(Number(v.inversionUnidad)||0)*Number(v.cantidad)),0);
  const listaDia = ventasDia.map(v=>`
    <div class="venta-item"><div class="izq"><b>${v.productoId==='domicilio'?'Domicilio':nombreProducto(v.productoId)+' ×'+v.cantidad}</b></div><div class="der">${fmt(v.total)}</div></div>
  `).join('') || '<div class="vacio">Sin ventas ese día</div>';

  html += `
    <div class="card">
      <h2>Calendario — ventas por día</h2>
      <div class="campo"><input type="date" id="v-fecha-consulta" value="${state.fechaConsulta}"></div>
      <div class="resumen-grid">
        <div class="mini"><div class="num">${fmt(totalDia)}</div><div class="lab">VENDIDO ESE DÍA</div></div>
        <div class="mini"><div class="num">${cantDia}</div><div class="lab">POMOS VENDIDOS</div></div>
      </div>
      <div class="prod-row"><div class="prod-name">Inversión ese día</div><div style="font-weight:700;">${fmt(inversionDia)}</div></div>
      ${listaDia}
    </div>
  `;

  const lista = [...state.ventas].reverse().slice(0,30).map(v=>{
    return `
    <div class="venta-item">
      <div class="izq"><b>${v.productoId==='domicilio'?'Domicilio':nombreProducto(v.productoId)+' ×'+v.cantidad}</b><span>${v.fecha}</span></div>
      <div style="display:flex;align-items:center;">
        <div class="der">${fmt(v.total)}</div>
        <button class="del-x" data-del="${v.id}">✕</button>
      </div>
    </div>`;
  }).join('') || '<div class="vacio">Aún no has registrado ventas</div>';

  html += `<div class="card"><h2>Historial reciente</h2>${lista}</div>`;
  return html;
}

/* ===================== EVENTOS ===================== */
function bindEventos(){
  const btnFab = document.getElementById('btn-fab');
  if(btnFab) btnFab.onclick = ()=>{ state.fabAbierto = !state.fabAbierto; render(); };

  document.querySelectorAll('[data-ir]').forEach(b=>{
    b.onclick = ()=>{ state.pagina = b.dataset.ir; state.fabAbierto=false; render(); };
  });
  const btnVolver = document.getElementById('btn-volver');
  if(btnVolver) btnVolver.onclick = ()=>{ state.pagina='inicio'; render(); };

  const btnGuardar = document.getElementById('btn-guardar-todo');
  if(btnGuardar) btnGuardar.onclick = ()=>{ guardar(); toast('Guardado ✔'); };
  const btnExportar = document.getElementById('btn-exportar-mes');
  if(btnExportar) btnExportar.onclick = exportarMes;

  // Inventario: compras de materiales simples
  document.querySelectorAll('[data-agregar-compra]').forEach(b=>{
    b.onclick = ()=>{
      const tipo = b.dataset.agregarCompra;
      const cant = Number(document.getElementById('compra-cant-'+tipo).value)||0;
      const precio = Number(document.getElementById('compra-precio-'+tipo).value)||0;
      if(cant>0){ registrarCompra(tipo, cant, precio); guardar(); render(); toast('Inventario actualizado'); }
    };
  });
  const btnGirasol = document.getElementById('btn-agregar-girasol');
  if(btnGirasol){
    btnGirasol.onclick = ()=>{
      const tam = Number(document.getElementById('girasol-tam').value)||0;
      const cant = Number(document.getElementById('girasol-cant').value)||0;
      const precioPomo = Number(document.getElementById('girasol-precio').value)||0;
      if(cant>0){ registrarCompra('girasol', tam*cant, precioPomo*cant); guardar(); render(); toast('Inventario actualizado'); }
    };
  }
  const btnToggleOtro = document.getElementById('btn-toggle-otro');
  if(btnToggleOtro) btnToggleOtro.onclick = ()=> document.getElementById('form-otro').classList.toggle('show');
  const btnConfirmarOtro = document.getElementById('btn-confirmar-otro');
  if(btnConfirmarOtro){
    btnConfirmarOtro.onclick = ()=>{
      const nombre = document.getElementById('otro-nombre').value.trim();
      const unidad = document.getElementById('otro-unidad').value.trim() || 'u';
      if(!nombre) return;
      state.inv.otros.push({id:'otro_'+Date.now(), nombre, unidad, stock:0, avgCosto:0, gastoTotal:0});
      guardar(); render(); toast('Producto agregado');
    };
  }

  // Fabricación
  document.querySelectorAll('[data-receta][data-ing-index]').forEach(inp=>{
    inp.onchange = ()=>{
      const r = getRecetaRef(inp.dataset.receta);
      if(r) r.ingredientes[Number(inp.dataset.ingIndex)].cantidad = Number(inp.value)||0;
      guardar();
    };
  });
  document.querySelectorAll('[data-toggle-ing]').forEach(b=>{
    b.onclick = ()=>{
      const id = b.dataset.toggleIng;
      ingFormAbierto[id] = !ingFormAbierto[id];
      render();
    };
  });
  document.querySelectorAll('[data-confirmar-ing]').forEach(b=>{
    b.onclick = ()=>{
      const id = b.dataset.confirmarIng;
      const tipo = document.getElementById('ing-tipo-'+id).value;
      const cant = Number(document.getElementById('ing-cant-'+id).value)||0;
      if(cant>0){
        const r = getRecetaRef(id);
        r.ingredientes.push({tipo, cantidad:cant});
        ingFormAbierto[id] = true;
        guardar(); render(); toast('Ingrediente agregado');
      }
    };
  });
  document.querySelectorAll('[data-del-ing]').forEach(b=>{
    b.onclick = ()=>{
      const r = getRecetaRef(b.dataset.delIng);
      if(r) r.ingredientes.splice(Number(b.dataset.delIngIndex),1);
      guardar(); render();
    };
  });
  document.querySelectorAll('[data-fabricar]').forEach(b=>{
    b.onclick = ()=>{
      const id = b.dataset.fabricar;
      const cant = Number(document.getElementById('fab-cant-'+id).value)||0;
      if(cant>0){ fabricar(id, cant); guardar(); render(); toast('Fabricación registrada'); }
    };
  });
  const btnToggleReceta = document.getElementById('btn-toggle-receta');
  if(btnToggleReceta) btnToggleReceta.onclick = ()=> document.getElementById('form-nueva-receta').classList.toggle('show');
  const btnConfirmarReceta = document.getElementById('btn-confirmar-receta');
  if(btnConfirmarReceta){
    btnConfirmarReceta.onclick = ()=>{
      const nombre = document.getElementById('nueva-receta-nombre').value.trim();
      const rinde = Number(document.getElementById('nueva-receta-rinde').value)||1;
      if(!nombre) return;
      const id = 'r_'+Date.now();
      state.recetas.otras.push({id, nombre, rinde, ultimaInversionUnidad:0, ingredientes:[]});
      state.stockFabricado[id]=0;
      guardar(); render(); toast('Producto creado');
    };
  }

  // Ventas: configuración de precios
  document.querySelectorAll('[data-guardar-venta]').forEach(b=>{
    b.onclick = ()=>{
      const id = b.dataset.guardarVenta;
      const i = b.dataset.guardarVentaTam;
      const ml = b.dataset.guardarVentaMl;
      const cantU = Number(document.getElementById(`v-cantU-${id}-${i}`).value)||0;
      const precioU = Number(document.getElementById(`v-precioU-${id}-${i}`).value)||0;
      const cantC = Number(document.getElementById(`v-cantC-${id}-${i}`).value)||0;
      const precioC = Number(document.getElementById(`v-precioC-${id}-${i}`).value)||0;
      if(guardarVentaPuntual(id, ml, cantU, precioU, cantC, precioC)){
        guardar(); render(); toast('Venta guardada');
      }
    };
  });
  document.querySelectorAll('[data-eliminar-material]').forEach(b=>{
    b.onclick = ()=>{
      const tipo = b.dataset.eliminarMaterial;
      if(tipo.startsWith('otro_')) state.inv.otros = state.inv.otros.filter(o=>o.id!==tipo);
      else if(!state.ocultos.materiales.includes(tipo)) state.ocultos.materiales.push(tipo);
      guardar(); render(); toast('Producto eliminado');
    };
  });
  document.querySelectorAll('[data-eliminar-receta]').forEach(b=>{
    b.onclick = ()=>{
      const id = b.dataset.eliminarReceta;
      if(id.startsWith('r_')) state.recetas.otras = state.recetas.otras.filter(r=>r.id!==id);
      else if(!state.ocultos.recetas.includes(id)) state.ocultos.recetas.push(id);
      guardar(); render(); toast('Producto eliminado');
    };
  });
  document.querySelectorAll('[data-eliminar-tam]').forEach(b=>{
    b.onclick = ()=>{
      const cfg = getVentasCfgFor(b.dataset.eliminarTam);
      cfg.tamanos.splice(Number(b.dataset.eliminarTamIndex),1);
      guardar(); render(); toast('Presentación eliminada');
    };
  });
  document.querySelectorAll('[data-toggle-tam]').forEach(b=>{
    b.onclick = ()=> document.getElementById('form-tam-'+b.dataset.toggleTam).classList.toggle('show');
  });
  document.querySelectorAll('[data-confirmar-tam]').forEach(b=>{
    b.onclick = ()=>{
      const id = b.dataset.confirmarTam;
      const ml = Number(document.getElementById('nuevotam-ml-'+id).value)||null;
      if(!ml) return;
      const cfg = getVentasCfgFor(id);
      cfg.tamanos.push({ml});
      guardar(); render(); toast('Presentación agregada');
    };
  });
  const btnDomicilio = document.getElementById('btn-registrar-domicilio');
  if(btnDomicilio){
    btnDomicilio.onclick = ()=>{
      const precio = Number(document.getElementById('domicilio-precio').value)||0;
      if(precio>0){ registrarDomicilio(precio); guardar(); render(); toast('Domicilio registrado'); }
    };
  }
  const vFecha = document.getElementById('v-fecha-consulta');
  if(vFecha) vFecha.onchange = ()=>{ state.fechaConsulta = vFecha.value || state.fechaConsulta; guardar(); render(); };

  document.querySelectorAll('[data-del]').forEach(b=>{
    b.onclick = ()=>{
      const id = Number(b.dataset.del);
      state.ventas = state.ventas.filter(v=>v.id!==id);
      guardar(); render();
    };
  });
}

cargar();
