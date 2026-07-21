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
    return '<div class="sd-item" onclick="agregarDesdeDropdown(\'' + p.id + '\',\'' + p.nombre.replace(/'/g, "\\'") + '\',' + p.precio + ',' + p.stock_actual + ')">' +
      '<div class="sd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>' +
      '<div class="sd-info"><div class="sd-name">' + p.nombre + '</div><div class="sd-detail">S/ ' + Number(p.precio).toFixed(2) + ' · Stock: ' + p.stock_actual + '</div></div>' +
      '<span class="sd-add">+</span></div>'
  }).join('')
  dropdown.classList.add('open')
}

function agregarDesdeDropdown(id, nombre, precio, stock) {
  document.getElementById('ventas-search').value = ''
  document.getElementById('ventas-dropdown').classList.remove('open')
  var existente = carrito.find(function(i) { return i.id === id })
  if (existente) {
    if (existente.cantidad >= stock) { mostrarToast('Stock insuficiente', 'error'); renderCarrito(); return }
    existente.cantidad++
  } else {
    carrito.push({ id: id, nombre: nombre, precio: Number(precio), cantidad: 1, stock_actual: stock })
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
    return '<div class="carrito-item">' +
      '<div class="ci-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>' +
      '<div class="ci-info"><div class="ci-name">' + i.nombre + '</div><div class="ci-price">S/ ' + Number(i.precio).toFixed(2) + '</div></div>' +
      '<div class="ci-qty">' +
        '<button onclick="cambiarQtyCarrito(' + idx + ',-1)">−</button>' +
        '<span class="ci-num">' + i.cantidad + '</span>' +
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

function quitarDelCarrito(idx) {
  carrito.splice(idx, 1)
  renderCarrito()
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
    return '<div class="product-item">' +
      '<div class="thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>' +
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

async function cargarAlertas() {
  var items = []
  try {
    items = await get('/vista_productos_por_vencer?select=*&bodega_id=eq.' + getBodegaId() + '&order=fecha_vencimiento.asc')
  } catch (_) { items = [] }
  document.getElementById('alerta-count').textContent = items.length

  var container = document.getElementById('alertas-lista')
  container.className = 'product-list'
  if (!items.length) {
    container.innerHTML = '<div class="empty-state"><p>No hay productos por vencer</p></div>'
    setTimeout(function() { lucide.createIcons() }, 50)
    return
  }

  container.innerHTML = items.map(function(p) {
    var fecha = new Date(p.fecha_vencimiento)
    var hoy = new Date()
    var diff = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24))
    var urgente = diff <= 2
    return '<div class="product-item">' +
      '<div class="thumb" style="background:' + (urgente ? '#FEE2E2' : '#FEF3C7') + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="' + (urgente ? '#DC2626' : '#D97706') + '" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>' +
      '<div class="info"><div class="name">' + p.nombre + '</div>' +
        '<div class="detail" style="color:' + (urgente ? '#DC2626' : '#D97706') + ';font-weight:600">Vence: ' + fecha.toLocaleDateString('es-PE') + ' ' + (urgente ? '(URGENTE)' : '(en ' + diff + ' días)') + '</div></div>' +
      '<div class="stock-info"><div class="num">' + p.stock_actual + '</div><div class="min">Stock</div></div>' +
    '</div>'
  }).join('')
  setTimeout(function() { lucide.createIcons() }, 50)
}

// === RECOMENDACIONES ===

async function cargarRecomendaciones() {
  var items = []
  try {
    items = await get('/recomendaciones?select=*,productos:producto_id(nombre)&vigente=eq.true&bodega_id=eq.' + getBodegaId())
  } catch (_) { items = [] }

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
    return '<div class="recomendacion-item">' +
      '<div class="ri-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></div>' +
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
