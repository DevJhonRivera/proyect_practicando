import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  BadgeDollarSign,
  Car,
  CheckCircle2,
  ClipboardList,
  Eye,
  Pencil,
  Plus,
  Save,
  Search,
  ReceiptText,
  Trash2,
  User,
} from "lucide-react";

import { getCortes } from "../../api/cortes.api";
import { getAsesoriaPorId } from "../../api/asesores.api";
import {
  createVenta,
  getVentas,
  updateVenta,
  createMovimientoPago,
  updateEstadoVenta,
} from "../../api/ventas.api";
import ExcelButton from "../../components/ui/ExcelButton";
import MonthFilter from "../../components/ui/MonthFilter";
import TablePagination from "../../components/ui/TablePagination";
import { useMonthFilter } from "../../hooks/useMonthFilter";
import { usePagination } from "../../hooks/usePagination";
import { etiquetaDetalle } from "../../utils/materiales";
import { obtenerUsuarioActual } from "../../utils/permisos";
import { generarFacturaVenta } from "../../utils/facturaVenta";

const formatoCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const servicioLabels = {
  POLARIZADO: "Polarizado",
  PPF: "PPF",
  PELICULA_SEGURIDAD: "Pelicula de seguridad",
  LAVADO: "Lavado",
  POLICHADA: "Polichada",
  PDR: "PDR",
  ASEGURADA: "Asegurada",
  OTRO: "Otro",
};

const serviciosAdicionales = [
  "LAVADO",
  "POLICHADA",
  "PDR",
  "ASEGURADA",
  "OTRO",
];

const entidadesPorMetodo = {
  TRANSFERENCIA: ["BANCOLOMBIA SANTIAGO", "BANCOLOMBIA RAFAEL", "BANCOLOMBIA AUTOS", "BBVA"],
  DATAFONO: ["BBVA"],
  OTROS: ["SISTECREDITO", "ADDI"],
};

const opcionesMetodoPago = `
  <option value="">Seleccione...</option>
  <option value="EFECTIVO">Efectivo</option>
  <option value="TRANSFERENCIA">Transferencia</option>
  <option value="DATAFONO">Datáfono</option>
  <option value="OTROS">Otros</option>
`;

const ventaInicial = {
  asesoriaId: "",
  cliente: {
    nombre: "",
    telefono: "",
    cedula: "",
    correo: "",
  },
  vehiculo: {
    placa: "",
    marca: "",
    modelo: "",
    referencia: "",
    anio: "",
    color: "",
  },
  estado: "PENDIENTE",
  descuento: "",
  metodoPago: "POR_DEFINIR",
  entidadPago: "",
  comprobanteImagen: "",
  comprobanteNombre: "",
  valorPago: "",
  observaciones: "",
  items: [],
};

const itemManualInicial = {
  tipoServicio: "LAVADO",
  descripcion: "",
  cantidad: 1,
  valorUnitario: "",
};

const mayusculas = (value) =>
  String(value || "").toUpperCase();

const soloNumeros = (value) =>
  String(value || "").replace(/\D/g, "");

const normalizarPlaca = (value) =>
  mayusculas(value).replace(/\s+/g, "").trim();

const soloDigitos = (value) =>
  String(value ?? "").replace(/\D/g, "");

const formatearMiles = (value) => {
  const digitos = soloDigitos(value);
  return digitos ? Number(digitos).toLocaleString("es-CO") : "";
};

const numeroDesdeMiles = (value) =>
  Number(soloDigitos(value) || 0);

const placaValida = (value) =>
  normalizarPlaca(value).length >= 5 &&
  normalizarPlaca(value).length <= 10;

const optimizarComprobante = (file) => new Promise((resolve, reject) => {
  if (!file) return resolve({ comprobanteImagen: "", comprobanteNombre: "" });
  if (!file.type.startsWith("image/")) return reject(new Error("Seleccione una imagen válida"));
  if (file.size > 10 * 1024 * 1024) return reject(new Error("La imagen original no puede superar 10 MB"));
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("No fue posible leer la imagen"));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error("La imagen no es válida"));
    image.onload = () => {
      const limite = 1400;
      const escala = Math.min(1, limite / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * escala));
      canvas.height = Math.max(1, Math.round(image.height * escala));
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const comprobanteImagen = canvas.toDataURL("image/jpeg", 0.76);
      if (comprobanteImagen.length > 2_200_000) return reject(new Error("La imagen sigue siendo demasiado pesada; use una foto más pequeña"));
      resolve({ comprobanteImagen, comprobanteNombre: file.name });
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

const llenarEntidadesPago = (popup, metodo) => {
  const contenedor = popup?.querySelector("#pago-entidad-contenedor");
  const select = popup?.querySelector("#pago-entidad");
  const opciones = entidadesPorMetodo[metodo] || [];
  if (!contenedor || !select) return;
  contenedor.style.display = opciones.length ? "block" : "none";
  select.innerHTML = `<option value="">Seleccione...</option>${opciones.map((item) => `<option value="${item}">${item}</option>`).join("")}`;
};

function VentasPage() {
  const usuario = obtenerUsuarioActual();
  const puedeEditar = ["ADMIN", "SUPERUSUARIO"].includes(usuario?.rol);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const asesoriaCargadaRef = useRef("");
  const [ventas, setVentas] = useState([]);
  const [cortes, setCortes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroVerificacion, setFiltroVerificacion] =
    useState("PENDIENTES");
  const [form, setForm] = useState(ventaInicial);
  const [corteSeleccionado, setCorteSeleccionado] =
    useState("");
  const [valorCorte, setValorCorte] = useState("");
  const [itemManual, setItemManual] =
    useState(itemManualInicial);
  const [vistaVentas, setVistaVentas] =
    useState("cortes");
  const {
    filteredItems: ventasDelMes,
    month: mesVentas,
    setMonth: setMesVentas,
  } = useMonthFilter(ventas);

  const cargar = async () => {
    try {
      setLoading(true);
      const [ventasRes, cortesRes] =
        await Promise.all([
          getVentas(),
          getCortes(),
        ]);

      setVentas(ventasRes.data || []);
      setCortes(cortesRes.data || []);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error cargando ventas",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const cargarInicial = async () => {
      try {
        const [ventasRes, cortesRes] =
          await Promise.all([
            getVentas(),
            getCortes(),
          ]);

        if (active) {
          setVentas(ventasRes.data || []);
          setCortes(cortesRes.data || []);
        }
      } catch (error) {
        console.error(error);
        Swal.fire({
          icon: "error",
          title: "Error cargando ventas",
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

  useEffect(() => {
    const asesoriaId = searchParams.get("asesoria");
    if (!asesoriaId || loading || asesoriaCargadaRef.current === asesoriaId) return;
    asesoriaCargadaRef.current = asesoriaId;
    getAsesoriaPorId(asesoriaId)
      .then((response) => {
        const orden = response.data?.data;
        if (!orden) return;
        const cortesOrden = cortes.filter((corte) => String(corte.asesoriaId || "") === asesoriaId);
        const cortesLinea = (etiqueta) => cortesOrden.filter((corte) => corte.asesoriaLinea === etiqueta).map((corte) => corte._id);
        const items = [
          ...(orden.polarizados || []).map((item, index) => {
            const ids = cortesLinea(`POLARIZADO ${index + 1}`);
            return {
              tipoServicio: String(item.porcentaje || "").includes("MICRAS") ? "PELICULA_SEGURIDAD" : "POLARIZADO",
              descripcion: `${item.material} ${item.porcentaje} - ${(item.partes || []).join(", ")}`,
              corteId: ids[0], corteIds: ids, cantidad: 1,
              valorUnitario: Number(item.valor || 0), total: Number(item.valor || 0),
            };
          }),
          ...[...(orden.ppf || []).reduce((grupos, item, index) => {
            const referencia = String(item.referencia || "PPF").trim().toUpperCase();
            const actual = grupos.get(referencia) || { referencia, piezas: [], ids: [], valor: 0 };
            actual.piezas.push(...(item.piezas?.length ? item.piezas : [item.aplicacion]).filter(Boolean));
            actual.ids.push(...cortesLinea(`PPF ${index + 1}`));
            actual.valor += Number(item.valor || 0);
            grupos.set(referencia, actual);
            return grupos;
          }, new Map()).values()].map((item) => ({
            tipoServicio: "PPF",
            descripcion: `PPF ${item.referencia} - ${[...new Set(item.piezas)].join(", ")}`,
            corteId: item.ids[0],
            corteIds: [...new Set(item.ids)],
            cantidad: 1,
            valorUnitario: item.valor,
            total: item.valor,
          })),
          ...(orden.serviciosAdicionales || []).map((item) => ({
            tipoServicio: ["LAVADO", "POLICHADA", "PDR", "ASEGURADA"].includes(item.tipo) ? item.tipo : "OTRO",
            descripcion: `${item.tipo}${item.detalle ? ` - ${item.detalle}` : ""}`,
            cantidad: 1, valorUnitario: Number(item.valor || 0), total: Number(item.valor || 0),
          })),
        ];
        setForm({
          ...ventaInicial,
          asesoriaId,
          cliente: { nombre: orden.cliente?.nombre || "", telefono: orden.cliente?.telefono || "", cedula: orden.cliente?.cedula || "", correo: orden.cliente?.correo || "" },
          vehiculo: { placa: orden.vehiculo?.placa || "", marca: orden.vehiculo?.marca || "", modelo: orden.vehiculo?.anio || "", referencia: orden.vehiculo?.modelo || "", anio: orden.vehiculo?.anio || "", color: orden.vehiculo?.color || "" },
          descuento: orden.comercial?.descuento || "",
          metodoPago: orden.comercial?.metodoPagoPrevisto === "TARJETA"
            ? "DATAFONO"
            : orden.comercial?.metodoPagoPrevisto === "CREDITO"
            ? "OTROS"
            : orden.comercial?.metodoPagoPrevisto === "MIXTO"
            ? "POR_DEFINIR"
            : orden.comercial?.metodoPagoPrevisto || "POR_DEFINIR",
          observaciones: `ORDEN ${orden.codigo}`,
          items,
          valorPago: String(Math.max(items.reduce((suma, item) => suma + Number(item.total || 0), 0) - Number(orden.comercial?.descuento || 0), 0)),
        });
        setVistaVentas("nueva");
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((error) => Swal.fire({ icon: "error", title: "No se pudo cargar la orden", text: error.response?.data?.message || "Intente nuevamente." }));
  }, [cortes, loading, searchParams]);

  const ventasFiltradas = useMemo(() => {
    const texto = search.toLowerCase();

    return ventasDelMes.filter((venta) => {
      const cliente =
        venta.cliente?.nombre || "";
      const placa =
        venta.vehiculo?.placa || "";
      const codigo =
        venta.codigoVenta || "";

      return (
        cliente.toLowerCase().includes(texto) ||
        placa.toLowerCase().includes(texto) ||
        codigo.toLowerCase().includes(texto)
      );
    });
  }, [ventasDelMes, search]);
  const paginationVentas = usePagination(ventasFiltradas);

  const subtotal = form.items.reduce(
    (acc, item) =>
      acc + Number(item.total || 0),
    0
  );

  const descuento = Number(form.descuento || 0);
  const total = Math.max(subtotal - descuento, 0);

  const gruposCortes = useMemo(
    () => agruparCortesPorCarroMaterial(cortes),
    [cortes]
  );

  const grupoActual = gruposCortes.find(
    (grupo) => grupo.key === corteSeleccionado
  );

  const gruposSinVenta = gruposCortes.filter(
    (grupo) => !grupoTieneVenta(grupo)
  );

  const placaVenta = normalizarPlaca(form.vehiculo.placa);

  const gruposSinVentaDelCarro = useMemo(() => {
    if (!placaVenta) {
      return gruposSinVenta;
    }

    return gruposSinVenta.filter(
      (grupo) => normalizarPlaca(grupo.placa) === placaVenta
    );
  }, [gruposSinVenta, placaVenta]);

  const gruposConVenta = gruposCortes.filter(
    grupoTieneVenta
  );

  const gruposVerificacion =
    filtroVerificacion === "TODOS"
      ? gruposCortes
      : filtroVerificacion === "VENDIDOS"
      ? gruposConVenta
      : gruposSinVenta;

  useEffect(() => {
    if (
      corteSeleccionado &&
      !gruposSinVentaDelCarro.some(
        (grupo) => grupo.key === corteSeleccionado
      )
    ) {
      setCorteSeleccionado("");
      setValorCorte("");
    }
  }, [corteSeleccionado, gruposSinVentaDelCarro]);

  const seleccionarCorte = (grupoKey) => {
    const grupo =
      gruposCortes.find((item) => item.key === grupoKey);

    setCorteSeleccionado(grupoKey);

    if (!grupo) {
      return;
    }

    setForm((actual) => ({
      ...actual,
      vehiculo: {
        placa:
          normalizarPlaca(grupo.placa || actual.vehiculo.placa).slice(0, 10),
        marca:
          mayusculas(grupo.marca || actual.vehiculo.marca),
        modelo:
          soloNumeros(grupo.modelo || actual.vehiculo.modelo),
      },
    }));
  };

  const cargarCorteEnVenta = (grupo) => {
    if (grupo.asesoriaId) {
      asesoriaCargadaRef.current = "";
      navigate(`/ventas?asesoria=${encodeURIComponent(grupo.asesoriaId)}`);
      return;
    }

    seleccionarCorte(grupo.key);
    setValorCorte(
      grupo.valorVenta > 0
        ? String(grupo.valorVenta)
        : ""
    );
    setVistaVentas("nueva");
  };

  const actualizarCliente = (field, value) => {
    const nuevoValor =
      field === "nombre" ? mayusculas(value) : value;

    setForm({
      ...form,
      cliente: {
        ...form.cliente,
        [field]: nuevoValor,
      },
    });
  };

  const actualizarVehiculo = (field, value) => {
    const nuevoValor =
      field === "modelo"
        ? soloNumeros(value)
        : field === "placa"
        ? normalizarPlaca(value).slice(0, 10)
        : mayusculas(value);

    setForm({
      ...form,
      vehiculo: {
        ...form.vehiculo,
        [field]: nuevoValor,
      },
    });
  };

  const agregarCorte = () => {
    if (!grupoActual) {
      return Swal.fire({
        icon: "warning",
        title: "Seleccione un grupo de cortes",
      });
    }

    if (valorCorte === "" || Number(valorCorte) < 0) {
      return Swal.fire({
        icon: "warning",
        title: "Ingrese el valor de venta del corte",
      });
    }

    const descripcion =
      mayusculas(`${servicioLabels[grupoActual.tipoServicio]} ${grupoActual.cortes.length} corte${grupoActual.cortes.length === 1 ? "" : "s"}`);

    setForm({
      ...form,
      vehiculo: {
        placa: mayusculas(grupoActual.placa || form.vehiculo.placa),
        marca: mayusculas(grupoActual.marca || form.vehiculo.marca),
        modelo: soloNumeros(grupoActual.modelo || form.vehiculo.modelo),
      },
      items: [
        ...form.items,
        {
          tipoServicio: grupoActual.tipoServicio,
          descripcion,
          corteId: grupoActual.cortes[0]?._id,
          corteIds: grupoActual.cortes.map((corte) => corte._id),
          cantidad: 1,
          valorUnitario: Number(valorCorte),
          total: Number(valorCorte),
        },
      ],
    });

    setCorteSeleccionado("");
    setValorCorte("");
  };

  const agregarServicioManual = () => {
    if (!itemManual.descripcion.trim()) {
      return Swal.fire({
        icon: "warning",
        title: "Ingrese la descripcion del servicio",
      });
    }

    if (
      itemManual.valorUnitario === "" ||
      Number(itemManual.valorUnitario) < 0
    ) {
      return Swal.fire({
        icon: "warning",
        title: "Ingrese el valor del servicio",
      });
    }

    const cantidad =
      Math.max(Number(itemManual.cantidad || 1), 1);
    const valorUnitario =
      Number(itemManual.valorUnitario || 0);

    setForm({
      ...form,
      items: [
        ...form.items,
        {
          ...itemManual,
          descripcion: mayusculas(itemManual.descripcion),
          cantidad,
          valorUnitario,
          total:
            cantidad * valorUnitario,
        },
      ],
    });

    setItemManual(itemManualInicial);
  };

  const eliminarItem = (index) => {
    setForm({
      ...form,
      items: form.items.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    });
  };

  const guardarVenta = async () => {
    try {
      if (!form.cliente.nombre.trim()) {
        return Swal.fire({
          icon: "warning",
          title: "Ingrese el cliente",
        });
      }

      if (
        !form.vehiculo.placa.trim() ||
        !form.vehiculo.marca.trim() ||
        !form.vehiculo.modelo.trim()
      ) {
        return Swal.fire({
          icon: "warning",
          title: "Complete el vehiculo",
        });
      }

      if (!placaValida(form.vehiculo.placa)) {
        return Swal.fire({
          icon: "warning",
          title: "Placa no valida",
          text: "La placa debe tener entre 5 y 10 caracteres.",
        });
      }

      if (form.items.length === 0) {
        return Swal.fire({
          icon: "warning",
          title: "Agregue al menos un servicio",
        });
      }

      await createVenta({
        ...form,
        descuento,
      });

      Swal.fire({
        icon: "success",
        title: "Venta registrada",
      });

      setForm(ventaInicial);
      await cargar();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.message ||
          "No fue posible guardar la venta",
      });
    }
  };

  const registrarPagoOrden = async () => {
    if (form.metodoPago === "POR_DEFINIR") {
      return Swal.fire({ icon: "warning", title: "Seleccione la forma de pago" });
    }
    const valorPago = Number(form.valorPago || 0);
    if (valorPago <= 0 || valorPago > total) {
      return Swal.fire({ icon: "warning", title: "El pago debe ser mayor a cero y no superar el total" });
    }
    if (entidadesPorMetodo[form.metodoPago] && !form.entidadPago) {
      return Swal.fire({ icon: "warning", title: "Seleccione la cuenta o entidad del pago" });
    }
    const confirmacion = await Swal.fire({
      icon: "question",
      title: "¿Confirmar pago?",
      text: `Se registrará un pago por ${formatoCop.format(valorPago)}${valorPago < total ? ` y quedará un saldo de ${formatoCop.format(total - valorPago)}` : ""}.`,
      showCancelButton: true,
      confirmButtonText: "Sí, registrar pago",
      cancelButtonText: "Cancelar",
    });
    if (!confirmacion.isConfirmed) return;
    try {
      const ventaResponse = await createVenta({ ...form, estado: valorPago === total ? "PAGADA" : "PENDIENTE", descuento });
      if (valorPago < total) {
        await createMovimientoPago(ventaResponse.data._id, {
          tipo: "PAGO",
          valor: valorPago,
          metodoPago: form.metodoPago,
          entidadPago: form.entidadPago,
          comprobanteImagen: form.comprobanteImagen,
          comprobanteNombre: form.comprobanteNombre,
          observacion: "ABONO INICIAL",
        });
      }
      await Swal.fire({ icon: "success", title: valorPago === total ? "Pago registrado" : "Abono registrado", text: valorPago === total ? "La orden quedó finalizada." : `Queda pendiente ${formatoCop.format(total - valorPago)}.` });
      setForm(ventaInicial);
      setVistaVentas("historial");
      navigate("/ventas", { replace: true });
      await cargar();
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible registrar el pago", text: error.response?.data?.message || "Revise la orden." });
    }
  };

  const registrarPago = async (venta) => {
    const saldo = Number(venta.saldoPendiente ?? (venta.estado === "PAGADA" ? 0 : Number(venta.total || 0)));
    const resultado = await Swal.fire({
      title: "Registrar abono",
      html: `<div class="grid gap-3 text-left"><p class="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">Saldo pendiente: <strong>${formatoCop.format(saldo)}</strong></p><label class="text-sm font-semibold text-slate-600">Valor recibido<input id="pago-valor" class="swal2-input venta-precio" inputmode="numeric" value="${formatearMiles(saldo)}" placeholder="Ej: 300.000" /></label><label class="text-sm font-semibold text-slate-600">Forma de pago<select id="pago-metodo" class="swal2-input">${opcionesMetodoPago}</select></label><label id="pago-entidad-contenedor" class="text-sm font-semibold text-slate-600" style="display:none">Cuenta o entidad<select id="pago-entidad" class="swal2-input"></select></label><label class="text-sm font-semibold text-slate-600">Foto del comprobante (opcional)<input id="pago-comprobante" type="file" accept="image/jpeg,image/png,image/webp" class="mt-2 block w-full rounded-lg border p-2 text-sm" /></label><input id="pago-referencia" class="swal2-input" placeholder="Número de referencia (opcional)" /><input id="pago-observacion" class="swal2-input" placeholder="Observación (opcional)" /></div>`,
      showCancelButton: true,
      confirmButtonText: "Registrar abono",
      cancelButtonText: "Cancelar",
      didOpen: () => {
        const input = Swal.getPopup()?.querySelector("#pago-valor");
        input?.addEventListener("input", () => { input.value = formatearMiles(input.value); });
        const popup = Swal.getPopup();
        const metodo = popup?.querySelector("#pago-metodo");
        metodo?.addEventListener("change", () => llenarEntidadesPago(popup, metodo.value));
      },
      preConfirm: async () => {
        const popup = Swal.getPopup();
        const valor = numeroDesdeMiles(popup.querySelector("#pago-valor")?.value || 0);
        const metodoPago = popup.querySelector("#pago-metodo")?.value || "";
        const entidadPago = popup.querySelector("#pago-entidad")?.value || "";
        if (valor <= 0 || valor > saldo) return Swal.showValidationMessage("El valor debe ser mayor a cero y no superar el saldo");
        if (!metodoPago) return Swal.showValidationMessage("Seleccione la forma de pago");
        if (entidadesPorMetodo[metodoPago] && !entidadPago) return Swal.showValidationMessage("Seleccione la cuenta o entidad");
        try {
          const comprobante = await optimizarComprobante(popup.querySelector("#pago-comprobante")?.files?.[0]);
          return { tipo: "PAGO", valor, metodoPago, entidadPago, ...comprobante, referencia: popup.querySelector("#pago-referencia")?.value || "", observacion: popup.querySelector("#pago-observacion")?.value || "" };
        } catch (error) {
          Swal.showValidationMessage(error.message);
          return false;
        }
      },
    });
    if (!resultado.isConfirmed) return;
    try {
      await createMovimientoPago(venta._id, resultado.value);
      await Swal.fire({ icon: "success", title: resultado.value.valor === saldo ? "Pago completado" : "Abono registrado", timer: 1600, showConfirmButton: false });
      await cargar();
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible registrar el pago", text: error.response?.data?.message || "Intente nuevamente." });
    }
  };

  const registrarPagoRechazado = async (venta) => {
    const resultado = await Swal.fire({
      icon: "warning",
      title: "Registrar pago rechazado",
      input: "textarea",
      inputLabel: "Motivo del rechazo",
      inputPlaceholder: "Ej: TRANSACCION RECHAZADA POR EL BANCO",
      showCancelButton: true,
      confirmButtonText: "Registrar rechazo",
      inputValidator: (value) => value.trim().length < 5 ? "Describa el motivo" : undefined,
    });
    if (!resultado.isConfirmed) return;
    try {
      await updateEstadoVenta(venta._id, "RECHAZADA", venta.metodoPago, resultado.value);
      await cargar();
      Swal.fire({ icon: "success", title: "Pago rechazado registrado", timer: 1400, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible registrar el rechazo", text: error.response?.data?.message });
    }
  };

  const registrarDevolucion = async (venta) => {
    const disponible = Math.max(Number(venta.valorPagado || (venta.estado === "PAGADA" ? venta.total : 0)) - Number(venta.valorDevuelto || 0), 0);
    const resultado = await Swal.fire({
      icon: "warning",
      title: "Registrar devolución",
      html: `<div class="grid gap-3 text-left"><p class="rounded-lg bg-red-50 p-3 text-sm text-red-800">Máximo disponible: <strong>${formatoCop.format(disponible)}</strong></p><input id="devolucion-valor" class="swal2-input venta-precio" inputmode="numeric" placeholder="Valor a devolver" /><select id="devolucion-metodo" class="swal2-input"><option value="">Forma de devolución...</option><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="TARJETA">Tarjeta</option><option value="CREDITO">Crédito</option></select><input id="devolucion-referencia" class="swal2-input" placeholder="Referencia (opcional)" /><textarea id="devolucion-observacion" class="swal2-textarea" placeholder="Motivo obligatorio"></textarea></div>`,
      showCancelButton: true,
      confirmButtonText: "Registrar devolución",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      didOpen: () => {
        const input = Swal.getPopup()?.querySelector("#devolucion-valor");
        input?.addEventListener("input", () => { input.value = formatearMiles(input.value); });
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const valor = numeroDesdeMiles(popup.querySelector("#devolucion-valor")?.value || 0);
        const metodoPago = popup.querySelector("#devolucion-metodo")?.value || "";
        const observacion = popup.querySelector("#devolucion-observacion")?.value || "";
        if (valor <= 0 || valor > disponible) return Swal.showValidationMessage("Ingrese un valor válido que no supere lo recibido");
        if (!metodoPago) return Swal.showValidationMessage("Seleccione la forma de devolución");
        if (observacion.trim().length < 5) return Swal.showValidationMessage("Indique el motivo de la devolución");
        return { tipo: "DEVOLUCION", valor, metodoPago, referencia: popup.querySelector("#devolucion-referencia")?.value || "", observacion };
      },
    });
    if (!resultado.isConfirmed) return;
    try {
      await createMovimientoPago(venta._id, resultado.value);
      await Swal.fire({ icon: "success", title: "Devolución registrada", timer: 1600, showConfirmButton: false });
      await cargar();
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible registrar la devolución", text: error.response?.data?.message || "Intente nuevamente." });
    }
  };

  const editarVenta = async (venta) => {
    if (venta.estado === "PAGADA") {
      const confirmacion = await Swal.fire({
        icon: "warning",
        title: "Venta pagada",
        text: "Esta venta ya esta pagada. Editela solo si necesita corregir una auditoria.",
        showCancelButton: true,
        confirmButtonText: "Editar de todos modos",
        cancelButtonText: "Cancelar",
      });

      if (!confirmacion.isConfirmed) {
        return;
      }
    }

    const itemsHtml =
      (venta.items || [])
        .map(
          (item, index) => `
            <label class="block text-left text-sm text-slate-600">
              ${escapeHtml(item.descripcion || "SERVICIO")}
              <input
                class="swal2-input venta-item-valor"
                data-index="${index}"
                type="text"
                inputMode="numeric"
                min="0"
                value="${formatearMiles(item.valorUnitario || item.total || 0)}"
                placeholder="Ej: 350.000"
              />
            </label>
          `
        )
        .join("");

    const result = await Swal.fire({
      title: "Editar venta",
      html: `
        <div class="grid gap-2">
          <input id="venta-cliente" class="swal2-input" placeholder="Ej: JUAN PEREZ" value="${escapeHtml(venta.cliente?.nombre || "")}" />
          <input id="venta-telefono" class="swal2-input" placeholder="Ej: 3001234567" value="${escapeHtml(venta.cliente?.telefono || "")}" />
          <input id="venta-placa" class="swal2-input" placeholder="Ej: ABC123" minlength="5" maxlength="10" value="${escapeHtml(venta.vehiculo?.placa || "")}" />
          <input id="venta-marca" class="swal2-input" placeholder="Ej: TOYOTA" value="${escapeHtml(venta.vehiculo?.marca || "")}" />
          <input id="venta-modelo" class="swal2-input" placeholder="Ej: 2024" inputmode="numeric" value="${escapeHtml(venta.vehiculo?.modelo || "")}" />
          ${itemsHtml}
          <input id="venta-descuento" class="swal2-input venta-precio" type="text" inputmode="numeric" min="0" placeholder="Ej: 50.000" value="${formatearMiles(venta.descuento || 0)}" />
          <input id="venta-observaciones" class="swal2-input" placeholder="Ej: Cliente solicita entrega en la tarde" value="${escapeHtml(venta.observaciones || "")}" />
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      didOpen: () => {
        Swal.getPopup()
          ?.querySelectorAll(".venta-item-valor, .venta-precio")
          .forEach((input) => {
            input.addEventListener("input", () => {
              input.value = formatearMiles(input.value);
            });
          });
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const valueOf = (id) =>
          popup.querySelector(id)?.value || "";
        const itemInputs = Array.from(
          popup.querySelectorAll(".venta-item-valor")
        );

        const items = (venta.items || []).map((item, index) => {
          const cantidad =
            Math.max(Number(item.cantidad || 1), 1);
          const valorUnitario = numeroDesdeMiles(
            itemInputs[index]?.value || 0
          );

          return {
            tipoServicio: item.tipoServicio,
            descripcion: item.descripcion,
            corteId: getEntityId(item.corteId),
            corteIds: (item.corteIds || []).map(getEntityId),
            cantidad,
            valorUnitario,
          };
        });

        const payload = {
          cliente: {
            nombre: mayusculas(valueOf("#venta-cliente")),
            telefono: valueOf("#venta-telefono"),
          },
          vehiculo: {
            placa: normalizarPlaca(valueOf("#venta-placa")).slice(0, 10),
            marca: mayusculas(valueOf("#venta-marca")),
            modelo: soloNumeros(valueOf("#venta-modelo")),
          },
          estado: venta.estado,
          descuento: numeroDesdeMiles(valueOf("#venta-descuento")),
          observaciones: mayusculas(valueOf("#venta-observaciones")),
          items,
        };

        if (
          !payload.cliente.nombre ||
          !payload.vehiculo.placa ||
          !payload.vehiculo.marca ||
          !payload.vehiculo.modelo
        ) {
          Swal.showValidationMessage(
            "Complete cliente, placa, marca y modelo"
          );
          return false;
        }

        if (!placaValida(payload.vehiculo.placa)) {
          Swal.showValidationMessage(
            "La placa debe tener entre 5 y 10 caracteres"
          );
          return false;
        }

        if (
          items.some(
            (item) =>
              !item.descripcion ||
              Number(item.valorUnitario) < 0
          )
        ) {
          Swal.showValidationMessage(
            "Revise los valores de los servicios"
          );
          return false;
        }

        return payload;
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await updateVenta(venta._id, result.value);
      Swal.fire({
        icon: "success",
        title: "Venta actualizada",
      });
      await cargar();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible actualizar",
        text:
          error.response?.data?.message ||
          "Revise la informacion de la venta",
      });
    }
  };

  const excelColumns = [
    {
      header: "Codigo",
      value: (venta) => venta.codigoVenta,
    },
    {
      header: "Cliente",
      value: (venta) => venta.cliente?.nombre,
      width: 24,
    },
    {
      header: "Placa",
      value: (venta) => venta.vehiculo?.placa,
    },
    {
      header: "Vehiculo",
      value: (venta) =>
        `${venta.vehiculo?.marca || ""} ${venta.vehiculo?.modelo || ""}`.trim(),
      width: 24,
    },
    {
      header: "Servicios",
      value: (venta) => venta.items?.length || 0,
    },
    {
      header: "Total",
      value: (venta) => Number(venta.total || 0),
    },
    {
      header: "Recibido neto",
      value: (venta) => Math.max(Number(venta.valorPagado || (venta.estado === "PAGADA" ? venta.total : 0)) - Number(venta.valorDevuelto || 0), 0),
    },
    {
      header: "Saldo pendiente",
      value: (venta) => Number(venta.saldoPendiente ?? (venta.estado === "PAGADA" ? 0 : venta.total || 0)),
    },
    {
      header: "Estado",
      value: (venta) => venta.estado,
    },
  ];

  if (loading) {
    return (
      <div className="p-8 text-slate-600">
        Cargando ventas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <BadgeDollarSign size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Ventas
              </h1>
              <p className="text-sm text-slate-500">
                Registra cliente, vehiculo, cortes vendidos y servicios adicionales.
              </p>
            </div>
          </div>

          <ExcelButton
            title="Ventas"
            fileName="ventas"
            sheetName="Ventas"
            columns={excelColumns}
            rows={ventasFiltradas}
          />
        </div>
      </div>

      <VentasTabs
        vista={vistaVentas}
        onChange={setVistaVentas}
        pendientes={gruposSinVenta.length}
        ventas={ventas.length}
      />

      {vistaVentas === "cortes" && (
        <VerificacionCortesAgrupada
          grupos={gruposVerificacion}
          totalGrupos={gruposCortes.length}
          gruposSinVenta={gruposSinVenta.length}
          gruposConVenta={gruposConVenta.length}
          filtro={filtroVerificacion}
          setFiltro={setFiltroVerificacion}
          onSelectCorte={cargarCorteEnVenta}
        />
      )}

      {vistaVentas === "nueva" && form.asesoriaId && (
        <CobroOrden
          form={form}
          subtotal={subtotal}
          descuento={descuento}
          total={total}
          onMetodoPagoChange={(metodoPago) => setForm({ ...form, metodoPago, entidadPago: "" })}
          onEntidadPagoChange={(entidadPago) => setForm({ ...form, entidadPago })}
          onComprobanteChange={(comprobante) => setForm({ ...form, ...comprobante })}
          onValorPagoChange={(valorPago) => setForm({ ...form, valorPago })}
          onConfirm={registrarPagoOrden}
        />
      )}

      {vistaVentas === "nueva" && !form.asesoriaId && (
      <div className="grid items-start gap-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 p-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <BadgeDollarSign size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Nueva venta
              </h2>
              <p className="text-xs text-slate-500">
                Datos del cliente, carro y valores que se van a cobrar.
              </p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Cliente">
                <Input
                  value={form.cliente.nombre}
                  placeholder="Ej: JUAN PEREZ"
                  onChange={(value) =>
                    actualizarCliente("nombre", value)
                  }
                />
              </Field>
              <Field label="Telefono">
                <Input
                  value={form.cliente.telefono}
                  placeholder="Ej: 3001234567"
                  onChange={(value) =>
                    actualizarCliente("telefono", value)
                  }
                />
              </Field>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Placa">
                <Input
                  value={form.vehiculo.placa}
                  placeholder="Ej: ABC123"
                  minLength={5}
                  maxLength={10}
                  onChange={(value) =>
                    actualizarVehiculo(
                      "placa",
                      value
                    )
                  }
                />
              </Field>
              <Field label="Marca">
                <Input
                  value={form.vehiculo.marca}
                  placeholder="Ej: TOYOTA"
                  onChange={(value) =>
                    actualizarVehiculo("marca", value)
                  }
                />
              </Field>
              <Field label="Modelo">
                <Input
                  value={form.vehiculo.modelo}
                  placeholder="Ej: 2024"
                  onChange={(value) =>
                    actualizarVehiculo("modelo", value)
                  }
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </Field>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Car size={20} className="text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-800">
                    Cortes registrados del carro
                  </h3>
                  <p className="text-xs text-slate-500">
                    Al escribir la placa solo aparecen los cortes pendientes de ese carro.
                  </p>
                </div>
              </div>

              <div className="p-4 grid lg:grid-cols-[minmax(0,1fr)_180px] gap-3">
                <select
                  value={corteSeleccionado}
                  onChange={(event) =>
                    seleccionarCorte(event.target.value)
                  }
                  className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-tight outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">
                    {placaVenta
                      ? `Cortes pendientes de ${placaVenta}`
                      : "Seleccione un corte del carro..."}
                  </option>
                  {gruposSinVentaDelCarro.map((grupo) => (
                    <option
                      key={grupo.key}
                      value={grupo.key}
                    >
                      {textoOpcionGrupoCorte(grupo)}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  inputMode="numeric"
                  min="0"
                  value={formatearMiles(valorCorte)}
                  onChange={(event) =>
                    setValorCorte(soloDigitos(event.target.value))
                  }
                  placeholder="Ej: 350.000"
                  className="rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />

                {grupoActual && (
                  <div className="lg:col-span-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                    <div className="grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-center">
                      <div>
                        <p className="font-bold text-blue-900">
                          {grupoActual.material}
                        </p>
                        <p className="text-blue-700">
                          {grupoActual.placa} - {grupoActual.marca} {grupoActual.modelo}
                        </p>
                      </div>
                      <span className="font-semibold">
                        {partesGrupoCorte(grupoActual)}
                      </span>
                      <span className="font-bold">
                        {formatoMetros(grupoActual.metrosUtilizados)}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-blue-700 leading-relaxed">
                      {grupoActual.cortes
                        .map(
                          (corte) =>
                            `${descripcionCorteVenta(corte)}: ${formatoMetros(corte.metrosUtilizados)}`
                        )
                        .join(" | ")}
                    </p>
                  </div>
                )}

                {placaVenta && gruposSinVentaDelCarro.length === 0 && (
                  <div className="lg:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    No hay cortes pendientes para la placa {placaVenta}.
                  </div>
                )}

                <div className="lg:col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={agregarCorte}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-sm"
                  >
                    <Plus size={18} />
                    Agregar corte
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <ClipboardList size={20} className="text-green-600" />
                <div>
                  <h3 className="font-bold text-slate-800">
                    Servicios adicionales
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lavado, polichada, PDR, asegurada u otro servicio del mismo carro.
                  </p>
                </div>
              </div>

              <div className="p-4 grid md:grid-cols-2 xl:grid-cols-[180px_minmax(0,1fr)_120px_160px] gap-3">
                <select
                  value={itemManual.tipoServicio}
                  onChange={(event) =>
                    setItemManual({
                      ...itemManual,
                      tipoServicio: event.target.value,
                    })
                  }
                  className="rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-green-400 focus:ring-4 focus:ring-green-50"
                >
                  {serviciosAdicionales.map((servicio) => (
                    <option
                      key={servicio}
                      value={servicio}
                    >
                      {servicioLabels[servicio]}
                    </option>
                  ))}
                </select>

                <input
                  value={itemManual.descripcion}
                  onChange={(event) =>
                    setItemManual({
                      ...itemManual,
                      descripcion: mayusculas(event.target.value),
                    })
                  }
                  placeholder="Ej: LAVADO COMPLETO"
                  className="min-w-0 rounded-xl border border-slate-200 p-3 outline-none focus:border-green-400 focus:ring-4 focus:ring-green-50"
                />

                <input
                  type="number"
                  min="1"
                  value={itemManual.cantidad}
                  onChange={(event) =>
                    setItemManual({
                      ...itemManual,
                      cantidad: event.target.value,
                    })
                  }
                  className="rounded-xl border border-slate-200 p-3 outline-none focus:border-green-400 focus:ring-4 focus:ring-green-50"
                />

                <input
                  type="text"
                  inputMode="numeric"
                  min="0"
                  value={formatearMiles(itemManual.valorUnitario)}
                  onChange={(event) =>
                    setItemManual({
                      ...itemManual,
                      valorUnitario: soloDigitos(event.target.value),
                    })
                  }
                  placeholder="Ej: 80.000"
                  className="rounded-xl border border-slate-200 p-3 outline-none focus:border-green-400 focus:ring-4 focus:ring-green-50"
                />

                <div className="md:col-span-2 xl:col-span-4 flex justify-end">
                  <button
                    type="button"
                    onClick={agregarServicioManual}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-sm"
                  >
                    <Plus size={18} />
                    Agregar servicio
                  </button>
                </div>
              </div>
            </div>

            <ItemsVenta
              items={form.items}
              onDelete={eliminarItem}
            />

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_200px]">
              <Field label="Observaciones">
                <Input
                  value={form.observaciones}
                  placeholder="Ej: Cliente solicita entrega en la tarde"
                  onChange={(value) =>
                    setForm({
                      ...form,
                      observaciones: mayusculas(value),
                    })
                  }
                />
              </Field>
              <Field label="Descuento">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej: 50.000"
                  value={formatearMiles(form.descuento)}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      descuento: soloDigitos(value),
                    })
                  }
                />
              </Field>
              <Field label="Forma de pago">
                <select value={form.metodoPago} onChange={(event) => setForm({ ...form, metodoPago: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white p-3">
                  <option value="POR_DEFINIR">Por definir</option><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="TARJETA">Tarjeta</option><option value="CREDITO">Crédito</option><option value="MIXTO">Mixto</option>
                </select>
              </Field>
            </div>

            <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm text-slate-500">
                  Subtotal: <strong>{formatoCop.format(subtotal)}</strong>
                </p>
                <p className="metric-value font-bold text-blue-700">
                  Total: {formatoCop.format(total)}
                </p>
              </div>

              <button
                type="button"
                onClick={guardarVenta}
                className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-semibold shadow-sm sm:w-auto"
              >
                <Save size={18} />
                Guardar venta
              </button>
            </div>
          </div>
        </section>
      </div>
      )}

      {vistaVentas === "historial" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <ClipboardList size={19} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Historial de ventas
                </h2>
                <p className="text-xs text-slate-500">
                  Busca por cliente, placa o codigo de venta.
                </p>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-3.5 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Buscar cliente, placa o venta..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 pl-10 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>
              <MonthFilter
                month={mesVentas}
                onChange={setMesVentas}
              />
            </div>
          </div>

          <div className="divide-y max-h-[820px] overflow-y-auto">
            {ventasFiltradas.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No hay ventas registradas.
              </div>
            ) : (
              paginationVentas.pageItems.map((venta) => (
                <VentaCard
                  key={venta._id}
                  venta={venta}
                  onMarkPaid={registrarPago}
                  onRefund={registrarDevolucion}
                  onReject={registrarPagoRechazado}
                  onEdit={editarVenta}
                  canEdit={puedeEditar}
                />
              ))
            )}
          </div>
          <TablePagination pagination={paginationVentas} />
        </section>
      )}
    </div>
  );
}

function CobroOrden({ form, subtotal, descuento, total, onMetodoPagoChange, onEntidadPagoChange, onComprobanteChange, onValorPagoChange, onConfirm }) {
  const entidades = entidadesPorMetodo[form.metodoPago] || [];
  const cargarComprobante = async (file) => {
    try {
      onComprobanteChange(await optimizarComprobante(file));
    } catch (error) {
      Swal.fire({ icon: "warning", title: "No se pudo cargar la imagen", text: error.message });
    }
  };
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><BadgeDollarSign size={22} /></div><div><h2 className="text-lg font-black text-slate-900">Verificar y recibir pago</h2><p className="text-sm text-slate-500">La cotización fue creada por el asesor. Ventas solamente confirma el cobro.</p></div></div>
      </div>
      <div className="space-y-5 p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase text-slate-500">Cliente</p><p className="mt-1 font-bold text-slate-900">{form.cliente.nombre}</p><p className="text-sm text-slate-500">{form.cliente.telefono || "Sin teléfono"}</p></div>
          <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase text-slate-500">Vehículo</p><p className="mt-1 font-bold text-slate-900">{form.vehiculo.placa}</p><p className="text-sm text-slate-500">{form.vehiculo.marca} {form.vehiculo.modelo}</p></div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-500">Servicios vendidos</div>
          <div className="divide-y divide-slate-100">{form.items.map((item, index) => <div key={`${item.descripcion}-${index}`} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-800">{servicioLabels[item.tipoServicio] || item.tipoServicio}</p><p className="text-xs text-slate-500">{item.descripcion}</p></div><p className="font-black text-slate-900">{formatoCop.format(item.total || 0)}</p></div>)}</div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3 lg:items-end">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><div className="flex justify-between text-sm text-blue-800"><span>Subtotal</span><strong>{formatoCop.format(subtotal)}</strong></div><div className="mt-1 flex justify-between text-sm text-blue-800"><span>Descuento</span><strong>- {formatoCop.format(descuento)}</strong></div><div className="mt-3 flex justify-between border-t border-blue-200 pt-3 text-xl font-black text-blue-900"><span>Total a cobrar</span><span>{formatoCop.format(total)}</span></div></div>
          <Field label="Forma de pago confirmada"><select value={form.metodoPago} onChange={(event) => onMetodoPagoChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3"><option value="POR_DEFINIR">Seleccione...</option><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="DATAFONO">Datáfono</option><option value="OTROS">Otros</option></select></Field>
          <Field label="Valor recibido"><input value={formatearMiles(form.valorPago)} onChange={(event) => onValorPagoChange(soloDigitos(event.target.value))} inputMode="numeric" placeholder="Ej: 500.000" className="w-full rounded-xl border border-slate-200 bg-white p-3" /></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {entidades.length > 0 && <Field label={form.metodoPago === "TRANSFERENCIA" ? "Cuenta que recibió" : "Entidad de pago"}><select value={form.entidadPago} onChange={(event) => onEntidadPagoChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3"><option value="">Seleccione...</option>{entidades.map((entidad) => <option key={entidad} value={entidad}>{entidad}</option>)}</select></Field>}
          <Field label="Foto del comprobante (opcional)"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => cargarComprobante(event.target.files?.[0])} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm" />{form.comprobanteImagen && <div className="mt-2 flex items-center gap-3 rounded-lg bg-emerald-50 p-2"><img src={form.comprobanteImagen} alt="Vista previa del comprobante" className="h-14 w-14 rounded-md object-cover" /><span className="min-w-0 truncate text-xs font-semibold text-emerald-700">{form.comprobanteNombre || "Comprobante listo"}</span></div>}</Field>
        </div>
        <div className="flex justify-end border-t border-slate-200 pt-5"><button type="button" onClick={onConfirm} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 sm:w-auto"><CheckCircle2 size={18} />Registrar pago</button></div>
      </div>
    </section>
  );
}

function VentasTabs({
  vista,
  onChange,
  pendientes,
  ventas,
}) {
  const tabs = [
    {
      id: "cortes",
      label: "Cortes por costear",
      detail: `${pendientes} pendientes`,
    },
    {
      id: "nueva",
      label: "Nueva venta",
      detail: "Cliente y servicios",
    },
    {
      id: "historial",
      label: "Historial",
      detail: `${ventas} ventas`,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="grid gap-2 md:grid-cols-3">
        {tabs.map((tab) => {
          const activo = vista === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`rounded-xl px-4 py-3 text-left transition ${
                activo
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="block text-sm font-bold">
                {tab.label}
              </span>
              <span
                className={`block text-xs ${
                  activo ? "text-slate-300" : "text-slate-400"
                }`}
              >
                {tab.detail}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VerificacionCortesAgrupada({
  grupos,
  totalGrupos,
  gruposSinVenta,
  gruposConVenta,
  filtro,
  setFiltro,
  onSelectCorte,
}) {
  const excelColumns = [
    {
      header: "Placa",
      value: (grupo) => grupo.placa,
    },
    {
      header: "Vehiculo",
      value: (grupo) =>
        `${grupo.marca || ""} ${grupo.modelo || ""}`.trim(),
      width: 24,
    },
    {
      header: "Servicio",
      value: (grupo) => servicioLabels[grupo.tipoServicio],
    },
    {
      header: "Cortes incluidos",
      value: (grupo) =>
        grupo.cortes
          .map((corte) => corte.tipoCorte || "Corte")
          .join(", "),
      width: 32,
    },
    {
      header: "Costo material total",
      value: (grupo) => grupo.costoMaterial,
    },
    {
      header: "Valor venta",
      value: (grupo) => grupo.valorVenta,
    },
    {
      header: "Utilidad",
      value: utilidadGrupo,
    },
    {
      header: "Estado",
      value: (grupo) =>
        grupoTieneVenta(grupo)
          ? "Con valor"
          : "Falta valor",
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <ClipboardList size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Verificacion de cortes
            </h2>
            <p className="text-sm text-slate-500">
              Una fila comercial por carro/material, con los cortes detallados debajo.
            </p>
          </div>
        </div>

        <ExcelButton
          title="Verificacion de Cortes"
          fileName="verificacion-cortes-venta"
          sheetName="Cortes"
          columns={excelColumns}
          rows={grupos}
        />
      </div>

      <div className="p-5 grid gap-4 md:grid-cols-3">
        <ResumenVenta
          label="Total carros/material"
          value={totalGrupos}
          color="text-blue-700"
        />
        <ResumenVenta
          label="Con valor de venta"
          value={gruposConVenta}
          color="text-green-700"
        />
        <ResumenVenta
          label="Faltan por venta"
          value={gruposSinVenta}
          color="text-red-700"
        />
      </div>

      <div className="px-5 pb-4 flex flex-wrap gap-2">
        {[
          ["PENDIENTES", "Faltan por venta"],
          ["VENDIDOS", "Con valor"],
          ["TODOS", "Todos"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFiltro(value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              filtro === value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border-t border-slate-200">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3 text-left">Placa</th>
              <th className="p-3 text-left">Vehiculo</th>
              <th className="p-3 text-left">Servicio</th>
              <th className="p-3 text-left">Corte</th>
              <th className="p-3 text-right">Costo corte</th>
              <th className="p-3 text-right">Costo total</th>
              <th className="p-3 text-right">Valor venta</th>
              <th className="p-3 text-right">Utilidad</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Accion</th>
            </tr>
          </thead>
          <tbody>
            {grupos.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="p-8 text-center text-slate-500"
                >
                  No hay grupos de cortes en esta vista.
                </td>
              </tr>
            ) : (
              grupos.flatMap((grupo) =>
                grupo.cortes.map((corte, index) => (
                  <tr
                    key={`${grupo.key}-${corte._id}`}
                    className="border-t border-slate-200 hover:bg-slate-50"
                  >
                    {index === 0 && (
                      <>
                        <td
                          rowSpan={grupo.cortes.length}
                          className="p-3 font-semibold align-top bg-white text-slate-800"
                        >
                          {grupo.placa}
                        </td>
                        <td
                          rowSpan={grupo.cortes.length}
                          className="p-3 align-top bg-white text-slate-600"
                        >
                          {grupo.marca} {grupo.modelo}
                        </td>
                        <td
                          rowSpan={grupo.cortes.length}
                          className="p-3 align-top bg-white"
                        >
                          <p className="font-semibold">
                            {servicioLabels[grupo.tipoServicio]}
                          </p>
                          <p className="text-xs text-slate-500">
                            {descripcionMaterialCorte(corte)}
                          </p>
                        </td>
                      </>
                    )}

                    <td className="p-3">
                      {descripcionCorteVenta(corte)}
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-700">
                      {formatoCop.format(costoMaterialCorte(corte))}
                    </td>

                    {index === 0 && (
                      <>
                        <td
                          rowSpan={grupo.cortes.length}
                          className="p-3 text-right font-bold align-top bg-white text-slate-800"
                        >
                          {formatoCop.format(grupo.costoMaterial)}
                        </td>
                        <td
                          rowSpan={grupo.cortes.length}
                          className="p-3 text-right font-bold align-top bg-white text-slate-800"
                        >
                          {grupoTieneVenta(grupo)
                            ? formatoCop.format(grupo.valorVenta)
                            : "-"}
                        </td>
                        <td
                          rowSpan={grupo.cortes.length}
                          className={`p-3 text-right font-bold align-top bg-white ${
                            utilidadGrupo(grupo) < 0
                              ? "text-red-700"
                              : "text-green-700"
                          }`}
                        >
                          {grupoTieneVenta(grupo)
                            ? formatoCop.format(utilidadGrupo(grupo))
                            : "-"}
                        </td>
                        <td
                          rowSpan={grupo.cortes.length}
                          className="p-3 text-center align-top bg-white"
                        >
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              grupoTieneVenta(grupo)
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {grupoTieneVenta(grupo)
                              ? "Con valor"
                              : "Falta valor"}
                          </span>
                        </td>
                        <td
                          rowSpan={grupo.cortes.length}
                          className="p-3 text-center align-top bg-white"
                        >
                          <button
                            type="button"
                            onClick={() => onSelectCorte(grupo)}
                            className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-semibold"
                          >
                            Cargar
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ResumenVenta({ label, value, color }) {
  return (
    <div className="metric-card rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-sm text-slate-500">
        {label}
      </p>
      <p className={`metric-value font-bold ${color}`}>
        {value}
      </p>
    </div>
  );
}

function ItemsVenta({ items, onDelete }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Agregue cortes o servicios adicionales.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="p-3 text-left">Servicio</th>
            <th className="p-3 text-left">Descripcion</th>
            <th className="p-3 text-center">Cant.</th>
            <th className="p-3 text-right">Valor</th>
            <th className="p-3 text-right">Total</th>
            <th className="p-3 text-center">Accion</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.descripcion}-${index}`} className="border-t border-slate-200 hover:bg-slate-50">
              <td className="p-3 font-semibold text-slate-800">
                {servicioLabels[item.tipoServicio] || item.tipoServicio}
              </td>
              <td className="p-3 text-slate-600">
                {item.descripcion}
              </td>
              <td className="p-3 text-center text-slate-600">
                {item.cantidad}
              </td>
              <td className="p-3 text-right text-slate-600">
                {formatoCop.format(item.valorUnitario || 0)}
              </td>
              <td className="p-3 text-right font-bold">
                {formatoCop.format(item.total || 0)}
              </td>
              <td className="p-3 text-center">
                <button
                  type="button"
                  onClick={() => onDelete(index)}
                  className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VentaCard({ venta, onMarkPaid, onRefund, onReject, onEdit, canEdit }) {
  const valorPagado = Number(venta.valorPagado || (venta.estado === "PAGADA" && !venta.pagos?.length ? venta.total : 0));
  const valorDevuelto = Number(venta.valorDevuelto || 0);
  const netoRecibido = Math.max(valorPagado - valorDevuelto, 0);
  const saldoPendiente = Number(venta.saldoPendiente ?? Math.max(Number(venta.total || 0) - netoRecibido, 0));
  return (
    <article className="p-5 space-y-4 hover:bg-slate-50/70">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-800">
            {venta.codigoVenta}
          </p>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <User size={14} />
            {venta.cliente?.nombre}
          </p>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <Car size={14} />
            {venta.vehiculo?.placa} - {venta.vehiculo?.marca} {venta.vehiculo?.referencia || venta.vehiculo?.modelo} {venta.vehiculo?.anio || ""}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <EstadoBadge estado={venta.estado} />
          {venta.estado !== "ANULADA" && <button
            type="button"
            onClick={() => {
              try {
                generarFacturaVenta(venta);
              } catch (error) {
                Swal.fire({
                  icon: "warning",
                  title: "No se pudo abrir el comprobante",
                  text: error.message,
                });
              }
            }}
            title="Ver factura o comprobante"
            aria-label="Ver factura o comprobante"
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50"
          >
            <ReceiptText size={15} />
          </button>}
          {canEdit && <button
            type="button"
            onClick={() => onEdit(venta)}
            title="Editar venta"
            aria-label="Editar venta"
            className="p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50"
          >
            <Pencil size={14} />
          </button>}
        </div>
      </div>

      <div className="space-y-2 rounded-xl bg-slate-50 p-3">
        {venta.items?.map((item, index) => (
          <div
            key={`${venta._id}-${index}`}
            className="flex flex-wrap justify-between gap-3 text-sm"
          >
            <span className="text-slate-600">
              {servicioLabels[item.tipoServicio] || item.tipoServicio}: {item.descripcion}
              <ItemCortesRelacionados item={item} />
            </span>
            <strong>
              {formatoCop.format(item.total || 0)}
            </strong>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-between items-center gap-3 border-t border-slate-200 pt-3">
        <div className="grid min-w-0 gap-1 text-sm sm:grid-cols-3 sm:gap-4">
          <p><span className="block text-xs text-slate-500">Total</span><strong className="text-blue-700">{formatoCop.format(venta.total || 0)}</strong></p>
          <p><span className="block text-xs text-slate-500">Recibido neto</span><strong className="text-emerald-700">{formatoCop.format(netoRecibido)}</strong></p>
          <p><span className="block text-xs text-slate-500">Saldo</span><strong className="text-amber-700">{formatoCop.format(saldoPendiente)}</strong></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {venta.estado !== "PAGADA" && venta.estado !== "ANULADA" && saldoPendiente > 0 && (
          <button
            type="button"
            onClick={() => onMarkPaid(venta)}
            className="px-3 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-2 text-sm font-semibold"
          >
            <CheckCircle2 size={16} />
            Registrar abono
          </button>
        )}
        {venta.estado !== "PAGADA" && venta.estado !== "ANULADA" && venta.estado !== "RECHAZADA" && saldoPendiente > 0 && <button type="button" onClick={() => onReject(venta)} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100">Pago rechazado</button>}
        {canEdit && venta.estado !== "ANULADA" && netoRecibido > 0 && <button type="button" onClick={() => onRefund(venta)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">Registrar devolución</button>}
        </div>
      </div>
      {venta.pagos?.length > 0 && <details className="rounded-xl border border-slate-200 bg-white"><summary className="cursor-pointer px-3 py-2 text-xs font-bold text-slate-600">Ver pagos y comprobantes ({venta.pagos.length})</summary><div className="divide-y divide-slate-100">{[...venta.pagos].reverse().map((movimiento) => <div key={movimiento._id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-xs"><div className="flex min-w-0 items-center gap-3">{movimiento.comprobanteImagen && <button type="button" onClick={() => abrirComprobantePago(movimiento)} title="Ver comprobante de pago" className="group relative shrink-0 overflow-hidden rounded-lg border border-blue-200 bg-blue-50"><img src={movimiento.comprobanteImagen} alt="Comprobante de pago" className="h-14 w-14 object-cover transition group-hover:opacity-70" /><span className="absolute inset-0 flex items-center justify-center text-blue-700 opacity-0 transition group-hover:opacity-100"><Eye size={20} /></span></button>}<div><p className={`font-bold ${movimiento.tipo === "DEVOLUCION" ? "text-red-700" : "text-emerald-700"}`}>{movimiento.tipo} · {movimiento.metodoPago.replaceAll("_", " ")}{movimiento.entidadPago ? ` · ${movimiento.entidadPago}` : ""}</p><p className="text-slate-500">{new Date(movimiento.fecha).toLocaleString("es-CO")} · {movimiento.usuarioNombre || "Usuario"}{movimiento.observacion ? ` · ${movimiento.observacion}` : ""}</p>{movimiento.comprobanteImagen && <button type="button" onClick={() => abrirComprobantePago(movimiento)} className="mt-1 inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900"><Eye size={13} /> Ver comprobante</button>}</div></div><strong>{movimiento.tipo === "DEVOLUCION" ? "- " : "+ "}{formatoCop.format(movimiento.valor)}</strong></div>)}</div></details>}
    </article>
  );
}

function abrirComprobantePago(movimiento) {
  if (!movimiento?.comprobanteImagen) return;

  Swal.fire({
    title: "Comprobante de pago",
    text: movimiento.comprobanteNombre || "Imagen adjunta al movimiento",
    imageUrl: movimiento.comprobanteImagen,
    imageAlt: "Comprobante de pago",
    imageWidth: "100%",
    width: 720,
    confirmButtonText: "Cerrar",
    confirmButtonColor: "#2563eb",
    customClass: {
      image: "max-h-[65vh] object-contain rounded-lg border border-slate-200",
    },
  });
}

function ItemCortesRelacionados({ item }) {
  const cortes = item.corteIds?.length
    ? item.corteIds
    : item.corteId
    ? [item.corteId]
    : [];

  if (!cortes.length) {
    return null;
  }

  return (
    <span className="block text-xs text-slate-400 mt-0.5">
      Cortes: {cortes
        .map((corte) =>
          corte?.tipoCorte
            ? descripcionCorteVenta(corte)
            : corte?._id || corte
        )
        .join(", ")}
    </span>
  );
}

function EstadoBadge({ estado }) {
  const styles = {
    PAGADA: "bg-green-100 text-green-700",
    PARCIAL: "bg-blue-100 text-blue-700",
    ANULADA: "bg-red-100 text-red-700",
    RECHAZADA: "bg-orange-100 text-orange-700",
    PENDIENTE: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold h-fit ${
        styles[estado] || styles.PENDIENTE
      }`}
    >
      {estado}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="mt-1">
        {children}
      </div>
    </label>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  ...props
}) {
  return (
    <input
      type={type}
      value={value}
      {...props}
      onChange={(event) =>
        onChange(event.target.value)
      }
      className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
    />
  );
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getEntityId(value) {
  return value?._id || value || undefined;
}

function formatoMetros(value) {
  return `${Number(value || 0).toFixed(2)} m`;
}

function labelTipoCorte(tipoCorte) {
  const labels = {
    PANORAMICO: "Panoramico",
    LUNETA: "Luneta",
    DELANTERAS: "Delanteras",
    TRASERAS: "Traseras",
    FIJOS: "Fijos",
    SUNROOF: "Sunroof",
    COMPLETO: "Completo",
    PIEZAS_PPF: "Piezas PPF",
    OTROS: "Otros",
  };

  return labels[tipoCorte] || tipoCorte || "Corte";
}

function partesGrupoCorte(grupo) {
  return grupo.cortes
    .map(descripcionCorteVenta)
    .filter(Boolean)
    .join(", ");
}

function descripcionCorteVenta(corte) {
  if (corte?.esCortePpf || corte?.tipoCorte === "PIEZAS_PPF") {
    const piezas = (corte.piezasPpf || [])
      .map(
        (pieza) =>
          `${pieza.pieza} x${pieza.cantidad || 1}`
      )
      .join(", ");

    return piezas || "Piezas PPF";
  }

  return labelTipoCorte(corte?.tipoCorte);
}

function textoOpcionGrupoCorte(grupo) {
  return `${grupo.placa} | ${grupo.marca} ${grupo.modelo} | ${grupo.material} | ${partesGrupoCorte(grupo)} | ${formatoMetros(grupo.metrosUtilizados)}`;
}

function materialCorte(corte) {
  return corte.rolloId || corte.retazoId || {};
}

function descripcionMaterialCorte(corte) {
  const material = materialCorte(corte);
  const clasificacion =
    etiquetaDetalle(material);

  return `${material.tipoPolarizado || "Material"} ${
    clasificacion || ""
  }`.trim();
}

function tipoServicioDesdeCorte(corte) {
  const material =
    descripcionMaterialCorte(corte).toUpperCase();

  if (material.includes("PPF")) {
    return "PPF";
  }

  if (material.includes("SEGURIDAD")) {
    return "PELICULA_SEGURIDAD";
  }

  return "POLARIZADO";
}

function costoMaterialCorte(corte) {
  return Number(corte?.costoMaterialCop || 0);
}

function agruparCortesPorCarroMaterial(cortes) {
  const grupos = new Map();

  cortes.forEach((corte) => {
    const asesoriaId = getEntityId(corte.asesoriaId) || "";
    const tipoServicio =
      tipoServicioDesdeCorte(corte);
    const material =
      descripcionMaterialCorte(corte);
    const key = [
      corte.placa || "",
      corte.marca || "",
      corte.modelo || "",
      asesoriaId,
      tipoServicio,
      material,
    ]
      .join("|")
      .toUpperCase();

    const actual =
      grupos.get(key) || {
        key,
        placa: corte.placa || "",
        marca: corte.marca || "",
        modelo: corte.modelo || "",
        asesoriaId,
        tipoServicio,
        material,
        cortes: [],
        costoMaterial: 0,
        valorVenta: 0,
        metrosUtilizados: 0,
      };

    actual.cortes.push(corte);
    actual.costoMaterial +=
      costoMaterialCorte(corte);
    actual.valorVenta +=
      Number(corte.valorVenta || 0);
    actual.metrosUtilizados +=
      Number(corte.metrosUtilizados || 0);

    grupos.set(key, actual);
  });

  return Array.from(grupos.values()).map((grupo) => ({
    ...grupo,
    costoMaterial:
      Math.round(grupo.costoMaterial),
    valorVenta:
      Math.round(grupo.valorVenta),
    metrosUtilizados:
      Math.round((grupo.metrosUtilizados + Number.EPSILON) * 100) / 100,
  }));
}

function grupoTieneVenta(grupo) {
  return Number(grupo?.valorVenta || 0) > 0;
}

function utilidadGrupo(grupo) {
  return (
    Number(grupo?.valorVenta || 0) -
    Number(grupo?.costoMaterial || 0)
  );
}

export default VentasPage;
