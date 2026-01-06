import React, { useState, useEffect, useRef } from 'react';
import { geofenceAPI } from '../services/api';
import '../styles/GeofenceManager.css';

const GeofenceManager = ({ map, onGeofenceSelect, onGeofenceChange, onClose }) => {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [stats, setStats] = useState(null);
  
  // New flow states
  const [step, setStep] = useState('list'); // 'list', 'selecting', 'radius', 'form'
  const [selectedLocation, setSelectedLocation] = useState(null); // {lat, lng}
  const [radius, setRadius] = useState(500);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'safe'
  });
  
  // Preview elements
  const [previewCircle, setPreviewCircle] = useState(null);
  const [previewMarker, setPreviewMarker] = useState(null);
  const clickHandlerRef = useRef(null);

  // Cleanup preview helper
  const cleanupPreview = () => {
    if (map && window.atlas) {
      if (previewCircle) {
        try { map.layers.remove(previewCircle); } catch (e) { /* ignore */ }
      }
      if (previewMarker) {
        try { map.markers.remove(previewMarker); } catch (e) { /* ignore */ }
      }
      
      // Remove source
      try {
        const oldSource = map.sources.getById('preview-geofence-source');
        if (oldSource) map.sources.remove(oldSource);
      } catch (e) { /* ignore */ }
    }
    setPreviewCircle(null);
    setPreviewMarker(null);
  };

  // Remove click handler
  const removeClickHandler = () => {
    if (map && clickHandlerRef.current) {
      try { 
        map.events.remove('click', clickHandlerRef.current); 
      } catch (e) { /* ignore */ }
      clickHandlerRef.current = null;
    }
  };

  useEffect(() => {
    loadGeofences();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPreview();
      removeClickHandler();
    };
  }, [map]);

  // Compute stats from geofences
  useEffect(() => {
    if (geofences.length > 0) {
      const computedStats = {
        total: geofences.length,
        active: geofences.filter(g => g.isActive !== false).length,
        byType: {
          safe: geofences.filter(g => g.type === 'safe').length,
          warning: geofences.filter(g => g.type === 'warning').length,
          restricted: geofences.filter(g => g.type === 'restricted').length
        }
      };
      setStats(computedStats);
    } else {
      setStats({ total: 0, active: 0, byType: { safe: 0, warning: 0, restricted: 0 } });
    }
  }, [geofences]);

  // Start map selection when entering 'selecting' step
  useEffect(() => {
    if (step === 'selecting' && map && window.atlas) {
      startMapSelection();
    }
  }, [step, map]);

  const loadGeofences = async () => {
    try {
      setLoading(true);
      const response = await geofenceAPI.getAll({ limit: 100 });
      const data = response.data.data?.geofences || response.data?.geofences || [];
      setGeofences(data);
    } catch (err) {
      console.error('Failed to load geofences:', err);
    } finally {
      setLoading(false);
    }
  };

  const startMapSelection = () => {
    if (!map || !window.atlas) {
      alert('Map is not ready yet');
      return;
    }

    // Remove any existing handler first
    removeClickHandler();

    const clickHandler = (e) => {
      const position = e.position;
      const lat = position[1];
      const lng = position[0];
      
      setSelectedLocation({ lat, lng });
      
      // Create preview marker
      const atlas = window.atlas;
      
      // Remove old preview
      cleanupPreview();

      // Add marker at clicked position
      const marker = new atlas.HtmlMarker({
        position: [lng, lat],
        htmlContent: '<div class="geofence-preview-marker">📍</div>'
      });
      
      map.markers.add(marker);
      setPreviewMarker(marker);

      // Create preview circle with current radius
      createPreviewCircle(lat, lng, radius);
      
      // Move to radius step
      setStep('radius');
      
      // Center map on the location
      map.setCamera({
        center: [lng, lat],
        zoom: 15,
        type: 'ease',
        duration: 500
      });
    };

    map.events.add('click', clickHandler);
    clickHandlerRef.current = clickHandler;
  };

  const createPreviewCircle = (lat, lng, rad) => {
    if (!map || !window.atlas) return;

    const atlas = window.atlas;

    // Remove old circle
    if (previewCircle) {
      try { map.layers.remove(previewCircle); } catch (e) { /* ignore */ }
    }
    
    // Remove old source
    try {
      const oldSource = map.sources.getById('preview-geofence-source');
      if (oldSource) map.sources.remove(oldSource);
    } catch (e) { /* ignore */ }

    // Create circle polygon
    const points = 64;
    const coordinates = [];
    const earthRadius = 6371000;

    for (let i = 0; i <= points; i++) {
      const angle = (i * 360 / points) * Math.PI / 180;
      const dx = rad * Math.cos(angle);
      const dy = rad * Math.sin(angle);
      
      const newLat = parseFloat(lat) + (dy / earthRadius) * (180 / Math.PI);
      const newLng = parseFloat(lng) + (dx / earthRadius) * (180 / Math.PI) / Math.cos(parseFloat(lat) * Math.PI / 180);
      
      coordinates.push([newLng, newLat]);
    }

    const circlePolygon = new atlas.data.Polygon([coordinates]);
    const circleSource = new atlas.source.DataSource('preview-geofence-source');
    map.sources.add(circleSource);
    circleSource.add(circlePolygon);

    const typeColor = getTypeColor(formData.type);
    const circleLayer = new atlas.layer.PolygonLayer(circleSource, 'preview-geofence-layer', {
      fillColor: typeColor,
      fillOpacity: 0.25,
      strokeColor: typeColor,
      strokeWidth: 3
    });

    map.layers.add(circleLayer);
    setPreviewCircle(circleLayer);
  };

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    if (selectedLocation) {
      createPreviewCircle(selectedLocation.lat, selectedLocation.lng, newRadius);
    }
  };

  const handleTypeChange = (newType) => {
    setFormData(prev => ({ ...prev, type: newType }));
    if (selectedLocation) {
      setTimeout(() => {
        createPreviewCircle(selectedLocation.lat, selectedLocation.lng, radius);
      }, 10);
    }
  };

  const handleRemoveLocation = () => {
    cleanupPreview();
    setSelectedLocation(null);
    setStep('selecting');
    startMapSelection();
  };

  const handleNextToForm = () => {
    removeClickHandler();
    setStep('form');
  };

  const handleBackToRadius = () => {
    setStep('radius');
    if (selectedLocation) {
      createPreviewCircle(selectedLocation.lat, selectedLocation.lng, radius);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedLocation) return;
    
    try {
      setLoading(true);
      await geofenceAPI.create({
        name: formData.name,
        description: formData.description,
        type: formData.type,
        coordinates: {
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng
        },
        radius: radius
      });
      
      // Reset everything
      cleanupPreview();
      removeClickHandler();
      setSelectedLocation(null);
      setRadius(500);
      setFormData({ name: '', description: '', type: 'safe' });
      setStep('list');
      loadGeofences();
      
      // Notify parent to refresh map geofences
      if (onGeofenceChange) onGeofenceChange();
    } catch (err) {
      console.error('Failed to create geofence:', err);
      alert(err.response?.data?.message || 'Failed to create geofence');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this geofence?')) return;
    
    try {
      setLoading(true);
      await geofenceAPI.delete(id);
      loadGeofences();
      if (selectedGeofence?._id === id) {
        setSelectedGeofence(null);
      }
      // Notify parent to refresh map geofences
      if (onGeofenceChange) onGeofenceChange();
    } catch (err) {
      console.error('Failed to delete geofence:', err);
      alert('Failed to delete geofence');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (geofence) => {
    try {
      setLoading(true);
      await geofenceAPI.update(geofence._id, {
        isActive: !geofence.isActive
      });
      loadGeofences();
      // Notify parent to refresh map geofences
      if (onGeofenceChange) onGeofenceChange();
    } catch (err) {
      console.error('Failed to update geofence:', err);
      alert('Failed to update geofence');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setStep('selecting');
    setSelectedLocation(null);
    setRadius(500);
    setFormData({ name: '', description: '', type: 'safe' });
  };

  const handleCancel = () => {
    cleanupPreview();
    removeClickHandler();
    setSelectedLocation(null);
    setRadius(500);
    setFormData({ name: '', description: '', type: 'safe' });
    setStep('list');
  };

  const handleClose = () => {
    cleanupPreview();
    removeClickHandler();
    onClose();
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'safe': return '#4caf50';
      case 'restricted': return '#f44336';
      case 'warning': return '#ff9800';
      default: return '#1a73e8';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'safe': return '✓';
      case 'restricted': return '⛔';
      case 'warning': return '⚠️';
      default: return '📍';
    }
  };

  const formatRadius = (r) => {
    if (r >= 1000) return `${(r / 1000).toFixed(1)}km`;
    return `${r}m`;
  };

  // Render based on current step
  const renderContent = () => {
    switch (step) {
      case 'selecting':
        return (
          <div className="selecting-mode">
            <div className="selecting-message">
              <span className="pulse-dot large"></span>
              <div>
                <h3>Click on the map</h3>
                <p>Select a location for your new geofence</p>
              </div>
            </div>
            <button onClick={handleCancel} className="cancel-btn full">
              Cancel
            </button>
          </div>
        );

      case 'radius':
        return (
          <div className="radius-adjustment">
            <div className="radius-header">
              <h3>Adjust Radius</h3>
              <p className="location-display">
                📍 {selectedLocation?.lat.toFixed(6)}, {selectedLocation?.lng.toFixed(6)}
              </p>
            </div>

            <div className="radius-control">
              <div className="radius-display">
                <span className="radius-value">{formatRadius(radius)}</span>
              </div>
              
              <input
                type="range"
                value={radius}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                min="50"
                max="5000"
                step="50"
                className="radius-slider-main"
              />
              
              <div className="radius-labels">
                <span>50m</span>
                <span>5km</span>
              </div>

              <div className="radius-presets">
                <button type="button" onClick={() => handleRadiusChange(100)} className={radius === 100 ? 'active' : ''}>100m</button>
                <button type="button" onClick={() => handleRadiusChange(250)} className={radius === 250 ? 'active' : ''}>250m</button>
                <button type="button" onClick={() => handleRadiusChange(500)} className={radius === 500 ? 'active' : ''}>500m</button>
                <button type="button" onClick={() => handleRadiusChange(1000)} className={radius === 1000 ? 'active' : ''}>1km</button>
                <button type="button" onClick={() => handleRadiusChange(2000)} className={radius === 2000 ? 'active' : ''}>2km</button>
              </div>
            </div>

            <div className="type-selector">
              <label>Zone Type:</label>
              <div className="type-buttons">
                <button 
                  type="button"
                  className={`type-btn safe ${formData.type === 'safe' ? 'active' : ''}`}
                  onClick={() => handleTypeChange('safe')}
                >
                  ✓ Safe
                </button>
                <button 
                  type="button"
                  className={`type-btn warning ${formData.type === 'warning' ? 'active' : ''}`}
                  onClick={() => handleTypeChange('warning')}
                >
                  ⚠️ Warning
                </button>
                <button 
                  type="button"
                  className={`type-btn restricted ${formData.type === 'restricted' ? 'active' : ''}`}
                  onClick={() => handleTypeChange('restricted')}
                >
                  ⛔ Restricted
                </button>
              </div>
            </div>

            <div className="radius-actions">
              <button onClick={handleRemoveLocation} className="remove-btn">
                🗑️ Remove & Reselect
              </button>
              <button onClick={handleNextToForm} className="next-btn">
                Next Step →
              </button>
            </div>
          </div>
        );

      case 'form':
        return (
          <form onSubmit={handleCreate} className="details-form">
            <div className="form-header">
              <h3>Geofence Details</h3>
              <div className="form-summary">
                <span className="summary-badge" style={{ background: getTypeColor(formData.type) }}>
                  {getTypeIcon(formData.type)} {formData.type}
                </span>
                <span className="summary-badge radius">{formatRadius(radius)}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Kamakhya Temple Zone"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this geofence..."
                rows="3"
              />
            </div>

            <div className="form-actions three">
              <button type="button" onClick={handleBackToRadius} className="back-btn">
                ← Back
              </button>
              <button type="button" onClick={handleCancel} className="cancel-btn">
                Cancel
              </button>
              <button type="submit" disabled={loading || !formData.name} className="submit-btn">
                {loading ? 'Creating...' : '✓ Add Fence'}
              </button>
            </div>
          </form>
        );

      default: // 'list'
        return (
          <>
            {/* Stats Bar */}
            {stats && (
              <div className="stats-bar">
                <div className="stat-card">
                  <div className="stat-value">{stats.total || 0}</div>
                  <div className="stat-label">Total</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.active || 0}</div>
                  <div className="stat-label">Active</div>
                </div>
                <div className="stat-card safe">
                  <div className="stat-value">{stats.byType?.safe || 0}</div>
                  <div className="stat-label">Safe</div>
                </div>
                <div className="stat-card restricted">
                  <div className="stat-value">{stats.byType?.restricted || 0}</div>
                  <div className="stat-label">Restricted</div>
                </div>
              </div>
            )}

            {/* Create Button */}
            <button onClick={handleStartCreate} className="create-btn">
              ➕ Create New Geofence
            </button>

            {/* Geofences List */}
            <div className="geofences-list">
              <h3>All Geofences ({geofences.length})</h3>
              
              {loading && geofences.length === 0 ? (
                <div className="loading-state">Loading geofences...</div>
              ) : geofences.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📍</span>
                  <p>No geofences created yet</p>
                  <p className="empty-hint">Click "Create New Geofence" to get started</p>
                </div>
              ) : (
                <div className="geofence-items">
                  {geofences.map(geofence => (
                    <div
                      key={geofence._id}
                      className={`geofence-item ${selectedGeofence?._id === geofence._id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedGeofence(geofence);
                        if (onGeofenceSelect) onGeofenceSelect(geofence);
                      }}
                    >
                      <div className="geofence-item-header">
                        <div className="geofence-icon" style={{ background: getTypeColor(geofence.type) }}>
                          {getTypeIcon(geofence.type)}
                        </div>
                        <div className="geofence-info">
                          <h4>{geofence.name}</h4>
                          <p className="geofence-meta">
                            {geofence.type} • {geofence.radius}m
                          </p>
                        </div>
                        <div className="geofence-status">
                          <span className={`status-badge ${geofence.isActive !== false ? 'active' : 'inactive'}`}>
                            {geofence.isActive !== false ? '✓' : '✕'}
                          </span>
                        </div>
                      </div>

                      <div className="geofence-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(geofence);
                          }}
                          className="action-btn toggle"
                          disabled={loading}
                          title={geofence.isActive !== false ? 'Deactivate' : 'Activate'}
                        >
                          {geofence.isActive !== false ? '⏸' : '▶️'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onGeofenceSelect) onGeofenceSelect(geofence);
                          }}
                          className="action-btn view"
                          title="View on Map"
                        >
                          🎯
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(geofence._id);
                          }}
                          className="action-btn delete"
                          disabled={loading}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        );
    }
  };

  return (
    <>
      {/* Backdrop - only show for list view */}
      {step === 'list' && (
        <div 
          onClick={handleClose}
          className="geofence-backdrop"
        />
      )}

      {/* Panel - side panel during selection, modal for list */}
      <div className={`geofence-manager ${step !== 'list' ? 'side-panel' : ''}`}>
        {/* Header */}
        <div className="geofence-header">
          <div>
            <h2>🗺️ {step === 'list' ? 'Geofences' : step === 'selecting' ? 'Select Location' : step === 'radius' ? 'Set Radius' : 'Add Details'}</h2>
          </div>
          <button onClick={handleClose} className="close-btn">✕</button>
        </div>

        {renderContent()}
      </div>
    </>
  );
};

export default GeofenceManager;
