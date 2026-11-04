import api from "../api/axios";

export async function generarFacturaVenta(venta) {
  const ventana = window.open("", "_blank", "width=980,height=850");
  if (!ventana) throw new Error("El navegador bloqueó la ventana de impresión");

  try {
    ventana.opener = null;
    ventana.document.body.textContent = "Cargando comprobante…";
    const { data } = await api.get(`/ventas/${venta._id}/comprobante`);
    ventana.document.open();
    ventana.document.write(data.html);
    ventana.document.close();
    ventana.focus();
    ventana.document.getElementById("imprimir-comprobante")?.addEventListener("click", () => {
      ventana.focus();
      ventana.setTimeout(() => ventana.print(), 100);
    });
  } catch (error) {
    ventana.close();
    throw error;
  }
}
