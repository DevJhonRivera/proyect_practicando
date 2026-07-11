import { useEffect, useMemo, useState } from "react";

import { getDashboardStats } from "../../api/dashboard.api";

import DashboardHeader from "./components/DashboardHeader";
import DashboardStats from "./components/DashboardStats";
import DashboardCharts from "./components/DashboardCharts";
import DashboardInventory from "./components/DashboardInventory";
import DashboardTopMateriales from "./components/DashboardTopMateriales";
import DashboardQuickActions from "./components/DashboardQuickActions";

function DashboardPage() {

    const [stats, setStats] = useState(null);

    const [loading, setLoading] = useState(true);

    const loadDashboard = async () => {

        try {

            setLoading(true);

            const data = await getDashboardStats();

            setStats(data);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {
        let active = true;

        const loadInitialDashboard = async () => {
            try {
                const data = await getDashboardStats();

                if (active) {
                    setStats(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadInitialDashboard();

        return () => {
            active = false;
        };

    }, []);

    const indicadores = useMemo(() => {

        if (!stats) return {};

        return {

            totalRollos:

                stats.totalRollos || 0,

            metrosDisponibles:

                stats.metrosTotales || 0,

            enUso:

                stats.estados?.uso || 0,

            agotados:

                stats.estados?.agotado || 0,

            reserva:

                stats.estados?.reserva || 0,

            recepcion:

                stats.estados?.recepcion || 0

        };

    }, [stats]);

    if (loading) {

        return (

            <div className="flex justify-center items-center h-[70vh]">

                <div className="text-center">

                    <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-blue-700 mx-auto"></div>

                    <p className="mt-5 text-slate-600">

                        Cargando Dashboard...

                    </p>

                </div>

            </div>

        );

    }

    if (!stats) {

        return (

            <div className="bg-red-50 border border-red-300 rounded-xl p-8">

                <h2 className="text-red-700 font-bold text-xl">

                    No fue posible cargar el Dashboard

                </h2>

            </div>

        );

    }

    return (

        <div className="space-y-8">

            <DashboardHeader

                actualizar={loadDashboard}

            />

            <DashboardQuickActions />

            <DashboardStats

                indicadores={indicadores}

            />

            <DashboardCharts

                inventario={stats.inventario}
                distribucionEstados={stats.distribucionEstados}

            />

            <DashboardInventory

                inventario={stats.inventario}

            />

            <DashboardTopMateriales

                materiales={stats.topMateriales}

            />

        </div>

    );

}

export default DashboardPage;
