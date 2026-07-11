import Swal from "sweetalert2";
import { etiquetaDetalle } from "../../utils/materiales";

const formatMetros = (value) =>
  Number(value || 0).toFixed(2);

export const showRetazoCompatibleDialog =
  (retazo) =>
    Swal.fire({
      icon: "info",
      title: "Existe un retazo compatible",
      html: `
        <div style="text-align:left">
          <p>Hay un retazo que puede cubrir este corte:</p>
          <p><strong>${retazo.codigoRetazo}</strong> - ${retazo.tipoPolarizado} ${etiquetaDetalle(retazo)}</p>
          <p>Disponible: <strong>${formatMetros(retazo.largoDisponible)} m</strong></p>
          <p>Usar el retazo evita descontar material del rollo seleccionado.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Usar retazo",
      cancelButtonText: "Cortar del rollo",
      confirmButtonColor: "#16a34a",
    });

export const showCorteGrandeDialog =
  (metrosUtilizados) =>
    Swal.fire({
      icon: "warning",
      title: "Corte mayor a 3 metros",
      text: `Esta seguro de cortar ${formatMetros(
        metrosUtilizados
      )} m de este rollo?`,
      showCancelButton: true,
      confirmButtonText: "Si, Registrar corte",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2563eb",
    });

export const showRemanenteMinimoDialog =
  (remanente) =>
    Swal.fire({
      icon: "question",
      title: "Remanente minimo",
      text: `Despues del corte quedarian ${formatMetros(
        remanente
      )} m. Desea dar el rollo por agotado?`,
      showCancelButton: true,
      confirmButtonText: "Si, agotarlo",
      cancelButtonText: "Conservar remanente",
      confirmButtonColor: "#dc2626",
    });

export const showRolloInsuficienteDialog =
  ({
    rollo,
    metrosUtilizados,
  }) =>
    Swal.fire({
      icon: "warning",
      title: "El rollo no alcanza",
      html: `
        <div style="text-align:left">
          <p>Este corte necesita <strong>${formatMetros(metrosUtilizados)} m</strong>.</p>
          <p>El rollo <strong>${rollo.codigoRollo}</strong> solo tiene <strong>${formatMetros(rollo.largoDisponible)} m</strong>.</p>
          <p>Como no alcanza para este corte, puedes guardar ese ultimo pedazo como retazo o descartarlo y cerrar el rollo.</p>
        </div>
      `,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Enviar a retazos",
      denyButtonText: "Descartar y agotar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#16a34a",
      denyButtonColor: "#dc2626",
    });

export const showRolloCerradoDialog =
  ({
    enviarARetazos,
    largoCerrado,
    retazo,
  }) =>
    Swal.fire({
      icon: "success",
      title:
        enviarARetazos
          ? "Retazo guardado"
          : "Rollo agotado",
      text:
        enviarARetazos
          ? `Se guardo ${formatMetros(largoCerrado)} m como retazo ${retazo?.codigoRetazo || ""}.`
          : `Se descarto el sobrante de ${formatMetros(largoCerrado)} m y el rollo quedo agotado.`,
    });
