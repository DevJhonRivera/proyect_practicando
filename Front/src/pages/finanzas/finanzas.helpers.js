export const formatoCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const formatoNumero = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 2,
});

export const limpiarNumeroEntrada = (value) => {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  const limpio = text.replace(/[^\d,.-]/g, "");

  if (limpio.includes(",")) {
    const partesComa = limpio.split(",");
    const decimal = partesComa.pop();

    return `${partesComa.join("").replace(/\./g, "")}.${decimal}`;
  }

  return limpio.replace(/\./g, "");
};

export const numeroEntrada = (value) => {
  const limpio = limpiarNumeroEntrada(value);
  const numero = Number(limpio);

  return Number.isFinite(numero) ? numero : 0;
};

export const formatearNumeroEntrada = (
  value,
  { decimales = 2 } = {}
) => {
  const original = String(value ?? "");
  const limpio = limpiarNumeroEntrada(original);

  if (!limpio) {
    return "";
  }

  const negativo = limpio.startsWith("-");
  const sinSigno = negativo ? limpio.slice(1) : limpio;
  const [enteroRaw, decimalRaw = ""] = sinSigno.split(".");
  const entero = enteroRaw.replace(/\D/g, "");
  const enteroFormateado = Number(entero || 0).toLocaleString(
    "es-CO"
  );
  const mantieneDecimal =
    decimales > 0 &&
    (limpio.includes(".") || /[,.]$/.test(original));
  const decimal = decimalRaw
    .replace(/\D/g, "")
    .slice(0, decimales);

  return `${negativo ? "-" : ""}${enteroFormateado}${
    mantieneDecimal ? `,${decimal}` : ""
  }`;
};

export const formularioInicial = {
  moneda: "COP",
  trm: "1",
  trmFlete: "1",
  flete: "",
  otrosCostos: "",
  aplicaIva: true,
  ivaIncluido: false,
  porcentajeIva: "19",
  metodoProrrateoFlete: "VALOR",
  estado: "COSTEADO",
  observaciones: "",
  detalles: [],
};

export const obtenerDetallesPedido = (pedido) =>
  pedido?.detalles || [];

export const crearDetallesFormulario = (pedido, costeo) => {
  const detallesCosteo = costeo?.detalles || [];

  return obtenerDetallesPedido(pedido).map((detalle) => {
    const guardado =
      detallesCosteo.find(
        (item) =>
          String(item.detallePedidoId) ===
          String(detalle._id)
      ) || {};

    return {
      detallePedidoId: detalle._id,
      tipoPolarizado: detalle.tipoPolarizado,
      porcentaje: detalle.porcentaje,
      unidadMedida:
        detalle.unidadMedida || "PORCENTAJE",
      ancho: detalle.ancho,
      cantidadRollos: detalle.cantidadRollos,
      valorUnitario:
        guardado.valorUnitario === undefined
          ? ""
          : formatearNumeroEntrada(guardado.valorUnitario),
    };
  });
};

export const crearFormularioDesdeCosteo = (pedido, costeo) => ({
  moneda: costeo?.moneda || "COP",
  trm: formatearNumeroEntrada(costeo?.trm || 1),
  trmFlete: formatearNumeroEntrada(
    costeo?.trmFlete || costeo?.trm || 1
  ),
  flete:
    costeo?.flete === undefined
      ? ""
      : formatearNumeroEntrada(costeo.flete),
  otrosCostos:
    costeo?.otrosCostos === undefined
      ? ""
      : formatearNumeroEntrada(costeo.otrosCostos),
  aplicaIva:
    costeo?.aplicaIva === undefined
      ? true
      : Boolean(costeo.aplicaIva),
  ivaIncluido: Boolean(costeo?.ivaIncluido),
  porcentajeIva: String(costeo?.porcentajeIva ?? 19),
  metodoProrrateoFlete:
    costeo?.metodoProrrateoFlete || "VALOR",
  estado: costeo?.estado || "COSTEADO",
  observaciones: costeo?.observaciones || "",
  detalles: crearDetallesFormulario(pedido, costeo),
});

export const crearPayloadCosteo = (pedidoId, form) => ({
  pedidoId,
  moneda: form.moneda,
  trm: numeroEntrada(form.trm || 1),
  trmFlete: numeroEntrada(form.trmFlete || form.trm || 1),
  flete: numeroEntrada(form.flete),
  otrosCostos: numeroEntrada(form.otrosCostos),
  aplicaIva: form.aplicaIva,
  ivaIncluido: form.ivaIncluido,
  porcentajeIva: numeroEntrada(form.porcentajeIva),
  metodoProrrateoFlete: form.metodoProrrateoFlete,
  estado: form.estado,
  observaciones: form.observaciones,
  detalles: form.detalles.map((detalle) => ({
    detallePedidoId: detalle.detallePedidoId,
    valorUnitario: numeroEntrada(detalle.valorUnitario),
  })),
});

export const obtenerTotalRollosPedido = (detalles) =>
  detalles.reduce(
    (acc, detalle) =>
      acc + Number(detalle.cantidadRollos || 0),
    0
  );
