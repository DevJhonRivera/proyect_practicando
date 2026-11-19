import { useState } from "react";

const GRUPOS = {
  EXTERIOR: {
    "Luces": ["STOPS", "FAROLAS", "EXPLORADORAS", "LUZ DE BARRA", "TERCER STOP", "DIRECCIONALES"],
    "Carrocería": ["CAPOT", "BOMPER DELANTERO", "BOMPER TRASERO", "GUARDAFANGO DELANTERO", "GUARDAFANGO TRASERO", "PUERTAS", "BAUL", "TECHO", "ESTRIBOS", "MANIJAS", "COPAS DE MANIJAS", "BORDE DE PUERTA", "BOCA DE CARGA", "TAPA COMBUSTIBLE", "BORDE DE BAUL", "PERSIANA", "EMBLEMAS"],
    "Spoiler y aerodinámica": ["SPOILER", "CACHOS SPOILER", "PARTE BAJA SPOILER", "DIFUSOR", "SPLITTER", "FALDONES"],
    "Parales y molduras": ["PARALES", "TRIANGULOS", "MOLDURAS EXTERIORES", "MARCO VENTANAS", "NEGRO PIANO EXTERIOR"],
    "Retrovisores": ["RETROVISORES", "BASE RETROVISOR", "DIRECCIONAL RETROVISOR"],
  },
  INTERIOR: {
    "Pantallas e instrumentos": ["PANTALLA", "TACOMETRO", "TABLERO", "MILLARE", "HUD"],
    "Consola y mandos": ["CONSOLA CENTRAL", "CAJA CAMBIOS", "MANDO DE AIRE", "BOTONERA", "NEGRO PIANO", "PORTAVASOS", "CARGADOR INALAMBRICO", "MANDOS DEL VOLANTE"],
    "Puertas y acabados": ["PUERTAS INTERIORES", "MOLDURAS", "MANIJA INTERIOR", "APOYABRAZOS", "UMBRAL DE PUERTA", "GUANTERA", "RESPALDO DE SILLA"],
  },
  MOTO: {
    "Piezas de moto": ["TANQUE", "CARENADO DELANTERO", "CARENADOS LATERALES", "GUARDABARROS DELANTERO", "GUARDABARROS TRASERO", "FAROLA", "CUPULA", "TABLERO", "COLIN", "HORQUILLA", "CHASIS", "MALETAS", "RETROVISORES"],
  },
};
const variantes = ["ESTANDAR", "PEQUEÑO", "MEDIANO", "GRANDE", "CON BARRA", "SUPERIOR", "INFERIOR", "IZQUIERDO", "DERECHO"];

export default function SelectorPiezasPpf({ aplicacion, tipoVehiculo, catalogo = [], seleccionadas = [], precios = [], estandar = false, onToggle }) {
  const zonas = tipoVehiculo === "MOTO" ? ["EXTERIOR"] : aplicacion === "COMPLETO" ? ["EXTERIOR", "INTERIOR"] : [aplicacion === "INTERIOR" ? "INTERIOR" : "EXTERIOR"];
  const [zonaElegida, setZona] = useState(zonas[0]);
  const zona = zonas.includes(zonaElegida) ? zonaElegida : zonas[0];
  const grupos = GRUPOS[tipoVehiculo === "MOTO" ? "MOTO" : zona];
  const [grupo, setGrupo] = useState("");
  const [pieza, setPieza] = useState("");
  const [variante, setVariante] = useState("ESTANDAR");
  const [cantidad, setCantidad] = useState("1");
  const [personalizada, setPersonalizada] = useState("");
  const [ancho, setAncho] = useState("");
  const [largo, setLargo] = useState("");
  const opciones = grupos[grupo] || [];
  const nombre = (grupo === "Otra pieza" ? personalizada : pieza).trim().toUpperCase();
  const etiqueta = [nombre, variante !== "ESTANDAR" && grupo !== "Guardadas para este vehículo" ? variante : "", Number(cantidad) > 1 && grupo !== "Guardadas para este vehículo" ? `X${cantidad}` : ""].filter(Boolean).join(" ");
  const guardadas = catalogo.filter((p) => p.ubicacion === zona);
  const guardada = grupo === "Guardadas para este vehículo" ? guardadas.find((p) => p.pieza === pieza) : catalogo.find((p) => p.pieza === etiqueta && p.ubicacion === zona);
  const precio = precios.find((f) => f.hoja === "PPF PIEZAS PEQUEÑAS" && f.descripcion === etiqueta && f.activo && !f.requiereRevision)?.precios?.[0];
  const repetida = seleccionadas.includes(etiqueta);
  const agregar = () => {
    if (!nombre || repetida) return;
    onToggle(etiqueta, { ...guardada, ubicacion: zona, anchoCm: guardada?.anchoCm || ancho || "", largoCm: guardada?.largoCm || largo || "", cantidad: guardada?.cantidad || Number(cantidad) });
    setPieza(""); setPersonalizada(""); setAncho(""); setLargo("");
  };
  const clase = "mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm";
  return <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div><h4 className="font-bold text-slate-900">Seleccionar piezas PPF</h4><p className="text-xs text-slate-500">Elige la zona y el grupo. Agrega las piezas que llevará el vehículo.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-xs font-semibold">Zona<select className={clase} value={zona} onChange={(e) => { setZona(e.target.value); setGrupo(""); setPieza(""); }}>{zonas.map((z) => <option key={z}>{z}</option>)}</select></label>
      <label className="text-xs font-semibold">Grupo<select className={clase} value={grupo} onChange={(e) => { setGrupo(e.target.value); setPieza(""); setVariante("ESTANDAR"); setCantidad("1"); }}><option value="">Selecciona un grupo...</option>{Object.keys(grupos).map((g) => <option key={g}>{g}</option>)}{guardadas.length > 0 && <option>Guardadas para este vehículo</option>}<option>Otra pieza</option></select></label>
      <label className="text-xs font-semibold">Pieza{grupo === "Otra pieza" ? <input maxLength={100} className={clase} placeholder="Describe la pieza" value={personalizada} onChange={(e) => setPersonalizada(e.target.value)} /> : <select className={clase} disabled={!grupo} value={pieza} onChange={(e) => setPieza(e.target.value)}><option value="">Selecciona la pieza...</option>{(grupo === "Guardadas para este vehículo" ? guardadas.map((p) => p.pieza) : opciones).map((p) => <option key={p}>{p}</option>)}</select>}</label>
      {grupo !== "Guardadas para este vehículo" && <><label className="text-xs font-semibold">Variante<select className={clase} value={variante} onChange={(e) => setVariante(e.target.value)}>{variantes.map((v) => <option key={v}>{v}</option>)}</select></label><label className="text-xs font-semibold">Presentación<select className={clase} value={cantidad} onChange={(e) => setCantidad(e.target.value)}>{[1, 2, 4, 6, 8, 10].map((n) => <option key={n} value={n}>{n === 1 ? "Unidad" : n === 2 ? "Par / X2" : `Conjunto X${n}`}</option>)}</select></label></>}
      {grupo === "Otra pieza" && <><label className="text-xs font-semibold">Ancho por unidad (cm, opcional)<input className={clase} type="number" min="0" max="1000" step="0.1" value={ancho} onChange={(e) => setAncho(e.target.value)} /></label><label className="text-xs font-semibold">Largo por unidad (cm, opcional)<input className={clase} type="number" min="0" max="2000" step="0.1" value={largo} onChange={(e) => setLargo(e.target.value)} /></label></>}
    </div>
    {estandar && nombre && <p className="text-sm font-bold text-blue-900">{precio > 0 ? `Precio por presentación: $ ${Number(precio).toLocaleString("es-CO")}` : "Sin precio estándar para esta selección. Administración debe configurarlo o cotiza por medidas."}</p>}
    <button type="button" disabled={!nombre || repetida} onClick={agregar} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{repetida ? "Pieza ya agregada" : "+ Agregar pieza"}</button>
    <div className="border-t border-slate-200 pt-3"><p className="mb-2 text-xs font-bold text-slate-600">PIEZAS SELECCIONADAS · {seleccionadas.length}</p>{!seleccionadas.length && <p className="text-xs text-slate-500">Aún no has agregado piezas.</p>}<div className="flex flex-wrap gap-2">{seleccionadas.map((p) => <button key={p} type="button" onClick={() => onToggle(p)} title={`Quitar ${p}`} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">{p} <span aria-hidden="true" className="ml-2">×</span><span className="sr-only"> Quitar</span></button>)}</div></div>
    <p className="text-xs text-slate-500">Esta selección describe el trabajo. El valor se calcula con la tarifa, el combo o las medidas elegidas abajo.</p>
  </div>;
}
