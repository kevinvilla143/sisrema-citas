// ============================================================
// Sistema de Gestión de Citas Médicas
// app.js — Se comunica con el servidor Python (Flask)
// Cada función hace fetch() a las rutas de app.py
// ============================================================

// ── CACHÉ LOCAL (para no repetir llamadas innecesarias) ──
let especialidades = [];
let medicos        = [];
let citaSeleccionada = null;

// ── HELPERS UI ──
function showAlert(elementId, mensaje, tipo) {
    const el = document.getElementById(elementId);
    el.className = `alert alert-${tipo} show`;
    el.innerHTML = (tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️') + ' ' + mensaje;
    setTimeout(() => el.classList.remove('show'), 3500);
}

function badgeEstado(estado) {
    if (estado === 'Activa')       return `<span class="badge badge-active">Activa</span>`;
    if (estado === 'Cancelada')    return `<span class="badge badge-cancelled">Cancelada</span>`;
    if (estado === 'Reprogramada') return `<span class="badge badge-reprogrammed">Reprogramada</span>`;
    return estado;
}

function emptyRow(cols, mensaje) {
    return `<tr><td colspan="${cols}"><div class="empty-state"><div class="empty-icon">📭</div>${mensaje}</div></td></tr>`;
}

// ── TABS ──
function switchTab(name, event) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('panel-' + name).classList.add('active');
    event.currentTarget.classList.add('active');

    if (name === 'citas')     cargarSelectsCita();
    if (name === 'historial') cargarSelectHistorial();
    if (name === 'todas')     cargarTodasCitas();
    if (name === 'medicos')   cargarMedicos();
}

// ── STATS — llama a GET /api/stats ──
async function updateStats() {
    const res  = await fetch('/api/stats');
    const data = await res.json();
    document.getElementById('stat-pacientes').textContent = data.totalPacientes;
    document.getElementById('stat-activas').textContent   = data.citasActivas;
    document.getElementById('stat-total').textContent     = data.totalCitas;
}

// ── PACIENTES ──

// Llama a POST /api/pacientes (registrar_paciente en app.py)
async function registrarPaciente() {
    const nombre    = document.getElementById('p-nombre').value.trim();
    const documento = document.getElementById('p-documento').value.trim();
    const telefono  = document.getElementById('p-telefono').value.trim();

    const res = await fetch('/api/pacientes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nombre, documento, telefono })
    });

    const data = await res.json();

    if (!res.ok) {
        showAlert('alert-paciente', data.error, 'error');
        return;
    }

    showAlert('alert-paciente', data.mensaje, 'success');
    ['p-nombre', 'p-documento', 'p-telefono'].forEach(id => document.getElementById(id).value = '');
    cargarTablaPacientes();
    updateStats();
}

// Llama a GET /api/pacientes
async function cargarTablaPacientes() {
    const res      = await fetch('/api/pacientes');
    const pacientes = await res.json();
    const tbody    = document.getElementById('tbody-pacientes');

    if (!pacientes.length) {
        tbody.innerHTML = emptyRow(4, 'No hay pacientes registrados.');
        return;
    }
    tbody.innerHTML = pacientes.map(p =>
        `<tr><td>${p.id}</td><td>${p.nombre}</td><td>${p.documento}</td><td>${p.telefono}</td></tr>`
    ).join('');
}

// ── SELECTS CITA ──

async function cargarSelectsCita() {
    // Pacientes
    const resPac = await fetch('/api/pacientes');
    const pacs   = await resPac.json();
    const selP   = document.getElementById('c-paciente');
    selP.innerHTML = pacs.length
        ? pacs.map(p => `<option value="${p.id}">${p.nombre} (${p.documento})</option>`).join('')
        : '<option value="">— Sin pacientes —</option>';

    // Especialidades (se guardan en caché)
    if (!especialidades.length) {
        const resEsp  = await fetch('/api/especialidades');
        especialidades = await resEsp.json();
    }
    const selE = document.getElementById('c-especialidad');
    selE.innerHTML = especialidades.map(e =>
        `<option value="${e.id}">${e.nombre}</option>`
    ).join('');

    filtrarMedicos();
}

// Llama a GET /api/medicos?especialidadId=X
async function filtrarMedicos() {
    const idE = document.getElementById('c-especialidad').value;
    const res = await fetch(`/api/medicos?especialidadId=${idE}`);
    const meds = await res.json();
    const selM = document.getElementById('c-medico');
    selM.innerHTML = meds.length
        ? meds.map(m => `<option value="${m.id}">Dr(a). ${m.nombre}</option>`).join('')
        : '<option value="">— Sin médicos —</option>';
}

// Llama a POST /api/citas (asignar_cita en app.py)
async function asignarCita() {
    const pacienteId = parseInt(document.getElementById('c-paciente').value);
    const medicoId   = parseInt(document.getElementById('c-medico').value);
    const fechaRaw   = document.getElementById('c-fecha').value;

    if (!pacienteId || !medicoId || !fechaRaw)
        return showAlert('alert-cita', 'Completa todos los campos.', 'error');

    const [y, m, d] = fechaRaw.split('-');
    const fecha = `${d}/${m}/${y}`;

    const res  = await fetch('/api/citas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pacienteId, medicoId, fecha })
    });

    const data = await res.json();

    if (!res.ok) {
        showAlert('alert-cita', data.error, 'error');
        return;
    }

    showAlert('alert-cita', data.mensaje, 'success');
    document.getElementById('c-fecha').value = '';
    updateStats();
}

// ── HISTORIAL ──

async function cargarSelectHistorial() {
    const res  = await fetch('/api/pacientes');
    const pacs = await res.json();
    const sel  = document.getElementById('h-paciente');
    sel.innerHTML = pacs.length
        ? '<option value="">— Selecciona paciente —</option>' +
          pacs.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')
        : '<option value="">— Sin pacientes —</option>';
    document.getElementById('card-historial').style.display = 'none';
}

// Llama a GET /api/citas?pacienteId=X y GET /api/especialidades
async function verHistorial() {
    const idP = document.getElementById('h-paciente').value;
    if (!idP) { document.getElementById('card-historial').style.display = 'none'; return; }

    const [resCitas, resEsps, resMeds] = await Promise.all([
        fetch(`/api/citas?pacienteId=${idP}`),
        fetch('/api/especialidades'),
        fetch('/api/medicos')
    ]);

    const historial = await resCitas.json();
    especialidades  = await resEsps.json();
    const todosLosM = await resMeds.json();

    const tbody = document.getElementById('tbody-historial');
    document.getElementById('card-historial').style.display = 'block';

    if (!historial.length) {
        tbody.innerHTML = emptyRow(5, 'Este paciente no tiene citas.');
        return;
    }

    tbody.innerHTML = historial.map(c => {
        const med = todosLosM.find(m => m.id === c.medicoId);
        const esp = especialidades.find(e => e.id === med?.especialidadId);
        return `<tr>
            <td>${c.id}</td>
            <td>Dr(a). ${med?.nombre}</td>
            <td>${esp?.nombre}</td>
            <td>${c.fecha}</td>
            <td>${badgeEstado(c.estado)}</td>
        </tr>`;
    }).join('');
}

// ── TODAS LAS CITAS ──

// Llama a GET /api/citas, /api/pacientes, /api/medicos, /api/especialidades
async function cargarTodasCitas() {
    const [resCitas, resPacs, resMeds, resEsps] = await Promise.all([
        fetch('/api/citas'),
        fetch('/api/pacientes'),
        fetch('/api/medicos'),
        fetch('/api/especialidades')
    ]);

    const citas    = await resCitas.json();
    const pacs     = await resPacs.json();
    const meds     = await resMeds.json();
    especialidades = await resEsps.json();

    const tbody = document.getElementById('tbody-todas');

    if (!citas.length) {
        tbody.innerHTML = emptyRow(7, 'No hay citas registradas.');
        return;
    }

    tbody.innerHTML = citas.map(c => {
        const pac = pacs.find(p => p.id === c.pacienteId);
        const med = meds.find(m => m.id === c.medicoId);
        const esp = especialidades.find(e => e.id === med?.especialidadId);

        const acciones = c.estado !== 'Cancelada'
            ? `<div style="display:flex;gap:6px;">
                <button class="btn btn-danger btn-sm" onclick="cancelarCita(${c.id})">✕ Cancelar</button>
                <button class="btn btn-warning btn-sm" onclick="abrirReprogramar(${c.id}, '${c.fecha}', '${pac?.nombre}', '${med?.nombre}')">↺ Reprogramar</button>
               </div>`
            : `<span style="color:var(--text-muted);font-size:0.78rem">—</span>`;

        return `<tr>
            <td>${c.id}</td>
            <td>${pac?.nombre}</td>
            <td>Dr(a). ${med?.nombre}</td>
            <td>${esp?.nombre}</td>
            <td>${c.fecha}</td>
            <td>${badgeEstado(c.estado)}</td>
            <td>${acciones}</td>
        </tr>`;
    }).join('');
}

// Llama a PUT /api/citas/<id>/cancelar (cancelar_cita en app.py)
async function cancelarCita(id) {
    const res = await fetch(`/api/citas/${id}/cancelar`, { method: 'PUT' });
    if (res.ok) { cargarTodasCitas(); updateStats(); }
}

function abrirReprogramar(id, fechaActual, pacNombre, medNombre) {
    citaSeleccionada = id;
    document.getElementById('modal-cita-info').textContent =
        `Cita #${id} — ${pacNombre} con Dr(a). ${medNombre} (actual: ${fechaActual})`;
    document.getElementById('modal-nueva-fecha').value = '';
    document.getElementById('modal-reprogram').classList.add('open');
}

function cerrarModal() {
    document.getElementById('modal-reprogram').classList.remove('open');
}

// Llama a PUT /api/citas/<id>/reprogramar (reprogramar_cita en app.py)
async function confirmarReprogramar() {
    const fechaRaw = document.getElementById('modal-nueva-fecha').value;
    if (!fechaRaw) return;

    const [y, m, d] = fechaRaw.split('-');
    const fecha = `${d}/${m}/${y}`;

    const res = await fetch(`/api/citas/${citaSeleccionada}/reprogramar`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fecha })
    });

    if (res.ok) {
        cerrarModal();
        cargarTodasCitas();
        updateStats();
    }
}

// ── MÉDICOS — llama a GET /api/medicos y /api/especialidades ──
async function cargarMedicos() {
    const [resMeds, resEsps] = await Promise.all([
        fetch('/api/medicos'),
        fetch('/api/especialidades')
    ]);

    const meds = await resMeds.json();
    especialidades = await resEsps.json();

    const tbody = document.getElementById('tbody-medicos');
    tbody.innerHTML = meds.map(m => {
        const esp = especialidades.find(e => e.id === m.especialidadId);
        return `<tr>
            <td>${m.id}</td>
            <td>Dr(a). ${m.nombre}</td>
            <td>${esp?.nombre}</td>
            <td style="color:var(--text-dim);font-size:0.82rem">${esp?.descripcion}</td>
        </tr>`;
    }).join('');
}

// ── INICIO — carga inicial al abrir la página ──
document.addEventListener('DOMContentLoaded', () => {
    cargarTablaPacientes();
    cargarMedicos();
    updateStats();
});