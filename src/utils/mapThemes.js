// Map Themes Configuration for Yatra Suraksha Admin Portal
// Supports both Azure Maps and Google Maps styling

// ===========================================
// AZURE MAPS AVAILABLE STYLES
// ===========================================
export const AZURE_MAP_STYLES = {
  // Light Themes
  ROAD: 'road',                           // Standard road map
  GRAYSCALE_LIGHT: 'grayscale_light',     // Light grayscale (current)
  ROAD_SHADED_RELIEF: 'road_shaded_relief', // Road with terrain
  
  // Dark Themes
  GRAYSCALE_DARK: 'grayscale_dark',       // Dark grayscale
  NIGHT: 'night',                         // Night mode
  
  // Satellite
  SATELLITE: 'satellite',                 // Satellite imagery
  SATELLITE_ROAD: 'satellite_road_labels', // Satellite with roads
  
  // Special
  HIGH_CONTRAST_LIGHT: 'high_contrast_light',
  HIGH_CONTRAST_DARK: 'high_contrast_dark',
};

// ===========================================
// COLOR THEMES FOR OVERLAYS & MARKERS
// ===========================================
export const MAP_COLOR_THEMES = {
  // Default Blue Theme (Current)
  default: {
    name: 'Default Blue',
    description: 'Clean blue and white theme',
    colors: {
      primary: '#1a73e8',
      secondary: '#4285f4',
      accent: '#0d47a1',
      background: '#f5f5f5',
    },
    markers: {
      safe: '#4caf50',       // Green
      warning: '#ff9800',    // Orange
      danger: '#f44336',     // Red
      emergency: '#9c27b0',  // Purple
      inactive: '#9e9e9e',   // Gray
    },
    geofence: {
      safe: { fill: 'rgba(76, 175, 80, 0.25)', stroke: '#4caf50' },
      warning: { fill: 'rgba(255, 152, 0, 0.25)', stroke: '#ff9800' },
      danger: { fill: 'rgba(244, 67, 54, 0.25)', stroke: '#f44336' },
      restricted: { fill: 'rgba(156, 39, 176, 0.25)', stroke: '#9c27b0' },
    },
    heatmap: ['#00ff00', '#ffff00', '#ff9800', '#ff0000'],
    historyPath: '#1a73e8',
    azureMapStyle: 'grayscale_light',
  },

  // Dark Theme
  dark: {
    name: 'Dark Mode',
    description: 'Dark theme for night operations',
    colors: {
      primary: '#bb86fc',
      secondary: '#03dac6',
      accent: '#cf6679',
      background: '#121212',
    },
    markers: {
      safe: '#00e676',
      warning: '#ffab00',
      danger: '#ff5252',
      emergency: '#ea80fc',
      inactive: '#616161',
    },
    geofence: {
      safe: { fill: 'rgba(0, 230, 118, 0.3)', stroke: '#00e676' },
      warning: { fill: 'rgba(255, 171, 0, 0.3)', stroke: '#ffab00' },
      danger: { fill: 'rgba(255, 82, 82, 0.3)', stroke: '#ff5252' },
      restricted: { fill: 'rgba(234, 128, 252, 0.3)', stroke: '#ea80fc' },
    },
    heatmap: ['#00e676', '#ffea00', '#ff9100', '#ff1744'],
    historyPath: '#bb86fc',
    azureMapStyle: 'night',
  },

  // High Contrast Theme
  highContrast: {
    name: 'High Contrast',
    description: 'Maximum visibility for accessibility',
    colors: {
      primary: '#ffff00',
      secondary: '#00ffff',
      accent: '#ff00ff',
      background: '#000000',
    },
    markers: {
      safe: '#00ff00',
      warning: '#ffff00',
      danger: '#ff0000',
      emergency: '#ff00ff',
      inactive: '#808080',
    },
    geofence: {
      safe: { fill: 'rgba(0, 255, 0, 0.4)', stroke: '#00ff00' },
      warning: { fill: 'rgba(255, 255, 0, 0.4)', stroke: '#ffff00' },
      danger: { fill: 'rgba(255, 0, 0, 0.4)', stroke: '#ff0000' },
      restricted: { fill: 'rgba(255, 0, 255, 0.4)', stroke: '#ff00ff' },
    },
    heatmap: ['#00ff00', '#ffff00', '#ff8000', '#ff0000'],
    historyPath: '#00ffff',
    azureMapStyle: 'high_contrast_dark',
  },

  // Satellite Theme
  satellite: {
    name: 'Satellite View',
    description: 'Real satellite imagery with labels',
    colors: {
      primary: '#ffffff',
      secondary: '#f0f0f0',
      accent: '#ffeb3b',
      background: '#1a1a2e',
    },
    markers: {
      safe: '#76ff03',
      warning: '#ffc400',
      danger: '#ff1744',
      emergency: '#d500f9',
      inactive: '#90a4ae',
    },
    geofence: {
      safe: { fill: 'rgba(118, 255, 3, 0.35)', stroke: '#76ff03' },
      warning: { fill: 'rgba(255, 196, 0, 0.35)', stroke: '#ffc400' },
      danger: { fill: 'rgba(255, 23, 68, 0.35)', stroke: '#ff1744' },
      restricted: { fill: 'rgba(213, 0, 249, 0.35)', stroke: '#d500f9' },
    },
    heatmap: ['#76ff03', '#ffff00', '#ff9100', '#ff1744'],
    historyPath: '#ffffff',
    azureMapStyle: 'satellite_road_labels',
  },

  // Government/Official Theme
  government: {
    name: 'Government Official',
    description: 'Professional government-style map',
    colors: {
      primary: '#1565c0',
      secondary: '#0d47a1',
      accent: '#ff6f00',
      background: '#eceff1',
    },
    markers: {
      safe: '#2e7d32',
      warning: '#f57c00',
      danger: '#c62828',
      emergency: '#6a1b9a',
      inactive: '#546e7a',
    },
    geofence: {
      safe: { fill: 'rgba(46, 125, 50, 0.2)', stroke: '#2e7d32' },
      warning: { fill: 'rgba(245, 124, 0, 0.2)', stroke: '#f57c00' },
      danger: { fill: 'rgba(198, 40, 40, 0.2)', stroke: '#c62828' },
      restricted: { fill: 'rgba(106, 27, 154, 0.2)', stroke: '#6a1b9a' },
    },
    heatmap: ['#2e7d32', '#f9a825', '#ef6c00', '#c62828'],
    historyPath: '#1565c0',
    azureMapStyle: 'road',
  },

  // Tourism Theme
  tourism: {
    name: 'Tourism Friendly',
    description: 'Colorful theme for tourist tracking',
    colors: {
      primary: '#00bcd4',
      secondary: '#26c6da',
      accent: '#ff4081',
      background: '#e0f7fa',
    },
    markers: {
      safe: '#00c853',
      warning: '#ffd600',
      danger: '#ff1744',
      emergency: '#aa00ff',
      inactive: '#78909c',
    },
    geofence: {
      safe: { fill: 'rgba(0, 200, 83, 0.25)', stroke: '#00c853' },
      warning: { fill: 'rgba(255, 214, 0, 0.25)', stroke: '#ffd600' },
      danger: { fill: 'rgba(255, 23, 68, 0.25)', stroke: '#ff1744' },
      restricted: { fill: 'rgba(170, 0, 255, 0.25)', stroke: '#aa00ff' },
    },
    heatmap: ['#00e5ff', '#76ff03', '#ffea00', '#ff1744'],
    historyPath: '#00bcd4',
    azureMapStyle: 'road_shaded_relief',
  },

  // Emergency Response Theme
  emergency: {
    name: 'Emergency Response',
    description: 'High visibility for emergency situations',
    colors: {
      primary: '#d32f2f',
      secondary: '#f44336',
      accent: '#ff9800',
      background: '#ffebee',
    },
    markers: {
      safe: '#43a047',
      warning: '#fb8c00',
      danger: '#e53935',
      emergency: '#d500f9',
      inactive: '#757575',
    },
    geofence: {
      safe: { fill: 'rgba(67, 160, 71, 0.3)', stroke: '#43a047' },
      warning: { fill: 'rgba(251, 140, 0, 0.3)', stroke: '#fb8c00' },
      danger: { fill: 'rgba(229, 57, 53, 0.35)', stroke: '#e53935' },
      restricted: { fill: 'rgba(213, 0, 249, 0.35)', stroke: '#d500f9' },
    },
    heatmap: ['#66bb6a', '#ffee58', '#ffa726', '#ef5350'],
    historyPath: '#d32f2f',
    azureMapStyle: 'grayscale_light',
  },

  // Nature/Forest Theme
  nature: {
    name: 'Nature & Forest',
    description: 'Green theme for forest/wildlife areas',
    colors: {
      primary: '#2e7d32',
      secondary: '#388e3c',
      accent: '#8bc34a',
      background: '#e8f5e9',
    },
    markers: {
      safe: '#1b5e20',
      warning: '#ff8f00',
      danger: '#b71c1c',
      emergency: '#7b1fa2',
      inactive: '#607d8b',
    },
    geofence: {
      safe: { fill: 'rgba(27, 94, 32, 0.25)', stroke: '#1b5e20' },
      warning: { fill: 'rgba(255, 143, 0, 0.25)', stroke: '#ff8f00' },
      danger: { fill: 'rgba(183, 28, 28, 0.25)', stroke: '#b71c1c' },
      restricted: { fill: 'rgba(123, 31, 162, 0.25)', stroke: '#7b1fa2' },
    },
    heatmap: ['#1b5e20', '#7cb342', '#fdd835', '#e53935'],
    historyPath: '#2e7d32',
    azureMapStyle: 'road_shaded_relief',
  },
};

// ===========================================
// GOOGLE MAPS STYLE PRESETS (if using Google Maps)
// ===========================================
export const GOOGLE_MAP_STYLES = {
  // Silver/Light Theme
  silver: [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e4ff' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  ],

  // Dark Theme
  dark: [
    { elementType: 'geometry', stylers: [{ color: '#212121' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#383838' }] },
  ],

  // Retro Theme
  retro: [
    { elementType: 'geometry', stylers: [{ color: '#ebe3cd' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#523735' }] },
    { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#b9d3c2' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f5f1e6' }] },
  ],

  // Aubergine (Purple Dark)
  aubergine: [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#171f29' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  ],
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get theme by name
 * @param {string} themeName - Theme key from MAP_COLOR_THEMES
 * @returns {object} Theme configuration
 */
export const getTheme = (themeName = 'default') => {
  return MAP_COLOR_THEMES[themeName] || MAP_COLOR_THEMES.default;
};

/**
 * Get marker color by tourist status
 * @param {string} status - Tourist status (safe, warning, danger, emergency, inactive)
 * @param {string} themeName - Theme name
 * @returns {string} Hex color code
 */
export const getMarkerColor = (status, themeName = 'default') => {
  const theme = getTheme(themeName);
  return theme.markers[status] || theme.markers.safe;
};

/**
 * Get geofence styling by type
 * @param {string} type - Geofence type (safe, warning, danger, restricted)
 * @param {string} themeName - Theme name
 * @returns {object} { fill, stroke }
 */
export const getGeofenceStyle = (type, themeName = 'default') => {
  const theme = getTheme(themeName);
  return theme.geofence[type] || theme.geofence.safe;
};

/**
 * Get Azure Maps style for theme
 * @param {string} themeName - Theme name
 * @returns {string} Azure Maps style name
 */
export const getAzureMapStyle = (themeName = 'default') => {
  const theme = getTheme(themeName);
  return theme.azureMapStyle || 'grayscale_light';
};

/**
 * Get all available theme names
 * @returns {array} Array of theme keys
 */
export const getAvailableThemes = () => {
  return Object.keys(MAP_COLOR_THEMES).map(key => ({
    key,
    name: MAP_COLOR_THEMES[key].name,
    description: MAP_COLOR_THEMES[key].description,
  }));
};

/**
 * Get all available Azure Map styles
 * @returns {array} Array of style options
 */
export const getAvailableAzureStyles = () => {
  return Object.entries(AZURE_MAP_STYLES).map(([key, value]) => ({
    key,
    value,
    name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
  }));
};

// Default export
export default {
  AZURE_MAP_STYLES,
  MAP_COLOR_THEMES,
  GOOGLE_MAP_STYLES,
  getTheme,
  getMarkerColor,
  getGeofenceStyle,
  getAzureMapStyle,
  getAvailableThemes,
  getAvailableAzureStyles,
};
