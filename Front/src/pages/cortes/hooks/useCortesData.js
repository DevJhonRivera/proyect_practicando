import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import { getCortes } from "../../../api/cortes.api";
import { getRetazosDisponibles } from "../../../api/retazos.api";
import { getRollos } from "../../../api/rollos.api";

const getCortesData = (res) =>
  res.data.data || res.data || [];

const getRollosData = (res) =>
  res.data.data || [];

const getRetazosData = (res) =>
  res.data.data || res.data || [];

export function useCortesData() {
  const [cortes, setCortes] = useState([]);
  const [retazos, setRetazos] = useState([]);
  const [rollos, setRollos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    try {
      setLoading(true);

      const [cortesRes, rollosRes, retazosRes] =
        await Promise.all([
          getCortes(),
          getRollos(),
          getRetazosDisponibles(),
        ]);

      setCortes(getCortesData(cortesRes));
      setRollos(getRollosData(rollosRes));
      setRetazos(getRetazosData(retazosRes));
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No fue posible cargar la informacion",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const cargarInicial = async () => {
      try {
        const [cortesRes, rollosRes, retazosRes] =
          await Promise.all([
            getCortes(),
            getRollos(),
            getRetazosDisponibles(),
          ]);

        if (active) {
          setCortes(getCortesData(cortesRes));
          setRollos(getRollosData(rollosRes));
          setRetazos(getRetazosData(retazosRes));
        }
      } catch (error) {
        console.error(error);

        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No fue posible cargar la informacion",
        });
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

  return {
    cargar,
    cortes,
    loading,
    retazos,
    rollos,
  };
}
