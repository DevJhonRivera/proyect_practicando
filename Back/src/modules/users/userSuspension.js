export const suspensionEstaActiva = (user, ahora = new Date()) => {
  if (!user?.suspendido) {
    return false;
  }

  if (user.suspensionIndefinida) {
    return true;
  }

  return Boolean(
    user.suspendidoHasta &&
      new Date(user.suspendidoHasta).getTime() > ahora.getTime()
  );
};

export const suspensionEstaVencida = (user, ahora = new Date()) =>
  Boolean(user?.suspendido) &&
  !user.suspensionIndefinida &&
  (!user.suspendidoHasta ||
    new Date(user.suspendidoHasta).getTime() <= ahora.getTime());

export const limpiarSuspensionVencida = async (user) => {
  if (!suspensionEstaVencida(user)) {
    return false;
  }

  user.suspendido = false;
  user.suspensionIndefinida = false;
  user.suspendidoHasta = null;
  user.suspendidoPor = null;
  await user.save();
  return true;
};

export const mensajeSuspension = (user) => {
  if (user?.suspensionIndefinida) {
    return "Usuario suspendido. Contacte a un administrador.";
  }

  return `Usuario suspendido hasta ${new Date(
    user.suspendidoHasta
  ).toISOString()}.`;
};
