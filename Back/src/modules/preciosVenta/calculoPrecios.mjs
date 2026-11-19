export function referenciasTarifas(tarifas = []) {
  return tarifas.map(({ codigo, nivel, revision, cantidad = 1, baseCodigo, baseNivel, baseRevision }) => ({
    codigo, nivel, revision, cantidad, baseCodigo, baseNivel, baseRevision,
  }));
}

export function calcularPiezasPpf(piezas, lista) {
  if (!Array.isArray(piezas) || !piezas.length || new Set(piezas).size !== piezas.length) throw new Error("Seleccione piezas PPF sin duplicados.");
  const selecciones = piezas.map((pieza) => {
    const fila = lista.find((f) => f.hoja === "PPF PIEZAS PEQUEÑAS" && f.descripcion === pieza && f.activo && !f.requiereRevision);
    if (!fila || fila.modalidad !== "FIJO" || !(fila.precios[0] > 0)) throw new Error(`Precio pendiente de configurar para ${pieza}.`);
    return { codigo: fila.codigo, nivel: 0, revision: fila.revision, cantidad: 1 };
  });
  return calcularTarifasVenta(selecciones, lista);
}

export function calcularTarifasVenta(selecciones, lista) {
  if (!Array.isArray(selecciones) || !selecciones.length || selecciones.length > 50) {
    throw new Error("Seleccione la tarifa de venta del servicio.");
  }
  const porCodigo = new Map(lista.map((fila) => [fila.codigo, fila]));
  const obtener = (codigo, nivel, revision) => {
    const fila = porCodigo.get(codigo);
    if (!fila?.activo || fila.requiereRevision) throw new Error("La tarifa seleccionada no está vigente. Consulte la lista de precios.");
    if (!Number.isInteger(nivel) || nivel < 0 || nivel >= fila.precios.length || fila.precios[nivel] == null) {
      throw new Error("Seleccione un nivel de precio disponible.");
    }
    if (revision !== fila.revision) throw new Error("Administración actualizó una tarifa. Vuelva a seleccionarla para usar el precio vigente.");
    return fila;
  };
  const tarifas = selecciones.map((seleccion) => {
    const { codigo, nivel, revision, cantidad = 1, baseCodigo, baseNivel, baseRevision } = seleccion;
    const fila = obtener(codigo, nivel, revision);
    if (!Number.isSafeInteger(cantidad) || cantidad < 1 || cantidad > 1000) throw new Error("Revise la cantidad de piezas de la tarifa.");
    const precio = fila.precios[nivel];
    let base;
    let valorUnitario = precio;
    if (fila.modalidad === "PORCENTAJE") {
      base = obtener(baseCodigo, baseNivel, baseRevision);
      if (base.modalidad !== "FIJO") throw new Error("La base del porcentaje debe ser un precio completo en pesos.");
      valorUnitario = Math.round(base.precios[baseNivel] * precio / 100);
    }
    const total = valorUnitario * cantidad;
    if (!Number.isSafeInteger(total) || total < 0) throw new Error("El importe calculado no es válido.");
    return { codigo, nivel, revision, cantidad,
      descripcion: `${fila.grupo} · ${fila.descripcion}`, condicion: fila.condiciones[nivel] || "", valorUnitario, total,
      ...(base ? { baseCodigo, baseNivel, baseRevision, baseDescripcion: `${base.grupo} · ${base.descripcion}`, baseValor: base.precios[baseNivel], porcentaje: precio } : {}),
    };
  });
  const total = tarifas.reduce((suma, tarifa) => suma + tarifa.total, 0);
  if (!Number.isSafeInteger(total)) throw new Error("El total del servicio supera el valor permitido.");
  return { total, tarifas };
}
