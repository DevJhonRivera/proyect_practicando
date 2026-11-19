const completa = (m) => Number(m?.anchoCm) > 0 && Number(m?.largoCm) > 0;
const normalizar = (s) => String(s || "").trim().toUpperCase();

export function precargarMedidasPpf(linea, orden, catalogo = [], actual) {
  const indice = Number(linea.linea.match(/^PPF (\d+)$/)?.[1]) - 1;
  const servicio = orden.ppf?.[indice];
  return (linea.partes || []).map((pieza) => {
    const coordinacion = actual?.medidasPiezas?.find((m) => m.pieza === pieza);
    const asesor = servicio?.medidasPiezas?.find((m) => m.pieza === pieza && completa(m));
    const coincidencias = catalogo.filter((m) => normalizar(m.pieza) === normalizar(pieza)
      && normalizar(m.marca) === normalizar(orden.vehiculo?.marca)
      && normalizar(m.modelo) === normalizar(orden.vehiculo?.modelo)
      && (m.tipoVehiculo || "CARRO") === (orden.vehiculo?.tipo || "CARRO")
      && m.activa !== false && completa(m)
      && (!m.anio || String(m.anio) === String(orden.vehiculo?.anio || ""))
      && (!asesor?.ubicacion || m.ubicacion === asesor.ubicacion)
      && (servicio?.aplicacion !== "INTERIOR" || m.ubicacion === "INTERIOR")
      && (servicio?.aplicacion !== "EXTERIOR" || m.ubicacion === "EXTERIOR"));
    const exactas = coincidencias.filter((m) => String(m.anio || "") === String(orden.vehiculo?.anio || ""));
    const candidatas = exactas.length ? exactas : coincidencias;
    const catalogada = candidatas.length === 1 ? candidatas[0] : null;
    const medida = coordinacion || asesor || catalogada;
    return { pieza, anchoCm: medida?.anchoCm ?? "", largoCm: medida?.largoCm ?? "", cantidad: medida?.cantidad || 1,
      origenMedida: coordinacion ? "Coordinación" : asesor ? "Asesor · medidas de esta orden" : catalogada ? "Piezas PPF · catálogo del vehículo" : "Pendiente de medida" };
  });
}
