import React, { useState, useEffect } from 'react';
import { trackingAPI } from '../services/api';

const AlertsOverlay = () => {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    loadAlerts();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      // Using the tracking API to get alerts
      const response = await trackingAPI.getAlerts();
      const alertsData = response.data.data?.alerts || response.data?.alerts || [];
      
      // Filter for active/unresolved alerts
      const activeAlerts = alertsData.filter(alert => 
        alert.status === 'active' || alert.status === 'pending'
      );
      
      setAlerts(activeAlerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      // No mock data - show empty state when API fails
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#ef4444'; // Red
      case 'medium': return '#f97316'; // Orange
      case 'low': return '#eab308'; // Yellow
      default: return '#6b7280'; // Gray
    }
  };

  const getSeverityIcon = (type, severity) => {
    if (type === 'emergency') return '🚨';
    if (type === 'geofence') return '🛡️';
    if (type === 'safety') return '⚠️';
    return '📢';
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const dismissAlert = async (alertId) => {
    try {
      // Call API to acknowledge/dismiss alert
      await trackingAPI.dismissAlert(alertId);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId && alert._id !== alertId && alert.alertId !== alertId));
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
      // Remove from local state anyway for better UX
      setAlerts(prev => prev.filter(alert => alert.id !== alertId && alert._id !== alertId && alert.alertId !== alertId));
    }
  };

  if (isLoading) {
    return (
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(25px)',
        webkitBackdropFilter: 'blur(25px)',
        padding: '16px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        minWidth: '300px',
        fontFamily: '"Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(229, 231, 235, 0.5)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{ 
            color: '#374151',
            fontWeight: '500',
            fontSize: '14px'
          }}>Loading alerts...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      maxWidth: '400px',
      maxHeight: isMinimized ? '60px' : '80vh',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(25px)',
        webkitBackdropFilter: 'blur(25px)',
        padding: '14px 18px',
        borderRadius: isMinimized ? '16px' : '16px 16px 0 0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        fontFamily: '"Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        transition: 'all 0.3s ease'
      }} onClick={() => setIsMinimized(!isMinimized)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🚨</span>
          <h3 style={{ 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#1f2937',
            letterSpacing: '-0.025em'
          }}>
            Active Alerts ({alerts.length})
          </h3>
        </div>
        <button style={{
          background: 'rgba(107, 114, 128, 0.05)',
          backdropFilter: 'blur(15px)',
          webkitBackdropFilter: 'blur(15px)',
          border: 'none',
          fontSize: '14px',
          cursor: 'pointer',
          padding: '6px 8px',
          borderRadius: '8px',
          color: '#6b7280',
          transition: 'all 0.3s ease'
        }}>
          {isMinimized ? '▼' : '▲'}
        </button>
      </div>

      {/* Alerts List */}
      {!isMinimized && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(25px)',
          webkitBackdropFilter: 'blur(25px)',
          borderRadius: '0 0 16px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderTop: 'none',
          maxHeight: '60vh',
          overflowY: 'auto',
          fontFamily: '"Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
        }}>
          {alerts.length === 0 ? (
            <div style={{ 
              padding: '24px', 
              textAlign: 'center', 
              color: '#6b7280',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(15px)',
              webkitBackdropFilter: 'blur(15px)',
              borderRadius: '12px',
              margin: '8px'
            }}>
              <span style={{ 
                fontSize: '28px', 
                display: 'block', 
                marginBottom: '10px' 
              }}>✅</span>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '500',
                color: '#9ca3af'
              }}>No active alerts</span>
            </div>
          ) : (
            <div style={{ padding: '10px' }}>
              {alerts.map((alert) => (
                <div key={alert.id} style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(20px)',
                  webkitBackdropFilter: 'blur(20px)',
                  border: `1px solid ${getSeverityColor(alert.severity)}15`,
                  borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '10px',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      webkitBackdropFilter: 'blur(10px)',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}>
                      <span style={{ fontSize: '16px' }}>{getSeverityIcon(alert.type, alert.severity)}</span>
                      <h4 style={{ 
                        margin: 0, 
                        fontSize: '14px', 
                        fontWeight: '600',
                        color: getSeverityColor(alert.severity),
                        letterSpacing: '-0.025em'
                      }}>
                        {alert.title}
                      </h4>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissAlert(alert.id);
                      }}
                      style={{
                        background: 'rgba(107, 114, 128, 0.05)',
                        backdropFilter: 'blur(15px)',
                        webkitBackdropFilter: 'blur(15px)',
                        border: 'none',
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        color: '#6b7280',
                        transition: 'all 0.3s ease'
                      }}
                      title="Dismiss alert"
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(107, 114, 128, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(107, 114, 128, 0.05)';
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <p style={{ 
                    margin: '0 0 10px 0', 
                    fontSize: '13px', 
                    color: '#374151',
                    lineHeight: '1.5',
                    fontWeight: '400',
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    webkitBackdropFilter: 'blur(10px)',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    {alert.message}
                  </p>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '12px', 
                    color: '#6b7280',
                    fontWeight: '500',
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    webkitBackdropFilter: 'blur(10px)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span>📍 {alert.location}</span>
                    <span>{formatTimeAgo(alert.timestamp)}</span>
                  </div>
                  
                  {alert.touristId && (
                    <div style={{ 
                      marginTop: '10px', 
                      fontSize: '11px', 
                      color: '#9ca3af',
                      fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
                      background: 'rgba(107, 114, 128, 0.03)',
                      backdropFilter: 'blur(10px)',
                      webkitBackdropFilter: 'blur(10px)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      display: 'inline-block',
                      border: '1px solid rgba(107, 114, 128, 0.05)'
                    }}>
                      Tourist ID: {alert.touristId}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Refresh button when minimized */}
      {isMinimized && alerts.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          width: '8px',
          height: '8px',
          background: '#ef4444',
          borderRadius: '50%',
          animation: 'pulse 2s infinite'
        }}></div>
      )}

      {/* CSS animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default AlertsOverlay;