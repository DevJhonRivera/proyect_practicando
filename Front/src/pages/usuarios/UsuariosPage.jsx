import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import {
  createUsuario,
  deleteUsuario,
  getUsuarios,
  updateUsuarioRol,
} from "../../api/usuarios.api";
import {
  getPermisosRoles,
  updatePermisosRol,
} from "../../api/roles.api";
import { obtenerUsuarioActual } from "../../utils/permisos";

const rolesUsuario = [
  ["SUPERUSUARIO", "Superusuario"],
  ["ADMIN", "Administrador"],
  ["INVENTARIO", "Inventario"],
  ["VENTAS", "Ventas"],
];

const formInicial = {
  nombre: "",
  correo: "",
  password: "",
  rol: "INVENTARIO",
};

const modulosConfigurables = [
  {
    key: "dashboard",
    label: "Inicio",
    permisos: ["dashboard:read"],
    fijo: true,
  },
  {
    key: "usuarios",
    label: "Usuarios y perfiles",
    permisos: ["usuarios:*"],
    roles: ["ADMIN"],
  },
  {
    key: "pedidos",
    label: "Pedidos de compra",
    permisos: ["pedidos:*"],
  },
  {
    key: "recepciones",
    label: "Entrada de mercancia",
    permisos: ["recepciones:*"],
  },
  {
    key: "rollos",
    label: "Rollos",
    permisos: ["rollos:*"],
  },
  {
    key: "retazos",
    label: "Retazos",
    permisos: ["retazos:*"],
  },
  {
    key: "alertas",
    label: "Alertas",
    permisos: ["alertas:*"],
  },
  {
    key: "cortes",
    label: "Cortes",
    permisos: ["cortes:*"],
  },
  {
    key: "ventas",
    label: "Ventas",
    permisos: ["ventas:*", "cortes:read"],
  },
  {
    key: "finanzas",
    label: "Costos y auditoria",
    permisos: ["finanzas:*", "ventas:read", "cortes:read"],
  },
];

const roleLabels = {
  ADMIN: "Administrador",
  INVENTARIO: "Inventario",
  VENTAS: "Ventas",
};

const modulosPermitidosPorRol = (rol) =>
  modulosConfigurables.filter(
    (modulo) => !modulo.roles || modulo.roles.includes(rol)
  );

const tienePermisoModulo = (permisos, modulo) =>
  permisos.includes("*") ||
  modulo.permisos.some((permiso) => permisos.includes(permiso));

const permisosDesdeModulos = (rol, modulosActivos) => {
  const activos = new Set(["dashboard", ...modulosActivos]);
  const permisos = [];

  modulosPermitidosPorRol(rol).forEach((modulo) => {
    if (activos.has(modulo.key)) {
      permisos.push(...modulo.permisos);
    }
  });

  return Array.from(new Set(permisos));
};

function UsuariosPage() {
  const usuarioActual = obtenerUsuarioActual();
  const esSuperusuario = usuarioActual?.rol === "SUPERUSUARIO";
  const rolesDisponibles =
    esSuperusuario
      ? rolesUsuario
      : rolesUsuario.filter(([value]) => value !== "SUPERUSUARIO");

  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(formInicial);
  const [permisosRoles, setPermisosRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermisos, setLoadingPermisos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingRol, setSavingRol] = useState("");

  const usuariosOrdenados = useMemo(
    () =>
      [...usuarios].sort((a, b) =>
        String(a.nombre || "").localeCompare(
          String(b.nombre || "")
        )
      ),
    [usuarios]
  );

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const res = await getUsuarios();
      setUsuarios(res.data || []);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible cargar usuarios",
        text:
          error.response?.data?.message ||
          "Revise los permisos del usuario actual.",
      });
    } finally {
      setLoading(false);
    }
  };

  const cargarPermisosRoles = async () => {
    if (!esSuperusuario) {
      return;
    }

    try {
      setLoadingPermisos(true);
      const res = await getPermisosRoles();
      setPermisosRoles(res.data || []);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible cargar permisos",
        text:
          error.response?.data?.message ||
          "Revise el usuario superusuario.",
      });
    } finally {
      setLoadingPermisos(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  useEffect(() => {
    cargarPermisosRoles();
  }, [esSuperusuario]);

  const updateField = (field, value) => {
    setForm((actual) => ({
      ...actual,
      [field]:
        field === "correo"
          ? value.trim().toLowerCase()
          : String(value || "").toUpperCase(),
    }));
  };

  const guardarUsuario = async (event) => {
    event.preventDefault();

    if (!form.nombre || !form.correo || !form.password) {
      return Swal.fire({
        icon: "warning",
        title: "Complete nombre, correo y clave",
      });
    }

    if (form.password.length < 6) {
      return Swal.fire({
        icon: "warning",
        title: "Clave muy corta",
        text: "Use minimo 6 caracteres.",
      });
    }

    try {
      setSaving(true);
      await createUsuario(form);
      setForm(formInicial);
      await cargarUsuarios();
      Swal.fire({
        icon: "success",
        title: "Usuario creado",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible crear el usuario",
        text:
          error.response?.data?.message ||
          "Revise la informacion ingresada.",
      });
    } finally {
      setSaving(false);
    }
  };

  const cambiarRol = async (usuario, rol) => {
    try {
      await updateUsuarioRol(usuario._id, rol);
      await cargarUsuarios();
      Swal.fire({
        icon: "success",
        title: "Rol actualizado",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible cambiar el rol",
        text:
          error.response?.data?.message ||
          "Revise los permisos del administrador.",
      });
    }
  };

  const eliminarUsuarioSeleccionado = async (usuario) => {
    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "Eliminar usuario",
      text: `Se eliminara el usuario ${usuario.nombre}.`,
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    try {
      await deleteUsuario(usuario._id);
      await cargarUsuarios();
      Swal.fire({
        icon: "success",
        title: "Usuario eliminado",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible eliminar",
        text:
          error.response?.data?.message ||
          "Revise los permisos del administrador.",
      });
    }
  };

  const cambiarModuloRol = (rol, moduloKey, activo) => {
    setPermisosRoles((actual) =>
      actual.map((config) => {
        if (config.rol !== rol) {
          return config;
        }

        const modulosRol = modulosPermitidosPorRol(rol);
        const activos = new Set(
          modulosRol
            .filter((modulo) =>
              tienePermisoModulo(config.permisos || [], modulo)
            )
            .map((modulo) => modulo.key)
        );

        if (activo) {
          activos.add(moduloKey);
        } else {
          activos.delete(moduloKey);
        }

        return {
          ...config,
          permisos: permisosDesdeModulos(rol, Array.from(activos)),
        };
      })
    );
  };

  const guardarPermisosRol = async (config) => {
    try {
      setSavingRol(config.rol);
      await updatePermisosRol(config.rol, config.permisos || []);
      await cargarPermisosRoles();

      Swal.fire({
        icon: "success",
        title: "Permisos actualizados",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible guardar permisos",
        text:
          error.response?.data?.message ||
          "Revise la configuracion.",
      });
    } finally {
      setSavingRol("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Usuarios y perfiles
        </h1>
        <p className="text-slate-500">
          Crea usuarios y asigna que modulos puede manejar cada perfil.
        </p>
      </div>

      <div className="grid xl:grid-cols-[420px_minmax(0,1fr)] gap-6">
        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b flex items-center gap-3">
            <UserPlus className="text-blue-600" />
            <h2 className="font-bold text-slate-800">
              Nuevo usuario
            </h2>
          </div>

          <form
            onSubmit={guardarUsuario}
            className="p-5 space-y-4"
          >
            <Input
              label="Nombre"
              value={form.nombre}
              onChange={(value) => updateField("nombre", value)}
              placeholder="Ej: JUAN PEREZ"
            />
            <Input
              label="Correo"
              type="email"
              value={form.correo}
              onChange={(value) => updateField("correo", value)}
              placeholder="usuario@empresa.com"
            />
            <Input
              label="Clave temporal"
              type="password"
              value={form.password}
              onChange={(value) =>
                setForm((actual) => ({
                  ...actual,
                  password: value,
                }))
              }
              placeholder="Minimo 6 caracteres"
            />

            <label className="block">
              <span className="text-sm text-slate-500">
                Perfil
              </span>
              <select
                value={form.rol}
                onChange={(event) =>
                  setForm((actual) => ({
                    ...actual,
                    rol: event.target.value,
                  }))
                }
                className="mt-1 w-full border rounded-xl p-3 bg-white"
              >
                {rolesDisponibles.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold"
            >
              <Save size={18} />
              {saving ? "Guardando..." : "Crear usuario"}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Users className="text-blue-600" />
              <h2 className="font-bold text-slate-800">
                Usuarios registrados
              </h2>
            </div>
            <span className="text-sm text-slate-500">
              {usuarios.length} usuarios
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-slate-500">
              Cargando usuarios...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-4 text-left">Usuario</th>
                    <th className="p-4 text-left">Correo</th>
                    <th className="p-4 text-left">Perfil</th>
                    <th className="p-4 text-center">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosOrdenados.map((usuario) => (
                    <tr
                      key={usuario._id}
                      className="border-t hover:bg-slate-50"
                    >
                      <td className="p-4 font-semibold text-slate-800">
                        {usuario.nombre}
                      </td>
                      <td className="p-4 text-slate-600">
                        {usuario.correo}
                      </td>
                      <td className="p-4 min-w-56">
                        <div className="flex items-center gap-2">
                          <ShieldCheck
                            size={17}
                            className="text-slate-400"
                          />
                          <select
                            value={usuario.rol}
                            onChange={(event) =>
                              cambiarRol(
                                usuario,
                                event.target.value
                              )
                            }
                            className="border rounded-lg p-2 bg-white"
                          >
                            {rolesDisponibles.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            eliminarUsuarioSeleccionado(usuario)
                          }
                          className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                          title="Eliminar usuario"
                          aria-label="Eliminar usuario"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {esSuperusuario && (
        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="text-blue-600" />
              <div>
                <h2 className="font-bold text-slate-800">
                  Permisos por rol
                </h2>
                <p className="text-sm text-slate-500">
                  Elige que modulos puede ver y usar cada perfil.
                </p>
              </div>
            </div>
          </div>

          {loadingPermisos ? (
            <div className="p-6 text-slate-500">
              Cargando permisos...
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-4 p-5">
              {permisosRoles.map((config) => {
                const modulos = modulosPermitidosPorRol(config.rol);

                return (
                  <div
                    key={config.rol}
                    className="border rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-bold text-slate-800">
                          {roleLabels[config.rol] || config.rol}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Modulos visibles para este rol
                        </p>
                      </div>
                      <ShieldCheck className="text-slate-400" size={20} />
                    </div>

                    <div className="space-y-2">
                      {modulos.map((modulo) => {
                        const checked =
                          modulo.fijo ||
                          tienePermisoModulo(
                            config.permisos || [],
                            modulo
                          );

                        return (
                          <label
                            key={modulo.key}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
                          >
                            <span className="text-sm text-slate-700">
                              {modulo.label}
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={modulo.fijo}
                              onChange={(event) =>
                                cambiarModuloRol(
                                  config.rol,
                                  modulo.key,
                                  event.target.checked
                                )
                              }
                              className="h-4 w-4"
                            />
                          </label>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={savingRol === config.rol}
                      onClick={() => guardarPermisosRol(config)}
                      className="mt-4 w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-semibold"
                    >
                      <Save size={16} />
                      {savingRol === config.rol
                        ? "Guardando..."
                        : "Guardar permisos"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full border rounded-xl p-3"
      />
    </label>
  );
}

export default UsuariosPage;
