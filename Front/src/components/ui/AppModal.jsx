import { useEffect } from "react";
import { PanelTop, X } from "lucide-react";

function AppModal({
  title,
  subtitle,
  icon: Icon = PanelTop,
  children,
  onClose,
  maxWidth = "max-w-3xl",
}) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[3px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`app-modal flex max-h-[min(92vh,900px)] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-slate-950/20`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-700 bg-slate-900 px-5 py-4 text-white sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-300/20">
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <h2 id="app-modal-title" className="truncate text-lg font-bold sm:text-xl">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-slate-300 sm:text-sm">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            title="Cerrar ventana"
            aria-label="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </header>
        <div className="app-modal-content min-h-0 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default AppModal;
