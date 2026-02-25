import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auth interceptor
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('aquasentinel_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('aquasentinel_token');
                localStorage.removeItem('aquasentinel_user');
            }
        }
        return Promise.reject(error);
    }
);

// ─── Auth API ────────────────────────────────────────────────
export const authAPI = {
    register: (data: { email: string; password: string; full_name: string; phone?: string }) =>
        api.post('/auth/register', data),
    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),
    getProfile: () => api.get('/auth/me'),
};

// ─── Complaints API ──────────────────────────────────────────
export const complaintsAPI = {
    submit: (formData: FormData) =>
        api.post('/complaints/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    list: (params?: { status?: string; priority?: string; limit?: number; offset?: number }) =>
        api.get('/complaints/', { params }),
    getById: (id: string) => api.get(`/complaints/${id}`),
    track: (complaintNumber: string) => api.get(`/complaints/track/${complaintNumber}`),
    updateStatus: (id: string, data: { status: string; notes?: string; resolution_proof_url?: string }) =>
        api.patch(`/complaints/${id}/status`, data),
    uploadMedia: (id: string, formData: FormData) =>
        api.post(`/complaints/${id}/media`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

// ─── Water Bodies API ────────────────────────────────────────
export const waterBodiesAPI = {
    list: () => api.get('/water-bodies/'),
    getGeoJSON: () => api.get('/water-bodies/geojson'),
    getById: (id: string) => api.get(`/water-bodies/${id}`),
};

// ─── Dashboard API ───────────────────────────────────────────
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
    getHeatmap: () => api.get('/dashboard/heatmap'),
    getCriticalAlerts: () => api.get('/dashboard/critical-alerts'),
    getRiskZones: () => api.get('/dashboard/risk-zones'),
    getPublicDashboard: () => api.get('/dashboard/public'),
    runEscalationCheck: () => api.post('/dashboard/escalation-check'),
};

// ─── Notifications API ──────────────────────────────────────
export const notificationsAPI = {
    list: (unreadOnly?: boolean) => api.get('/notifications/', { params: { unread_only: unreadOnly } }),
    markRead: (id: string) => api.patch(`/notifications/${id}/read`),
    markAllRead: () => api.patch('/notifications/read-all'),
};

export default api;
