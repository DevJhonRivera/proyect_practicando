import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Car,
  Plus,
  Scissors,
  Search,
} from "lucide-react";

import {
  servicioLabels,
  tipoCorteLabels,
} from "../cortes.constants";
import { anchoLabel } from "../../../utils/anchos";
import { etiquetaDetalle } from "../../../utils/materiales";
import CorteSuggestions from "./CorteSuggestions";

const mayusculas = (value) =>
  String(value || "").toUpperCase();

const soloNumeros = (value) =>
  String(value || "").replace(/\D/g, "");

function CorteForm({
  form,
  loadingSugerencias,
  mantenerDatosCarro,
  onApplySuggestion,
  onApplyVehicle,
  onChange,
  onMantenerDatosCarroChange,
  onSubmit,
  retazoSeleccionado,
  retazosDisponibles,
  rolloSeleccionado,
  rollosEnUso,
  sugerencias,
  sugerenciasKey,
  vehiculosSugeridos,
}) {
  const [busquedaMaterial, setBusquedaMaterial] =
    useState("");
  const [ultimoTextoMaterial, setUltimoTextoMaterial] =
    useState("");
  const materialSeleccionadoId =
    (form.origenMaterial || "ROLLO") === "RETAZO"
      ? form.retazoId
      : form.rolloId;

  const rollosFiltrados = useMemo(
    () =>
      filtrarMateriales(
        rollosEnUso,
        busquedaMaterial,
        textoRollo
      ),
    [busquedaMaterial, rollosEnUso]
  );

  const retazosFiltrados = useMemo(
    () =>
      filtrarMateriales(
        retazosDisponibles,
        busquedaMaterial,
        textoRetazo
      ),
    [busquedaMaterial, retazosDisponibles]
  );

  const updateField = (field, value) => {
    if (field === "origenMaterial") {
      setBusquedaMaterial("");
      setUltimoTextoMaterial("");
    }

    const normalizers = {
      marca: mayusculas,
      placa: mayusculas,
      modelo: soloNumeros,
      instalador: mayusculas,
      tipoCorteDetalle: mayusculas,
    };
    const normalizar =
      normalizers[field] || ((input) => input);

    const extra =
      field === "tipoCorte" && value !== "OTROS"
        ? {
            tipoCorteDetalle: "",
          }
        : field === "origenMaterial"
        ? value === "RETAZO"
          ? {
              rolloId: "",
            }
          : {
              retazoId: "",
            }
        : {};

    onChange({
      ...form,
      [field]: normalizar(value),
      ...extra,
      ...(field === "tipoServicio" && value !== "GARANTIA_INSTALADOR"
        ? {
            instalador: "",
          }
        : {}),
    });
  };

  useEffect(() => {
    if (
      !materialSeleccionadoId &&
      ultimoTextoMaterial &&
      busquedaMaterial === ultimoTextoMaterial
    ) {
      setBusquedaMaterial("");
      setUltimoTextoMaterial("");
    }
  }, [
    busquedaMaterial,
    materialSeleccionadoId,
    ultimoTextoMaterial,
  ]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <Plus size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Registrar corte
          </h2>
          <p className="text-sm text-slate-500">
            Complete los datos del carro y del material siguiendo los ejemplos de cada campo.
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="md:col-span-2 xl:col-span-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Car size={19} />
              </div>

              <div>
                <p className="font-bold text-slate-900">
                  Varios cortes para el mismo carro
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  Al guardar, se conserva marca, modelo y placa. Se limpian material, parte del carro, metros y servicio para registrar el siguiente corte.
                </p>
              </div>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-blue-100">
              <input
                type="checkbox"
                checked={mantenerDatosCarro}
                onChange={(e) =>
                  onMantenerDatosCarroChange(
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              Mantener carro
            </label>
          </div>
        </div>

        <CampoGuia
          label="Placa"
          ayuda="Primero escribe la placa. Si el carro ya vino antes, podras autocompletar marca y modelo."
        >
          <PlacaAutocomplete
            placa={form.placa}
            onChange={(e) =>
              updateField(
                "placa",
                e.target.value
              )
            }
            onSelect={onApplyVehicle}
            sugerencias={vehiculosSugeridos}
          />
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
            className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
            className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </CampoGuia>

        <CampoGuia
          label="Origen del material"
          ayuda="Elige si el corte sale de un rollo en uso o de un retazo disponible."
        >
          <select
            value={form.origenMaterial || "ROLLO"}
            onChange={(e) =>
              updateField("origenMaterial", e.target.value)
            }
            className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          >
            <option value="ROLLO">Rollo en uso</option>
            <option value="RETAZO">Retazo disponible</option>
          </select>
        </CampoGuia>

        {(form.origenMaterial || "ROLLO") === "RETAZO" ? (
          <CampoGuia
            label="Retazo disponible"
            ayuda="Puedes usar un retazo aunque sea hasta 10 cm menor en ancho o largo."
          >
            <MaterialCombobox
              emptyText="No hay retazos con esa busqueda"
              getText={textoRetazo}
              items={retazosFiltrados}
              onQueryChange={(value) => {
                setBusquedaMaterial(value);
                if (form.retazoId) {
                  updateField("retazoId", "");
                }
              }}
              onSelect={(retazo) => {
                const texto = textoRetazo(retazo);
                setBusquedaMaterial(texto);
                setUltimoTextoMaterial(texto);
                updateField("retazoId", retazo._id);
              }}
              placeholder="Escriba para buscar retazo..."
              query={busquedaMaterial}
              selectedId={form.retazoId}
              total={retazosDisponibles.length}
            />
          </CampoGuia>
        ) : (
          <CampoGuia
            label="Rollo / material"
            ayuda="Escribe para buscar por codigo, material, ancho o metros disponibles."
          >
            <MaterialCombobox
              emptyText="No hay rollos con esa busqueda"
              getText={textoRollo}
              items={rollosFiltrados}
              onQueryChange={(value) => {
                setBusquedaMaterial(value);
                if (form.rolloId) {
                  updateField("rolloId", "");
                }
              }}
              onSelect={(rollo) => {
                const texto = textoRollo(rollo);
                setBusquedaMaterial(texto);
                setUltimoTextoMaterial(texto);
                updateField("rolloId", rollo._id);
              }}
              placeholder="Escriba para buscar rollo..."
              query={busquedaMaterial}
              selectedId={form.rolloId}
              total={rollosEnUso.length}
            />
          </CampoGuia>
        )}
        <CampoGuia
          label="Tipo de servicio"
          ayuda="Selecciona si es venta normal, garantia o garantia del instalador."
        >
          <select
            value={form.tipoServicio}
            onChange={(e) =>
              updateField("tipoServicio", e.target.value)
            }
            className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
              className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
            className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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

        {form.tipoCorte === "OTROS" && (
          <CampoGuia
            label="Detalle del corte"
            ayuda="Escribe exactamente que parte del carro se corto. Ej: ALETA DERECHA, VIDRIO CUSTODIA IZQUIERDO."
          >
            <input
              type="text"
              placeholder="Ej: ALETA DERECHA"
              value={form.tipoCorteDetalle}
              onChange={(e) =>
                updateField("tipoCorteDetalle", e.target.value)
              }
              required
              className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </CampoGuia>
        )}

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
            className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </CampoGuia>

        <div className="md:col-span-2 xl:col-span-4 flex flex-wrap justify-between items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <MaterialSeleccionado
            origenMaterial={form.origenMaterial || "ROLLO"}
            retazo={retazoSeleccionado}
            rollo={rolloSeleccionado}
          />

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 sm:w-auto"
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
    <label
      className="block"
      title={ayuda}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="mt-1">
        {children}
      </div>
    </label>
  );
}

function PlacaAutocomplete({
  placa,
  onChange,
  onSelect,
  sugerencias,
}) {
  const [open, setOpen] = useState(false);
  const mostrar =
    open &&
    placa.trim().length >= 2 &&
    sugerencias.length > 0;

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Ej: ABC123"
        value={placa}
        onChange={(event) => {
          onChange(event);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        required
        className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
      />

      {mostrar && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Carros encontrados
          </div>

          {sugerencias.map((vehiculo) => (
            <button
              key={vehiculo.placa}
              type="button"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() => {
                onSelect(vehiculo);
                setOpen(false);
              }}
              className="block w-full px-3 py-3 text-left transition hover:bg-blue-50"
            >
              <span className="block text-sm font-black text-slate-900">
                {vehiculo.placa}
              </span>
              <span className="block text-xs text-slate-500">
                {vehiculo.marca || "SIN MARCA"} - {vehiculo.modelo || "SIN MODELO"} - {vehiculo.cortes} corte{vehiculo.cortes === 1 ? "" : "s"} registrado{vehiculo.cortes === 1 ? "" : "s"}
              </span>
              <span className="mt-1 inline-block text-xs font-bold text-blue-700">
                Usar datos de este carro
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MaterialCombobox({
  emptyText,
  getText,
  items,
  onQueryChange,
  onSelect,
  placeholder,
  query,
  selectedId,
  total,
}) {
  const [open, setOpen] = useState(false);
  const visibles =
    query.trim() ? items.slice(0, 12) : items.slice(0, 8);

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-3.5 text-slate-400"
        />

        <input
          type="text"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white p-3 pl-9 pr-24 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          required={!selectedId}
        />

        <span className="absolute right-3 top-3 text-[11px] font-bold text-slate-400">
          {items.length}/{total}
        </span>
      </div>

      {open && (
        <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {visibles.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">
              {emptyText}
            </div>
          ) : (
            visibles.map((item) => {
              const activo =
                item._id === selectedId;
              const texto = getText(item);

              return (
                <button
                  key={item._id}
                  type="button"
                  onMouseDown={(event) =>
                    event.preventDefault()
                  }
                  onClick={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-xs leading-5 transition ${
                    activo
                      ? "bg-blue-50 font-bold text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {texto}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function MaterialSeleccionado({
  origenMaterial,
  retazo,
  rollo,
}) {
  if (origenMaterial === "RETAZO") {
    if (!retazo) {
      return (
        <p className="text-sm text-slate-500">
          Seleccione un retazo para ver su disponibilidad.
        </p>
      );
    }

    return (
      <p className="text-sm text-slate-600">
        Retazo seleccionado:{" "}
        <strong>{retazo.codigoRetazo}</strong> - {retazo.tipoPolarizado}{" "}
        {etiquetaDetalle(retazo)} - {anchoLabel(retazo.ancho)} - Disponible:{" "}
        <strong>
          {Number(retazo.largoDisponible).toFixed(2)} m
        </strong>
      </p>
    );
  }

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

function textoRollo(rollo) {
  return `${rollo.codigoRollo} - ${rollo.tipoPolarizado} ${etiquetaDetalle(
    rollo
  )} - ${anchoLabel(rollo.ancho)} - ${Number(
    rollo.largoDisponible || 0
  ).toFixed(2)} m`;
}

function textoRetazo(retazo) {
  return `${retazo.codigoRetazo} - ${retazo.tipoPolarizado} ${etiquetaDetalle(
    retazo
  )} - ${anchoLabel(retazo.ancho)} - ${Number(
    retazo.largoDisponible || 0
  ).toFixed(2)} m`;
}

function filtrarMateriales(items, busqueda, getTexto) {
  const texto =
    String(busqueda || "").trim().toLowerCase();

  if (!texto) {
    return items;
  }

  return items.filter((item) =>
    getTexto(item).toLowerCase().includes(texto)
  );
}

export default CorteForm;
