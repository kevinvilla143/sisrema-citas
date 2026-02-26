# ============================================================
# Sistema de Gestión de Citas Médicas
# app.py — Servidor Flask (Backend Python)
# FET — Febrero 2026
# ============================================================

from flask import Flask, jsonify, request, render_template

app = Flask(__name__)

# ── DATOS EN MEMORIA (equivalente a las listas del prototipo original) ──
especialidades = [
    {"id": 1, "nombre": "Psiquiatría del Sueño",                 "descripcion": "Atiende a quienes pueden dormir todo el día y les falta todavía"},
    {"id": 2, "nombre": "Therianthropía y Conocimiento del Ser", "descripcion": "Atención psicológica y adoctrinamiento"},
    {"id": 3, "nombre": "Descoordinación Aguda",                 "descripcion": "Terapia Intensiva para Ranked"},
]

medicos = [
    {"id": 1, "nombre": "Kevin Villa",  "especialidadId": 1},
    {"id": 2, "nombre": "Harold Lopez", "especialidadId": 2},
    {"id": 3, "nombre": "Laura Agredo", "especialidadId": 3},
]

pacientes = []
citas     = []

contadores = {"pacientes": 1, "citas": 1}


# ── HELPERS ──
def get_especialidad(id):
    return next((e for e in especialidades if e["id"] == id), None)

def get_medico(id):
    return next((m for m in medicos if m["id"] == id), None)

def get_paciente(id):
    return next((p for p in pacientes if p["id"] == id), None)


# ── RUTA PRINCIPAL ──
@app.route("/")
def index():
    return render_template("index.html")


# ── API: ESPECIALIDADES ──
@app.route("/api/especialidades", methods=["GET"])
def get_especialidades():
    return jsonify(especialidades)


# ── API: MÉDICOS ──
@app.route("/api/medicos", methods=["GET"])
def get_medicos():
    especialidad_id = request.args.get("especialidadId", type=int)
    if especialidad_id:
        resultado = [m for m in medicos if m["especialidadId"] == especialidad_id]
    else:
        resultado = medicos
    return jsonify(resultado)


# ── API: PACIENTES ──
@app.route("/api/pacientes", methods=["GET"])
def get_pacientes():
    return jsonify(pacientes)

@app.route("/api/pacientes", methods=["POST"])
def registrar_paciente():
    data = request.get_json()

    nombre    = data.get("nombre", "").strip()
    documento = data.get("documento", "").strip()
    telefono  = data.get("telefono", "").strip()

    # Validaciones (igual que en el Python original)
    if not nombre or not documento or not telefono:
        return jsonify({"error": "Todos los campos son obligatorios."}), 400

    if any(p["documento"] == documento for p in pacientes):
        return jsonify({"error": f"Ya existe un paciente con el documento {documento}."}), 400

    paciente = {
        "id":        contadores["pacientes"],
        "nombre":    nombre,
        "documento": documento,
        "telefono":  telefono,
    }
    pacientes.append(paciente)
    contadores["pacientes"] += 1

    return jsonify({"mensaje": f"Paciente '{nombre}' registrado con ID {paciente['id']}.", "paciente": paciente}), 201


# ── API: CITAS ──
@app.route("/api/citas", methods=["GET"])
def get_citas():
    paciente_id = request.args.get("pacienteId", type=int)
    if paciente_id:
        resultado = [c for c in citas if c["pacienteId"] == paciente_id]
    else:
        resultado = citas
    return jsonify(resultado)

@app.route("/api/citas", methods=["POST"])
def asignar_cita():
    data = request.get_json()

    paciente_id = data.get("pacienteId")
    medico_id   = data.get("medicoId")
    fecha       = data.get("fecha", "").strip()

    if not paciente_id or not medico_id or not fecha:
        return jsonify({"error": "Completa todos los campos."}), 400

    paciente = get_paciente(paciente_id)
    medico   = get_medico(medico_id)

    if not paciente:
        return jsonify({"error": "Paciente no encontrado."}), 404
    if not medico:
        return jsonify({"error": "Médico no encontrado."}), 404

    cita = {
        "id":         contadores["citas"],
        "pacienteId": paciente_id,
        "medicoId":   medico_id,
        "fecha":      fecha,
        "estado":     "Activa",
    }
    citas.append(cita)
    contadores["citas"] += 1

    return jsonify({"mensaje": f"Cita #{cita['id']} asignada correctamente.", "cita": cita}), 201

@app.route("/api/citas/<int:cita_id>/cancelar", methods=["PUT"])
def cancelar_cita(cita_id):
    cita = next((c for c in citas if c["id"] == cita_id), None)
    if not cita:
        return jsonify({"error": "Cita no encontrada."}), 404
    if cita["estado"] == "Cancelada":
        return jsonify({"error": "Esta cita ya estaba cancelada."}), 400

    cita["estado"] = "Cancelada"
    return jsonify({"mensaje": f"Cita {cita_id} cancelada correctamente.", "cita": cita})

@app.route("/api/citas/<int:cita_id>/reprogramar", methods=["PUT"])
def reprogramar_cita(cita_id):
    cita = next((c for c in citas if c["id"] == cita_id), None)
    if not cita:
        return jsonify({"error": "Cita no encontrada."}), 404
    if cita["estado"] == "Cancelada":
        return jsonify({"error": "No se puede reprogramar una cita cancelada."}), 400

    data       = request.get_json()
    nueva_fecha = data.get("fecha", "").strip()
    if not nueva_fecha:
        return jsonify({"error": "La nueva fecha es obligatoria."}), 400

    cita["fecha"]  = nueva_fecha
    cita["estado"] = "Reprogramada"
    return jsonify({"mensaje": f"Cita {cita_id} reprogramada para el {nueva_fecha}.", "cita": cita})


# ── STATS ──
@app.route("/api/stats", methods=["GET"])
def get_stats():
    return jsonify({
        "totalPacientes": len(pacientes),
        "citasActivas":   sum(1 for c in citas if c["estado"] == "Activa"),
        "totalCitas":     len(citas),
    })


# ── INICIO ──
if __name__ == "__main__":
    print("Servidor iniciado en http://127.0.0.1:5000")
    app.run(debug=True)