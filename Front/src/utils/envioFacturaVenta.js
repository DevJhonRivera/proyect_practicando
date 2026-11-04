import Swal from "sweetalert2";
import api from "../api/axios";

export async function preguntarEnvioFactura(venta) {
  if (venta?.estado !== "PAGADA") return;
  const guardar = async (correo, enviar) => {
    try {
      const respuesta = await api.post(`/ventas/${venta._id}/comprobante-correo`, { correo, enviar });
      return respuesta.data;
    } catch (error) {
      Swal.showValidationMessage(error.response?.data?.message || "No se pudo completar la operación. Intente nuevamente.");
      return false;
    }
  };
  const resultado = await Swal.fire({
    title: "¿Enviar el comprobante al cliente?",
    text: "Confirme el correo registrado o corríjalo. Puede guardar el correo sin enviar el comprobante.",
    input: "email",
    inputLabel: "Correo del cliente",
    inputValue: venta.cliente?.correo || venta.asesoriaId?.cliente?.correo || "",
    inputAttributes: { maxlength: "254", autocomplete: "email" },
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: "Guardar y enviar PDF",
    denyButtonText: "Solo guardar correo",
    cancelButtonText: "Ahora no",
    showLoaderOnConfirm: true,
    showLoaderOnDeny: true,
    allowOutsideClick: () => !Swal.isLoading(),
    allowEscapeKey: () => !Swal.isLoading(),
    preConfirm: (correo) => guardar(correo, true),
    preDeny: (correo) => guardar(correo, false),
    returnInputValueOnDeny: true,
  });
  if (resultado.isConfirmed || resultado.isDenied) {
    await Swal.fire({
      icon: "success",
      title: resultado.value?.yaEnviado ? "El comprobante ya fue enviado" : resultado.value?.enviado ? "Comprobante enviado" : "Correo guardado",
      text: resultado.value?.correo,
    });
  }
}
