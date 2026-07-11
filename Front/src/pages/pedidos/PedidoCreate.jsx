import { useState } from "react";
import Swal from "sweetalert2";

import { createPedido } from "../../api/pedidos.api";

import PedidoHeader from "./components/PedidoHeader";
import PedidoStats from "./components/PedidoStats";
import PedidoInfo from "./components/PedidoInfo";
import PedidoDetalleForm from "./components/PedidoDetalleForm";
import PedidoDetalleTable from "./components/PedidoDetalleTable";
import PedidoFooter from "./components/PedidoFooter";

function PedidoCreate() {

  const [pedido, setPedido] = useState({
    codigoPedido: "",
    proveedor: "",
    observaciones: "",
  });

  const [detalle, setDetalle] = useState({
    tipoPolarizado: "",
    porcentaje: "",
    unidadMedida: "PORCENTAJE",
    ancho: "1.52",
    cantidadRollos: "",
  });

  const [detalles, setDetalles] = useState([]);

  const totalRollos = detalles.reduce(
    (acc, item) => acc + Number(item.cantidadRollos),
    0
  );

  const agregarDetalle = () => {

    if (
      !detalle.tipoPolarizado ||
      detalle.porcentaje === "" ||
      !detalle.ancho ||
      !detalle.cantidadRollos
    ) {

      return Swal.fire({
        icon: "warning",
        title: "Complete todos los campos",
      });

    }

    setDetalles([
      ...detalles,
      {
        ...detalle,
        porcentaje: Number(detalle.porcentaje),
        unidadMedida:
          detalle.unidadMedida || "PORCENTAJE",
        ancho: Number(detalle.ancho),
        cantidadRollos: Number(detalle.cantidadRollos),
      },
    ]);

    setDetalle({
      tipoPolarizado: "",
      porcentaje: "",
      unidadMedida: "PORCENTAJE",
      ancho: "1.52",
      cantidadRollos: "",
    });

  };

  const eliminarDetalle = (index) => {

    setDetalles(
      detalles.filter((_, i) => i !== index)
    );

  };

  const guardarPedido = async () => {

    try {

      if (!pedido.codigoPedido) {

        return Swal.fire({
          icon: "warning",
          title: "Ingrese el código del pedido",
        });

      }

      if (!pedido.proveedor) {
        return Swal.fire({
          icon: "warning",
          title: "Seleccione o cree un proveedor",
        });
      }

      if (detalles.length === 0) {

        return Swal.fire({
          icon: "warning",
          title: "Debe agregar al menos un material",
        });

      }

      await createPedido({
        ...pedido,
        codigoPedido: pedido.codigoPedido.toUpperCase(),
        proveedor: pedido.proveedor.toUpperCase(),
        detalles,
      });

      Swal.fire({
        icon: "success",
        title: "Pedido creado correctamente",
      });

      setPedido({
        codigoPedido: "",
        proveedor: "",
        observaciones: "",
      });

      setDetalle({
        tipoPolarizado: "",
        porcentaje: "",
        unidadMedida: "PORCENTAJE",
        ancho: "1.52",
        cantidadRollos: "",
      });

      setDetalles([]);

    } catch (error) {

      Swal.fire({
        icon: "error",
        title:
          error.response?.data?.message ||
          "Error al crear el pedido",
      });

    }

  };

  return (

    <div className="space-y-6">

      <PedidoHeader />

      <PedidoStats
        pedido={pedido}
        detalles={detalles}
        totalRollos={totalRollos}
      />

      <PedidoInfo
        pedido={pedido}
        setPedido={setPedido}
      />

      <PedidoDetalleForm
        detalle={detalle}
        setDetalle={setDetalle}
        agregarDetalle={agregarDetalle}
      />

      <PedidoDetalleTable
        detalles={detalles}
        eliminarDetalle={eliminarDetalle}
      />

      <PedidoFooter
      detalles={detalles}
        totalRollos={totalRollos}
        guardarPedido={guardarPedido}
      />

    </div>

  );

}

export default PedidoCreate;
