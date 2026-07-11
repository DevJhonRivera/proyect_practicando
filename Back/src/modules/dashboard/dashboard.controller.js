
import Rollo from "../rollos/rollo.model.js";
import Pedido from "../pedidos/pedido.model.js";
import Corte from "../cortes/corte.model.js";
import Alerta from "../alertas/alerta.model.js";
import { obtenerDashboard } from "./dashboard.service.js";

export const getDashboard = async (
  req,
  res
) => {
  try {
    const dashboard =
      await obtenerDashboard();

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getDashboardStats = async (req, res) => {
  try {

    // KPIs generales

    const totalRollos =
      await Rollo.countDocuments();

    const metrosTotales =
      await Rollo.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: "$largoDisponible"
            }
          }
        }
      ]);

    // Estados

    const recepcion =
      await Rollo.countDocuments({
        estado: "RECEPCION"
      });

    const reserva =
      await Rollo.countDocuments({
        estado: "RESERVA"
      });

    const uso =
      await Rollo.countDocuments({
        estado: "USO"
      });

    const agotado =
      await Rollo.countDocuments({
        estado: "AGOTADO"
      });

    const distribucionEstados = [
      {
        name: "Recepcion",
        value: recepcion,
      },
      {
        name: "Reserva",
        value: reserva,
      },
      {
        name: "Uso",
        value: uso,
      },
      {
        name: "Agotado",
        value: agotado,
      },
    ].filter((item) => item.value > 0);

    // Inventario agrupado

    const inventario =
      await Rollo.aggregate([
        {
          $group: {
            _id: {
              tipo: "$tipoPolarizado",
              porcentaje: "$porcentaje",
              unidadMedida: {
                $ifNull: [
                  "$unidadMedida",
                  "PORCENTAJE"
                ]
              }
            },
            rollos: {
              $sum: 1
            },
            metros: {
              $sum: "$largoDisponible"
            }
          }
        }
      ]);

    // Top materiales

    const topMateriales =
      await Rollo.aggregate([
        {
          $project: {
            tipoPolarizado: 1,
            porcentaje: 1,
            unidadMedida: {
              $ifNull: [
                "$unidadMedida",
                "PORCENTAJE"
              ]
            },
            metrosConsumidos: {
              $subtract: [
                "$largoOriginal",
                "$largoDisponible"
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              tipo: "$tipoPolarizado",
              porcentaje: "$porcentaje",
              unidadMedida: "$unidadMedida"
            },
            totalConsumido: {
              $sum: "$metrosConsumidos"
            }
          }
        },
        {
          $sort: {
            totalConsumido: -1
          }
        },
        {
          $limit: 10
        }
      ]);

    res.json({
      totalRollos,
      metrosTotales:
        metrosTotales[0]?.total || 0,

      estados: {
        recepcion,
        reserva,
        uso,
        agotado
      },

      distribucionEstados,
      inventario,
      topMateriales
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};

export const getDashboardAlerts =
  async (req, res) => {
    try {
      const alertas =
        await Alerta.find({
          atendida: false,
        })
          .sort({ createdAt: -1 })
          .limit(10);

      res.json(alertas);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const getDashboardOrders =
  async (req, res) => {
    try {
      const pedidos =
        await Pedido.find()
          .sort({ createdAt: -1 })
          .limit(10);

      res.json(pedidos);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const getDashboardSales =
  async (req, res) => {
    try {
      const desde = new Date();
      desde.setMonth(desde.getMonth() - 11);
      desde.setDate(1);
      desde.setHours(0, 0, 0, 0);

      const ventas =
        await Corte.aggregate([
          {
            $match: {
              createdAt: {
                $gte: desde,
              },
            },
          },
          {
            $group: {
              _id: {
                year: {
                  $year: "$createdAt",
                },
                month: {
                  $month: "$createdAt",
                },
              },
              cortes: {
                $sum: 1,
              },
              metros: {
                $sum: "$metrosUtilizados",
              },
            },
          },
          {
            $sort: {
              "_id.year": 1,
              "_id.month": 1,
            },
          },
        ]);

      res.json(
        ventas.map((item) => ({
          year: item._id.year,
          month: item._id.month,
          cortes: item.cortes,
          metros: item.metros,
        }))
      );
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
