import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set up axios interceptor to include token in all requests
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data.user);
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const login = async (email, password, role) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password, role });
      
      if (response.data.requiresOTP) {
        return {
          requiresOTP: true,
          userId: response.data.userId,
          otp: response.data.otp
        };
      }
      
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const verifyLoginOTP = async (userId, otp) => {
    const response = await axios.post('/api/auth/verify-login-otp', { userId, otp });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    return response.data;
  };

  const register = async (userData) => {
    const endpoint = userData.role === 'donor' ? '/api/auth/donor/register' : '/api/auth/receiver/register';
    const response = await axios.post(endpoint, userData);
    return response.data;
  };

  const verifyOTP = async (userId, otp) => {
    const response = await axios.post('/api/auth/verify-otp', { userId, otp });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    return response.data;
  };

  const resendOTP = async (userId) => {
    const response = await axios.post('/api/auth/resend-otp', { userId });
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(prevUser => ({
      ...prevUser,
      ...userData
    }));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser: updateUser,
      login, 
      register, 
      verifyOTP, 
      resendOTP, 
      logout, 
      loading,
      verifyLoginOTP 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
