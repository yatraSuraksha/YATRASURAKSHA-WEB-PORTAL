import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import azureMapsService from '../services/azureMaps';
import { trackingAPI, geofenceAPI, alertAPI, safetyAPI } from '../services/api';
import MapThemeSelector from './MapThemeSelector';
import GeofenceManager from './GeofenceManager';
import { getTheme, getMarkerColor, getGeofenceStyle } from '../utils/mapThemes';
import '../styles/GoogleMap.css';

// Safety level colors
const SAFETY_COLORS = {
  veryHigh: '#22c55e',   // Green - Very Safe (80-100)
  high: '#84cc16',       // Lime - Safe (60-80)
  moderate: '#eab308',   // Yellow - Moderate (40-60)
  low: '#f97316',        // Orange - Low Safety (20-40)
  veryLow: '#ef4444',    // Red - Dangerous (0-20)
};

const getSafetyColor = (score) => {
  if (score >= 80) return SAFETY_COLORS.veryHigh;
  if (score >= 60) return SAFETY_COLORS.high;
  if (score >= 40) return SAFETY_COLORS.moderate;
  if (score >= 20) return SAFETY_COLORS.low;
  return SAFETY_COLORS.veryLow;
};

const getSafetyLabel = (score) => {
  if (score >= 80) return 'Very Safe';
  if (score >= 60) return 'Safe';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Low Safety';
  return 'Dangerous';
};

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
  
  // Safety overlay state
  const [showSafetyOverlay, setShowSafetyOverlay] = useState(true); // Changed to true to enable by default
  const [safetyData, setSafetyData] = useState([]);
  const [safetyLoading, setSafetyLoading] = useState(false);
  
  // Fake location mode state (temporary feature)
  const [fakeLocationMode, setFakeLocationMode] = useState(false);
  const [fakeLocationTourist, setFakeLocationTourist] = useState(null);
  const [fakeLocationCount, setFakeLocationCount] = useState(0);
  
  // Geofence manager state - ADD THIS LINE
  const [showGeofenceManager, setShowGeofenceManager] = useState(false);
  
  // Theme state
  const [currentTheme, setCurrentTheme] = useState('default');
  const [currentMapStyle, setCurrentMapStyle] = useState('grayscale_light');
  
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
  
  // Safety overlay refs
  const safetySourceRef = useRef(null);
  const safetyLayerRef = useRef(null);
  const safetyPopupRef = useRef(null);
  
  // History tracking refs
  const historySourceRef = useRef(null);
  const historyLineLayerRef = useRef(null);
  const historyMarkersRef = useRef([]);
  
  // Fake location refs (needed for map event listener)
  const fakeLocationModeRef = useRef(false);
  const fakeLocationTouristRef = useRef(null);

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
      // Load safety overlay by default since it's enabled
      if (showSafetyOverlay) loadSafetyOverlay();
    }
  }, [mapReady, showTourists, showGeofences, showHeatmap, showSafetyOverlay]);

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
        pitch: 45, // Tilt angle (0-85 degrees)
        maxPitch: 65, // Maximum pitch angle allowed
        bearing: 0, // Rotation angle
        renderWorldCopies: false,
        pitchWithRotate: true // Allow pitch changes when rotating
      });

      // Wait for map to be ready
      map.events.add('ready', () => {
        console.log('Azure Map is ready');
        
        // Add click handler for fake location mode
        map.events.add('click', handleMapClickForFakeLocation);

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
      // API returns geometry.coordinates as [lng, lat] for Point type
      const geofences = geofencesData.map(fence => {
        let lat, lng;
        
        if (fence.geometry?.coordinates) {
          // MongoDB GeoJSON Point format: [longitude, latitude]
          lng = fence.geometry.coordinates[0];
          lat = fence.geometry.coordinates[1];
        } else if (fence.center?.coordinates) {
          lng = fence.center.coordinates[0];
          lat = fence.center.coordinates[1];
        } else if (fence.center?.latitude && fence.center?.longitude) {
          lat = fence.center.latitude;
          lng = fence.center.longitude;
        }
        
        return {
          id: fence._id || fence.fenceId,
          name: fence.name,
          type: fence.type || 'safe',
          center: { lat, lng },
          radius: fence.radius || 500,
          active: fence.isActive !== false
        };
      }).filter(f => f.center.lat && f.center.lng);
      
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

  // Load and display safety scores on map
  const loadSafetyOverlay = async () => {
    try {
      if (!mapInstanceRef.current || !window.atlas || !mapReady) {
        console.log('Map not ready for safety overlay');
        return;
      }
      
      setSafetyLoading(true);
      const atlas = window.atlas;
      const map = mapInstanceRef.current;

      // Clear existing safety layer if exists
      if (safetyLayerRef.current) {
        try { map.layers.remove(safetyLayerRef.current); } catch (e) { /* ignore */ }
        safetyLayerRef.current = null;
      }
      if (safetySourceRef.current) {
        try { map.sources.remove(safetySourceRef.current); } catch (e) { /* ignore */ }
        safetySourceRef.current = null;
      }

      // Fetch safety data from API
      const response = await safetyAPI.getAllForMap();
      const locations = response.data?.data?.locations || response.data?.locations || [];
      
      console.log('Safety data loaded:', locations.length, 'locations');
      setSafetyData(locations);

      if (locations.length === 0) {
        console.log('No safety data available');
        setSafetyLoading(false);
        return;
      }

      // Create safety data source
      safetySourceRef.current = new atlas.source.DataSource('safetySource');
      map.sources.add(safetySourceRef.current);

      // Create popup for safety info
      if (!safetyPopupRef.current) {
        safetyPopupRef.current = new atlas.Popup({
          pixelOffset: [0, -12],
          closeButton: true
        });
      }

      // Add features for each location
      const features = locations.map(loc => {
        const lng = loc.lng || loc.longitude;
        const lat = loc.lat || loc.latitude;
        
        if (!lng || !lat) return null;

        const score = loc.safetyScore || 0;
        const color = getSafetyColor(score);
        const label = getSafetyLabel(score);

        return new atlas.data.Feature(
          new atlas.data.Point([lng, lat]),
          {
            name: loc.name,
            state: loc.state,
            district: loc.district || '',
            safetyScore: score,
            riskLevel: loc.riskLevel || 'Unknown',
            color: color,
            safetyLabel: label
          }
        );
      }).filter(Boolean);

      safetySourceRef.current.add(features);

      // Create bubble layer for safety dots
      safetyLayerRef.current = new atlas.layer.BubbleLayer(safetySourceRef.current, 'safetyBubbleLayer', {
        radius: [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 6,
          8, 10,
          12, 14,
          16, 18
        ],
        color: ['get', 'color'],
        strokeColor: '#ffffff',
        strokeWidth: 2,
        opacity: 0.85,
        minZoom: 3,
        maxZoom: 20
      });

      map.layers.add(safetyLayerRef.current);

      // Add click event for popup
      map.events.add('click', safetyLayerRef.current, (e) => {
        if (e.shapes && e.shapes.length > 0) {
          const shape = e.shapes[0];
          const properties = shape.getProperties();
          const coordinates = shape.getCoordinates();

          safetyPopupRef.current.setOptions({
            content: `
              <div style="padding: 12px; min-width: 200px; font-family: system-ui, -apple-system, sans-serif;">
                <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #1a1a1a;">${properties.name}</div>
                <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
                  ${properties.district ? properties.district + ', ' : ''}${properties.state}
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                  <div style="
                    width: 48px; 
                    height: 48px; 
                    border-radius: 50%; 
                    background: ${properties.color}; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    color: white; 
                    font-weight: 700;
                    font-size: 16px;
                    box-shadow: 0 2px 8px ${properties.color}66;
                  ">
                    ${Math.round(properties.safetyScore)}
                  </div>
                  <div>
                    <div style="font-weight: 600; font-size: 14px; color: ${properties.color};">
                      ${properties.safetyLabel}
                    </div>
                    <div style="font-size: 11px; color: #888; margin-top: 2px;">
                      Risk Level: ${properties.riskLevel}
                    </div>
                  </div>
                </div>
              </div>
            `,
            position: coordinates
          });

          safetyPopupRef.current.open(map);
        }
      });

      // Add hover cursor change
      map.events.add('mouseover', safetyLayerRef.current, () => {
        map.getCanvasContainer().style.cursor = 'pointer';
      });
      map.events.add('mouseout', safetyLayerRef.current, () => {
        map.getCanvasContainer().style.cursor = '';
      });

      console.log('Safety overlay displayed with', features.length, 'locations');
      setSafetyLoading(false);
    } catch (err) {
      console.error('Failed to load safety overlay:', err);
      setSafetyLoading(false);
    }
  };

  // Toggle safety overlay visibility
  const toggleSafetyOverlay = () => {
    const newState = !showSafetyOverlay;
    setShowSafetyOverlay(newState);
    
    if (newState) {
      loadSafetyOverlay();
    } else {
      // Hide safety layer
      if (safetyLayerRef.current && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.layers.remove(safetyLayerRef.current);
          safetyLayerRef.current = null;
        } catch (e) { /* ignore */ }
      }
      if (safetySourceRef.current && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.sources.remove(safetySourceRef.current);
          safetySourceRef.current = null;
        } catch (e) { /* ignore */ }
      }
      if (safetyPopupRef.current) {
        safetyPopupRef.current.close();
      }
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

  // Handle map click for fake location mode
  const handleMapClickForFakeLocation = async (e) => {
    // Use refs to get current state (event listeners don't get updated state)
    if (!fakeLocationModeRef.current || !fakeLocationTouristRef.current) return;
    
    const position = e.position;
    if (!position) return;
    
    const [lng, lat] = position;
    
    try {
      // Use the existing updateLocation API
      await trackingAPI.updateLocation({
        touristId: fakeLocationTouristRef.current.id,
        latitude: lat,
        longitude: lng,
        accuracy: 10,
        speed: Math.random() * 5, // Random speed 0-5 m/s
        heading: Math.random() * 360,
        altitude: 0,
        batteryLevel: 100,
        source: 'fake_admin'
      });
      
      setFakeLocationCount(prev => prev + 1);
      console.log('Fake location added:', { lat, lng, touristId: fakeLocationTouristRef.current.id });
      
    } catch (err) {
      console.error('Failed to add fake location:', err);
      alert('Failed to add fake location: ' + (err.response?.data?.message || err.message));
    }
  };
  
  // Enable fake location mode for a tourist
  const enableFakeLocationMode = (tourist) => {
    setFakeLocationTourist(tourist);
    setFakeLocationMode(true);
    setFakeLocationCount(0);
    setShowTouristPanel(false);
    setSelectedTourist(null);
    // Update refs for event listener
    fakeLocationModeRef.current = true;
    fakeLocationTouristRef.current = tourist;
  };
  
  // Disable fake location mode
  const disableFakeLocationMode = () => {
    setFakeLocationMode(false);
    setFakeLocationTourist(null);
    setFakeLocationCount(0);
    // Update refs for event listener
    fakeLocationModeRef.current = false;
    fakeLocationTouristRef.current = null;
  };

  // Handle tourist operations
  const handleViewHistory = async (touristId) => {
    try {
      // Close the tourist panel
      setShowTouristPanel(false);
      setSelectedTourist(null);
      
      // Fetch all location history (limit: 0 means no limit)
      const response = await trackingAPI.getLocationHistory(touristId, { limit: 0, hours: 720 });
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
    
    // Create a line layer with gradient effect to show direction
    const lineLayer = new atlas.layer.LineLayer(dataSource, null, {
      strokeColor: '#1a73e8',
      strokeWidth: 4,
      lineJoin: 'round',
      lineCap: 'round'
    });
    map.layers.add(lineLayer);
    historyLineLayerRef.current = lineLayer;
    
    // Create markers for each point - dot with arrow for path, larger for start/end
    sortedLocations.forEach((location, index) => {
      const isStart = index === 0;
      const isEnd = index === sortedLocations.length - 1;
      const time = new Date(location.timestamp).toLocaleTimeString();
      const date = new Date(location.timestamp).toLocaleDateString();
      
      // Calculate direction angle towards next point
      let angle = 0;
      if (index < sortedLocations.length - 1) {
        const nextLoc = sortedLocations[index + 1];
        const lat1 = location.latitude * Math.PI / 180;
        const lat2 = nextLoc.latitude * Math.PI / 180;
        const deltaLng = (nextLoc.longitude - location.longitude) * Math.PI / 180;
        const y = Math.sin(deltaLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
        angle = Math.atan2(y, x) * 180 / Math.PI;
      }
      
      // Determine marker style
      let markerHtml;
      
      if (isStart) {
        // Start marker - green with flag icon
        markerHtml = '<div style="width: 28px; height: 28px; background: #4caf50; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 10px rgba(76,175,80,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer;" title="Start - ' + date + ' ' + time + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg></div>';
      } else if (isEnd) {
        // End marker - red with pulsing effect and pin icon
        markerHtml = '<div style="position: relative;"><div style="width: 28px; height: 28px; background: #f44336; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 10px rgba(244,67,54,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2; position: relative;" title="Current - ' + date + ' ' + time + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 28px; height: 28px; background: #f44336; border-radius: 50%; animation: pulse-ring 1.5s ease-out infinite; z-index: 1;"></div></div><style>@keyframes pulse-ring { 0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; } 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; } }</style>';
      } else {
        // Path marker - dot with arrow showing direction (white arrow with dark outline for visibility)
        markerHtml = '<div style="position: relative; width: 28px; height: 28px; cursor: pointer;" title="' + time + '">' +
          '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; background: #1a73e8; border: 2px solid white; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.3); z-index: 2;"></div>' +
          '<div style="position: absolute; top: -2px; left: 50%; transform: translateX(-50%) rotate(' + angle + 'deg); transform-origin: center 16px; z-index: 1;">' +
          '<svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2l-6 10h12l-6-10z" fill="white" stroke="#1a73e8" stroke-width="2.5"/></svg>' +
          '</div></div>';
      }
      
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
          content: '<div style="padding: 10px; font-family: system-ui;"><strong>' + touristName + '</strong><br/><small style="color: #666;">' + (isStart ? 'Start Point' : isEnd ? 'Current Location' : 'Location') + '</small><hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;"/><div style="font-size: 12px;"><div>🕐 ' + new Date(location.timestamp).toLocaleString() + '</div><div>📍 ' + location.latitude.toFixed(6) + ', ' + location.longitude.toFixed(6) + '</div>' + (location.speed ? '<div>🚗 ' + location.speed.toFixed(1) + ' m/s</div>' : '') + (location.heading ? '<div>🧭 ' + location.heading.toFixed(0) + '°</div>' : '') + (location.altitude ? '<div>⛰️ ' + location.altitude + 'm</div>' : '') + (location.batteryLevel ? '<div>🔋 ' + location.batteryLevel + '%</div>' : '') + '</div></div>',
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

  // Add geofence selection handler
  const handleGeofenceSelect = (geofence) => {
    if (!mapInstanceRef.current) return;
    
    // Support multiple coordinate formats from API:
    // - geometry.coordinates: [lng, lat] (MongoDB GeoJSON format)
    // - center.coordinates: [lng, lat]
    // - center: { latitude, longitude }
    let lat, lng;
    
    if (geofence.geometry?.coordinates) {
      // MongoDB GeoJSON Point format: [longitude, latitude]
      lng = geofence.geometry.coordinates[0];
      lat = geofence.geometry.coordinates[1];
    } else if (geofence.center?.coordinates) {
      lng = geofence.center.coordinates[0];
      lat = geofence.center.coordinates[1];
    } else if (geofence.center?.latitude && geofence.center?.longitude) {
      lat = geofence.center.latitude;
      lng = geofence.center.longitude;
    }
    
    if (lat && lng) {
      mapInstanceRef.current.setCamera({
        center: [lng, lat],
        zoom: 14,
        pitch: 45,
        duration: 500
      });
    }
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
          <span>Loading Maps...</span>
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

      {/* Map Theme Selector */}
      {!isLoading && (
        <MapThemeSelector
          currentTheme={currentTheme}
          currentMapStyle={currentMapStyle}
          onThemeChange={(theme) => {
            setCurrentTheme(theme);
            // Optionally reload markers with new colors
            if (showTourists && touristsData.length > 0) {
              displayTouristMarkers(touristsData);
            }
          }}
          onMapStyleChange={(style) => {
            setCurrentMapStyle(style);
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setStyle({ style });
            }
          }}
        />
      )}

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

      {/* Safety Overlay Toggle Button - Bottom Left */}
      {!isLoading && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '16px',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '8px'
        }}>
          {/* Safety Legend - Above the button */}
          {showSafetyOverlay && !safetyLoading && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '12px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: '11px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                Safety Score Legend
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: SAFETY_COLORS.veryHigh 
                  }}></span>
                  <span>80-100: Very Safe</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: SAFETY_COLORS.high 
                  }}></span>
                  <span>60-80: Safe</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: SAFETY_COLORS.moderate 
                  }}></span>
                  <span>40-60: Moderate</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: SAFETY_COLORS.low 
                  }}></span>
                  <span>20-40: Low Safety</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: SAFETY_COLORS.veryLow 
                  }}></span>
                  <span>0-20: Dangerous</span>
                </div>
              </div>
              {safetyData.length > 0 && (
                <div style={{ 
                  marginTop: '8px', 
                  paddingTop: '8px', 
                  borderTop: '1px solid #eee',
                  color: '#666'
                }}>
                  📍 {safetyData.length} locations loaded
                </div>
              )}
            </div>
          )}

          {/* Toggle Switch */}
          <div
            onClick={toggleSafetyOverlay}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '12px 16px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.3s ease',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <span style={{ fontSize: '18px' }}></span>
              <span style={{ 
                fontWeight: '600', 
                color: '#333',
                fontSize: '14px'
              }}>
                {safetyLoading ? 'Loading...' : 'Show Safety Overlay'}
              </span>
            </div>
            {/* Toggle Switch */}
            <div style={{
              width: '44px',
              height: '24px',
              background: showSafetyOverlay 
                ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
                : '#d1d5db',
              borderRadius: '12px',
              position: 'relative',
              transition: 'all 0.3s ease',
              boxShadow: showSafetyOverlay 
                ? '0 2px 8px rgba(34, 197, 94, 0.3)' 
                : '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                background: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: showSafetyOverlay ? '22px' : '2px',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </div>
          </div>

          {/* Geofence Manager Button */}
          <button
            onClick={() => setShowGeofenceManager(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '12px 16px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              transition: 'all 0.3s ease'
            }}
          >
            <span style={{ fontSize: '18px' }}>🗺️</span>
            <span style={{ 
              fontWeight: '600', 
              color: '#333',
              fontSize: '14px'
            }}>
              Geofences
            </span>
          </button>
        </div>
      )}

      {/* Geofence Manager Panel */}
      {showGeofenceManager && (
        <GeofenceManager
          map={mapInstanceRef.current}
          onGeofenceSelect={handleGeofenceSelect}
          onGeofenceChange={loadGeofences}
          onClose={() => setShowGeofenceManager(false)}
        />
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

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              
              {/* Fake Location Button - Temporary Feature */}
              <button
                onClick={() => enableFakeLocationMode(selectedTourist)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '2px dashed #ff9800',
                  background: '#fff3e0',
                  color: '#e65100',
                  fontWeight: '600',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                🎯 Add Fake Locations (Dev)
              </button>
            </div>
          </div>
        </div>
      </>
      )}
      
      {/* Fake Location Mode Indicator */}
      {fakeLocationMode && fakeLocationTourist && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #ff9800, #f57c00)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(255, 152, 0, 0.4)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'pulse 2s infinite'
        }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px' }}>
              🎯 Fake Location Mode Active
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              Click on map to add locations for: <strong>{fakeLocationTourist.name}</strong>
            </div>
            <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
              Locations added: {fakeLocationCount}
            </div>
          </div>
          <button
            onClick={disableFakeLocationMode}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontWeight: '600',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            ✕ Stop
          </button>
        </div>
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