import React from 'react';
import AzureMap from './components/AzureMap';
import AlertsOverlay from './components/AlertsOverlay';
import './index.css';

// Full-screen map app with alerts overlay
const App = () => {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0, 
      overflow: 'hidden',
      position: 'relative'
    }}>
      <AzureMap 
        height="100vh"
        showTourists={true}
        showGeofences={true}
        showHeatmap={false}
        center={{ lat: 16.5062, lng: 80.6480 }}
        zoom={12}
      />
      <AlertsOverlay />
    </div>
  );
};

export default App;
