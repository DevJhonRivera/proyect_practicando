import { useEffect, useState } from "react";

import { getSugerenciasCortes } from "../../../api/cortes.api";

export function useCorteSuggestions({
  marca,
  modelo,
  tipoCorte,
}) {
  const [sugerencias, setSugerencias] =
    useState([]);
  const [sugerenciasKey, setSugerenciasKey] =
    useState("");
  const [loadingSugerencias, setLoadingSugerencias] =
    useState(false);

  useEffect(() => {
    const marcaNormalizada = marca.trim();
    const modeloNormalizado = modelo.trim();
    const queryKey =
      `${marcaNormalizada}|${modeloNormalizado}|${tipoCorte}`;

    if (
      marcaNormalizada.length < 2 ||
      modeloNormalizado.length < 2 ||
      !tipoCorte
    ) {
      return;
    }

    let active = true;

    const timeoutId = window.setTimeout(async () => {
      try {
        setLoadingSugerencias(true);

        const res = await getSugerenciasCortes({
          marca:
            marcaNormalizada,
          modelo:
            modeloNormalizado,
          tipoCorte,
        });

        if (active) {
          setSugerencias(
            res.data.data || res.data || []
          );
          setSugerenciasKey(queryKey);
        }
      } catch (error) {
        console.error(error);

        if (active) {
          setSugerencias([]);
          setSugerenciasKey(queryKey);
        }
      } finally {
        if (active) {
          setLoadingSugerencias(false);
        }
      }
    }, 450);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [marca, modelo, tipoCorte]);

  return {
    loadingSugerencias,
    sugerencias,
    sugerenciasKey,
  };
}
