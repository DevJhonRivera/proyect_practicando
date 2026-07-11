import {
  useState,
} from "react";

import { AuthContext } from "./auth-context";

export const AuthProvider = ({
  children,
}) => {

  const [user, setUser] =
    useState(null);

  const login = (
    token,
    userData
  ) => {

    localStorage.setItem(
      "token",
      token
    );

    setUser(userData);
  };

  const logout = () => {

    localStorage.removeItem(
      "token"
    );

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
