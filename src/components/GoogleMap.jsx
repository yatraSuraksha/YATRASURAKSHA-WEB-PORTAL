import React, { useEffect, useRef, useState } from 'react';
import googleMapsService from '../services/googleMaps';
import { trackingAPI, geofenceAPI } from '../services/api';
import { mapStyles } from '../utils/mapStyles';

const GoogleMap = ({ 
  center = { lat: 28.6139, lng: 77.2090 }, 
  zoom = 10,
  height = '600px',
  showTourists = true,
  showGeofences = true,
  showHeatmap = false,
  onMapClick = null,
  className = ''
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tourists, setTourists] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  
  // Store map objects for cleanup
  const markersRef = useRef([]);
  const geofenceShapesRef = useRef([]);
  const heatmapRef = useRef(null);

  // Debug styles loading
  useEffect(() => {
    console.log('Map styles loaded:', Array.isArray(mapStyles), 'Length:', mapStyles?.length);
    console.log('First style rule:', mapStyles?.[0]);
  }, []);

  useEffect(() => {
    initializeMap();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) {
      if (showTourists) {
        loadTourists();
      } else {
        clearMarkers();
      }
    }
  }, [showTourists]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      if (showGeofences) {
        loadGeofences();
      } else {
        clearGeofences();
      }
    }
  }, [showGeofences]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      if (showHeatmap) {
        loadHeatmap();
      } else {
        clearHeatmap();
      }
    }
  }, [showHeatmap]);

  const initializeMap = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize Google Maps API
      const google = await googleMapsService.initialize();

      console.log('Applying custom map styles:', mapStyles.length, 'style rules');

      // Create map instance
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: center,
        zoom: zoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: mapStyles, // Using your custom blue-white map styles
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true
      });

      // Add click listener if provided
      if (onMapClick) {
        mapInstanceRef.current.addListener('click', (event) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          onMapClick({ lat, lng });
        });
      }

      console.log('Google Maps initialized successfully');
      
      // Force apply styles after a short delay to ensure map is fully loaded
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setOptions({ styles: mapStyles });
          console.log('Custom styles re-applied');
        }
      }, 1000);
      
      setIsLoading(false);

    } catch (err) {
      console.error('Failed to initialize Google Maps:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const loadTourists = async () => {
    try {
      const response = await trackingAPI.getHeatmapData();
      const touristData = response.data.data.locations || [];
      setTourists(touristData);
      displayTouristMarkers(touristData);
    } catch (err) {
      console.error('Failed to load tourist data:', err);
    }
  };

  const loadGeofences = async () => {
    try {
      const response = await geofenceAPI.getAll({ limit: 100 });
      const geofenceData = response.data.data.geofences || [];
      setGeofences(geofenceData);
      displayGeofences(geofenceData);
    } catch (err) {
      console.error('Failed to load geofences:', err);
    }
  };

  const loadHeatmap = async () => {
    try {
      const response = await trackingAPI.getHeatmapData();
      const heatmapPoints = response.data.data.locations || [];
      setHeatmapData(heatmapPoints);
      displayHeatmap(heatmapPoints);
    } catch (err) {
      console.error('Failed to load heatmap data:', err);
    }
  };

  const displayTouristMarkers = (touristData) => {
    const google = googleMapsService.getGoogle();
    if (!google || !mapInstanceRef.current) return;

    // Clear existing markers
    clearMarkers();

    touristData.forEach((tourist) => {
      const marker = new google.maps.Marker({
        position: { 
          lat: tourist.coordinates[1], 
          lng: tourist.coordinates[0] 
        },
        map: mapInstanceRef.current,
        title: `Tourist: ${tourist.touristId || 'Unknown'}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: getTouristColor(tourist.safetyScore),
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 8
        }
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: createTouristInfoContent(tourist)
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });
  };

  const displayGeofences = (geofenceData) => {
    const google = googleMapsService.getGoogle();
    if (!google || !mapInstanceRef.current) return;

    // Clear existing geofences
    clearGeofences();

    geofenceData.forEach((geofence) => {
      let shape = null;

      if (geofence.geometry.type === 'Point' && geofence.radius) {
        // Circle geofence
        shape = new google.maps.Circle({
          center: {
            lat: geofence.geometry.coordinates[1],
            lng: geofence.geometry.coordinates[0]
          },
          radius: geofence.radius,
          map: mapInstanceRef.current,
          fillColor: getGeofenceColor(geofence.type),
          fillOpacity: 0.3,
          strokeColor: getGeofenceColor(geofence.type),
          strokeOpacity: 0.8,
          strokeWeight: 2
        });
      } else if (geofence.geometry.type === 'Polygon') {
        // Polygon geofence
        const paths = geofence.geometry.coordinates[0].map(coord => ({
          lat: coord[1],
          lng: coord[0]
        }));

        shape = new google.maps.Polygon({
          paths: paths,
          map: mapInstanceRef.current,
          fillColor: getGeofenceColor(geofence.type),
          fillOpacity: 0.3,
          strokeColor: getGeofenceColor(geofence.type),
          strokeOpacity: 0.8,
          strokeWeight: 2
        });
      }

      if (shape) {
        // Add info window
        const infoWindow = new google.maps.InfoWindow({
          content: createGeofenceInfoContent(geofence)
        });

        shape.addListener('click', (event) => {
          infoWindow.setPosition(event.latLng);
          infoWindow.open(mapInstanceRef.current);
        });

        geofenceShapesRef.current.push(shape);
      }
    });
  };

  const displayHeatmap = (heatmapPoints) => {
    const google = googleMapsService.getGoogle();
    if (!google || !mapInstanceRef.current) return;

    // Clear existing heatmap
    clearHeatmap();

    const heatmapData = heatmapPoints.map(point => ({
      location: new google.maps.LatLng(
        point.coordinates[1], 
        point.coordinates[0]
      ),
      weight: point.weight || 1
    }));

    heatmapRef.current = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: mapInstanceRef.current,
      radius: 20,
      opacity: 0.6
    });
  };

  const getTouristColor = (safetyScore) => {
    if (safetyScore >= 80) return '#10b981'; // Green - Safe
    if (safetyScore >= 60) return '#f59e0b'; // Yellow - Caution
    if (safetyScore >= 40) return '#f97316'; // Orange - Warning
    return '#ef4444'; // Red - Danger
  };

  const getGeofenceColor = (type) => {
    const colors = {
      safe: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      restricted: '#8b5cf6',
      emergency_services: '#06b6d4',
      accommodation: '#3b82f6',
      tourist_spot: '#22c55e'
    };
    return colors[type] || '#6b7280';
  };

  const createTouristInfoContent = (tourist) => {
    return `
      <div style="padding: 8px; max-width: 200px;">
        <h3 style="margin: 0 0 8px 0; color: #1e293b;">Tourist Info</h3>
        <p><strong>ID:</strong> ${tourist.touristId || 'Unknown'}</p>
        <p><strong>Safety Score:</strong> ${tourist.safetyScore || 'N/A'}</p>
        <p><strong>Last Update:</strong> ${tourist.timestamp ? new Date(tourist.timestamp).toLocaleString() : 'N/A'}</p>
      </div>
    `;
  };

  const createGeofenceInfoContent = (geofence) => {
    return `
      <div style="padding: 8px; max-width: 200px;">
        <h3 style="margin: 0 0 8px 0; color: #1e293b;">${geofence.name}</h3>
        <p><strong>Type:</strong> ${geofence.type}</p>
        <p><strong>Risk Level:</strong> ${geofence.riskLevel}/10</p>
        <p><strong>Description:</strong> ${geofence.description || 'No description'}</p>
      </div>
    `;
  };

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  const clearGeofences = () => {
    geofenceShapesRef.current.forEach(shape => shape.setMap(null));
    geofenceShapesRef.current = [];
  };

  const clearHeatmap = () => {
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
      heatmapRef.current = null;
    }
  };

  const applyCustomStyles = () => {
    if (mapInstanceRef.current && mapStyles) {
      console.log('Manually applying custom styles...');
      mapInstanceRef.current.setOptions({ 
        styles: mapStyles,
        mapTypeId: 'roadmap'
      });
      console.log('Styles applied successfully');
    }
  };

  const cleanup = () => {
    clearMarkers();
    clearGeofences();
    clearHeatmap();
  };

  if (error) {
    return (
      <div className={`map-container ${className}`} style={{ height }}>
        <div className="error">
          <h3>Google Maps Error</h3>
          <p>{error}</p>
          <p>Please check your Google Maps API key configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`map-container ${className}`} style={{ height, position: 'relative' }}>
      {isLoading && (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading Google Maps...</span>
        </div>
      )}
      
      {/* Debug Controls - Remove in production */}
      {!isLoading && !error && (
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          right: '10px', 
          zIndex: 1000, 
          background: 'white', 
          padding: '10px', 
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          <button 
            onClick={applyCustomStyles}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Apply Custom Style
          </button>
        </div>
      )}
      
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          display: isLoading ? 'none' : 'block'
        }} 
      />
    </div>
  );
};

export default GoogleMap;