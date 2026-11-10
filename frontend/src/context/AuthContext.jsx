import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('jesoul_token');
    const savedUser = localStorage.getItem('jesoul_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (_) {
        localStorage.removeItem('jesoul_token');
        localStorage.removeItem('jesoul_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, userToken) => {
    const normalizedUser = {
      ...userData,
      fullName: userData.fullName || userData.FullName || userData.role,
      phoneNumber: userData.phoneNumber || userData.PhoneNumber,
      email: userData.email || userData.Email,
      role: userData.role || userData.Role
    };
    setUser(normalizedUser);
    setToken(userToken);
    localStorage.setItem('jesoul_token', userToken);
    localStorage.setItem('jesoul_user', JSON.stringify(normalizedUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('jesoul_token');
    localStorage.removeItem('jesoul_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
