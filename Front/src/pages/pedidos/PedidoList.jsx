import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import { getPedidos } from "../../api/pedidos.api";
import MonthFilter from "../../components/ui/MonthFilter";
import { useMonthFilter } from "../../hooks/useMonthFilter";

import PedidoHeader from "./componentsList/PedidoHeader";
import PedidoStats from "./componentsList/PedidoStats";
import PedidoFilters from "./componentsList/PedidoFilters";
import PedidoTable from "./componentsList/PedidoTable";
import PedidoFooter from "./componentsList/PedidoFooter";

function PedidoList() {

  const [pedidos, setPedidos] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [estado, setEstado] = useState("TODOS");
  const {
    filteredItems: pedidosDelMes,
    month: mesPedidos,
    setMonth: setMesPedidos,
  } = useMonthFilter(pedidos);

  const cargarPedidos = async () => {
    try {
      const res = await getPedidos();

      setPedidos(res.data || []);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No fue posible cargar los pedidos."
      });
    }
  };

  useEffect(() => {
    let active = true;

    const cargarInicial = async () => {
      try {
        const res = await getPedidos();

        if (active) {
          setPedidos(res.data || []);
        }
      } catch (error) {
        console.error(error);

        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No fue posible cargar los pedidos."
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

  const pedidosFiltrados = pedidosDelMes.filter((pedido) => {

    const coincideBusqueda =

      pedido.codigoPedido
        ?.toLowerCase()
        .includes(search.toLowerCase())

      ||

      pedido.proveedor
        ?.toLowerCase()
        .includes(search.toLowerCase());

    const coincideEstado =

      estado === "TODOS"

      ||

      pedido.estado === estado;

    return (

      coincideBusqueda &&

      coincideEstado

    );

  });

  if (loading) {

    return (

      <div className="flex justify-center items-center h-96">

        <div className="text-slate-500 text-lg">
          Cargando pedidos...
        </div>

      </div>

    );

  }

  return (

    <div className="space-y-6">

      <PedidoHeader />

      <PedidoStats
        pedidos={pedidos}
      />

      <PedidoFilters

        search={search}
        setSearch={setSearch}

        estado={estado}
        setEstado={setEstado}

      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <MonthFilter
          month={mesPedidos}
          onChange={setMesPedidos}
        />
      </div>

      <PedidoTable
        pedidos={pedidosFiltrados}
        onRefresh={cargarPedidos}
      />

      <PedidoFooter
        pedidos={pedidosFiltrados}
      />

    </div>

  );

}

export default PedidoList;
