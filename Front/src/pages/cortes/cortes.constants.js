export const servicioLabels = {
  VENTA: "Venta",
  GARANTIA: "Garantia",
  GARANTIA_INSTALADOR: "Garantia instalador",
  GARANTIA_EMPRESA: "Garantia empresa",
  GARANTIA_PROVEEDOR: "Garantia proveedor",
};

export const tipoCorteLabels = {
  PANORAMICO: "Panoramico",
  LUNETA: "Luneta",
  DELANTERAS: "Delanteras",
  TRASERAS: "Traseras",
  FIJOS: "Fijos",
  CUSTODIAS: "Custodias",
  SUNROOF: "Sunroof",
  U: "U (sin panorámico ni Sunroof)",
  COMPLETO: "Completo",
  PIEZAS_PPF: "Piezas PPF",
  OTROS: "Otros",
};

export const initialCorteForm = {
  asesoriaId: "",
  asesoriaLinea: "",
  partesServicio: [],
  origenMaterial: "ROLLO",
  rolloId: "",
  retazoId: "",
  marca: "",
  placa: "",
  modelo: "",
  tipoServicio: "VENTA",
  instalador: "",
  tipoCorte: "PANORAMICO",
  tipoCorteDetalle: "",
  piezasPpf: [],
  metrosUtilizados: "",
};
