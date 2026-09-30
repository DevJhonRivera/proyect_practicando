import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Plus, Save, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import {
  createBorradorAsesoria,
  getCatalogoDisponible,
  getClienteAsesoria,
  updateAsesoria,
} from "../../api/asesores.api";
import AppModal from "../../components/ui/AppModal";
import { anchoLabel } from "../../utils/anchos";
import { obtenerReferenciaPpf } from "../../utils/materiales";
import { getPiezasPpf } from "../../api/piezasPpf.api";

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
  garantia: { esGarantia: false, tipo: "GARANTIA_EMPRESA", motivo: "", instalador: "" },
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

const PARTES_POLARIZADO = [
  ["PANORAMICO", "Panorámico"],
  ["DELANTERAS", "Ventanas delanteras"],
  ["TRASERAS", "Ventanas traseras"],
  ["LUNETA", "Luneta"],
  ["FIJOS", "Fijos / custodias"],
  ["SUNROOF", "Sunroof"],
  ["COMPLETO", "Carro completo"],
];

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
  const [guardando, setGuardando] = useState(false);
  const [catalogoMateriales, setCatalogoMateriales] = useState([]);
  const [cargandoMateriales, setCargandoMateriales] = useState(true);
  const [piezasPpf, setPiezasPpf] = useState([]);
  const [cargandoPiezas, setCargandoPiezas] = useState(false);
  const valorServicios = useMemo(
    () => [...form.polarizados, ...form.ppf, ...form.serviciosAdicionales]
      .reduce((total, item) => total + Number(item.valor || 0), 0),
    [form.polarizados, form.ppf, form.serviciosAdicionales]
  );

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
    const anio = form.vehiculo.anio.trim();
    if (!marca || anio.length !== 4) {
      setPiezasPpf([]);
      return;
    }
    let activo = true;
    setCargandoPiezas(true);
    getPiezasPpf({ marca, modelo: anio })
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
  }, [form.vehiculo.anio, form.vehiculo.marca]);

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
  const agregarPiezaPersonalizada = (index) => {
    const nombre = mayusculas(form.ppf[index]?.piezaPersonalizada).trim();
    if (!nombre) return;
    if (!form.ppf[index].piezas.includes(nombre)) alternarPiezaPpf(index, nombre);
    editarItem("ppf", index, "piezaPersonalizada", "");
  };
  const alternarPartePolarizado = (index, parte) => {
    setForm((actual) => ({
      ...actual,
      polarizados: actual.polarizados.map((item, posicion) => {
        if (posicion !== index) return item;
        const partes = item.partes || [];
        const nuevasPartes = partes.includes(parte)
          ? partes.filter((actual) => actual !== parte)
          : [...partes.filter((actual) => actual !== "COMPLETO"), parte];
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
      Swal.fire({
        icon: "success",
        title: "Cliente encontrado",
        text: "Se cargaron sus últimos datos registrados.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch {
      // La búsqueda es una ayuda; el formulario sigue disponible.
    } finally {
      setBuscando(false);
    }
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
      (item) => item.referencia.trim() && (item.aplicacion !== "PIEZAS" || item.piezas.length)
    );
    const preciosValidos = [...form.polarizados, ...form.ppf, ...form.serviciosAdicionales]
      .every((item) => Number(item.valor || 0) > 0);
    if (!form.polarizados.length && !form.ppf.length && !form.serviciosAdicionales.length) {
      return Swal.fire({ icon: "warning", title: "Agregue al menos un servicio" });
    }
    if (!polarizadosValidos || !ppfValido) {
      return Swal.fire({ icon: "warning", title: "Complete los materiales y partes solicitadas" });
    }
    if (!preciosValidos) {
      return Swal.fire({ icon: "warning", title: "Ingrese el precio de cada servicio" });
    }
    if (form.garantia.esGarantia && !form.garantia.motivo.trim()) {
      return Swal.fire({ icon: "warning", title: "Indique el motivo de la garantía" });
    }
    const valorVenta = valorServicios;
    const descuento = form.comercial.aplicaDescuento
      ? Number(form.comercial.descuento || 0)
      : 0;
    if (valorVenta <= 0) {
      return Swal.fire({ icon: "warning", title: "Ingrese el valor acordado de la venta" });
    }
    if (descuento < 0 || descuento > valorVenta) {
      return Swal.fire({ icon: "warning", title: "El descuento no puede superar el valor de venta" });
    }

    try {
      setGuardando(true);
      const payload = {
        ...form,
        comercial: { ...form.comercial, valorVenta: valorServicios },
        polarizados: form.polarizados.map((item) => ({ ...item, partes: item.partes })),
        ppf: form.ppf.map((item) => ({ ...item, piezas: item.piezas })),
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
        <FormSection title="Datos del cliente">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Cédula">
              <input
                value={form.cliente.cedula}
                inputMode="numeric"
                maxLength={15}
                placeholder="Ej: 1023456789"
                onChange={(e) => cambiar("cliente", "cedula", soloDigitos(e.target.value))}
                onBlur={buscarCliente}
                className="w-full rounded-xl border p-3"
              />
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
              <div className="md:col-span-3">
                <Field label="Precio de este servicio">
                  <input value={formatearMiles(item.valor)} inputMode="numeric" placeholder="Ej: 450.000" onChange={(e) => editarItem("polarizados", index, "valor", soloDigitos(e.target.value))} className="w-full rounded-xl border p-3" />
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
            </ServiceRow>
          ))}

          <ServiceHeader
            title="PPF"
            button="Agregar PPF"
            onAdd={() => agregarItem("ppf", { referencia: "", aplicacion: "PIEZAS", piezas: [], piezaPersonalizada: "", valor: "" })}
          />
          {form.ppf.map((item, index) => (
            <ServiceRow key={`ppf-${index}`} onRemove={() => quitarItem("ppf", index)}>
              <Field label="Material PPF disponible">
                <select value={item.referencia} disabled={cargandoMateriales} onChange={(e) => seleccionarPpf(index, e.target.value)} className="w-full rounded-xl border bg-white p-3 disabled:bg-slate-100">
                  <option value="">{cargandoMateriales ? "Cargando PPF..." : "Seleccione PPF..."}</option>
                  {opcionesPpf.map((opcion) => <option key={opcion.referencia} value={opcion.referencia}>PPF - {opcion.referencia} · {opcion.anchos.join(", ")} · {Number(opcion.metrosDisponibles || 0).toFixed(2)} m</option>)}
                </select>
              </Field>
              <Field label="Aplicación">
                <select value={item.aplicacion} onChange={(e) => editarItem("ppf", index, "aplicacion", e.target.value)} className="w-full rounded-xl border bg-white p-3">
                  <option value="PIEZAS">Por piezas</option><option value="INTERIOR">Interior</option><option value="EXTERIOR">Exterior</option><option value="COMPLETO">Completo</option>
                </select>
              </Field>
              <div className="md:col-span-3">
                <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Piezas PPF</span>
                {item.aplicacion !== "PIEZAS" ? (
                  <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">La aplicación {item.aplicacion.toLowerCase()} no requiere seleccionar piezas individuales.</p>
                ) : cargandoPiezas ? (
                  <p className="text-sm text-blue-600">Cargando piezas registradas...</p>
                ) : piezasPpf.length ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {piezasPpf.map((pieza) => {
                      const activa = item.piezas.includes(pieza.pieza);
                      return <button key={pieza._id} type="button" onClick={() => alternarPiezaPpf(index, pieza.pieza)} className={`rounded-lg border p-3 text-left transition ${activa ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-blue-50"}`}><span className="block text-sm font-bold">{pieza.pieza}</span><span className={`mt-1 block text-xs ${activa ? "text-blue-100" : "text-slate-500"}`}>{pieza.ubicacion} · {Number(pieza.anchoCm || 0)} × {Number(pieza.largoCm || 0)} cm</span></button>;
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">No hay piezas registradas para {form.vehiculo.marca || "esta marca"} {form.vehiculo.anio || ""}.</p>
                )}
                {item.aplicacion === "PIEZAS" && <div className="mt-3 flex gap-2"><input value={item.piezaPersonalizada || ""} onChange={(e) => editarItem("ppf", index, "piezaPersonalizada", mayusculas(e.target.value))} placeholder="Otra pieza no registrada" className="min-w-0 flex-1 rounded-lg border p-2.5 text-sm" /><button type="button" onClick={() => agregarPiezaPersonalizada(index)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-700">Agregar</button></div>}
              </div>
              <div className="md:col-span-3"><Field label="Precio del PPF"><input value={formatearMiles(item.valor)} inputMode="numeric" placeholder="Ej: 800.000" onChange={(e) => editarItem("ppf", index, "valor", soloDigitos(e.target.value))} className="w-full rounded-xl border p-3" /></Field></div>
            </ServiceRow>
          ))}

          <ServiceHeader
            title="Otros trabajos"
            button="Agregar servicio"
            onAdd={() => agregarItem("serviciosAdicionales", { tipo: "LAVADO", detalle: "", valor: "" })}
          />
          {form.serviciosAdicionales.map((item, index) => (
            <ServiceRow key={`adicional-${index}`} onRemove={() => quitarItem("serviciosAdicionales", index)}>
              <Field label="Servicio">
                <select value={item.tipo} onChange={(e) => editarItem("serviciosAdicionales", index, "tipo", e.target.value)} className="w-full rounded-xl border bg-white p-3">
                  {["LAVADO", "POLICHADA", "DETAILING", "PDR", "PINTURA", "ASEGURADA", "OTRO"].map((opcion) => <option key={opcion}>{opcion}</option>)}
                </select>
              </Field>
              <div className="md:col-span-2"><Field label="Detalle"><input value={item.detalle} placeholder="Ej: LAVADO PREMIUM CON MOTOR" onChange={(e) => editarItem("serviciosAdicionales", index, "detalle", mayusculas(e.target.value))} className="w-full rounded-xl border p-3" /></Field></div>
              <div className="md:col-span-3"><Field label="Precio del servicio"><input value={formatearMiles(item.valor)} inputMode="numeric" placeholder="Ej: 80.000" onChange={(e) => editarItem("serviciosAdicionales", index, "valor", soloDigitos(e.target.value))} className="w-full rounded-xl border p-3" /></Field></div>
            </ServiceRow>
          ))}

          <Inspection label="El cliente viene por garantía" checked={form.garantia.esGarantia} onChange={(checked) => cambiar("garantia", "esGarantia", checked)}>
            {form.garantia.esGarantia && <div className="mt-3 grid gap-3 md:grid-cols-3">
              <select value={form.garantia.tipo} onChange={(e) => cambiar("garantia", "tipo", e.target.value)} className="rounded-xl border bg-white p-3"><option value="GARANTIA_EMPRESA">Garantía empresa</option><option value="GARANTIA_INSTALADOR">Garantía instalador</option></select>
              <input value={form.garantia.motivo} placeholder="Motivo de la garantía" onChange={(e) => cambiar("garantia", "motivo", mayusculas(e.target.value))} className="rounded-xl border p-3" />
              <input value={form.garantia.instalador} placeholder="Instalador (si aplica)" onChange={(e) => cambiar("garantia", "instalador", mayusculas(e.target.value))} className="rounded-xl border p-3" />
            </div>}
          </Inspection>
        </FormSection>

        <FormSection title="Acuerdo comercial">
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
        </FormSection>

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
