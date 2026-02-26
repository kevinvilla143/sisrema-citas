from flask import Flask, render_template, request

app = Flask(__name__)

@app.route("/")
def inicio():
    return render_template("index.html")


@app.route("/registrar", methods=["POST"])
def registrar():

    paciente = request.form["paciente"]
    medico = request.form["medico"]
    especialidad = request.form["especialidad"]
    fecha = request.form["fecha"]

    print("Paciente:", paciente)
    print("Medico:", medico)
    print("Especialidad:", especialidad)
    print("Fecha:", fecha)

    return "Cita registrada correctamente"


app.run(debug=True)

if __name__ == "__main__":
    app.run()