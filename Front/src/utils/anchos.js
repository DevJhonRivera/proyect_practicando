export const anchosPulgadas = [
  {
    value: 0.3,
    label: '12"',
  },
  {
    value: 0.46,
    label: '18"',
  },
  {
    value: 0.6,
    label: '24"',
  },
  {
    value: 0.92,
    label: '36"',
  },
  {
    value: 1.02,
    label: '40"',
  },
  {
    value: 1.52,
    label: '60"',
  },
];

export const normalizarAncho = (value) =>
  Number(Number(value || 0).toFixed(2));

export const anchoLabel = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Sin medida";
  }

  const ancho = normalizarAncho(value);

  if (ancho <= 0) {
    return "Sin medida";
  }

  const option = anchosPulgadas.find(
    (item) => normalizarAncho(item.value) === ancho
  );

  return option ? option.label : `${ancho}"`;
};

export const anchoValue = (value) =>
  String(normalizarAncho(value));
