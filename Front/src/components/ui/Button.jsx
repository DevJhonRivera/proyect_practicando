function Button({
  children,
  loading = false,
  loadingText = "Cargando...",
  className = "",
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`
      w-full
      bg-blue-600
      text-white
      p-3
      rounded-lg
      disabled:opacity-50
      ${className}`}
      {...props}
    >
      {loading
        ? loadingText
        : children}
    </button>
  );
}

export default Button;
