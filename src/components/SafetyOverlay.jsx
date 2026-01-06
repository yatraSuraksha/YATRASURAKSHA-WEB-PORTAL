import { useState, useEffect, useCallback, useRef } from 'react';
import { safetyAPI } from '../services/api';

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

/**
 * SafetyOverlay Component
 * Displays safety scores on the map as colored markers/circles
 */
const SafetyOverlay = ({ map, atlas, visible = true, filters = null, autoFit = true }) => {
  const [safetyData, setSafetyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const dataSourceRef = useRef(null);
  const bubbleLayerRef = useRef(null);
  const clusterLayerRef = useRef(null);
  const clusterCountLayerRef = useRef(null);
  const unclusteredLayerRef = useRef(null);
  const labelLayerRef = useRef(null);
  const popupRef = useRef(null);
  const initializedRef = useRef(false);

  // Stable filters string and cancellation refs
  const filtersString = JSON.stringify(filters || {});
  const cancelRef = useRef({ cancelled: false });
  const loadingRef = useRef(false);

  // Fetch safety data from API with cancellation and stable deps
  const fetchSafetyData = useCallback(async () => {
    if (!visible) return;
    // Prevent overlapping requests
    if (loadingRef.current) return;

    const call = { cancelled: false };
    cancelRef.current = call;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const params = filters ? JSON.parse(filtersString) : {};
      const response = await safetyAPI.getAllForMap(params);

      if (call.cancelled) return;

      // Normalize backend response: support both { data: { locations: [...] }} and array responses
      const payload = response?.data?.data;
      let locations = [];

      if (Array.isArray(payload)) {
        locations = payload;
      } else if (payload && Array.isArray(payload.locations)) {
        locations = payload.locations;
      } else if (payload && Array.isArray(payload.data)) {
        locations = payload.data;
      }

      const normalized = locations
        .map(loc => {
          // try various shapes
          let lng, lat;

          if (loc.location && Array.isArray(loc.location.coordinates) && loc.location.coordinates.length >= 2) {
            [lng, lat] = loc.location.coordinates;
          } else if (loc.lng !== undefined && loc.lat !== undefined) {
            lng = Number(loc.lng);
            lat = Number(loc.lat);
          } else if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
            [lng, lat] = loc.coordinates;
          } else if (loc.geometry && Array.isArray(loc.geometry.coordinates)) {
            [lng, lat] = loc.geometry.coordinates;
          } else {
            return null;
          }

          // Ensure numeric values and reasonable ranges
          lng = Number(lng);
          lat = Number(lat);
          if (!isFinite(lng) || !isFinite(lat)) return null;
          if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

          const safetyScore = Number(loc.safetyScore ?? loc.safety?.score ?? 0) || 0;

          return {
            name: loc.name,
            state: loc.state,
            district: loc.district || '',
            location: { coordinates: [lng, lat] },
            safetyScore,
            riskLevel: loc.riskLevel || (loc.safety && loc.safety.riskLevel) || 'Unknown',
            crimeRate: loc.crimeRate
          };
        })
        .filter(Boolean);

      console.debug('SafetyOverlay: normalized', normalized.length, 'of', locations.length, 'locations');
      setSafetyData(normalized);

      try {
        const statsResponse = await safetyAPI.getStats(params.state);
        if (call.cancelled) return;
        if (statsResponse?.data?.success) {
          setStats(statsResponse.data.data);
        }
      } catch (e) {
        if (!call.cancelled) console.warn('Stats unavailable', e);
      }
    } catch (err) {
      if (!call.cancelled) {
        console.error('Error fetching safety data:', err);
        setError('Safety API unavailable');
        setSafetyData([]);
      }
    } finally {
      if (!call.cancelled) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [visible, filtersString]);

  // Initialize map layers - only once
  useEffect(() => {
    if (!map || !atlas || !visible || initializedRef.current) return;

    try {
      // Create simple data source (no clustering)
      const source = new atlas.source.DataSource('safetyDataSource');
      map.sources.add(source);
      dataSourceRef.current = source;

      // Simple dot layer for safety points
      const dotLayer = new atlas.layer.BubbleLayer(source, 'safetyDotLayer', {
        radius: ['interpolate', ['linear'], ['zoom'], 4, 4, 10, 8, 15, 12],
        color: ['get', 'color'],
        strokeColor: '#ffffff',
        strokeWidth: 1,
        opacity: 0.95,
        minZoom: 3,
        maxZoom: 20
      });
      map.layers.add(dotLayer);
      bubbleLayerRef.current = dotLayer;

      // Create popup
      const popup = new atlas.Popup({
        pixelOffset: [0, -8],
        closeButton: true
      });
      popupRef.current = popup;

      // Add click handler for popup (points)
      map.events.add('click', dotLayer, (e) => {
        if (e.shapes && e.shapes.length > 0) {
          const shape = e.shapes[0];
          const properties = shape.getProperties();
          const coordinates = shape.getCoordinates ? shape.getCoordinates() : shape.geometry.coordinates;

          popup.setOptions({
            content: `
              <div style="padding: 10px; min-width: 180px;">
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px;">${properties.name}</div>
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">${properties.district ? properties.district + ', ' : ''}${properties.state}</div>
                <div style="display:flex; gap:8px; align-items:center;">
                  <div style="width:34px;height:34px;border-radius:50%;background:${properties.color};display:flex;align-items:center;justify-content:center;color:white;font-weight:600;">${Math.round(properties.safetyScore)}</div>
                  <div>
                    <div style="font-weight:600;color:${properties.color};">${properties.safetyLabel}</div>
                    <div style="font-size:11px;color:#9ca3af;">Risk: ${properties.riskLevel}</div>
                  </div>
                </div>
              </div>
            `,
            position: coordinates
          });

          popup.open(map);
        }
      });

      // Cursor change on hover
      map.events.add('mouseenter', dotLayer, () => {
        map.getCanvasContainer().style.cursor = 'pointer';
      });

      map.events.add('mouseleave', dotLayer, () => {
        map.getCanvasContainer().style.cursor = '';
      });

      initializedRef.current = true;
      
      // Fetch data after initialization
      fetchSafetyData();
    } catch (err) {
      console.error('Error initializing safety overlay:', err);
      setError('Could not initialize safety layer');
    }

    // Cleanup function
    return () => {
      try {
        if (popupRef.current) popupRef.current.close();
        if (bubbleLayerRef.current && map.layers) map.layers.remove(bubbleLayerRef.current);
        if (labelLayerRef.current && map.layers) map.layers.remove(labelLayerRef.current);
        if (dataSourceRef.current && map.sources) map.sources.remove(dataSourceRef.current);
        initializedRef.current = false;
      } catch (e) {
        console.warn('Cleanup error:', e);
      }
    };
  }, [map, atlas, visible, fetchSafetyData]);

  // Update markers when data changes
  const autoFitDoneRef = useRef(false);

  useEffect(() => {
    if (!dataSourceRef.current || !atlas) return;

    try {
      dataSourceRef.current.clear();

      if (!safetyData || safetyData.length === 0) {
        console.debug('SafetyOverlay: no safetyData to render');
        return;
      }

      console.debug('SafetyOverlay: rendering', safetyData.length, 'cities. Sample:', safetyData[0]);

      const points = [];

      const features = safetyData
        .filter(city => city?.location?.coordinates && city.location.coordinates.length >= 2)
        .map((city) => {
          const coords = city.location.coordinates;
          let [a, b] = coords;
          let lng = a, lat = b;

          // Normalize coordinates: if second value is clearly > 90 (likely longitude in some datasets), swap
          if (Math.abs(a) <= 90 && Math.abs(b) > 90) {
            lng = b;
            lat = a;
          }

          // If values look reversed (lat out of range), log a warning
          if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            console.warn('SafetyOverlay: suspicious coordinates for', city.name, 'coords:', coords);
          }

          points.push([lng, lat]);

          const color = getSafetyColor(city.safetyScore);
          const label = getSafetyLabel(city.safetyScore);
          
          return new atlas.data.Feature(
            new atlas.data.Point([lng, lat]),
            {
              name: city.name,
              state: city.state,
              district: city.district || '',
              safetyScore: city.safetyScore,
              safetyLabel: label,
              riskLevel: city.riskLevel,
              crimeRate: city.crimeRate,
              color: color
            }
          );
        });

      if (features.length > 0) {
        // log coordinates of first feature for debugging
        try {
          console.debug('SafetyOverlay: adding', features.length, 'features. First coords:', features[0].getCoordinates());
        } catch (e) {
          console.debug('SafetyOverlay: added features, could not read first feature coords');
        }

        dataSourceRef.current.add(features);

        // Make sure layer visible
        if (bubbleLayerRef.current) {
          try { bubbleLayerRef.current.setOptions({ visible: true }); } catch {}
        }

        // Auto fit map to points once per filter set or on initial load
        if (autoFit && points.length > 0 && !autoFitDoneRef.current && map) {
          let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
          points.forEach(([lng, lat]) => {
            minLng = Math.min(minLng, lng);
            minLat = Math.min(minLat, lat);
            maxLng = Math.max(maxLng, lng);
            maxLat = Math.max(maxLat, lat);
          });

          if (isFinite(minLng) && isFinite(minLat) && isFinite(maxLng) && isFinite(maxLat)) {
            try {
              map.setCamera({ bounds: [[minLng, minLat], [maxLng, maxLat]], padding: 80, duration: 700 });
              autoFitDoneRef.current = true;
            } catch (e) {
              console.warn('SafetyOverlay: auto-fit failed', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error adding safety features:', err);
    }
  }, [atlas, safetyData, autoFit, map]);

  // Toggle layer visibility
  useEffect(() => {
    if (bubbleLayerRef.current) {
      try {
        bubbleLayerRef.current.setOptions({ visible });
      } catch {
        console.warn('Could not toggle layer visibility');
      }
    }
  }, [visible]);

  // Cancel in-flight requests on unmount or filters change and reset auto-fit
  useEffect(() => {
    return () => {
      if (cancelRef.current) cancelRef.current.cancelled = true;
      autoFitDoneRef.current = false; // allow re-fit after filters change
    };
  }, [filtersString]);

  // Re-fetch when overlay becomes visible after initialization
  useEffect(() => {
    if (visible && initializedRef.current) {
      autoFitDoneRef.current = false;
      fetchSafetyData();
    }
  }, [visible, fetchSafetyData]);

  // Only render the legend UI if visible
  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '80px',
      left: '16px',
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '8px',
      padding: '12px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
      zIndex: 1000,
      minWidth: '180px',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px'
      }}>
        <span style={{ fontWeight: '600', fontSize: '13px', color: '#1f2937' }}>
          🛡️ Safety Scores
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {loading && (
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Loading...</span>
          )}
          <button
            onClick={() => { autoFitDoneRef.current = false; fetchSafetyData(); }}
            style={{
              border: 'none',
              background: '#eef2ff',
              color: '#1f2937',
              fontSize: '12px',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title="Refresh safety points"
          >
            ⟳ Refresh
          </button>
          <button
            onClick={() => {
              // manual fit to current data
              try {
                if (!safetyData || safetyData.length === 0) return;
                let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
                safetyData.forEach(c => {
                  const [lng, lat] = c.location.coordinates;
                  minLng = Math.min(minLng, lng);
                  minLat = Math.min(minLat, lat);
                  maxLng = Math.max(maxLng, lng);
                  maxLat = Math.max(maxLat, lat);
                });
                if (isFinite(minLng) && isFinite(minLat) && isFinite(maxLng) && isFinite(maxLat)) {
                  map.setCamera({ bounds: [[minLng, minLat], [maxLng, maxLat]], padding: 80, duration: 700 });
                }
              } catch (e) {
                console.warn('Manual fit failed', e);
              }
            }}
            style={{
              border: 'none',
              background: '#ecfdf5',
              color: '#065f46',
              fontSize: '12px',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title="Fit map to safety points"
          >
            ⤢ Fit
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          fontSize: '11px', 
          color: '#ef4444', 
          marginBottom: '8px',
          padding: '6px',
          background: '#fef2f2',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {[
          { label: 'Very Safe (80-100)', color: SAFETY_COLORS.veryHigh },
          { label: 'Safe (60-80)', color: SAFETY_COLORS.high },
          { label: 'Moderate (40-60)', color: SAFETY_COLORS.moderate },
          { label: 'Low Safety (20-40)', color: SAFETY_COLORS.low },
          { label: 'Dangerous (0-20)', color: SAFETY_COLORS.veryLow },
        ].map((item) => (
          <div key={item.label} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '11px'
          }}>
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: item.color,
              border: '2px solid white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
            <span style={{ color: '#4b5563' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: '1px solid #e5e7eb',
          fontSize: '11px',
          color: '#6b7280'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Cities:</span>
            <span style={{ fontWeight: '600', color: '#1f2937' }}>{stats.totalCities}</span>
          </div>
          {stats.averageSafetyScore && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Avg Safety:</span>
              <span style={{ 
                fontWeight: '600', 
                color: getSafetyColor(stats.averageSafetyScore) 
              }}>
                {stats.averageSafetyScore.toFixed(1)}
              </span>
            </div>
          )}
          {stats.safestCity && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Safest:</span>
              <span style={{ fontWeight: '600', color: SAFETY_COLORS.veryHigh }}>
                {stats.safestCity.name}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SafetyOverlay;
