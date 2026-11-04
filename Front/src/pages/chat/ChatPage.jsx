import { observarActualizaciones } from "../../utils/tiempoReal";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, Check, CheckCheck, Clock, ImagePlus, MessageCircle, Plus, Send, X } from "lucide-react";
import api from "../../api/axios";
import { obtenerUsuarioActual } from "../../utils/permisos";
import { puedeAbrirChat } from "../../utils/permisosChat";
import { optimizarFoto } from "../../utils/optimizarFoto";

const fecha = (value) => new Date(value).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bogota" });
const mensajeError = (error) => error.response?.data?.message || "No se pudo conectar con el chat. Intente nuevamente.";
const etiquetaOrden = (orden) => orden ? `${orden.codigo} · ${orden.vehiculo?.placa || ""}` : "Conversación general";

function Avatar({ nombre, enLinea }) {
  const iniciales = nombre?.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase() || "?";
  return <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-blue-100 to-indigo-200 text-sm font-black text-indigo-900">
    {iniciales}
    {enLinea && <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-slate-900 bg-emerald-400" />}
  </span>;
}

function NuevaConversacion({ ordenInicial, onClose, onOpen }) {
  const [contactos, setContactos] = useState([]);
  const [destinatario, setDestinatario] = useState("");
  const [vincular, setVincular] = useState(Boolean(ordenInicial));
  const [buscar, setBuscar] = useState("");
  const [ordenes, setOrdenes] = useState([]);
  const [orden, setOrden] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const control = new AbortController();
    api.get("/chat/contactos", { signal: control.signal })
      .then(({ data }) => setContactos(data))
      .catch((e) => { if (!control.signal.aborted) setError(mensajeError(e)); });
    return () => control.abort();
  }, []);

  useEffect(() => {
    if (!destinatario || !vincular) return;
    const control = new AbortController();
    const timer = setTimeout(() => {
      const id = ordenInicial && !buscar ? ordenInicial : undefined;
      api.get("/chat/ordenes", { params: { destinatario, buscar, id }, signal: control.signal })
        .then(({ data }) => {
          setOrdenes(data);
          setOrden((actual) => data.some((o) => o._id === actual) ? actual : id && data.length ? data[0]._id : "");
        })
        .catch((e) => { if (!control.signal.aborted) setError(mensajeError(e)); });
    }, 250);
    return () => { clearTimeout(timer); control.abort(); };
  }, [destinatario, vincular, buscar, ordenInicial]);

  const abrir = async (e) => {
    e.preventDefault();
    setError(""); setOcupado(true);
    try {
      const { data } = await api.post("/chat/conversaciones", { destinatario, orden: vincular ? orden : null });
      onOpen({ _id: data._id, contacto: contactos.find((u) => u._id === destinatario), orden: vincular ? ordenes.find((o) => o._id === orden) : null });
    } catch (e) { setError(mensajeError(e)); }
    finally { setOcupado(false); }
  };

  return <form onSubmit={abrir} className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
    <div className="flex items-center justify-between"><h2 className="font-bold">Nueva conversación</h2><button type="button" aria-label="Cerrar formulario" onClick={onClose}><X size={20} /></button></div>
    <label className="block text-sm font-semibold">Destinatario
      <select required value={destinatario} onChange={(e) => { setDestinatario(e.target.value); setOrden(""); setOrdenes([]); setError(""); }} className="mt-1 w-full rounded-lg border bg-white p-2">
        <option value="">Selecciona un contacto</option>
        {contactos.map((c) => <option key={c._id} value={c._id}>{c.nombre} · {c.rol}</option>)}
      </select>
    </label>
    {!contactos.length && <p className="text-sm text-slate-600">Tu perfil puede responder a las conversaciones que reciba. Los contactos disponibles para iniciar un chat aparecen aquí.</p>}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={vincular} onChange={(e) => setVincular(e.target.checked)} /> Vincular una orden de vehículo</label>
    {vincular && <div className="space-y-2">
      <label className="block text-sm">Buscar por placa o código<input value={buscar} maxLength={60} onChange={(e) => { setBuscar(e.target.value); setOrden(""); setOrdenes([]); }} className="mt-1 w-full rounded-lg border bg-white p-2" /></label>
      <label className="block text-sm">Orden
        <select required value={orden} onChange={(e) => setOrden(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2">
          <option value="">Selecciona una orden</option>
          {ordenes.map((o) => <option key={o._id} value={o._id}>{etiquetaOrden(o)}</option>)}
        </select>
      </label>
      {destinatario && !ordenes.length && <p className="text-xs text-slate-600">Elige una orden a la que ambos tengan acceso o inicia una conversación general.</p>}
    </div>}
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    <button disabled={ocupado || !destinatario || (vincular && !orden)} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">Abrir conversación</button>
  </form>;
}

function FotoMensaje({ chat, mensaje }) {
  const [foto, setFoto] = useState("");
  const [estado, setEstado] = useState("");
  const abrir = async () => {
    setEstado("Cargando foto…");
    try {
      const { data } = await api.get(`/chat/conversaciones/${chat}/fotos/${mensaje}`);
      setFoto(data.foto); setEstado("");
    } catch (error) { setEstado(mensajeError(error)); }
  };
  return foto ? <img src={foto} alt="Fotografía adjunta al mensaje" className="mt-2 max-h-80 max-w-full rounded-lg object-contain" />
    : <div><button type="button" onClick={abrir} disabled={estado === "Cargando foto…"} className="mt-1 text-sm font-semibold underline">Ver fotografía</button>{estado && <p role="status" className="text-xs">{estado}</p>}</div>;
}

function Conversacion({ chat, usuario, onBack }) {
  const [mensajes, setMensajes] = useState([]);
  const [pendiente, setPendiente] = useState(null);
  const [recibos, setRecibos] = useState({});
  const [hayMas, setHayMas] = useState(false);
  const [texto, setTexto] = useState("");
  const [foto, setFoto] = useState("");
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);
  const [error, setError] = useState("");
  const [conexion, setConexion] = useState("");
  const [enLinea, setEnLinea] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const cursor = useRef("");
  const ultimoAviso = useRef(0);
  const pausaEscritura = useRef(null);
  const avisoEnCurso = useRef(Promise.resolve());
  const leido = useRef("");
  const intento = useRef("");
  const lista = useRef(null);
  const ajusteScroll = useRef(null);
  const mantenerFondo = useRef(true);
  const montado = useRef(false);
  const endpoint = `/chat/conversaciones/${chat._id}`;

  useEffect(() => {
    montado.current = true;
    const control = new AbortController();
    const cargar = async () => {
      try {
        const { data } = await api.get(`${endpoint}/mensajes`, { signal: control.signal });
        if (control.signal.aborted) return;
        setConexion("");
        setEnLinea(Boolean(data.enLinea));
        setRecibos({ leido: data.leidoHasta, recibido: data.recibidoHasta });
        if (!cursor.current) setHayMas(data.hayMas);
        if (cursor.current && data.hayMas && data.mensajes[0]?._id > cursor.current) {
          let haySiguientes = true;
          while (haySiguientes && !control.signal.aborted) {
            const { data: pagina } = await api.get(`${endpoint}/mensajes`, {
              params: { despues: cursor.current }, signal: control.signal,
            });
            if (!pagina.mensajes.length || control.signal.aborted) break;
            setMensajes((actual) => unirMensajes(actual, pagina.mensajes));
            cursor.current = pagina.mensajes.at(-1)._id;
            haySiguientes = pagina.hayMas;
          }
        }
        if (control.signal.aborted) return;
        setMensajes((actual) => unirMensajes(actual, data.mensajes));
        const ultimo = data.mensajes.at(-1)?._id;
        if (ultimo && ultimo > cursor.current) cursor.current = ultimo;
        if (cursor.current && cursor.current !== leido.current && !document.hidden && document.hasFocus()) {
          const hasta = cursor.current;
          await api.post(`${endpoint}/leido`, { mensaje: hasta }, { signal: control.signal, skipGlobalActivity: true });
          leido.current = hasta;
          window.dispatchEvent(new Event("chat:leido"));
        }
      } catch (e) { if (!control.signal.aborted) setConexion(mensajeError(e)); }
    };
    const dejarDeObservar = observarActualizaciones(["realtime:chat", "realtime:chat-recibo"], cargar, 4000,
      (evento) => !evento.type.startsWith("realtime:chat") || evento.detail?.conversacion === chat._id);
    return () => { montado.current = false; dejarDeObservar(); control.abort(); };
  }, [endpoint, chat._id]);

  useEffect(() => {
    const el = lista.current;
    if (!el) return;
    if (ajusteScroll.current) {
      const { alto, posicion } = ajusteScroll.current;
      ajusteScroll.current = null;
      el.scrollTop = posicion + el.scrollHeight - alto;
    } else if (mantenerFondo.current) el.scrollTop = el.scrollHeight;
  }, [mensajes, pendiente]);

  useEffect(() => {
    let vencimiento;
    const presencia = ({ detail }) => {
      if (detail.usuario !== String(chat.contacto?._id)) return;
      setEnLinea(detail.enLinea);
      if (!detail.enLinea) setEscribiendo(false);
    };
    const escritura = ({ detail }) => {
      if (detail.conversacion !== chat._id || detail.usuario !== String(chat.contacto?._id)) return;
      clearTimeout(vencimiento);
      setEscribiendo(detail.escribiendo);
      if (detail.escribiendo) vencimiento = setTimeout(() => setEscribiendo(false), 4500);
    };
    window.addEventListener("realtime:presencia", presencia);
    window.addEventListener("realtime:escribiendo", escritura);
    return () => {
      clearTimeout(vencimiento);
      clearTimeout(pausaEscritura.current);
      window.removeEventListener("realtime:presencia", presencia);
      window.removeEventListener("realtime:escribiendo", escritura);
    };
  }, [chat._id, chat.contacto?._id]);

  const avisarEscritura = (activo) => {
    avisoEnCurso.current = avisoEnCurso.current.then(() => api.post(
      `${endpoint}/escribiendo`, { escribiendo: activo }, { skipGlobalActivity: true, timeout: 3000 },
    )).catch(() => {});
  };
  const detenerEscritura = () => {
    clearTimeout(pausaEscritura.current);
    if (!ultimoAviso.current) return;
    ultimoAviso.current = 0;
    avisarEscritura(false);
  };
  const cambiarTexto = (valor) => {
    setTexto(valor);
    intento.current = "";
    if (!valor.trim()) { detenerEscritura(); return; }
    if (Date.now() - ultimoAviso.current >= 1500) {
      ultimoAviso.current = Date.now();
      avisarEscritura(true);
    }
    clearTimeout(pausaEscritura.current);
    pausaEscritura.current = setTimeout(detenerEscritura, 2300);
  };

  const anteriores = async () => {
    mantenerFondo.current = false;
    setCargandoAnteriores(true); setError("");
    try {
      const { data } = await api.get(`${endpoint}/mensajes`, { params: { antes: mensajes[0]._id } });
      if (data.mensajes.length && lista.current) ajusteScroll.current = { alto: lista.current.scrollHeight, posicion: lista.current.scrollTop };
      setMensajes((actual) => unirMensajes(actual, data.mensajes));
      setHayMas(data.hayMas);
    } catch (e) { setError(mensajeError(e)); }
    finally { setCargandoAnteriores(false); }
  };

  const adjuntar = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setProcesandoFoto(true); setError("");
    try { setFoto(await optimizarFoto(archivo)); intento.current = ""; }
    catch (e) { setError(e.message); }
    finally { setProcesandoFoto(false); }
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando || (!texto.trim() && !foto)) return;
    detenerEscritura();
    setEnviando(true); setError("");
    intento.current ||= crypto.randomUUID();
    mantenerFondo.current = true;
    setPendiente({ _id: intento.current, intento: intento.current, autor: usuario._id, texto: texto.trim(), foto, createdAt: new Date().toISOString(), pendiente: true });
    try {
      const { data } = await api.post(`${endpoint}/mensajes`, { texto, foto, intento: intento.current }, { skipGlobalActivity: true });
      if (!montado.current) return;
      mantenerFondo.current = true;
      setMensajes((actual) => unirMensajes(actual, [data]));
      setTexto(""); setFoto(""); intento.current = "";
    } catch (e) { if (montado.current) setError(mensajeError(e)); }
    finally {
      if (montado.current) {
        setPendiente(null);
        setEnviando(false);
      }
    }
  };

  const visibles = pendiente && !mensajes.some((m) => m.intento === pendiente.intento && String(m.autor) === String(usuario._id))
    ? [...mensajes, pendiente] : mensajes;

  return <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <header className="flex items-center gap-3 bg-linear-to-r from-slate-950 to-indigo-950 p-3 text-white sm:p-4">
      <button type="button" onClick={() => { detenerEscritura(); onBack(); }} aria-label="Volver a conversaciones" className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/20"><ArrowLeft size={20} /></button>
      <Avatar nombre={chat.contacto?.nombre} enLinea={enLinea} /><div className="min-w-0 flex-1"><h2 className="truncate font-bold">{chat.contacto?.nombre || "Usuario anterior"}</h2><p className="truncate text-xs text-slate-300">{etiquetaOrden(chat.orden)}</p>
        <p role="status" className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${escribiendo || enLinea ? "text-emerald-300" : "text-slate-300"}`}>
          {escribiendo && <span aria-hidden="true" className="size-2 rounded-full bg-emerald-300 motion-safe:animate-pulse" />}{escribiendo ? "Escribiendo…" : enLinea ? "En línea" : "Fuera de línea"}
        </p>
      </div>
    </header>
    <div ref={lista} onScroll={(e) => { const el = e.currentTarget; mantenerFondo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
      className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)] bg-size-[18px_18px] p-4 sm:p-6" aria-label="Historial de mensajes">
      {hayMas && <button disabled={cargandoAnteriores} type="button" onClick={anteriores} className="block mx-auto rounded-lg border bg-white px-3 py-1 text-sm">Ver mensajes anteriores</button>}
      {!mensajes.length && <p className="py-8 text-center text-sm text-slate-500">Aún no hay mensajes.</p>}
      {visibles.map((m) => {
        const propio = String(m.autor) === String(usuario._id);
        return <div key={m._id} className={`w-fit max-w-[88%] rounded-2xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[76%] ${propio ? "ml-auto rounded-br-sm bg-indigo-700 text-white" : "rounded-bl-sm border border-slate-200 bg-white text-slate-900"}`}>
          {m.texto && <p className="whitespace-pre-wrap wrap-anywhere leading-relaxed">{m.texto}</p>}
          {m.tieneFoto && <FotoMensaje chat={chat._id} mensaje={m._id} />}
          {m.foto && <img src={m.foto} alt="Foto adjunta" className="mt-2 max-h-80 max-w-full rounded-lg object-contain" />}
          <div className={`mt-1 flex items-center justify-end gap-1.5 text-[11px] ${propio ? "text-indigo-100" : "text-slate-600"}`}>
            <time dateTime={m.createdAt}>{fecha(m.createdAt)}</time>
            {propio && <EstadoEnvio mensaje={m} recibos={recibos} />}
          </div>
        </div>;
      })}
    </div>
    {conexion && <p role="status" className="bg-amber-50 px-4 py-2 text-xs text-amber-900">{conexion}</p>}
    {chat.puedeEnviar === false ? <p className="border-t bg-slate-50 px-4 py-3 text-sm text-slate-600">Conversación de solo lectura</p> : <form onSubmit={enviar} className="space-y-2 border-t p-3">
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {foto && <div className="flex items-start gap-2"><img src={foto} alt="Vista previa de la foto" className="h-20 rounded object-contain" /><button type="button" disabled={enviando} onClick={() => { setFoto(""); intento.current = ""; }} aria-label="Quitar foto"><X size={18} /></button></div>}
      <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-indigo-400">
        <label className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl bg-indigo-100 text-indigo-800 hover:bg-indigo-200 focus-within:ring-2 focus-within:ring-indigo-500" title="Tomar foto"><Camera size={19} /><input type="file" aria-label="Tomar foto" accept="image/*" capture="environment" disabled={enviando || procesandoFoto} onChange={adjuntar} className="sr-only" /></label>
        <label className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl bg-indigo-100 text-indigo-800 hover:bg-indigo-200 focus-within:ring-2 focus-within:ring-indigo-500" title="Adjuntar fotografía"><ImagePlus size={19} /><input type="file" aria-label="Adjuntar fotografía" accept="image/jpeg,image/png,image/webp" disabled={enviando || procesandoFoto} onChange={adjuntar} className="sr-only" /></label>
        <textarea aria-label="Mensaje" rows={2} maxLength={4000} disabled={enviando} value={texto} onBlur={detenerEscritura} onChange={(e) => cambiarTexto(e.target.value)} placeholder="Escribe un mensaje…" className="max-h-32 min-w-0 flex-1 resize-y rounded-lg bg-transparent p-2 text-sm outline-none" />
        <button type="submit" disabled={enviando || procesandoFoto || (!texto.trim() && !foto)} className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-indigo-700 px-3 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-40" aria-label="Enviar mensaje"><Send size={18} /><span className="hidden sm:inline">Enviar</span></button>
      </div>
      {procesandoFoto && <p role="status" className="text-xs">Preparando foto…</p>}
    </form>}
  </section>;
}

function EstadoEnvio({ mensaje, recibos }) {
  const leido = !mensaje.pendiente && mensaje._id <= (recibos.leido || "");
  const recibido = leido || (!mensaje.pendiente && mensaje._id <= (recibos.recibido || ""));
  const Icono = mensaje.pendiente ? Clock : recibido ? CheckCheck : Check;
  const estado = mensaje.pendiente ? "Enviando" : leido ? "Leído" : recibido ? "Entregado" : "Enviado";
  return <span role="img" aria-label={estado} title={estado} className={leido ? "text-sky-300" : undefined}>
    <Icono size={15} aria-hidden="true" />
  </span>;
}

function unirMensajes(actual, nuevos) {
  const mapa = new Map(actual.map((m) => [m._id, m]));
  let cambio = false;
  for (const m of nuevos) if (!mapa.has(m._id)) { mapa.set(m._id, m); cambio = true; }
  return cambio ? [...mapa.values()].sort((a, b) => a._id.localeCompare(b._id)) : actual;
}

export default function ChatPage() {
  const usuario = obtenerUsuarioActual();
  const [params, setParams] = useSearchParams();
  const ordenFiltro = params.get("orden") || "";
  const [pagina, setPagina] = useState(1);
  const [chats, setChats] = useState([]);
  const [hayMas, setHayMas] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  const [activo, setActivo] = useState(null);
  const [error, setError] = useState("");
  const [recargar, setRecargar] = useState(0);
  const permitido = puedeAbrirChat(usuario?.rol);

  useEffect(() => {
    if (!permitido) return;
    const control = new AbortController();
    const cargar = async () => {
      try {
        const { data } = await api.get("/chat/conversaciones", { params: { pagina, orden: ordenFiltro || undefined }, signal: control.signal });
        if (!control.signal.aborted) { setChats(data.conversaciones); setHayMas(data.hayMas); setError(""); }
      } catch (e) { if (!control.signal.aborted) setError(mensajeError(e)); }
    };
    const dejarDeObservar = observarActualizaciones(["realtime:chat", "realtime:chat-leido", "chat:leido"], cargar, 8000);
    return () => { dejarDeObservar(); control.abort(); };
  }, [pagina, ordenFiltro, recargar, permitido]);

  if (!permitido) return <p className="p-6">Tu perfil no tiene acceso al chat interno.</p>;
  return <main className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-linear-to-r from-slate-950 via-indigo-950 to-indigo-800 p-5 text-white shadow-sm sm:p-6">
      <div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15"><MessageCircle size={22} /></span><div><h1 className="text-2xl font-black">Chat interno</h1><p className="text-sm text-indigo-100">Conversaciones de equipo vinculadas a un vehículo o generales.</p></div></div>
      <button type="button" onClick={() => { setNuevo(true); setActivo(null); }} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-bold text-indigo-950 hover:bg-indigo-100"><Plus size={17} /> Nuevo chat</button>
    </header>
    {ordenFiltro && <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3 text-sm"><span>Conversaciones de la orden seleccionada</span><button onClick={() => { setPagina(1); setParams({}); }} className="font-bold text-blue-700">Ver todas</button></div>}
    {nuevo && <NuevaConversacion key={ordenFiltro} ordenInicial={ordenFiltro} onClose={() => setNuevo(false)} onOpen={(chat) => {
      setActivo(chat); setNuevo(false); setPagina(1); setRecargar((v) => v + 1);
      if (ordenFiltro && chat.orden?._id !== ordenFiltro) setParams({});
    }} />}
    <div className="flex h-[70vh] min-h-[30rem] gap-4">
      <aside className={`w-full overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-sm md:block md:w-72 md:shrink-0 ${activo ? "hidden" : ""}`}>
        <h2 className="border-b border-slate-100 px-4 py-4 font-bold text-slate-900">Conversaciones</h2>
        {error && <p role="alert" className="p-3 text-sm text-red-800">{error}</p>}
        {!chats.length && !error && <p className="p-4 text-sm text-slate-500">Todavía no tienes conversaciones en esta vista.</p>}
        {chats.map((chat) => <button key={chat._id} type="button" aria-pressed={activo?._id === chat._id} onClick={() => setActivo(chat)} className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-indigo-50 ${activo?._id === chat._id ? "bg-indigo-50 ring-1 ring-inset ring-indigo-200" : ""}`}>
          <Avatar nombre={chat.contacto?.nombre} /><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-sm font-bold"><span className="truncate">{chat.contacto?.nombre || "Usuario anterior"}</span>{chat.sinLeer && <span className="rounded-full bg-blue-700 px-2 py-0.5 text-xs text-white">Nuevo</span>}</span>
          <span className="block text-xs text-slate-600">{etiquetaOrden(chat.orden)}</span>
          <span className="block text-xs text-slate-500">{fecha(chat.ultimoEn)}</span></span>
        </button>)}
        {(hayMas || pagina > 1) && <div className="flex justify-between gap-2 p-3 text-sm"><button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} className="disabled:opacity-30">Anterior</button><span>{pagina}</span><button disabled={!hayMas} onClick={() => setPagina((p) => p + 1)} className="disabled:opacity-30">Siguiente</button></div>}
      </aside>
      {activo ? <Conversacion key={activo._id} chat={activo} usuario={usuario} onBack={() => setActivo(null)} />
        : <div className="hidden flex-1 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-linear-to-br from-white to-indigo-50 px-5 text-center text-slate-600 md:flex"><span aria-hidden="true" className="mb-2 grid size-16 place-items-center rounded-3xl bg-indigo-100 text-indigo-700"><MessageCircle size={30} /></span><p className="mt-2">Selecciona una conversación o abre un chat nuevo.</p></div>}
    </div>
  </main>;
}
