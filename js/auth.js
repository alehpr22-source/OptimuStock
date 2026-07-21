const SUPABASE_URL = 'https://fcpohtkfwpsdfwwlqqpk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjcG9odGtmd3BzZGZ3d2xxcXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDYxOTYsImV4cCI6MjEwMDIyMjE5Nn0.eG7DZVWzyq_UAki7QudLzVXhzfzB-02j3GXf-zRIOmI'
const AUTH_URL = `${SUPABASE_URL}/auth/v1`
const API_URL = `${SUPABASE_URL}/rest/v1`

let sessionData = null
let bodegaId = null

async function login() {
  const email = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-pass').value
  const errEl = document.getElementById('login-error')
  const btn = document.getElementById('btn-login')

  if (!email || !password) { errEl.textContent = 'Completa todos los campos'; return }
  errEl.textContent = ''
  btn.disabled = true
  btn.textContent = 'Ingresando...'

  try {
    const r = await fetch(`${AUTH_URL}/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (!r.ok) { errEl.textContent = 'Correo o contraseña incorrectos'; btn.disabled = false; btn.textContent = 'Ingresar'; return }
    const data = await r.json()
    sessionData = data
    localStorage.setItem('session', JSON.stringify(data))
    await cargarBodegaId()
    btn.disabled = false
    btn.textContent = 'Ingresar'
    mostrarApp()
    iniciarApp()
  } catch (_) {
    errEl.textContent = 'Error de conexión'
    btn.disabled = false
    btn.textContent = 'Ingresar'
  }
}

async function cargarBodegaId() {
  try {
    const r = await fetch(`${API_URL}/bodega_usuarios?select=bodega_id&user_id=eq.${sessionData.user.id}&limit=1`, {
      headers: getAuthHeaders()
    })
    if (r.ok) {
      const d = await r.json()
      if (d.length) bodegaId = d[0].bodega_id
    }
  } catch (_) {}
}

function getSession() {
  if (sessionData) return sessionData
  const s = localStorage.getItem('session')
  if (!s) return null
  try {
    sessionData = JSON.parse(s)
    return sessionData
  } catch (_) { return null }
}

function getAuthHeaders() {
  const session = getSession()
  const token = session ? session.access_token : SUPABASE_ANON_KEY
  return { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }
}

function getBodegaId() {
  return bodegaId || '11111111-1111-1111-1111-111111111111'
}

function mostrarApp() {
  document.getElementById('sec-login').classList.remove('active')
  document.getElementById('content').style.display = 'block'
  document.getElementById('bottom-nav').style.display = 'flex'
  document.getElementById('btn-logout').style.display = 'flex'
  document.getElementById('sec-inicio').classList.add('active')
}

function mostrarLogin() {
  document.getElementById('sec-login').classList.add('active')
  document.getElementById('content').style.display = 'none'
  document.getElementById('bottom-nav').style.display = 'none'
  document.getElementById('btn-logout').style.display = 'none'
}

function confirmarLogout() {
  document.getElementById('modal-logout').classList.add('open')
}

function cerrarModalLogout() {
  document.getElementById('modal-logout').classList.remove('open')
}

function logout() {
  localStorage.removeItem('session')
  sessionData = null
  bodegaId = null
  document.getElementById('modal-logout').classList.remove('open')
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
  mostrarLogin()
  document.getElementById('login-email').value = ''
  document.getElementById('login-pass').value = ''
}
