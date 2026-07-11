import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import {
  atenderAlerta,
  getAlertas,
} from "../../../api/alertas";
import { nivelAlerta } from "../alertas.constants";

export function useAlertasPage() {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("TODOS");
  const [estado, setEstado] = useState("PENDIENTES");

  const cargar = async () => {
    try {
      setLoading(true);

      const res = await getAlertas();

      setAlertas(res.data.data || res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const cargarInicial = async () => {
      try {
        const res = await getAlertas();

        if (active) {
          setAlertas(res.data.data || res.data || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    cargarInicial();

    return () => {
      active = false;
    };
  }, []);

  const tipos = useMemo(
    () => [
      "TODOS",
      ...new Set(
        alertas
          .map((alerta) => alerta.tipo)
          .filter(Boolean)
      ),
    ],
    [alertas]
  );

  const atender = async (id) => {
    try {
      await atenderAlerta(id);

      setAlertas((actuales) =>
        actuales.map((alerta) =>
          alerta._id === id
            ? {
                ...alerta,
                atendida: true,
              }
            : alerta
        )
      );
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudo atender la alerta",
        text:
          error.response?.data?.message ||
          "Intentalo de nuevo.",
      });
    }
  };

  const alertasFiltradas = useMemo(() => {
    const texto = search.toLowerCase();

    return alertas.filter((alerta) => {
      const coincideBusqueda =
        alerta.tipo?.toLowerCase().includes(texto) ||
        alerta.mensaje?.toLowerCase().includes(texto);

      const coincideTipo =
        tipo === "TODOS" || alerta.tipo === tipo;

      const coincideEstado =
        estado === "TODAS" ||
        (estado === "PENDIENTES" &&
          !alerta.atendida) ||
        (estado === "ATENDIDAS" &&
          alerta.atendida);

      return (
        coincideBusqueda &&
        coincideTipo &&
        coincideEstado
      );
    });
  }, [alertas, estado, search, tipo]);

  const pendientesFiltradas = useMemo(
    () =>
      alertasFiltradas.filter(
        (alerta) => !alerta.atendida
      ),
    [alertasFiltradas]
  );

  const atenderVisibles = async () => {
    try {
      await Promise.all(
        pendientesFiltradas.map((alerta) =>
          atenderAlerta(alerta._id)
        )
      );

      const idsAtendidos = new Set(
        pendientesFiltradas.map(
          (alerta) => alerta._id
        )
      );

      setAlertas((actuales) =>
        actuales.map((alerta) =>
          idsAtendidos.has(alerta._id)
            ? {
                ...alerta,
                atendida: true,
              }
            : alerta
        )
      );
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudieron atender las alertas",
        text:
          error.response?.data?.message ||
          "Intentalo de nuevo.",
      });
    }
  };

  const indicadores = useMemo(() => {
    const totalAlertas = alertasFiltradas.length;
    const alertasCriticas = alertasFiltradas.filter(
      (alerta) => nivelAlerta(alerta.tipo) === "CRITICO"
    ).length;
    const alertasHoy = alertasFiltradas.filter((alerta) => {
      const fecha = new Date(alerta.createdAt).toLocaleDateString();
      const hoy = new Date().toLocaleDateString();

      return fecha === hoy;
    }).length;

    return {
      alertasCriticas,
      alertasHoy,
      totalAlertas,
      tipos: tipos.length - 1,
    };
  }, [alertasFiltradas, tipos.length]);

  const excelColumns = useMemo(
    () => [
      {
        header: "Tipo",
        value: (alerta) => alerta.tipo,
        width: 24,
      },
      {
        header: "Mensaje",
        value: (alerta) => alerta.mensaje,
        width: 42,
      },
      {
        header: "Fecha",
        value: (alerta) =>
          alerta.createdAt
            ? new Date(alerta.createdAt)
            : "",
        numFmt: "dd/mm/yyyy",
      },
      {
        header: "Nivel",
        value: (alerta) => nivelAlerta(alerta.tipo),
      },
      {
        header: "Estado",
        value: (alerta) =>
          alerta.atendida
            ? "ATENDIDA"
            : "PENDIENTE",
      },
    ],
    []
  );

  return {
    alertasFiltradas,
    atender,
    atenderVisibles,
    cargar,
    estado,
    excelColumns,
    indicadores,
    loading,
    pendientesFiltradas,
    search,
    setEstado,
    setSearch,
    setTipo,
    tipo,
    tipos,
    ultimasAlertas: alertasFiltradas.slice(0, 5),
  };
}
