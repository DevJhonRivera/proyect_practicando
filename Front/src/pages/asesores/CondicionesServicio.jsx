import { FileCheck2, ShieldCheck } from "lucide-react";
import SeccionLegal from "../../components/ui/SeccionLegal";
import PoliticaDatosContenido from "../privacidad/PoliticaDatosContenido";
export default function CondicionesServicio({ condiciones: c }) {
  const textos = [["Custodia e incidentes", c.incidentes], ["Pertenencias", c.pertenencias], ["Autorización de datos personales", c.datos], ["Mecanismo de firma electrónica", c.firma]].filter(([, texto]) => texto);
  if (!textos.length && !c.politica) return null;
  return <section className="space-y-4"><div><h2 className="text-lg font-bold text-slate-950">Antes de aprobar</h2><p className="mt-1 text-sm text-slate-500">Revisa este resumen. El texto íntegro está disponible debajo antes de que firmes.</p></div>
    {!!c.resumen?.length && <div className="grid gap-3 sm:grid-cols-2">{c.resumen.map((punto, i) => <div key={punto.titulo} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="flex items-center gap-2 text-sm font-bold text-slate-950">{i === 1 ? <ShieldCheck size={17} className="shrink-0 text-blue-700" /> : <FileCheck2 size={17} className="shrink-0 text-blue-700" />}{punto.titulo}</p><p className="mt-2 text-sm leading-6 text-slate-600">{punto.texto}</p></div>)}</div>}
    <SeccionLegal titulo="Leer condiciones y autorización completas" resumen="Custodia, pertenencias, uso de tus datos y firma electrónica."><div className="space-y-5">{textos.map(([titulo, texto]) => <section key={titulo}><h3 className="font-bold text-slate-900">{titulo}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{texto}</p></section>)}</div></SeccionLegal>
    {c.politica && <SeccionLegal titulo="Política aplicable a este documento" resumen={`Versión ${c.politica.version}. Consulta tus derechos y los canales de atención.`}><PoliticaDatosContenido politica={c.politica} /></SeccionLegal>}
    {c.politicaUrl && <a href={c.politicaUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm font-semibold text-blue-700 underline underline-offset-4">Abrir política de tratamiento de datos en otra pestaña</a>}
  </section>;
}
