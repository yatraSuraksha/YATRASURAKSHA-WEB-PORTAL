import React, { useState } from 'react';
import { getAvailableThemes, getAvailableAzureStyles, getTheme, AZURE_MAP_STYLES } from '../utils/mapThemes';

const MapThemeSelector = ({ 
  currentTheme = 'default', 
  currentMapStyle = 'grayscale_light',
  onThemeChange,
  onMapStyleChange,
  compact = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const themes = getAvailableThemes();
  const azureStyles = getAvailableAzureStyles();
  const selectedTheme = getTheme(currentTheme);

  const containerStyle = {
    position: 'absolute',
    top: '17px',
    // bottom: '160px',
    left: '360px',
    // right: '400px',
    zIndex: 999,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'white',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#333',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    transition: 'all 0.2s ease',
  };

  const dropdownStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '8px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    minWidth: '320px',
    maxHeight: '500px',
    overflowY: 'auto',
    display: isOpen ? 'block' : 'none',
  };

  const sectionStyle = {
    padding: '12px 16px',
    borderBottom: '1px solid #eee',
  };

  const sectionTitleStyle = {
    fontSize: '11px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '10px',
  };

  const optionStyle = (isSelected) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
    border: isSelected ? '2px solid #1976d2' : '2px solid transparent',
    transition: 'all 0.15s ease',
    marginBottom: '6px',
  });

  const colorPreviewStyle = (colors) => ({
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`,
    border: '2px solid rgba(0,0,0,0.1)',
  });

  const mapStylePreviewStyle = (style) => {
    const isDark = style.includes('dark') || style.includes('night');
    const isSatellite = style.includes('satellite');
    return {
      width: '32px',
      height: '32px',
      borderRadius: '6px',
      backgroundColor: isSatellite ? '#2d4a3e' : isDark ? '#1a1a1a' : '#e8e8e8',
      border: '2px solid rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
    };
  };

  return (
    <div style={containerStyle}>
      <button 
        style={buttonStyle}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => e.target.style.borderColor = '#1976d2'}
        onMouseLeave={(e) => e.target.style.borderColor = '#e0e0e0'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        <span>Theme</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      <div style={dropdownStyle}>
        {/* Color Themes Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>🎨 Color Themes</div>
          {themes.map(theme => {
            const themeData = getTheme(theme.key);
            const previewColors = [themeData.colors.primary, themeData.colors.secondary, themeData.markers.safe];
            return (
              <div
                key={theme.key}
                style={optionStyle(currentTheme === theme.key)}
                onClick={() => {
                  onThemeChange?.(theme.key);
                  // Auto-change map style based on theme
                  if (onMapStyleChange && themeData.azureMapStyle) {
                    onMapStyleChange(themeData.azureMapStyle);
                  }
                }}
              >
                <div style={colorPreviewStyle(previewColors)} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: '14px', color: '#333' }}>{theme.name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{theme.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Map Style Section */}
        <div style={{ ...sectionStyle, borderBottom: 'none' }}>
          <div style={sectionTitleStyle}>🗺️ Map Base Style</div>
          {azureStyles.map(style => (
            <div
              key={style.key}
              style={optionStyle(currentMapStyle === style.value)}
              onClick={() => onMapStyleChange?.(style.value)}
            >
              <div style={mapStylePreviewStyle(style.value)}>
                {style.value.includes('satellite') && '🛰️'}
                {style.value.includes('night') && '🌙'}
                {style.value.includes('road') && !style.value.includes('satellite') && '🛣️'}
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: '14px', color: '#333' }}>{style.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default MapThemeSelector;
