import React, { useState, useEffect } from 'react';
import { trackingAPI } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://4.186.25.99:3000/api';

const TouristsSidebar = ({ onTouristSelect, onViewVideos }) => {
  const [tourists, setTourists] = useState([]);
  const [activeTourists, setActiveTourists] = useState([]);
  const [inactiveTourists, setInactiveTourists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTourists();
    // Refresh every 30 seconds
    const interval = setInterval(loadTourists, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTourists = async () => {
    try {
      setLoading(true);
      const response = await trackingAPI.getAllTouristsWithLocations();
      const allTourists = response.data?.data?.tourists || response.data?.tourists || [];
      
      // Separate active (with location) and inactive (without location)
      const active = allTourists.filter(t => {
        const loc = t.currentLocation;
        return loc && (loc.coordinates || (loc.latitude !== undefined && loc.longitude !== undefined));
      });
      
      const inactive = allTourists.filter(t => {
        const loc = t.currentLocation;
        return !loc || (!loc.coordinates && loc.latitude === undefined);
      });
      
      setTourists(allTourists);
      setActiveTourists(active);
      setInactiveTourists(inactive);
    } catch (err) {
      console.error('Failed to load tourists:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTourists = (activeTab === 'active' ? activeTourists : inactiveTourists)
    .filter(t => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        t.name?.toLowerCase().includes(query) ||
        t.email?.toLowerCase().includes(query) ||
        t.digitalId?.toLowerCase().includes(query)
      );
    });

  const getStatusColor = (status) => {
    switch (status) {
      case 'safe': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'danger': return '#f44336';
      case 'emergency': return '#d32f2f';
      default: return '#9e9e9e';
    }
  };

  const handleDetails = (tourist) => {
    // Transform tourist data for map
    const loc = tourist.currentLocation;
    const lat = loc?.coordinates ? loc.coordinates[1] : loc?.latitude;
    const lng = loc?.coordinates ? loc.coordinates[0] : loc?.longitude;
    
    if (onTouristSelect && lat && lng) {
      onTouristSelect({
        id: tourist._id || tourist.id,
        digitalId: tourist.digitalId || 'N/A',
        name: tourist.name || 'Unknown Tourist',
        email: tourist.email || '',
        profilePhoto: tourist.profilePhoto || null,
        lat,
        lng,
        status: tourist.status || 'safe',
        createdAt: tourist.createdAt || null
      });
    }
  };

  const handleVideos = (tourist) => {
    if (onViewVideos) {
      // Use firebaseUid for video lookup as videos are associated with Firebase user ID
      const userId = tourist.firebaseUid || tourist._id || tourist.id;
      onViewVideos(userId, tourist.name);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '16px',
      width: '320px',
      maxHeight: 'calc(100vh - 32px)',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 500,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>
          👥 Tourists
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          {activeTourists.length} active • {inactiveTourists.length} inactive
        </p>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
        <input
          type="text"
          placeholder="Search by name, email, ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            background: activeTab === 'active' ? '#1a73e8' : 'transparent',
            color: activeTab === 'active' ? 'white' : '#666',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            transition: 'all 0.2s'
          }}
        >
          🟢 Active ({activeTourists.length})
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            background: activeTab === 'inactive' ? '#1a73e8' : 'transparent',
            color: activeTab === 'inactive' ? 'white' : '#666',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            transition: 'all 0.2s'
          }}
        >
          🔴 Inactive ({inactiveTourists.length})
        </button>
      </div>

      {/* Tourist List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Loading tourists...
          </div>
        ) : filteredTourists.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            No {activeTab} tourists found
          </div>
        ) : (
          filteredTourists.map(tourist => (
            <TouristCard
              key={tourist._id || tourist.id}
              tourist={tourist}
              isActive={activeTab === 'active'}
              statusColor={getStatusColor(tourist.status)}
              onDetails={() => handleDetails(tourist)}
              onVideos={() => handleVideos(tourist)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Tourist Card Component
const TouristCard = ({ tourist, isActive, statusColor, onDetails, onVideos }) => {
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '10px',
      padding: '12px',
      marginBottom: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: `1px solid ${isActive ? '#e0e0e0' : '#ffcdd2'}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        {/* Profile Photo */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: `2px solid ${statusColor}`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${statusColor}22`,
          flexShrink: 0
        }}>
          {tourist.profilePhoto ? (
            <img
              src={tourist.profilePhoto}
              alt={tourist.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <span style={{ fontSize: '14px', fontWeight: '600', color: statusColor }}>
              {getInitials(tourist.name)}
            </span>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isActive ? '#4caf50' : '#f44336'
            }}></span>
            <span style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#1a1a1a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {tourist.name || 'Unknown'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
            {tourist.digitalId || tourist.email || 'No ID'}
          </div>
          {!isActive && (
            <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
              Last seen: {tourist.createdAt ? new Date(tourist.createdAt).toLocaleDateString() : 'Unknown'}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div style={{
          padding: '3px 8px',
          borderRadius: '12px',
          background: statusColor,
          color: 'white',
          fontSize: '10px',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}>
          {tourist.status || 'N/A'}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={onDetails}
          disabled={!isActive}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: '6px',
            border: 'none',
            background: isActive ? '#1a73e8' : '#ccc',
            color: 'white',
            fontSize: '11px',
            fontWeight: '600',
            cursor: isActive ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          � Details
        </button>
        <button
          onClick={onVideos}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #9c27b0',
            background: 'white',
            color: '#9c27b0',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          🎬 Videos
        </button>
      </div>
    </div>
  );
};

export default TouristsSidebar;
