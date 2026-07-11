import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Package,
  Warehouse,
  AlertTriangle
} from "lucide-react";

import Swal from "sweetalert2";

import {
  login
} from "../../api/auth.api";

import {
  useNavigate,
  Link
} from "react-router-dom";

function LoginPage() {

  const navigate = useNavigate();

  const [loading,
    setLoading] =
    useState(false);

  const [showPassword,
    setShowPassword] =
    useState(false);

  const {
    register,
    handleSubmit,
    formState: {
      errors
    }
  } = useForm();

  const onSubmit =
    async (data) => {

      try {

        setLoading(true);

        Swal.fire({
          title:
            "Iniciando sesión...",
          text:
            "Validando credenciales",
          allowOutsideClick:
            false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const res =
          await login(data);

        localStorage.setItem(
          "token",
          res.data.token
        );

        localStorage.setItem(
          "usuario",
          JSON.stringify(
            res.data.user
          )
        );

        Swal.fire({
          icon: "success",
          title:
            "Bienvenido",
          text:
            res.data.user.nombre
        });

        navigate(
          "/dashboard"
        );

      } catch (error) {

        Swal.fire({
          icon: "error",
          title:
            "Error",
          text:
            error.response?.data
              ?.message ||
            "Credenciales incorrectas"
        });

      } finally {

        setLoading(false);

      }

    };

  return (

    <div
      className="
      min-h-screen
      flex
      bg-slate-100"
    >

      {/* Panel izquierdo */}

      <div
        className="
        hidden
        lg:flex
        lg:w-1/2
        bg-gradient-to-br
        from-blue-700
        via-blue-800
        to-slate-900
        text-white
        p-16
        flex-col
        justify-center"
      >

        <h1
          className="
          text-5xl
          font-bold
          mb-4"
        >
          Polarizados YA
        </h1>

        <p
          className="
          text-xl
          text-slate-200
          mb-12"
        >
          Sistema de Inventario
          Inteligente
        </p>

        <div
          className="
          space-y-6"
        >

          <div
            className="
            flex
            items-center
            gap-4"
          >

            <Package />

            <span>
              Gestión de Pedidos
            </span>

          </div>

          <div
            className="
            flex
            items-center
            gap-4"
          >

            <Warehouse />

            <span>
              Control de Bodegas
            </span>

          </div>

          <div
            className="
            flex
            items-center
            gap-4"
          >

            <AlertTriangle />

            <span>
              Alertas Automáticas
            </span>

          </div>

          <div
            className="
            flex
            items-center
            gap-4"
          >

            <ShieldCheck />

            <span>
              Inventario Seguro
            </span>

          </div>

        </div>

      </div>

      {/* Login */}

      <div
        className="
        flex-1
        flex
        items-center
        justify-center
        p-5"
      >

        <form
          onSubmit={
            handleSubmit(
              onSubmit
            )
          }
          className="
          bg-white
          rounded-3xl
          shadow-2xl
          p-10
          w-full
          max-w-md"
        >

          <h2
            className="
            text-3xl
            font-bold
            text-slate-800"
          >
            Bienvenido
          </h2>

          <p
            className="
            text-slate-500
            mb-8"
          >
            Ingrese sus credenciales
          </p>

          {/* Correo */}

          <div className="mb-4">

            <input
              type="email"
              placeholder="Correo"
              {...register(
                "correo",
                {
                  required:
                    "Correo requerido",
                  pattern: {
                    value:
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message:
                      "Correo inválido"
                  }
                }
              )}
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
              <p
                className="
                text-red-500
                text-sm
                mt-1"
              >
                {
                  errors.correo
                    .message
                }
              </p>
            )}

          </div>

          {/* Password */}

          <div
            className="
            relative
            mb-5"
          >

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Contraseña"
              {...register(
                "password",
                {
                  required:
                    "Contraseña requerida"
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
                ? <EyeOff size={20}/>
                : <Eye size={20}/>}
            </button>

            {errors.password && (
              <p
                className="
                text-red-500
                text-sm
                mt-1"
              >
                {
                  errors.password
                    .message
                }
              </p>
            )}

          </div>

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
              ? "Ingresando..."
              : "Ingresar"}
          </button>

          <div
            className="
            text-center
            mt-6"
          >

            <span
              className="
              text-slate-500"
            >
              ¿No tienes cuenta?
            </span>

            <Link
              to="/register"
              className="
              text-blue-600
              font-semibold
              ml-2"
            >
              Registrarse
            </Link>

          </div>

        </form>

      </div>

    </div>

  );
}

export default LoginPage;
