import React, { useState, useRef } from 'react';
import AzureMap from './components/AzureMap';
import AlertsOverlay from './components/AlertsOverlay';
import TouristsSidebar from './components/TouristsSidebar';
import VideosModal from './components/VideosModal';
import './index.css';

// Full-screen map app with alerts overlay
const App = () => {
  const mapRef = useRef(null);
  const [showVideosModal, setShowVideosModal] = useState(false);
  const [selectedTouristForVideos, setSelectedTouristForVideos] = useState(null);

  const handleTouristSelect = (tourist) => {
    // This will trigger the map to show the tourist details panel
    if (mapRef.current?.showTouristDetails) {
      mapRef.current.showTouristDetails(tourist);
    }
  };

  const handleViewVideos = (touristId, touristName) => {
    setSelectedTouristForVideos({ id: touristId, name: touristName });
    setShowVideosModal(true);
  };

  const handleCloseVideos = () => {
    setShowVideosModal(false);
    setSelectedTouristForVideos(null);
  };

  const handleViewAlertOnMap = (location) => {
    if (mapRef.current?.centerOnLocation && location?.latitude && location?.longitude) {
      mapRef.current.centerOnLocation(location.latitude, location.longitude);
    }
  };

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
        ref={mapRef}
        height="100vh"
        showTourists={true}
        showGeofences={true}
        showHeatmap={false}
        center={{ lat: 16.5062, lng: 80.6480 }}
        zoom={12}
      />
      
      <TouristsSidebar 
        onTouristSelect={handleTouristSelect}
        onViewVideos={handleViewVideos}
      />
      
      <AlertsOverlay onViewOnMap={handleViewAlertOnMap} />
      
      {showVideosModal && selectedTouristForVideos && (
        <VideosModal
          touristId={selectedTouristForVideos.id}
          touristName={selectedTouristForVideos.name}
          onClose={handleCloseVideos}
        />
      )}
    </div>
  );
};

export default App;
