import { useMemo, useState } from "react";
import Swal from "sweetalert2";

import { createCorte } from "../../../api/cortes.api";
import { getRetazoCompatible } from "../../../api/retazos.api";
import { cerrarRollo } from "../../../api/rollos.api";
import { initialCorteForm } from "../cortes.constants";
import {
  showCorteGrandeDialog,
  showRemanenteMinimoDialog,
  showRetazoCompatibleDialog,
  showRolloCerradoDialog,
  showRolloInsuficienteDialog,
} from "../cortes.dialogs";
import {
  getCortesExcelColumns,
  getMaterialCodigo,
} from "../cortes.utils";
import { useCorteSuggestions } from "./useCorteSuggestions";
import { useCortesData } from "./useCortesData";

export function useCortesPage() {
  const {
    cargar,
    cortes,
    loading,
    rollos,
  } = useCortesData();
  const [search, setSearch] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [form, setForm] = useState(initialCorteForm);

  const rollosEnUso = useMemo(
    () => rollos.filter((rollo) => rollo.estado === "USO"),
    [rollos]
  );

  const rolloSeleccionado = useMemo(
    () =>
      rollos.find((rollo) => rollo._id === form.rolloId),
    [rollos, form.rolloId]
  );

  const {
    marca: marcaForm,
    modelo: modeloForm,
    tipoCorte: tipoCorteForm,
  } = form;

  const {
    loadingSugerencias,
    sugerencias,
    sugerenciasKey,
  } = useCorteSuggestions({
    marca:
      marcaForm,
    modelo:
      modeloForm,
    tipoCorte:
      tipoCorteForm,
  });

  const cortesFiltrados = useMemo(() => {
    const texto = search.toLowerCase();

    return cortes.filter((corte) => {
      const codigoMaterial = getMaterialCodigo(corte);
      const coincideFecha =
        estaEnRangoFecha(
          corte.createdAt || corte.fecha,
          fechaDesde,
          fechaHasta
        );

      return (
        coincideFecha &&
        (corte.marca?.toLowerCase().includes(texto) ||
          corte.placa?.toLowerCase().includes(texto) ||
          corte.modelo?.toLowerCase().includes(texto) ||
          corte.instalador?.toLowerCase().includes(texto) ||
          corte.tipoServicio?.toLowerCase().includes(texto) ||
          corte.tipoCorte?.toLowerCase().includes(texto) ||
          codigoMaterial.toLowerCase().includes(texto))
      );
    });
  }, [cortes, search, fechaDesde, fechaHasta]);

  const indicadores = useMemo(() => {
    const totalCortes = cortesFiltrados.length;
    const totalMetros = cortesFiltrados.reduce(
      (acc, corte) =>
        acc + Number(corte.metrosUtilizados || 0),
      0
    );
    const vehiculosAtendidos = new Set(
      cortesFiltrados
        .map((corte) => corte.placa)
        .filter(Boolean)
    ).size;

    return {
      totalCortes,
      totalMetros,
      vehiculosAtendidos,
      promedioCorte:
        totalCortes > 0 ? totalMetros / totalCortes : 0,
    };
  }, [cortesFiltrados]);

  const limpiarForm = () => {
    setForm(initialCorteForm);
  };

  const validarFormulario = () => {
    if (!form.marca.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Ingrese la marca del vehiculo",
      });
      return false;
    }

    if (!form.modelo.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Ingrese el modelo del vehiculo",
      });
      return false;
    }

    if (!form.placa.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Ingrese la placa del vehiculo",
      });
      return false;
    }

    if (
      form.tipoServicio === "GARANTIA_INSTALADOR" &&
      !form.instalador.trim()
    ) {
      Swal.fire({
        icon: "warning",
        title: "Ingrese el instalador",
      });
      return false;
    }

    if (!form.rolloId) {
      Swal.fire({
        icon: "warning",
        title: "Seleccione un rollo",
      });
      return false;
    }

    if (
      !form.metrosUtilizados ||
      Number(form.metrosUtilizados) <= 0
    ) {
      Swal.fire({
        icon: "warning",
        title: "Ingrese los metros utilizados",
      });
      return false;
    }

    return true;
  };

  const seleccionarMaterial = async () => {
    let usarRetazo = null;

    if (rolloSeleccionado) {
      const retazoRes = await getRetazoCompatible({
        tipoPolarizado:
          rolloSeleccionado.tipoPolarizado,
        porcentaje: rolloSeleccionado.porcentaje,
        unidadMedida:
          rolloSeleccionado.unidadMedida || "PORCENTAJE",
        ancho: rolloSeleccionado.ancho,
        metrosUtilizados: form.metrosUtilizados,
      });

      if (retazoRes.data) {
        const retazo = retazoRes.data;

        const respuesta =
          await showRetazoCompatibleDialog(retazo);

        if (respuesta.isConfirmed) {
          usarRetazo = retazo;
        }
      }
    }

    return usarRetazo;
  };

  const cerrarRolloSinCorte = async () => {
    const decision =
      await showRolloInsuficienteDialog({
        rollo:
          rolloSeleccionado,
        metrosUtilizados:
          form.metrosUtilizados,
      });

    if (
      !decision.isConfirmed &&
      !decision.isDenied
    ) {
      return false;
    }

    const enviarARetazos =
      decision.isConfirmed;

    const res = await cerrarRollo(
      rolloSeleccionado._id,
      {
        enviarARetazos,
        observaciones:
          `Sobrante generado porque no alcanzaba para un corte de ${Number(
            form.metrosUtilizados || 0
          ).toFixed(2)} m`,
      }
    );

    const resultado =
      res.data?.data || {};

    await showRolloCerradoDialog({
      enviarARetazos,
      largoCerrado:
        resultado.largoCerrado ??
        rolloSeleccionado.largoDisponible,
      retazo:
        resultado.retazo,
    });

    setForm((actual) => ({
      ...actual,
      rolloId: "",
    }));

    await cargar();

    return false;
  };

  const confirmarCorte = async (usarRetazo) => {
    if (
      !usarRetazo &&
      rolloSeleccionado &&
      Number(form.metrosUtilizados) >
        Number(rolloSeleccionado.largoDisponible)
    ) {
      await cerrarRolloSinCorte();

      return false;
    }

    if (!usarRetazo && Number(form.metrosUtilizados) > 3) {
      const confirmacion =
        await showCorteGrandeDialog(
          form.metrosUtilizados
        );

      if (!confirmacion.isConfirmed) {
        return false;
      }
    }

    return true;
  };

  const resolverRemanente = async (usarRetazo) => {
    if (usarRetazo || !rolloSeleccionado) {
      return false;
    }

    const remanente =
      Number(rolloSeleccionado.largoDisponible) -
      Number(form.metrosUtilizados);

    if (remanente > 0 && remanente <= 0.4) {
      const result =
        await showRemanenteMinimoDialog(
          remanente
        );

      return result.isConfirmed;
    }

    return false;
  };

  const guardar = async (event) => {
    event.preventDefault();

    try {
      if (!validarFormulario()) {
        return;
      }

      const usarRetazo = await seleccionarMaterial();
      const confirmado = await confirmarCorte(usarRetazo);

      if (!confirmado) {
        return;
      }

      const agotarRemanente =
        await resolverRemanente(usarRetazo);

      await createCorte({
        ...form,
        rolloId: usarRetazo ? undefined : form.rolloId,
        retazoId: usarRetazo?._id,
        agotarRemanente,
        metrosUtilizados: Number(form.metrosUtilizados),
      });

      Swal.fire({
        icon: "success",
        title: "Corte registrado",
      });

      limpiarForm();
      cargar();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.message ||
          "No fue posible registrar el corte",
      });
    }
  };

  const aplicarSugerencia = (sugerencia) => {
    setForm((actual) => ({
      ...actual,
      tipoCorte: sugerencia.tipoCorte || actual.tipoCorte,
      metrosUtilizados: sugerencia.promedioMetros
        ? String(sugerencia.promedioMetros)
        : actual.metrosUtilizados,
      tipoServicio:
        sugerencia.servicios?.[0] || actual.tipoServicio,
    }));
  };

  return {
    cortesFiltrados,
    excelColumns: getCortesExcelColumns(),
    form,
    guardar,
    indicadores,
    loading,
    loadingSugerencias,
    recargar: cargar,
    rolloSeleccionado,
    rollosEnUso,
    search,
    fechaDesde,
    fechaHasta,
    setFechaDesde,
    setFechaHasta,
    setForm,
    setSearch,
    sugerencias,
    sugerenciasKey,
    aplicarSugerencia,
  };
}

function estaEnRangoFecha(value, desde, hasta) {
  if (!desde && !hasta) {
    return true;
  }

  if (!value) {
    return false;
  }

  const fecha = new Date(value);
  const inicio = desde
    ? new Date(`${desde}T00:00:00`)
    : null;
  const fin = hasta
    ? new Date(`${hasta}T23:59:59`)
    : null;

  if (inicio && fecha < inicio) {
    return false;
  }

  if (fin && fecha > fin) {
    return false;
  }

  return true;
}
