import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://4.186.25.99:3000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Tourist Management APIs
export const touristAPI = {
  // Get all tourists with pagination and search
  getAll: (params = {}) => {
    const { page = 1, limit = 20, status, search } = params;
    return api.get('/users/all', { 
      params: { page, limit, status, search } 
    });
  },

  // Get specific tourist by ID
  getById: (touristId) => {
    return api.get(`/users/${touristId}`);
  },

  // Get tourist statistics
  getStats: () => {
    return api.get('/tracking/stats');
  }
};

// Location & Tracking APIs
export const trackingAPI = {
  // Get location heatmap data
  getHeatmapData: (params = {}) => {
    return api.get('/tracking/location/heatmap', { params });
  },

  // Get nearby tourists
  getNearbyTourists: (params = {}) => {
    const { lat, lng, radius = 5000 } = params;
    return api.get('/tracking/location/nearby', { 
      params: { lat, lng, radius } 
    });
  },

  // Get location history for a tourist
  getLocationHistory: (touristId, params = {}) => {
    const { startDate, endDate, limit = 100 } = params;
    return api.get(`/tracking/location/history/${touristId}`, {
      params: { startDate, endDate, limit }
    });
  },

  // Get connected devices
  getConnectedDevices: () => {
    return api.get('/tracking/devices/connected');
  },

  // Get active alerts - FIXED: Using correct endpoint /alerts/active
  getAlerts: (params = {}) => {
    const { page = 1, limit = 20 } = params;
    return api.get('/tracking/alerts/active', { 
      params: { page, limit } 
    });
  },

  // Acknowledge/dismiss alert - FIXED: Using correct endpoint /alerts/acknowledge
  dismissAlert: (alertId) => {
    return api.post(`/tracking/alerts/acknowledge/${alertId}`);
  },

  // Get all tourists with locations
  getAllTouristsWithLocations: () => {
    return api.get('/tracking/tourists/all');
  },

  // Get all current locations
  getAllCurrentLocations: () => {
    return api.get('/tracking/locations/all');
  },

  // Get inactive users
  getInactiveUsers: () => {
    return api.get('/tracking/inactive-users');
  },

  // Get tracking config
  getConfig: () => {
    return api.get('/tracking/config');
  }
};

// Alert Management APIs
export const alertAPI = {
  // Get active alerts
  getActiveAlerts: (params = {}) => {
    const { page = 1, limit = 20 } = params;
    return api.get('/tracking/alerts/active', { 
      params: { page, limit } 
    });
  },

  // Get emergency alerts
  getEmergencyAlerts: (params = {}) => {
    const { page = 1, limit = 20 } = params;
    return api.get('/tracking/alerts/emergency', { 
      params: { page, limit } 
    });
  },

  // Acknowledge an alert
  acknowledgeAlert: (alertId) => {
    return api.post(`/tracking/alerts/acknowledge/${alertId}`);
  },

  // Create emergency alert (requires touristId and coordinates)
  createEmergencyAlert: (data) => {
    return api.post('/tracking/alerts/emergency', data);
  },

  // Delete all alerts for a tourist
  deleteAlertsForTourist: (touristId) => {
    return api.delete(`/tracking/alerts/emergency/tourist/${touristId}`);
  }
};

// Geofence Management APIs
export const geofenceAPI = {
  // Get all geofences
  getAll: (params = {}) => {
    const { page = 1, limit = 50 } = params;
    return api.get('/tracking/geofences', { 
      params: { page, limit } 
    });
  },

  // Create new geofence
  create: (geofenceData) => {
    return api.post('/tracking/geofences', geofenceData);
  },

  // Update geofence
  update: (fenceId, geofenceData) => {
    return api.put(`/tracking/geofences/${fenceId}`, geofenceData);
  },

  // Delete geofence
  delete: (fenceId) => {
    return api.delete(`/tracking/geofences/${fenceId}`);
  }
};

// OCR Processing APIs
export const ocrAPI = {
  // Process document
  processDocument: (file) => {
    const formData = new FormData();
    formData.append('document', file);
    
    return api.post('/ocr/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Check OCR service health
  getHealth: () => {
    return api.get('/ocr/health');
  }
};

export default api;