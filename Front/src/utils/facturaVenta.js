import logo from "../assets/polarizadosya.png";

const escapar = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const fecha = (value) => new Date(value || Date.now()).toLocaleString("es-CO", {
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});

const descripcionInstalado = (item) => {
  const descripcion = String(item.descripcion || "").trim();
  if (["POLARIZADO", "PELICULA_SEGURIDAD", "PPF"].includes(item.tipoServicio)) {
    return descripcion.split(" - ")[0].trim();
  }
  return descripcion;
};

export function generarFacturaVenta(venta) {
  const ventana = window.open("", "_blank", "width=980,height=850");
  if (!ventana) throw new Error("El navegador bloqueó la ventana de impresión");

  const pagos = (venta.pagos || []).filter((item) => item.tipo === "PAGO");
  const metodos = pagos.length
    ? pagos.map((item) => `${item.metodoPago.replaceAll("_", " ")}${item.entidadPago ? ` - ${item.entidadPago}` : ""}`).join(" / ")
    : (venta.metodoPago || "POR DEFINIR").replaceAll("_", " ");
  const asesoria = venta.asesoriaId && typeof venta.asesoriaId === "object" ? venta.asesoriaId : {};
  const valorDato = (principal, respaldo, textoVacio) => principal || respaldo || textoVacio;
  const filas = (venta.items || []).map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${escapar(item.tipoServicio?.replaceAll("_", " "))}</strong><br><span>${escapar(descripcionInstalado(item))}</span></td>
      <td class="center">${Number(item.cantidad || 1)}</td>
      <td class="money">${cop.format(item.valorUnitario || 0)}</td>
      <td class="money">${cop.format(item.total || 0)}</td>
    </tr>`).join("");
  const referenciaVehiculo = [
    valorDato(venta.vehiculo?.marca, asesoria.vehiculo?.marca, ""),
    valorDato(venta.vehiculo?.referencia, asesoria.vehiculo?.modelo, ""),
    valorDato(venta.vehiculo?.anio || venta.vehiculo?.modelo, asesoria.vehiculo?.anio, ""),
  ]
    .filter(Boolean).join(" ");
  const valorPagado = Number(venta.valorPagado || (venta.estado === "PAGADA" && !venta.pagos?.length ? venta.total : 0));
  const valorRecibido = Math.max(valorPagado - Number(venta.valorDevuelto || 0), 0);
  const saldoPendiente = Number(venta.saldoPendiente ?? Math.max(Number(venta.total || 0) - valorRecibido, 0));
  const placaArchivo = String(valorDato(venta.vehiculo?.placa, asesoria.vehiculo?.placa, "SIN-PLACA"))
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "-");

  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Factura-${escapar(placaArchivo)}</title><style>
    @page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#172033;background:#fff;font-size:12px}.sheet{width:100%;min-height:270mm;border:1px solid #cbd5e1;padding:20px;position:relative}.header{display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:center;border-bottom:2px solid #172033;padding-bottom:16px}.brand{display:flex;align-items:center;gap:18px}.brand img{width:132px;height:72px;object-fit:contain}.brand h1{font-size:22px;margin:0}.brand p{margin:3px 0;color:#526075}.doc{border:1px solid #94a3b8;padding:16px;text-align:center}.doc h2{font-size:16px;margin:0 0 7px}.doc strong{font-size:18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.box{border:1px solid #cbd5e1;padding:12px}.box h3,.section-title{font-size:11px;text-transform:uppercase;margin:0 0 8px;color:#526075}.line{display:grid;grid-template-columns:105px 1fr;gap:8px;margin:5px 0}.line b{color:#334155}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#172033;color:#fff;padding:9px 7px;text-align:left;font-size:10px;text-transform:uppercase}td{border:1px solid #cbd5e1;padding:9px 7px;vertical-align:top}td span{color:#526075;font-size:10px}.center{text-align:center}.money{text-align:right;white-space:nowrap}.summary{display:grid;grid-template-columns:1fr 300px;gap:20px;margin-top:18px}.payments{border:1px solid #cbd5e1;padding:13px}.payments p{margin:5px 0}.totals{border:1px solid #94a3b8}.total-row{display:flex;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #cbd5e1}.total-row:last-child{border:0;background:#e8f2ff;font-size:15px;font-weight:800}.vehicle{margin-top:16px;border-left:4px solid #2563eb;background:#eff6ff;padding:12px}.footer{position:absolute;left:20px;right:20px;bottom:18px;border-top:1px solid #cbd5e1;padding-top:10px;text-align:center;color:#64748b;font-size:9px}.actions{position:fixed;right:20px;top:20px;z-index:9999;pointer-events:auto}.actions button{position:relative;z-index:10000;border:0;border-radius:8px;background:#2563eb;color:white;padding:12px 18px;font-weight:bold;cursor:pointer;pointer-events:auto;box-shadow:0 8px 22px rgba(15,23,42,.24)}@media print{.actions{display:none}.sheet{border:0;min-height:auto;padding:0}.footer{position:fixed;bottom:0}}
  </style></head><body><div class="actions"><button id="imprimir-comprobante" type="button">Imprimir / Guardar PDF</button></div><main class="sheet">
    <header class="header"><div class="brand"><img src="${escapar(new URL(logo, window.location.origin).href)}" alt="Polarizados Ya"><div><h1>POLARIZADOS YA</h1><p><strong>AUTOS 56 S.A.S.</strong> · NIT 901.610.282-6</p><p>CL 10 56 123 · Cali, Colombia</p><p>Tel. 300 785 7464 · polarizadosautola56@gmail.com</p></div></div><div class="doc"><h2>COMPROBANTE DE VENTA</h2><strong>${escapar(venta.codigoVenta)}</strong><p>Fecha: ${fecha(venta.fecha || venta.createdAt)}</p></div></header>
    <section class="grid"><div class="box"><h3>Datos del cliente</h3><div class="line"><b>Nombre</b><span>${escapar(valorDato(venta.cliente?.nombre, asesoria.cliente?.nombre, "No registrado"))}</span></div><div class="line"><b>Cédula / NIT</b><span>${escapar(valorDato(venta.cliente?.cedula, asesoria.cliente?.cedula, "No registrada"))}</span></div><div class="line"><b>Teléfono</b><span>${escapar(valorDato(venta.cliente?.telefono, asesoria.cliente?.telefono, "No registrado"))}</span></div><div class="line"><b>Correo</b><span>${escapar(valorDato(venta.cliente?.correo, asesoria.cliente?.correo, "No registrado"))}</span></div></div><div class="box"><h3>Datos del vehículo</h3><div class="line"><b>Vehículo</b><span>${escapar(referenciaVehiculo || "No registrado")}</span></div><div class="line"><b>Placa</b><span>${escapar(valorDato(venta.vehiculo?.placa, asesoria.vehiculo?.placa, "No registrada"))}</span></div><div class="line"><b>Color</b><span>${escapar(valorDato(venta.vehiculo?.color, asesoria.vehiculo?.color, "No registrado"))}</span></div><div class="line"><b>Estado venta</b><span>${escapar(venta.estado)}</span></div></div></section>
    <h3 class="section-title">Servicios instalados</h3><table><thead><tr><th style="width:42px">Ítem</th><th>Producto / servicio</th><th style="width:70px">Cantidad</th><th style="width:110px">Valor unitario</th><th style="width:110px">Total</th></tr></thead><tbody>${filas}</tbody></table>
    <section class="summary"><div class="payments"><h3 class="section-title">Información del pago</h3><p><strong>Forma de pago:</strong> ${escapar(metodos)}</p><p><strong>Valor recibido:</strong> ${cop.format(valorRecibido)}</p><p><strong>Saldo pendiente:</strong> ${cop.format(saldoPendiente)}</p>${venta.observaciones ? `<p><strong>Observaciones:</strong> ${escapar(venta.observaciones)}</p>` : ""}</div><div class="totals"><div class="total-row"><span>Subtotal</span><strong>${cop.format(venta.subtotal || 0)}</strong></div><div class="total-row"><span>Descuento</span><strong>- ${cop.format(venta.descuento || 0)}</strong></div><div class="total-row"><span>Total a pagar</span><strong>${cop.format(venta.total || 0)}</strong></div></div></section>
    <div class="vehicle"><strong>Trabajo realizado en:</strong> ${escapar(referenciaVehiculo)} · Placa ${escapar(valorDato(venta.vehiculo?.placa, asesoria.vehiculo?.placa, "No registrada"))}</div>
    <footer class="footer">Este documento es un comprobante interno de los servicios prestados y no reemplaza la factura electrónica de venta validada por la DIAN.</footer>
  </main></body></html>`);
  ventana.document.close();
  ventana.focus();

  const botonImprimir = ventana.document.getElementById("imprimir-comprobante");
  botonImprimir?.addEventListener("click", () => {
    ventana.focus();
    ventana.setTimeout(() => ventana.print(), 100);
  });
}
