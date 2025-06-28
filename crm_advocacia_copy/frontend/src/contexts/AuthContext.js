import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:3000'; 

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  // Tente carregar o usuário do localStorage na inicialização
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Erro ao parsear user do localStorage:", error);
      return null;
    }
  });
  const [loading, setLoading] = useState(true); // Adicione um estado de carregamento

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Opcional: Se você quiser validar o token no backend e/ou buscar dados mais recentes do usuário
      // Você pode chamar uma função aqui para fazer isso, por exemplo:
      // const validateAndFetchUser = async () => {
      //   try {
      //     const response = await axios.get('http://localhost:3000/api/auth/me' ); // Exemplo de rota de validação
      //     setUser(response.data.user);
      //   } catch (error) {
      //     console.error("Token inválido ou erro ao buscar usuário:", error);
      //     logout(); // Desloga se o token for inválido
      //   } finally {
      //     setLoading(false);
      //   }
      // };
      // validateAndFetchUser();
      setLoading(false); // Se não for validar, defina loading como false aqui
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setLoading(false); // Se não há token, não está carregando
    }
  }, [token]); // Depende apenas do token

  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email,
        password,
      } );

      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao fazer login'
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    token,
    user,
    login,
    logout,
    loading, // Exponha o estado de carregamento
  };

  // Renderize um spinner ou tela de carregamento enquanto a autenticação está sendo verificada
  if (loading) {
    return <div>Carregando autenticação...</div>; // Ou um componente de spinner mais elaborado
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

