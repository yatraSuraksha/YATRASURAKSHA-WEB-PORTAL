import React from 'react';
import SimpleGoogleMap from './components/SimpleGoogleMap';
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
      <SimpleGoogleMap 
        height="100vh"
        showTourists={true}
        showGeofences={true}
        showHeatmap={false}
        center={{ lat: 28.6139, lng: 77.2090 }}
        zoom={10}
      />
      <AlertsOverlay />
    </div>
  );
};

export default App;
