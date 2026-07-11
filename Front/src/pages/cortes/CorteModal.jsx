import { useState } from "react";
import Swal from "sweetalert2";
import { createCorte } from "../../api/cortes.api";

const mayusculas = (value) =>
  String(value || "").toUpperCase();

const soloNumeros = (value) =>
  String(value || "").replace(/\D/g, "");

function CorteModal({
  rollo,
  onClose,
  onSuccess
}) {

  const [form, setForm] =
    useState({
      placa: "",
      modelo: "",
      tipoServicio: "VENTA",
      instalador: "",
      tipoCorte: "PANORAMICO",
      metrosUtilizados: ""
    });

  const guardar = async () => {

    await createCorte({
      ...form,
      rolloId: rollo._id
    });

    Swal.fire({
      icon: "success",
      title:
        "Corte registrado"
    });

    onSuccess();
    onClose();
  };

  return (

    <div
      className="
      fixed
      inset-0
      bg-black/50
      flex
      items-center
      justify-center"
    >

      <div
        className="
        bg-white
        p-6
        rounded-xl
        w-[500px]"
      >

        <h2 className="text-xl font-bold mb-5">
          Registrar corte
        </h2>

        <input
          placeholder="Placa"
          value={form.placa}
          className="border p-2 w-full mb-3"
          onChange={(e) =>
            setForm({
              ...form,
              placa:
                mayusculas(e.target.value)
            })
          }
        />

        <input
          placeholder="Modelo"
          value={form.modelo}
          inputMode="numeric"
          pattern="[0-9]*"
          className="border p-2 w-full mb-3"
          onChange={(e) =>
            setForm({
              ...form,
              modelo:
                soloNumeros(e.target.value)
            })
          }
        />

        <select
          className="border p-2 w-full mb-3"
          onChange={(e) =>
            setForm({
              ...form,
              tipoServicio:
                e.target.value,
              instalador:
                e.target.value === "GARANTIA_INSTALADOR"
                  ? form.instalador
                  : ""
            })
          }
        >
          <option value="VENTA">Venta</option>
          <option value="GARANTIA">Garantia</option>
          <option value="GARANTIA_INSTALADOR">Garantia instalador</option>
          <option value="GARANTIA_EMPRESA">Garantia empresa</option>
        </select>

        {form.tipoServicio === "GARANTIA_INSTALADOR" && (
          <input
            placeholder="Nombre del instalador"
            value={form.instalador}
            className="border p-2 w-full mb-3"
            onChange={(e) =>
              setForm({
                ...form,
                instalador:
                  mayusculas(e.target.value)
              })
            }
          />
        )}

        <select
          className="border p-2 w-full mb-3"
          onChange={(e) =>
            setForm({
              ...form,
              tipoCorte:
                e.target.value
            })
          }
        >
          <option value="PANORAMICO">Panoramico</option>
          <option value="LUNETA">Luneta</option>
          <option value="DELANTERAS">Delanteras</option>
          <option value="TRASERAS">Traseras</option>
          <option value="FIJOS">Fijos / Custodias</option>
          <option value="SUNROOF">Sunroof</option>
          <option value="COMPLETO">Completo</option>
        </select>

        <input
          type="number"
          placeholder="Metros utilizados"
          className="border p-2 w-full mb-3"
          onChange={(e) =>
            setForm({
              ...form,
              metrosUtilizados:
                e.target.value
            })
          }
        />

        <div className="flex justify-end gap-2">

          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Cancelar
          </button>

          <button
            onClick={guardar}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Guardar
          </button>

        </div>

      </div>

    </div>
  );
}

export default CorteModal;
