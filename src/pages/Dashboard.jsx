import React, { useState, useEffect } from 'react';
import AzureMap from '../components/AzureMap';

const Dashboard = () => {
  // ...existing state and effect hooks...

  return (
    <div className="dashboard">
      {/* ...existing components... */}
      
      {/* Replace GoogleMap with AzureMap */}
      <div className="map-section">
        <AzureMap
          center={{ lat: 16.5062, lng: 80.6480 }}
          zoom={12}
          height="500px"
          showTourists={true}
          showGeofences={true}
          showHeatmap={false}
        />
      </div>
      
      {/* ...existing components... */}
    </div>
  );
};

export default Dashboard;