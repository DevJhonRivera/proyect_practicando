import {
  Plus,
  Scissors,
} from "lucide-react";

import {
  servicioLabels,
  tipoCorteLabels,
} from "../cortes.constants";
import { etiquetaDetalle } from "../../../utils/materiales";
import CorteSuggestions from "./CorteSuggestions";

const mayusculas = (value) =>
  String(value || "").toUpperCase();

const soloNumeros = (value) =>
  String(value || "").replace(/\D/g, "");

function CorteForm({
  form,
  loadingSugerencias,
  onApplySuggestion,
  onChange,
  onSubmit,
  rolloSeleccionado,
  rollosEnUso,
  sugerencias,
  sugerenciasKey,
}) {
  const updateField = (field, value) => {
    const normalizers = {
      marca: mayusculas,
      placa: mayusculas,
      modelo: soloNumeros,
      instalador: mayusculas,
    };
    const normalizar =
      normalizers[field] || ((input) => input);

    onChange({
      ...form,
      [field]: normalizar(value),
      ...(field === "tipoServicio" && value !== "GARANTIA_INSTALADOR"
        ? {
            instalador: "",
          }
        : {}),
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center gap-2 mb-5">
        <Plus className="text-blue-600" />
        <div>
          <h2 className="text-xl font-bold">
            Registrar corte
          </h2>
          <p className="text-sm text-slate-500">
            Complete los datos del carro y del material siguiendo los ejemplos de cada campo.
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid md:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <CampoGuia
          label="Rollo / material"
          ayuda="Elige el rollo que corresponde al material usado. Revisa codigo, material y metros disponibles."
        >
          <select
            value={form.rolloId}
            onChange={(e) =>
              updateField("rolloId", e.target.value)
            }
            required
            className="w-full border rounded-xl p-3 bg-white"
          >
            <option value="">
              Seleccione rollo en uso
            </option>

            {rollosEnUso.map((rollo) => (
              <option
                key={rollo._id}
                value={rollo._id}
              >
                {rollo.codigoRollo} - {rollo.tipoPolarizado} {etiquetaDetalle(rollo)} - {Number(rollo.largoDisponible).toFixed(2)}m
              </option>
            ))}
          </select>
        </CampoGuia>

        <CampoGuia
          label="Marca"
          ayuda="Escribe la marca del carro. Ej: TOYOTA, MAZDA, BMW."
        >
          <input
            type="text"
            placeholder="Ej: TOYOTA"
            value={form.marca}
            onChange={(e) =>
              updateField("marca", e.target.value)
            }
            required
            className="w-full border rounded-xl p-3"
          />
        </CampoGuia>

        <CampoGuia
          label="Modelo"
          ayuda="Solo numeros. Normalmente es el ano del carro. Ej: 2024."
        >
          <input
            type="text"
            placeholder="Ej: 2024"
            value={form.modelo}
            onChange={(e) =>
              updateField("modelo", e.target.value)
            }
            inputMode="numeric"
            pattern="[0-9]*"
            required
            className="w-full border rounded-xl p-3"
          />
        </CampoGuia>

        <CampoGuia
          label="Placa"
          ayuda="Escribe la placa completa sin espacios. Ej: ABC123."
        >
          <input
            type="text"
            placeholder="Ej: ABC123"
            value={form.placa}
            onChange={(e) =>
              updateField(
                "placa",
                e.target.value
              )
            }
            required
            className="w-full border rounded-xl p-3"
          />
        </CampoGuia>

        <CampoGuia
          label="Tipo de servicio"
          ayuda="Selecciona si es venta normal, garantia o garantia del instalador."
        >
          <select
            value={form.tipoServicio}
            onChange={(e) =>
              updateField("tipoServicio", e.target.value)
            }
            className="w-full border rounded-xl p-3 bg-white"
          >
            {Object.entries(servicioLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </CampoGuia>

        {form.tipoServicio === "GARANTIA_INSTALADOR" && (
          <CampoGuia
            label="Instalador"
            ayuda="Nombre de la persona responsable de la garantia."
          >
            <input
              type="text"
              placeholder="Ej: JUAN PEREZ"
              value={form.instalador}
              onChange={(e) =>
                updateField("instalador", e.target.value)
              }
              required
              className="w-full border rounded-xl p-3"
            />
          </CampoGuia>
        )}

        <CampoGuia
          label="Parte del carro"
          ayuda="Indica que vidrio o zona se corto: panoramico, luneta, puertas, completo, etc."
        >
          <select
            value={form.tipoCorte}
            onChange={(e) =>
              updateField("tipoCorte", e.target.value)
            }
            className="w-full border rounded-xl p-3 bg-white"
          >
            {Object.entries(tipoCorteLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </CampoGuia>

        <CorteSuggestions
          sugerencias={sugerencias}
          sugerenciasKey={sugerenciasKey}
          loading={loadingSugerencias}
          marca={form.marca}
          modelo={form.modelo}
          tipoCorte={form.tipoCorte}
          onApply={onApplySuggestion}
        />

        <CampoGuia
          label="Metros utilizados"
          ayuda="Cantidad exacta que se corto del rollo. Ej: 1.45."
        >
          <input
            type="number"
            step="0.01"
            placeholder="Ej: 1.45"
            value={form.metrosUtilizados}
            onChange={(e) =>
              updateField(
                "metrosUtilizados",
                e.target.value
              )
            }
            required
            className="w-full border rounded-xl p-3"
          />
        </CampoGuia>

        <div className="md:col-span-2 xl:col-span-4 flex justify-between items-center bg-slate-50 rounded-xl p-4">
          <RolloSeleccionado rollo={rolloSeleccionado} />

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <Scissors size={18} />
            Registrar corte
          </button>
        </div>
      </form>
    </div>
  );
}

function CampoGuia({ label, ayuda, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>
      <div className="mt-1">
        {children}
      </div>
      <span className="mt-1 block text-xs leading-snug text-slate-500">
        {ayuda}
      </span>
    </label>
  );
}

function RolloSeleccionado({ rollo }) {
  if (!rollo) {
    return (
      <p className="text-sm text-slate-500">
        Seleccione un rollo para ver su disponibilidad.
      </p>
    );
  }

  return (
    <p className="text-sm text-slate-600">
      Rollo seleccionado:{" "}
      <strong>{rollo.codigoRollo}</strong> - Disponible:{" "}
      <strong>
        {Number(rollo.largoDisponible).toFixed(2)} m
      </strong>
    </p>
  );
}

export default CorteForm;
