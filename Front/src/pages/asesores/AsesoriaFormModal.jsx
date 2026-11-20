import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCheck, Plus, Save, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import {
  createBorradorAsesoria,
  getCatalogoDisponible,
  getClienteAsesoria,
  getOrigenesGarantia,
  searchClientesAsesoria,
  updateAsesoria,
} from "../../api/asesores.api";
import AppModal from "../../components/ui/AppModal";
import { anchoLabel } from "../../utils/anchos";
import { obtenerReferenciaPpf } from "../../utils/materiales";
import { getPiezasPpf } from "../../api/piezasPpf.api";
import { getInstaladoresCoordinacion } from "../../api/coordinacion.api";
import { getAccesorios } from "../../api/accesorios.api";
import { getServiciosAdicionales } from "../../api/serviciosAdicionales.api";
import { getPreciosVenta } from "../../api/preciosVenta.api";
import { calcularPiezasPpf, calcularTarifasVenta } from "../../utils/preciosVenta";
import { createComboPpf, getCombosPpf } from "../../api/combosPpf.api";
import PrecioServicio from "./PrecioServicio";
import { dividirGuardafango, subtotalesMedidasPpf } from "../../utils/medidasPpf";
import SelectorPiezasPpf from "./SelectorPiezasPpf";

const inicial = {
  cliente: { cedula: "", nombre: "", telefono: "", correo: "" },
  vehiculo: { tipo: "CARRO", placa: "", marca: "", modelo: "", anio: "", color: "" },
  seguroVehiculo: { estado: "SIN_CONFIRMAR", aseguradora: "", numeroPoliza: "", vigenciaHasta: "" },
  recepcion: {
    tieneRayones: false,
    detalleRayones: "",
    dejaObjetos: false,
    detalleObjetos: "",
    observaciones: "",
  },
  polarizados: [],
  ppf: [],
  serviciosAdicionales: [],
  accesorios: [],
  garantia: { esGarantia: false, tipo: "GARANTIA_EMPRESA", motivo: "", instalador: "", instaladorId: "", ordenOrigenId: "" },
  comercial: {
    valorVenta: "",
    aplicaDescuento: false,
    descuento: "",
    metodoPagoPrevisto: "POR_DEFINIR",
  },
};

const mayusculas = (value) => String(value || "").toUpperCase();
const soloDigitos = (value) => String(value || "").replace(/\D/g, "");
const formatearMiles = (value) => {
  const digitos = soloDigitos(value);
  return digitos ? Number(digitos).toLocaleString("es-CO") : "";
};

const agruparPpfPorMaterial = (items = []) => {
  const grupos = new Map();

  items.forEach((item) => {
    const referencia = mayusculas(item.referencia).trim();
    if (!referencia) return;

    const existente = grupos.get(referencia) || {
      ...item,
      referencia,
      piezas: [],
      valor: "",
      aplicaciones: new Set(),
    };
    existente.piezas = [...new Set([...existente.piezas, ...(item.piezas || []).map(mayusculas)])];
    if (!Number(existente.valor || 0) && Number(item.valor || 0) > 0) existente.valor = item.valor;
    existente.aplicaciones.add(item.aplicacion === "PIEZAS" ? "EXTERIOR" : item.aplicacion);
    grupos.set(referencia, existente);
  });

  return [...grupos.values()].map(({ aplicaciones, ...item }) => ({
    ...item,
    aplicacion: aplicaciones.has("COMPLETO") || (aplicaciones.has("INTERIOR") && aplicaciones.has("EXTERIOR"))
      ? "COMPLETO"
      : [...aplicaciones][0] || "EXTERIOR",
  }));
};

const PARTES_POLARIZADO = [
  ["PANORAMICO", "Panorámico"],
  ["DELANTERAS", "Ventanas delanteras"],
  ["TRASERAS", "Ventanas traseras"],
  ["LUNETA", "Luneta"],
  ["FIJOS", "Fijos"],
  ["CUSTODIAS", "Custodias"],
  ["SUNROOF", "Sunroof"],
  ["U", "U (todo menos panorámico y Sunroof)"],
  ["COMPLETO", "Carro completo"],
];

const PARTES_INCLUIDAS_EN_U = new Set(["DELANTERAS", "TRASERAS", "LUNETA", "FIJOS", "CUSTODIAS"]);

const prepararFormulario = (asesoria) => {
  if (!asesoria) {
    return {
      ...inicial,
      cliente: { ...inicial.cliente },
      vehiculo: { ...inicial.vehiculo },
      recepcion: { ...inicial.recepcion },
      garantia: { ...inicial.garantia },
      comercial: { ...inicial.comercial },
      polarizados: [],
      ppf: [],
      serviciosAdicionales: [],
      accesorios: [],
    };
  }

  return {
    cliente: { ...inicial.cliente, ...asesoria.cliente },
    vehiculo: { ...inicial.vehiculo, ...asesoria.vehiculo },
    seguroVehiculo: { ...inicial.seguroVehiculo, ...asesoria.seguroVehiculo },
    recepcion: { ...inicial.recepcion, ...asesoria.recepcion },
    polarizados: (asesoria.polarizados || []).map((item) => {
      const porcentaje = String(item.porcentaje || "");
      const unidad = porcentaje.toUpperCase().includes("MICRAS") ? "MICRAS" : "PORCENTAJE";
      const numero = Number(porcentaje.match(/[\d.]+/)?.[0] || 0);
      return {
        tarifasVenta: item.tarifasVenta || [],
        material: item.material || "",
        porcentaje,
        partes: [...(item.partes || [])],
        valor: String(item.valor || ""),
        materialClave: `${item.material}|${unidad}|${numero}`,
      };
    }),
    ppf: (asesoria.ppf || []).map((item) => ({
      tarifasVenta: item.tarifasVenta || [],
      referencia: item.referencia || "",
      aplicacion: item.aplicacion || "PIEZAS",
      piezas: [...(item.piezas || [])],
      comboPpfId: String(item.comboPpfId || ""),
      comboNombre: item.comboNombre || "",
      comboPrecioIndividual: Number(item.comboPrecioIndividual || 0),
      comboPrecioMinimo: Number(item.comboPrecioMinimo || 0),
      comboPermiteDescuento: Boolean(item.comboPermiteDescuento),
      comboDescuentoMaximoPorcentaje: Number(item.comboDescuentoMaximoPorcentaje || 0),
      cotizacionModo: item.cotizacionModo || (item.comboPpfId ? "COMBO" : "TARIFA"),
      medidasPiezas: (item.medidasPiezas || []).map((medida) => ({ ...medida })),
      margenTecnicoPorcentaje: Number(item.margenTecnicoPorcentaje || 20),
      margenTecnicoCm: 0,
      dificultad: item.dificultad || "MEDIA",
      costoPromedioM2: Number(item.costoPromedioM2 || 0),
      areaRealM2: Number(item.areaRealM2 || 0),
      areaFacturableM2: Number(item.areaFacturableM2 || 0),
      costoMaterialEstimado: Number(item.costoMaterialEstimado || 0),
      piezaPersonalizada: "",
      valor: String(item.valor || ""),
    })),
    serviciosAdicionales: (asesoria.serviciosAdicionales || []).map((item) => ({
      tarifasVenta: item.tarifasVenta || [],
      tipo: item.tipo || "",
      detalle: item.detalle || "",
      valor: String(item.valor || ""),
    })),
    accesorios: (asesoria.accesorios || []).map((item) => ({
      tarifasVenta: item.tarifasVenta || [],
      accesorioId: String(item.accesorioId || ""),
      cantidad: String(item.cantidad || 1),
      precioUnitario: String(item.precioUnitario || ""),
      valor: Number(item.valor || 0),
    })),
    garantia: { ...inicial.garantia, ...asesoria.garantia },
    comercial: {
      ...inicial.comercial,
      ...asesoria.comercial,
      descuento: String(asesoria.comercial?.descuento || ""),
    },
  };
};

function AsesoriaFormModal({ onClose, onSaved, asesoria = null }) {
  const nuevoPolarizadoRef = useRef(null);
  const enfocarNuevoPolarizadoRef = useRef(false);
  const [form, setForm] = useState(() => prepararFormulario(asesoria));
  const [buscando, setBuscando] = useState(false);
  const [clientesSugeridos, setClientesSugeridos] = useState([]);
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [catalogoMateriales, setCatalogoMateriales] = useState([]);
  const [cargandoMateriales, setCargandoMateriales] = useState(true);
  const [piezasPpf, setPiezasPpf] = useState([]);
  const [cargandoPiezas, setCargandoPiezas] = useState(false);
  const [instaladores, setInstaladores] = useState([]);
  const [origenesGarantia, setOrigenesGarantia] = useState([]);
  const [cargandoOrigenes, setCargandoOrigenes] = useState(false);
  const [catalogoAccesorios, setCatalogoAccesorios] = useState([]);
  const [catalogoServicios, setCatalogoServicios] = useState([]);
  const [errorCatalogoServicios, setErrorCatalogoServicios] = useState(false);
  const [preciosVenta, setPreciosVenta] = useState([]);
  const [cargandoPrecios, setCargandoPrecios] = useState(true);
  const [errorPrecios, setErrorPrecios] = useState("");
  const [combosPpf, setCombosPpf] = useState([]);
  useEffect(() => {
    if (!enfocarNuevoPolarizadoRef.current) return undefined;

    enfocarNuevoPolarizadoRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      const fila = nuevoPolarizadoRef.current;
      if (!fila) return;
      fila.scrollIntoView({ behavior: "smooth", block: "start" });
      fila.querySelector("select")?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [form.polarizados.length]);

  useEffect(() => {
    getCombosPpf().then(({ data }) => setCombosPpf(data.data || [])).catch(() => setCombosPpf([]));
  }, []);
  useEffect(() => {
    let activo = true;
    getPreciosVenta({ incluirPendientes: true }).then(({ data }) => {
      if (activo) setPreciosVenta(data.data.filter((fila) => fila.activo));
    }).catch(() => { if (activo) setErrorPrecios("No se pudo cargar la lista de precios. Cierra y vuelve a abrir el formulario para intentarlo de nuevo."); })
      .finally(() => { if (activo) setCargandoPrecios(false); });
    return () => { activo = false; };
  }, []);
  const asignarTarifas = (grupo, indice, tarifasVenta) => {
    let valor = 0;
    try { valor = calcularTarifasVenta(tarifasVenta, preciosVenta).total; } catch { /* La selección incompleta muestra su aviso junto al servicio. */ }
    setForm((actual) => ({ ...actual, [grupo]: actual[grupo].map((item, posicion) => posicion === indice
      ? { ...item, tarifasVenta, [grupo === "accesorios" ? "precioUnitario" : "valor"]: String(valor) } : item) }));
  };
  const ppfAgrupado = useMemo(() => agruparPpfPorMaterial(form.ppf), [form.ppf]);
  const valorServicios = useMemo(
    () => [...form.polarizados, ...ppfAgrupado, ...form.serviciosAdicionales]
      .reduce((total, item) => total + Number(item.valor || 0), 0) +
      form.accesorios.reduce((total, item) => total + Number(item.cantidad || 0) * Number(item.precioUnitario || 0), 0),
    [form.polarizados, ppfAgrupado, form.serviciosAdicionales, form.accesorios]
  );
  const origenGarantiaSeleccionado = useMemo(
    () => origenesGarantia.find((item) => String(item._id) === String(form.garantia.ordenOrigenId)),
    [origenesGarantia, form.garantia.ordenOrigenId]
  );
  const idsInstaladoresOrigen = useMemo(
    () => new Set((origenGarantiaSeleccionado?.coordinacion?.asignaciones || []).map((item) => String(item.instaladorId || "")).filter(Boolean)),
    [origenGarantiaSeleccionado]
  );
  const instaladoresGarantia = idsInstaladoresOrigen.size
    ? instaladores.filter((item) => idsInstaladoresOrigen.has(String(item._id)))
    : instaladores;

  useEffect(() => {
    getServiciosAdicionales()
      .then((response) => setCatalogoServicios(response.data?.data || []))
      .catch(() => setErrorCatalogoServicios(true));
  }, []);

  useEffect(() => {
    getInstaladoresCoordinacion()
      .then((response) => setInstaladores(response.data?.data || []))
      .catch(() => setInstaladores([]));
  }, []);

  useEffect(() => {
    if (!form.garantia.esGarantia || soloDigitos(form.cliente.cedula).length < 5 || form.vehiculo.placa.trim().length < 5) {
      setOrigenesGarantia([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        setCargandoOrigenes(true);
        const response = await getOrigenesGarantia(form.cliente.cedula, form.vehiculo.placa);
        const origenes = response.data?.data || [];
        setOrigenesGarantia(origenes);
        setForm((actual) => {
          const seleccionValida = origenes.some((item) => String(item._id) === String(actual.garantia.ordenOrigenId));
          return {
            ...actual,
            garantia: {
              ...actual.garantia,
              ordenOrigenId: seleccionValida ? actual.garantia.ordenOrigenId : origenes[0]?._id || "",
            },
          };
        });
      } catch {
        setOrigenesGarantia([]);
      } finally {
        setCargandoOrigenes(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form.garantia.esGarantia, form.cliente.cedula, form.vehiculo.placa]);

  useEffect(() => {
    let activo = true;
    const cargarAccesorios = async () => {
      try {
        const primera = await getAccesorios({ page: 1, limit: 100 });
        const data = primera.data?.data || {};
        const totalPages = Number(data.pagination?.totalPages || 1);
        const restantes = totalPages > 1
          ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) =>
              getAccesorios({ page: index + 2, limit: 100 })
            ))
          : [];
        if (activo) {
          setCatalogoAccesorios([
            ...(data.items || []),
            ...restantes.flatMap((response) => response.data?.data?.items || []),
          ]);
        }
      } catch {
        if (activo) setCatalogoAccesorios([]);
      }
    };
    cargarAccesorios();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    const cedula = soloDigitos(form.cliente.cedula);
    if (asesoria || cedula.length < 3) {
      setClientesSugeridos([]);
      return undefined;
    }

    let activo = true;
    const temporizador = setTimeout(() => {
      searchClientesAsesoria(cedula)
        .then((response) => {
          if (activo) setClientesSugeridos(response.data?.data || []);
        })
        .catch(() => {
          if (activo) setClientesSugeridos([]);
        });
    }, 300);

    return () => {
      activo = false;
      clearTimeout(temporizador);
    };
  }, [asesoria, form.cliente.cedula]);

  useEffect(() => {
    let activo = true;
    getCatalogoDisponible()
      .then((response) => {
        if (activo) setCatalogoMateriales(response.data?.data || []);
      })
      .catch(() => {
        if (activo) setCatalogoMateriales([]);
      })
      .finally(() => {
        if (activo) setCargandoMateriales(false);
      });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    const marca = form.vehiculo.marca.trim();
    const modelo = form.vehiculo.modelo.trim();
    const anio = form.vehiculo.anio.trim();
    if (!marca || !modelo) {
      setPiezasPpf([]);
      return;
    }
    let activo = true;
    setCargandoPiezas(true);
    getPiezasPpf({ marca, modelo, anio, tipoVehiculo: form.vehiculo.tipo || "CARRO" })
      .then((response) => {
        if (activo) setPiezasPpf(response.data?.data || response.data || []);
      })
      .catch(() => {
        if (activo) setPiezasPpf([]);
      })
      .finally(() => {
        if (activo) setCargandoPiezas(false);
      });
    return () => { activo = false; };
  }, [form.vehiculo.anio, form.vehiculo.marca, form.vehiculo.modelo, form.vehiculo.tipo]);

  const opcionesMaterial = useMemo(() => {
    const grupos = new Map();
    catalogoMateriales
      .filter((item) => item.unidadMedida === "PORCENTAJE" || item.unidadMedida === "MICRAS")
      .forEach((item) => {
        const clave = `${item.tipoPolarizado}|${item.unidadMedida}|${Number(item.porcentaje || 0)}`;
        const actual = grupos.get(clave) || { ...item, metrosDisponibles: 0 };
        actual.metrosDisponibles += Number(item.metrosDisponibles || 0);
        grupos.set(clave, actual);
      });
    return Array.from(grupos.entries()).map(([clave, item]) => ({
      clave,
      material: item.tipoPolarizado,
      porcentaje: item.unidadMedida === "MICRAS"
        ? `${item.porcentaje} MICRAS`
        : `${item.porcentaje}%`,
      metrosDisponibles: item.metrosDisponibles,
    }));
  }, [catalogoMateriales]);

  const opcionesPpf = useMemo(() => {
    const grupos = new Map();
    catalogoMateriales
      .filter((item) => String(item.tipoPolarizado || "").toUpperCase().includes("PPF"))
      .forEach((item) => {
        const referencia = obtenerReferenciaPpf(item.tipoPolarizado) || item.tipoPolarizado;
        const actual = grupos.get(referencia) || { referencia, metrosDisponibles: 0, anchos: new Set(), areaDisponibleM2: 0, costoDisponibleCop: 0 };
        actual.metrosDisponibles += Number(item.metrosDisponibles || 0);
        actual.areaDisponibleM2 += Number(item.areaDisponibleM2 || 0);
        actual.costoDisponibleCop += Number(item.areaDisponibleM2 || 0) * Number(item.costoPromedioM2 || 0);
        if (item.ancho) actual.anchos.add(anchoLabel(item.ancho));
        grupos.set(referencia, actual);
      });
    return Array.from(grupos.values()).map((item) => ({
      ...item,
      anchos: Array.from(item.anchos),
      costoPromedioM2: item.areaDisponibleM2 > 0 ? Math.round(item.costoDisponibleCop / item.areaDisponibleM2) : 0,
    }));
  }, [catalogoMateriales]);

  const cambiar = (grupo, campo, valor) => {
    setForm((actual) => ({
      ...actual,
      [grupo]: { ...actual[grupo], [campo]: valor },
    }));
  };

  const agregarItem = (grupo, item) =>
    setForm((actual) => ({ ...actual, [grupo]: [...actual[grupo], item] }));
  const agregarMaterialPolarizado = () => {
    enfocarNuevoPolarizadoRef.current = true;
    agregarItem("polarizados", { material: "", porcentaje: "", materialClave: "", partes: [], valor: "" });
  };
  const editarItem = (grupo, index, campo, valor) =>
    setForm((actual) => ({
      ...actual,
      [grupo]: actual[grupo].map((item, posicion) =>
        posicion === index ? { ...item, [campo]: valor } : item
      ),
    }));
  const seleccionarMaterial = (index, clave) => {
    const opcion = opcionesMaterial.find((item) => item.clave === clave);
    setForm((actual) => ({
      ...actual,
      polarizados: actual.polarizados.map((item, posicion) =>
        posicion === index
          ? {
              ...item,
              material: opcion?.material || "",
              porcentaje: opcion?.porcentaje || "",
              materialClave: clave,
              valor: "", tarifasVenta: [],
            }
          : item
      ),
    }));
  };
  const cotizarPiezasEstandar = (item) => {
    try {
      const calculo = calcularPiezasPpf(item.piezas, preciosVenta);
      return { ...item, valor: String(calculo.total), tarifasVenta: calculo.tarifas, errorPiezas: "" };
    } catch (error) {
      return { ...item, valor: "", tarifasVenta: [], errorPiezas: error.message };
    }
  };
  const seleccionarPpf = (index, referencia) => {
    setForm((actual) => ({
      ...actual,
      ppf: actual.ppf.map((item, posicion) =>
        posicion === index ? (item.cotizacionModo === "MEDIDAS"
          ? calcularCotizacionMedidas({ ...item, referencia, valor: "", tarifasVenta: [], comboPpfId: "", comboNombre: "" })
          : item.cotizacionModo === "PIEZAS" ? cotizarPiezasEstandar({ ...item, referencia }) : { ...item, referencia, valor: "", tarifasVenta: [], comboPpfId: "", comboNombre: "" }) : item
      ),
    }));
  };
  const calcularCotizacionMedidas = (item) => {
    const costoPromedioM2 = Number(opcionesPpf.find((opcion) => opcion.referencia === item.referencia)?.costoPromedioM2 || 0);
    const areaRealM2 = (item.medidasPiezas || []).reduce((total, medida) => total + (Number(medida.anchoCm || 0) / 100) * (Number(medida.largoCm || 0) / 100) * Math.max(1, Number(medida.cantidad || 1)), 0);
    const areaFacturableM2 = areaRealM2;
    const divisor = { FACIL: 0.35, MEDIA: 0.30, ALTA: 0.25, ESPECIAL: 0.20 }[item.dificultad] || 0;
    const costoMaterialEstimado = Math.round(areaFacturableM2 * costoPromedioM2);
    const valor = divisor > 0 && costoMaterialEstimado > 0 ? Math.round(costoMaterialEstimado / divisor / 1000) * 1000 : 0;
    return { ...item, costoPromedioM2, areaRealM2, areaFacturableM2, costoMaterialEstimado, valor: String(valor) };
  };
  const cambiarModoPpf = (index, cotizacionModo) => setForm((actual) => ({ ...actual, ppf: actual.ppf.map((item, posicion) => {
    if (posicion !== index) return item;
    const base = { ...item, cotizacionModo, comboPpfId: "", comboNombre: "", tarifasVenta: [], valor: "" };
    if (cotizacionModo === "PIEZAS") return cotizarPiezasEstandar(base);
    if (cotizacionModo !== "MEDIDAS") return base;
    return calcularCotizacionMedidas({ ...base, margenTecnicoCm: 0, dificultad: item.dificultad || "MEDIA",
      medidasPiezas: (item.piezas || []).map((pieza) => item.medidasPiezas?.find((medida) => medida.pieza === pieza)
        || (() => { const guardada = piezasPpf.find((registro) => registro.pieza === pieza); return { pieza, anchoCm: guardada?.anchoCm || "", largoCm: guardada?.largoCm || "", cantidad: guardada?.cantidad || 1 }; })()) });
  }) }));
  const dividirGuardafangoPpf = (index, pieza) => setForm((actual) => ({ ...actual,
    ppf: actual.ppf.map((item, posicion) => posicion !== index ? item : calcularCotizacionMedidas(dividirGuardafango(item, pieza))),
  }));
  const editarMedidaPpf = (index, pieza, campo, valor) => setForm((actual) => ({ ...actual, ppf: actual.ppf.map((item, posicion) => posicion !== index ? item : calcularCotizacionMedidas({
    ...item, medidasPiezas: (item.medidasPiezas || []).map((medida) => medida.pieza === pieza ? { ...medida, [campo]: valor } : medida),
  })) }));
  const editarCalculoPpf = (index, campo, valor) => setForm((actual) => ({ ...actual, ppf: actual.ppf.map((item, posicion) => posicion !== index ? item : calcularCotizacionMedidas({ ...item, [campo]: valor })) }));
  const alternarPiezaPpf = (index, pieza, detalle = {}) => {
    setForm((actual) => ({
      ...actual,
      ppf: actual.ppf.map((item, posicion) => {
        if (posicion !== index) return item;
        const piezas = item.piezas || [];
        const guardada = { ...piezasPpf.find((registro) => registro.pieza === pieza), ...detalle };
        const actualizado = {
          ...item, valor: "", tarifasVenta: [], comboPpfId: "", comboNombre: "",
          piezas: piezas.includes(pieza)
            ? piezas.filter((actual) => actual !== pieza)
            : [...piezas, pieza],
          medidasPiezas: piezas.includes(pieza)
            ? (item.medidasPiezas || []).filter((medida) => medida.pieza !== pieza)
            : [...(item.medidasPiezas || []), { pieza, ubicacion: guardada?.ubicacion || (item.aplicacion === "INTERIOR" ? "INTERIOR" : "EXTERIOR"), anchoCm: guardada?.anchoCm || "", largoCm: guardada?.largoCm || "", cantidad: guardada?.cantidad || 1 }],
        };
        return item.cotizacionModo === "MEDIDAS" ? calcularCotizacionMedidas(actualizado) : actualizado.cotizacionModo === "PIEZAS" ? cotizarPiezasEstandar(actualizado) : actualizado;
      }),
    }));
  };
  const combosCompatibles = (item) => combosPpf.filter((combo) => {
    const tipo = form.vehiculo.tipo || "CARRO";
    const tipoValido = combo.tipoVehiculo === "AMBOS" || combo.tipoVehiculo === tipo;
    const marcaValida = !combo.marca || combo.marca === form.vehiculo.marca.trim();
    const modeloValido = !combo.modelo || combo.modelo === form.vehiculo.modelo.trim();
    const materialValido = !combo.referenciasPpf?.length || combo.referenciasPpf.includes(item.referencia);
    return tipoValido && marcaValida && modeloValido && materialValido;
  });
  const seleccionarComboPpf = (index, comboId) => {
    const combo = combosPpf.find((item) => item._id === comboId);
    setForm((actual) => ({ ...actual, ppf: actual.ppf.map((item, posicion) => posicion !== index ? item : combo ? {
      ...item, comboPpfId: combo._id, comboNombre: combo.nombre, cotizacionModo: "COMBO", piezas: [...combo.piezas],
      valor: String(combo.precioCombo), tarifasVenta: [], comboPrecioIndividual: combo.precioIndividual,
      comboPrecioMinimo: combo.precioMinimo, comboPermiteDescuento: combo.permiteDescuento,
      comboDescuentoMaximoPorcentaje: combo.descuentoMaximoPorcentaje,
    } : cotizarPiezasEstandar({ ...item, cotizacionModo: "PIEZAS", comboPpfId: "", comboNombre: "", valor: "", tarifasVenta: [] })) }));
  };
  const crearComboCompartido = async (index) => {
    const item = form.ppf[index];
    if (!item.referencia || !item.piezas?.length) return Swal.fire({ icon: "warning", title: "Seleccione primero el material y las piezas del combo" });
    const totalSeparado = Number(item.valor || 0);
    const precioSugeridoCombo = Math.round(totalSeparado * 0.9 / 1000) * 1000;
    const resultado = await Swal.fire({
      didOpen: () => {
        const popup = Swal.getPopup();
        popup.querySelector("#combo-individual").value = totalSeparado || "";
        popup.querySelector("#combo-precio").value = precioSugeridoCombo || "";
        popup.querySelector("#combo-minimo").value = precioSugeridoCombo || "";
      },
      title: "Crear combo PPF compartido",
      html: `<div class="space-y-3 text-left">
        <label class="block text-sm font-semibold">Nombre<input id="combo-nombre" class="swal2-input !m-0 !w-full" placeholder="Ej: COMBO EXTERIOR"></label>
        <label class="block text-sm font-semibold">Total por separado<input id="combo-individual" type="number" min="1" class="swal2-input !m-0 !w-full" placeholder="980000"></label>
        <label class="block text-sm font-semibold">Precio especial del combo<input id="combo-precio" type="number" min="1" class="swal2-input !m-0 !w-full" placeholder="600000"></label>
        <label class="block text-sm font-semibold">Precio mínimo permitido<input id="combo-minimo" type="number" min="1" class="swal2-input !m-0 !w-full" placeholder="570000"></label>
        <label class="flex items-center gap-2 text-sm"><input id="combo-descuento" type="checkbox"> Permitir descuento adicional</label>
        <label class="block text-sm font-semibold">Descuento máximo (%)<input id="combo-maximo" type="number" min="0" max="100" value="0" class="swal2-input !m-0 !w-full"></label>
        <label class="flex items-center gap-2 text-sm"><input id="combo-modelo" type="checkbox"> Solo para ${form.vehiculo.marca} ${form.vehiculo.modelo}</label>
      </div>`,
      showCancelButton: true, confirmButtonText: "Crear y usar combo", cancelButtonText: "Cancelar",
      preConfirm: () => {
        const popup = Swal.getPopup();
        const data = {
          nombre: popup.querySelector("#combo-nombre").value,
          precioIndividual: Number(popup.querySelector("#combo-individual").value),
          precioCombo: Number(popup.querySelector("#combo-precio").value),
          precioMinimo: Number(popup.querySelector("#combo-minimo").value),
          permiteDescuento: popup.querySelector("#combo-descuento").checked,
          descuentoMaximoPorcentaje: Number(popup.querySelector("#combo-maximo").value),
          especificoModelo: popup.querySelector("#combo-modelo").checked,
        };
        if (!data.nombre || !data.precioIndividual || !data.precioCombo || !data.precioMinimo) return Swal.showValidationMessage("Complete nombre y precios");
        return data;
      },
    });
    if (!resultado.isConfirmed) return;
    try {
      const data = resultado.value;
      const response = await createComboPpf({
        ...data, tipoVehiculo: form.vehiculo.tipo || "CARRO", piezas: item.piezas,
        referenciasPpf: [item.referencia], marca: data.especificoModelo ? form.vehiculo.marca : "",
        modelo: data.especificoModelo ? form.vehiculo.modelo : "",
      });
      const combo = response.data.data;
      setCombosPpf((actual) => [...actual, combo]);
      setForm((actual) => ({ ...actual, ppf: actual.ppf.map((fila, posicion) => posicion === index ? {
        ...fila, comboPpfId: combo._id, comboNombre: combo.nombre, cotizacionModo: "COMBO", piezas: [...combo.piezas], valor: String(combo.precioCombo),
        tarifasVenta: [], comboPrecioIndividual: combo.precioIndividual, comboPrecioMinimo: combo.precioMinimo,
        comboPermiteDescuento: combo.permiteDescuento, comboDescuentoMaximoPorcentaje: combo.descuentoMaximoPorcentaje,
      } : fila) }));
      Swal.fire({ icon: "success", title: "Combo compartido creado", timer: 1800, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible crear el combo", text: error.response?.data?.message || error.message });
    }
  };
  const seleccionarAplicacionPpf = (index, aplicacion) => setForm((actual) => ({ ...actual, ppf: actual.ppf.map((item, posicion) => posicion === index ? { ...item, aplicacion, piezas: [], valor: "", tarifasVenta: [] } : item) }));
  const alternarPartePolarizado = (index, parte) => {
    setForm((actual) => ({
      ...actual,
      polarizados: actual.polarizados.map((item, posicion) => {
        if (posicion !== index) return item;
        const partes = item.partes || [];
        let nuevasPartes = partes.includes(parte)
          ? partes.filter((actual) => actual !== parte)
          : [...partes.filter((actual) => actual !== "COMPLETO"), parte];
        if (parte === "U" && !partes.includes(parte)) {
          nuevasPartes = [...partes.filter((actual) => !PARTES_INCLUIDAS_EN_U.has(actual) && actual !== "COMPLETO"), "U"];
        } else if (PARTES_INCLUIDAS_EN_U.has(parte) && !partes.includes(parte)) {
          nuevasPartes = [...partes.filter((actual) => actual !== "U" && actual !== "COMPLETO"), parte];
        }
        return {
          ...item, valor: "", tarifasVenta: [],
          partes: parte === "COMPLETO" && !partes.includes(parte)
            ? ["COMPLETO"]
            : nuevasPartes,
        };
      }),
    }));
  };
  const quitarItem = (grupo, index) =>
    setForm((actual) => ({
      ...actual,
      [grupo]: actual[grupo].filter((_, posicion) => posicion !== index),
    }));
  const seleccionarAccesorio = (index, accesorioId) => {
    const producto = catalogoAccesorios.find((item) => item._id === accesorioId);
    setForm((actual) => ({
      ...actual,
      accesorios: actual.accesorios.map((item, posicion) => posicion === index ? {
        ...item,
        accesorioId,
        cantidad: item.cantidad || "1",
        precioUnitario: String(producto?.precioSugerido || ""),
        tarifasVenta: [],
      } : item),
    }));
  };

  const buscarCliente = async () => {
    const cedula = soloDigitos(form.cliente.cedula);
    if (cedula.length < 5) return;

    try {
      setBuscando(true);
      const response = await getClienteAsesoria(cedula);
      const anterior = response.data?.data;
      if (!anterior) return;

      setForm((actual) => ({
        ...actual,
        cliente: { ...actual.cliente, ...anterior.cliente, cedula },
        vehiculo: { ...actual.vehiculo, ...anterior.vehiculo },
      }));
    } catch {
      // La búsqueda es una ayuda; el formulario sigue disponible.
    } finally {
      setBuscando(false);
    }
  };

  const seleccionarCliente = (registro) => {
    setForm((actual) => ({
      ...actual,
      cliente: { ...actual.cliente, ...registro.cliente },
      vehiculo: { ...actual.vehiculo, ...registro.vehiculo },
    }));
    setMostrarClientes(false);
    setClientesSugeridos([]);
  };

  const cambiarTipoRecepcion = (esGarantia) => {
    const restaurarPrecio = (item, campo) => {
      if (esGarantia) return "";
      if (!item.tarifasVenta?.length) return item[campo];
      try { return String(calcularTarifasVenta(item.tarifasVenta, preciosVenta).total); }
      catch { return ""; }
    };
    setForm((actual) => ({
      ...actual,
      polarizados: actual.polarizados.map((item) => ({ ...item, valor: restaurarPrecio(item, "valor") })),
      ppf: actual.ppf.map((item) => ({ ...item, valor: restaurarPrecio(item, "valor") })),
      serviciosAdicionales: actual.serviciosAdicionales.map((item) => ({ ...item, valor: restaurarPrecio(item, "valor") })),
      accesorios: actual.accesorios.map((item) => ({ ...item, precioUnitario: restaurarPrecio(item, "precioUnitario") })),
      garantia: {
        ...actual.garantia,
        esGarantia,
        tipo: esGarantia ? actual.garantia.tipo || "GARANTIA_EMPRESA" : "",
        motivo: esGarantia ? actual.garantia.motivo : "",
        instalador: esGarantia && actual.garantia.tipo === "GARANTIA_INSTALADOR" ? actual.garantia.instalador : "",
        instaladorId: esGarantia && actual.garantia.tipo === "GARANTIA_INSTALADOR" ? actual.garantia.instaladorId : "",
        ordenOrigenId: esGarantia ? actual.garantia.ordenOrigenId : "",
      },
      comercial: {
        ...actual.comercial,
        valorVenta: esGarantia ? "" : actual.comercial.valorVenta,
        aplicaDescuento: esGarantia ? false : actual.comercial.aplicaDescuento,
        descuento: esGarantia ? "" : actual.comercial.descuento,
        metodoPagoPrevisto: esGarantia ? "POR_DEFINIR" : actual.comercial.metodoPagoPrevisto,
      },
    }));
  };

  const guardar = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.cliente.correo.trim())) return Swal.fire({ icon: "warning", title: "Registre un correo valido del cliente" });

    const placa = form.vehiculo.placa.trim();
    if (soloDigitos(form.cliente.cedula).length < 5) {
      return Swal.fire({ icon: "warning", title: "Ingrese una cédula válida" });
    }
    if (!form.cliente.nombre.trim()) {
      return Swal.fire({ icon: "warning", title: "Ingrese el nombre del cliente" });
    }
    if (placa.length < 5 || placa.length > 10) {
      return Swal.fire({ icon: "warning", title: "La placa debe tener entre 5 y 10 caracteres" });
    }
    if (!form.vehiculo.marca.trim() || !form.vehiculo.modelo.trim()) {
      return Swal.fire({ icon: "warning", title: "Complete marca y modelo" });
    }
    if (soloDigitos(form.vehiculo.anio).length !== 4) {
      return Swal.fire({ icon: "warning", title: "Ingrese el año del vehículo con 4 números" });
    }
    if (form.recepcion.tieneRayones && !form.recepcion.detalleRayones.trim()) {
      return Swal.fire({ icon: "warning", title: "Describa los rayones encontrados" });
    }
    if (form.recepcion.dejaObjetos && !form.recepcion.detalleObjetos.trim()) {
      return Swal.fire({ icon: "warning", title: "Describa las pertenencias dejadas" });
    }
    const polarizadosValidos = form.polarizados.every(
      (item) => item.material.trim() && item.porcentaje.trim() && item.partes.length
    );
    const ppfValido = form.ppf.every(
      (item) => item.referencia.trim() && item.piezas.length
    );
    const preciosValidos = [...form.polarizados, ...ppfAgrupado, ...form.serviciosAdicionales]
      .every((item) => Number(item.valor || 0) > 0);
    const accesoriosValidos = form.accesorios.every((item) => item.accesorioId && Number(item.cantidad) > 0 && (form.garantia.esGarantia || Number(item.precioUnitario) > 0));
    if (!form.polarizados.length && !form.ppf.length && !form.serviciosAdicionales.length && !form.accesorios.length) {
      return Swal.fire({ icon: "warning", title: "Agregue al menos un servicio" });
    }
    if (!polarizadosValidos || !ppfValido) {
      return Swal.fire({ icon: "warning", title: "Complete los materiales y partes solicitadas" });
    }
    if (!accesoriosValidos) return Swal.fire({ icon: "warning", title: "Complete los accesorios, cantidades y tarifas" });
    if (!form.garantia.esGarantia && !preciosValidos) {
      return Swal.fire({ icon: "warning", title: "Seleccione la tarifa de cada servicio" });
    }
    if (form.garantia.esGarantia && !form.garantia.motivo.trim()) {
      return Swal.fire({ icon: "warning", title: "Indique el motivo de la garantía" });
    }
    if (form.garantia.esGarantia && form.garantia.tipo === "GARANTIA_INSTALADOR" && !form.garantia.instaladorId) {
      return Swal.fire({ icon: "warning", title: "Seleccione el instalador responsable de la garantía" });
    }
    const valorVenta = valorServicios;
    const descuento = form.comercial.aplicaDescuento
      ? Number(form.comercial.descuento || 0)
      : 0;
    if (!form.garantia.esGarantia && valorVenta <= 0) {
      return Swal.fire({ icon: "warning", title: "Ingrese el valor acordado de la venta" });
    }
    if (descuento < 0 || descuento > valorVenta) {
      return Swal.fire({ icon: "warning", title: "El descuento no puede superar el valor de venta" });
    }

    try {
      setGuardando(true);
      const payload = {
        ...form,
        comercial: form.garantia.esGarantia
          ? { valorVenta: 0, aplicaDescuento: false, descuento: 0, metodoPagoPrevisto: "POR_DEFINIR" }
          : { ...form.comercial, valorVenta: valorServicios },
        polarizados: form.polarizados.map((item) => ({ ...item, partes: item.partes, valor: form.garantia.esGarantia ? 0 : item.valor })),
        ppf: ppfAgrupado.map((item) => ({ ...item, piezas: item.piezas, valor: form.garantia.esGarantia ? 0 : item.valor })),
        serviciosAdicionales: form.serviciosAdicionales.map((item) => ({ ...item, valor: form.garantia.esGarantia ? 0 : item.valor })),
        accesorios: form.accesorios.map((item) => ({ ...item, precioUnitario: form.garantia.esGarantia ? 0 : item.precioUnitario })),
      };
      const response = asesoria
        ? await updateAsesoria(asesoria._id, payload)
        : await createBorradorAsesoria(payload);
      const solicitudFirma = response.data?.data?.solicitudFirma;
      await Swal.fire({
        icon: solicitudFirma?.enviado === false ? "warning" : "success",
        title: asesoria ? "Servicio actualizado" : "Recepción guardada",
        text: `Código ${response.data?.data?.codigo || asesoria?.codigo || "creado"}${solicitudFirma ? `. ${solicitudFirma.mensaje}` : ""}`,
      });
      onSaved?.();
      onClose();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible guardar",
        text: error.response?.data?.message || "Revise los datos ingresados.",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppModal
      title={asesoria ? `Editar servicio ${asesoria.codigo}` : "Nueva recepción del vehículo"}
      subtitle={asesoria ? "Actualiza los datos del servicio; los cambios requieren una nueva aprobación cuando corresponda" : "Identifica al cliente y deja constancia del estado del carro"}
      icon={ClipboardCheck}
      maxWidth="max-w-4xl"
      onClose={onClose}
    >
      <div className="space-y-6">
        <FormSection title="Tipo de recepción">
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => cambiarTipoRecepcion(false)} className={`rounded-xl border p-4 text-left transition ${!form.garantia.esGarantia ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-300"}`}>
              <span className="block font-black text-slate-900">Servicio nuevo</span>
              <span className="mt-1 block text-xs text-slate-500">Se registra el precio de cada servicio y el cliente realiza el pago.</span>
            </button>
            <button type="button" onClick={() => cambiarTipoRecepcion(true)} className={`rounded-xl border p-4 text-left transition ${form.garantia.esGarantia ? "border-violet-600 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 bg-white hover:border-violet-300"}`}>
              <span className="block font-black text-slate-900">Garantía</span>
              <span className="mt-1 block text-xs text-slate-500">No genera cobro al cliente; se selecciona únicamente el material y trabajo requerido.</span>
            </button>
          </div>
          {form.garantia.esGarantia && <div className="grid gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 md:grid-cols-3">
            <div className="md:col-span-3"><Field label="Servicio anterior al que corresponde la garantía"><select value={form.garantia.ordenOrigenId || ""} onChange={(e) => setForm((actual) => ({ ...actual, garantia: { ...actual.garantia, ordenOrigenId: e.target.value } }))} disabled={cargandoOrigenes || !origenesGarantia.length} className="w-full rounded-xl border bg-white p-3"><option value="">{cargandoOrigenes ? "Buscando servicios de esta placa..." : origenesGarantia.length ? "Seleccione el servicio original" : "No hay servicios finalizados para esta cédula y placa"}</option>{origenesGarantia.map((origen) => { const materiales = [...(origen.polarizados || []).map((item) => `${item.material} ${item.porcentaje}`), ...(origen.ppf || []).map((item) => `PPF ${item.referencia}`), ...(origen.serviciosAdicionales || []).map((item) => item.tipo)].join(" · "); return <option key={origen._id} value={origen._id}>{origen.codigo} · {new Date(origen.createdAt).toLocaleDateString("es-CO")} · {materiales || "Servicio registrado"}</option>; })}</select><p className="mt-1 text-xs text-violet-700">La cédula identifica al cliente y la placa identifica el carro. Si esta placa tuvo varios trabajos, elija exactamente el que presenta la garantía.</p></Field></div>
            <Field label="Responsable propuesto">
              <select value={form.garantia.tipo} onChange={(e) => setForm((actual) => ({ ...actual, garantia: { ...actual.garantia, tipo: e.target.value, instalador: e.target.value === "GARANTIA_INSTALADOR" ? actual.garantia.instalador : "", instaladorId: e.target.value === "GARANTIA_INSTALADOR" ? actual.garantia.instaladorId : "" } }))} className="w-full rounded-xl border bg-white p-3">
                <option value="GARANTIA_EMPRESA">Garantía empresa</option>
                <option value="GARANTIA_INSTALADOR">Garantía instalador</option>
                <option value="GARANTIA_PROVEEDOR">Garantía proveedor / material</option>
              </select>
            </Field>
            <Field label="Motivo de la garantía"><input value={form.garantia.motivo} placeholder="Ej: MATERIAL DEFECTUOSO" onChange={(e) => cambiar("garantia", "motivo", mayusculas(e.target.value))} className="w-full rounded-xl border p-3" /></Field>
            {form.garantia.tipo === "GARANTIA_INSTALADOR" && <Field label="Instalador responsable"><select value={form.garantia.instaladorId || ""} onChange={(e) => { const instalador = instaladoresGarantia.find((item) => item._id === e.target.value); setForm((actual) => ({ ...actual, garantia: { ...actual.garantia, instaladorId: e.target.value, instalador: instalador?.nombre || "" } })); }} className="w-full rounded-xl border bg-white p-3"><option value="">Seleccione instalador</option>{instaladoresGarantia.map((instalador) => <option key={instalador._id} value={instalador._id}>{instalador.nombre}</option>)}</select></Field>}
            <p className="text-xs text-violet-800 md:col-span-3">Administración aprobará la garantía y confirmará quién asume el costo real del material.</p>
          </div>}
        </FormSection>

        <FormSection title="Datos del cliente">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Cédula">
              <div className="relative">
                <input
                  value={form.cliente.cedula}
                  inputMode="numeric"
                  maxLength={15}
                  autoComplete="off"
                  placeholder="Ej: 1023456789"
                  onFocus={() => setMostrarClientes(true)}
                  onChange={(e) => {
                    cambiar("cliente", "cedula", soloDigitos(e.target.value));
                    setMostrarClientes(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setMostrarClientes(false), 150);
                    buscarCliente();
                  }}
                  className="w-full rounded-xl border p-3"
                />
                {mostrarClientes && clientesSugeridos.length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                    {clientesSugeridos.map((registro) => (
                      <button
                        key={registro.cliente.cedula}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => seleccionarCliente(registro)}
                        className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-blue-50"
                      >
                        <span className="block text-sm font-bold text-slate-800">{registro.cliente.nombre}</span>
                        <span className="block text-xs text-slate-500">CC {registro.cliente.cedula} · {registro.cliente.telefono || "Sin teléfono"}</span>
                        <span className="block text-xs text-blue-700">{registro.vehiculo?.placa} · {registro.vehiculo?.marca} {registro.vehiculo?.modelo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {buscando && <span className="mt-1 block text-xs text-blue-600">Buscando cliente...</span>}
            </Field>
            <Field label="Nombre completo">
              <input value={form.cliente.nombre} placeholder="Ej: JUAN PEREZ" onChange={(e) => cambiar("cliente", "nombre", mayusculas(e.target.value))} className="w-full rounded-xl border p-3" />
            </Field>
            <Field label="Teléfono">
              <input value={form.cliente.telefono} inputMode="tel" placeholder="Ej: 3001234567" onChange={(e) => cambiar("cliente", "telefono", e.target.value)} className="w-full rounded-xl border p-3" />
            </Field>
            <Field label="Correo obligatorio">
              <input type="email" value={form.cliente.correo} placeholder="Ej: cliente@correo.com" onChange={(e) => cambiar("cliente", "correo", e.target.value.toLowerCase())} className="w-full rounded-xl border p-3" />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Datos del vehículo">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Tipo de vehículo">
              <select value={form.vehiculo.tipo || "CARRO"} onChange={(e) => {
                const tipo = e.target.value;
                setForm((actual) => ({
                  ...actual,
                  vehiculo: { ...actual.vehiculo, tipo },
                  ppf: actual.ppf.map((item) => ({ ...item, aplicacion: tipo === "MOTO" ? "EXTERIOR" : item.aplicacion, piezas: [], tarifasVenta: [], valor: "" })),
                  polarizados: actual.polarizados.map((item) => ({ ...item, tarifasVenta: [], valor: "" })),
                }));
              }} className="w-full rounded-xl border bg-white p-3">
                <option value="CARRO">Carro, SUV o camioneta</option>
                <option value="MOTO">Moto</option>
              </select>
            </Field>
            <Field label="Placa">
              <input value={form.vehiculo.placa} minLength={5} maxLength={10} placeholder="Ej: ABC123" onChange={(e) => cambiar("vehiculo", "placa", mayusculas(e.target.value).replace(/\s/g, ""))} className="w-full rounded-xl border p-3" />
            </Field>
            <Field label="Marca">
              <input value={form.vehiculo.marca} placeholder="Ej: TESLA" onChange={(e) => cambiar("vehiculo", "marca", mayusculas(e.target.value))} className="w-full rounded-xl border p-3" />
            </Field>
            <Field label="Modelo">
              <input value={form.vehiculo.modelo} placeholder="Ej: MODEL Y" onChange={(e) => cambiar("vehiculo", "modelo", mayusculas(e.target.value))} className="w-full rounded-xl border p-3" />
            </Field>
            <Field label="Año">
              <input value={form.vehiculo.anio} inputMode="numeric" maxLength={4} placeholder="Ej: 2025" onChange={(e) => cambiar("vehiculo", "anio", soloDigitos(e.target.value).slice(0, 4))} className="w-full rounded-xl border p-3" />
            </Field>
            <Field label="Color">
              <input value={form.vehiculo.color} placeholder="Ej: NEGRO" onChange={(e) => cambiar("vehiculo", "color", mayusculas(e.target.value))} className="w-full rounded-xl border p-3" />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Seguro todo riesgo del vehiculo">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="El cliente declara que tiene seguro todo riesgo">
              <select value={form.seguroVehiculo.estado} onChange={(e) => cambiar("seguroVehiculo", "estado", e.target.value)} className="w-full rounded-xl border bg-white p-3">
                <option value="SIN_CONFIRMAR">Sin confirmar</option><option value="SI">Si</option><option value="NO">No</option>
              </select>
            </Field>

          </div>
          <p className="mt-2 text-xs text-slate-500">La declaracion sobre seguro y las condiciones de incidentes se incluyen en el diagnostico que firma el cliente.</p>
        </FormSection>
        <FormSection title="Estado y pertenencias">
          <div className="grid gap-4 md:grid-cols-2">
            <Inspection
              label="Se encontraron rayones"
              checked={form.recepcion.tieneRayones}
              onChange={(checked) => cambiar("recepcion", "tieneRayones", checked)}
            >
              {form.recepcion.tieneRayones && (
                <textarea rows="3" value={form.recepcion.detalleRayones} placeholder="Ej: Rayón en puerta delantera derecha" onChange={(e) => cambiar("recepcion", "detalleRayones", mayusculas(e.target.value))} className="mt-3 w-full rounded-xl border p-3" />
              )}
            </Inspection>
            <Inspection
              label="Deja objetos o pertenencias"
              checked={form.recepcion.dejaObjetos}
              onChange={(checked) => cambiar("recepcion", "dejaObjetos", checked)}
            >
              {form.recepcion.dejaObjetos && (
                <textarea rows="3" value={form.recepcion.detalleObjetos} placeholder="Ej: Gafas y cargador en la consola" onChange={(e) => cambiar("recepcion", "detalleObjetos", mayusculas(e.target.value))} className="mt-3 w-full rounded-xl border p-3" />
              )}
            </Inspection>
          </div>
          <Field label="Observaciones adicionales">
            <textarea rows="3" value={form.recepcion.observaciones} placeholder="Ej: Cliente entrega una sola llave" onChange={(e) => cambiar("recepcion", "observaciones", mayusculas(e.target.value))} className="w-full rounded-xl border p-3" />
          </Field>
        </FormSection>

        <FormSection title="Servicios solicitados">
          {errorPrecios && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorPrecios}</p>}
          <ServiceHeader
            title="Polarizado y película de seguridad"
            button="Agregar material"
            onAdd={agregarMaterialPolarizado}
          />
          {form.polarizados.map((item, index) => (
            <ServiceRow
              key={`polarizado-${index}`}
              rowRef={index === form.polarizados.length - 1 ? nuevoPolarizadoRef : undefined}
              onRemove={() => quitarItem("polarizados", index)}
            >
              <div className="md:col-span-3">
                <Field label="Material y clasificación disponible">
                  <select
                    value={item.materialClave || ""}
                    disabled={cargandoMateriales}
                    onChange={(e) => seleccionarMaterial(index, e.target.value)}
                    className="w-full rounded-xl border bg-white p-3 disabled:bg-slate-100"
                  >
                    <option value="">
                      {cargandoMateriales ? "Cargando materiales..." : "Seleccione material y porcentaje..."}
                    </option>
                    {opcionesMaterial.map((opcion) => (
                      <option key={opcion.clave} value={opcion.clave}>
                        {opcion.material} - {opcion.porcentaje} - {Number(opcion.metrosDisponibles || 0).toFixed(2)} m disponibles
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="md:col-span-3">
                <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Partes del carro</span>
                <div className="flex flex-wrap gap-2">
                  {PARTES_POLARIZADO.map(([valor, etiqueta]) => {
                    const activa = item.partes.includes(valor);
                    return (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => alternarPartePolarizado(index, valor)}
                        className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${activa ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"}`}
                      >
                        {etiqueta}
                      </button>
                    );
                  })}
                </div>
              </div>
              {!form.garantia.esGarantia && <div className="md:col-span-3">
                <PrecioServicio lista={preciosVenta} selecciones={item.tarifasVenta} valor={item.valor} familia="POLARIZADO" material={item.material} clasificacion={item.porcentaje} partes={item.partes} key={`${item.materialClave}-${item.partes.join("|")}`} cargando={cargandoPrecios} registrado={Boolean(asesoria)} onChange={(tarifas) => asignarTarifas("polarizados", index, tarifas)} />
              </div>}
            </ServiceRow>
          ))}

          <ServiceHeader
            title="PPF"
            button="Agregar PPF"
            onAdd={() => agregarItem("ppf", { referencia: "", aplicacion: "EXTERIOR", piezas: [], valor: "", cotizacionModo: "PIEZAS", medidasPiezas: [], margenTecnicoCm: 0, dificultad: "MEDIA" })}
          />
          {form.ppf.map((item, index) => (
            <ServiceRow key={`ppf-${index}`} onRemove={() => quitarItem("ppf", index)}>
              <Field label="Material PPF disponible">
                <select value={item.referencia} disabled={cargandoMateriales} onChange={(e) => seleccionarPpf(index, e.target.value)} className="w-full rounded-xl border bg-white p-3 disabled:bg-slate-100">
                  <option value="">{cargandoMateriales ? "Cargando PPF..." : "Seleccione PPF..."}</option>
                  {opcionesPpf.map((opcion) => {
                    const yaAgregado = form.ppf.some((ppf, posicion) => posicion !== index && ppf.referencia === opcion.referencia);
                    return <option key={opcion.referencia} value={opcion.referencia} disabled={yaAgregado}>PPF - {opcion.referencia} · {opcion.anchos.join(", ")} · {Number(opcion.metrosDisponibles || 0).toFixed(2)} m{yaAgregado ? " · YA AGREGADO" : ""}</option>;
                  })}
                </select>
              </Field>
              {form.vehiculo.tipo !== "MOTO" && <Field label="Aplicación">
                <select value={item.aplicacion === "PIEZAS" ? "EXTERIOR" : item.aplicacion} onChange={(e) => seleccionarAplicacionPpf(index, e.target.value)} className="w-full rounded-xl border bg-white p-3">
                  <option value="INTERIOR">Interior</option><option value="EXTERIOR">Exterior</option><option value="COMPLETO">Interior y exterior</option>
                </select>
              </Field>}
              <div className="md:col-span-3"><Field label="Forma de cotizar PPF">
                <select value={item.cotizacionModo || (item.comboPpfId ? "COMBO" : "TARIFA")} onChange={(e) => cambiarModoPpf(index, e.target.value)} className="w-full rounded-xl border bg-white p-3">
                  <option value="PIEZAS">Piezas pequeñas · precios estándar</option>{item.cotizacionModo === "TARIFA" && <option value="TARIFA" disabled>Cotización anterior · valor conservado</option>}
                  <option value="MEDIDAS">Piezas grandes o vehículo completo por medidas</option>
                  <option value="COMBO" disabled={!item.comboPpfId}>Combo compartido seleccionado</option>
                </select>
              </Field></div>
              {item.cotizacionModo !== "MEDIDAS" && <>
              <div className="md:col-span-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
                <Field label="Combo PPF compartido (opcional)">
                  <select value={item.comboPpfId || ""} disabled={!item.referencia} onChange={(e) => seleccionarComboPpf(index, e.target.value)} className="w-full rounded-xl border bg-white p-3">
                    <option value="">Sin combo · precios por piezas</option>
                    {combosCompatibles(item).map((combo) => <option key={combo._id} value={combo._id}>{combo.nombre} · $ {Number(combo.precioCombo).toLocaleString("es-CO")} · ahorro $ {Math.max(Number(combo.precioIndividual) - Number(combo.precioCombo), 0).toLocaleString("es-CO")}</option>)}
                  </select>
                </Field>
                <button type="button" onClick={() => crearComboCompartido(index)} className="rounded-lg border border-blue-300 bg-white px-3 py-3 text-xs font-bold text-blue-700 hover:bg-blue-50">Guardar selección como combo</button>
              </div>
              {item.comboPpfId && <div className="md:col-span-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><strong>{item.comboNombre}</strong> · Individual: $ {Number(item.comboPrecioIndividual).toLocaleString("es-CO")} · Combo: $ {Number(item.valor).toLocaleString("es-CO")} · Ahorro: $ {Math.max(Number(item.comboPrecioIndividual) - Number(item.valor), 0).toLocaleString("es-CO")}<span className="block text-xs">{item.comboPermiteDescuento ? `Admite hasta ${item.comboDescuentoMaximoPorcentaje}% adicional, sin bajar de $ ${Number(item.comboPrecioMinimo).toLocaleString("es-CO")}.` : "Este combo no admite descuento adicional."}</span></div>}
              </>}
              <div className="md:col-span-3">
                <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Piezas PPF</span>
                {cargandoPiezas ? (
                  <p className="text-sm text-blue-600">Cargando piezas registradas...</p>
                ) : (
                  <SelectorPiezasPpf key={`${item.aplicacion}-${form.vehiculo.tipo}`} aplicacion={item.aplicacion} tipoVehiculo={form.vehiculo.tipo} catalogo={piezasPpf} precios={preciosVenta} estandar={item.cotizacionModo === "PIEZAS"} seleccionadas={item.piezas} onToggle={(pieza, detalle) => alternarPiezaPpf(index, pieza, detalle)} />
                )}
              </div>
              {!form.garantia.esGarantia && item.cotizacionModo === "PIEZAS" && <div className="md:col-span-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h4 className="font-bold text-emerald-900">Detalle y total de PPF</h4>
                <p className="mb-3 text-xs text-slate-600">Precio estándar por presentación, independiente del costo del rollo.</p>
                {(item.tarifasVenta || []).map((tarifa) => <div key={tarifa.codigo} className="flex justify-between gap-3 border-b border-emerald-100 py-2 text-sm"><span>{preciosVenta.find((f) => f.codigo === tarifa.codigo)?.descripcion || tarifa.descripcion}</span><strong>$ {Number(tarifa.total).toLocaleString("es-CO")}</strong></div>)}
                {item.errorPiezas && <p role="alert" className="my-2 text-sm text-amber-800">{item.errorPiezas} Configura el precio en Administración o utiliza cotización por medidas.</p>}
                <p className="mt-3 text-right font-bold text-emerald-900">Total: $ {Number(item.valor || 0).toLocaleString("es-CO")}</p>
              </div>}
              {item.cotizacionModo === "MEDIDAS" && <div className="md:col-span-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-blue-100 bg-white p-3 text-xs text-slate-600"><strong className="block text-blue-800">Ingrese la medida final de corte</strong>Incluya directamente toda la holgura necesaria para cada lado de la pieza. Si el guardafango incluye el paral, divídelo para medir la zona ancha y la tira angosta por separado; completa nuevamente las medidas de cada sección.</div><Field label="Dificultad de instalación"><select value={item.dificultad || "MEDIA"} onChange={(e) => editarCalculoPpf(index, "dificultad", e.target.value)} className="w-full rounded-lg border bg-white p-2.5"><option value="FACIL">Fácil · material 35% del precio</option><option value="MEDIA">Media · material 30%</option><option value="ALTA">Alta · material 25%</option><option value="ESPECIAL">Especial · material 20%</option></select></Field></div>
                {!item.piezas.length && <p className="text-xs text-amber-800">Seleccione arriba las piezas grandes que desea medir.</p>}
                {(item.medidasPiezas || []).map((medida) => <div key={medida.pieza} className="grid gap-2 rounded-lg border border-blue-100 bg-white p-3 sm:grid-cols-[1fr_120px_120px_90px] sm:items-end">
                  <div><p className="text-sm font-bold text-slate-800">{medida.pieza}</p>
                    {(() => { const detalle = subtotalesMedidasPpf(item).find((p) => p.pieza === medida.pieza); return <p className="mt-1 text-xs font-semibold text-blue-700">{detalle.areaM2.toFixed(3)} m² · Subtotal de esta pieza: {form.garantia.esGarantia ? "Sin cobro por garantía" : detalle.areaM2 > 0 && Number(item.costoPromedioM2) > 0 ? `$ ${detalle.subtotal.toLocaleString("es-CO")}` : "Completa medidas y costo del material"}</p>; })()}
                    {/GUARDAFANGO/i.test(medida.pieza) && !/SECCION ANCHA|TIRA DEL PARAL/.test(medida.pieza) && <button type="button" onClick={() => dividirGuardafangoPpf(index, medida.pieza)} className="mt-2 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-50">Dividir en guardafango + tira del paral</button>}
                    {/SECCION ANCHA|TIRA DEL PARAL/.test(medida.pieza) && <p className="mt-1 text-xs text-slate-500">Mide solo esta sección, sin superponerla con la otra. Puedes quitar la sección que no se instalará desde las piezas seleccionadas.</p>}
                  </div>
                  <Field label="Ancho final (cm)"><input type="number" min="1" max="1000" step="0.1" value={medida.anchoCm} onChange={(e) => editarMedidaPpf(index, medida.pieza, "anchoCm", e.target.value)} className="w-full rounded-lg border p-2" /></Field>
                  <Field label="Largo final (cm)"><input type="number" min="1" max="2000" step="0.1" value={medida.largoCm} onChange={(e) => editarMedidaPpf(index, medida.pieza, "largoCm", e.target.value)} className="w-full rounded-lg border p-2" /></Field>
                  <Field label="Cantidad"><input type="number" min="1" max="50" step="1" value={medida.cantidad} onChange={(e) => editarMedidaPpf(index, medida.pieza, "cantidad", e.target.value)} className="w-full rounded-lg border p-2" /></Field>
                  {Number(medida.anchoCm || 0) > 0 && Number(medida.largoCm || 0) > 0 && <p className="text-xs text-blue-700 sm:col-span-4">Medida final que se enviará a corte: <strong>{(Number(medida.anchoCm) / 100).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} × {(Number(medida.largoCm) / 100).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} m</strong>, con la holgura ya incluida.</p>}
                </div>)}
                {Number(item.costoPromedioM2 || 0) <= 0 ? <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Este material todavía no tiene costo registrado en inventario. Costéalo antes de utilizar el cotizador por medidas.</p> : <div className="grid gap-2 text-sm sm:grid-cols-3"><div><span className="block text-xs text-slate-500">Área final de corte</span><strong>{Number(item.areaFacturableM2 || 0).toFixed(2)} m²</strong></div><div><span className="block text-xs text-slate-500">Costo material</span><strong>$ {Number(item.costoMaterialEstimado || 0).toLocaleString("es-CO")}</strong></div><div><span className="block text-xs text-slate-500">Precio sugerido</span><strong className="text-blue-800">$ {Number(item.valor || 0).toLocaleString("es-CO")}</strong></div></div>}
              </div>}
              {item.cotizacionModo === "TARIFA" && <p className="md:col-span-3 rounded-xl bg-slate-100 p-3 text-sm">Valor de cotización anterior conservado: $ {Number(item.valor || 0).toLocaleString("es-CO")}. Para cambiar el trabajo, selecciona precios por piezas o cotización por medidas.</p>}
              <p className="text-xs text-slate-500 md:col-span-3">Todas las piezas de esta referencia PPF se envían como un solo servicio{form.garantia.esGarantia ? " sin cobro al cliente" : " y se cobran juntas"}.</p>
            </ServiceRow>
          ))}

          <ServiceHeader
            title="Servicios del catálogo"
            button="Agregar servicio"
            onAdd={() => agregarItem("serviciosAdicionales", { tipo: "", detalle: "", valor: "", catalogoId: "" })}
          />
          <p className="text-sm text-slate-600">Detailing, instalaciones, aseguradas y vinilo del catálogo compartido con mano de obra. Selecciona la tarifa definida por Administración para cada servicio.</p>
          {errorCatalogoServicios && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">No se pudo cargar el catálogo de servicios. Cierra y vuelve a abrir el formulario para consultar las opciones.</p>}
          {form.serviciosAdicionales.map((item, index) => (
            <ServiceRow key={`adicional-${index}`} onRemove={() => quitarItem("serviciosAdicionales", index)}>
              <div className="md:col-span-3"><Field label="Servicio del catálogo">
                <select
                  value={item.catalogoId || catalogoServicios.find((opcion) => opcion.categoria === item.tipo && opcion.nombre === item.detalle)?._id || ""}
                  onChange={(e) => {
                    const servicio = catalogoServicios.find((opcion) => opcion._id === e.target.value);
                    setForm((actual) => ({ ...actual, serviciosAdicionales: actual.serviciosAdicionales.map((fila, posicion) => posicion === index ? { ...fila, catalogoId: servicio?._id || "", tipo: servicio?.categoria || "", detalle: servicio?.nombre || "", valor: "", tarifasVenta: [] } : fila) }));
                  }}
                  className="w-full rounded-xl border bg-white p-3"
                >
                  <option value="">Seleccione el trabajo...</option>
                  {[...new Set(catalogoServicios.map((opcion) => opcion.categoria))].map((categoria) => (
                    <optgroup key={categoria} label={categoria}>
                      {catalogoServicios.filter((opcion) => opcion.categoria === categoria).map((opcion) => (
                        <option key={opcion._id} value={opcion._id}>{opcion.nombre}{opcion.precioSugerido ? ` · ${Number(opcion.precioSugerido).toLocaleString("es-CO")}` : ""}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field></div>
              {!form.garantia.esGarantia && <div className="md:col-span-3"><PrecioServicio lista={preciosVenta} selecciones={item.tarifasVenta} valor={item.valor} familia="SERVICIO" categoria={item.tipo} detalle={item.detalle} cargando={cargandoPrecios} registrado={Boolean(asesoria)} onChange={(tarifas) => asignarTarifas("serviciosAdicionales", index, tarifas)} /></div>}
            </ServiceRow>
          ))}

          <ServiceHeader
            title="Accesorios del vehículo"
            button="Agregar accesorio"
            onAdd={() => agregarItem("accesorios", { accesorioId: "", cantidad: "1", precioUnitario: "" })}
          />
          {form.accesorios.map((item, index) => {
            const producto = catalogoAccesorios.find((opcion) => opcion._id === item.accesorioId);
            return <ServiceRow key={`accesorio-${index}`} onRemove={() => quitarItem("accesorios", index)}>
              <div className="md:col-span-3"><Field label="Accesorio"><select value={item.accesorioId} onChange={(e) => seleccionarAccesorio(index, e.target.value)} className="w-full rounded-xl border bg-white p-3"><option value="">Seleccione producto...</option>{catalogoAccesorios.map((opcion) => { const usado = form.accesorios.some((actual, posicion) => posicion !== index && actual.accesorioId === opcion._id); return <option key={opcion._id} value={opcion._id} disabled={usado}>{opcion.nombre} · {opcion.marca}{opcion.referencia ? ` · ${opcion.referencia}` : ""} · {opcion.stock > 0 ? `${opcion.stock} disponibles` : "AGOTADO · SE SOLICITARÁ"}</option>; })}</select>{producto?.stock <= 0 && item.accesorioId && <span className="mt-1 block text-xs font-semibold text-amber-700">Puede incluirlo. Inventario y Administración recibirán una alerta para pedirlo.</span>}</Field></div>
              <Field label="Cantidad"><input value={item.cantidad} inputMode="numeric" onChange={(e) => editarItem("accesorios", index, "cantidad", soloDigitos(e.target.value).slice(0, 3))} className="w-full rounded-xl border p-3"/><span className="mt-1 block text-xs text-slate-500">Máximo disponible: {producto?.stock || 0}</span></Field>
              {!form.garantia.esGarantia && <div className="md:col-span-2"><PrecioServicio lista={preciosVenta} selecciones={item.tarifasVenta} valor={item.precioUnitario} familia="ACCESORIO" categoria={producto?.categoria || ""} detalle={`${producto?.nombre || ""} ${producto?.marca || ""} ${producto?.referencia || ""}`} cargando={cargandoPrecios} registrado={Boolean(asesoria)} onChange={(tarifas) => asignarTarifas("accesorios", index, tarifas)} /><p className="mt-1 text-xs font-semibold text-blue-700">Subtotal del accesorio: $ {Number(Number(item.cantidad || 0) * Number(item.precioUnitario || 0)).toLocaleString("es-CO")}</p></div>}
            </ServiceRow>;
          })}
          {form.serviciosAdicionales.some((item) => item.tipo === "ASEGURADA") && <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">Para una asegurada general, agregue aquí los marcos, tapetes u otros productos que se entregarán. El stock se descontará al guardar.</p>}

        </FormSection>

        {!form.garantia.esGarantia ? <FormSection title="Acuerdo comercial">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Valor de venta">
              <input
                value={formatearMiles(valorServicios)}
                readOnly
                className="w-full rounded-xl border bg-slate-100 p-3 font-bold text-slate-800"
              />
            </Field>
            <Field label="Forma de pago prevista">
              <select value={form.comercial.metodoPagoPrevisto} onChange={(e) => cambiar("comercial", "metodoPagoPrevisto", e.target.value)} className="w-full rounded-xl border p-3">
                <option value="POR_DEFINIR">Por definir</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="CREDITO">Crédito</option>
                <option value="MIXTO">Pago mixto</option>
              </select>
            </Field>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="flex items-center justify-between gap-3 font-semibold text-slate-700">
                <span>¿Aplica descuento?</span>
                <input type="checkbox" checked={form.comercial.aplicaDescuento} onChange={(e) => cambiar("comercial", "aplicaDescuento", e.target.checked)} className="h-5 w-5" />
              </label>
            </div>
          </div>

          {form.comercial.aplicaDescuento && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Valor del descuento">
                <input
                  value={formatearMiles(form.comercial.descuento)}
                  inputMode="numeric"
                  placeholder="Ej: 100.000"
                  onChange={(e) => cambiar("comercial", "descuento", soloDigitos(e.target.value))}
                  className="w-full rounded-xl border p-3"
                />
              </Field>
              <div className="metric-card rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase text-blue-600">Total acordado</p>
                <p className="metric-value mt-1 font-bold text-blue-800">
                  ${Math.max(valorServicios - Number(form.comercial.descuento || 0), 0).toLocaleString("es-CO")}
                </p>
              </div>
            </div>
          )}

          {!form.comercial.aplicaDescuento && (
            <div className="metric-card rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase text-blue-600">Total acordado</p>
              <p className="metric-value mt-1 font-bold text-blue-800">${valorServicios.toLocaleString("es-CO")}</p>
            </div>
          )}

          <p className="text-xs text-slate-500">
            El pago queda pendiente. Ventas lo confirmará cuando el servicio esté completo.
          </p>
        </FormSection> : <FormSection title="Tratamiento económico de la garantía">
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
            <p className="font-bold">Esta orden no genera venta ni pago del cliente.</p>
            <p className="mt-1 text-xs">Inventario calculará el costo real del material consumido. Si responde el instalador se descontará de su liquidación; si responde la empresa será un costo interno; si responde el proveedor quedará registrado para reclamación.</p>
          </div>
        </FormSection>}

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="button" disabled={guardando} onClick={guardar} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            <Save size={18} /> {guardando ? "Guardando..." : asesoria ? "Guardar corrección" : "Guardar recepción"}
          </button>
        </div>
      </div>
    </AppModal>
  );
}

function FormSection({ title, children }) {
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4"><h3 className="font-bold text-slate-800">{title}</h3>{children}</section>;
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold uppercase text-slate-500">{label}</span>{children}</label>;
}

function Inspection({ label, checked, onChange, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <label className="flex items-center justify-between gap-3 font-semibold text-slate-700">
        <span>{label}</span>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5" />
      </label>
      {children}
    </div>
  );
}

function ServiceHeader({ title, button, onAdd }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2 pt-2"><h4 className="font-bold text-slate-800">{title}</h4><button type="button" onClick={onAdd} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white"><Plus size={16} />{button}</button></div>;
}

function ServiceRow({ children, onRemove, rowRef }) {
  return <div ref={rowRef} className="scroll-mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_1fr_auto]">{children}<button type="button" onClick={onRemove} title="Quitar" className="flex h-11 w-11 items-center justify-center self-end rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={18} /></button></div>;
}

export default AsesoriaFormModal;
