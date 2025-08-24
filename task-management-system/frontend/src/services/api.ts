import axios from 'axios';
import { LoginRequest, LoginResponse, User, Task, Deployment, Incident, RCA, Asset, SearchResult, DashboardData } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: LoginRequest): Promise<LoginResponse> =>
    api.post('/auth/login', credentials).then(res => res.data),
  
  getCurrentUser: (): Promise<{ user: User }> =>
    api.get('/auth/me').then(res => res.data),
  
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/auth/change-password', data).then(res => res.data),
};

// Users API
export const usersAPI = {
  getUsers: (): Promise<{ users: User[] }> =>
    api.get('/users').then(res => res.data),
  
  createUser: (userData: Partial<User> & { password: string }) =>
    api.post('/users', userData).then(res => res.data),
  
  getUser: (id: number): Promise<{ user: User }> =>
    api.get(`/users/${id}`).then(res => res.data),
  
  updateUser: (id: number, userData: Partial<User>) =>
    api.put(`/users/${id}`, userData).then(res => res.data),
  
  deleteUser: (id: number) =>
    api.delete(`/users/${id}`).then(res => res.data),
};

// Tasks API
export const tasksAPI = {
  getTasks: (): Promise<{ tasks: Task[] }> =>
    api.get('/tasks').then(res => res.data),
  
  createTask: (taskData: Partial<Task>) =>
    api.post('/tasks', taskData).then(res => res.data),
  
  getTask: (id: number): Promise<{ task: Task }> =>
    api.get(`/tasks/${id}`).then(res => res.data),
  
  updateTask: (id: number, taskData: Partial<Task>) =>
    api.put(`/tasks/${id}`, taskData).then(res => res.data),
  
  deleteTask: (id: number) =>
    api.delete(`/tasks/${id}`).then(res => res.data),
  
  getMyTasks: (): Promise<{ tasks: Task[] }> =>
    api.get('/tasks/my-tasks').then(res => res.data),
};

// Deployments API
export const deploymentsAPI = {
  getDeployments: (): Promise<{ deployments: Deployment[] }> =>
    api.get('/deployments').then(res => res.data),
  
  createDeployment: (deploymentData: Partial<Deployment>) =>
    api.post('/deployments', deploymentData).then(res => res.data),
  
  getDeployment: (id: number): Promise<{ deployment: Deployment }> =>
    api.get(`/deployments/${id}`).then(res => res.data),
  
  updateDeployment: (id: number, deploymentData: Partial<Deployment>) =>
    api.put(`/deployments/${id}`, deploymentData).then(res => res.data),
  
  deleteDeployment: (id: number) =>
    api.delete(`/deployments/${id}`).then(res => res.data),
};

// Incidents API
export const incidentsAPI = {
  getIncidents: (): Promise<{ incidents: Incident[] }> =>
    api.get('/incidents').then(res => res.data),
  
  createIncident: (incidentData: Partial<Incident>) =>
    api.post('/incidents', incidentData).then(res => res.data),
  
  getIncident: (id: number): Promise<{ incident: Incident }> =>
    api.get(`/incidents/${id}`).then(res => res.data),
  
  updateIncident: (id: number, incidentData: Partial<Incident>) =>
    api.put(`/incidents/${id}`, incidentData).then(res => res.data),
  
  deleteIncident: (id: number) =>
    api.delete(`/incidents/${id}`).then(res => res.data),
};

// RCA API
export const rcaAPI = {
  getRCAs: (): Promise<{ rcas: RCA[] }> =>
    api.get('/rca').then(res => res.data),
  
  createRCA: (rcaData: Partial<RCA>) =>
    api.post('/rca', rcaData).then(res => res.data),
  
  getRCA: (id: number): Promise<{ rca: RCA }> =>
    api.get(`/rca/${id}`).then(res => res.data),
  
  updateRCA: (id: number, rcaData: Partial<RCA>) =>
    api.put(`/rca/${id}`, rcaData).then(res => res.data),
  
  deleteRCA: (id: number) =>
    api.delete(`/rca/${id}`).then(res => res.data),
  
  getRCAByIncident: (incidentId: number): Promise<{ rca: RCA }> =>
    api.get(`/rca/by-incident/${incidentId}`).then(res => res.data),
};

// Assets API
export const assetsAPI = {
  getAssets: (): Promise<{ assets: Asset[] }> =>
    api.get('/assets').then(res => res.data),
  
  createAsset: (assetData: Partial<Asset>) =>
    api.post('/assets', assetData).then(res => res.data),
  
  getAsset: (id: number): Promise<{ asset: Asset }> =>
    api.get(`/assets/${id}`).then(res => res.data),
  
  updateAsset: (id: number, assetData: Partial<Asset>) =>
    api.put(`/assets/${id}`, assetData).then(res => res.data),
  
  deleteAsset: (id: number) =>
    api.delete(`/assets/${id}`).then(res => res.data),
};

// Search API
export const searchAPI = {
  globalSearch: (query: string, type?: string): Promise<{ results: SearchResult; total_results: number }> =>
    api.get(`/search?q=${encodeURIComponent(query)}${type ? `&type=${type}` : ''}`).then(res => res.data),
  
  getSuggestions: (query: string): Promise<{ suggestions: Array<{ type: string; value: string; id: number }> }> =>
    api.get(`/search/suggestions?q=${encodeURIComponent(query)}`).then(res => res.data),
};

// Reports API
export const reportsAPI = {
  getDashboard: (): Promise<{ dashboard: DashboardData }> =>
    api.get('/reports/dashboard').then(res => res.data),
  
  getAnalytics: (days?: number): Promise<{ analytics: any }> =>
    api.get(`/reports/analytics${days ? `?days=${days}` : ''}`).then(res => res.data),
  
  exportCSV: (type: string) =>
    api.post('/reports/export/csv', { type }, { responseType: 'blob' }).then(res => res.data),
  
  exportPDF: (type: string) =>
    api.post('/reports/export/pdf', { type }, { responseType: 'blob' }).then(res => res.data),
};

export default api;