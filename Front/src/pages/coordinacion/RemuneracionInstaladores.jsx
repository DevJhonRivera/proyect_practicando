import { useEffect, useState } from "react";
import api from "../../api/axios";
const modos = { SOLO_COMISION: "Solo comision", SOLO_SALARIO: "Solo salario", SALARIO_COMISION: "Salario mas comision" };
export default function RemuneracionInstaladores() {
  const [lista, setLista] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState("");
  useEffect(() => { api.get("/usuarios").then(({ data }) => setLista(data.filter(u => u.rol === "INSTALADOR").map(u => ({ ...u, remuneracion: { modalidad: u.remuneracion?.modalidad || "SOLO_COMISION", salarioMensual: u.remuneracion?.salarioMensual || "" } })))).catch(() => setMensaje("No se pudieron cargar las modalidades de pago.")); }, []);
  const cambiar = (id, campo, valor) => setLista(actual => actual.map(u => u._id === id ? { ...u, remuneracion: { ...u.remuneracion, [campo]: valor } } : u));
  const guardar = async (u) => {
    setGuardando(u._id); setMensaje("");
    try { const { data } = await api.patch(`/usuarios/${u._id}/remuneracion`, u.remuneracion); setLista(actual => actual.map(item => item._id === u._id ? { ...item, remuneracion: data.remuneracion } : item)); setMensaje(`Modalidad guardada para ${u.nombre}. Aplica a nuevas asignaciones; los pagos anteriores se conservan.`); }
    catch (error) { setMensaje(error.response?.data?.message || "No se pudo guardar la modalidad."); }
    finally { setGuardando(""); }
  };
  return <div className="m-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:m-6">
    <h2 className="text-lg font-bold text-slate-900">Modalidad de pago por instalador</h2>
    <p className="mb-4 text-sm text-slate-600">Configura el salario mensual acordado. Solo salario no genera comisiones ni pagos por servicio. Los otros modos usan las tarifas de abajo. El salario se registra por separado y no se suma por cada trabajo.</p>
    <div className="space-y-3">{lista.map(u => <div key={u._id} className="grid items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
      <p className="font-semibold">{u.nombre}</p>
      <label className="text-sm">Modalidad<select aria-label={`Modalidad de ${u.nombre}`} disabled={Boolean(guardando)} className="mt-1 block w-full rounded border p-2" value={u.remuneracion.modalidad} onChange={e => cambiar(u._id, "modalidad", e.target.value)}>{Object.entries(modos).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      {u.remuneracion.modalidad !== "SOLO_COMISION" ? <label className="text-sm">Salario mensual (COP)<input aria-label={`Salario de ${u.nombre}`} disabled={Boolean(guardando)} type="number" min="1" step="1" className="mt-1 block w-full rounded border p-2" value={u.remuneracion.salarioMensual} onChange={e => cambiar(u._id, "salarioMensual", e.target.value)} /></label> : <p className="text-sm text-slate-500">Sin salario fijo configurado</p>}
      <button disabled={Boolean(guardando)} type="button" onClick={() => guardar(u)} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{guardando === u._id ? "Guardando..." : "Guardar"}</button>
    </div>)}</div>
    {mensaje && <p role="status" className="mt-3 text-sm text-slate-700">{mensaje}</p>}
  </div>;
}
