import {
  Navigate,
  Outlet
} from "react-router-dom";

import {
  cerrarSesion,
  getSessionItem,
  tokenExpirado,
} from "../utils/session";

function PrivateRoute() {

  const token = getSessionItem("token");

  if (token && tokenExpirado(token)) {
    cerrarSesion({
      redirect: false,
    });

    return <Navigate to="/login" replace />;
  }

  return token
    ? <Outlet />
    : <Navigate to="/login" replace />;
}

export default PrivateRoute;
