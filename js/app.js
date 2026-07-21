const API = 'https://fcpohtkfwpsdfwwlqqpk.supabase.co/rest/v1'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjcG9odGtmd3BzZGZ3d2xxcXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDYxOTYsImV4cCI6MjEwMDIyMjE5Nn0.eG7DZVWzyq_UAki7QudLzVXhzfzB-02j3GXf-zRIOmI'
const BODEGA_ID = '11111111-1111-1111-1111-111111111111'

function auth() {
  return { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Accept': 'application/json' }
}

async function get(path) {
  const r = await fetch(`${API}${path}`, { headers: auth() })
  if (!r.ok) throw new Error(r.statusText)
  return r.json()
}

async function post(path, data) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { ...auth(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(data)
  })
  if (!r.ok) throw new Error(r.statusText)
}

async function patch(path, data) {
  const r = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { ...auth(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(data)
  })
  if (!r.ok) throw new Error(r.statusText)
}

let carrito = []
let todasCategorias = []
let inventarioData = []
let categoriaActiva = ''
let busquedaTimeout

document.addEventListener('DOMContentLoaded', initApp)

function initApp() {
  setTimeout(() => {
    document.getElementById('splash').classList.add('hidden')
    cargarDashboard()
    cargarCategorias()
    cargarCategoriasSelect()
    lucide.createIcons()
  }, 1500)
}

function navigateTo(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
  document.getElementById(`sec-${section}`).classList.add('active')
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
  document.querySelector(`.nav-item[data-section="${section}"]`).classList.add('active')
  document.getElementById('content').scrollTop = 0
  if (section === 'ventas') {
    document.getElementById('ventas-search').focus()
    cargarVentasSearch()
    renderFloatingCart()
  }
  if (section === 'inventario') cargarInventario()
  if (section === 'alertas') cargarAlertas()
  if (section === 'recomendaciones') cargarRecomendaciones()
  if (section === 'inicio') cargarDashboard()
  setTimeout(() => lucide.createIcons(), 50)
}

function mostrarToast(msg, tipo) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.className = `toast toast-${tipo} show`
  setTimeout(() => t.classList.remove('show'), 3000)
}

// === DASHBOARD ===

async function cargarDashboard() {
  try {
    const d = await get(`/bodegas?select=*&id=eq.${BODEGA_ID}&limit=1`)
    if (d.length) document.getElementById('greeting').textContent = `¡Hola, ${d[0].nombre_dueno}!`
  } catch (_) {}

  try {
    const d = await get(`/vista_resumen_hoy?select=*&bodega_id=eq.${BODEGA_ID}&limit=1`)
    if (d.length) {
      document.getElementById('ventas-hoy').innerHTML = `S/ ${Number(d[0].ventas_hoy || 0).toFixed(2)}`
      document.getElementById('margen-hoy').innerHTML = `S/ ${Number(d[0].margen_estimado || 0).toFixed(2)}`
      document.getElementById('inventario-total').textContent = d[0].inventario_total || 0
    }
  } catch (_) {}

  try {
    const d = await get(`/vista_productos_por_vencer?select=id&bodega_id=eq.${BODEGA_ID}`)
    document.getElementById('por-vencer').textContent = d.length
  } catch (_) {}

  try {
    const d = await get(`/recomendaciones?select=id&vigente=eq.true&bodega_id=eq.${BODEGA_ID}`)
    document.getElementById('sugerencias').textContent = d.length
  } catch (_) {}

  try {
    const d = await get(`/vista_inventario_estado?select=*&bodega_id=eq.${BODEGA_ID}`)
    if (d.length) {
      const ok = d.filter(p => p.estado_stock === 'OK').length
      const pct = (ok / d.length * 100)
      document.getElementById('donut-stock').setAttribute('stroke-dasharray', `${pct} ${100 - pct}`)
    }
  } catch (_) {}

  setTimeout(() => lucide.createIcons(), 50)
}

// === CATEGORÍAS ===

async function cargarCategorias() {
  try {
    const data = await get('/categorias?select=*')
    if (!data.length) return
    todasCategorias = data
    const chips = document.getElementById('categoria-chips')
    data.forEach(cat => {
      const btn = document.createElement('button')
      btn.className = 'chip'
      btn.dataset.cat = cat.id
      btn.textContent = cat.nombre
      btn.onclick = () => filtrarPorCategoria(btn, cat.id)
      chips.appendChild(btn)
    })
  } catch (_) {}
}

async function cargarCategoriasSelect() {
  try {
    const data = await get('/categorias?select=*')
    const sel = document.getElementById('np-categoria')
    if (!sel) return
    sel.innerHTML = '<option value="">Seleccionar...</option>'
    data.forEach(c => {
      const opt = document.createElement('option')
      opt.value = c.id
      opt.textContent = c.nombre
      sel.appendChild(opt)
    })
  } catch (_) {}
}

// === VENTAS ===

async function cargarVentasSearch() {
  try {
    const data = await get(`/productos?select=*&bodega_id=eq.${BODEGA_ID}&limit=20`)
    renderVentasResultados(data)
  } catch (_) { renderVentasResultados([]) }
}

function buscarProducto(query) {
  clearTimeout(busquedaTimeout)
  if (!query.trim()) { cargarVentasSearch(); return }
  busquedaTimeout = setTimeout(async () => {
    try {
      const q = encodeURIComponent(query.trim())
      const data = await get(`/productos?select=*&bodega_id=eq.${BODEGA_ID}&nombre=ilike.*${q}*&limit=10`)
      renderVentasResultados(data)
    } catch (_) { renderVentasResultados([]) }
  }, 300)
}

function renderVentasResultados(productos) {
  const container = document.getElementById('ventas-results')
  if (!productos || !productos.length) {
    container.innerHTML = '<div class="empty-state"><p>Sin resultados</p></div>'
    return
  }
  container.innerHTML = productos.map(p => `
    <div class="product-item">
      <div class="thumb">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
      </div>
      <div class="info">
        <div class="name">${p.nombre}</div>
        <div class="detail">S/ ${Number(p.precio).toFixed(2)} · Stock: ${p.stock_actual}</div>
      </div>
      <button class="btn-add-qty" onclick="addAlCarrito('${p.id}','${p.nombre.replace(/'/g, "\\'")}',${p.precio},${p.stock_actual})">+</button>
    </div>
  `).join('')
}

function addAlCarrito(id, nombre, precio, stock) {
  const existente = carrito.find(i => i.id === id)
  if (existente) {
    if (existente.cantidad >= stock) {
      mostrarToast('Stock insuficiente', 'error')
      return
    }
    existente.cantidad++
  } else {
    carrito.push({ id, nombre, precio: Number(precio), cantidad: 1, stock_actual: stock })
  }
  renderFloatingCart()
  mostrarToast(`${nombre} agregado`, 'success')
}

function renderFloatingCart() {
  const container = document.getElementById('cart-container')
  if (!carrito.length) {
    container.innerHTML = ''
    return
  }

  const total = carrito.reduce((s, i) => s + i.cantidad * i.precio, 0)
  const items = carrito.length
  const cantTotal = carrito.reduce((s, i) => s + i.cantidad, 0)

  container.innerHTML = `
    <div class="cart-floating" onclick="toggleCarrito()">
      <div class="cf-left">
        <i data-lucide="shopping-cart" style="width:20px;height:20px"></i>
        <div class="cf-info">
          ${items} ${items === 1 ? 'producto' : 'productos'} · <strong>S/ ${total.toFixed(2)}</strong>
          <br><small>${cantTotal} ${cantTotal === 1 ? 'unidad' : 'unidades'}</small>
        </div>
      </div>
      <div class="cf-right">
        <span class="cf-badge">${items}</span>
        <span class="cf-btn" id="cart-toggle-btn">Ver</span>
      </div>
    </div>
    <div class="cart-expanded" id="cart-expanded">
      <div class="ce-body" id="ce-body"></div>
    </div>
  `
  renderCartExpanded()
  setTimeout(() => lucide.createIcons(), 50)
}

function renderCartExpanded() {
  const body = document.getElementById('ce-body')
  if (!body) return

  const total = carrito.reduce((s, i) => s + i.cantidad * i.precio, 0)

  body.innerHTML = `
    ${carrito.map((i, idx) => `
      <div class="ce-item">
        <span class="ce-name">${i.nombre}</span>
        <div class="ce-qty-controls">
          <button onclick="cambiarQtyCarrito(${idx}, -1)">−</button>
          <span class="ce-qty">${i.cantidad}</span>
          <button onclick="cambiarQtyCarrito(${idx}, 1)">+</button>
        </div>
        <span class="ce-subtotal">S/ ${(i.cantidad * i.precio).toFixed(2)}</span>
        <button class="ce-remove" onclick="removeDelCarrito(${idx})">×</button>
      </div>
    `).join('')}
    <div class="ce-total-row">
      <span>Total</span>
      <span>S/ ${total.toFixed(2)}</span>
    </div>
    <div class="ce-actions">
      <button class="btn btn-primary" onclick="guardarVenta()">Guardar venta</button>
    </div>
  `
  setTimeout(() => lucide.createIcons(), 50)
}

function toggleCarrito() {
  const el = document.getElementById('cart-expanded')
  const btn = document.querySelector('.cf-btn')
  if (!el) return
  el.classList.toggle('open')
  if (btn) btn.textContent = el.classList.contains('open') ? 'Cerrar' : 'Ver'
}

function cambiarQtyCarrito(index, delta) {
  const item = carrito[index]
  if (!item) return
  const nueva = item.cantidad + delta
  if (nueva < 1 || nueva > item.stock_actual) return
  item.cantidad = nueva
  renderFloatingCart()
}

function removeDelCarrito(index) {
  carrito.splice(index, 1)
  if (document.getElementById('cart-expanded')?.classList.contains('open')) {
    toggleCarrito()
  }
  renderFloatingCart()
}

async function guardarVenta() {
  if (!carrito.length) { mostrarToast('Agrega productos al carrito', 'error'); return }
  const btn = document.querySelector('#cart-container .btn-primary')
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...' }
  try {
    for (const item of carrito) {
      await post('/ventas', {
        bodega_id: BODEGA_ID,
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        total: item.cantidad * item.precio,
      })
    }
    mostrarToast(`${carrito.length} ${carrito.length === 1 ? 'producto vendido' : 'productos vendidos'}`, 'success')
    carrito = []
    const expanded = document.getElementById('cart-expanded')
    if (expanded?.classList.contains('open')) toggleCarrito()
    renderFloatingCart()
    cargarVentasSearch()
  } catch (_) {
    mostrarToast('Error al guardar', 'error')
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Guardar venta' }
}

// === INVENTARIO ===

async function cargarInventario() {
  try {
    inventarioData = await get(`/vista_inventario_estado?select=*&bodega_id=eq.${BODEGA_ID}`)
  } catch (_) { inventarioData = [] }
  renderInventario()
}

function renderInventario() {
  let filtrados = inventarioData
  if (categoriaActiva) filtrados = filtrados.filter(p => p.categoria_id === categoriaActiva)
  const query = document.getElementById('inventario-search').value.toLowerCase().trim()
  if (query) filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(query))

  const container = document.getElementById('inventario-lista')
  container.className = 'product-list'
  if (!filtrados.length) {
    container.innerHTML = '<div class="empty-state"><p>Sin productos</p></div>'
    setTimeout(() => lucide.createIcons(), 50)
    return
  }

  container.innerHTML = filtrados.map(p => {
    const esOk = p.estado_stock === 'OK'
    return `
      <div class="product-item">
        <div class="thumb">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        </div>
        <div class="info">
          <div class="name">${p.nombre}</div>
          <div class="detail">${p.categoria_nombre || ''} · S/ ${Number(p.precio).toFixed(2)}</div>
        </div>
        <div class="stock-info">
          <div class="num">${p.stock_actual}</div>
          <div class="min">min ${p.stock_minimo}</div>
          <span class="badge ${esOk ? 'badge-ok' : 'badge-bajo'}">${esOk ? 'OK' : 'Bajo'}</span>
        </div>
      </div>
    `
  }).join('')
  setTimeout(() => lucide.createIcons(), 50)
}

function filtrarInventario() {
  renderInventario()
}

function filtrarPorCategoria(el, catId) {
  document.querySelectorAll('#categoria-chips .chip').forEach(c => c.classList.remove('active'))
  el.classList.add('active')
  categoriaActiva = catId
  renderInventario()
}

// === AGREGAR PRODUCTO ===

function abrirModalProducto() {
  document.getElementById('modal-producto').classList.add('open')
  document.getElementById('np-nombre').value = ''
  document.getElementById('np-precio').value = ''
  document.getElementById('np-stock').value = ''
  document.getElementById('np-stock-min').value = ''
  document.getElementById('np-vencimiento').value = ''
  document.getElementById('np-categoria').value = ''
}

function cerrarModalProducto() {
  document.getElementById('modal-producto').classList.remove('open')
}

async function guardarProducto() {
  const nombre = document.getElementById('np-nombre').value.trim()
  const categoria = document.getElementById('np-categoria').value
  const precio = document.getElementById('np-precio').value
  const stock = document.getElementById('np-stock').value
  const stockMin = document.getElementById('np-stock-min').value
  const vencimiento = document.getElementById('np-vencimiento').value

  if (!nombre || !categoria || !precio || stock === '' || stockMin === '') {
    mostrarToast('Completa todos los campos obligatorios', 'error')
    return
  }

  const body = {
    bodega_id: BODEGA_ID,
    categoria_id: categoria,
    nombre,
    precio: Number(precio),
    stock_actual: Number(stock),
    stock_minimo: Number(stockMin),
  }
  if (vencimiento) body.fecha_vencimiento = vencimiento

  try {
    await post('/productos', body)
    mostrarToast('Producto agregado', 'success')
    cerrarModalProducto()
    cargarInventario()
  } catch (_) {
    mostrarToast('Error al guardar producto', 'error')
  }
}

// === ALERTAS ===

async function cargarAlertas() {
  let items = []
  try {
    items = await get(`/vista_productos_por_vencer?select=*&bodega_id=eq.${BODEGA_ID}&order=fecha_vencimiento.asc`)
  } catch (_) { items = [] }
  document.getElementById('alerta-count').textContent = items.length

  const container = document.getElementById('alertas-lista')
  container.className = 'product-list'
  if (!items.length) {
    container.innerHTML = '<div class="empty-state"><p>No hay productos por vencer</p></div>'
    setTimeout(() => lucide.createIcons(), 50)
    return
  }

  container.innerHTML = items.map(p => {
    const fecha = new Date(p.fecha_vencimiento)
    const hoy = new Date()
    const diff = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24))
    const urgente = diff <= 2
    return `
      <div class="product-item">
        <div class="thumb" style="background:${urgente ? '#FEE2E2' : '#FEF3C7'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="${urgente ? '#DC2626' : '#D97706'}" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="info">
          <div class="name">${p.nombre}</div>
          <div class="detail" style="color:${urgente ? '#DC2626' : '#D97706'};font-weight:600">
            Vence: ${fecha.toLocaleDateString('es-PE')} ${urgente ? '(URGENTE)' : `(en ${diff} días)`}
          </div>
        </div>
        <div class="stock-info">
          <div class="num">${p.stock_actual}</div>
          <div class="min">Stock</div>
        </div>
      </div>
    `
  }).join('')
  setTimeout(() => lucide.createIcons(), 50)
}

// === RECOMENDACIONES ===

async function cargarRecomendaciones() {
  let items = []
  try {
    items = await get(`/recomendaciones?select=*,productos:producto_id(nombre)&vigente=eq.true&bodega_id=eq.${BODEGA_ID}`)
  } catch (_) { items = [] }

  const container = document.getElementById('recomendaciones-lista')
  const btn = document.getElementById('btn-aceptar-rec')

  if (!items.length) {
    container.innerHTML = '<div class="empty-state"><p>No hay sugerencias pendientes</p></div>'
    btn.style.display = 'none'
    setTimeout(() => lucide.createIcons(), 50)
    return
  }

  btn.style.display = 'block'
  container.innerHTML = items.map(r => `
    <div class="recomendacion-item">
      <div class="ri-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
      </div>
      <div class="ri-info">
        <div class="ri-name">${r.productos?.nombre || 'Producto'}</div>
        <div class="ri-qty">Sugerido: ${r.cantidad_sugerida} ${r.unidad}</div>
      </div>
      <div class="ri-badge">${r.cantidad_sugerida} ${r.unidad}</div>
    </div>
  `).join('')
  setTimeout(() => lucide.createIcons(), 50)
}

async function aceptarRecomendaciones() {
  const btn = document.getElementById('btn-aceptar-rec')
  btn.disabled = true
  btn.textContent = 'Aceptando...'
  try {
    await patch(`/recomendaciones?vigente=eq.true&bodega_id=eq.${BODEGA_ID}`, { vigente: false })
    mostrarToast('Sugerencias aceptadas', 'success')
    cargarRecomendaciones()
  } catch (_) {
    mostrarToast('Error al aceptar sugerencias', 'error')
  }
  btn.disabled = false
  btn.textContent = 'Aceptar sugerencias'
}
