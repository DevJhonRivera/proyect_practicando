import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { subscribeToActivity } from "../../utils/activityIndicator";

function GlobalActivityIndicator() {
  const [pendingActions, setPendingActions] = useState(0);

  useEffect(() => subscribeToActivity(setPendingActions), []);

  if (pendingActions === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-label="Procesando solicitud"
    >
      <div className="flex min-w-[220px] items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-2xl">
        <LoaderCircle className="shrink-0 animate-spin text-blue-600" size={28} />
        <div>
          <p className="font-bold text-slate-900">Procesando...</p>
          <p className="text-sm text-slate-500">Espera mientras guardamos los cambios.</p>
        </div>
      </div>
    </div>
  );
}

export default GlobalActivityIndicator;
