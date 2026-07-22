let carrito = []
let todasCategorias = []
let inventarioData = []
let categoriaActiva = ''
let busquedaTimeout

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    document.getElementById('splash').classList.add('hidden')
    var session = getSession()
    if (session) {
      cargarBodegaId().then(function() {
        mostrarApp()
        iniciarApp()
      })
    } else {
      mostrarLogin()
    }
  }, 1500)
})

function iniciarApp() {
  cargarDashboard()
  cargarCategorias()
  cargarCategoriasSelect()
  cargarAlertas()
  cargarRecomendaciones()
  lucide.createIcons()
}

function auth() {
  return getAuthHeaders()
}

async function get(path) {
  var r = await fetch(API_URL + path, { headers: auth() })
  if (!r.ok) throw new Error(r.statusText)
  return r.json()
}

async function post(path, data) {
  var r = await fetch(API_URL + path, {
    method: 'POST',
    headers: Object.assign({}, auth(), { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }),
    body: JSON.stringify(data)
  })
  if (!r.ok) throw new Error(r.statusText)
}

async function patch(path, data) {
  var r = await fetch(API_URL + path, {
    method: 'PATCH',
    headers: Object.assign({}, auth(), { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }),
    body: JSON.stringify(data)
  })
  if (!r.ok) throw new Error(r.statusText)
}

function navigateTo(section) {
  document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active') })
  document.getElementById('sec-' + section).classList.add('active')
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active') })
  var navItem = document.querySelector('.nav-item[data-section="' + section + '"]')
  if (navItem) navItem.classList.add('active')
  actualizarNavIcons()
  if (document.getElementById('content')) document.getElementById('content').scrollTop = 0
  if (section === 'ventas') {
    document.getElementById('ventas-search').focus()
    renderCarrito()
  }
  if (section === 'inventario') cargarInventario()
  if (section === 'alertas') cargarAlertas()
  if (section === 'recomendaciones') cargarRecomendaciones()
  if (section === 'inicio') cargarDashboard()
  setTimeout(function() { lucide.createIcons() }, 50)
}

function mostrarToast(msg, tipo) {
  var t = document.getElementById('toast')
  t.textContent = msg
  t.className = 'toast toast-' + tipo + ' show'
  setTimeout(function() { t.classList.remove('show') }, 3000)
}

// === DASHBOARD ===

async function cargarDashboard() {
  var bid = getBodegaId()
  try {
    var d = await get('/bodegas?select=*&id=eq.' + bid + '&limit=1')
    if (d.length) document.getElementById('greeting').textContent = '¡Hola, ' + d[0].nombre_dueno + '!'
  } catch (_) {}

  try {
    var d = await get('/vista_resumen_hoy?select=*&bodega_id=eq.' + bid + '&limit=1')
    if (d.length) {
      document.getElementById('ventas-hoy').innerHTML = 'S/ ' + Number(d[0].ventas_hoy || 0).toFixed(2)
      document.getElementById('margen-hoy').innerHTML = 'S/ ' + Number(d[0].margen_estimado || 0).toFixed(2)
      document.getElementById('inventario-total').textContent = d[0].inventario_total || 0
    }
  } catch (_) {}

  try {
    var d = await get('/vista_productos_por_vencer?select=id&bodega_id=eq.' + bid)
    document.getElementById('por-vencer').textContent = d.length
  } catch (_) {}

  try {
    var d = await get('/recomendaciones?select=id&vigente=eq.true&bodega_id=eq.' + bid)
    document.getElementById('sugerencias').textContent = d.length
  } catch (_) {}

  try {
    var d = await get('/vista_inventario_estado?select=*&bodega_id=eq.' + bid)
    if (d.length) {
      var ok = d.filter(function(p) { return p.estado_stock === 'OK' }).length
      var pct = (ok / d.length * 100)
      document.getElementById('donut-stock').setAttribute('stroke-dasharray', pct + ' ' + (100 - pct))
    }
  } catch (_) {}

  setTimeout(function() { lucide.createIcons() }, 50)
}

// === CATEGORÍAS ===

async function cargarCategorias() {
  try {
    var data = await get('/categorias?select=*')
    if (!data.length) return
    todasCategorias = data
    var chips = document.getElementById('categoria-chips')
    data.forEach(function(cat) {
      var btn = document.createElement('button')
      btn.className = 'chip'
      btn.dataset.cat = cat.id
      btn.textContent = cat.nombre
      btn.onclick = function() { filtrarPorCategoria(btn, cat.id) }
      chips.appendChild(btn)
    })
  } catch (_) {}
}

async function cargarCategoriasSelect() {
  try {
    var data = await get('/categorias?select=*')
    var sel = document.getElementById('np-categoria')
    if (!sel) return
    sel.innerHTML = '<option value="">Seleccionar...</option>'
    data.forEach(function(c) {
      var opt = document.createElement('option')
      opt.value = c.id
      opt.textContent = c.nombre
      sel.appendChild(opt)
    })
  } catch (_) {}
}

// === VENTAS (CARRITO DIRECTO) ===

function buscarProducto(query) {
  clearTimeout(busquedaTimeout)
  var dropdown = document.getElementById('ventas-dropdown')
  if (!query.trim()) { dropdown.classList.remove('open'); return }
  busquedaTimeout = setTimeout(async function() {
    try {
      var q = encodeURIComponent(query.trim())
      var data = await get('/productos?select=*&bodega_id=eq.' + getBodegaId() + '&nombre=ilike.*' + q + '*&limit=8')
      renderDropdown(data)
    } catch (_) { dropdown.classList.remove('open') }
  }, 300)
}

function renderDropdown(productos) {
  var dropdown = document.getElementById('ventas-dropdown')
  if (!productos || !productos.length) { dropdown.classList.remove('open'); return }
  dropdown.innerHTML = productos.map(function(p) {
    var imgUrl = p.imagen_url || ''
    var icon = imgUrl
      ? '<div class="sd-icon" style="overflow:hidden"><img src="' + imgUrl + '" alt="" style="width:100%;height:100%;object-fit:cover"></div>'
      : '<div class="sd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>'
    return '<div class="sd-item" onclick="agregarDesdeDropdown(\'' + p.id + '\',\'' + p.nombre.replace(/'/g, "\\'") + '\',' + p.precio + ',' + p.stock_actual + ',\'' + imgUrl + '\')">' + icon +
      '<div class="sd-info"><div class="sd-name">' + p.nombre + '</div><div class="sd-detail">S/ ' + Number(p.precio).toFixed(2) + ' · Stock: ' + p.stock_actual + '</div></div>' +
      '<span class="sd-add">+</span></div>'
  }).join('')
  dropdown.classList.add('open')
}

function agregarDesdeDropdown(id, nombre, precio, stock, imagenUrl) {
  document.getElementById('ventas-search').value = ''
  document.getElementById('ventas-dropdown').classList.remove('open')
  var existente = carrito.find(function(i) { return i.id === id })
  if (existente) {
    if (existente.cantidad >= stock) { mostrarToast('Stock insuficiente', 'error'); renderCarrito(); return }
    existente.cantidad++
  } else {
    carrito.push({ id: id, nombre: nombre, precio: Number(precio), cantidad: 1, stock_actual: stock, imagen_url: imagenUrl || '' })
  }
  renderCarrito()
  mostrarToast(nombre + ' agregado', 'success')
}

function renderCarrito() {
  var container = document.getElementById('carrito-lista')
  var bottomBar = document.getElementById('ventas-bottom-bar')

  if (!carrito.length) {
    container.innerHTML = '<div class="empty-state"><p>Busca productos y agrégalos aquí</p></div>'
    bottomBar.style.display = 'none'
    return
  }

  bottomBar.style.display = 'flex'
  var total = carrito.reduce(function(s, i) { return s + i.cantidad * i.precio }, 0)
  var cantTotal = carrito.reduce(function(s, i) { return s + i.cantidad }, 0)
  var items = carrito.length

  document.getElementById('vbb-count').textContent = items + ' ' + (items === 1 ? 'producto' : 'productos') + ' · ' + cantTotal + ' ' + (cantTotal === 1 ? 'unidad' : 'unidades')
  document.getElementById('vbb-total').textContent = 'S/ ' + total.toFixed(2)

  container.innerHTML = carrito.map(function(i, idx) {
    var subtotal = i.cantidad * i.precio
    var icon = i.imagen_url
      ? '<div class="ci-icon" style="overflow:hidden"><img src="' + i.imagen_url + '" alt="" style="width:100%;height:100%;object-fit:cover"></div>'
      : '<div class="ci-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>'
    return '<div class="carrito-item">' + icon +
      '<div class="ci-info"><div class="ci-name">' + i.nombre + '</div><div class="ci-price">S/ ' + Number(i.precio).toFixed(2) + '</div></div>' +
      '<div class="ci-qty">' +
        '<button onclick="cambiarQtyCarrito(' + idx + ',-1)">−</button>' +
        '<input type="number" class="ci-input" value="' + i.cantidad + '" min="1" max="' + i.stock_actual + '" onchange="actualizarQtyCarrito(' + idx + ',this.value)">' +
        '<button onclick="cambiarQtyCarrito(' + idx + ',1)">+</button>' +
      '</div>' +
      '<span class="ci-subtotal">S/ ' + subtotal.toFixed(2) + '</span>' +
      '<button class="ci-remove" onclick="quitarDelCarrito(' + idx + ')">×</button>' +
    '</div>'
  }).join('')

  setTimeout(function() { lucide.createIcons() }, 50)
}

function cambiarQtyCarrito(idx, delta) {
  var item = carrito[idx]
  if (!item) return
  var nueva = item.cantidad + delta
  if (nueva < 1 || nueva > item.stock_actual) return
  item.cantidad = nueva
  renderCarrito()
}

function actualizarQtyCarrito(idx, val) {
  var item = carrito[idx]
  if (!item) return
  var nueva = parseInt(val)
  if (isNaN(nueva) || nueva < 1) nueva = 1
  if (nueva > item.stock_actual) nueva = item.stock_actual
  item.cantidad = nueva
  renderCarrito()
}

function quitarDelCarrito(idx) {
  carrito.splice(idx, 1)
  renderCarrito()
}

function vaciarCarrito() {
  if (!carrito.length) return
  carrito = []
  renderCarrito()
  mostrarToast('Carrito vaciado', 'info')
}

async function guardarVenta() {
  if (!carrito.length) { mostrarToast('Agrega productos al carrito', 'error'); return }
  var btn = document.getElementById('vbb-guardar')
  btn.disabled = true
  btn.textContent = 'Guardando...'
  try {
    for (var i = 0; i < carrito.length; i++) {
      var item = carrito[i]
      await post('/ventas', {
        bodega_id: getBodegaId(),
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        total: item.cantidad * item.precio,
      })
    }
    mostrarToast(carrito.length + ' ' + (carrito.length === 1 ? 'producto vendido' : 'productos vendidos'), 'success')
    carrito = []
    renderCarrito()
  } catch (_) {
    mostrarToast('Error al guardar', 'error')
  }
  btn.disabled = false
  btn.textContent = 'Guardar venta'
}

// === INVENTARIO ===

async function cargarInventario() {
  try {
    inventarioData = await get('/vista_inventario_estado?select=*&bodega_id=eq.' + getBodegaId())
  } catch (_) { inventarioData = [] }
  renderInventario()
}

function renderInventario() {
  var filtrados = inventarioData
  if (categoriaActiva) filtrados = filtrados.filter(function(p) { return p.categoria_id === categoriaActiva })
  var query = document.getElementById('inventario-search').value.toLowerCase().trim()
  if (query) filtrados = filtrados.filter(function(p) { return p.nombre.toLowerCase().includes(query) })

  var container = document.getElementById('inventario-lista')
  container.className = 'product-list'
  if (!filtrados.length) {
    container.innerHTML = '<div class="empty-state"><p>Sin productos</p></div>'
    setTimeout(function() { lucide.createIcons() }, 50)
    return
  }

  container.innerHTML = filtrados.map(function(p) {
    var esOk = p.estado_stock === 'OK'
    var thumb = p.imagen_url
      ? '<div class="thumb"><img src="' + p.imagen_url + '" alt="' + p.nombre + '"></div>'
      : '<div class="thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>'
    return '<div class="product-item" onclick="abrirDetalle(\'inventario\',\'' + p.id + '\')">' + thumb +
      '<div class="info"><div class="name">' + p.nombre + '</div><div class="detail">' + (p.categoria_nombre || '') + ' · S/ ' + Number(p.precio).toFixed(2) + '</div></div>' +
      '<div class="stock-info"><div class="num">' + p.stock_actual + '</div><div class="min">min ' + p.stock_minimo + '</div><span class="badge ' + (esOk ? 'badge-ok' : 'badge-bajo') + '">' + (esOk ? 'OK' : 'Bajo') + '</span></div>' +
    '</div>'
  }).join('')
  setTimeout(function() { lucide.createIcons() }, 50)
}

function filtrarInventario() { renderInventario() }

function filtrarPorCategoria(el, catId) {
  document.querySelectorAll('#categoria-chips .chip').forEach(function(c) { c.classList.remove('active') })
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
  var nombre = document.getElementById('np-nombre').value.trim()
  var categoria = document.getElementById('np-categoria').value
  var precio = document.getElementById('np-precio').value
  var stock = document.getElementById('np-stock').value
  var stockMin = document.getElementById('np-stock-min').value
  var vencimiento = document.getElementById('np-vencimiento').value

  if (!nombre || !categoria || !precio || stock === '' || stockMin === '') {
    mostrarToast('Completa todos los campos obligatorios', 'error')
    return
  }

  var body = {
    bodega_id: getBodegaId(),
    categoria_id: categoria,
    nombre: nombre,
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

var alertasData = []

async function cargarAlertas() {
  var items = []
  try {
    items = await get('/vista_productos_por_vencer?select=*&bodega_id=eq.' + getBodegaId() + '&order=fecha_vencimiento.asc')
  } catch (_) { items = [] }
  alertasData = items
  document.getElementById('alerta-count').textContent = items.length
  actualizarNavIcons()

  var container = document.getElementById('alertas-lista')
  container.className = 'product-list'
  if (!items.length) {
    container.innerHTML = '<div class="empty-state"><p>No hay productos por vencer</p></div>'
    setTimeout(function() { lucide.createIcons() }, 50)
    return
  }

  container.innerHTML = items.map(function(p) {
    var partes = p.fecha_vencimiento.split('-')
    var fecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]))
    var ahora = new Date()
    var hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
    var diff = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24))
    var urgente = diff <= 2
    var thumb = p.imagen_url
      ? '<div class="thumb" style="overflow:hidden"><img src="' + p.imagen_url + '" alt="' + p.nombre + '" style="width:100%;height:100%;object-fit:cover"></div>'
      : '<div class="thumb" style="background:' + (urgente ? '#FEE2E2' : '#FEF3C7') + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="' + (urgente ? '#E24C4C' : '#F5A623') + '" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>'
    return '<div class="product-item" onclick="abrirDetalle(\'alerta\',\'' + p.id + '\')">' + thumb +
      '<div class="info"><div class="name">' + p.nombre + '</div>' +
        '<div class="detail" style="color:' + (urgente ? '#E24C4C' : '#F5A623') + ';font-weight:600">Vence: ' + fecha.toLocaleDateString('es-PE') + ' ' + (urgente ? '(URGENTE)' : '(en ' + diff + ' días)') + '</div></div>' +
      '<div class="stock-info"><div class="num">' + p.stock_actual + '</div><div class="min">Stock</div></div>' +
    '</div>'
  }).join('')
  setTimeout(function() { lucide.createIcons() }, 50)
}

// === RECOMENDACIONES ===

var recomendacionesData = []

async function cargarRecomendaciones() {
  var items = []
  try {
    items = await get('/recomendaciones?select=*,productos:producto_id(nombre,imagen_url)&vigente=eq.true&bodega_id=eq.' + getBodegaId())
  } catch (_) { items = [] }
  recomendacionesData = items
  actualizarNavIcons()

  var container = document.getElementById('recomendaciones-lista')
  var btn = document.getElementById('btn-aceptar-rec')

  if (!items.length) {
    container.innerHTML = '<div class="empty-state"><p>No hay sugerencias pendientes</p></div>'
    btn.style.display = 'none'
    setTimeout(function() { lucide.createIcons() }, 50)
    return
  }

  btn.style.display = 'block'
  container.innerHTML = items.map(function(r) {
    var imgUrl = r.productos?.imagen_url || ''
    var icon = imgUrl
      ? '<div class="ri-icon" style="overflow:hidden"><img src="' + imgUrl + '" alt="" style="width:100%;height:100%;object-fit:cover"></div>'
      : '<div class="ri-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></div>'
    return '<div class="recomendacion-item" onclick="abrirDetalle(\'recomendacion\',\'' + r.id + '\')">' + icon +
      '<div class="ri-info"><div class="ri-name">' + (r.productos?.nombre || 'Producto') + '</div><div class="ri-qty">Sugerido: ' + r.cantidad_sugerida + ' ' + r.unidad + '</div></div>' +
      '<div class="ri-badge">' + r.cantidad_sugerida + ' ' + r.unidad + '</div>' +
    '</div>'
  }).join('')
  setTimeout(function() { lucide.createIcons() }, 50)
}

async function aceptarRecomendaciones() {
  var btn = document.getElementById('btn-aceptar-rec')
  btn.disabled = true
  btn.textContent = 'Aceptando...'
  try {
    await patch('/recomendaciones?vigente=eq.true&bodega_id=eq.' + getBodegaId(), { vigente: false })
    mostrarToast('Sugerencias aceptadas', 'success')
    cargarRecomendaciones()
  } catch (_) {
    mostrarToast('Error al aceptar sugerencias', 'error')
  }
  btn.disabled = false
  btn.textContent = 'Aceptar sugerencias'
}

// === ACTUALIZAR COLOR NAV ICONS ===

function actualizarNavIcons() {
  var secciones = [
    { id: 'nav-alertas', data: alertasData, color: '#E24C4C' },
    { id: 'nav-recomendaciones', data: recomendacionesData, color: '#F5A623' },
  ]
  secciones.forEach(function(s) {
    var btn = document.getElementById(s.id)
    if (!btn) return
    var svg = btn.querySelector('svg')
    var span = btn.querySelector('span')
    if (btn.classList.contains('active')) {
      if (svg) svg.style.stroke = ''
      if (span) span.style.color = ''
    } else if (s.data && s.data.length > 0) {
      if (svg) svg.style.stroke = s.color
      if (span) span.style.color = s.color
    } else {
      if (svg) svg.style.stroke = ''
      if (span) span.style.color = ''
    }
  })
}

// === CERRAR DROPDOWN AL HACER CLICK FUERA ===

document.addEventListener('click', function(e) {
  var dropdown = document.getElementById('ventas-dropdown')
  var searchBox = document.querySelector('#sec-ventas .search-box')
  if (dropdown && searchBox && !searchBox.contains(e.target)) {
    dropdown.classList.remove('open')
  }
})

// === KEYBOARD: Enter en login ===

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    var loginSection = document.getElementById('sec-login')
    if (loginSection && loginSection.classList.contains('active')) {
      login()
    }
  }
})

// === BOTTOM SHEET DETALLE ===

function abrirDetalle(tipo, id) {
  var overlay = document.getElementById('detail-overlay')
  var sheet = document.getElementById('detail-sheet')
  var body = document.getElementById('detail-body')

  var data = []
  if (tipo === 'inventario') {
    data = inventarioData.filter(function(p) { return p.id === id })
    if (!data.length && alertasData) data = alertasData.filter(function(p) { return p.id === id })
  } else if (tipo === 'alerta') {
    data = alertasData ? alertasData.filter(function(p) { return p.id === id }) : []
    if (!data.length) data = inventarioData.filter(function(p) { return p.id === id })
  } else if (tipo === 'recomendacion') {
    data = recomendacionesData ? recomendacionesData.filter(function(r) { return r.id === id }) : []
  }

  var item = data[0]
  if (!item) { mostrarToast('No se encontró el producto', 'error'); return }

  var html = ''

  if (tipo === 'inventario') {
    html = renderDetalleInventario(item)
  } else if (tipo === 'alerta') {
    html = renderDetalleAlerta(item)
  } else if (tipo === 'recomendacion') {
    html = renderDetalleRecomendacion(item)
  }

  body.innerHTML = html
  overlay.classList.add('open')
  sheet.classList.add('open')
}

function renderDetalleInventario(p) {
  var img = p.imagen_url
    ? '<img class="bs-img" src="' + p.imagen_url + '" alt="' + p.nombre + '">'
    : '<div class="bs-img-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>'
  return img +
    '<div class="bs-title">' + p.nombre + '</div>' +
    '<div class="bs-sub">' + (p.categoria_nombre || 'Sin categoría') + ' · S/ ' + Number(p.precio).toFixed(2) + '</div>' +
    '<div class="bs-stats">' +
      '<div class="bs-stat"><div class="bs-stat-val">' + p.stock_actual + '</div><div class="bs-stat-label">Stock</div></div>' +
      '<div class="bs-stat"><div class="bs-stat-val">' + p.stock_minimo + '</div><div class="bs-stat-label">Mínimo</div></div>' +
    '</div>' +
    '<div class="bs-divider"></div>' +
    '<button class="bs-btn bs-btn-primary" onclick="cerrarDetalle()">Editar producto</button>'
}

function renderDetalleAlerta(p) {
  var partes = p.fecha_vencimiento.split('-')
  var fecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]))
  var ahora = new Date()
  var hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  var diff = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24))
  var vencido = diff <= 0

  var img = p.imagen_url
    ? '<img class="bs-img" src="' + p.imagen_url + '" alt="' + p.nombre + '">'
    : '<div class="bs-img-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>'
  return img +
    '<div class="bs-title">' + p.nombre + '</div>' +
    '<div class="bs-sub">Vence: ' + fecha.toLocaleDateString('es-PE') + '</div>' +
    '<div class="bs-stats">' +
      '<div class="bs-stat"><div class="bs-stat-val">' + p.stock_actual + '</div><div class="bs-stat-label">Stock</div></div>' +
      '<div class="bs-stat"><div class="bs-stat-val">' + (vencido ? 'Vencido' : (diff === 1 ? 'Mañana' : diff + ' días')) + '</div><div class="bs-stat-label">' + (vencido ? '⚠' : 'Restante') + '</div></div>' +
    '</div>' +
    '<div class="bs-divider"></div>' +
    '<div class="bs-detail-text">' + (vencido
      ? 'Este producto ha vencido. Puedes descartarlo como merma para liberar el inventario.'
      : 'Este producto vencerá pronto. Considera aplicar descuento o liquidación.') + '</div>' +
    '<button class="bs-btn bs-btn-danger" onclick="marcarMerma(\'' + p.id + '\')">' + (vencido ? 'Marcar como merma' : 'Marcar como descartado / merma') + '</button>'
}

function renderDetalleRecomendacion(r) {
  var img = r.productos?.imagen_url
    ? '<img class="bs-img" src="' + r.productos.imagen_url + '" alt="' + r.productos.nombre + '">'
    : '<div class="bs-img-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></div>'
  return img +
    '<div class="bs-title">' + (r.productos?.nombre || 'Producto') + '</div>' +
    '<div class="bs-sub">Sugerido: ' + r.cantidad_sugerida + ' ' + r.unidad + '</div>' +
    '<div class="bs-stats">' +
      '<div class="bs-stat"><div class="bs-stat-val">' + r.cantidad_sugerida + '</div><div class="bs-stat-label">Cant. sugerida</div></div>' +
      '<div class="bs-stat"><div class="bs-stat-val">' + (r.unidad || 'unidad') + '</div><div class="bs-stat-label">Unidad</div></div>' +
    '</div>' +
    '<div class="bs-divider"></div>' +
    '<div class="bs-detail-text">Recomendación basada en tus ventas de las últimas 4 semanas. Reponer a tiempo evita quiebres de stock.</div>' +
    '<button class="bs-btn bs-btn-primary" onclick="cerrarDetalle()">Aceptar y agregar al carrito</button>'
}

function marcarMerma(id) {
  if (!confirm('¿Descartar este producto como merma?')) return
  // Descontar stock a 0
  var bodyData = JSON.stringify({ stock_actual: 0 })
  fetch(SUPABASE_URL + '/rest/v1/productos?id=eq.' + id, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: bodyData
  }).then(function(r) {
    if (!r.ok) throw new Error()
    mostrarToast('Producto marcado como merma', 'success')
    cerrarDetalle()
    cargarInventario()
    if (window.cargarAlertas) cargarAlertas()
  }).catch(function() {
    mostrarToast('Error al marcar merma', 'error')
  })
}

function cerrarDetalle() {
  document.getElementById('detail-overlay').classList.remove('open')
  document.getElementById('detail-sheet').classList.remove('open')
}
