import {
  Navigate,
  Outlet
} from "react-router-dom";

import {
  cerrarSesion,
  tokenExpirado,
} from "../utils/session";

function PrivateRoute() {

  const token = localStorage.getItem("token");

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
