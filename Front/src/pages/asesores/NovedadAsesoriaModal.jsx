import { useState } from "react";
import { Save, TriangleAlert } from "lucide-react";
import Swal from "sweetalert2";

import { createNovedadAsesoria } from "../../api/asesores.api";
import AppModal from "../../components/ui/AppModal";

const inicial = {
  tipo: "",
  descripcion: "",
  responsableCosto: "NO_APLICA",
  afectaMaterial: false,
  afectaPrecio: false,
  valorImpacto: "",
};

const soloDigitos = (value) => String(value || "").replace(/\D/g, "");
const formatoMiles = (value) => {
  const digitos = soloDigitos(value);
  return digitos ? Number(digitos).toLocaleString("es-CO") : "";
};

function NovedadAsesoriaModal({ asesoria, usuario, onClose, onSaved }) {
  const [form, setForm] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const esAdministrador = ["ADMIN", "SUPERUSUARIO"].includes(usuario?.rol);
  const esSolicitudInventario = usuario?.rol === "INVENTARIO";

  const cambiar = (campo, valor) => setForm((actual) => ({ ...actual, [campo]: valor }));

  const guardar = async () => {
    if (!form.tipo) return Swal.fire({ icon: "warning", title: "Seleccione el tipo de novedad" });
    if (form.descripcion.trim().length < 5) {
      return Swal.fire({ icon: "warning", title: "Describa lo ocurrido con más detalle" });
    }

    if (form.tipo === "CANCELACION_TOTAL") {
      const confirmacion = await Swal.fire({
        icon: "warning",
        title: "¿Cancelar completamente el servicio?",
        text: "Los cortes realizados permanecerán como material consumido y una venta pendiente será anulada.",
        showCancelButton: true,
        confirmButtonText: "Sí, cancelar servicio",
        cancelButtonText: "Volver",
        confirmButtonColor: "#dc2626",
      });
      if (!confirmacion.isConfirmed) return;
    }

    try {
      setGuardando(true);
      await createNovedadAsesoria(asesoria._id, {
        ...form,
        valorImpacto: Number(form.valorImpacto || 0),
      });
      await Swal.fire({
        icon: "success",
        title: esSolicitudInventario
          ? "Solicitud enviada a administración"
          : form.tipo === "CANCELACION_TOTAL" ? "Servicio cancelado" : "Novedad registrada",
        timer: 1700,
        showConfirmButton: false,
      });
      onSaved?.();
      onClose();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible registrar la novedad",
        text: error.response?.data?.message || "Revise la información ingresada.",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      title={esSolicitudInventario ? "Solicitar cambio a administración" : "Reportar novedad"}
      subtitle={`${asesoria.codigo} · ${asesoria.vehiculo?.placa}`}
      icon={TriangleAlert}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {esSolicitudInventario
            ? "La solicitud quedará pendiente. No modificará el servicio ni el inventario hasta que administración la revise."
            : "La novedad quedará en el historial del servicio. No se eliminarán cortes, pagos ni movimientos de inventario."}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de novedad">
            <select value={form.tipo} onChange={(e) => cambiar("tipo", e.target.value)} className="w-full rounded-xl border bg-white p-3">
              <option value="">Seleccione una opción</option>
              {esAdministrador && <option value="CANCELACION_TOTAL">Cancelación total</option>}
              {esAdministrador && <option value="CANCELACION_PARCIAL">Cancelación parcial</option>}
              {esAdministrador && <option value="CAMBIO_CLIENTE">Cambio solicitado por el cliente</option>}
              <option value="FALTA_MATERIAL">Falta de material</option>
              <option value="MATERIAL_DEFECTUOSO">Material defectuoso</option>
              <option value="ROLLO_EQUIVOCADO">Rollo seleccionado por error</option>
              <option value="REPETICION_CORTE">Repetición de corte</option>
              <option value="DANO_ENCONTRADO">Daño encontrado</option>
              <option value="TRABAJO_PENDIENTE">Trabajo pendiente</option>
              <option value="ERROR_REGISTRO">Error de registro</option>
              {esAdministrador && <option value="GARANTIA">Garantía</option>}
              <option value="OTRA">Otra novedad</option>
            </select>
          </Field>

          <Field label="Quién asume el costo">
            <select value={form.responsableCosto} onChange={(e) => cambiar("responsableCosto", e.target.value)} className="w-full rounded-xl border bg-white p-3">
              <option value="NO_APLICA">No aplica</option>
              <option value="POR_DEFINIR">Por definir</option>
              <option value="CLIENTE">Cliente</option>
              <option value="EMPRESA">Empresa</option>
              <option value="ASESOR">Asesor</option>
              <option value="INSTALADOR">Instalador</option>
              <option value="PROVEEDOR">Proveedor</option>
            </select>
          </Field>
        </div>

        <Field label="Descripción de lo ocurrido">
          <textarea
            value={form.descripcion}
            onChange={(e) => cambiar("descripcion", e.target.value.toUpperCase())}
            rows={4}
            maxLength={600}
            placeholder="Ej: EL CLIENTE DECIDIÓ NO INSTALAR EL POLARIZADO ANTES DE REALIZAR LOS CORTES"
            className="w-full resize-none rounded-xl border p-3"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 font-semibold text-slate-700">
            <input type="checkbox" checked={form.afectaMaterial} onChange={(e) => cambiar("afectaMaterial", e.target.checked)} className="h-5 w-5" />
            Afectó material
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 font-semibold text-slate-700">
            <input type="checkbox" checked={form.afectaPrecio} onChange={(e) => cambiar("afectaPrecio", e.target.checked)} className="h-5 w-5" />
            Afectó el precio
          </label>
        </div>

        {(form.afectaMaterial || form.afectaPrecio) && (
          <Field label="Valor estimado del impacto">
            <input
              value={formatoMiles(form.valorImpacto)}
              onChange={(e) => cambiar("valorImpacto", soloDigitos(e.target.value))}
              inputMode="numeric"
              placeholder="Ej: 150.000"
              className="w-full rounded-xl border p-3"
            />
          </Field>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="button" onClick={guardar} disabled={guardando} className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
            <Save size={18} /> {guardando ? "Guardando..." : esSolicitudInventario ? "Enviar solicitud" : "Registrar novedad"}
          </button>
        </div>
      </div>
    </AppModal>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>;
}

export default NovedadAsesoriaModal;
