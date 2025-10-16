// script.js
// ==== INVENTARIO INICIAL (Añade nuevos ítems aquí) ====
// Si quieres que la aplicación venga con inventario pre-poblado, añade objetos
// al array DEFAULT_INVENTARIO abajo. Cada objeto debe tener la forma:
// { tipo: 'aceite', referencia: 'REF123', cantidad: 5, obs: 'Descripción opcional' }
// Ejemplo: { tipo: 'aceite', referencia: 'ZF-12345', cantidad: 10, obs: 'stock inicial' }
//
// Nota: Si prefieres usar la UI, puedes añadir ítems desde el modal "Añadir filtro".
// Este bloque es útil para definir un inventario inicial que se crea solo si
// localStorage no tiene ya la clave 'inventario_filtros'.
const DEFAULT_INVENTARIO = [
    // Inventario inicial solicitado por el usuario:
    { tipo: 'guantes', referencia: 'GUANTES', cantidad: 0, obs: '' },
    { tipo: 'escobillas', referencia: 'ESCOBILLAS', cantidad: 0, obs: '' },
    { tipo: 'baterias', referencia: 'BATERIAS', cantidad: 1, obs: '' },
    { tipo: 'antigelo', referencia: 'ANTIGELO', cantidad: 2, obs: '2L' },
    { tipo: 'desgrasante', referencia: 'DESGRASANTE', cantidad: 3, obs: '3L' },
    { tipo: 'cerraduras', referencia: 'CERRADURAS', cantidad: 5, obs: '8092332415' },
    { tipo: 'portavacas', referencia: 'PORTAVACAS', cantidad: 5, obs: '' },
    { tipo: 'porta_escaleras', referencia: 'PORTA_ESCALERAS', cantidad: 5, obs: '' },
    { tipo: 'panledo', referencia: 'PANLEDO', cantidad: 1, obs: '' }
];

// Nuevos ítems solicitados (añadidos también al inventario por defecto)
DEFAULT_INVENTARIO.push(
    { tipo: 'Estanterias', referencia: 'SCAFFALI', cantidad: 0, obs: '' },
    { tipo: 'lamparas', referencia: 'LAMPARAS_H1_H7', cantidad: 0, obs: 'H1, H7' },
    { tipo: 'dot4', referencia: 'DOT-4', cantidad: 0, obs: '' },
    { tipo: 'limpiacristales', referencia: 'LIMPIACRISTALES', cantidad: 0, obs: '' },
    { tipo: 'limpiacontactos', referencia: 'LIMPIACONTACTOS', cantidad: 0, obs: '' },
    { tipo: 'limpiafrenos', referencia: 'LIMPIAFRENOS', cantidad: 0, obs: '' }
);

function initDefaultInventory() {
    try {
        const existing = localStorage.getItem('inventario_filtros');
        if (!existing) {
            localStorage.setItem('inventario_filtros', JSON.stringify(DEFAULT_INVENTARIO));
            console.log('initDefaultInventory: inventario inicial creado desde DEFAULT_INVENTARIO');
        }
    } catch (e) {
        console.error('Error inicializando inventario por defecto', e);
    }
}

function reducirStock(id) {
    let elemento = document.getElementById(id);
    let cantidad = parseInt(elemento.innerText);
    if (cantidad > 0) {
        cantidad--;
        elemento.innerText = cantidad;
    } else {
        alert(t('msg_stock_agotado','Stock agotado'));
    }
}

function añadirStock(id) {
    let elemento = document.getElementById(id);
    let cantidad = parseInt(elemento.innerText);
    cantidad++;
    elemento.innerText = cantidad;
}

// Keep inventario_filtros in sync when incrementing/decrementing generic filtros stock
function _syncInventarioForStockChange(delta) {
    // delta: positive or negative integer to add to 'other' generic stock as tipo 'aceite' if unspecified
    try {
        let inv = JSON.parse(localStorage.getItem('inventario_filtros') || '[]');
        // If there is a generic placeholder item, update it; else create one
        let item = inv.find(i => i.referencia === 'GENERIC_STOCK');
        if (!item) {
            item = { tipo: 'aceite', referencia: 'GENERIC_STOCK', cantidad: 0, obs: 'Stock genérico', fecha: new Date().toISOString() };
            inv.push(item);
        }
        item.cantidad = Math.max(0, (parseInt(item.cantidad) || 0) + delta);
        localStorage.setItem('inventario_filtros', JSON.stringify(inv));
        updateTotalsAndChart();
    } catch (e) {
        console.error('Error syncing inventario:', e);
    }
}

// Wrap existing functions to maintain inventory sync when hitting the stock-filtros control
const _origReducirStock = reducirStock;
reducirStock = function(id) {
    _origReducirStock(id);
    if (id === 'stock-filtros') {
        _syncInventarioForStockChange(-1);
    } else {
        try { updateInventoryForDomStock(id, -1); } catch(e){}
    }
    try { updateTotalsAndChart(); } catch(e){}
}

const _origAñadirStock = añadirStock;
añadirStock = function(id) {
    _origAñadirStock(id);
    if (id === 'stock-filtros') {
        _syncInventarioForStockChange(1);
    } else {
        try { updateInventoryForDomStock(id, 1); } catch(e){}
    }
    try { updateTotalsAndChart(); } catch(e){}
}

// Helper: sync a DOM stock element id like 'stock-guantes' to inventario_filtros
function normalizeKey(s) {
    return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
}

function updateInventoryForDomStock(domId, delta) {
    if (!domId || !domId.startsWith('stock-')) return;
    const suffix = domId.slice(6); // e.g. 'guantes' or 'portaescaleras'
    const norm = normalizeKey(suffix);
    let inv = JSON.parse(localStorage.getItem('inventario_filtros') || '[]');
    let found = false;
    for (let i = 0; i < inv.length; i++) {
        const it = inv[i];
        const tnorm = normalizeKey(it.tipo);
        const rnorm = normalizeKey(it.referencia);
        if (tnorm === norm || rnorm === norm) {
            inv[i].cantidad = Math.max(0, (parseInt(inv[i].cantidad) || 0) + delta);
            found = true;
            break;
        }
    }
    if (!found) {
        // create a new inventory entry for this material
        const tipoName = suffix.replace(/[-]/g,'_');
        inv.push({ tipo: tipoName, referencia: suffix.toUpperCase(), cantidad: Math.max(0, delta), obs: '', fecha: new Date().toISOString() });
    }
    localStorage.setItem('inventario_filtros', JSON.stringify(inv));
    try { logMovement(delta>0? 'add':'use', `${Math.abs(delta)} ${suffix}`); } catch(e){}
}

function guardarNota() {
    let nota = document.getElementById("nota").value;
    if (nota) {
        const fecha = new Date().toLocaleString(); // Fecha de la nota
        const nuevaNota = {
            fecha: fecha,
            texto: nota
        };

        // Obtener notas guardadas o crear un array vacío
        let notasGuardadas = JSON.parse(localStorage.getItem('notas')) || [];
        notasGuardadas.push(nuevaNota);

        // Guardar en localStorage
        localStorage.setItem('notas', JSON.stringify(notasGuardadas));

        // Limpiar textarea
        document.getElementById("nota").value = '';

        // Actualizar la lista de notas
        cargarNotas();
    } else {
        alert(t('msg_escribe_nota','Por favor, escribe una nota.'));
    }
}

function cargarNotas() {
    const notesList = document.getElementById('notes-list');
    notesList.innerHTML = ''; // Limpiar la lista actual

    let notasGuardadas = JSON.parse(localStorage.getItem('notas')) || [];

    if (notasGuardadas.length > 0) {
        notasGuardadas.forEach((nota, index) => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            noteItem.innerHTML = `
                <div>
                    <strong>${nota.fecha}</strong><br>${nota.texto}
                </div>
                <button data-admin-only onclick="borrarNota(${index})">Borrar</button>
            `;
            notesList.appendChild(noteItem);
        });
        // Apply role visibility for delete buttons
        if (typeof applyRoleUI === 'function') applyRoleUI();
    }
}

function borrarNota(index) {
    let notasGuardadas = JSON.parse(localStorage.getItem('notas')) || [];
    notasGuardadas.splice(index, 1);
    localStorage.setItem('notas', JSON.stringify(notasGuardadas));

    cargarNotas(); // Actualizar la lista después de borrar
}

// Central initialization
function initApp() {
    cargarNotas();
    loadUsosFiltros();
    // Inicializar inventario por defecto si no existe (edita DEFAULT_INVENTARIO arriba para cambiar)
    initDefaultInventory();
    // Inicializar stock-filtros a partir del inventario persistido
    try {
        const inv = JSON.parse(localStorage.getItem('inventario_filtros') || '[]');
        // compute total for filter-only types
        const totalFilters = inv.reduce((s, it) => {
            const t = (it.tipo || '').toString().toLowerCase();
            if (FILTER_TYPES.has(t) || t.includes('filtro')) return s + (parseInt(it.cantidad) || 0);
            return s;
        }, 0);
        const stockEl = document.getElementById('stock-filtros');
        if (stockEl) stockEl.innerText = totalFilters;
        // También actualizar totales y gráfico
        updateTotalsAndChart();
    } catch (e) {
        console.error('Error inicializando inventario:', e);
    }

    // Apply role-based UI and translations
    if (!localStorage.getItem('current_role')) localStorage.setItem('current_role','user');
    applyRoleUI();
    const pref = localStorage.getItem('preferredLang') || (navigator.language || 'es').slice(0,2);
    const lang = ['es','en','it'].includes(pref) ? pref : 'es';
    const select = document.getElementById('lang-select');
    if (select) select.value = lang;
    try { document.documentElement.lang = lang; } catch(e){}
    applyTranslations(lang);
    // update materials chart
    updateMaterialsAndChart();
}

document.addEventListener('DOMContentLoaded', initApp);

// ----------------- Login / Users / Movements -----------------
function openLoginModal() {
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    document.getElementById('login-modal').style.display = 'flex';
}

function closeLoginModal() { document.getElementById('login-modal').style.display = 'none'; }

function currentUser() { return JSON.parse(localStorage.getItem('current_user') || 'null'); }

function setCurrentUser(userObj) {
    if (userObj) localStorage.setItem('current_user', JSON.stringify(userObj));
    else localStorage.removeItem('current_user');
    renderCurrentUser();
}

function renderCurrentUser() {
    const cu = currentUser();
    const el = document.getElementById('current-user');
    const loginBtn = document.getElementById('login-btn');
    if (cu) {
        if (el) el.textContent = `Usuario: ${cu.username} ${cu.role === 'admin' ? '(Admin)' : ''}`;
        if (loginBtn) loginBtn.textContent = 'Logout';
        if (loginBtn) loginBtn.onclick = logout;
    } else {
        if (el) el.textContent = '';
        if (loginBtn) loginBtn.textContent = 'Login';
        if (loginBtn) loginBtn.onclick = openLoginModal;
    }
    applyRoleUI();
}

function logout() { setCurrentUser(null); alert(t('msg_sesion_cerrada','Sesión cerrada')); }

async function doLogin() {
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value || '';
    if (!u) { alert(t('msg_introduce_usuario','Introduce usuario')); return; }

    // users persisted in localStorage as { username: { passwordHash, role } }
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const pwHash = await hashPasswordHex(p || '');

    if (users[u]) {
        if (users[u].passwordHash === pwHash) {
            // login success
            setCurrentUser({ username: u, role: users[u].role || 'user' });
            closeLoginModal();
            alert(t('msg_bienvenido','Bienvenido ') + u);
            renderMovements();
        } else {
            alert(t('msg_user_incorrect','Usuario o contraseña incorrectos'));
        }
    } else {
        // create user: first user ever becomes admin
        const isFirst = Object.keys(users).length === 0;
        users[u] = { passwordHash: pwHash, role: isFirst ? 'admin' : 'user' };
        localStorage.setItem('users', JSON.stringify(users));
        setCurrentUser({ username: u, role: users[u].role });
        closeLoginModal();
    alert(t('msg_user_created_role','Usuario creado. Rol asignado: ') + users[u].role);
        renderMovements();
    }
}

// Movements logging
function logMovement(type, details) {
    const cu = currentUser();
    const username = cu ? cu.username : 'anon';
    const mv = JSON.parse(localStorage.getItem('movements') || '[]');
    mv.push({ fecha: new Date().toLocaleString(), user: username, tipo: type, detalles: details });
    localStorage.setItem('movements', JSON.stringify(mv));
    renderMovements();
}

function renderMovements() {
    const list = document.getElementById('movements-list');
    if (!list) return;
    // Only admins can view movements: non-admins see nothing
    if (getCurrentRole() !== 'admin') {
        list.innerHTML = '';
        return;
    }
    const mv = JSON.parse(localStorage.getItem('movements') || '[]').slice().reverse();
    list.innerHTML = '';
    if (mv.length === 0) { list.innerHTML = `<div>${t('msg_no_movements','No hay movimientos')}</div>`; return; }
    mv.forEach(m => {
        const d = document.createElement('div');
        d.style.padding = '6px';
        d.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
        const displayUser = m.user || t('user_hidden','[oculto]');
        d.innerHTML = `<strong>${m.fecha}</strong> <em>${displayUser}</em> - ${m.tipo}: ${m.detalles}`;
        list.appendChild(d);
    });
}

// Ensure current user is rendered on load
document.addEventListener('DOMContentLoaded', function() { renderCurrentUser(); renderMovements(); });

// ---- Nuevo: Añadir filtro al inventario (modal) ----
function openAddFilterForm() {
    const m = document.getElementById('add-filtro-modal');
    if (m) m.style.display = 'flex';
}

function closeAddFilterForm() {
    const m = document.getElementById('add-filtro-modal');
    if (m) m.style.display = 'none';
    // limpiar campos
    const form = document.getElementById('add-filtro-form');
    if (form) form.reset();
}

function submitAddFilterForm() {
    const tipo = document.getElementById('add-tipo-filtro').value;
    const referencia = document.getElementById('add-referencia').value.trim();
    const cantidad = parseInt(document.getElementById('add-cantidad').value) || 0;
    const obs = document.getElementById('add-observaciones').value || '';

    if (!tipo || !referencia || cantidad <= 0) {
        alert(t('msg_fill_type_ref_amount','Por favor rellena tipo, referencia y cantidad.'));
        return;
    }

    // Inventario en localStorage: key 'inventario_filtros' -> array de items {tipo, referencia, cantidad, obs, fecha}
    let inv = JSON.parse(localStorage.getItem('inventario_filtros') || '[]');

    // Buscar si existe la referencia del mismo tipo -> sumar
    const existing = inv.find(i => i.tipo === tipo && i.referencia.toLowerCase() === referencia.toLowerCase());
    if (existing) {
        existing.cantidad = (existing.cantidad || 0) + cantidad;
        existing.obs = obs || existing.obs;
    } else {
        inv.push({ tipo, referencia, cantidad, obs, fecha: new Date().toISOString() });
    }

    localStorage.setItem('inventario_filtros', JSON.stringify(inv));

    // Actualizar stock visible si es el 'stock-filtros' que manejamos generically
    const stockEl = document.getElementById('stock-filtros');
    if (stockEl) {
        const current = parseInt(stockEl.innerText) || 0;
        stockEl.innerText = current + cantidad;
    }

    // Intentar inferir el modelo automáticamente para esta referencia y guardarla en refs_by_model
    try {
        const inferredModel = getModelForRef(referencia, null, tipo) || 'SIN_MODELO';
        saveRefToModel(referencia, inferredModel, { tipo, cantidad, descripcion: obs });
        // Small feedback
        console.log(`submitAddFilterForm: referencia ${referencia} asignada a modelo ${inferredModel}`);
    } catch (e) {
        console.error('Error guardando referencia por modelo', e);
    }

    closeAddFilterForm();
    updateTotalsAndChart();

    // Log movement: adding material
    try {
        logMovement('add', `${cantidad} ${tipo} - ${referencia}`);
    } catch(e) {}
}

// Calcular totales a partir de inventario y pintar el gráfico
function updateTotalsAndChart() {
    const inv = JSON.parse(localStorage.getItem('inventario_filtros') || '[]');
    // For the filtros-chart we only show filter types
    const filterCounts = {};
    const totalFilters = inv.reduce((s, it) => {
        const t = (it.tipo || '').toString().toLowerCase();
        const q = parseInt(it.cantidad) || 0;
        if (FILTER_TYPES.has(t) || t.includes('filtro')) {
            filterCounts[t] = (filterCounts[t] || 0) + q;
            return s + q;
        }
        return s;
    }, 0);

    const totalEl = document.getElementById('total-filtros');
    if (totalEl) totalEl.innerText = totalFilters;

    drawPieChart('filtros-chart', filterCounts, 'filtros-legend');

    // Also update the new filtros por referencia chart
    try { updateFilterReferencesChart(); } catch(e) { console.error('updateFilterReferencesChart error', e); }

    // Also refresh materials chart (non-filter items)
    try { updateMaterialsAndChart(); } catch(e){}
}

// New: materials chart (group by tipo from inventario_filtros)
// Types that should be considered FILTERS and excluded from the materials-only chart
const FILTER_TYPES = new Set(['aceite','aire','habitaculo','combustible','filtro','filtros']);

function updateMaterialsAndChart() {
    const inv = JSON.parse(localStorage.getItem('inventario_filtros') || '[]');
    const counts = {};

    // Pre-seed counts with all material types defined in DEFAULT_INVENTARIO (excluding filters)
    DEFAULT_INVENTARIO.forEach(i => {
        const tipoRaw = (i.tipo || 'otros').toString().toLowerCase();
        if (FILTER_TYPES.has(tipoRaw) || tipoRaw.includes('filtro')) return;
        if (!counts[tipoRaw]) counts[tipoRaw] = 0;
    });

    // Add current inventory quantities
    inv.forEach(it => {
        const tipoRaw = (it.tipo || 'otros').toString().toLowerCase();
        if (FILTER_TYPES.has(tipoRaw) || tipoRaw.includes('filtro')) return;
        const q = parseInt(it.cantidad) || 0;
        counts[tipoRaw] = (counts[tipoRaw] || 0) + q;
    });

    // Total materiales (sum of quantities of non-filter items)
    const total = Object.values(counts).reduce((s,v) => s + (v||0), 0);
    const totalEl = document.getElementById('total-materiales');
    if (totalEl) totalEl.innerText = total;

    drawPieChart('materials-chart', counts, 'materials-legend');
}

// New: chart that shows number of filter items grouped by referencia
function updateFilterReferencesChart() {
    try {
        const inv = JSON.parse(localStorage.getItem('inventario_filtros') || '[]');
        const counts = {};
        inv.forEach(it => {
            const tipoRaw = (it.tipo || '').toString().toLowerCase();
            if (!(FILTER_TYPES.has(tipoRaw) || tipoRaw.includes('filtro'))) return; // only filters
            const ref = (it.referencia || 'SIN_REF').toString();
            counts[ref] = (counts[ref] || 0) + (parseInt(it.cantidad) || 0);
        });

        // Ensure at least keys for popular defaults exist (optional)
        drawPieChart('filtros-ref-chart', counts, 'filtros-ref-legend');
    } catch (e) {
        console.error('Error updating filter references chart', e);
    }
}

// Material groups management (admin editable)
function loadMaterialGroups() {
    // structure: { groupName: [ tipo1, tipo2, ... ], ... }
    try {
        const raw = localStorage.getItem('material_groups');
        if (raw) return JSON.parse(raw);
    } catch(e){}
    // default groups seeded from DEFAULT_INVENTARIO types
    const defaultGroups = {};
    DEFAULT_INVENTARIO.forEach(it => {
        const tipo = (it.tipo || 'otros').toString();
        // put each tipo in a default 'Otros' group unless it looks like a material
        if (!defaultGroups['Materiales']) defaultGroups['Materiales'] = [];
        if (!defaultGroups['Materiales'].includes(tipo)) defaultGroups['Materiales'].push(tipo);
    });
    return defaultGroups;
}

function openMaterialGroupsEditor() {
    const modal = document.getElementById('material-groups-modal');
    const ta = document.getElementById('material-groups-json');
    if (!modal || !ta) return;
    const groups = loadMaterialGroups();
    ta.value = JSON.stringify(groups, null, 2);
    modal.style.display = 'flex';
}

function closeMaterialGroupsEditor() {
    const modal = document.getElementById('material-groups-modal');
    if (modal) modal.style.display = 'none';
}

function saveMaterialGroups() {
    const ta = document.getElementById('material-groups-json');
    if (!ta) return;
    try {
        const parsed = JSON.parse(ta.value);
        localStorage.setItem('material_groups', JSON.stringify(parsed));
        closeMaterialGroupsEditor();
        updateMaterialsAndChart();
        alert(t('msg_groups_saved','Grupos guardados'));
    } catch (e) {
        alert(t('msg_groups_invalid','JSON inválido. Corrige el formato.'));
    }
}

// Dibujar un gráfico circular simple en canvas
function drawPieChart(canvasId, dataObj, legendId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    // Use all entries for the legend (including zero values) but draw slices only for positive values
    const entries = Object.entries(dataObj);
    const positiveEntries = entries.filter(e => (e[1] || 0) > 0);
    const total = positiveEntries.reduce((s,e)=> s + e[1], 0);
    let start = -0.5 * Math.PI;
    // New palette: teal, gold, mint, coral, violet, red (good contrast)
    const colors = ['#2E86AB','#F6C85F','#6FB07F','#F26419','#8E7CC3','#F26B6B'];

    const legend = document.getElementById(legendId);
    if (legend) legend.innerHTML = '';

    // Draw slices only for positive entries
    positiveEntries.forEach((entry, idx) => {
        const [key, val] = entry;
        const slice = (val/total) * Math.PI * 2;
        const end = start + slice;

        ctx.beginPath();
        ctx.moveTo(w/2, h/2);
        ctx.arc(w/2, h/2, Math.min(w,h)/2 - 10, start, end);
        ctx.closePath();
        ctx.fillStyle = colors[idx % colors.length];
        ctx.fill();

        start = end;
    });

    // Build legend for all entries (including zeros). Use translations for material labels when available.
    entries.forEach((entry, idx) => {
        const [key, val] = entry;
        const displayLabel = t(`material_${key}`, key);
        const perc = total > 0 ? (((val||0)/total)*100).toFixed(0) : '0';
        if (legend) {
            const item = document.createElement('div');
            item.style.marginBottom = '6px';
            item.innerHTML = `<span style="display:inline-block;width:12px;height:12px;background:${colors[idx % colors.length]};margin-right:8px;"></span> ${displayLabel} : ${val || 0} (${perc}%)`;
            legend.appendChild(item);
        }
    });

    // If no positive entries, draw 'Sin datos' message in center but keep legend visible
    if (positiveEntries.length === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(t('msg_no_data','Sin datos'), w/2, h/2);
    }
}

// Call updateTotals on load to reflect any existing stored inventory
document.addEventListener('DOMContentLoaded', function() {
    updateTotalsAndChart();
});

// -- Roles: admin / user
async function changeRole(role) {
    if (!role) return;
    const prev = getCurrentRole();
    // If trying to elevate to admin, require admin password
    if (role === 'admin' && prev !== 'admin') {
        const storedHash = localStorage.getItem('admin_pw_hash');
        if (storedHash) {
            const pw = prompt(t('msg_prompt_admin_pw','Introduce la contraseña de administrador:'));
            if (!pw) {
                // revert select
                const sel = document.getElementById('role-select'); if (sel) sel.value = prev;
                return;
            }
            const given = await hashPasswordHex(pw);
            if (given !== storedHash) {
                alert(t('msg_admin_pwd_incorrect','Contraseña incorrecta. Acceso a admin denegado.'));
                const sel = document.getElementById('role-select'); if (sel) sel.value = prev;
                return;
            }
            // ok
        } else {
            // No admin password set: ask to create one
            if (!confirm(t('msg_confirm_create_admin_pwd','No existe contraseña de administrador. ¿Deseas crearla ahora y activar modo admin?'))) {
                const sel = document.getElementById('role-select'); if (sel) sel.value = prev;
                return;
            }
            const pwNew = prompt(t('msg_prompt_new_admin_pwd','Introduce nueva contraseña de administrador:'));
            if (!pwNew) { const sel = document.getElementById('role-select'); if (sel) sel.value = prev; return; }
            const hashNew = await hashPasswordHex(pwNew);
            localStorage.setItem('admin_pw_hash', hashNew);
            alert(t('msg_admin_pwd_created','Contraseña admin creada. Modo admin activado.'));
        }
    }

    localStorage.setItem('current_role', role);
    applyRoleUI();
}

function getCurrentRole() {
    return localStorage.getItem('current_role') || 'user';
}

function applyRoleUI() {
    const role = getCurrentRole();
    const adminArea = document.getElementById('admin-area');
    if (adminArea) adminArea.style.display = (role === 'admin') ? 'block' : 'none';

    // Hide/Show all delete buttons depending on role
    document.querySelectorAll('[data-admin-only]').forEach(el => {
        el.style.display = (role === 'admin') ? '' : 'none';
    });

    // Set role-select UI
    const sel = document.getElementById('role-select');
    if (sel) sel.value = role;
}

// Protect performProtectedDelete to require admin role or password
const _origPerformProtectedDelete = performProtectedDelete;
performProtectedDelete = function(storageKey) {
    const role = getCurrentRole();
    if (role === 'admin') {
        // Admin can delete without password
        _origPerformProtectedDelete(storageKey);
    } else {
        // Non-admins cannot delete
        alert(t('msg_no_permission_delete','No tienes permiso para borrar. Contacta con un Administrador.'));
    }
};

// Apply role UI on load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize role if absent
    if (!localStorage.getItem('current_role')) localStorage.setItem('current_role','user');
    applyRoleUI();
});

// --- Password-protected deletion logic ---
let _pendingDeleteKey = null;

function promptProtectedDelete(storageKey) {
    _pendingDeleteKey = storageKey;
    document.getElementById('pw-setup-instructions').textContent = t('msg_pw_instructions','Introduce la contraseña de administrador para confirmar la acción. Si no existe, se te pedirá crearla.');
    document.getElementById('admin-pw-input').value = '';
    const modal = document.getElementById('pw-modal');
    if (modal) modal.style.display = 'flex';
}

function closePwModal() {
    const modal = document.getElementById('pw-modal');
    if (modal) modal.style.display = 'none';
    _pendingDeleteKey = null;
}

// Helper: hash password with SHA-256 and return hex
async function hashPasswordHex(pw) {
    const enc = new TextEncoder();
    const data = enc.encode(pw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
}

async function confirmProtectedDelete() {
    const pw = document.getElementById('admin-pw-input').value || '';
    if (!_pendingDeleteKey) { closePwModal(); return; }

    const storedHash = localStorage.getItem('admin_pw_hash');
    const givenHash = await hashPasswordHex(pw);

    if (!storedHash) {
        // No password set yet: create it
        if (!pw) { alert(t('msg_enter_new_pwd','Debes introducir una contraseña nueva.')); return; }
        if (!confirm(t('msg_confirm_create_pwd','No existe contraseña. ¿Quieres crear esta contraseña como administrador?'))) return;
        localStorage.setItem('admin_pw_hash', givenHash);
        alert(t('msg_pwd_created_proceed','Contraseña creada. Procediendo con la acción.'));
        performProtectedDelete(_pendingDeleteKey);
        closePwModal();
        return;
    }

    if (storedHash === givenHash) {
        performProtectedDelete(_pendingDeleteKey);
        closePwModal();
    } else {
        alert(t('msg_pwd_incorrect','Contraseña incorrecta.'));
    }
}

function performProtectedDelete(storageKey) {
    try {
        localStorage.removeItem(storageKey);
        // If deleting inventory, also reset displayed stock and totals
        if (storageKey === 'inventario_filtros') {
            const stockEl = document.getElementById('stock-filtros');
            if (stockEl) stockEl.innerText = '0';
            updateTotalsAndChart();
        }
        if (storageKey === 'notas') cargarNotas();
        if (storageKey === 'usosFiltros') loadUsosFiltros();
        alert(t('msg_deleted','Elemento borrado: ') + storageKey);
    } catch (e) {
        console.error('Error borrando', e);
        alert(t('msg_error_deleting','Error borrando ') + storageKey);
    }
}
    // --- Traducciones y selector de idioma ---
const translations = {
    es: {
        subtitle: 'Gestión de Stock del Taller',
        th_material: 'Material',
        th_cantidad: 'Cantidad',
        th_accion: 'Acción',
        link_filtros: 'Filtros',
        btn_usar: 'Usar',
        btn_añadir: 'Añadir',
        item_guantes: 'Guantes',
        item_escobillas: 'Escobillas',
        notas_title: 'Notas',
        btn_guardar_nota: 'Guardar Nota',
        notas_guardadas: 'Notas Guardadas',
        modal_title: 'Registro de Uso de Filtro',
        label_tipo: 'Tipo de filtro:',
        label_ref: 'Referencia:',
        label_mat: 'Matrícula:',
        label_aceite: 'Cantidad de aceite (litros):',
        label_otras: 'Otras reparaciones:',
        label_obs: 'Observaciones:',
        btn_guardar: 'Guardar',
        btn_cancelar: 'Cancelar'
        ,tabla_titulo: 'Códigos de Filtros',
        th_codigo: 'Código',
        th_descripcion: 'Descripción',
        btn_volver: 'Volver'
        ,site_title: 'Alquiber Renting Flexible'
        ,usos_filtros: 'Usos de Filtros'
        ,marcas_titulo: 'Marcas de Filtros'
        ,filtro_aceite: 'Filtro de aceite'
        ,filtro_aire: 'Filtro de aire'
        ,filtro_combustible: 'Filtro de combustible'
        ,filtro_habitaculo: 'Filtro de habitáculo'
        ,btn_borrar: 'Borrar'
        ,refs_title: 'Referencias por modelo'
        ,refs_instructions: 'Pega aquí tus referencias en el formato: Modelo|Referencia|Descripción opcional, una por línea.'
        ,btn_parse_refs: 'Ordenar y guardar'
        ,btn_clear_refs: 'Eliminar referencias guardadas'
        ,role_user: 'Usuario'
        ,role_admin: 'Administrador'
        ,btn_login: 'Login'
        ,totals_title: 'Totales'
    ,label_total_filtros: 'Total filtros (todos tipos): '
    ,label_total_materiales: 'Total materiales: '
        ,admin_title: 'Administración'
    ,movements_title: 'Movimientos'
        ,admin_protected_desc: '(Borrados protegidos)'
        ,btn_del_inventario: 'Borrar inventario de filtros'
        ,btn_del_notas: 'Borrar todas las notas'
        ,btn_del_usos: 'Borrar usos de filtros'
        ,admin_access_title: 'Acceso administrador'
        ,add_filter_title: 'Añadir filtro al inventario'
        ,label_user: 'Usuario:'
        ,label_pass: 'Contraseña:'
        ,btn_login_action: 'Entrar'
        ,login_title: 'Iniciar sesión'
        ,login_help: 'Si no existe usuario administrador, el primer usuario que se registre será administrador.'
    ,btn_view: 'Ver'
    ,materials_title: 'Materiales'
    ,msg_no_data: 'Sin datos'
    ,msg_no_movements: 'No hay movimientos'
    ,msg_no_permission_view_movements: 'No tienes permiso para ver los movimientos'
    ,user_hidden: '[oculto]'
    ,msg_groups_saved: 'Grupos guardados'
    ,msg_groups_invalid: 'JSON inválido. Corrige el formato.'
    ,groups_editor_title: 'Editor de grupos de materiales'
    ,groups_editor_save: 'Guardar'
    ,groups_editor_cancel: 'Cancelar'
    ,groups_editor_help: 'Modifica la estructura JSON de grupos. Guarda para aplicar.'
    // material labels
    ,material_guantes: 'Guantes'
    ,material_escobillas: 'Escobillas'
    ,material_baterias: 'Baterías'
    ,material_antigelo: 'Anticongelante'
    ,material_desgrasante: 'Desgrasante'
    ,material_cerraduras: 'Cerraduras'
    ,material_portavacas: 'Porta equipajes'
    ,material_porta_escaleras: 'Porta Escaleras'
    ,material_panledo: 'Panledo'
    ,material_scaffali: 'Estanterías'
    ,material_lamparas: 'Lámparas H1/H7'
    ,material_dot4: 'DOT-4'
    ,material_limpiacristales: 'Limpiacristales'
    ,material_limpiacontactos: 'Limpiacontactos'
    ,material_limpiafrenos: 'Limpiador de frenos'
        // mensajes/alerts
        ,msg_stock_agotado: 'Stock agotado'
        ,msg_escribe_nota: 'Por favor, escribe una nota.'
        ,msg_sesion_cerrada: 'Sesión cerrada'
        ,msg_introduce_usuario: 'Introduce usuario'
        ,msg_bienvenido: 'Bienvenido '
        ,msg_user_incorrect: 'Usuario o contraseña incorrectos'
        ,msg_user_created_role: 'Usuario creado. Rol asignado: '
        ,msg_fill_type_ref_amount: 'Por favor rellena tipo, referencia y cantidad.'
        ,msg_prompt_admin_pw: 'Introduce la contraseña de administrador:'
        ,msg_confirm_create_admin_pwd: 'No existe contraseña de administrador. ¿Deseas crearla ahora y activar modo admin?'
        ,msg_prompt_new_admin_pwd: 'Introduce nueva contraseña de administrador:'
        ,msg_admin_pwd_incorrect: 'Contraseña incorrecta. Acceso a admin denegado.'
        ,msg_admin_pwd_created: 'Contraseña admin creada. Modo admin activado.'
        ,msg_no_permission_delete: 'No tienes permiso para borrar. Contacta con un Administrador.'
        ,msg_pw_instructions: 'Introduce la contraseña de administrador para confirmar la acción. Si no existe, se te pedirá crearla.'
        ,msg_enter_new_pwd: 'Debes introducir una contraseña nueva.'
        ,msg_confirm_create_pwd: 'No existe contraseña. ¿Quieres crear esta contraseña como administrador?'
        ,msg_pwd_created_proceed: 'Contraseña creada. Procediendo con la acción.'
        ,msg_pwd_incorrect: 'Contraseña incorrecta.'
        ,msg_deleted: 'Elemento borrado: '
        ,msg_error_deleting: 'Error borrando '
        ,msg_marca_filtro_no_especificado: 'Marca o filtro no especificado en la URL.'
        ,msg_refs_saved: 'Referencias guardadas y agrupadas por modelo.'
        ,msg_fill_type_ref: 'Por favor, complete al menos Tipo de filtro y Referencia.'
        ,msg_stockagotado_registro_guardado: 'Stock de filtros agotado. Registro guardado pero stock no reducido.'
    },
    en: {
        subtitle: 'Workshop Stock Management',
        th_material: 'Material',
        th_cantidad: 'Quantity',
        th_accion: 'Action',
        link_filtros: 'Filters',
        btn_usar: 'Use',
        btn_añadir: 'Add',
        item_guantes: 'Gloves',
        item_escobillas: 'Wipers',
        notas_title: 'Notes',
        btn_guardar_nota: 'Save Note',
        notas_guardadas: 'Saved Notes',
        modal_title: 'Filter Usage Record',
        label_tipo: 'Filter type:',
        label_ref: 'Reference:',
        label_mat: 'License plate:',
        label_aceite: 'Oil amount (liters):',
        label_otras: 'Other repairs:',
        label_obs: 'Observations:',
        btn_guardar: 'Save',
        btn_cancelar: 'Cancel'
        ,tabla_titulo: 'Filter Codes',
        th_codigo: 'Code',
        th_descripcion: 'Description',
        btn_volver: 'Back'
        ,site_title: 'Alquiber Renting Flexible'
        ,usos_filtros: 'Filter Usages'
        ,marcas_titulo: 'Filter Brands'
        ,filtro_aceite: 'Oil filter'
        ,filtro_aire: 'Air filter'
        ,filtro_combustible: 'Fuel filter'
        ,filtro_habitaculo: 'Cabin filter'
        ,btn_borrar: 'Delete'
        ,refs_title: 'References by model'
        ,refs_instructions: 'Paste your references here using the format: Model|Reference|Optional description, one per line.'
        ,btn_parse_refs: 'Sort and save'
        ,btn_clear_refs: 'Delete saved references'
    ,role_user: 'User'
    ,role_admin: 'Admin'
    ,btn_login: 'Login'
    ,totals_title: 'Totals'
    ,label_total_filtros: 'Total filters (all types): '
    ,label_total_materiales: 'Total materials: '
    ,admin_title: 'Administration'
    ,movements_title: 'Movements'
    ,admin_protected_desc: '(Protected deletions)'
    ,btn_del_inventario: 'Delete filters inventory'
    ,btn_del_notas: 'Delete all notes'
    ,btn_del_usos: 'Delete filter usages'
    ,admin_access_title: 'Admin access'
    ,add_filter_title: 'Add filter to inventory'
    ,label_user: 'User:'
    ,label_pass: 'Password:'
    ,btn_login_action: 'Login'
    ,login_title: 'Sign in'
    ,login_help: 'If no admin user exists, the first registered user will be an admin.'
    ,btn_view: 'View'
    ,materials_title: 'Materials'
    ,msg_no_data: 'No data'
    ,msg_no_movements: 'No movements'
    ,msg_no_permission_view_movements: 'You do not have permission to view movements'
    ,user_hidden: '[hidden]'
    ,msg_groups_saved: 'Groups saved'
    ,msg_groups_invalid: 'Invalid JSON. Please fix the format.'
    ,groups_editor_title: 'Material groups editor'
    ,groups_editor_save: 'Save'
    ,groups_editor_cancel: 'Cancel'
    ,groups_editor_help: 'Edit the JSON structure of groups. Save to apply.'
    // material labels
    ,material_guantes: 'Gloves'
    ,material_escobillas: 'Wipers'
    ,material_baterias: 'Batteries'
    ,material_antigelo: 'Antifreeze'
    ,material_desgrasante: 'Degreaser'
    ,material_cerraduras: 'Locks'
    ,material_portavacas: 'Roof racks'
    ,material_porta_escaleras: 'Ladder holders'
    ,material_panledo: 'Panledo'
    ,material_scaffali: 'Shelving'
    ,material_lamparas: 'Headlamps H1/H7'
    ,material_dot4: 'DOT-4 brake fluid'
    ,material_limpiacristales: 'Windshield cleaner'
    ,material_limpiacontactos: 'Contact cleaner'
    ,material_limpiafrenos: 'Brake cleaner'
    // messages/alerts
        ,msg_stock_agotado: 'Out of stock'
        ,msg_escribe_nota: 'Please write a note.'
        ,msg_sesion_cerrada: 'Logged out'
        ,msg_introduce_usuario: 'Enter username'
        ,msg_bienvenido: 'Welcome '
        ,msg_user_incorrect: 'User or password incorrect'
        ,msg_user_created_role: 'User created. Role assigned: '
        ,msg_fill_type_ref_amount: 'Please fill type, reference and quantity.'
        ,msg_prompt_admin_pw: 'Enter admin password:'
        ,msg_confirm_create_admin_pwd: 'No admin password exists. Create it now and enable admin mode?'
        ,msg_prompt_new_admin_pwd: 'Enter new admin password:'
        ,msg_admin_pwd_incorrect: 'Admin password incorrect. Access denied.'
        ,msg_admin_pwd_created: 'Admin password created. Admin mode enabled.'
        ,msg_no_permission_delete: 'You do not have permission to delete. Contact an administrator.'
        ,msg_pw_instructions: 'Enter admin password to confirm action. If none exists, you will be asked to create it.'
        ,msg_enter_new_pwd: 'You must enter a new password.'
        ,msg_confirm_create_pwd: 'No password exists. Do you want to create this password as admin?'
        ,msg_pwd_created_proceed: 'Password created. Proceeding with action.'
        ,msg_pwd_incorrect: 'Password incorrect.'
        ,msg_deleted: 'Deleted item: '
        ,msg_error_deleting: 'Error deleting '
        ,msg_marca_filtro_no_especificado: 'Brand or filter not specified in URL.'
        ,msg_refs_saved: 'References saved and grouped by model.'
        ,msg_fill_type_ref: 'Please complete at least Filter Type and Reference.'
        ,msg_stockagotado_registro_guardado: 'Filter stock exhausted. Record saved but stock not reduced.'
    },
    it: {
        subtitle: 'Gestione Scorte Officina',
        th_material: 'Materiale',
        th_cantidad: 'Quantità',
        th_accion: 'Azione',
        link_filtros: 'Filtri',
        btn_usar: 'Usa',
        btn_añadir: 'Aggiungi',
        item_guantes: 'Guanti',
        item_escobillas: 'Tergicristalli',
        notas_title: 'Note',
        btn_guardar_nota: 'Salva Nota',
        notas_guardadas: 'Note Salvate',
        modal_title: 'Registrazione Uso Filtro',
        label_tipo: 'Tipo di filtro:',
        label_ref: 'Riferimento:',
        label_mat: 'Targa:',
        label_aceite: "Quantità d'olio (litri):",
        label_otras: 'Altre riparazioni:',
        label_obs: 'Osservazioni:',
        btn_guardar: 'Salva',
        btn_cancelar: 'Annulla'
        ,tabla_titulo: 'Codici Filtri',
        th_codigo: 'Codice',
        th_descripcion: 'Descrizione',
        btn_volver: 'Indietro'
        ,site_title: 'Alquiber Renting Flexible'
        ,usos_filtros: 'Usi dei Filtri'
        ,marcas_titulo: 'Marche di Filtri'
        ,filtro_aceite: "Filtro olio"
        ,filtro_aire: 'Filtro aria'
        ,filtro_combustible: 'Filtro carburante'
        ,filtro_habitaculo: 'Filtro abitacolo'
        ,btn_borrar: 'Elimina'
        ,refs_title: 'Riferimenti per modello'
        ,refs_instructions: 'Incolla qui i tuoi riferimenti nel formato: Modello|Riferimento|Descrizione opzionale, una per riga.'
        ,btn_parse_refs: 'Ordina e salva'
        ,btn_clear_refs: 'Elimina riferimenti salvati'
    ,role_user: 'Utente'
    ,role_admin: 'Amministratore'
    ,btn_login: 'Login'
    ,totals_title: 'Totali'
    ,label_total_filtros: 'Totale filtri (tutti i tipi): '
    ,label_total_materiales: 'Totale materiali: '
    ,admin_title: 'Amministrazione'
    ,movements_title: 'Movimenti'
    ,admin_protected_desc: '(Cancellazioni protette)'
    ,btn_del_inventario: 'Elimina inventario filtri'
    ,btn_del_notas: 'Elimina tutte le note'
    ,btn_del_usos: 'Elimina usi dei filtri'
    ,admin_access_title: 'Accesso amministratore'
    ,add_filter_title: 'Aggiungi filtro all\'inventario'
    ,label_user: 'Utente:'
    ,label_pass: 'Password:'
    ,btn_login_action: 'Accedi'
    ,login_title: 'Accesso'
    ,login_help: 'Se non esiste un utente admin, il primo utente registrato sarà admin.'
    ,btn_view: 'Vedi'
    ,materials_title: 'Materiali'
    ,msg_no_data: 'Nessun dato'
    ,msg_no_movements: 'Nessun movimento'
    ,msg_no_permission_view_movements: 'Non hai il permesso di vedere i movimenti'
    ,user_hidden: '[nascosto]'
    ,msg_groups_saved: 'Gruppi salvati'
    ,msg_groups_invalid: 'JSON non valido. Correggi il formato.'
    ,groups_editor_title: 'Editor gruppi materiali'
    ,groups_editor_save: 'Salva'
    ,groups_editor_cancel: 'Annulla'
    ,groups_editor_help: 'Modifica la struttura JSON dei gruppi. Salva per applicare.'
    // material labels
    ,material_guantes: 'Guanti'
    ,material_escobillas: 'Tergicristalli'
    ,material_baterias: 'Batterie'
    ,material_antigelo: 'Antigelo'
    ,material_desgrasante: 'Sgrassatore'
    ,material_cerraduras: 'Serrature'
    ,material_portavacas: 'Portapacchi'
    ,material_porta_escaleras: 'Porta scale'
    ,material_panledo: 'Panledo'
    ,material_scaffali: 'Scaffali'
    ,material_lamparas: 'Lampade H1/H7'
    ,material_dot4: 'DOT-4 fluido freni'
    ,material_limpiacristales: 'Detergente vetri'
    ,material_limpiacontactos: 'Pulitore contatti'
    ,material_limpiafrenos: 'Pulitore freni'
    // mensajes/alerts
        ,msg_stock_agotado: 'Stock esaurito'
        ,msg_escribe_nota: 'Per favore, scrivi una nota.'
        ,msg_sesion_cerrada: 'Sessione chiusa'
        ,msg_introduce_usuario: 'Inserisci username'
        ,msg_bienvenido: 'Benvenuto '
        ,msg_user_incorrect: 'Utente o password errati'
        ,msg_user_created_role: 'Utente creato. Ruolo assegnato: '
        ,msg_fill_type_ref_amount: 'Per favore completa tipo, riferimento e quantità.'
        ,msg_admin_pwd_incorrect: 'Password amministratore errata. Accesso negato.'
        ,msg_admin_pwd_created: 'Password admin creata. Modalità admin attivata.'
        ,msg_no_permission_delete: "Non hai il permesso di cancellare. Contatta un amministratore."
        ,msg_enter_new_pwd: 'Devi inserire una nuova password.'
        ,msg_pwd_created_proceed: 'Password creata. Procedo con l\'azione.'
        ,msg_pwd_incorrect: 'Password errata.'
        ,msg_deleted: 'Elemento cancellato: '
        ,msg_error_deleting: 'Errore cancellando '
        ,msg_marca_filtro_no_especificado: "Marca o filtro non specificato nell'URL."
        ,msg_refs_saved: 'Riferimenti salvati e raggruppati per modello.'
        ,msg_fill_type_ref: 'Per favore, completa almeno Tipo di filtro e Riferimento.'
        ,msg_stockagotado_registro_guardado: 'Stock filtri esaurito. Registrazione salvata ma stock non ridotto.'
    }
};

// Helper de traducción para mensajes de script (usa data-i18n para labels; para mensajes de alerta usare t())
function t(key, fallback) {
    const lang = localStorage.getItem('preferredLang') || (navigator.language || 'es').slice(0,2);
    const dict = translations[lang] || translations['es'];
    return dict[key] || fallback || key;
}

// Map of marcas -> modelos (proporcionado por el usuario)
const brandsModels = {
    volkswagen: ["TIGUAN", "CADDY", "TRANSPORTER", "AMAROK"],
    citroen: ["JUMPER", "C3", "C4"],
    dacia: ["DUSTER", "DUSTER 4X4"],
    ford: ["RANGUER", "TRANSIT", "CUSTOM", "TANSIT COURIER"],
    iveco: ["DAILY"],
    kia: ["STONIC", "CEED"],
    lexus: ["UX250H"],
    mg: ["ZS"],
    nissan: ["X-TRAIL", "QASHQAI", "PRIMASTAR", "NV300"],
    opel: ["MOVANO", "CORSA", "VIVARO"],
    peugeot: ["BOXER"],
    renault: ["CLIO", "CAPTUR"],
    seat: ["IBIZA"],
    toyota: ["HILUX", "COROLLA", "PROACE"]
};

function applyTranslations(lang) {
    const dict = translations[lang] || translations['es'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            // For labels that include the input, set the textContent but keep the inner inputs
            if (el.tagName.toLowerCase() === 'label') {
                // Replace the label text before the inner HTML (assumes structure 'Text<br>...')
                const inner = el.innerHTML;
                const parts = inner.split('<br>');
                parts[0] = dict[key];
                el.innerHTML = parts.join('<br>');
            } else {
                el.textContent = dict[key];
            }
        }
    });
}

function changeLanguage(lang) {
    localStorage.setItem('preferredLang', lang);
    // set document language and reapply translations
    try { document.documentElement.lang = lang; } catch(e){}
    applyTranslations(lang);
    // Re-render dynamic parts that contain text
    if (typeof renderBrands === 'function') renderBrands();
    if (typeof loadUsosFiltros === 'function') loadUsosFiltros();
    if (typeof renderCurrentUser === 'function') renderCurrentUser();
    if (typeof renderMovements === 'function') renderMovements();
    updateTotalsAndChart();
}

// Set language from localStorage or browser default on load
document.addEventListener('DOMContentLoaded', function() {
    const pref = localStorage.getItem('preferredLang') || (navigator.language || 'es').slice(0,2);
    const lang = ['es','en','it'].includes(pref) ? pref : 'es';
    const select = document.getElementById('lang-select');
    if (select) select.value = lang;
    applyTranslations(lang);
});
function toggleLista(id) {
    let lista = document.getElementById(id);
    lista.style.display = (lista.style.display === "block") ? "none" : "block";
}

/**
 * Intentar inferir el modelo a partir de la referencia usando:
 * 1) Diccionario guardado en localStorage 'mapRefToModel'
 * 2) Refs guardadas para la marca+filtro (estructura refs_<marca>_<filtro>)
 * 3) Heurística: buscar por prefijo dentro de modelos existentes
 */
function getModelForRef(ref, marca, filtro) {
    if (!ref) return null;
    const r = String(ref).trim();

    // 1) mapRefToModel del usuario
    try {
        const userMap = JSON.parse(localStorage.getItem('mapRefToModel') || '{}');
        if (userMap[r]) return userMap[r];
    } catch (e) {}

    // 2) Buscar en los refs guardados para la marca+filtro
    try {
        const key = `refs_${marca || ''}_${filtro || ''}`;
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        if (saved) {
            // saved: { modelName: [ {codigo, descripcion} ] }
            for (const model of Object.keys(saved)) {
                const found = saved[model].find(e => (e.codigo || '').toLowerCase() === r.toLowerCase());
                if (found) return model;
            }
        }
    } catch (e) {}

    // 3) Heurística: si la referencia contiene letras específicas o prefijos conocidos
    const upper = r.toUpperCase();

    // 3a) Intentar detectar nombre de modelo dentro de la referencia (marca específica)
    try {
        if (marca && brandsModels[marca.toLowerCase()]) {
            const modelos = brandsModels[marca.toLowerCase()];
            for (const mod of modelos) {
                if (upper.includes(mod.toUpperCase())) return mod;
            }
        }
        // 3b) Buscar globalmente en todos los modelos
        for (const mkey of Object.keys(brandsModels)) {
            for (const mod of brandsModels[mkey]) {
                if (upper.includes(mod.toUpperCase())) return mod;
            }
        }
    } catch (e) {}

    // 3c) Prefijos básicos por tipo
    if (upper.startsWith('ZA') || upper.startsWith('LA')) return 'Aceite';
    if (upper.startsWith('PA') || upper.startsWith('CA')) return 'Aire';
    if (upper.match(/^15/)) return 'Habitaculo';

    // fallback: usar filtro como modelo si se pasó
    if (filtro) return filtro.charAt(0).toUpperCase() + filtro.slice(1);
    return null;
}

/**
 * Guardar una referencia bajo un modelo identificado automáticamente.
 * - Mantiene una estructura global 'refs_by_model' : { modelName: [ { codigo, descripcion, tipo, fecha } ] }
 * - Actualiza también 'mapRefToModel' con referencia -> modelo para futuras inferencias
 * - Si es posible, intenta añadir la entrada también en refs_<marca>_<filtro> usando brandsModels para ubicar la marca
 */
function saveRefToModel(ref, model, meta) {
    if (!ref || !model) return;
    const codigo = String(ref).trim();
    const modelName = String(model).trim();
    try {
        // 1) refs_by_model
        const key = 'refs_by_model';
        const byModel = JSON.parse(localStorage.getItem(key) || '{}');
        if (!byModel[modelName]) byModel[modelName] = [];
        const exists = byModel[modelName].some(e => (e.codigo || '').toLowerCase() === codigo.toLowerCase());
        if (!exists) {
            const entry = Object.assign({ codigo: codigo, descripcion: (meta && meta.descripcion) || '', tipo: (meta && meta.tipo) || '', fecha: new Date().toISOString() }, meta || {});
            byModel[modelName].push(entry);
            byModel[modelName].sort((a,b) => (a.codigo || '').localeCompare(b.codigo || ''));
            localStorage.setItem(key, JSON.stringify(byModel));
        }

        // 2) mapRefToModel quick lookup
        const mapKey = 'mapRefToModel';
        const map = JSON.parse(localStorage.getItem(mapKey) || '{}');
        if (!map[codigo]) {
            map[codigo] = modelName;
            localStorage.setItem(mapKey, JSON.stringify(map));
        }

        // 3) intentar ubicar marca y escribir en refs_<marca>_<filtro> si procede
        for (const brandKey of Object.keys(brandsModels)) {
            if (brandsModels[brandKey].includes(modelName)) {
                const filtro = (meta && meta.tipo) || 'aceite';
                const storageKey = `refs_${brandKey}_${filtro}`;
                try {
                    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
                    if (!saved[modelName]) saved[modelName] = [];
                    const exists2 = saved[modelName].some(e => (e.codigo || '').toLowerCase() === codigo.toLowerCase());
                    if (!exists2) {
                        saved[modelName].push({ codigo: codigo, descripcion: (meta && meta.descripcion) || '' });
                        saved[modelName].sort((a,b) => (a.codigo || '').localeCompare(b.codigo || ''));
                        localStorage.setItem(storageKey, JSON.stringify(saved));
                    }
                } catch (e) {
                    // ignore per-brand save errors
                }
                break; // stop after first matching brand
            }
        }
    } catch (e) {
        console.error('saveRefToModel error', e);
    }
}

// Render brands and models on filtros.html dynamically
function renderBrands() {
    const root = document.getElementById('brands-root');
    if (!root) return;
    root.innerHTML = '';

    console.log('renderBrands: brandsModels keys=', Object.keys(brandsModels));

    Object.keys(brandsModels).sort().forEach(brandKey => {
        const brandName = brandKey.toUpperCase();
        const li = document.createElement('li');
        li.textContent = brandName;
        li.style.cursor = 'pointer';

        const sub = document.createElement('ul');
        sub.className = 'hidden';
        sub.style.listStyle = 'none';
        sub.style.paddingLeft = '10px';

        // For each model, create a compact row with selector and 'Ver' button
        brandsModels[brandKey].forEach(model => {
            const modelLi = document.createElement('li');
            modelLi.style.padding = '6px';
            modelLi.style.background = '#34495e';
            modelLi.style.margin = '6px 0';
            modelLi.style.borderRadius = '4px';

            const span = document.createElement('span');
            span.textContent = model;
            span.style.color = '#fff';
            span.style.fontWeight = 'bold';
            span.style.marginRight = '8px';

            const sel = document.createElement('select');
            ['aceite','aire','habitaculo'].forEach(opt => {
                const o = document.createElement('option'); o.value = opt; o.textContent = opt; sel.appendChild(o);
            });
            sel.style.marginRight = '8px';

            const btn = document.createElement('button');
            btn.textContent = t('btn_view','Ver');
            btn.addEventListener('click', function(e) {
                const filtro = sel.value;
                const url = `tabla_codigos.html?marca=${encodeURIComponent(brandKey)}&filtro=${encodeURIComponent(filtro)}`;
                window.location.href = url;
            });

            modelLi.appendChild(span);
            modelLi.appendChild(sel);
            modelLi.appendChild(btn);
            sub.appendChild(modelLi);
        });

        li.addEventListener('click', function() {
            sub.className = (sub.className === 'hidden') ? '' : 'hidden';
        });

        root.appendChild(li);
        root.appendChild(sub);
    });

        // wire search box
        const search = document.getElementById('brand-search');
        if (search) {
            search.addEventListener('input', function() {
                const q = search.value.trim().toLowerCase();
                // show/hide brand blocks
                Array.from(root.children).forEach((child, i) => {
                    // children are alternating li, ul
                    if (child.tagName.toLowerCase() === 'li') {
                        const brandLi = child;
                        const subUl = root.children[i+1];
                        const brandText = brandLi.textContent.toLowerCase();
                        // check models inside subUl
                        const modelsText = subUl ? Array.from(subUl.querySelectorAll('li span')).map(s=>s.textContent.toLowerCase()).join(' ') : '';
                        if (brandText.includes(q) || modelsText.includes(q)) {
                            brandLi.style.display = '';
                            if (subUl) subUl.style.display = '';
                        } else {
                            brandLi.style.display = 'none';
                            if (subUl) subUl.style.display = 'none';
                        }
                    }
                });
            });
        }
}

// Run renderBrands on filtros.html if the container exists
document.addEventListener('DOMContentLoaded', function() {
    renderBrands();
});
/**
 * Parsea texto con líneas en formato Modelo|Referencia|Descripción
 * y guarda en localStorage agrupado por modelo bajo la clave refs_<marca>_<filtro>
 */
function parseAndSaveRefs(text, marca, filtro) {
    if (!marca || !filtro) {
        alert(t('msg_marca_filtro_no_especificado','Marca o filtro no especificado en la URL.'));
        return;
    }
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const grouped = {};
    lines.forEach(line => {
        // Soporta varios formatos:
        // 1) Modelo|Referencia|Descripción
        // 2) Referencia|Descripción  (modelo inferido automáticamente)
        // 3) "N FILTROS DE CODE" (extrae code y cantidad)
        let model = null;
        let codigo = '';
        let descripcion = '';

        if (line.indexOf('|') !== -1) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 3) {
                model = parts[0] || null;
                codigo = parts[1] || '';
                descripcion = parts.slice(2).join(' | ');
            } else if (parts.length === 2) {
                // inferir modelo por referencia
                codigo = parts[0] || '';
                descripcion = parts[1] || '';
                model = getModelForRef(codigo, marca, filtro);
            }
        } else {
            // intentar formato '8 FILTROS DE ZA001' o '1 FILTRO 16064026'
            const m = line.match(/^(\d+)\s+FILTROS?\s+DE\s+(.+)$/i);
            if (m) {
                const qty = m[1];
                codigo = m[2].trim();
                descripcion = `Cantidad:${qty}`;
                model = getModelForRef(codigo, marca, filtro);
            } else {
                // si solo viene el código o 'CODE description'
                const tokens = line.split(/\s+/);
                // encontrar primer token que parezca referencia (tenga dígitos/ letras)
                codigo = tokens.find(t => /[A-Za-z0-9]/.test(t)) || '';
                descripcion = line.replace(codigo, '').trim();
                model = getModelForRef(codigo, marca, filtro);
            }
        }

        if (!model) model = 'SIN_MODELO';
        if (!grouped[model]) grouped[model] = [];
        grouped[model].push({ codigo: codigo, descripcion: descripcion });
    });

    // Ordenar referencias dentro de cada modelo por código
    Object.keys(grouped).forEach(m => {
        grouped[m].sort((a,b) => (a.codigo || '').localeCompare(b.codigo || ''));
    });

    const key = `refs_${marca || ''}_${filtro || ''}`;
    localStorage.setItem(key, JSON.stringify(grouped));
    alert(t('msg_refs_saved','Referencias guardadas y agrupadas por modelo.'));
}
document.addEventListener("DOMContentLoaded", function() {
    // Obtener parámetros de la URL
    const params = new URLSearchParams(window.location.search);
    const marca = params.get("marca");
    const filtro = params.get("filtro");

    // Base de datos con los códigos de filtros
    const codigosFiltros = {
        vw: {
            aceite: [
                { codigo: "VW1234", descripcion: "Filtro de aceite premium" },
                { codigo: "VW5678", descripcion: "Filtro de aceite estándar" }
            ],
            aire: [
                { codigo: "VW9101", descripcion: "Filtro de aire deportivo" }
            ],
            combustible: [
                { codigo: "VW1122", descripcion: "Filtro de combustible diésel" }
            ]
        },
        citroen: {
            aceite: [
                { codigo: "CIT123", descripcion: "Filtro de aceite sintético" }
            ],
            aire: [
                { codigo: "CIT456", descripcion: "Filtro de aire reforzado" }
            ],
            habitaculo: [
                { codigo: "CIT789", descripcion: "Filtro de habitáculo con carbón activo" }
            ]
        },
        opel: {
            aceite: [
                { codigo: "OPEL001", descripcion: "Filtro de aceite de alto rendimiento" }
            ],
            aire: [
                { codigo: "OPEL002", descripcion: "Filtro de aire lavable" }
            ],
            combustible: [
                { codigo: "OPEL003", descripcion: "Filtro de combustible para motores turbo" }
            ]
        },
        renault: {
            aceite: [
                { codigo: "REN001", descripcion: "Filtro de aceite económico" }
            ],
            habitaculo: [
                { codigo: "REN002", descripcion: "Filtro de habitáculo estándar" }
            ],
            combustible: [
                { codigo: "REN003", descripcion: "Filtro de combustible de alto flujo" }
            ]
        },
        toyota: {
            aire: [
                { codigo: "TOY001", descripcion: "Filtro de aire con mayor flujo de aire" }
            ],
            combustible: [
                { codigo: "TOY002", descripcion: "Filtro de combustible híbrido" }
            ],
            habitaculo: [
                { codigo: "TOY003", descripcion: "Filtro de habitáculo HEPA" }
            ]
        },
        lexus: {
            aceite: [
                { codigo: "LEX001", descripcion: "Filtro de aceite premium" }
            ],
            aire: [
                { codigo: "LEX002", descripcion: "Filtro de aire de alto rendimiento" }
            ],
            combustible: [
                { codigo: "LEX003", descripcion: "Filtro de combustible con partículas finas" }
            ]
        }
    };

    // Buscar los datos en la base de datos
    const listaCodigos = codigosFiltros[marca]?.[filtro] || [];

    // Actualizar el título de la página
    const titulo = document.getElementById("titulo");
    if (marca && filtro) {
        titulo.textContent = `Códigos de Filtros para ${marca.toUpperCase()} - ${filtro.toUpperCase()}`;
    }

    // Llenar la tabla con los datos
    const tablaBody = document.getElementById("tabla-codigos");
    // Primero intentar cargar referencias guardadas por marca+filtro
    function storageKeyFor(m, f) { return `refs_${m || ''}_${f || ''}`; }

    function displayListItems(items) {
        tablaBody.innerHTML = '';
        items.forEach(item => {
            let fila = document.createElement("tr");
            fila.innerHTML = `<td>${item.codigo}</td><td>${item.descripcion || ''}</td>`;
            tablaBody.appendChild(fila);
        });
    }

    // If there are saved refs for this marca+filtro, use them grouped by model
    const savedKey = storageKeyFor(marca, filtro);
    const savedRefs = JSON.parse(localStorage.getItem(savedKey) || 'null');
    if (savedRefs && Object.keys(savedRefs).length > 0) {
        // savedRefs is an object: { modelName: [ {codigo, descripcion}, ... ], ... }
        // Display grouped by model with a header row for model
        tablaBody.innerHTML = '';
        Object.keys(savedRefs).sort().forEach(model => {
            const header = document.createElement('tr');
            header.innerHTML = `<td colspan="2" style="text-align:left; font-weight:bold; background:#f4f4f4;">Model: ${model}</td>`;
            tablaBody.appendChild(header);
            savedRefs[model].forEach(entry => {
                const r = document.createElement('tr');
                r.innerHTML = `<td>${entry.codigo}</td><td>${entry.descripcion || ''}</td>`;
                tablaBody.appendChild(r);
            });
        });
    } else {
        // Fall back to default listaCodigos
        listaCodigos.forEach(item => {
            let fila = document.createElement("tr");
            fila.innerHTML = `<td>${item.codigo}</td><td>${item.descripcion}</td>`;
            tablaBody.appendChild(fila);
        });
    }

    // Si no hay datos, mostrar un mensaje
    if (listaCodigos.length === 0) {
        let fila = document.createElement("tr");
        fila.innerHTML = `<td colspan="2">No hay códigos disponibles para este filtro</td>`;
        tablaBody.appendChild(fila);
    }
    // Wire up refs input controls (if on this page)
    const btnParse = document.getElementById('btn-parse-refs');
    const btnClear = document.getElementById('btn-clear-refs');
    const refsInput = document.getElementById('refs-input');
    if (btnParse && refsInput) {
        btnParse.addEventListener('click', function() {
            parseAndSaveRefs(refsInput.value, marca, filtro);
            // reload display
            const newSaved = JSON.parse(localStorage.getItem(savedKey) || 'null');
            if (newSaved) {
                // reload page portion
                tablaBody.innerHTML = '';
                Object.keys(newSaved).sort().forEach(model => {
                    const header = document.createElement('tr');
                    header.innerHTML = `<td colspan="2" style="text-align:left; font-weight:bold; background:#f4f4f4;">Model: ${model}</td>`;
                    tablaBody.appendChild(header);
                    newSaved[model].forEach(entry => {
                        const r = document.createElement('tr');
                        r.innerHTML = `<td>${entry.codigo}</td><td>${entry.descripcion || ''}</td>`;
                        tablaBody.appendChild(r);
                    });
                });
            }
        });
    }
    if (btnClear) {
        btnClear.addEventListener('click', function() {
            localStorage.removeItem(savedKey);
            // refresh to default
            tablaBody.innerHTML = '';
            listaCodigos.forEach(item => {
                let fila = document.createElement("tr");
                fila.innerHTML = `<td>${item.codigo}</td><td>${item.descripcion}</td>`;
                tablaBody.appendChild(fila);
            });
        });
    }

    // Codes search filter
    const codesSearch = document.getElementById('codes-search');
    if (codesSearch) {
        codesSearch.addEventListener('input', function() {
            const q = codesSearch.value.trim().toLowerCase();
            const rows = tablaBody.querySelectorAll('tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(q) ? '' : 'none';
            });
        });
    }
});

// --- Funciones para el formulario de uso de filtros ---
function openFiltroForm() {
    const modal = document.getElementById('filtro-modal');
    if (modal) modal.style.display = 'block';
}

function closeFiltroForm() {
    const modal = document.getElementById('filtro-modal');
    if (modal) modal.style.display = 'none';
    // Limpiar formulario
    const form = document.getElementById('filtro-form');
    if (form) form.reset();
}

function submitFiltroForm() {
    // Leer valores
    const tipo = document.getElementById('tipo-filtro').value.trim();
    const referencia = document.getElementById('referencia').value.trim();
    const matricula = document.getElementById('matricula').value.trim();
    const aceite = document.getElementById('aceite').value;
    const otras = document.getElementById('otras-reparaciones').value.trim();
    const observaciones = document.getElementById('observaciones').value.trim();

    if (!tipo || !referencia) {
        alert(t('msg_fill_type_ref','Por favor, complete al menos Tipo de filtro y Referencia.'));
        return;
    }

    const uso = {
        fecha: new Date().toLocaleString(),
        tipo: tipo,
        referencia: referencia,
        matricula: matricula,
        aceite: aceite ? parseFloat(aceite) : 0,
        otras: otras,
        observaciones: observaciones
    };

    // Guardar en localStorage bajo la clave 'usosFiltros'
    let usos = JSON.parse(localStorage.getItem('usosFiltros')) || [];
    usos.push(uso);
    localStorage.setItem('usosFiltros', JSON.stringify(usos));

    // Reducir stock de filtros en 1 (si hay stock)
    const stockElem = document.getElementById('stock-filtros');
    if (stockElem) {
        let cantidad = parseInt(stockElem.innerText) || 0;
        if (cantidad > 0) {
            cantidad--;
            stockElem.innerText = cantidad;
        } else {
            alert(t('msg_stockagotado_registro_guardado','Stock de filtros agotado. Registro guardado pero stock no reducido.'));
        }
    }

    // Además, decrementar del inventario persistido si existe la referencia / tipo
    try {
        let inv = JSON.parse(localStorage.getItem('inventario_filtros') || '[]');
        // Buscar por referencia y tipo
        const idx = inv.findIndex(it => it.referencia && it.referencia.toLowerCase() === referencia.toLowerCase() && it.tipo && it.tipo.toLowerCase() === tipo.toLowerCase());
        if (idx >= 0) {
            inv[idx].cantidad = Math.max(0, (parseInt(inv[idx].cantidad) || 0) - 1);
            localStorage.setItem('inventario_filtros', JSON.stringify(inv));
            updateTotalsAndChart();
        }
    } catch (e) {
        console.error('Error actualizando inventario al usar filtro:', e);
    }

    // Actualizar lista en pantalla y cerrar modal
    loadUsosFiltros();
    closeFiltroForm();
}

function loadUsosFiltros() {
    const cont = document.getElementById('filtros-list');
    if (!cont) return;
    cont.innerHTML = '';
    const usos = JSON.parse(localStorage.getItem('usosFiltros')) || [];
    if (usos.length === 0) {
        cont.innerHTML = '<div>No hay registros de uso de filtros.</div>';
        return;
    }
    usos.slice().reverse().forEach((u, idx) => {
        const item = document.createElement('div');
        item.className = 'filtro-item';
        const lang = localStorage.getItem('preferredLang') || (navigator.language || 'es').slice(0,2);
        const dict = translations[lang] || translations['es'];
        item.innerHTML = `
            <div><strong>${u.fecha}</strong> - <em>${u.tipo}</em> (${u.referencia})</div>
            <div>Matrícula: ${u.matricula || '-'} | Aceite: ${u.aceite || 0} L</div>
            <div>Otras reparaciones: ${u.otras || '-'} </div>
            <div>Observaciones: ${u.observaciones || '-'} </div>
            <button data-admin-only onclick="borrarUsoFiltro(${usos.length - 1 - idx})">${dict.btn_borrar || 'Borrar'}</button>
            <hr>
        `;
        cont.appendChild(item);
    });
    if (typeof applyRoleUI === 'function') applyRoleUI();
}

function borrarUsoFiltro(index) {
    let usos = JSON.parse(localStorage.getItem('usosFiltros')) || [];
    if (index < 0 || index >= usos.length) return;
    usos.splice(index, 1);
    localStorage.setItem('usosFiltros', JSON.stringify(usos));
    loadUsosFiltros();
}

