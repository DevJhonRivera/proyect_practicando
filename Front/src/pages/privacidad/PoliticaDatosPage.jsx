import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Printer, ShieldCheck } from "lucide-react";
import axios from "axios";
import api from "../../api/axios";
import PoliticaDatosContenido from "./PoliticaDatosContenido";
export default function PoliticaDatosPage() {
  const [politica, setPolitica] = useState(null);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    const controlador = new AbortController();
    axios.get(`${api.defaults.baseURL}/privacidad/politica`, { signal: controlador.signal }).then((r) => { setPolitica(r.data.data); setError(""); }).catch((e) => { if (!axios.isCancel(e)) setError(e.response?.data?.message || "No se pudo cargar la política. Intenta nuevamente."); });
    return () => controlador.abort();
  }, [intento]);
  return <main className="min-h-screen bg-slate-100 px-3 py-6 sm:px-6 print:bg-white print:p-0"><div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 print:rounded-none print:border-0 print:shadow-none"><header className="bg-slate-950 p-6 text-white sm:p-9"><p className="text-lg font-black tracking-wider">POLARIZADOS <span className="text-blue-400">YA</span></p><p className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300"><ShieldCheck size={18} />Privacidad y transparencia</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Política de tratamiento de datos</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">Conoce qué información registramos, para qué la usamos y cómo puedes ejercer tus derechos. Abre cada sección para consultar el detalle.</p></header><div className="p-5 sm:p-9"><nav className="mb-6 flex flex-wrap justify-between gap-3 print:hidden"><Link to="/" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><ArrowLeft size={16} />Volver a la aplicación</Link>{politica && <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white"><Printer size={16} />Imprimir / guardar PDF</button>}</nav>{politica ? <PoliticaDatosContenido politica={politica} /> : error ? <div role="alert" className="rounded-xl bg-amber-50 p-5 text-amber-900"><p>{error}</p><button onClick={() => setIntento((n) => n + 1)} className="mt-3 rounded border px-3 py-2 text-sm font-bold">Reintentar</button></div> : <p role="status" className="py-10 text-center text-slate-500">Cargando la política de tratamiento de datos…</p>}</div></div></main>;
}
