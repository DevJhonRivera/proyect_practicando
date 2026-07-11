export const notFound =(req,res,next)=>{
    const error = new Error(
`Ruta no encontrada ${req.originalUrl}`
    );
    res.status(404);
    next(error)
};

export const errorHandler = (err,req,res,next) => {
  let statusCode =
    res.statusCode === 200
      ? 500
      : res.statusCode;

  let message = err.message;

  // Error de MongoDB ObjectId inválido
  if (err.name === "CastError") {
    statusCode = 404;
    message = "Recurso no encontrado";
  }

  // Error de clave duplicada
  if (err.code === 11000) {
    statusCode = 400;
    message =
      "Ya existe un registro con esos datos";
  }

  // Error de validación de Mongoose
  if (err.name === "ValidationError") {
    statusCode = 400;

    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack:
      process.env.NODE_ENV ===
      "production"
        ? null
        : err.stack,
  });
};
