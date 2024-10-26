import { useState, useEffect, createContext } from 'react';
import api from '../services/api'; // Ensure this is the axios instance with interceptors
import axios from 'axios';

const AuthContext = createContext(null);
const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:8000/api/'; // Use environment variable

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedTokens = localStorage.getItem('tokens');
    if (storedUser && storedTokens) {
      setUser(JSON.parse(storedUser));
      setTokens(JSON.parse(storedTokens));
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}login/`, { email, password });
      const { access, refresh } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify({ username: email }));
      localStorage.setItem('tokens', JSON.stringify({ access, refresh }));

      setUser({ username: email });
      setTokens({ access, refresh });

      return { success: true, message: 'Login successful' };
    } catch (error) {
      console.error('Login error:', error.response ? error.response.data : error.message);
      return {
        success: false,
        error: error.response && error.response.data ? error.response.data.message : 'Network error',
      };
    }
  };

  const register = async (username, first_name, last_name, email, password) => {
    try {
      const response = await axios.post(`${API_URL}register/`, { username, first_name, last_name, email, password });
      const { access, refresh } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify({ username }));
      localStorage.setItem('tokens', JSON.stringify({ access, refresh }));

      setUser({ username });
      setTokens({ access, refresh });

      return { success: true, message: 'Registration successful' };
    } catch (error) {
      console.error('Registration error:', error.response ? error.response.data : error.message);
      return {
        success: false,
        error: error.response && error.response.data ? error.response.data.message : 'Network error',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokens');
    setUser(null);
    setTokens(null);
   
    return { success: true, message: 'Logout successful' };
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('current-user');
      setCurrentUser(response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await refreshToken();
        await fetchCurrentUser(); // Retry after refreshing the token
      } else {
        console.log('Error fetching the user:', error);
      }
    }
  };

  const refreshToken = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) throw new Error('No refresh token found');

      const response = await api.post(`token/refresh/`, { refresh });
      const { access, refresh: newRefresh } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', newRefresh);
      localStorage.setItem('tokens', JSON.stringify({ access, refresh: newRefresh }));

      setTokens({ access, refresh: newRefresh });
      console.log('Token refreshed:', access);
    } catch (error) {
      console.log('Error refreshing token:', error);
      logout(); // Log out if refresh fails
    }
  };

  const value = {
    user,
    tokens,
    login,
    register,
    logout,
    fetchCurrentUser,
    currentUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
