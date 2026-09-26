import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function TablePagination({ pagination }) {
  const {
    currentPage,
    pageSize,
    setPage,
    setPageSize,
    startIndex,
    totalItems,
    totalPages,
  } = pagination;

  if (totalItems === 0) {
    return null;
  }

  const firstItem = startIndex + 1;
  const lastItem = Math.min(
    startIndex + pageSize,
    totalItems
  );

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Mostrando {firstItem}-{lastItem} de {totalItems}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-500">
          Filas
          <select
            value={pageSize}
            onChange={(event) =>
              setPageSize(event.target.value)
            }
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
          >
            {[20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <span className="min-w-24 text-center text-sm font-semibold text-slate-600">
          {currentPage} de {totalPages}
        </span>

        <button
          type="button"
          onClick={() => setPage(currentPage - 1)}
          disabled={currentPage === 1}
          title="Pagina anterior"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={18} />
        </button>

        <button
          type="button"
          onClick={() => setPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Pagina siguiente"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export default TablePagination;
