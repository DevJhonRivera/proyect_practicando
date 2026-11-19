import test from "node:test";
import assert from "node:assert/strict";
import { datosDocumento, huellaDatos, coincideHuellaDocumento, firmaVigente } from "../src/modules/asesores/autorizaciones.utils.js";
import { crearCorreoDocumento } from "../src/modules/asesores/correoDocumento.utils.js";

const orden = () => ({ codigo: "GAR-PRUEBA", cliente: { nombre: "Cliente Prueba" }, vehiculo: { placa: "ABC123" },
  comercial: { totalAcordado: 0 }, garantia: { esGarantia: true, motivo: "Revisar burbujas en vidrio lateral", ordenOrigenId: "507f1f77bcf86cd799439011",
    codigoOrdenOrigen: "ASE-ORIGINAL", fechaOrdenOrigen: new Date("2026-10-01T15:00:00Z"), estado: "PENDIENTE", responsable: "POR_DEFINIR", costoMaterial: 80000, instalador: "INTERNO" } });

test("warranty snapshots include the complaint and original service without internal costs or responsibility decisions", () => {
  const o = orden();
  for (const tipo of ["COTIZACION", "DIAGNOSTICO", "ENTREGA"]) {
    const datos = datosDocumento(o, tipo);
    assert.equal(datos.garantia.motivo, o.garantia.motivo);
    assert.equal(datos.garantia.codigoOrdenOrigen, "ASE-ORIGINAL");
    assert.equal(datos.garantia.fechaOrdenOrigen, "2026-10-01T15:00:00.000Z");
    for (const key of ["costoMaterial", "instalador", "estado", "responsable"]) assert.equal(datos.garantia[key], undefined);
  }
  const huella = huellaDatos(o, "COTIZACION");
  o.garantia.estado = "APROBADA"; o.garantia.responsable = "EMPRESA";
  assert.equal(huellaDatos(o, "COTIZACION"), huella);
  o.garantia.motivo = "Otro reclamo";
  assert.notEqual(huellaDatos(o, "COTIZACION"), huella);
});

test("new warranty signatures protect the original service reference and preserve issued legacy documents", () => {
  const o = orden(); const tipo = "COTIZACION";
  const doc = { tipo, estado: "FIRMADO", huellaDatos: huellaDatos(o, tipo), contenido: JSON.stringify({ versionFormato: 2, datos: datosDocumento(o, tipo) }) };
  o.autorizaciones = { documentos: [doc] };
  assert.ok(firmaVigente(o, tipo));
  o.garantia.codigoOrdenOrigen = "OTRA-ORDEN";
  assert.equal(firmaVigente(o, tipo), undefined);
  const legacy = { tipo, huellaDatos: huellaDatos(o, tipo, false), contenido: JSON.stringify({ datos: datosDocumento(o, tipo, false) }) };
  assert.ok(coincideHuellaDocumento(o, legacy));
  assert.equal(JSON.parse(legacy.contenido).datos.garantia, undefined);
  const normal = { ...o, garantia: { esGarantia: false } };
  const nuevo = { tipo, huellaDatos: huellaDatos(normal, tipo), contenido: JSON.stringify({ versionFormato: 2, datos: datosDocumento(normal, tipo) }) };
  assert.equal(coincideHuellaDocumento(o, nuevo), false);
});

test("warranty emails identify each stage, original service and complaint, and escape user content", () => {
  const o = orden(); o.garantia.motivo = '<script>alert("x")</script>';
  for (const tipo of ["COTIZACION", "DIAGNOSTICO", "ENTREGA"]) {
    const correo = crearCorreoDocumento({ tipo, codigo: o.codigo, url: "https://example.com/firmar#demo", contenido: { datos: datosDocumento(o, tipo), condiciones: {} } });
    assert.match(correo.subject, /garantía/);
    assert.match(correo.html, /ASE-ORIGINAL/);
    assert.match(correo.text, /Motivo del reclamo/);
    assert.ok(!correo.html.includes("<script>"));
    assert.ok(!correo.html.includes("80000"));
    if (tipo === "COTIZACION") {
      assert.match(correo.text, /Administración evaluará/);
      assert.match(correo.text, /no autoriza cobros adicionales/);
      assert.ok(!correo.subject.includes("Cotización"));
    }
  }
});

test("ordinary services retain their existing commercial document", () => {
  const o = orden(); o.garantia.esGarantia = false;
  const datos = datosDocumento(o, "COTIZACION");
  assert.equal(datos.garantia, undefined);
  const correo = crearCorreoDocumento({ tipo: "COTIZACION", codigo: o.codigo, url: "https://example.com", contenido: { datos } });
  assert.match(correo.subject, /Cotización para aprobación/);
  assert.ok(!correo.text.includes("Motivo del reclamo"));
});
