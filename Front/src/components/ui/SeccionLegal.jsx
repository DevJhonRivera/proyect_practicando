import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
export default function SeccionLegal({ titulo, resumen, children, inicialmenteAbierta = false }) {
  const [abierta, setAbierta] = useState(inicialmenteAbierta);
  const id = useId();
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white print:break-inside-avoid">
    <button type="button" aria-expanded={abierta} aria-controls={id} onClick={() => setAbierta((v) => !v)} className="flex w-full items-start justify-between gap-4 p-4 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:p-5 print:hidden"><span><span className="block font-bold text-slate-900">{titulo}</span>{resumen && <span className="mt-1 block text-sm leading-6 text-slate-500">{resumen}</span>}</span><ChevronDown size={20} className={`mt-1 shrink-0 text-blue-700 transition-transform ${abierta ? "rotate-180" : ""}`} /></button>
    <h3 className="hidden px-5 pt-4 font-bold print:block">{titulo}</h3>
    <div id={id} className={`${abierta ? "block" : "hidden"} border-t border-slate-100 p-4 sm:p-5 print:block`}>{children}</div>
  </section>;
}
