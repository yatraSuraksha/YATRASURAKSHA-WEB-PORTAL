import React, { useEffect, useRef, useState } from 'react';
import googleMapsService from '../services/googleMaps';
import mapStyles from '../utils/mapStyles';

const GoogleMap = ({ 
  center = { lat: 16.5062, lng: 80.6480 }, // Default to Vijayawada
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
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  
  useEffect(() => {
    initializeMap();
    return () => {
      cleanup();
    };
  }, []);

  const initializeMap = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo('Loading Google Maps API...');

      console.log('Starting Google Maps initialization...');
      console.log('API Key:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'Set' : 'Not Set');

      // Initialize Google Maps API
      const google = await googleMapsService.initialize();
      setDebugInfo('Creating map instance...');

      console.log('Google Maps API loaded, creating map...');

      // Create map instance with custom styles
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: center,
        zoom: zoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: mapStyles,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: 'greedy'
      });

      console.log('Map styles applied:', mapStyles.length, 'rules');

      setDebugInfo('Map created successfully');

      // Add some test markers
      const marker = new google.maps.Marker({
        position: center,
        map: mapInstanceRef.current,
        title: 'Test Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#1351fbff',
          fillOpacity: 1,
          strokeColor: '#00ffddff',
          strokeWeight: 2,
          scale: 6
        }
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
      setDebugInfo('Map ready!');
      setIsLoading(false);

    } catch (err) {
      console.error('Failed to initialize Google Maps:', err);
      setError(err.message);
      setDebugInfo(`Error: ${err.message}`);
      setIsLoading(false);
    }
  };

  const cleanup = () => {
    if (mapInstanceRef.current) {
      // Clean up map instance
      mapInstanceRef.current = null;
    }
  };

  if (error) {
    return (
      <div className={`map-container ${className}`} style={{ height }}>
        <div className="error" style={{
          padding: '24px',
          backgroundColor: 'rgba(254, 242, 242, 0.3)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          border: '1px solid rgba(254, 202, 202, 0.3)',
          borderRadius: '16px',
          color: '#dc2626',
          fontFamily: '"Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          boxShadow: '0 8px 32px rgba(220, 38, 38, 0.08)'
        }}>
          <h3 style={{ 
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '600',
            letterSpacing: '-0.025em'
          }}>Google Maps Error</h3>
          <p style={{ 
            margin: '8px 0',
            fontSize: '14px',
            fontWeight: '500'
          }}><strong>Error:</strong> {error}</p>
          <p style={{ 
            margin: '8px 0',
            fontSize: '14px',
            fontWeight: '500'
          }}><strong>Debug Info:</strong> {debugInfo}</p>
          <p style={{ 
            margin: '8px 0',
            fontSize: '14px',
            fontWeight: '500'
          }}><strong>API Key Status:</strong> {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'Configured' : 'Not Set'}</p>
          <p style={{ 
            margin: '16px 0 8px 0',
            fontSize: '14px',
            color: '#991b1b'
          }}>Please check your Google Maps API key configuration and ensure the following APIs are enabled:</p>
          <ul style={{ 
            margin: '8px 0',
            paddingLeft: '20px',
            fontSize: '13px',
            lineHeight: '1.6'
          }}>
            <li>Maps JavaScript API</li>
            <li>Places API</li>
            <li>Geocoding API</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={`map-container ${className}`} style={{ height, position: 'relative' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          fontFamily: '"Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
        }}>
          <div className="spinner" style={{
            border: '3px solid rgba(243, 244, 246, 0.2)',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px'
          }}></div>
          <span style={{ 
            fontSize: '16px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px',
            letterSpacing: '-0.025em'
          }}>Loading Google Maps...</span>
          <small style={{ 
            marginTop: '4px', 
            color: '#9ca3af',
            fontSize: '13px',
            fontWeight: '400'
          }}>{debugInfo}</small>
        </div>
      )}
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: '16px',
          overflow: 'hidden'
        }} 
      />
      
      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Enhanced glassmorphism support */
        .glassmorphism {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.4) !important;
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default GoogleMap;