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
let activeTab    = 'file'; // 'file' | 'url'

// =============================================
//  TIMEOUT HELPER
// =============================================
function withTimeout(promise, ms) {
  ms = ms || 12000;
  return Promise.race([
    promise,
    new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error('Tiempo de espera agotado.')); }, ms);
    }),
  ]);
}

// =============================================
//  DETECTAR TIPO DE URL (para ícono)
// =============================================
function getUrlIcon(url, nombre) {
  var u = (url || '').toLowerCase();
  var n = (nombre || '').toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return '▶️';
  if (u.includes('drive.google.com'))  return '📂';
  if (u.includes('docs.google.com'))   return '📝';
  if (u.includes('github.com'))        return '💻';
  if (u.includes('figma.com'))         return '🎨';
  if (n.endsWith('.pdf') || u.endsWith('.pdf')) return '📕';
  if (n.endsWith('.docx') || n.endsWith('.doc')) return '📄';
  if (n.endsWith('.xlsx') || n.endsWith('.xls')) return '📊';
  if (n.endsWith('.sql'))              return '🗄️';
  if (n.endsWith('.txt'))              return '📃';
  return '🔗';
}

// =============================================
//  PARTÍCULAS
// =============================================
(function () {
  var canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  var ctx   = canvas.getContext('2d');
  var parts = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (var i = 0; i < 130; i++) {
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
    var rgb = isDark ? '224,49,49' : '160,20,20';
    parts.forEach(function(p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + rgb + ',' + p.alpha + ')';
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
  var icon  = document.getElementById('themeIcon');
  var label = document.getElementById('themeLabel');
  if (isDark) {
    icon.textContent  = '☀️';
    label.textContent = 'Claro';
  } else {
    icon.textContent  = '🌙';
    label.textContent = 'Oscuro';
  }
}

function toggleTheme() {
  var body = document.getElementById('body');
  isDark = !isDark;
  body.classList.remove('light-mode', 'dark-mode');
  body.classList.add(isDark ? 'dark-mode' : 'light-mode');
  updateThemeUI();
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  showToast(isDark ? '🌑 Modo oscuro activado' : '☀️ Modo claro activado');
}

function applyTheme() {
  var body  = document.getElementById('body');
  var saved = localStorage.getItem('theme');
  isDark = saved !== 'light';
  body.classList.remove('light-mode', 'dark-mode');
  body.classList.add(isDark ? 'dark-mode' : 'light-mode');
  updateThemeUI();
}

// =============================================
//  LOGIN
// =============================================
async function handleLogin() {
  var email = document.getElementById('loginUser').value.trim();
  var pass  = document.getElementById('loginPass').value.trim();
  var msg   = document.getElementById('loginMsg');

  if (!email || !pass) {
    setMsg(msg, 'Completa ambos campos.', 'error');
    return;
  }

  setMsg(msg, 'Verificando...', '');

  try {
    var result = await withTimeout(db.auth.signInWithPassword({ email: email, password: pass }));

    if (result.error) {
      setMsg(msg, '❌ Credenciales incorrectas.', 'error');
      return;
    }

    isAdmin = true;
    setMsg(msg, '✅ ¡Acceso concedido!', 'success');
    showToast('✅ Panel de administración activado');

    setTimeout(function() {
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
  var navRight = document.querySelector('.nav-right');
  var btn = document.createElement('button');
  btn.className   = 'theme-toggle';
  btn.style.color = '#e03131';
  btn.textContent = '🔓 Salir';
  btn.onclick     = async function() {
    await db.auth.signOut();
    location.reload();
  };
  navRight.appendChild(btn);
}

// =============================================
//  CARGAR SEMANAS
// =============================================
async function loadSemanas() {
  var grid = document.getElementById('weeksGrid');
  grid.innerHTML = '<div class="loading-box"><div class="spinner"></div><p>Cargando semanas...</p></div>';

  try {
    var result = await withTimeout(
      db.from('semanas').select('*').order('orden')
    );
    if (result.error) throw result.error;

    semanasData = result.data || [];
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
  var done  = data.filter(function(s) { return s.completado; }).length;
  var total = data.length;
  var pct   = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progressFraction').textContent = done + '/' + total;
  document.getElementById('progressPct').textContent      = pct + '% completado';
  document.getElementById('progressBar').style.width      = pct + '%';
}

// =============================================
//  RENDERIZAR TARJETAS
// =============================================
function renderWeeks(data) {
  var grid = document.getElementById('weeksGrid');
  grid.innerHTML = '';

  if (!data || data.length === 0) {
    grid.innerHTML = '<div class="loading-box"><p>No hay semanas registradas todavía.</p></div>';
    return;
  }

  data.forEach(function(sem, i) {
    var card   = document.createElement('div');
    card.className = 'week-card';
    card.style.animationDelay = (i * 0.04) + 's';

    var done   = sem.completado;
    var pClass = done ? 'done' : 'pending';
    var pText  = done ? '✓ Completado' : '○ Pendiente';

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
    var result = await withTimeout(
      db.from('semanas').update({ completado: checked }).eq('id', id)
    );
    if (result.error) throw result.error;

    var sem = semanasData.find(function(s) { return s.id === id; });
    if (sem) sem.completado = checked;
    updateProgress(semanasData);

    var pill = document.getElementById('pill-' + id);
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
    var result = await withTimeout(
      db.from('archivos').select('*', { count: 'exact', head: true }).eq('semana_id', semId)
    );
    if (result.error) throw result.error;
    var count = result.count;
    var el = document.getElementById('fc-' + semId);
    if (el) el.textContent = count > 0 ? '📄 ' + count + ' archivo' + (count !== 1 ? 's' : '') : 'Sin archivos';
  } catch (err) {
    var el = document.getElementById('fc-' + semId);
    if (el) el.textContent = '⚠️ N/D';
  }
}

// =============================================
//  MODAL — ABRIR CON ANIMACIÓN CARTA
// =============================================
async function openModal(semId) {
  currentSemId = semId;
  var sem = semanasData.find(function(s) { return s.id === semId; });
  if (!sem) return;

  document.getElementById('modalBadge').textContent = 'Semana ' + sem.numero;
  document.getElementById('modalTitle').textContent  = 'Semana ' + sem.numero + ' — ' + sem.titulo;
  document.getElementById('modalDesc').textContent   = sem.descripcion_larga || sem.descripcion;
  document.getElementById('modalFiles').innerHTML    = '<div class="loading-box" style="padding:1.2rem"><div class="spinner"></div></div>';

  var overlay = document.getElementById('modalOverlay');
  var box     = document.getElementById('modalBox');

  box.classList.remove('carta-abriendo', 'carta-cerrando');
  overlay.style.display    = 'flex';
  overlay.style.opacity    = '0';
  document.body.style.overflow = 'hidden';

  void box.offsetWidth;

  overlay.style.transition = 'opacity 0.3s ease';
  overlay.style.opacity    = '1';
  box.classList.add('carta-abriendo');

  var container = document.getElementById('modalFiles');
  try {
    var result = await withTimeout(
      db.from('archivos').select('*').eq('semana_id', semId)
    );
    if (result.error) throw result.error;
    var files = result.data;

    container.innerHTML = '';

    if (!files || files.length === 0) {
      container.innerHTML = '<p class="no-files-msg">Sin archivos por ahora.</p>';
    } else {
      files.forEach(function(f) {
        container.appendChild(buildFileRow(f, semId));
      });
    }
  } catch (err) {
    container.innerHTML = '<p class="no-files-msg" style="color:var(--red)">⚠️ Error al cargar archivos.</p>';
  }

  // Zona de subida (solo admin)
  if (isAdmin) {
    container.appendChild(buildUploadZone());
  }
}

// =============================================
//  CONSTRUIR FILA DE ARCHIVO
// =============================================
function buildFileRow(f, semId) {
  var isUrl = f.tipo === 'url';
  var row = document.createElement('div');
  row.className = 'file-row' + (isUrl ? ' is-url' : '');
  row.id = 'frow-' + f.id;

  var icon = getUrlIcon(f.url, f.nombre);

  var btnsHtml =
    '<button class="btn-ver" onclick="window.open(\'' + f.url.replace(/'/g, "\\'") + '\',\'_blank\')">👁 Ver</button>';

  if (!isUrl) {
    btnsHtml += '<button class="btn-dl" onclick="dlFile(\'' + f.url.replace(/'/g, "\\'") + '\',\'' + f.nombre.replace(/'/g, "\\'") + '\')">⬇️ Descargar</button>';
  }

  if (isAdmin) {
    btnsHtml += '<button class="btn-del" id="bdel-' + f.id + '" onclick="deleteFile(' + f.id + ',\'' + f.url.replace(/'/g, "\\'") + '\',' + semId + ',\'' + (f.tipo || '') + '\')">🗑 Eliminar</button>';
  }

  row.innerHTML =
    '<span class="file-name"><span class="file-name-icon">' + icon + '</span>' + escapeHtml(f.nombre) + '</span>' +
    '<div class="file-btns">' + btnsHtml + '</div>';

  return row;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =============================================
//  CONSTRUIR ZONA DE SUBIDA CON TABS
// =============================================
function buildUploadZone() {
  var wrap = document.createElement('div');
  wrap.style.marginTop = '1rem';

  wrap.innerHTML =
    '<div class="upload-tabs">' +
      '<button class="upload-tab' + (activeTab === 'file' ? ' active' : '') + '" onclick="switchTab(\'file\')">📄 Subir archivo</button>' +
      '<button class="upload-tab' + (activeTab === 'url'  ? ' active' : '') + '" onclick="switchTab(\'url\')">🔗 Agregar URL</button>' +
    '</div>' +

    /* PANEL ARCHIVO */
    '<div class="upload-panel' + (activeTab === 'file' ? ' active' : '') + '" id="panelFile">' +
      '<div class="upload-zone">' +
        '<input type="file" id="fileInput" style="display:none" onchange="uploadFile(this)"/>' +
        '<button class="btn-upload" onclick="document.getElementById(\'fileInput\').click()">+ Subir archivo</button>' +
        '<p>PDF · DOCX · SQL · TXT · XLSX · cualquier formato · Max 50 MB</p>' +
      '</div>' +
    '</div>' +

    /* PANEL URL */
    '<div class="upload-panel' + (activeTab === 'url'  ? ' active' : '') + '" id="panelUrl">' +
      '<span class="url-label-txt">Pega la URL (YouTube, Drive, GitHub, etc.)</span>' +
      '<input type="url" class="field-input-sm" id="urlInput" placeholder="https://youtube.com/watch?v=..." />' +
      '<div class="url-name-row">' +
        '<input type="text" class="field-input-sm" id="urlName" placeholder="Nombre para mostrar (opcional)" />' +
        '<button class="btn-add-url" onclick="addUrl()">+ Agregar</button>' +
      '</div>' +
    '</div>';

  return wrap;
}

// =============================================
//  CAMBIAR TAB
// =============================================
function switchTab(tab) {
  activeTab = tab;
  var tabs = document.querySelectorAll('.upload-tab');
  tabs.forEach(function(t, i) {
    t.classList.toggle('active', (i === 0 && tab === 'file') || (i === 1 && tab === 'url'));
  });
  var pFile = document.getElementById('panelFile');
  var pUrl  = document.getElementById('panelUrl');
  if (pFile) pFile.classList.toggle('active', tab === 'file');
  if (pUrl)  pUrl.classList.toggle('active',  tab === 'url');
}

// =============================================
//  MODAL — CERRAR CON ANIMACIÓN CARTA
// =============================================
function closeModal() {
  var overlay = document.getElementById('modalOverlay');
  var box     = document.getElementById('modalBox');

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
    activeTab = 'file';
  }, 420);
}

// =============================================
//  ELIMINAR ARCHIVO
// =============================================
async function deleteFile(fileId, fileUrl, semId, tipo) {
  if (!isAdmin) return;
  if (!confirm('¿Eliminar este archivo? Esta acción no se puede deshacer.')) return;

  var btn = document.getElementById('bdel-' + fileId);
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

  try {
    // Solo borrar del storage si es un archivo real (no URL)
    if (tipo !== 'url') {
      var marker = '/portafolio-archivos/';
      if (fileUrl.includes(marker)) {
        var storagePath = fileUrl.split(marker)[1];
        await withTimeout(db.storage.from('portafolio-archivos').remove([storagePath]));
      }
    }

    var result = await withTimeout(
      db.from('archivos').delete().eq('id', fileId)
    );
    if (result.error) throw result.error;

    var row = document.getElementById('frow-' + fileId);
    if (row) {
      row.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
      row.style.opacity    = '0';
      row.style.transform  = 'translateX(20px)';
      setTimeout(function() { row.remove(); }, 300);
    }

    fetchFileCount(semId);
    showToast('🗑 Eliminado correctamente');
  } catch (err) {
    showToast('❌ Error: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = '🗑 Eliminar'; }
  }
}

// =============================================
//  DESCARGAR
// =============================================
function dlFile(url, nombre) {
  var a    = document.createElement('a');
  a.href     = url;
  a.download = nombre;
  a.target   = '_blank';
  a.click();
}

// =============================================
//  SUBIR ARCHIVO — SIN SANITIZAR EL NOMBRE
// =============================================
async function uploadFile(input) {
  var file = input.files[0];
  if (!file || !currentSemId) return;

  showToast('⏳ Subiendo archivo...');

  // Usamos el nombre original tal cual, solo escapamos caracteres que
  // rompen la ruta del storage (barras y nulos). El nombre de display
  // queda intacto en la base de datos.
  var originalName = file.name;
  var safePath = originalName
    .replace(/\//g, '_')
    .replace(/\\/g, '_')
    .replace(/\0/g, '_');

  var path = 'semana-' + currentSemId + '/' + Date.now() + '-' + safePath;

  try {
    var upResult = await withTimeout(
      db.storage.from('portafolio-archivos').upload(path, file)
    );
    if (upResult.error) throw upResult.error;

    var urlData = db.storage.from('portafolio-archivos').getPublicUrl(path);

    var dbResult = await withTimeout(
      db.from('archivos').insert({
        semana_id: currentSemId,
        nombre:    originalName,   // nombre tal cual el usuario lo tenía
        url:       urlData.data.publicUrl,
        tipo:      originalName.split('.').pop().toLowerCase(),
      })
    );
    if (dbResult.error) throw dbResult.error;

    showToast('✅ Archivo subido');
    fetchFileCount(currentSemId);
    openModal(currentSemId);
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

// =============================================
//  AGREGAR URL (YouTube, Drive, etc.)
// =============================================
async function addUrl() {
  var urlVal  = (document.getElementById('urlInput')  || {}).value || '';
  var nameVal = (document.getElementById('urlName')   || {}).value || '';

  urlVal  = urlVal.trim();
  nameVal = nameVal.trim();

  if (!urlVal) {
    showToast('⚠️ Escribe una URL primero');
    return;
  }

  // Validar que sea una URL con protocolo
  if (!urlVal.startsWith('http://') && !urlVal.startsWith('https://')) {
    urlVal = 'https://' + urlVal;
  }

  // Nombre automático si no puso nada
  if (!nameVal) {
    try {
      var hostname = new URL(urlVal).hostname.replace('www.', '');
      nameVal = hostname;
    } catch(e) {
      nameVal = 'Enlace externo';
    }
  }

  if (!currentSemId) return;

  showToast('⏳ Guardando enlace...');

  try {
    var dbResult = await withTimeout(
      db.from('archivos').insert({
        semana_id: currentSemId,
        nombre:    nameVal,
        url:       urlVal,
        tipo:      'url',
      })
    );
    if (dbResult.error) throw dbResult.error;

    showToast('✅ Enlace agregado');
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
  var t = document.getElementById('toast');
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
    window.scrollY > 20 ? '0 4px 32px rgba(0,0,0,0.35)' : '';
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
