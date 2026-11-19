export function dividirGuardafango(item, pieza) {
  const original = (item.medidasPiezas || []).find((m) => m.pieza === pieza);
  if (!original || !/GUARDAFANGO/i.test(pieza) || /SECCION ANCHA|TIRA DEL PARAL/.test(pieza)) return item;
  const nombres = [`${pieza} - SECCION ANCHA`, `${pieza} - TIRA DEL PARAL`];
  if (nombres.some((nombre) => item.piezas.includes(nombre))) return item;
  const secciones = nombres.map((nombre) => ({ ...original, pieza: nombre, anchoCm: "", largoCm: "" }));
  return { ...item,
    piezas: item.piezas.flatMap((nombre) => nombre === pieza ? nombres : [nombre]),
    medidasPiezas: item.medidasPiezas.flatMap((m) => m.pieza === pieza ? secciones : [m]),
  };
}

// Reparte el precio ya redondeado entre las piezas: los subtotales suman el total mostrado.
export function subtotalesMedidasPpf(item) {
  const medidas = item.medidasPiezas || [];
  const areas = medidas.map((m) => Math.max(0, Number(m.anchoCm || 0)) * Math.max(0, Number(m.largoCm || 0)) / 10000 * Math.max(1, Number(m.cantidad || 1)));
  const area = areas.reduce((suma, valor) => suma + valor, 0);
  const total = Math.max(0, Math.round(Number(item.valor || 0)));
  const valores = areas.map((valor) => area > 0 ? Math.floor(total * valor / area) : 0);
  const ultimo = areas.findLastIndex((valor) => valor > 0);
  if (ultimo >= 0) valores[ultimo] += total - valores.reduce((suma, valor) => suma + valor, 0);
  return medidas.map((m, i) => ({ pieza: m.pieza, areaM2: areas[i], subtotal: valores[i] }));
}
