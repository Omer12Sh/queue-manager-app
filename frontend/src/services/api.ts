import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; role: string; phone?: string }) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Appointments
export const appointmentApi = {
  getAll: (params?: Record<string, string>) => api.get('/appointments', { params }),
  getById: (id: string) => api.get(`/appointments/${id}`),
  create: (data: object) => api.post('/appointments', data),
  updateStatus: (id: string, status: string) => api.patch(`/appointments/${id}/status`, { status }),
  reschedule: (id: string, startTime: string) => api.patch(`/appointments/${id}/reschedule`, { startTime }),
  getAvailableSlots: (providerId: string, date: string, serviceIds: string[]) =>
    api.get(`/appointments/slots/${providerId}`, { params: { date, serviceIds: serviceIds.join(',') } }),
};

// Services
export const serviceApi = {
  getByProvider: (providerId: string) => api.get(`/services/${providerId}`),
  create: (data: object) => api.post('/services', data),
  update: (id: string, data: object) => api.put(`/services/${id}`, data),
  delete: (id: string) => api.delete(`/services/${id}`),
};

// Messages
export const messageApi = {
  getAll: () => api.get('/messages'),
  send: (data: object) => api.post('/messages/send', data),
  broadcast: (data: object) => api.post('/messages/broadcast', data),
  markRead: (id: string) => api.patch(`/messages/${id}/read`),
};

// Provider
export const providerApi = {
  getProfile: (userId: string) => api.get(`/provider/profile/${userId}`),
  updateProfile: (data: object) => api.put('/provider/profile', data),
  createAnnouncement: (data: { title: string; content: string }) => api.post('/provider/announcements', data),
  getAnnouncements: (providerId: string) => api.get(`/provider/${providerId}/announcements`),
  updateAnnouncement: (id: string, data: object) => api.put(`/provider/announcements/${id}`, data),
  deleteAnnouncement: (id: string) => api.delete(`/provider/announcements/${id}`),
  getAvailabilityOverrides: (userId: string) => api.get(`/provider/availability/${userId}`),
  upsertAvailabilityOverride: (data: { date: string; isOff: boolean; slots: string[] }) =>
    api.put('/provider/availability', data),
  deleteAvailabilityOverride: (date: string) => api.delete(`/provider/availability/${date}`),
};

// Users
export const userApi = {
  getAll: (params?: Record<string, string>) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: object) => api.put(`/users/${id}`, data),
};

// Admin
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getAllAppointments: () => api.get('/admin/appointments'),
  manageUser: (id: string, data: object) => api.patch(`/admin/users/${id}`, data),
};

// AI
export const aiApi = {
  command: (command: string) => api.post('/ai/command', { command }),
  summary: () => api.get('/ai/summary'),
};

export default api;
