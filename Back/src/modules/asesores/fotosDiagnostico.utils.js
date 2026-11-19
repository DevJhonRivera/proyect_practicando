import { createHash } from "node:crypto";
export const MIN_FOTOS = 4;
export const MAX_FOTOS = 10;
export const MAX_BYTES_FOTO = 180 * 1024;
export const validarCantidadFotos = (fotos) => {
  if (!Array.isArray(fotos) || fotos.length < MIN_FOTOS || fotos.length > MAX_FOTOS) throw new Error("El diagnóstico requiere mínimo 4 y máximo 10 fotos del vehículo");
};
export const validarImagen = (dataUrl) => {
  if (typeof dataUrl !== "string" || dataUrl.length > Math.ceil(MAX_BYTES_FOTO / 3) * 4 + 30 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)) throw new Error("Cada foto debe ser JPEG y pesar máximo 180 KB después de optimizarse");
  const contenido = Buffer.from(dataUrl.split(",")[1], "base64");
  if (contenido.length < 32 || contenido.length > MAX_BYTES_FOTO || contenido[0] !== 255 || contenido[1] !== 216 || contenido[2] !== 255 || contenido.at(-2) !== 255 || contenido.at(-1) !== 217) throw new Error("El archivo no contiene una fotografía JPEG válida");
  let frame = false;
  let scan = false;
  for (let pos = 2; pos < contenido.length - 4;) {
    if (contenido[pos++] !== 255) throw new Error("Estructura de fotografía JPEG no válida");
    while (contenido[pos] === 255) pos++;
    const marker = contenido[pos++];
    if (marker === 0xda) { scan = true; break; }
    const length = contenido.readUInt16BE(pos);
    if (length < 2 || pos + length > contenido.length) throw new Error("Fotografía JPEG incompleta");
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 8) throw new Error("Cabecera de fotografía incompleta");
      const alto = contenido.readUInt16BE(pos + 3); const ancho = contenido.readUInt16BE(pos + 5);
      if (Math.min(alto, ancho) < 160 || Math.max(alto, ancho) > 1600) throw new Error("La fotografía debe tener al menos 160 píxeles por lado y máximo 1600 en su lado mayor");
      frame = true;
    }
    pos += length;
  }
  if (!frame || !scan) throw new Error("El archivo no contiene una fotografía JPEG completa");
  return { dataUrl, sha256: createHash("sha256").update(contenido).digest("hex") };
};
export const validarFotosUnicas = (fotos) => {
  validarCantidadFotos(fotos);
  if (new Set(fotos.map((f) => f.sha256)).size !== fotos.length) throw new Error("Las fotos deben ser diferentes; retire las imágenes duplicadas");
};
