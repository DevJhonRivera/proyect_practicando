import Swal from "sweetalert2";

import { darBajaMaterial } from "../api/rollos.api";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export const solicitarBajaMaterial = async (rollo) => {
  const disponible = Number(rollo.largoDisponible || 0);
  const resultado = await Swal.fire({
    title: "Registrar material dañado",
    html: `
      <div class="text-left">
        <p class="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <strong>${escapeHtml(rollo.codigoRollo)}</strong> · ${escapeHtml(rollo.tipoPolarizado)} · ${disponible.toFixed(2)} m disponibles
        </p>
        <label class="mb-1 block text-xs font-bold text-slate-600">TIPO DE BAJA</label>
        <select id="baja-tipo" class="swal2-select !m-0 !mb-3 !w-full">
          <option value="DANO_PARCIAL">Daño parcial</option>
          <option value="BAJA_TOTAL">Baja total del remanente</option>
        </select>
        <label class="mb-1 block text-xs font-bold text-slate-600">CAUSA</label>
        <select id="baja-causa" class="swal2-select !m-0 !mb-3 !w-full">
          <option value="">Seleccione...</option>
          <option value="DEFECTO_PROVEEDOR">Defecto del proveedor</option>
          <option value="HUMEDAD">Humedad</option>
          <option value="GOLPE">Golpe</option>
          <option value="MALA_MANIPULACION">Mala manipulación</option>
          <option value="VENCIMIENTO">Vencimiento</option>
          <option value="OTRO">Otro</option>
        </select>
        <label class="mb-1 block text-xs font-bold text-slate-600">METROS DAÑADOS</label>
        <input id="baja-metros" type="number" min="0.01" max="${disponible}" step="0.01" class="swal2-input !m-0 !mb-3 !w-full" placeholder="Ej: 1.50" />
        <label class="mb-1 block text-xs font-bold text-slate-600">DESCRIPCIÓN</label>
        <textarea id="baja-observacion" class="swal2-textarea !m-0 !w-full" placeholder="Indique qué ocurrió y cómo se encontró el material"></textarea>
      </div>`,
    showCancelButton: true,
    confirmButtonText: "Registrar baja",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#b91c1c",
    didOpen: () => {
      const tipo = document.getElementById("baja-tipo");
      const metros = document.getElementById("baja-metros");
      const actualizar = () => {
        const total = tipo.value === "BAJA_TOTAL";
        metros.disabled = total;
        metros.value = total ? disponible.toFixed(2) : "";
      };
      tipo.addEventListener("change", actualizar);
      actualizar();
    },
    preConfirm: () => {
      const tipo = document.getElementById("baja-tipo").value;
      const causa = document.getElementById("baja-causa").value;
      const metros = Number(document.getElementById("baja-metros").value);
      const observacion = document.getElementById("baja-observacion").value.trim();
      if (!causa) return Swal.showValidationMessage("Seleccione la causa del daño");
      if (!Number.isFinite(metros) || metros <= 0 || metros > disponible) {
        return Swal.showValidationMessage(`Ingrese una cantidad entre 0.01 y ${disponible.toFixed(2)} m`);
      }
      if (observacion.length < 5) return Swal.showValidationMessage("Describa qué ocurrió");
      return { tipo, causa, metros, observacion };
    },
  });

  if (!resultado.isConfirmed) return false;
  try {
    Swal.fire({ title: "Registrando baja...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const response = await darBajaMaterial(rollo._id, resultado.value);
    const data = response.data.data;
    await Swal.fire({
      icon: "success",
      title: response.data.message,
      text: `${Number(data.metrosRetirados).toFixed(2)} m retirados · pérdida $ ${Number(data.costoPerdidaCop || 0).toLocaleString("es-CO")}`,
    });
    return true;
  } catch (error) {
    await Swal.fire({ icon: "error", title: "No fue posible registrar la baja", text: error.response?.data?.message || error.message });
    return false;
  }
};
