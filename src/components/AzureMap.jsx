import React, { useRef, useEffect, useState } from 'react';
import azureMapsService from '../services/azureMaps';
import { trackingAPI, geofenceAPI } from '../services/api';
import '../styles/GoogleMap.css';

const AzureMap = ({ 
  center = { lat: 16.5062, lng: 80.6480 }, 
  zoom = 12,
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
  const [mapReady, setMapReady] = useState(false);
  
  // Store map objects for cleanup
  const touristSourceRef = useRef(null);
  const touristLayerRef = useRef(null);
  const geofenceSourceRef = useRef(null);
  const geofenceLayerRef = useRef(null);
  const geofenceBorderLayerRef = useRef(null);
  const heatmapSourceRef = useRef(null);
  const heatmapLayerRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    initializeMap();
    return () => cleanup();
  }, []);

  // Load data when map is ready
  useEffect(() => {
    if (mapReady && mapInstanceRef.current) {
      if (showTourists) loadTourists();
      if (showGeofences) loadGeofences();
      if (showHeatmap) loadHeatmap();
    }
  }, [mapReady, showTourists, showGeofences, showHeatmap]);

  const initializeMap = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const atlas = await azureMapsService.initialize();
      
      if (!mapRef.current) {
        throw new Error('Map container not found');
      }

      const subscriptionKey = azureMapsService.getSubscriptionKey();
      
      // Create the map
      const map = new atlas.Map(mapRef.current, {
        authOptions: {
          authType: 'subscriptionKey',
          subscriptionKey: subscriptionKey
        },
        center: [center.lng, center.lat],
        zoom: zoom,
        style: 'grayscale_light',
        language: 'en-US',
        showFeedbackLink: false,
        showLogo: true
      });

      // Wait for map to be ready
      map.events.add('ready', () => {
        console.log('Azure Map is ready');

        // Create popup
        popupRef.current = new atlas.Popup({
          pixelOffset: [0, -18],
          closeButton: true
        });

        // Add click handler
        if (onMapClick) {
          map.events.add('click', (e) => {
            onMapClick({
              lat: e.position[1],
              lng: e.position[0]
            });
          });
        }

        mapInstanceRef.current = map;
        setIsLoading(false);
        setMapReady(true);
      });

      map.events.add('error', (e) => {
        console.warn('Azure Map error (non-critical):', e.error?.message || e);
        // Don't set error state for tile errors - they're usually temporary
      });

    } catch (err) {
      console.error('Failed to initialize Azure Map:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const loadTourists = async () => {
    try {
      if (!mapInstanceRef.current || !window.atlas) return;

      // Fetch tourists from API
      const response = await trackingAPI.getAllTouristsWithLocations();
      const touristsData = response.data.data?.tourists || response.data?.tourists || [];
      
      // Transform API data to map format
      const tourists = touristsData
        .filter(t => t.currentLocation?.coordinates)
        .map(tourist => ({
          id: tourist._id,
          name: tourist.personalInfo?.name || tourist.name || 'Unknown',
          lat: tourist.currentLocation.coordinates[1],
          lng: tourist.currentLocation.coordinates[0],
          safetyScore: tourist.safetyScore || 50,
          status: tourist.safetyScore >= 70 ? 'safe' : tourist.safetyScore >= 40 ? 'warning' : 'danger'
        }));
      
      if (tourists.length > 0) {
        displayTouristMarkers(tourists);
      } else {
        console.log('No tourists with locations found');
      }
    } catch (err) {
      console.error('Failed to load tourists:', err);
      // Show empty state - no mock data
    }
  };

  const loadGeofences = async () => {
    try {
      if (!mapInstanceRef.current || !window.atlas) return;

      // Fetch geofences from API
      const response = await geofenceAPI.getAll({ limit: 100 });
      const geofencesData = response.data.data?.geofences || response.data?.geofences || [];
      
      // Transform API data to map format
      const geofences = geofencesData.map(fence => ({
        id: fence._id || fence.fenceId,
        name: fence.name,
        type: fence.type || 'safe',
        center: {
          lat: fence.center?.coordinates?.[1] || fence.center?.latitude,
          lng: fence.center?.coordinates?.[0] || fence.center?.longitude
        },
        radius: fence.radius || 500
      })).filter(f => f.center.lat && f.center.lng);
      
      if (geofences.length > 0) {
        displayGeofences(geofences);
      } else {
        console.log('No geofences found');
      }
    } catch (err) {
      console.error('Failed to load geofences:', err);
      // Show empty state - no mock data
    }
  };

  const loadHeatmap = async () => {
    try {
      if (!mapInstanceRef.current || !window.atlas) return;

      const atlas = window.atlas;
      const map = mapInstanceRef.current;
      
      // Remove existing heatmap layer if exists
      if (heatmapLayerRef.current) {
        try { map.layers.remove(heatmapLayerRef.current); } catch (e) { /* ignore */ }
      }
      if (heatmapSourceRef.current) {
        try { map.sources.remove(heatmapSourceRef.current); } catch (e) { /* ignore */ }
      }

      // Fetch heatmap data from API
      const response = await trackingAPI.getHeatmapData();
      const heatmapData = response.data.data?.points || response.data?.points || [];
      
      // Transform API data to heatmap format [lng, lat, intensity]
      const heatmapPoints = heatmapData.map(point => [
        point.longitude || point.lng || point.coordinates?.[0],
        point.latitude || point.lat || point.coordinates?.[1],
        point.intensity || point.weight || 0.5
      ]).filter(p => p[0] && p[1]);

      if (heatmapPoints.length === 0) {
        console.log('No heatmap data available');
        return;
      }

      // Create heatmap data source
      heatmapSourceRef.current = new atlas.source.DataSource();
      map.sources.add(heatmapSourceRef.current);

      // Add points
      heatmapPoints.forEach(point => {
        heatmapSourceRef.current.add(new atlas.data.Feature(
          new atlas.data.Point([point[0], point[1]]),
          { intensity: point[2] }
        ));
      });

      // Create heatmap layer
      heatmapLayerRef.current = new atlas.layer.HeatMapLayer(heatmapSourceRef.current, null, {
        radius: 20,
        opacity: 0.8,
        intensity: 1,
        color: [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0,0,255,0)',
          0.2, 'royalblue',
          0.4, 'cyan',
          0.6, 'lime',
          0.8, 'yellow',
          1, 'red'
        ]
      });

      map.layers.add(heatmapLayerRef.current);
    } catch (err) {
      console.error('Failed to load heatmap:', err);
    }
  };

  const displayTouristMarkers = (touristData) => {
    if (!mapInstanceRef.current || !window.atlas) return;

    const atlas = window.atlas;
    const map = mapInstanceRef.current;

    // Remove existing tourist layer and source safely
    if (touristLayerRef.current) {
      try { map.layers.remove(touristLayerRef.current); } catch (e) { /* ignore */ }
      touristLayerRef.current = null;
    }
    if (touristSourceRef.current) {
      try { map.sources.remove(touristSourceRef.current); } catch (e) { /* ignore */ }
      touristSourceRef.current = null;
    }

    // Create data source for tourists
    touristSourceRef.current = new atlas.source.DataSource();
    map.sources.add(touristSourceRef.current);

    // Add tourist points
    touristData.forEach(tourist => {
      const point = new atlas.data.Feature(
        new atlas.data.Point([tourist.lng, tourist.lat]),
        {
          id: tourist.id,
          name: tourist.name,
          safetyScore: tourist.safetyScore,
          status: tourist.status
        }
      );
      touristSourceRef.current.add(point);
    });

    // Create bubble layer for tourists
    touristLayerRef.current = new atlas.layer.BubbleLayer(touristSourceRef.current, null, {
      radius: 12,
      color: [
        'case',
        ['==', ['get', 'status'], 'safe'], '#4caf50',
        ['==', ['get', 'status'], 'warning'], '#ff9800',
        ['==', ['get', 'status'], 'danger'], '#f44336',
        '#1a73e8'
      ],
      strokeColor: 'white',
      strokeWidth: 2
    });

    map.layers.add(touristLayerRef.current);

    // Add click event for popups
    map.events.add('click', touristLayerRef.current, (e) => {
      if (e.shapes && e.shapes.length > 0) {
        const properties = e.shapes[0].getProperties();
        const position = e.shapes[0].getCoordinates();
        
        popupRef.current.setOptions({
          content: `
            <div style="padding: 12px; font-family: 'Inter', sans-serif;">
              <h3 style="margin: 0 0 8px 0; color: #1a73e8; font-size: 14px;">${properties.name}</h3>
              <p style="margin: 4px 0; font-size: 12px;"><strong>Safety Score:</strong> ${properties.safetyScore}</p>
              <p style="margin: 4px 0; font-size: 12px;"><strong>Status:</strong> 
                <span style="color: ${getTouristColor(properties.status)}; font-weight: 600;">${properties.status.toUpperCase()}</span>
              </p>
            </div>
          `,
          position: position
        });
        popupRef.current.open(map);
      }
    });
  };

  const displayGeofences = (geofenceData) => {
    if (!mapInstanceRef.current || !window.atlas) return;

    const atlas = window.atlas;
    const map = mapInstanceRef.current;

    // Remove existing geofence layers and source safely
    if (geofenceBorderLayerRef.current) {
      try { map.layers.remove(geofenceBorderLayerRef.current); } catch (e) { /* ignore */ }
      geofenceBorderLayerRef.current = null;
    }
    if (geofenceLayerRef.current) {
      try { map.layers.remove(geofenceLayerRef.current); } catch (e) { /* ignore */ }
      geofenceLayerRef.current = null;
    }
    if (geofenceSourceRef.current) {
      try { map.sources.remove(geofenceSourceRef.current); } catch (e) { /* ignore */ }
      geofenceSourceRef.current = null;
    }

    // Create data source for geofences
    geofenceSourceRef.current = new atlas.source.DataSource();
    map.sources.add(geofenceSourceRef.current);

    // Add geofence circles as actual circle polygons
    geofenceData.forEach(geofence => {
      // Create a circle polygon
      const centerPoint = [geofence.center.lng, geofence.center.lat];
      const circlePolygon = atlas.math.getRegularPolygonPath(
        centerPoint,
        geofence.radius,
        64 // number of sides (more = smoother circle)
      );
      
      const polygon = new atlas.data.Feature(
        new atlas.data.Polygon([circlePolygon]),
        {
          id: geofence.id,
          name: geofence.name,
          type: geofence.type
        }
      );
      geofenceSourceRef.current.add(polygon);
    });

    // Create polygon layer for geofences
    geofenceLayerRef.current = new atlas.layer.PolygonLayer(geofenceSourceRef.current, null, {
      fillColor: [
        'case',
        ['==', ['get', 'type'], 'safe'], 'rgba(76, 175, 80, 0.25)',
        ['==', ['get', 'type'], 'restricted'], 'rgba(244, 67, 54, 0.25)',
        ['==', ['get', 'type'], 'warning'], 'rgba(255, 152, 0, 0.25)',
        'rgba(26, 115, 232, 0.25)'
      ],
      fillOpacity: 0.6
    });

    // Create line layer for geofence borders
    geofenceBorderLayerRef.current = new atlas.layer.LineLayer(geofenceSourceRef.current, null, {
      strokeColor: [
        'case',
        ['==', ['get', 'type'], 'safe'], '#4caf50',
        ['==', ['get', 'type'], 'restricted'], '#f44336',
        ['==', ['get', 'type'], 'warning'], '#ff9800',
        '#1a73e8'
      ],
      strokeWidth: 2
    });

    map.layers.add(geofenceLayerRef.current);
    map.layers.add(geofenceBorderLayerRef.current);
  };

  const getTouristColor = (status) => {
    switch (status) {
      case 'safe': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'danger': return '#f44336';
      default: return '#1a73e8';
    }
  };

  const cleanup = () => {
    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.dispose(); } catch (e) { /* ignore */ }
      mapInstanceRef.current = null;
    }
  };

  if (error) {
    return (
      <div className={`map-container ${className}`} style={{ height, position: 'relative' }}>
        <div className="error">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={initializeMap}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`map-container ${className}`} style={{ height, position: 'relative' }}>
      {isLoading && (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading Azure Maps...</span>
        </div>
      )}
      
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease'
        }} 
      />
    </div>
  );
};

export default AzureMap;