from math import pi
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


OUTPUT = Path("output/pdf/Actividad_4_Campo_Magnetico_Resuelta.pdf")
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = colors.HexColor("#17324D")
BLUE = colors.HexColor("#276FBF")
PALE_BLUE = colors.HexColor("#EAF2FA")
PALE_GOLD = colors.HexColor("#FFF6DE")
TEXT = colors.HexColor("#20252B")
MUTED = colors.HexColor("#5E6B78")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverTitle",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=22,
    leading=28,
    alignment=TA_CENTER,
    textColor=NAVY,
    spaceAfter=12,
))
styles.add(ParagraphStyle(
    name="CoverSubtitle",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=12,
    leading=17,
    alignment=TA_CENTER,
    textColor=MUTED,
    spaceAfter=18,
))
styles.add(ParagraphStyle(
    name="ProblemTitle",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=15,
    leading=19,
    textColor=NAVY,
    spaceBefore=0,
    spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="Section",
    parent=styles["Heading3"],
    fontName="Helvetica-Bold",
    fontSize=10.5,
    leading=14,
    textColor=BLUE,
    spaceBefore=7,
    spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="BodyCustom",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=10.2,
    leading=14.5,
    textColor=TEXT,
    alignment=TA_LEFT,
    spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="Formula",
    parent=styles["BodyText"],
    fontName="Courier",
    fontSize=9.5,
    leading=13,
    leftIndent=12,
    rightIndent=12,
    textColor=TEXT,
    backColor=PALE_BLUE,
    borderColor=colors.HexColor("#C9DDEE"),
    borderWidth=0.5,
    borderPadding=7,
    spaceBefore=4,
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="Result",
    parent=styles["BodyText"],
    fontName="Helvetica-Bold",
    fontSize=10.7,
    leading=15,
    textColor=NAVY,
    backColor=PALE_GOLD,
    borderColor=colors.HexColor("#E6CF8B"),
    borderWidth=0.5,
    borderPadding=7,
    spaceBefore=5,
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="Small",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=8.8,
    leading=12,
    textColor=MUTED,
    spaceAfter=4,
))


def p(text, style="BodyCustom"):
    return Paragraph(text, styles[style])


def formula(text):
    return Paragraph(text, styles["Formula"])


def result(text):
    return Paragraph(text, styles["Result"])


def table(data, widths):
    t = Table(data, colWidths=widths, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("LEADING", (0, 0), (-1, -1), 12),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#B7C5D1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F6F9FC")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def footer(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setStrokeColor(colors.HexColor("#D7E0E8"))
    canvas.line(2 * cm, 1.55 * cm, width - 2 * cm, 1.55 * cm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(2 * cm, 1.05 * cm, "Actividad 4 - Campo magnetico")
    canvas.drawRightString(width - 2 * cm, 1.05 * cm, f"Pagina {doc.page}")
    canvas.restoreState()


story = []

# Cover
story += [Spacer(1, 2.0 * cm)]
story += [p("ACTIVIDAD 4", "CoverTitle")]
story += [p("Campo magnetico, fuentes de campo magnetico y Ley de Faraday", "CoverSubtitle")]
story += [Spacer(1, 0.5 * cm)]
story += [p("Taller resuelto con procedimiento", "CoverSubtitle")]
story += [Spacer(1, 0.9 * cm)]
story += [table([
    [p("Datos del estudiante", "Section"), p("", "Section")],
    [p("Nombre", "BodyCustom"), p("____________________________________________", "BodyCustom")],
    [p("Programa / curso", "BodyCustom"), p("____________________________________________", "BodyCustom")],
    [p("Docente", "BodyCustom"), p("____________________________________________", "BodyCustom")],
    [p("Fecha", "BodyCustom"), p("____________________________________________", "BodyCustom")],
], [5 * cm, 10 * cm])]
story += [Spacer(1, 1.0 * cm)]
story += [p("Objetivo", "Section")]
story += [p("Aplicar las expresiones de fuerza magnetica, movimiento de particulas cargadas, campo producido por corrientes, Ley de Gauss y Ley de Faraday para interpretar y resolver los diez problemas propuestos.")]
story += [p("Nota sobre el enunciado", "Section")]
story += [p("El punto 2 aparece en el documento fuente como un problema de campo electrico y Ley de Gauss. Se resuelve tal como fue presentado, aunque el titulo general de la actividad corresponde a campo magnetico.", "Small")]
story += [PageBreak()]

story += [p("Constantes y convenciones", "ProblemTitle")]
story += [table([
    ["Constante", "Valor usado"],
    ["Carga elemental, e", "1.602 x 10^-19 C"],
    ["Masa del proton, m_p", "1.673 x 10^-27 kg"],
    ["Masa del electron, m_e", "9.109 x 10^-31 kg"],
    ["Permeabilidad del vacio, mu_0", "4 pi x 10^-7 T m/A"],
    ["Permitividad del vacio, eps_0", "8.854 x 10^-12 C^2/(N m^2)"],
    ["Aceleracion gravitacional, g", "9.80 m/s^2"],
], [7 * cm, 8 * cm])]
story += [Spacer(1, 0.5 * cm)]
story += [p("Criterio de trabajo", "Section")]
story += [p("En cada ejercicio se identifican los datos, se selecciona la ley fisica pertinente, se sustituyen las magnitudes en unidades del Sistema Internacional y se reporta el resultado con su direccion cuando corresponde.")]
story += [PageBreak()]

# 1
story += [p("1. Fuerza magnetica sobre un proton", "ProblemTitle")]
story += [p("El campo terrestre es vertical hacia abajo, B = 50.0 uT. Un proton se desplaza horizontalmente hacia el oeste con v = 6.20 x 10^6 m/s. Se pide la fuerza y el radio de la trayectoria.")]
story += [p("Datos", "Section")]
story += [p("q = +e; B = 50.0 x 10^-6 T; v = 6.20 x 10^6 m/s; m_p = 1.673 x 10^-27 kg.")]
story += [p("a) Magnitud y direccion de la fuerza", "Section")]
story += [formula("F = q v B sin(theta), con theta = 90 grados")]
story += [p("F = (1.602 x 10^-19)(6.20 x 10^6)(50.0 x 10^-6) = 4.97 x 10^-17 N.")]
story += [p("Para la direccion, usando la regla de la mano derecha para q positivo: oeste x abajo = sur.")]
story += [result("Respuesta 1a: F = 4.97 x 10^-17 N, dirigida hacia el sur.")]
story += [p("b) Radio del arco circular", "Section")]
story += [formula("r = m v / (q B)")]
story += [result("Respuesta 1b: r = 1.29 x 10^3 m, aproximadamente 1.29 km.")]
story += [PageBreak()]

# 2
story += [p("2. Carga encerrada y Ley de Gauss", "ProblemTitle")]
story += [p("Sobre una superficie esferica de radio R = 0.750 m se mide un campo electrico radial hacia el centro, de magnitud E = 890 N/C.")]
story += [p("a) Carga neta en el interior", "Section")]
story += [formula("Phi_E = E A cos(180 grados) = -E(4 pi R^2)\nQ_enc = eps_0 Phi_E")]
story += [p("Q_enc = -(8.854 x 10^-12)(890)(4 pi)(0.750)^2 = -5.57 x 10^-8 C.")]
story += [result("Respuesta 2a: Q_enc = -5.57 x 10^-8 C = -55.7 nC.")]
story += [p("b) Naturaleza y distribucion", "Section")]
story += [p("El signo negativo indica que la carga neta encerrada es negativa. El campo radial y de magnitud constante sobre la esfera es compatible con una distribucion esfericamente simetrica o, al menos, con una carga neta que produce ese flujo. La Ley de Gauss por si sola determina la carga neta encerrada, pero no permite conocer una distribucion interna unica sin informacion adicional.")]
story += [result("Respuesta 2b: hay exceso neto de carga negativa; la distribucion exacta no puede determinarse unicamente con esta superficie gaussiana.")]
story += [PageBreak()]

# 3
story += [p("3. Electron en una region con campo magnetico", "ProblemTitle")]
story += [p("Un electron entra perpendicularmente a una region donde B = 1.00 mT. La maxima profundidad de penetracion es 2.00 cm y la trayectoria dentro del campo es un semicirculo.")]
story += [p("a) Tiempo dentro de la region", "Section")]
story += [formula("T = 2 pi m_e / (e B);   t_semicirculo = T/2 = pi m_e/(eB)")]
story += [p("t = pi(9.109 x 10^-31)/(1.602 x 10^-19)(1.00 x 10^-3) = 1.79 x 10^-8 s.")]
story += [result("Respuesta 3a: t = 1.79 x 10^-8 s, es decir, 17.9 ns.")]
story += [p("b) Energia cinetica", "Section")]
story += [p("La profundidad maxima corresponde al radio de la semicircunferencia: r = 0.0200 m.")]
story += [formula("r = m_e v/(eB)  ->  v = eBr/m_e\nK = (1/2)m_e v^2 = e^2 B^2 r^2/(2m_e)")]
story += [p("v = 3.52 x 10^6 m/s;   K = 5.64 x 10^-18 J.")]
story += [result("Respuesta 3b: K = 5.64 x 10^-18 J = 35.2 eV.")]
story += [PageBreak()]

# 4
story += [p("4. Espectrometro de masas", "ProblemTitle")]
story += [p("En el selector de velocidad E = 2500 V/m y B = 0.0350 T. El mismo campo magnetico actua en la camara de deflexion. El ion tiene una sola carga y m = 2.18 x 10^-26 kg.")]
story += [p("Velocidad seleccionada", "Section")]
story += [formula("qE = qvB  ->  v = E/B")]
story += [p("v = 2500/0.0350 = 7.14 x 10^4 m/s.")]
story += [p("Radio en la camara", "Section")]
story += [formula("r = m v/(qB) = mE/(qB^2), con q = e")]
story += [p("r = (2.18 x 10^-26)(2500)/[(1.602 x 10^-19)(0.0350)^2] = 0.278 m.")]
story += [result("Respuesta 4: r = 0.278 m, aproximadamente 27.8 cm.")]
story += [PageBreak()]

# 5
story += [p("5. Campo en el centro de una espira", "ProblemTitle")]
story += [p("Una espira cuadrada de lado l = 0.400 m conduce I = 10.0 A, con la orientacion de la figura.")]
story += [p("a) Espira cuadrada", "Section")]
story += [formula("B_lado = mu_0 I/(4 pi r)(sin 45 + sin 45), con r = l/2\nB_total = 4 B_lado = 2 sqrt(2) mu_0 I/(pi l)")]
story += [p("B_total = 2 sqrt(2)(4 pi x 10^-7)(10.0)/(pi)(0.400) = 2.83 x 10^-5 T.")]
story += [p("La corriente es horaria al observar la figura de frente; por la regla de la mano derecha, el campo apunta hacia dentro de la pagina.")]
story += [result("Respuesta 5a: B = 2.83 x 10^-5 T = 28.3 uT, hacia dentro de la pagina.")]
story += [p("b) Una sola vuelta circular", "Section")]
story += [p("Se conserva la longitud del mismo conductor: 2 pi R = 4l, por tanto R = 2l/pi = 0.255 m.")]
story += [formula("B_circulo = mu_0 I/(2R) = mu_0 I pi/(4l)")]
story += [result("Respuesta 5b: B = 2.47 x 10^-5 T = 24.7 uT, hacia dentro de la pagina.")]
story += [PageBreak()]

# 6
story += [p("6. Campo producido por un arco de corriente", "ProblemTitle")]
story += [p("La trayectoria tiene un arco de radio R = 0.600 m, angulo subtendido theta = 30.0 grados y corriente I = 3.00 A. Los tramos rectos son radiales respecto de P.")]
story += [p("Los tramos radiales no producen campo en P porque dl es paralelo a r. Solo contribuye el arco:", "BodyCustom")]
story += [formula("B_arco = mu_0 I theta/(4 pi R), con theta = 30 grados = pi/6")]
story += [p("B = (4 pi x 10^-7)(3.00)(pi/6)/(4 pi)(0.600) = 2.62 x 10^-7 T.")]
story += [p("Segun la orientacion mostrada, la corriente recorre el arco en sentido horario alrededor de P, por lo que el campo entra en la pagina.")]
story += [result("Respuesta 6: B = 2.62 x 10^-7 T = 0.262 uT, hacia dentro de la pagina.")]
story += [PageBreak()]

# 7 and 8
story += [p("7-8. Campo de tres conductores paralelos", "ProblemTitle")]
story += [p("Para interpretar la figura: las tres corrientes son I = 2.00 A y salen de la pagina; los conductores superior e inferior estan en (0, +a) y (0, -a), y el conductor derecho en (2a, 0). Los puntos son A = (-a, 0), B = (0, 0) y C = (a, 0), con a = 1.00 cm.")]
story += [formula("Para cada conductor: B = mu_0 I/(2 pi r), con sentido tangencial antihorario alrededor de una corriente saliente")]
story += [p("En A, los conductores superior e inferior dejan una componente neta hacia abajo de mu_0 I/(2 pi a) por cada par, y el conductor derecho agrega mu_0 I/(6 pi a). Por tanto:")]
story += [formula("B_A = 4 mu_0 I/(6 pi a) = 4 mu_0 I/(6 pi a) = 5.33 x 10^-5 T")]
story += [p("En B, los campos de los conductores superior e inferior se cancelan entre si. El conductor derecho deja un campo hacia abajo:")]
story += [formula("B_B = mu_0 I/(4 pi a) = 2.00 x 10^-5 T")]
story += [p("En C, las contribuciones de los tres conductores se cancelan exactamente.")]
story += [table([
    ["Punto", "Magnitud", "Direccion"],
    ["A", "5.33 x 10^-5 T = 53.3 uT", "Hacia abajo"],
    ["B", "2.00 x 10^-5 T = 20.0 uT", "Hacia abajo"],
    ["C", "0 T", "Campo neto nulo"],
], [3 * cm, 7 * cm, 5 * cm])]
story += [result("Respuesta 8: B_A = 53.3 uT hacia abajo; B_B = 20.0 uT hacia abajo; B_C = 0.")]
story += [p("La geometria anterior reproduce las separaciones indicadas en la figura: AB = BC = CD = a.", "Small")]
story += [PageBreak()]

# 9
story += [p("9. Proton suspendido por fuerza magnetica", "ProblemTitle")]
story += [p("Un alambre recto horizontal conduce I = 1.20 uA. Un proton se mueve paralelo al alambre, en sentido opuesto a la corriente, con v = 2.30 x 10^4 m/s, a una distancia d por encima del alambre.")]
story += [p("Para que la rapidez y la altura permanezcan constantes, se igualan la fuerza magnetica ascendente y el peso:", "BodyCustom")]
story += [formula("F_B = qvB = m_p g\nB_alambre = mu_0 I/(2 pi d)\nqv mu_0 I/(2 pi d) = m_p g")]
story += [p("Despejando:")]
story += [formula("d = mu_0 I q v/(2 pi m_p g)")]
story += [p("d = (2 x 10^-7)(1.20 x 10^-6)(1.602 x 10^-19)(2.30 x 10^4)/[(1.673 x 10^-27)(9.80)] = 5.40 x 10^-2 m.")]
story += [result("Respuesta 9: d = 5.40 cm sobre el alambre.")]
story += [p("La direccion de la fuerza magnetica es ascendente porque las corrientes equivalentes son antiparalelas: el proton se mueve en sentido contrario a la corriente del alambre.")]
story += [PageBreak()]

# 10
story += [p("10. Fem inducida en una bobina por un solenoide", "ProblemTitle")]
story += [p("Solenoide largo: radio r_s = 2.00 cm, densidad de vueltas n = 1.0 x 10^3 vueltas/m. La bobina exterior tiene N = 15 vueltas y la corriente del solenoide es I(t) = 5.00 sin(120t) A.")]
story += [p("Para un solenoide largo, el campo interior es B = mu_0 n I. Como el campo exterior es despreciable, el flujo relevante atraviesa el area del solenoide, A_s = pi r_s^2; el radio exterior de la bobina no cambia este flujo idealizado.", "BodyCustom")]
story += [formula("Phi_total = N B A_s = N mu_0 n I(t) pi r_s^2\nepsilon(t) = -dPhi_total/dt\n|epsilon| = N mu_0 n pi r_s^2 (dI/dt)")]
story += [p("dI/dt = 5.00(120) cos(120t) = 600 cos(120t) A/s.")]
story += [p("epsilon(t) = -15(4 pi x 10^-7)(1.0 x 10^3)pi(0.0200)^2(600) cos(120t).")]
story += [result("Respuesta 10: epsilon(t) = -1.42 x 10^-2 cos(120t) V. Su amplitud es 14.2 mV; el signo depende de la orientacion elegida para la normal de la bobina.")]
story += [PageBreak()]

story += [p("Conclusiones", "ProblemTitle")]
story += [p("Los problemas muestran tres ideas centrales: una carga en movimiento experimenta una fuerza perpendicular a su velocidad y al campo; las corrientes electricas producen campos magneticos cuya direccion se obtiene con la regla de la mano derecha; y una variacion del flujo magnetico induce una fuerza electromotriz, de acuerdo con la Ley de Faraday y la Ley de Lenz.")]
story += [p("En los ejercicios de movimiento circular, el campo magnetico cambia la direccion de la velocidad sin realizar trabajo sobre la particula, por lo que la energia cinetica permanece constante. En la induccion, el signo negativo representa la oposicion del efecto inducido al cambio de flujo que lo produce.")]
story += [p("Bibliografia de apoyo", "Section")]
story += [p("Serway, R. A. (2016). Fisica: Electricidad y magnetismo (9a ed.). Cengage Learning. Paginas 180-246.")]
story += [p("Scholzel, U. (2016). Problemas de electromagnetismo para la Ingenieria. Editorial de la Universidad Politecnica de Valencia. Capitulo V.")]
story += [p("Khan Academy (2022). La carga y la fuerza electrica. Lecciones de fisica.")]
story += [Spacer(1, 0.5 * cm)]
story += [p("Revision final sugerida antes de entregar: completar los datos de la portada, revisar que las unidades esten visibles y confirmar con el docente la interpretacion geometrica de los puntos 7-8 si la figura original se lee de otra manera.", "Small")]


doc = SimpleDocTemplate(
    str(OUTPUT),
    pagesize=letter,
    rightMargin=2 * cm,
    leftMargin=2 * cm,
    topMargin=1.8 * cm,
    bottomMargin=2.0 * cm,
    title="Actividad 4 - Campo Magnetico Resuelta",
    author="",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT.resolve())
