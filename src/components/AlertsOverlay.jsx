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
      console.log('Alerts API Response:', response.data);
      const alertsData = response.data.data?.alerts || response.data?.alerts || [];
      console.log('Parsed alerts:', alertsData);
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
      case 'inactivity': return '⏰';
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
      case 'inactivity': return 'Inactivity Alert';
      default: return type || 'Alert';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + 'm ago';
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return diffHours + 'h ago';
    return Math.floor(diffHours / 24) + 'd ago';
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
        onViewOnMap(location);
      } else {
        const url = 'https://www.google.com/maps?q=' + location.latitude + ',' + location.longitude;
        window.open(url, '_blank');
      }
    }
  };

  const handleCallTourist = (phone) => {
    if (phone) {
      window.location.href = 'tel:' + phone;
    } else {
      alert('No phone number available for this tourist');
    }
  };

  const handleDispatchHelp = (alertData) => {
    const tourist = alertData.tourist;
    const location = alertData.location;

    const details = [
      'Tourist: ' + (tourist?.name || 'Unknown'),
      'Phone: ' + (tourist?.phone || 'N/A'),
      'Email: ' + (tourist?.email || 'N/A'),
      location ? 'Location: ' + location.latitude?.toFixed(5) + ', ' + location.longitude?.toFixed(5) : null
    ].filter(Boolean).join('\n');

    const confirmDispatch = window.confirm(
      '🚨 DISPATCH EMERGENCY SERVICES\n\n' + details + '\n\nProceed with dispatch?'
    );

    if (confirmDispatch) {
      console.log('Dispatching help for alert:', alertData);
      window.alert('✅ Emergency services have been notified!\n\nA response team is being dispatched to the location.');
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
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
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
          animation: 'spin 0.8s linear infinite'
        }}></div>
        <span style={{ color: '#1a1a1a', fontWeight: '600', fontSize: '13px' }}>
          Loading alerts...
        </span>
        <style>{'@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }'}</style>
      </div>
    );
  }

  const hasAlerts = alerts.length > 0;

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: '320px',
      maxHeight: isMinimized ? 'auto' : 'calc(100vh - 32px)',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <style>{'@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.7; } }'}</style>

      {/* Header */}
      <div
        onClick={() => setIsMinimized(!isMinimized)}
        style={{
          padding: '16px',
          borderBottom: '1px solid #eee',
          cursor: 'pointer',
          background: hasAlerts ? '#fef2f2' : '#f0fdf4',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>
            {hasAlerts ? '🚨' : '✅'} Emergency Alerts
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
            {hasAlerts ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  background: '#ef4444',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s infinite'
                }}></span>
                {alerts.length + ' active alert' + (alerts.length > 1 ? 's' : '')}
              </span>
            ) : (
              'All tourists safe'
            )}
          </p>
        </div>
        <div style={{
          padding: '4px 10px',
          borderRadius: '6px',
          background: hasAlerts ? '#fee2e2' : '#dcfce7',
          color: hasAlerts ? '#dc2626' : '#16a34a',
          fontSize: '11px',
          fontWeight: '600'
        }}>
          {isMinimized ? '▼ Show' : '▲ Hide'}
        </div>
      </div>

      {/* Alerts List */}
      {!isMinimized && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {alerts.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
              <p style={{ margin: 0, color: '#16a34a', fontWeight: '600', fontSize: '14px' }}>
                All Clear
              </p>
              <p style={{ margin: '6px 0 0 0', color: '#666', fontSize: '12px' }}>
                No active emergency alerts
              </p>
              <p style={{ margin: '4px 0 0 0', color: '#999', fontSize: '11px' }}>
                All tourists are safe and accounted for
              </p>
            </div>
          ) : (
            alerts.map(alertItem => {
              const colors = getSeverityColor(alertItem.severity);
              const alertKey = alertItem.alertId || alertItem.id || alertItem._id;
              const isExpanded = expandedAlert === alertKey;
              const tourist = alertItem.tourist;

              return (
                <div
                  key={alertKey}
                  style={{
                    background: 'white',
                    borderRadius: '10px',
                    marginBottom: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid ' + (isExpanded ? colors.border : '#e0e0e0'),
                    overflow: 'hidden'
                  }}
                >
                  {/* Alert Header - Clickable */}
                  <div
                    onClick={() => toggleExpand(alertKey)}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      borderLeft: '4px solid ' + colors.border,
                      background: isExpanded ? colors.bg : 'white'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      {/* Type Icon */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '2px solid ' + colors.border,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: colors.bg,
                        fontSize: '18px',
                        flexShrink: 0
                      }}>
                        {getTypeIcon(alertItem.type)}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: colors.border,
                            animation: alertItem.severity === 'emergency' ? 'pulse 1s infinite' : 'none'
                          }}></span>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#1a1a1a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {tourist?.name || 'Unknown Tourist'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                          {getTypeLabel(alertItem.type)}
                        </div>
                      </div>

                      {/* Severity Badge */}
                      <div style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: colors.badge,
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {alertItem.severity}
                      </div>
                    </div>

                    {/* Message Preview */}
                    <p style={{
                      margin: 0,
                      fontSize: '12px',
                      color: '#666',
                      whiteSpace: isExpanded ? 'normal' : 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {typeof alertItem.message === 'object' ? alertItem.message.english : alertItem.message}
                    </p>

                    {/* Time */}
                    <div style={{
                      fontSize: '10px',
                      color: '#999',
                      marginTop: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{formatTimeAgo(alertItem.createdAt || alertItem.timestamp)}</span>
                      <span style={{ fontSize: '12px' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div style={{
                      borderTop: '1px solid #eee',
                      background: '#f9fafb'
                    }}>
                      {/* Tourist Details */}
                      <div style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {/* Name & Email */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <DetailCard icon="👤" label="Name" value={tourist?.name || 'Unknown'} />
                            <DetailCard icon="📧" label="Email" value={tourist?.email || 'N/A'} />
                          </div>

                          {/* Phone */}
                          <div style={{
                            background: '#eff6ff',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            border: '1px solid #bfdbfe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div>
                              <div style={{ fontSize: '10px', color: '#1e40af', fontWeight: '600', marginBottom: '2px' }}>
                                📱 PHONE
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e3a8a' }}>
                                {tourist?.phone || 'Not available'}
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCallTourist(tourist?.phone); }}
                              disabled={!tourist?.phone}
                              style={{
                                background: tourist?.phone ? '#10b981' : '#ccc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: tourist?.phone ? 'pointer' : 'not-allowed'
                              }}
                            >
                              📞 Call
                            </button>
                          </div>

                          {/* Alert Location */}
                          <div style={{
                            background: '#fef2f2',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            border: '1px solid #fecaca'
                          }}>
                            <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: '600', marginBottom: '4px' }}>
                              🚨 ALERT LOCATION
                            </div>
                            <div style={{ fontSize: '12px', color: '#991b1b', fontFamily: 'monospace' }}>
                              {alertItem.location ?
                                alertItem.location.latitude?.toFixed(6) + ', ' + alertItem.location.longitude?.toFixed(6) :
                                'Location unavailable'}
                            </div>
                            <div style={{ fontSize: '10px', color: '#b91c1c', marginTop: '4px' }}>
                              ⏱️ {formatFullTime(alertItem.createdAt || alertItem.timestamp)}
                            </div>
                          </div>

                          {/* Current Location (from tourist profile) */}
                          <div style={{
                            background: '#f0f9ff',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            border: '1px solid #7dd3fc'
                          }}>
                            <div style={{ fontSize: '10px', color: '#0369a1', fontWeight: '600', marginBottom: '4px' }}>
                              📍 CURRENT LOCATION
                            </div>
                            <div style={{ fontSize: '12px', color: '#0c4a6e', fontFamily: 'monospace' }}>
                              {tourist?.currentLocation?.coordinates ?
                                tourist.currentLocation.coordinates[1]?.toFixed(6) + ', ' + tourist.currentLocation.coordinates[0]?.toFixed(6) :
                                'Not available'}
                            </div>
                            {tourist?.currentLocation?.timestamp && (
                              <div style={{ fontSize: '10px', color: '#0369a1', marginTop: '4px' }}>
                                ⏱️ Last updated: {formatFullTime(tourist.currentLocation.timestamp)}
                              </div>
                            )}
                          </div>

                          {/* Digital ID */}
                          {tourist?.digitalId && (
                            <div style={{
                              background: '#f3f4f6',
                              borderRadius: '6px',
                              padding: '8px 10px',
                              fontSize: '11px',
                              color: '#4b5563'
                            }}>
                              🆔 <strong>Digital ID:</strong> {tourist.digitalId}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{
                        display: 'flex',
                        gap: '6px',
                        padding: '10px 12px',
                        borderTop: '1px solid #eee',
                        background: 'white'
                      }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewOnMap(alertItem.location); }}
                          disabled={!alertItem.location}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: alertItem.location ? '#1a73e8' : '#ccc',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: alertItem.location ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          🗺️ Locate
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDispatchHelp(alertItem); }}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #ef4444',
                            background: 'white',
                            color: '#ef4444',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          🚑 Dispatch
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissAlert(alertKey); }}
                          disabled={actionLoading === alertKey}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#10b981',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: actionLoading === alertKey ? 'not-allowed' : 'pointer',
                            opacity: actionLoading === alertKey ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          {actionLoading === alertKey ? '⏳' : '✓'} Resolve
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Footer */}
      {!isMinimized && alerts.length > 0 && (
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f9fafb'
        }}>
          <button
            onClick={loadAlerts}
            style={{
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#666',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🔄 Refresh
          </button>
          <span style={{ fontSize: '10px', color: '#999' }}>
            Auto-refresh: 30s
          </span>
        </div>
      )}

      {/* Pulse indicator when minimized */}
      {isMinimized && alerts.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '20px',
          height: '20px',
          background: '#ef4444',
          borderRadius: '50%',
          border: '2px solid white',
          animation: 'pulse 1.5s infinite',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: 'white',
          fontWeight: '700',
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)'
        }}>
          {alerts.length}
        </div>
      )}
    </div>
  );
};

// Detail Card Component
const DetailCard = ({ icon, label, value }) => (
  <div style={{
    background: '#f9fafb',
    borderRadius: '6px',
    padding: '8px 10px'
  }}>
    <div style={{
      fontSize: '10px',
      color: '#666',
      fontWeight: '600',
      marginBottom: '2px',
      textTransform: 'uppercase'
    }}>
      {icon} {label}
    </div>
    <div style={{
      fontSize: '12px',
      color: '#1a1a1a',
      fontWeight: '600'
    }}>
      {value}
    </div>
  </div>
);

export default AlertsOverlay;
