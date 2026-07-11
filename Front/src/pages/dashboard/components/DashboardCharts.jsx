import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { etiquetaClasificacion } from "../../../utils/materiales";

function DashboardCharts({
  inventario = [],
  distribucionEstados = [],
}) {
  const materialData = inventario
    .map((item) => ({
      material:
        `${item._id.tipo} ${etiquetaClasificacion(
          item._id.porcentaje,
          item._id.unidadMedida
        )}`,
      metros: Number(item.metros || 0),
    }))
    .sort((a, b) => b.metros - a.metros)
    .slice(0, 8);

  const colores = [
    "#2563eb",
    "#16a34a",
    "#dc2626",
    "#9333ea",
    "#f59e0b",
    "#06b6d4",
    "#ec4899",
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-6">
          Rollos por estado
        </h2>

        <div className="h-[350px]">
          {distribucionEstados.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              No hay rollos para graficar
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={distribucionEstados}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={120}
                  label
                >
                  {distribucionEstados.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={colores[index % colores.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-6">
          Metros por material
        </h2>

        <div className="h-[350px]">
          {materialData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              No hay inventario para graficar
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart data={materialData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="material" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="metros"
                  radius={[8, 8, 0, 0]}
                  fill="#2563eb"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardCharts;
