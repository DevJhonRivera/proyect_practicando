import { CalendarDays, History } from "lucide-react";

function MonthFilter({ month, onChange }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-48">
        <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">
          Mes y año
        </span>
        <span className="relative block">
          <CalendarDays
            size={17}
            className="absolute left-3 top-3 text-slate-400"
          />
          <input
            type="month"
            value={month}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400"
          />
        </span>
      </label>

      <button
        type="button"
        onClick={() => onChange("")}
        className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
          month
            ? "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
            : "border-blue-200 bg-blue-50 text-blue-700"
        }`}
      >
        <History size={16} />
        Todo el historial
      </button>
    </div>
  );
}

export default MonthFilter;
