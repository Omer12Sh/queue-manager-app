import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const BASE_URL = (Constants.expoConfig?.extra?.apiUrl as string) || 'http://localhost:4000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: object) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const appointmentApi = {
  getAll: (params?: Record<string, string>) => api.get('/appointments', { params }),
  create: (data: object) => api.post('/appointments', data),
  updateStatus: (id: string, status: string) => api.patch(`/appointments/${id}/status`, { status }),
  getAvailableSlots: (providerId: string, date: string, serviceId: string) =>
    api.get(`/appointments/slots/${providerId}`, { params: { date, serviceId } }),
};

export const serviceApi = {
  getByProvider: (providerId: string) => api.get(`/services/${providerId}`),
  create: (data: object) => api.post('/services', data),
  update: (id: string, data: object) => api.put(`/services/${id}`, data),
  delete: (id: string) => api.delete(`/services/${id}`),
};

export const userApi = {
  getAll: (params?: Record<string, string>) => api.get('/users', { params }),
};

export const providerApi = {
  getProfile: (userId: string) => api.get(`/provider/profile/${userId}`),
  updateProfile: (data: object) => api.put('/provider/profile', data),
  getAnnouncements: (providerId: string) => api.get(`/provider/${providerId}/announcements`),
};

export const aiApi = {
  command: (command: string) => api.post('/ai/command', { command }),
};

export default api;
