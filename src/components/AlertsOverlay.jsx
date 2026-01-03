import React, { useState, useEffect } from 'react';
import { trackingAPI } from '../services/api';

const AlertsOverlay = ({ onViewOnMap }) => {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const response = await trackingAPI.getAlerts();
      const alertsData = response.data.data?.alerts || response.data?.alerts || [];
      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'emergency': return { bg: '#fef2f2', border: '#ef4444', text: '#dc2626', badge: '#ef4444' };
      case 'high': return { bg: '#fff7ed', border: '#f97316', text: '#ea580c', badge: '#f97316' };
      case 'critical':
      case 'medium': return { bg: '#fffbeb', border: '#f59e0b', text: '#d97706', badge: '#f59e0b' };
      case 'warning':
      case 'low': return { bg: '#fefce8', border: '#eab308', text: '#ca8a04', badge: '#eab308' };
      default: return { bg: '#f9fafb', border: '#6b7280', text: '#4b5563', badge: '#6b7280' };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'panic_button': return '🆘';
      case 'medical': return '🏥';
      case 'geofence': return '🛡️';
      case 'safety': return '⚠️';
      case 'sos': return '🚨';
      default: return '📢';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'panic_button': return 'Panic Button';
      case 'medical': return 'Medical Emergency';
      case 'geofence': return 'Geofence Alert';
      case 'safety': return 'Safety Alert';
      case 'sos': return 'SOS';
      default: return type || 'Alert';
    }
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

  const formatFullTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const dismissAlert = async (alertId) => {
    try {
      setActionLoading(alertId);
      await trackingAPI.dismissAlert(alertId);
      setAlerts(prev => prev.filter(alert => 
        alert.id !== alertId && 
        alert._id !== alertId && 
        alert.alertId !== alertId
      ));
      setExpandedAlert(null);
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
      alert('Failed to dismiss alert. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewOnMap = (location) => {
    if (location?.latitude && location?.longitude) {
      if (onViewOnMap) {
        // Use the callback to center the Azure map
        onViewOnMap(location);
      } else {
        // Fallback to Google Maps if no callback provided
        const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
        window.open(url, '_blank');
      }
    }
  };

  const handleContactTourist = (touristId) => {
    alert(`Contacting tourist: ${touristId}`);
  };

  const handleDispatchHelp = (alertData) => {
    const confirmDispatch = window.confirm(
      `Dispatch emergency help to location:\n${alertData.location?.latitude?.toFixed(4)}, ${alertData.location?.longitude?.toFixed(4)}?`
    );
    if (confirmDispatch) {
      console.log('Dispatching help for alert:', alertData.id);
      window.alert('Emergency services have been notified!');
    }
  };

  const toggleExpand = (alertId) => {
    setExpandedAlert(expandedAlert === alertId ? null : alertId);
  };

  if (isLoading) {
    return (
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 1000,
        background: 'white',
        padding: '16px 20px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{
          width: '18px',
          height: '18px',
          border: '2px solid #e5e7eb',
          borderTopColor: '#ef4444',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ color: '#374151', fontWeight: '500', fontSize: '14px' }}>
          Loading alerts...
        </span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      zIndex: 1000,
      width: '380px',
      maxHeight: isMinimized ? 'auto' : '85vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div 
        onClick={() => setIsMinimized(!isMinimized)}
        style={{
          background: alerts.length > 0 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)',
          padding: '14px 18px',
          borderRadius: isMinimized ? '12px' : '12px 12px 0 0',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            {alerts.length > 0 ? '🚨' : '✅'}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'white' }}>
              Emergency Alerts
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
              {alerts.length > 0 ? `${alerts.length} active alert${alerts.length > 1 ? 's' : ''}` : 'All clear'}
            </p>
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '6px',
          padding: '6px 10px',
          color: 'white',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {isMinimized ? '▼ Show' : '▲ Hide'}
        </div>
      </div>

      {/* Alerts List */}
      {!isMinimized && (
        <div style={{
          background: 'white',
          borderRadius: '0 0 12px 12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          maxHeight: '70vh',
          overflowY: 'auto'
        }}>
          {alerts.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
              <p style={{ margin: 0, color: '#10b981', fontWeight: '600', fontSize: '15px' }}>
                No Active Alerts
              </p>
              <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '13px' }}>
                All tourists are safe and accounted for
              </p>
            </div>
          ) : (
            <div style={{ padding: '8px' }}>
              {alerts.map((alertItem) => {
                const colors = getSeverityColor(alertItem.severity);
                const alertKey = alertItem.alertId || alertItem.id;
                const isExpanded = expandedAlert === alertKey;
                
                return (
                  <div 
                    key={alertKey}
                    style={{
                      background: colors.bg,
                      borderRadius: '10px',
                      marginBottom: '8px',
                      border: `1px solid ${colors.border}30`,
                      overflow: 'hidden',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Alert Header - Clickable */}
                    <div 
                      onClick={() => toggleExpand(alertKey)}
                      style={{
                        padding: '12px 14px',
                        cursor: 'pointer',
                        borderLeft: `4px solid ${colors.border}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            background: `${colors.border}20`,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            flexShrink: 0
                          }}>
                            {getTypeIcon(alertItem.type)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '13px',
                                fontWeight: '700',
                                color: colors.text,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                {getTypeLabel(alertItem.type)}
                              </span>
                              <span style={{
                                background: colors.badge,
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: '600',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                textTransform: 'uppercase'
                              }}>
                                {alertItem.severity}
                              </span>
                            </div>
                            <p style={{
                              margin: '6px 0 0 0',
                              fontSize: '13px',
                              color: '#374151',
                              lineHeight: '1.4',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: isExpanded ? 'normal' : 'nowrap'
                            }}>
                              {typeof alertItem.message === 'object' ? alertItem.message.english : alertItem.message}
                            </p>
                          </div>
                        </div>
                        <span style={{
                          fontSize: '11px',
                          color: '#6b7280',
                          whiteSpace: 'nowrap',
                          marginLeft: '8px'
                        }}>
                          {formatTimeAgo(alertItem.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div style={{
                        borderTop: `1px dashed ${colors.border}40`,
                        padding: '12px 14px',
                        background: 'rgba(255,255,255,0.5)'
                      }}>
                        {/* Details Grid */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '10px',
                          marginBottom: '12px'
                        }}>
                          <DetailItem 
                            icon="📍" 
                            label="Location" 
                            value={alertItem.location ? `${alertItem.location.latitude?.toFixed(5)}, ${alertItem.location.longitude?.toFixed(5)}` : 'Unknown'}
                          />
                          <DetailItem 
                            icon="🕐" 
                            label="Time" 
                            value={formatFullTime(alertItem.timestamp)}
                          />
                          <DetailItem 
                            icon="👤" 
                            label="Tourist ID" 
                            value={alertItem.tourist?._id?.slice(-8) || alertItem.touristId?.slice(-8) || 'N/A'}
                          />
                          <DetailItem 
                            icon="🏷️" 
                            label="Alert ID" 
                            value={alertItem.alertId?.split('_')[1] || alertItem.id?.slice(-8) || 'N/A'}
                          />
                        </div>

                        {/* Metadata */}
                        {alertItem.metadata?.triggeredBy && (
                          <div style={{
                            background: '#f3f4f6',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            marginBottom: '12px',
                            fontSize: '11px',
                            color: '#6b7280'
                          }}>
                            <span style={{ fontWeight: '600' }}>Triggered by:</span> {alertItem.metadata.triggeredBy}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <ActionButton
                            icon="🗺️"
                            label="View on Map"
                            onClick={() => handleViewOnMap(alertItem.location)}
                            color="#3b82f6"
                            disabled={!alertItem.location}
                          />
                          <ActionButton
                            icon="📞"
                            label="Contact"
                            onClick={() => handleContactTourist(alertItem.tourist?._id || alertItem.touristId)}
                            color="#8b5cf6"
                          />
                          <ActionButton
                            icon="🚑"
                            label="Dispatch Help"
                            onClick={() => handleDispatchHelp(alertItem)}
                            color="#ef4444"
                          />
                          <ActionButton
                            icon="✓"
                            label={actionLoading === alertKey ? 'Resolving...' : 'Resolve'}
                            onClick={() => dismissAlert(alertKey)}
                            color="#10b981"
                            loading={actionLoading === alertKey}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {alerts.length > 0 && (
            <div style={{
              padding: '10px 14px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button
                onClick={loadAlerts}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🔄 Refresh
              </button>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                Auto-refresh: 30s
              </span>
            </div>
          )}
        </div>
      )}

      {/* Pulse indicator when minimized */}
      {isMinimized && alerts.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '14px',
          height: '14px',
          background: '#ef4444',
          borderRadius: '50%',
          border: '2px solid white',
          animation: 'pulse 2s infinite'
        }}>
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.7; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

// Detail Item Component
const DetailItem = ({ icon, label, value }) => (
  <div style={{
    background: '#f9fafb',
    borderRadius: '6px',
    padding: '8px 10px'
  }}>
    <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '500', marginBottom: '2px' }}>
      {icon} {label}
    </div>
    <div style={{ fontSize: '12px', color: '#374151', fontWeight: '600', wordBreak: 'break-all' }}>
      {value}
    </div>
  </div>
);

// Action Button Component
const ActionButton = ({ icon, label, onClick, color, disabled, loading }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    style={{
      background: disabled ? '#e5e7eb' : `${color}15`,
      border: `1px solid ${disabled ? '#d1d5db' : color}40`,
      borderRadius: '6px',
      padding: '8px 12px',
      fontSize: '11px',
      fontWeight: '600',
      color: disabled ? '#9ca3af' : color,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      transition: 'all 0.2s',
      opacity: loading ? 0.7 : 1
    }}
  >
    {loading ? '⏳' : icon} {label}
  </button>
);

export default AlertsOverlay;
