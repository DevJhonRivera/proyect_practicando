import { Buffer } from "node:buffer";

const moneda = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });
const literal = (value) => String(value ?? "").replace(/[^\x20-\x7e\xa0-\xff]/g, " ").replace(/[\\()]/g, "\\$&");

export function generarComprobantePdf(venta) {
  const recibido = Math.max(Number(venta.valorPagado ?? venta.total) - Number(venta.valorDevuelto || 0), 0);
  const pagos = (venta.pagos || []).filter((p) => p.tipo === "PAGO");
  const metodos = [...new Set(pagos.map((p) => p.metodoPago || venta.metodoPago))].filter(Boolean);
  const filas = [
    `Fecha: ${fecha.format(new Date(venta.fecha || venta.createdAt))}`,
    `Cliente: ${venta.cliente.nombre} | Documento: ${venta.cliente.cedula || ""}`,
    `Correo: ${venta.cliente.correo}`,
    `Vehículo: ${venta.vehiculo.placa} | ${venta.vehiculo.marca || ""} ${venta.vehiculo.referencia || venta.vehiculo.modelo || ""}`,
    "", "SERVICIOS Y PRODUCTOS",
    ...(venta.items || []).map((item, index) =>
      `${index + 1}. ${item.tipoServicio?.replaceAll("_", " ") || ""} ${item.descripcion || ""} | ${item.cantidad || 1} x ${moneda.format(item.valorUnitario || 0)} = ${moneda.format(item.total || 0)}`),
    "", `Subtotal: ${moneda.format(venta.subtotal || 0)}`,
    `Descuento: ${moneda.format(venta.descuento || 0)}`,
    `Total: ${moneda.format(venta.total || 0)}`,
    `Forma de pago: ${(metodos.join(" / ") || venta.metodoPago || "").replaceAll("_", " ")}`,
    `Valor recibido: ${moneda.format(recibido)}`, "Saldo pendiente: $0",
  ];
  const lineas = filas.flatMap((linea) => linea.match(/.{1,88}(?:\s|$)|.{1,88}/gu) || [""]);
  const paginas = [];
  for (let i = 0; i < lineas.length; i += 43) paginas.push(lineas.slice(i, i + 43));

  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${paginas.length} /Kids [${paginas.map((_, i) => `${4 + i * 2} 0 R`).join(" ")}] >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];
  paginas.forEach((pagina, i) => {
    const contenido = [
      "0.06 0.12 0.23 rg 38 731 519 75 re f",
      "1 1 1 rg BT /F1 19 Tf 52 780 Td (POLARIZADOS YA) Tj ET",
      `BT /F1 12 Tf 52 754 Td (COMPROBANTE DE VENTA - ${literal(venta.codigoVenta)}) Tj ET`,
      "0.1 0.15 0.23 rg BT /F1 10 Tf 52 713 Td (AUTOS 56 S.A.S. | NIT 901.610.282-6 | Cali, Colombia) Tj ET",
      ...pagina.map((linea, j) => `BT /F1 10 Tf 52 ${690 - j * 14} Td (${literal(linea.trim())}) Tj ET`),
      `BT /F1 9 Tf 52 48 Td (Página ${i + 1} de ${paginas.length}) Tj ET`,
    ].join("\n");
    objetos.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`,
      `<< /Length ${Buffer.byteLength(contenido, "latin1")} >>\nstream\n${contenido}\nendstream`,
    );
  });
  let pdf = "%PDF-1.4\n";
  const offsets = objetos.map((objeto, i) => {
    const offset = Buffer.byteLength(pdf, "latin1");
    pdf += `${i + 1} 0 obj\n${objeto}\nendobj\n`;
    return offset;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}
