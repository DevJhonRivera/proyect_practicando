import { Search, SlidersHorizontal, X } from "lucide-react";

export const filterControlClass = "h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function FilterToolbar({ children, activeCount = 0, onClear, title = "Filtros", className = "" }) {
  return (
    <section className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600"><SlidersHorizontal size={15}/></span>
          {title}
          {activeCount > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-black text-blue-700">{activeCount} {activeCount === 1 ? "activo" : "activos"}</span>}
        </div>
        {onClear && <button type="button" onClick={onClear} disabled={activeCount === 0} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:cursor-default disabled:opacity-35"><X size={14}/>Limpiar</button>}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

export function FilterField({ label, children, className = "" }) {
  return <label className={`block min-w-0 ${className}`}><span className="mb-1 block text-[10px] font-black uppercase text-slate-500">{label}</span>{children}</label>;
}

export function FilterSearch({ value, onChange, placeholder, className = "" }) {
  return <div className={`relative min-w-0 ${className}`}><Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={15}/><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${filterControlClass} pl-8`}/></div>;
}
