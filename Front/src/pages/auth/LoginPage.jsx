import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Package,
  Warehouse,
  AlertTriangle
} from "lucide-react";

import Swal from "sweetalert2";

import {
  login
} from "../../api/auth.api";
import { getMisPermisos } from "../../api/roles.api";
import {
  guardarPermisosUsuarioActual
} from "../../utils/permisos";

import {
  useNavigate
} from "react-router-dom";
import logo from "../../assets/polarizadosya.png";

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
            "Iniciando sesion...",
          text:
            "Validando credenciales",
          background:
            "#ffffff",
          color:
            "#0f172a",
          showConfirmButton:
            false,
          allowOutsideClick:
            false,
          customClass: {
            popup:
              "rounded-2xl border border-blue-100 shadow-2xl",
            title:
              "text-lg font-black text-slate-900",
            htmlContainer:
              "text-sm text-slate-500"
          },
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

        guardarPermisosUsuarioActual(
          res.data.user.rol,
          res.data.permisos || []
        );

        try {
          const permisosRes = await getMisPermisos();
          guardarPermisosUsuarioActual(
            permisosRes.data.rol,
            permisosRes.data.permisos || []
          );
        } catch {
          guardarPermisosUsuarioActual(
            res.data.user.rol,
            res.data.permisos || []
          );
        }

        Swal.fire({
          toast:
            true,
          position:
            "top-end",
          icon: "success",
          iconColor:
            "#16a34a",
          title:
            "Bienvenido",
          text:
            `${res.data.user.nombre || "Usuario"} ingreso correctamente`,
          timer:
            2600,
          timerProgressBar:
            true,
          showConfirmButton:
            false,
          background:
            "#ffffff",
          color:
            "#0f172a",
          customClass: {
            popup:
              "rounded-2xl border border-emerald-100 shadow-2xl",
            title:
              "text-base font-black text-slate-900",
            htmlContainer:
              "text-sm text-slate-500",
            timerProgressBar:
              "bg-emerald-500"
          }
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
      bg-slate-100
      text-slate-900"
    >

      {/* Panel izquierdo */}

      <div
        className="
        hidden
        lg:flex
        lg:w-1/2
        bg-[#07111f]
        text-white
        p-16
        flex-col
        justify-center"
      >

        <div
          className="
          bg-white
          rounded-3xl
          p-5
          shadow-2xl
          shadow-slate-950/30
          mb-10
          max-w-md"
        >
          <img
            src={logo}
            alt="Polarizados YA"
            className="
            w-full
            h-28
            object-contain"
          />
        </div>

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
          text-slate-300
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
              Gestion de Pedidos
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
              Alertas Automaticas
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
        p-5
        lg:bg-white"
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
          shadow-slate-200
          border
          border-slate-200
          p-6
          sm:p-10
          w-full
          max-w-md"
        >

          <div className="mb-7">
            <div
              className="
              mx-auto
              w-full
              max-w-xs
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-3
              shadow-sm"
            >
              <img
                src={logo}
                alt="Polarizados YA"
                className="
                h-20
                w-full
                object-contain"
              />
            </div>
          </div>

          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              <LockKeyhole size={14} />
              Acceso seguro
            </div>

            <h2
              className="
              text-4xl
              font-black
              text-slate-950"
            >
              Bienvenido
            </h2>

            <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-blue-600" />

            <p
              className="
              mt-4
              text-sm
              text-slate-500"
            >
              Ingresa tus credenciales para continuar.
            </p>
          </div>

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
                      "Correo invalido"
                  }
                }
              )}
              className="
              w-full
              border
              rounded-xl
              p-3
              bg-slate-50
              border-slate-200
              focus:ring-2
              focus:ring-blue-500
              focus:bg-white
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
              placeholder="Contrasena"
              {...register(
                "password",
                {
                  required:
                    "Contrasena requerida"
                }
              )}
              className="
              w-full
              border
              rounded-xl
              p-3
              pr-12
              bg-slate-50
              border-slate-200
              focus:ring-2
              focus:ring-blue-500
              focus:bg-white
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
            rounded-xl
            font-semibold
            transition
            shadow-lg
            shadow-blue-600/20
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
              No tienes cuenta?
            </span>

            <span
              className="
              text-blue-600
              font-semibold
              ml-2"
            >
              Solicitalo al administrador
            </span>

          </div>

          <p className="mt-5 text-center text-[11px] text-slate-300">
            Proyecto por Jhon R
          </p>

        </form>

      </div>

    </div>

  );
}

export default LoginPage;

