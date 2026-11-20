import { useState } from "react";
import { calcularTarifasVenta, normalizarMaterial, seleccionarTarifaVenta, tarifaCompatibleConMaterial, tarifaPredeterminadaPolarizado, tarifasAplicacionPolarizado, tarifasCompatiblesConContexto } from "../../utils/preciosVenta";

const campo = "w-full rounded-lg border border-slate-300 bg-white p-2 text-sm";
const cop = (valor) => "$ " + Number(valor || 0).toLocaleString("es-CO");

export default function PrecioServicio({ lista, selecciones = [], valor, onChange, familia, material, clasificacion, partes = [], categoria = "", detalle = "", tipoVehiculo = "CARRO", cargando, registrado = false }) {
  const [buscar, setBuscar] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const porMaterial = ["POLARIZADO", "PPF"].includes(familia);
  const contexto = familia === "PPF" ? (material ? "PPF" : "") : material;
  const compatiblesMaterial = lista.filter((fila) => {
    const hoja = fila.hoja.toUpperCase();
    return porMaterial ? Boolean(contexto) && tarifaCompatibleConMaterial(fila, contexto, clasificacion)
        : familia === "ACCESORIO" ? hoja.startsWith("ACCESORIOS") || hoja === "TAPETES" : true;
  });
  const compatibles = porMaterial
    ? compatiblesMaterial
    : tarifasCompatiblesConContexto(compatiblesMaterial, familia, categoria, detalle);
  const descripcionVehiculo = (fila) => normalizarMaterial(fila.descripcion);
  const esMoto = (fila) => /\bMOTO(CICLETA)?S?\b/.test(descripcionVehiculo(fila));
  const esVehiculo = (fila) => fila.modalidad === "FIJO" && (/AUTO|AUT.?MOV|CAMIONETA|SUV|PLATON/.test(descripcionVehiculo(fila)) || esMoto(fila));
  const correspondeTipo = (fila) => tipoVehiculo === "MOTO" ? esMoto(fila) : !esMoto(fila);
  const categorias = [...new Set(compatibles.filter((fila) => esVehiculo(fila) && correspondeTipo(fila)).map((fila) => fila.descripcion))];
  const guardada = lista.find((fila) => fila.codigo === (selecciones[0]?.baseCodigo || selecciones[0]?.codigo));
  const categoriaVehiculo = vehiculo || (guardada && esVehiculo(guardada) ? guardada.descripcion : "");
  const aplicacionesPolarizado = familia === "POLARIZADO"
    ? tarifasAplicacionPolarizado(compatibles.filter((fila) => !esVehiculo(fila)), partes)
    : [];
  const codigosAplicacion = new Set(aplicacionesPolarizado.map((fila) => fila.codigo));
  const opciones = compatibles.filter((fila) => (!porMaterial || !esVehiculo(fila) || (correspondeTipo(fila) && fila.descripcion === categoriaVehiculo))
    && (familia !== "POLARIZADO" || esVehiculo(fila) || codigosAplicacion.has(fila.codigo)));
  const esPolarizadoCompleto = familia === "POLARIZADO" && partes.map(normalizarMaterial).includes("COMPLETO");
  const tarifasSeleccionables = familia === "POLARIZADO" && partes.length > 0 && !esPolarizadoCompleto
    ? opciones.filter((fila) => !esVehiculo(fila))
    : opciones;
  const faltaCategoria = porMaterial && categorias.length > 0 && !categoriaVehiculo;
  const bases = opciones.filter((fila) => fila.modalidad === "FIJO" && esVehiculo(fila));
  const basesVigentes = bases.filter((fila) => !fila.requiereRevision);
  const completasPendientes = compatibles.some((fila) => esVehiculo(fila) && fila.requiereRevision)
    && !compatibles.some((fila) => esVehiculo(fila) && !fila.requiereRevision);
  const filtrar = (fila) => normalizarMaterial(`${fila.hoja} ${fila.grupo} ${fila.descripcion}`).includes(normalizarMaterial(buscar));
  let error = "";
  let calculo;
  if (selecciones.length) {
    try { calculo = calcularTarifasVenta(selecciones, lista); }
    catch (fallo) { error = fallo.message; }
  }
  const cambiar = (indice, cambios) => onChange(selecciones.map((fila, posicion) => posicion === indice ? { ...fila, ...cambios } : fila));
  const seleccionar = (codigo) => seleccionarTarifaVenta(codigo, lista, basesVigentes);
  const seleccionarParaVehiculo = (descripcion) => {
    const basesDisponibles = compatibles.filter((fila) => esVehiculo(fila)
      && correspondeTipo(fila) && fila.descripcion === descripcion && !fila.requiereRevision);
    const candidatas = compatibles.filter((fila) => !esVehiculo(fila) && !fila.requiereRevision);
    const aplicaciones = familia === "POLARIZADO" ? tarifasAplicacionPolarizado(candidatas, partes) : candidatas;
    const especifica = familia === "POLARIZADO" ? tarifaPredeterminadaPolarizado(aplicaciones, partes) : aplicaciones.length === 1 ? aplicaciones[0] : null;
    const esServicioCompleto = familia !== "POLARIZADO" || partes.map(normalizarMaterial).includes("COMPLETO");
    const elegida = especifica || (esServicioCompleto && basesDisponibles.length === 1 ? basesDisponibles[0] : null);
    return elegida ? [{ ...seleccionarTarifaVenta(elegida.codigo, lista, basesDisponibles), cantidad: 1 }] : [];
  };
  const niveles = (fila, { mostrarNivel = true } = {}) => (fila?.precios || []).map((precio, indice) => precio == null ? null : <option key={indice} value={indice}>
    {mostrarNivel ? `Nivel ${indice + 1} · ` : ""}{fila.modalidad === "PORCENTAJE" ? `${precio} %` : cop(precio)}{fila.condiciones[indice] ? ` · ${fila.condiciones[indice]}` : ""}
  </option>);
  const opcionesTarifa = (filas, seleccionada) => filas.filter((fila) => fila.codigo === seleccionada || filtrar(fila)).map((fila) => (
    <option key={fila.codigo} value={fila.codigo} disabled={fila.requiereRevision || (porMaterial && fila.modalidad === "PORCENTAJE" && !basesVigentes.length)}>
      {fila.modalidad === "PORCENTAJE" ? `Por pieza · ${fila.descripcion}` : `${fila.grupo} · ${fila.descripcion}`}{fila.requiereRevision ? " · Pendiente de revisión" : ""}
    </option>
  ));

  return <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-bold uppercase text-slate-600">Valor calculado</p>
      <p className="text-lg font-bold text-blue-800">{calculo ? cop(calculo.total) : !selecciones.length && Number(valor) > 0 ? cop(valor) : "Por calcular"}</p>
    </div>
    {registrado && !selecciones.length && <p className="text-xs text-slate-600">Valor registrado en esta orden. Selecciona una tarifa si necesitas cambiarlo.</p>}
    {porMaterial && !contexto && <p className="text-xs text-slate-600">Selecciona primero el material a instalar.</p>}
    {porMaterial && contexto && <p className="text-xs font-semibold text-blue-800">
      {material}{clasificacion ? ` · ${clasificacion}` : ""}{familia === "POLARIZADO" && partes.length > 0 ? ` · ${partes.join(", ")}` : ""}
    </p>}
    {porMaterial && categorias.length > 0 && <label className="block text-xs font-semibold">Tipo de vehículo
      <select value={categoriaVehiculo} onChange={(e) => {
        setVehiculo(e.target.value);
        setBuscar("");
        onChange(seleccionarParaVehiculo(e.target.value));
      }} className={campo}>
        <option value="">{tipoVehiculo === "MOTO" ? "Selecciona una tarifa para moto…" : "Selecciona automóvil, SUV o camioneta…"}</option>{categorias.map((nombre) => <option key={nombre}>{nombre}</option>)}
      </select>
    </label>}
    {porMaterial && contexto && !compatibles.length && !cargando && <p role="alert" className="text-xs text-amber-800">No hay tarifas vigentes asociadas a este material o micraje. Administración debe revisar su lista de precios.</p>}
    {porMaterial && contexto && tipoVehiculo === "MOTO" && !categorias.length && !cargando && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Administración debe crear una tarifa PPF cuya descripción incluya MOTO. No se usará el precio de un carro para esta cotización.</p>}
    {!porMaterial && !compatibles.length && !cargando && <p role="alert" className="text-xs text-amber-800">No hay tarifas vigentes para esta categoría. Administración debe crear o clasificar el precio correspondiente.</p>}
    {(completasPendientes || (categoriaVehiculo && bases.length > 0 && !basesVigentes.length)) && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Los precios completos de {material} están pendientes de revisión en Administración. Es necesario definirlos para cotizar el vehículo o calcular sus piezas.</p>}
    {familia === "POLARIZADO" && partes.length > 0 && categoriaVehiculo && !esPolarizadoCompleto && !tarifasSeleccionables.length && !cargando && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-900">No existe una tarifa específica vigente para esta parte y material. Administración debe crearla o activarla antes de cotizar.</p>}
    {tarifasSeleccionables.length > 6 && <input aria-label="Buscar tarifa de venta" placeholder="Buscar vehículo, material o aplicación…" value={buscar} onChange={(e) => setBuscar(e.target.value)} className={campo} />}
    {selecciones.map((seleccion, indice) => {
      const fila = lista.find((item) => item.codigo === seleccion.codigo);
      const base = lista.find((item) => item.codigo === seleccion.baseCodigo);
      return <div key={indice} className="space-y-2 rounded-lg border border-blue-100 bg-white p-3">
        <label className="block text-xs font-semibold">Tarifa para el vehículo y la aplicación
          <select value={seleccion.codigo} disabled={cargando || faltaCategoria} onChange={(e) => cambiar(indice, seleccionar(e.target.value))} className={campo}>
            <option value="">Selecciona una tarifa…</option>{opcionesTarifa(tarifasSeleccionables, seleccion.codigo)}
          </select>
        </label>
        {fila && <>
          <label className="block text-xs font-semibold">{fila.modalidad === "PORCENTAJE" ? "Condición y porcentaje" : "Nivel y condición comercial"}<select value={seleccion.nivel} onChange={(e) => cambiar(indice, { nivel: Number(e.target.value) })} className={campo}>{niveles(fila, { mostrarNivel: fila.modalidad !== "PORCENTAJE" })}</select></label>
          {fila.notas && <p className="whitespace-pre-wrap text-xs text-amber-800">{fila.notas}</p>}
          {fila.modalidad === "PORCENTAJE" && <>
            {!basesVigentes.length && <p className="text-xs text-amber-800">Falta un precio completo vigente para el vehículo seleccionado. Administración debe revisar la tarifa base.</p>}
            <details className="rounded-lg border border-slate-200 bg-slate-50 p-2.5" open={!seleccion.baseCodigo}>
              <summary className="cursor-pointer text-xs font-bold text-slate-600">Ver detalle del cálculo</summary>
              <div className="mt-3 space-y-2">
                <label className="block text-xs font-semibold">Precio completo usado como base
                  <select value={seleccion.baseCodigo || ""} onChange={(e) => {
                    const elegida = seleccionar(e.target.value);
                    cambiar(indice, { baseCodigo: elegida.codigo, baseNivel: elegida.nivel, baseRevision: elegida.revision });
                  }} className={campo}><option value="">Selecciona el precio completo…</option>{opcionesTarifa(bases, seleccion.baseCodigo)}</select>
                </label>
                {base && <label className="block text-xs font-semibold">Condición del precio base<select value={seleccion.baseNivel} onChange={(e) => cambiar(indice, { baseNivel: Number(e.target.value) })} className={campo}>{niveles(base, { mostrarNivel: false })}</select></label>}
                {base && calculo && <p className="rounded-lg bg-blue-50 p-2.5 text-xs text-blue-900">{cop(base.precios[seleccion.baseNivel])} × {fila.precios[seleccion.nivel]} % × {seleccion.cantidad ?? 1} = <strong>{cop(Math.round(base.precios[seleccion.baseNivel] * fila.precios[seleccion.nivel] / 100) * (seleccion.cantidad ?? 1))}</strong></p>}
              </div>
            </details>
          </>}
        </>}
        <div className="flex items-end justify-between gap-3">
          {familia !== "ACCESORIO" && <label className="text-xs font-semibold">Cantidad de unidades o piezas<input type="number" min="1" max="1000" step="1" value={seleccion.cantidad ?? 1} onChange={(e) => cambiar(indice, { cantidad: Number(e.target.value) })} className={`${campo} max-w-24`} /></label>}
          <button type="button" onClick={() => onChange(selecciones.filter((_, posicion) => posicion !== indice))} className="text-xs font-semibold text-red-700">Quitar tarifa</button>
        </div>
      </div>;
    })}
    {error && <p role="alert" className="text-xs text-amber-800">{error}</p>}
    <button type="button" disabled={cargando || !tarifasSeleccionables.length || faltaCategoria || selecciones.length >= 50} onClick={() => onChange([...selecciones, { codigo: "", nivel: 0, cantidad: 1 }])} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-800 ring-1 ring-blue-200 disabled:opacity-50">
      {cargando ? "Cargando tarifas…" : selecciones.length ? "+ Agregar otra pieza o tarifa" : "Seleccionar tarifa de venta"}
    </button>
  </div>;
}
