import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import azureMapsService from '../services/azureMaps';
import { trackingAPI, geofenceAPI, alertAPI } from '../services/api';
import '../styles/GoogleMap.css';

const AzureMap = forwardRef(({ 
  center = { lat: 26.1445, lng: 91.7362 }, // Default to Guwahati, India
  zoom = 12,
  height = '600px',
  showTourists = true,
  showGeofences = true,
  showHeatmap = false,
  onMapClick = null,
  onTouristSelect = null,
  className = ''
}, ref) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedTourist, setSelectedTourist] = useState(null);
  const [showTouristPanel, setShowTouristPanel] = useState(false);
  const [touristsData, setTouristsData] = useState([]);
  
  // Store map objects for cleanup
  const touristSourceRef = useRef(null);
  const touristLayerRef = useRef(null);
  const touristSymbolLayerRef = useRef(null);
  const geofenceSourceRef = useRef(null);
  const geofenceLayerRef = useRef(null);
  const geofenceBorderLayerRef = useRef(null);
  const heatmapSourceRef = useRef(null);
  const heatmapLayerRef = useRef(null);
  const popupRef = useRef(null);
  const markersRef = useRef([]);
  
  // History tracking refs
  const historySourceRef = useRef(null);
  const historyLineLayerRef = useRef(null);
  const historyMarkersRef = useRef([]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    showTouristDetails: (tourist) => {
      setSelectedTourist(tourist);
      setShowTouristPanel(true);
      // Center map on tourist
      if (mapInstanceRef.current && tourist.lat && tourist.lng) {
        mapInstanceRef.current.setCamera({
          center: [tourist.lng, tourist.lat],
          zoom: 15,
          pitch: 45, // Maintain 3D tilt
          duration: 500
        });
      }
    },
    centerOnTourist: (tourist) => {
      if (mapInstanceRef.current && tourist.lat && tourist.lng) {
        mapInstanceRef.current.setCamera({
          center: [tourist.lng, tourist.lat],
          zoom: 16,
          pitch: 45, // Maintain 3D tilt
          duration: 500
        });
      }
    },
    centerOnLocation: (lat, lng) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCamera({
          center: [lng, lat],
          zoom: 16,
          pitch: 45, // Maintain 3D tilt
          duration: 500
        });
      }
    }
  }));

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
      
      // Create the map with 3D building support
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
        showLogo: true,
        // Enable 3D features
        pitch: 45, // Tilt angle (0-60 degrees)
        bearing: 0, // Rotation angle
        renderWorldCopies: false,
        pitchWithRotate: true // Allow pitch changes when rotating
      });

      // Wait for map to be ready
      map.events.add('ready', () => {
        console.log('Azure Map is ready');

        // Enable 3D building extrusions
        map.setStyle({
          style: 'grayscale_light',
          buildingLayerOptions: {
            visible: true,
            minZoom: 14,
            renderMode: 'extrude', // 3D extruded buildings
            fillColor: 'rgba(150, 150, 150, 0.7)',
            fillOutlineColor: 'rgba(100, 100, 100, 0.5)'
          }
        });

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
      const touristsRawData = response.data.data?.tourists || response.data?.tourists || [];
      
      console.log('Raw tourists data:', touristsRawData);
      
      // Transform API data to map format - only fields available from API:
      // id, digitalId, name, email, profilePhoto, currentLocation, status, createdAt
      const tourists = touristsRawData
        .filter(t => {
          const loc = t.currentLocation;
          return loc && (loc.coordinates || (loc.latitude !== undefined && loc.longitude !== undefined));
        })
        .map(tourist => {
          const loc = tourist.currentLocation;
          // Handle both coordinate formats
          const lat = loc.coordinates ? loc.coordinates[1] : loc.latitude;
          const lng = loc.coordinates ? loc.coordinates[0] : loc.longitude;
          
          return {
            id: tourist._id || tourist.id,
            digitalId: tourist.digitalId || 'N/A',
            name: tourist.name || 'Unknown Tourist',
            email: tourist.email || '',
            profilePhoto: tourist.profilePhoto || null,
            lat: lat,
            lng: lng,
            status: tourist.status || 'safe',
            createdAt: tourist.createdAt || null
          };
        });
      
      console.log('Processed tourists:', tourists);
      setTouristsData(tourists);
      
      if (tourists.length > 0) {
        displayTouristMarkers(tourists);
        
        // Center map on first tourist if we have tourists
        if (tourists[0]) {
          mapInstanceRef.current.setCamera({
            center: [tourists[0].lng, tourists[0].lat],
            zoom: 10
          });
        }
      } else {
        console.log('No tourists with locations found');
      }
    } catch (err) {
      console.error('Failed to load tourists:', err);
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

    console.log('Displaying markers for tourists:', touristData);

    // Clear existing markers
    markersRef.current.forEach(marker => {
      try { map.markers.remove(marker); } catch (e) { /* ignore */ }
    });
    markersRef.current = [];

    // Remove existing tourist layer and source safely
    if (touristSymbolLayerRef.current) {
      try { map.layers.remove(touristSymbolLayerRef.current); } catch (e) { /* ignore */ }
      touristSymbolLayerRef.current = null;
    }
    if (touristLayerRef.current) {
      try { map.layers.remove(touristLayerRef.current); } catch (e) { /* ignore */ }
      touristLayerRef.current = null;
    }
    if (touristSourceRef.current) {
      try { map.sources.remove(touristSourceRef.current); } catch (e) { /* ignore */ }
      touristSourceRef.current = null;
    }

    // Create HTML markers for each tourist with their photo
    touristData.forEach(tourist => {
      const statusColor = getTouristColor(tourist.status);
      const hasPhoto = tourist.profilePhoto && tourist.profilePhoto.trim() !== '';
      
      // Create HTML string for marker (Azure Maps requires HTML string, not DOM element)
      const markerHtml = `
        <div class="tourist-marker" style="
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid ${statusColor};
          background: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        ">
          ${hasPhoto 
            ? `<img src="${tourist.profilePhoto}" alt="${tourist.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
               <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: linear-gradient(135deg, ${statusColor}22, ${statusColor}44); border-radius: 50%;">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="${statusColor}">
                   <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
                 </svg>
               </div>`
            : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, ${statusColor}22, ${statusColor}44); border-radius: 50%;">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="${statusColor}">
                   <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
                 </svg>
               </div>`
          }
          <div style="
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: ${statusColor};
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          "></div>
        </div>
      `;

      console.log('Creating marker at:', tourist.lng, tourist.lat, 'for:', tourist.name);

      // Create the marker
      const marker = new atlas.HtmlMarker({
        position: [tourist.lng, tourist.lat],
        htmlContent: markerHtml,
        anchor: 'center'
      });

      // Add click event to show tourist details panel
      map.events.add('click', marker, () => {
        console.log('Marker clicked:', tourist);
        setSelectedTourist(tourist);
        setShowTouristPanel(true);
        if (onTouristSelect) {
          onTouristSelect(tourist);
        }
      });

      map.markers.add(marker);
      markersRef.current.push(marker);
    });
    
    console.log('Total markers added:', markersRef.current.length);
  };

  // Helper function to create default user icon SVG
  const createDefaultUserIcon = (name, color) => {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    return `
      <div style="
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, ${color}22, ${color}44);
        border-radius: 50%;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="${color}"/>
        </svg>
      </div>
    `;
  };

  // Handle tourist operations
  const handleViewHistory = async (touristId) => {
    try {
      // Close the tourist panel
      setShowTouristPanel(false);
      setSelectedTourist(null);
      
      const response = await trackingAPI.getLocationHistory(touristId, { limit: 50, hours: 24 });
      const historyData = response.data?.data || response.data;
      const locations = historyData?.locations || [];
      
      console.log('Location history:', locations);
      
      if (locations.length === 0) {
        alert('No location history found for this tourist');
        return;
      }
      
      // Display history on map
      displayLocationHistory(locations, historyData.touristName || 'Tourist');
      
    } catch (err) {
      console.error('Failed to load history:', err);
      alert('Failed to load location history');
    }
  };

  // Display location history with dots and lines on the map
  const displayLocationHistory = (locations, touristName) => {
    if (!mapInstanceRef.current || !window.atlas || locations.length === 0) return;
    
    const atlas = window.atlas;
    const map = mapInstanceRef.current;
    
    // Clear previous history
    clearLocationHistory();
    
    // Sort locations by timestamp (oldest first for drawing the path)
    const sortedLocations = [...locations].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Create line coordinates
    const lineCoordinates = sortedLocations.map(loc => [loc.longitude, loc.latitude]);
    
    // Create a data source for the line
    const dataSource = new atlas.source.DataSource();
    map.sources.add(dataSource);
    historySourceRef.current = dataSource;
    
    // Add the line to the data source
    dataSource.add(new atlas.data.Feature(
      new atlas.data.LineString(lineCoordinates),
      { name: 'history-path' }
    ));
    
    // Create a line layer
    const lineLayer = new atlas.layer.LineLayer(dataSource, null, {
      strokeColor: '#1a73e8',
      strokeWidth: 3,
      strokeDashArray: [2, 2],
      lineJoin: 'round',
      lineCap: 'round'
    });
    map.layers.add(lineLayer);
    historyLineLayerRef.current = lineLayer;
    
    // Create markers for each point
    sortedLocations.forEach((location, index) => {
      const isStart = index === 0;
      const isEnd = index === sortedLocations.length - 1;
      const time = new Date(location.timestamp).toLocaleTimeString();
      const pointNumber = index + 1;
      
      // Determine marker style
      let markerColor = '#1a73e8';
      let markerSize = 20;
      
      if (isStart) {
        markerColor = '#4caf50'; // Green for start
      } else if (isEnd) {
        markerColor = '#f44336'; // Red for end
      }
      
      // Create HTML marker with number
      const markerHtml = `
        <div style="
          width: ${markerSize}px;
          height: ${markerSize}px;
          background: ${markerColor};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
        " title="${pointNumber}. ${time}${isStart ? ' (Start)' : isEnd ? ' (End)' : ''}">
          ${pointNumber}
        </div>
      `;
      
      const marker = new atlas.HtmlMarker({
        position: [location.longitude, location.latitude],
        htmlContent: markerHtml,
        anchor: 'center'
      });
      
      map.markers.add(marker);
      historyMarkersRef.current.push(marker);
      
      // Add click event to show details
      map.events.add('click', marker, () => {
        const popup = new atlas.Popup({
          position: [location.longitude, location.latitude],
          content: `
            <div style="padding: 10px; font-family: system-ui;">
              <strong>${touristName}</strong><br/>
              <small style="color: #666;">Point ${index + 1}${isStart ? ' (Start)' : isEnd ? ' (Current)' : ''}</small>
              <hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;"/>
              <div style="font-size: 12px;">
                <div>🕐 ${new Date(location.timestamp).toLocaleString()}</div>
                <div>📍 ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}</div>
                ${location.speed ? `<div>🚗 ${location.speed} m/s</div>` : ''}
                ${location.altitude ? `<div>⛰️ ${location.altitude}m</div>` : ''}
                ${location.batteryLevel ? `<div>🔋 ${location.batteryLevel}%</div>` : ''}
              </div>
            </div>
          `,
          pixelOffset: [0, -10]
        });
        popup.open(map);
      });
    });
    
    // Fit map to show all history points
    if (lineCoordinates.length > 0) {
      const bounds = atlas.data.BoundingBox.fromPositions(lineCoordinates);
      map.setCamera({
        bounds: bounds,
        padding: 50
      });
    }
    
    console.log(`Displayed ${sortedLocations.length} history points on map`);
  };
  
  // Clear location history from map
  const clearLocationHistory = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    // Remove markers
    historyMarkersRef.current.forEach(marker => {
      try { map.markers.remove(marker); } catch (e) { /* ignore */ }
    });
    historyMarkersRef.current = [];
    
    // Remove line layer
    if (historyLineLayerRef.current) {
      try { map.layers.remove(historyLineLayerRef.current); } catch (e) { /* ignore */ }
      historyLineLayerRef.current = null;
    }
    
    // Remove data source
    if (historySourceRef.current) {
      try { map.sources.remove(historySourceRef.current); } catch (e) { /* ignore */ }
      historySourceRef.current = null;
    }
  };

  const handleCenterOnTourist = (tourist) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCamera({
        center: [tourist.lng, tourist.lat],
        zoom: 16,
        duration: 500
      });
    }
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
      case 'emergency': return '#e91e63';
      case 'active': return '#4caf50';
      case 'inactive': return '#9e9e9e';
      default: return '#1a73e8';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'safe': return 'Safe';
      case 'warning': return 'Warning';
      case 'danger': return 'Danger';
      case 'emergency': return 'Emergency';
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      default: return status || 'Unknown';
    }
  };

  const cleanup = () => {
    // Clear markers
    markersRef.current.forEach(marker => {
      try { mapInstanceRef.current?.markers.remove(marker); } catch (e) { /* ignore */ }
    });
    markersRef.current = [];
    
    // Clear history
    clearLocationHistory();
    
    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.dispose(); } catch (e) { /* ignore */ }
      mapInstanceRef.current = null;
    }
  };

  // Close panel handler
  const closeTouristPanel = () => {
    setShowTouristPanel(false);
    setSelectedTourist(null);
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

      {/* Tourist Count Badge */}
      {!isLoading && touristsData.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '10px 16px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 100
        }}>
          <span style={{ fontSize: '18px' }}>👥</span>
          <span style={{ fontWeight: '600', color: '#1a73e8' }}>{touristsData.length}</span>
          <span style={{ color: '#666', fontSize: '14px' }}>Tourists Active</span>
        </div>
      )}

      {/* Tourist Details Panel - Centered Modal */}
      {showTouristPanel && selectedTourist && (
        <>
          {/* Backdrop */}
          <div 
            onClick={closeTouristPanel}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)',
              zIndex: 999
            }}
          />
          {/* Modal */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '320px',
            maxHeight: '80%',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column'
          }}>
          {/* Header with photo */}
          <div style={{
            background: `linear-gradient(135deg, ${getTouristColor(selectedTourist.status)}22, ${getTouristColor(selectedTourist.status)}44)`,
            padding: '16px',
            borderBottom: `3px solid ${getTouristColor(selectedTourist.status)}`,
            position: 'relative'
          }}>
            {/* Close button */}
            <button 
              onClick={closeTouristPanel}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,0.1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: '#666'
              }}
            >✕</button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Profile Photo */}
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: `3px solid ${getTouristColor(selectedTourist.status)}`,
                background: 'white',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                flexShrink: 0
              }}>
                {selectedTourist.profilePhoto ? (
                  <img 
                    src={selectedTourist.profilePhoto} 
                    alt={selectedTourist.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div style={{ 
                  display: selectedTourist.profilePhoto ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(135deg, ${getTouristColor(selectedTourist.status)}22, ${getTouristColor(selectedTourist.status)}44)`
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill={getTouristColor(selectedTourist.status)}>
                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
                  </svg>
                </div>
              </div>
              
              {/* Name and Status */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedTourist.name}
                </h3>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: getTouristColor(selectedTourist.status),
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }}></span>
                  {getStatusLabel(selectedTourist.status).toUpperCase()}
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#666' }}>
                  ID: {selectedTourist.digitalId}
                </p>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
            {/* Info */}
            <div style={{ marginBottom: '12px' }}>
              <InfoItem label="📧 Email" value={selectedTourist.email || 'N/A'} />
            </div>

            {/* Location */}
            <div style={{ 
              background: '#f5f5f5', 
              padding: '8px', 
              borderRadius: '6px',
              marginBottom: '12px'
            }}>
              <label style={{ fontSize: '10px', color: '#888', fontWeight: '500' }}>📍 CURRENT LOCATION</label>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#333' }}>
                {selectedTourist.lat.toFixed(6)}, {selectedTourist.lng.toFixed(6)}
              </p>
            </div>

            {/* Created At */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '10px', color: '#888', fontWeight: '500' }}>📅 REGISTERED</label>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#333' }}>
                {selectedTourist.createdAt ? new Date(selectedTourist.createdAt).toLocaleString() : 'N/A'}
              </p>
            </div>

            {/* Action Button - History only */}
            <button
              onClick={() => handleViewHistory(selectedTourist.id)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                background: '#1a73e8',
                color: 'white',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'background 0.2s'
              }}
            >
              📍 View Location History
            </button>
          </div>
        </div>
      </>
      )}
    </div>
  );
});

// Helper component for info items
const InfoItem = ({ label, value }) => (
  <div>
    <label style={{ fontSize: '11px', color: '#888', fontWeight: '500' }}>{label}</label>
    <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#333', fontWeight: '500' }}>
      {value}
    </p>
  </div>
);

export default AzureMap;