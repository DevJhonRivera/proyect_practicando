import Swal from "sweetalert2";
import api from "../api/axios";

export async function preguntarEnvioFactura(venta) {
  if (venta?.estado !== "PAGADA") return;
  const enviarComprobante = async (correo) => {
    try {
      const respuesta = await api.post(`/ventas/${venta._id}/comprobante-correo`, { correo, enviar: true });
      return respuesta.data;
    } catch (error) {
      Swal.showValidationMessage(error.response?.data?.message || "No se pudo completar la operación. Intente nuevamente.");
      return false;
    }
  };
  const resultado = await Swal.fire({
    title: "¿Enviar el comprobante al cliente?",
    text: "Confirma o corrige el correo del cliente para enviarle el enlace de su comprobante.",
    input: "email",
    inputLabel: "Correo del cliente",
    inputValue: venta.cliente?.correo || venta.asesoriaId?.cliente?.correo || "",
    inputAttributes: { maxlength: "254", autocomplete: "email" },
    showCloseButton: true,
    closeButtonAriaLabel: "Cerrar sin enviar",
    confirmButtonText: "Enviar comprobante",
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    allowEscapeKey: () => !Swal.isLoading(),
    preConfirm: enviarComprobante,
  });
  if (resultado.isConfirmed) {
    await Swal.fire({
      icon: "success",
      title: resultado.value?.yaEnviado ? "El comprobante ya fue enviado" : "Comprobante enviado",
      text: resultado.value?.correo,
    });
  }
}
