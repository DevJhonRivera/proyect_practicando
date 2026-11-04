export const optimizarFoto = async (file) => {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Selecciona fotografías JPG, PNG o WebP.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Cada archivo original debe pesar menos de 20 MB.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    if (Math.min(bitmap.width, bitmap.height) < 160) throw new Error("La foto es demasiado pequeña. Usa una imagen de al menos 160 píxeles por lado.");
    const canvas = document.createElement("canvas");
    let escala = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    for (let intento = 0; intento < 3; intento++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * escala)); canvas.height = Math.max(1, Math.round(bitmap.height * escala));
      const ctx = canvas.getContext("2d"); ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const calidad of [0.85, 0.7, 0.55, 0.4]) {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", calidad));
        if (blob && blob.size <= 180 * 1024) return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
      }
      escala *= 0.7;
    }
    throw new Error("No se pudo optimizar una foto. Selecciona otra imagen.");
  } finally { bitmap.close(); }
};
