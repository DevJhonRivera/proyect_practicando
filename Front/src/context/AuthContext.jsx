import {
  useState,
} from "react";

import { AuthContext } from "./auth-context";
import {
  cerrarSesion as cerrarSesionUsuario,
  notificarSesionActualizada,
  setSessionItem,
} from "../utils/session";

export const AuthProvider = ({
  children,
}) => {

  const [user, setUser] =
    useState(null);

  const login = (
    token,
    userData
  ) => {

    setSessionItem(
      "token",
      token
    );

    setSessionItem(
      "usuario",
      JSON.stringify(userData)
    );

    setUser(userData);
    notificarSesionActualizada();
  };

  const logout = () => {

    cerrarSesionUsuario({
      redirect: false,
    });

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
