import { useState } from "react";
import { Camera, Expand, ImagePlus, Trash2, X } from "lucide-react";

import { optimizarFoto } from "../../utils/optimizarFoto";

export default function FotosDiagnostico({ fotos = [], onChange, disabled = false, procesando = false, onProcesando }) {
  const [ampliada, setAmpliada] = useState(null);
  const [error, setError] = useState("");
  const editable = typeof onChange === "function";
  const agregar = async (evento) => {
    const archivos = Array.from(evento.target.files || []); evento.target.value = ""; setError("");
    if (fotos.length + archivos.length > 10) { setError("Puedes incluir máximo 10 fotografías. Retira alguna antes de añadir más."); return; }
    onProcesando?.(true);
    try {
      const nuevas = [];
      for (const file of archivos) {
        const dataUrl = await optimizarFoto(file);
        if ([...fotos, ...nuevas].some((f) => f.dataUrl === dataUrl)) throw new Error("Seleccionaste una fotografía repetida.");
        nuevas.push({ nombre: `Foto ${fotos.length + nuevas.length + 1}`, dataUrl });
      }
      onChange([...fotos, ...nuevas]);
    } catch (e) { setError(e.message || "No se pudo leer la fotografía."); }
    finally { onProcesando?.(false); }
  };
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Camera size={20} className="text-blue-700" /><h3 className="font-bold text-slate-900">Registro fotográfico</h3></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${fotos.length >= 4 && fotos.length <= 10 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{fotos.length}{editable ? " / 10 fotos" : " fotografías"}</span></div>
    {editable && <><p className="mt-2 text-sm text-slate-600">Obligatorio: de 4 a 10 fotos distintas. Incluye frente, parte trasera, ambos laterales y detalles de daños o pertenencias.</p><p className="mt-1 text-xs text-slate-500">Evita rostros, documentos personales y objetos que no sean necesarios. Las imágenes se optimizan para enviarse y verse en celular.</p><label className={`mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 p-5 text-sm font-semibold text-blue-800 ${disabled || procesando || fotos.length >= 10 ? "pointer-events-none opacity-50" : "hover:bg-blue-100"}`}><ImagePlus size={22} />{procesando ? "Preparando fotografías…" : "Seleccionar fotos del vehículo"}<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={disabled || procesando || fotos.length >= 10} onChange={agregar} className="sr-only" /></label></>}
    {!!fotos.length && <div className="mt-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">{fotos.map((foto, i) => <figure key={foto.fotoId || i} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 print:break-inside-avoid"><button type="button" onClick={() => setAmpliada(foto)} className="relative block w-full" aria-label={`Ampliar ${foto.nombre || `foto ${i + 1}`}`}><img src={foto.dataUrl} alt={foto.nombre || `Estado del vehículo, foto ${i + 1}`} loading="eager" className="aspect-[4/3] w-full object-contain" /><Expand size={24} className="absolute bottom-2 right-2 rounded bg-white/90 p-1 text-slate-700 print:hidden" /></button><figcaption className="flex items-center gap-2 p-2">{editable ? <><input maxLength={100} aria-label={`Descripción foto ${i + 1}`} value={foto.nombre || ""} disabled={disabled || procesando} onChange={(e) => onChange(fotos.map((f, j) => j === i ? { ...f, nombre: e.target.value } : f))} className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-2 text-xs" /><button type="button" disabled={disabled || procesando} aria-label={`Retirar foto ${i + 1}`} onClick={() => onChange(fotos.filter((_, j) => j !== i))} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 size={16} /></button></> : <span className="text-xs font-medium text-slate-600">{foto.nombre || `Foto ${i + 1}`}</span>}</figcaption></figure>)}</div>}
    {editable && fotos.length < 4 && <p className="mt-3 text-xs font-semibold text-amber-800">Faltan {4 - fotos.length} fotos para habilitar el diagnóstico.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {ampliada && <div role="dialog" aria-modal="true" aria-label="Fotografía ampliada" className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 p-4 print:hidden" onClick={() => setAmpliada(null)} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setAmpliada(null); } }}><button type="button" autoFocus onClick={() => setAmpliada(null)} className="absolute right-4 top-4 rounded-full bg-white p-3" aria-label="Cerrar fotografía"><X /></button><img src={ampliada.dataUrl} alt={ampliada.nombre || "Estado del vehículo"} className="max-h-[82vh] max-w-full object-contain" /><p className="mt-3 text-sm text-white">{ampliada.nombre}</p></div>}
  </section>;
}
