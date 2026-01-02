// Azure Maps custom styles - Blue and white theme for Yatra Suraksha

export const azureMapStyles = {
  // Azure Maps uses style definitions differently
  // These are layer style options for customization
  
  // Main style preset - use 'grayscale_light' as base then customize
  baseStyle: 'grayscale_light',
  
  // Custom colors for overlays
  colors: {
    primary: '#1a73e8',
    secondary: '#4285f4',
    accent: '#0d47a1',
    water: '#aadaff',
    land: '#f5f5f5',
    roads: '#ffffff',
    buildings: '#e8e8e8',
    parks: '#c8e6c9',
    labels: '#5d5d5d'
  },
  
  // Marker styles
  markers: {
    tourist: {
      safe: '#4caf50',
      warning: '#ff9800', 
      danger: '#f44336'
    },
    geofence: {
      safe: 'rgba(76, 175, 80, 0.3)',
      restricted: 'rgba(244, 67, 54, 0.3)',
      warning: 'rgba(255, 152, 0, 0.3)'
    }
  }
};

// Azure Maps style options for map initialization
export const getAzureMapOptions = (center, zoom) => ({
  center: [center.lng, center.lat], // Azure uses [lng, lat]
  zoom: zoom,
  style: 'grayscale_light', // Clean light style
  language: 'en-US',
  showFeedbackLink: false,
  showLogo: false
});

export default azureMapStyles;