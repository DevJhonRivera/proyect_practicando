export function validarRemuneracion(data) {
  const modalidad = data?.modalidad;
  if (!["SOLO_COMISION", "SOLO_SALARIO", "SALARIO_COMISION"].includes(modalidad)) throw new Error("Seleccione una modalidad de pago valida");
  const salarioMensual = modalidad === "SOLO_COMISION" ? 0 : Number(data?.salarioMensual);
  if (!Number.isSafeInteger(salarioMensual) || salarioMensual < 0 || (modalidad !== "SOLO_COMISION" && salarioMensual <= 0)) throw new Error("Ingrese el salario mensual en pesos enteros, mayor que cero");
  return { modalidad, salarioMensual };
}
