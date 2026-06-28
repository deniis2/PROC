// =============================================
//  SUPABASE — CREDENCIALES
// =============================================
const SUPABASE_URL      = 'https://vseltacxhkdrqfqynrmw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzZWx0YWN4aGtkcnFmcXlucm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjQ2MTEsImV4cCI6MjA5ODI0MDYxMX0.hK-IbE52QiV-7DNpCAYF0u1TqYsqI09QOz7a26rTA7M';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================
//  ESTADO GLOBAL
// =============================================
let isAdmin      = false;
let semanasData  = [];
let currentSemId = null;
let isDark       = true;

// =============================================
//  TIMEOUT HELPER
// =============================================
function withTimeout(promise, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera agotado.')), ms)
    ),
  ]);
}

// =============================================
//  PARTÍCULAS
// =============================================
(function () {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx   = canvas.getContext('2d');
  const parts = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 130; i++) {
    parts.push({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      r:     Math.random() * 1.6 + 0.3,
      vx:    (Math.random() - 0.5) * 0.18,
      vy:    (Math.random() - 0.5) * 0.18,
      alpha: Math.random() * 0.45 + 0.08,
    });
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rgb = isDark ? '224,49,49' : '160,20,20';
    parts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},${p.alpha})`;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    requestAnimationFrame(loop);
  }
  loop();
})();

// =============================================
//  TEMA
// =============================================
function updateThemeUI() {
  const icon  = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (isDark) {
    icon.textContent  = '☀️';
    label.textContent = 'Claro';
  } else {
    icon.textContent  = '🌙';
    label.textContent = 'Oscuro';
  }
}

function toggleTheme() {
  const body = document.getElementById('body');
  isDark = !isDark;
  body.classList.remove('light-mode', 'dark-mode');
  body.classList.add(isDark ? 'dark-mode' : 'light-mode');
  updateThemeUI();
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  showToast(isDark ? '🌑 Modo oscuro activado' : '☀️ Modo claro activado');
}

function applyTheme() {
  const body  = document.getElementById('body');
  const saved = localStorage.getItem('theme');
  isDark = saved !== 'light';
  body.classList.remove('light-mode', 'dark-mode');
  body.classList.add(isDark ? 'dark-mode' : 'light-mode');
  updateThemeUI();
}

// =============================================
//  LOGIN
// =============================================
async function handleLogin() {
  const email = document.getElementById('loginUser').value.trim();
  const pass  = document.getElementById('loginPass').value.trim();
  const msg   = document.getElementById('loginMsg');

  if (!email || !pass) {
    setMsg(msg, 'Completa ambos campos.', 'error');
    return;
  }

  setMsg(msg, 'Verificando...', '');

  try {
    const { error } = await withTimeout(db.auth.signInWithPassword({ email, password: pass }));

    if (error) {
      setMsg(msg, '❌ Credenciales incorrectas.', 'error');
      return;
    }

    isAdmin = true;
    setMsg(msg, '✅ ¡Acceso concedido!', 'success');
    showToast('✅ Panel de administración activado');

    setTimeout(() => {
      document.getElementById('loginCard').style.display = 'none';
      addLogoutBtn();
      renderWeeks(semanasData);
    }, 900);
  } catch (err) {
    setMsg(msg, '❌ ' + err.message, 'error');
  }
}

function setMsg(el, text, cls) {
  el.textContent = text;
  el.className   = cls ? 'login-msg ' + cls : 'login-msg';
}

function addLogoutBtn() {
  const navRight = document.querySelector('.nav-right');
  const btn = document.createElement('button');
  btn.className   = 'theme-toggle';
  btn.style.color = '#e03131';
  btn.textContent = '🔓 Salir';
  btn.onclick     = async () => {
    await db.auth.signOut();
    location.reload();
  };
  navRight.appendChild(btn);
}

// =============================================
//  CARGAR SEMANAS
// =============================================
async function loadSemanas() {
  const grid = document.getElementById('weeksGrid');
  grid.innerHTML = '<div class="loading-box"><div class="spinner"></div><p>Cargando semanas...</p></div>';

  try {
    const { data, error } = await withTimeout(
      db.from('semanas').select('*').order('orden')
    );
    if (error) throw error;

    semanasData = data || [];
    updateProgress(semanasData);
    renderWeeks(semanasData);
  } catch (err) {
    grid.innerHTML = '<div class="loading-box"><p style="color:var(--red);text-align:center;max-width:420px;">⚠️ Error al cargar: ' + (err.message || 'revisa la consola.') + '</p></div>';
  }
}

// =============================================
//  PROGRESO
// =============================================
function updateProgress(data) {
  const done  = data.filter(s => s.completado).length;
  const total = data.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progressFraction').textContent = done + '/' + total;
  document.getElementById('progressPct').textContent      = pct + '% completado';
  document.getElementById('progressBar').style.width      = pct + '%';
}

// =============================================
//  RENDERIZAR TARJETAS
// =============================================
function renderWeeks(data) {
  const grid = document.getElementById('weeksGrid');
  grid.innerHTML = '';

  if (!data || data.length === 0) {
    grid.innerHTML = '<div class="loading-box"><p>No hay semanas registradas todavía.</p></div>';
    return;
  }

  data.forEach(function(sem, i) {
    const card   = document.createElement('div');
    card.className = 'week-card';
    card.style.animationDelay = (i * 0.04) + 's';

    const done   = sem.completado;
    const pClass = done ? 'done' : 'pending';
    const pText  = done ? '✓ Completado' : '○ Pendiente';

    card.innerHTML =
      '<div class="card-top">' +
        '<span class="card-week-badge">Semana ' + sem.numero + '</span>' +
        '<label class="tog-wrap" onclick="event.stopPropagation()">' +
          '<input type="checkbox" class="tog-input" id="tog-' + sem.id + '"' +
            (done   ? ' checked'  : '') +
            (isAdmin ? '' : ' disabled') +
            ' onchange="toggleSemana(' + sem.id + ', this.checked)"/>' +
          '<span class="tog-track"></span>' +
        '</label>' +
      '</div>' +
      '<h3 class="card-title">Semana ' + sem.numero + ' — ' + sem.titulo + '</h3>' +
      '<p class="card-desc">' + sem.descripcion + '</p>' +
      '<div class="card-bottom">' +
        '<span class="status-pill ' + pClass + '" id="pill-' + sem.id + '">' + pText + '</span>' +
        '<span class="card-files-count" id="fc-' + sem.id + '">📄 …</span>' +
        '<span class="card-view-link" onclick="openModal(' + sem.id + ')">Ver archivos →</span>' +
      '</div>';

    card.addEventListener('click', function(e) {
      if (!e.target.closest('.tog-wrap') && !e.target.closest('.card-view-link')) {
        openModal(sem.id);
      }
    });

    grid.appendChild(card);
    fetchFileCount(sem.id);
  });
}

// =============================================
//  TOGGLE SEMANA
// =============================================
async function toggleSemana(id, checked) {
  if (!isAdmin) return;
  try {
    const { error } = await withTimeout(
      db.from('semanas').update({ completado: checked }).eq('id', id)
    );
    if (error) throw error;

    const sem = semanasData.find(function(s) { return s.id === id; });
    if (sem) sem.completado = checked;
    updateProgress(semanasData);

    const pill = document.getElementById('pill-' + id);
    pill.className   = 'status-pill ' + (checked ? 'done' : 'pending');
    pill.textContent = checked ? '✓ Completado' : '○ Pendiente';

    showToast(checked ? '✅ Semana completada' : '⏳ Marcada como pendiente');
  } catch (err) {
    showToast('❌ Error: ' + err.message);
  }
}

// =============================================
//  CONTEO ARCHIVOS
// =============================================
async function fetchFileCount(semId) {
  try {
    const { count, error } = await withTimeout(
      db.from('archivos').select('*', { count: 'exact', head: true }).eq('semana_id', semId)
    );
    if (error) throw error;
    const el = document.getElementById('fc-' + semId);
    if (el) el.textContent = count > 0 ? '📄 ' + count + ' archivo' + (count !== 1 ? 's' : '') : 'Sin archivos';
  } catch (err) {
    const el = document.getElementById('fc-' + semId);
    if (el) el.textContent = '⚠️ N/D';
  }
}

// =============================================
//  MODAL — ABRIR CON ANIMACIÓN CARTA
// =============================================
async function openModal(semId) {
  currentSemId = semId;
  const sem = semanasData.find(function(s) { return s.id === semId; });
  if (!sem) return;

  document.getElementById('modalBadge').textContent = 'Semana ' + sem.numero;
  document.getElementById('modalTitle').textContent  = 'Semana ' + sem.numero + ' — ' + sem.titulo;
  document.getElementById('modalDesc').textContent   = sem.descripcion_larga || sem.descripcion;
  document.getElementById('modalFiles').innerHTML    = '<div class="loading-box" style="padding:1.2rem"><div class="spinner"></div></div>';

  const overlay = document.getElementById('modalOverlay');
  const box     = document.getElementById('modalBox');

  // Reset estado
  box.classList.remove('carta-abriendo', 'carta-cerrando');
  overlay.style.display    = 'flex';
  overlay.style.opacity    = '0';
  document.body.style.overflow = 'hidden';

  // Forzar reflow
  void box.offsetWidth;

  // Fade in overlay + animar carta abriéndose
  overlay.style.transition = 'opacity 0.3s ease';
  overlay.style.opacity    = '1';
  box.classList.add('carta-abriendo');

  // Cargar archivos
  const container = document.getElementById('modalFiles');
  try {
    const { data: files, error } = await withTimeout(
      db.from('archivos').select('*').eq('semana_id', semId)
    );
    if (error) throw error;

    container.innerHTML = '';

    if (!files || files.length === 0) {
      container.innerHTML = '<p class="no-files-msg">Sin archivos por ahora.</p>';
    } else {
      files.forEach(function(f) {
        const row = document.createElement('div');
        row.className = 'file-row';
        row.id = 'frow-' + f.id;

        var btnsHtml =
          '<button class="btn-ver" onclick="window.open(\'' + f.url + '\',\'_blank\')">👁 Ver</button>' +
          '<button class="btn-dl" onclick="dlFile(\'' + f.url + '\',\'' + f.nombre + '\')">⬇️ Descargar</button>';

        if (isAdmin) {
          btnsHtml += '<button class="btn-del" id="bdel-' + f.id + '" onclick="deleteFile(' + f.id + ',\'' + f.url + '\',' + semId + ')">🗑 Eliminar</button>';
        }

        row.innerHTML =
          '<span class="file-name">📄 ' + f.nombre + '</span>' +
          '<div class="file-btns">' + btnsHtml + '</div>';

        container.appendChild(row);
      });
    }
  } catch (err) {
    container.innerHTML = '<p class="no-files-msg" style="color:var(--red)">⚠️ Error al cargar archivos.</p>';
  }

  // Zona de subida (solo admin)
  if (isAdmin) {
    const zone = document.createElement('div');
    zone.className = 'upload-zone';
    zone.innerHTML =
      '<input type="file" id="fileInput" accept=".pdf,.docx,.sql,.txt,.xlsx" style="display:none" onchange="uploadFile(this)"/>' +
      '<button class="btn-upload" onclick="document.getElementById(\'fileInput\').click()">+ Subir archivo</button>' +
      '<p>PDF · DOCX · SQL · Max 10 MB</p>';
    container.appendChild(zone);
  }
}

// =============================================
//  MODAL — CERRAR CON ANIMACIÓN CARTA
// =============================================
function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  const box     = document.getElementById('modalBox');

  box.classList.remove('carta-abriendo');
  box.classList.add('carta-cerrando');

  overlay.style.transition = 'opacity 0.38s ease';
  overlay.style.opacity    = '0';

  setTimeout(function() {
    overlay.style.display = 'none';
    overlay.style.opacity = '';
    box.classList.remove('carta-cerrando');
    document.body.style.overflow = '';
    currentSemId = null;
  }, 420);
}

// =============================================
//  ELIMINAR ARCHIVO
// =============================================
async function deleteFile(fileId, fileUrl, semId) {
  if (!isAdmin) return;
  if (!confirm('¿Eliminar este archivo? Esta acción no se puede deshacer.')) return;

  const btn = document.getElementById('bdel-' + fileId);
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

  try {
    // Extraer path del storage
    const marker = '/portafolio-archivos/';
    if (fileUrl.includes(marker)) {
      const storagePath = fileUrl.split(marker)[1];
      await withTimeout(db.storage.from('portafolio-archivos').remove([storagePath]));
    }

    // Eliminar de la tabla
    const { error } = await withTimeout(
      db.from('archivos').delete().eq('id', fileId)
    );
    if (error) throw error;

    // Animar salida y remover fila
    const row = document.getElementById('frow-' + fileId);
    if (row) {
      row.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
      row.style.opacity    = '0';
      row.style.transform  = 'translateX(20px)';
      setTimeout(function() { row.remove(); }, 300);
    }

    fetchFileCount(semId);
    showToast('🗑 Archivo eliminado correctamente');
  } catch (err) {
    showToast('❌ Error: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = '🗑 Eliminar'; }
  }
}

// =============================================
//  DESCARGAR
// =============================================
function dlFile(url, nombre) {
  const a    = document.createElement('a');
  a.href     = url;
  a.download = nombre;
  a.target   = '_blank';
  a.click();
}

// =============================================
//  SUBIR ARCHIVO
// =============================================
async function uploadFile(input) {
  const file = input.files[0];
  if (!file || !currentSemId) return;

  showToast('⏳ Subiendo archivo...');
  const path = 'semana-' + currentSemId + '/' + Date.now() + '-' + file.name;

  try {
    const { error: upErr } = await withTimeout(
      db.storage.from('portafolio-archivos').upload(path, file)
    );
    if (upErr) throw upErr;

    const { data: urlData } = db.storage.from('portafolio-archivos').getPublicUrl(path);

    const { error: dbErr } = await withTimeout(
      db.from('archivos').insert({
        semana_id: currentSemId,
        nombre:    file.name,
        url:       urlData.publicUrl,
        tipo:      file.name.split('.').pop(),
      })
    );
    if (dbErr) throw dbErr;

    showToast('✅ Archivo subido');
    fetchFileCount(currentSemId);
    openModal(currentSemId);
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

// =============================================
//  TOAST
// =============================================
function showToast(msg, ms) {
  ms = ms || 3000;
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, ms);
}

// =============================================
//  NAV
// =============================================
function setActiveNav(el) {
  document.querySelectorAll('.nav-link').forEach(function(a) { a.classList.remove('active'); });
  el.classList.add('active');
}

window.addEventListener('scroll', function() {
  document.getElementById('navbar').style.boxShadow =
    window.scrollY > 20 ? '0 4px 32px rgba(0,0,0,0.35)' : 'none';
});

// =============================================
//  TECLAS RÁPIDAS
// =============================================
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('loginUser').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('loginPass').focus();
  });
  document.getElementById('loginPass').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleLogin();
  });
});

// =============================================
//  ARRANQUE
// =============================================
applyTheme();
loadSemanas();
