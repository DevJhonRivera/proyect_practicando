import { useEffect, useMemo, useState } from "react";
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

const PIEZAS_PPF_EXTERIOR = ["PUERTAS", "BOMPER DELANTERO", "BOMPER TRASERO", "TECHO", "SPOILER", "PARALES", "STOPS", "RETROVISORES", "TRIANGULOS", "FAROLAS", "CAPOT", "BAUL", "GUARDAFANGOS", "ESTRIBOS", "MANIJAS"];
const PIEZAS_PPF_INTERIOR = ["PANTALLA", "CAJA CAMBIOS", "NEGRO PIANO", "CONSOLA CENTRAL", "TABLERO", "BOTONERA", "MOLDURAS", "PUERTAS INTERIORES"];

const piezasParaAplicacion = (catalogo, aplicacion) => {
  const ubicaciones = aplicacion === "COMPLETO" ? ["INTERIOR", "EXTERIOR"] : [aplicacion === "INTERIOR" ? "INTERIOR" : "EXTERIOR"];
  return ubicaciones.flatMap((ubicacion) => {
    const registradas = (catalogo || []).filter((pieza) => pieza.ubicacion === ubicacion);
    const base = ubicacion === "INTERIOR" ? PIEZAS_PPF_INTERIOR : PIEZAS_PPF_EXTERIOR;
    const porNombre = new Map(
      base.map((pieza) => [pieza, { pieza, ubicacion, anchoCm: 0, largoCm: 0, _id: `${ubicacion}-${pieza}` }])
    );
    registradas.forEach((pieza) => porNombre.set(pieza.pieza, pieza));
    return [...porNombre.values()];
  });
};

const inicial = {
  cliente: { cedula: "", nombre: "", telefono: "", correo: "" },
  vehiculo: { placa: "", marca: "", modelo: "", anio: "", color: "" },
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
    recepcion: { ...inicial.recepcion, ...asesoria.recepcion },
    polarizados: (asesoria.polarizados || []).map((item) => {
      const porcentaje = String(item.porcentaje || "");
      const unidad = porcentaje.toUpperCase().includes("MICRAS") ? "MICRAS" : "PORCENTAJE";
      const numero = Number(porcentaje.match(/[\d.]+/)?.[0] || 0);
      return {
        material: item.material || "",
        porcentaje,
        partes: [...(item.partes || [])],
        valor: String(item.valor || ""),
        materialClave: `${item.material}|${unidad}|${numero}`,
      };
    }),
    ppf: (asesoria.ppf || []).map((item) => ({
      referencia: item.referencia || "",
      aplicacion: item.aplicacion || "PIEZAS",
      piezas: [...(item.piezas || [])],
      piezaPersonalizada: "",
      valor: String(item.valor || ""),
    })),
    serviciosAdicionales: (asesoria.serviciosAdicionales || []).map((item) => ({
      tipo: item.tipo || "",
      detalle: item.detalle || "",
      valor: String(item.valor || ""),
    })),
    accesorios: (asesoria.accesorios || []).map((item) => ({
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
      .catch(() => setCatalogoServicios([]));
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
    getPiezasPpf({ marca, modelo, anio })
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
  }, [form.vehiculo.anio, form.vehiculo.marca, form.vehiculo.modelo]);

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
        const actual = grupos.get(referencia) || { referencia, metrosDisponibles: 0, anchos: new Set() };
        actual.metrosDisponibles += Number(item.metrosDisponibles || 0);
        if (item.ancho) actual.anchos.add(anchoLabel(item.ancho));
        grupos.set(referencia, actual);
      });
    return Array.from(grupos.values()).map((item) => ({
      ...item,
      anchos: Array.from(item.anchos),
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
            }
          : item
      ),
    }));
  };
  const seleccionarPpf = (index, referencia) => {
    setForm((actual) => ({
      ...actual,
      ppf: actual.ppf.map((item, posicion) =>
        posicion === index ? { ...item, referencia } : item
      ),
    }));
  };
  const alternarPiezaPpf = (index, pieza) => {
    setForm((actual) => ({
      ...actual,
      ppf: actual.ppf.map((item, posicion) => {
        if (posicion !== index) return item;
        const piezas = item.piezas || [];
        return {
          ...item,
          piezas: piezas.includes(pieza)
            ? piezas.filter((actual) => actual !== pieza)
            : [...piezas, pieza],
        };
      }),
    }));
  };
  const seleccionarAplicacionPpf = (index, aplicacion) => setForm((actual) => ({ ...actual, ppf: actual.ppf.map((item, posicion) => posicion === index ? { ...item, aplicacion, piezas: [] } : item) }));
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
          ...item,
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
    setForm((actual) => ({
      ...actual,
      polarizados: actual.polarizados.map((item) => ({ ...item, valor: esGarantia ? "" : item.valor })),
      ppf: actual.ppf.map((item) => ({ ...item, valor: esGarantia ? "" : item.valor })),
      serviciosAdicionales: actual.serviciosAdicionales.map((item) => ({ ...item, valor: esGarantia ? "" : item.valor })),
      accesorios: actual.accesorios.map((item) => ({ ...item, precioUnitario: esGarantia ? "" : item.precioUnitario })),
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
    if (!accesoriosValidos) return Swal.fire({ icon: "warning", title: "Complete los accesorios, cantidades y precios" });
    if (!form.garantia.esGarantia && !preciosValidos) {
      return Swal.fire({ icon: "warning", title: "Ingrese el precio de cada servicio" });
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
      await Swal.fire({
        icon: "success",
        title: asesoria ? "Servicio actualizado" : "Recepción guardada",
        text: `Código ${response.data?.data?.codigo || asesoria?.codigo || "creado"}`,
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
      subtitle={asesoria ? "Corrección administrativa de todos los datos registrados" : "Identifica al cliente y deja constancia del estado del carro"}
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
            <Field label="Correo (opcional)">
              <input type="email" value={form.cliente.correo} placeholder="Ej: cliente@correo.com" onChange={(e) => cambiar("cliente", "correo", e.target.value.toLowerCase())} className="w-full rounded-xl border p-3" />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Datos del vehículo">
          <div className="grid gap-4 md:grid-cols-3">
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
          <ServiceHeader
            title="Polarizado y película de seguridad"
            button="Agregar material"
            onAdd={() => agregarItem("polarizados", { material: "", porcentaje: "", materialClave: "", partes: [], valor: "" })}
          />
          {form.polarizados.map((item, index) => (
            <ServiceRow key={`polarizado-${index}`} onRemove={() => quitarItem("polarizados", index)}>
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
              {!form.garantia.esGarantia && <div className="md:col-span-3">
                <Field label="Precio de este servicio">
                  <input value={formatearMiles(item.valor)} inputMode="numeric" placeholder="Ej: 450.000" onChange={(e) => editarItem("polarizados", index, "valor", soloDigitos(e.target.value))} className="w-full rounded-xl border p-3" />
                </Field>
              </div>}
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
            </ServiceRow>
          ))}

          <ServiceHeader
            title="PPF"
            button="Agregar PPF"
            onAdd={() => agregarItem("ppf", { referencia: "", aplicacion: "EXTERIOR", piezas: [], valor: "" })}
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
              <Field label="Aplicación">
                <select value={item.aplicacion === "PIEZAS" ? "EXTERIOR" : item.aplicacion} onChange={(e) => seleccionarAplicacionPpf(index, e.target.value)} className="w-full rounded-xl border bg-white p-3">
                  <option value="INTERIOR">Interior</option><option value="EXTERIOR">Exterior</option><option value="COMPLETO">Interior y exterior</option>
                </select>
              </Field>
              <div className="md:col-span-3">
                <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Piezas PPF</span>
                {cargandoPiezas ? (
                  <p className="text-sm text-blue-600">Cargando piezas registradas...</p>
                ) : (
                  <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {piezasParaAplicacion(piezasPpf, item.aplicacion).map((pieza) => {
                      const activa = item.piezas.includes(pieza.pieza);
                      return <button key={`${pieza.ubicacion}-${pieza.pieza}`} type="button" role="checkbox" aria-checked={activa} onClick={() => alternarPiezaPpf(index, pieza.pieza)} className={`min-h-11 rounded-md border px-2 py-1.5 text-left transition ${activa ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-blue-50"}`}><span className="block text-xs font-bold leading-tight">{activa ? "✓ " : ""}{pieza.pieza}</span><span className={`mt-0.5 block text-[10px] leading-tight ${activa ? "text-blue-100" : "text-slate-400"}`}>{pieza.ubicacion}{Number(pieza.anchoCm || 0) > 0 ? ` · ${Number(pieza.anchoCm)} × ${Number(pieza.largoCm)} cm` : ""}</span></button>;
                    })}
                  </div>
                )}
              </div>
              {!form.garantia.esGarantia && <div className="md:col-span-3"><Field label="Precio del PPF"><input value={formatearMiles(item.valor)} inputMode="numeric" placeholder="Ej: 800.000" onChange={(e) => editarItem("ppf", index, "valor", soloDigitos(e.target.value))} className="w-full rounded-xl border p-3" /></Field></div>}
              <p className="text-xs text-slate-500 md:col-span-3">Todas las piezas de esta referencia PPF se envían como un solo servicio{form.garantia.esGarantia ? " sin cobro al cliente" : " y se cobran juntas"}.</p>
            </ServiceRow>
          ))}

          <ServiceHeader
            title="Otros trabajos"
            button="Agregar servicio"
            onAdd={() => agregarItem("serviciosAdicionales", { tipo: "", detalle: "", valor: "", catalogoId: "" })}
          />
          {form.serviciosAdicionales.map((item, index) => (
            <ServiceRow key={`adicional-${index}`} onRemove={() => quitarItem("serviciosAdicionales", index)}>
              <div className="md:col-span-3"><Field label="Servicio del catálogo">
                <select
                  value={item.catalogoId || catalogoServicios.find((opcion) => opcion.categoria === item.tipo && opcion.nombre === item.detalle)?._id || ""}
                  onChange={(e) => {
                    const servicio = catalogoServicios.find((opcion) => opcion._id === e.target.value);
                    setForm((actual) => ({ ...actual, serviciosAdicionales: actual.serviciosAdicionales.map((fila, posicion) => posicion === index ? { ...fila, catalogoId: servicio?._id || "", tipo: servicio?.categoria || "", detalle: servicio?.nombre || "", valor: servicio?.precioSugerido ? String(servicio.precioSugerido) : fila.valor } : fila) }));
                  }}
                  className="w-full rounded-xl border bg-white p-3"
                >
                  <option value="">Seleccione el trabajo...</option>
                  {catalogoServicios.map((opcion) => <option key={opcion._id} value={opcion._id}>{opcion.categoria} · {opcion.nombre}{opcion.precioSugerido ? ` · $${Number(opcion.precioSugerido).toLocaleString("es-CO")}` : ""}</option>)}
                </select>
              </Field></div>
              {!form.garantia.esGarantia && <div className="md:col-span-3"><Field label="Precio del servicio"><input value={formatearMiles(item.valor)} inputMode="numeric" placeholder="Ej: 80.000" onChange={(e) => editarItem("serviciosAdicionales", index, "valor", soloDigitos(e.target.value))} className="w-full rounded-xl border p-3" /></Field></div>}
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
              {!form.garantia.esGarantia && <div className="md:col-span-2"><Field label="Precio unitario"><input value={formatearMiles(item.precioUnitario)} inputMode="numeric" placeholder="Ej: 120.000" onChange={(e) => editarItem("accesorios", index, "precioUnitario", soloDigitos(e.target.value))} className="w-full rounded-xl border p-3"/><span className="mt-1 block text-xs font-semibold text-blue-700">Subtotal: ${Number(Number(item.cantidad || 0) * Number(item.precioUnitario || 0)).toLocaleString("es-CO")}</span></Field></div>}
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

function ServiceRow({ children, onRemove }) {
  return <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_1fr_auto]">{children}<button type="button" onClick={onRemove} title="Quitar" className="flex h-11 w-11 items-center justify-center self-end rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={18} /></button></div>;
}

export default AsesoriaFormModal;
