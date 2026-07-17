import { useState } from "react";
import { useForm } from "react-hook-form";
import { registerUser } from "../../api/auth.api";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { obtenerUsuarioActual } from "../../utils/permisos";

const rolesUsuario = [
  ["SUPERUSUARIO", "Superusuario"],
  ["ADMIN", "Administrador"],
  ["INVENTARIO", "Inventario"],
  ["VENTAS", "Ventas"],
];

function RegisterPage() {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm();

  const navigate = useNavigate();
  const usuarioActual = obtenerUsuarioActual();
  const esSuperusuario = usuarioActual?.rol === "SUPERUSUARIO";
  const esAdmin = ["SUPERUSUARIO", "ADMIN"].includes(
    usuarioActual?.rol
  );
  const rolesDisponibles = esSuperusuario
    ? rolesUsuario
    : rolesUsuario.filter(([value]) => value !== "SUPERUSUARIO");

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword,
    setShowConfirmPassword] =
    useState(false);

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      Swal.fire({
        title: "Creando usuario...",
        text: "Espere un momento",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const payload = {
        nombre: data.nombre,
        correo: data.correo,
        password: data.password,
        ...(esAdmin
          ? {
              rol: data.rol,
            }
          : {}),
      };

      await registerUser(payload);

      Swal.fire({
        icon: "success",
        title: "Usuario creado",
        text: "Ahora puedes iniciar sesión",
      });

      navigate("/login");

    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.message ||
          "No fue posible registrar el usuario",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
      min-h-screen
      bg-gradient-to-br
      from-slate-900
      via-slate-800
      to-blue-900
      flex
      items-center
      justify-center
      p-4"
    >
      <div
        className="
        bg-white
        w-full
        max-w-md
        rounded-2xl
        shadow-2xl
        p-8"
      >
        <div className="text-center mb-8">
          <div
            className="
            mx-auto
            w-16
            h-16
            rounded-full
            bg-blue-600
            flex
            items-center
            justify-center
            text-white
            mb-4"
          >
            <UserPlus size={30} />
          </div>

          <h1
            className="
            text-3xl
            font-bold
            text-slate-800"
          >
            Crear Usuario
          </h1>

          <p className="text-slate-500 mt-2">
            Sistema Polarizados YA
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >

          {/* Nombre */}

          <div>
            <input
              type="text"
              placeholder="Nombre completo"
              {...register("nombre", {
                required:
                  "El nombre es obligatorio",
              })}
              className="
              w-full
              border
              rounded-lg
              p-3
              focus:ring-2
              focus:ring-blue-500
              outline-none"
            />

            {errors.nombre && (
              <p className="text-red-500 text-sm mt-1">
                {errors.nombre.message}
              </p>
            )}
          </div>

          {/* Correo */}

          <div>
            <input
              type="email"
              placeholder="Correo electrónico"
              {...register("correo", {
                required:
                  "El correo es obligatorio",
                pattern: {
                  value:
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message:
                    "Correo inválido",
                },
              })}
              className="
              w-full
              border
              rounded-lg
              p-3
              focus:ring-2
              focus:ring-blue-500
              outline-none"
            />

            {errors.correo && (
              <p className="text-red-500 text-sm mt-1">
                {errors.correo.message}
              </p>
            )}
          </div>

          {esAdmin && (
            <div>
              <select
                {...register("rol", {
                  required:
                    "Seleccione el rol del usuario",
                })}
                defaultValue="INVENTARIO"
                className="
                w-full
                border
                rounded-lg
                p-3
                focus:ring-2
                focus:ring-blue-500
                outline-none"
              >
                {rolesDisponibles.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {errors.rol && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.rol.message}
                </p>
              )}
            </div>
          )}

          {/* Password */}

          <div className="relative">

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Contraseña"
              {...register("password", {
                required:
                  "La contraseña es obligatoria",
                minLength: {
                  value: 6,
                  message:
                    "Mínimo 6 caracteres",
                },
              })}
              className="
              w-full
              border
              rounded-lg
              p-3
              pr-12
              focus:ring-2
              focus:ring-blue-500
              outline-none"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
              className="
              absolute
              right-3
              top-3"
            >
              {showPassword
                ? <EyeOff size={20} />
                : <Eye size={20} />}
            </button>

            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}

          <div className="relative">

            <input
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              placeholder="Confirmar contraseña"
              {...register(
                "confirmPassword",
                {
                  required:
                    "Confirme la contraseña",
                  validate:
                    (value) =>
                      value ===
                        getValues("password") ||
                      "Las contraseñas no coinciden",
                }
              )}
              className="
              w-full
              border
              rounded-lg
              p-3
              pr-12
              focus:ring-2
              focus:ring-blue-500
              outline-none"
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
              className="
              absolute
              right-3
              top-3"
            >
              {showConfirmPassword
                ? <EyeOff size={20} />
                : <Eye size={20} />}
            </button>

            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                {
                  errors.confirmPassword
                    .message
                }
              </p>
            )}
          </div>

          {/* Botón */}

          <button
            type="submit"
            disabled={loading}
            className="
            w-full
            bg-blue-600
            hover:bg-blue-700
            text-white
            p-3
            rounded-lg
            font-semibold
            transition
            disabled:opacity-50"
          >
            {loading
              ? "Creando usuario..."
              : "Registrarse"}
          </button>

          <div className="text-center mt-4">
            <span className="text-slate-500">
              ¿Ya tienes cuenta?
            </span>

            <Link
              to="/login"
              className="
              text-blue-600
              font-semibold
              ml-2"
            >
              Iniciar sesión
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
