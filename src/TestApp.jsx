import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './index.css';

// Simple test component instead of GoogleMap for now
const TestMap = ({ height = '400px' }) => {
  return (
    <div style={{ 
      height, 
      backgroundColor: '#f0f0f0', 
      border: '2px solid #ccc',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      color: '#666'
    }}>
      🗺️ Map Component (Google Maps will load here)
      <br />
      <small>Google Maps API Key: {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'Configured' : 'Not Set'}</small>
    </div>
  );
};

// Navigation Component
const Sidebar = () => {
  const location = useLocation();
  
  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/map', label: 'Live Map', icon: '🗺️' },
    { path: '/tourists', label: 'Tourist Management', icon: '👥' },
    { path: '/alerts', label: 'Alerts & Incidents', icon: '🚨' },
    { path: '/geofences', label: 'Geofence Management', icon: '🛡️' },
    { path: '/ocr', label: 'Document Processing', icon: '📄' },
    { path: '/analytics', label: 'Analytics', icon: '📈' }
  ];

  return (
    <div className="sidebar">
      <h1>🛡️ Yatra Suraksha Admin</h1>
      <nav>
        <ul className="nav-menu">
          {navigationItems.map((item) => (
            <li key={item.path} className="nav-item">
              <Link 
                to={item.path} 
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span style={{ marginRight: '8px' }}>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

// Dashboard Page
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalTourists: 0,
    activeTourists: 0,
    activeAlerts: 0,
    connectedDevices: 0
  });

  // Test backend connection
  React.useEffect(() => {
    const testBackend = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tracking/stats`);
        if (response.ok) {
          const data = await response.json();
          console.log('Backend connection successful:', data);
        }
      } catch (error) {
        console.log('Backend connection failed:', error);
      }
    };
    testBackend();
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: '2rem', color: '#1e293b' }}>Dashboard Overview</h2>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Total Tourists</h3>
            <span style={{ fontSize: '2rem' }}>👥</span>
          </div>
          <div className="card-value">{stats.totalTourists}</div>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Registered in system</p>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Active Tourists</h3>
            <span style={{ fontSize: '2rem' }}>🟢</span>
          </div>
          <div className="card-value">{stats.activeTourists}</div>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Currently tracked</p>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Active Alerts</h3>
            <span style={{ fontSize: '2rem' }}>🚨</span>
          </div>
          <div className="card-value" style={{ color: '#ef4444' }}>{stats.activeAlerts}</div>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Require attention</p>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Connected Devices</h3>
            <span style={{ fontSize: '2rem' }}>📱</span>
          </div>
          <div className="card-value">{stats.connectedDevices}</div>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Online now</p>
        </div>
      </div>

      <div className="dashboard-card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Quick Overview Map</h3>
        <TestMap height="400px" />
      </div>

      {/* Debug Information */}
      <div className="dashboard-card" style={{ marginTop: '1rem', backgroundColor: '#f8f9fa' }}>
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Debug Information</h3>
        <div style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
          <p><strong>API Base URL:</strong> {import.meta.env.VITE_API_BASE_URL}</p>
          <p><strong>Backend URL:</strong> {import.meta.env.VITE_BACKEND_URL}</p>
          <p><strong>Google Maps API:</strong> {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'Configured' : 'Not Set'}</p>
          <p><strong>Environment:</strong> {import.meta.env.VITE_NODE_ENV}</p>
        </div>
      </div>
    </div>
  );
};

// Simple test pages
const LiveMapPage = () => (
  <div>
    <h2 style={{ marginBottom: '1rem', color: '#1e293b' }}>Live Tourist Tracking Map</h2>
    <div className="dashboard-card" style={{ padding: 0, overflow: 'hidden' }}>
      <TestMap height="600px" />
    </div>
  </div>
);

const TouristManagement = () => (
  <div>
    <h2 style={{ color: '#1e293b' }}>Tourist Management</h2>
    <div className="dashboard-card">
      <p>Tourist profile management, KYC verification, and tracking history will be implemented here.</p>
    </div>
  </div>
);

const AlertsManagement = () => (
  <div>
    <h2 style={{ color: '#1e293b' }}>Alerts & Incident Management</h2>
    <div className="dashboard-card">
      <p>Emergency alerts, incident reports, and response management will be implemented here.</p>
    </div>
  </div>
);

const GeofenceManagement = () => (
  <div>
    <h2 style={{ color: '#1e293b' }}>Geofence Management</h2>
    <div className="dashboard-card">
      <p>Create, edit, and manage geofenced areas for tourist safety monitoring.</p>
      <TestMap height="500px" />
    </div>
  </div>
);

const OCRProcessing = () => (
  <div>
    <h2 style={{ color: '#1e293b' }}>Document Processing (OCR)</h2>
    <div className="dashboard-card">
      <p>KYC document upload, processing, and verification interface will be implemented here.</p>
    </div>
  </div>
);

const Analytics = () => (
  <div>
    <h2 style={{ color: '#1e293b' }}>Analytics & Reports</h2>
    <div className="dashboard-card">
      <p>Tourism statistics, safety analytics, and comprehensive reporting dashboard will be implemented here.</p>
    </div>
  </div>
);

// Main App Component
const App = () => {
  return (
    <Router basename="/YATRA-SURAKSHA-ADMIN-PORTAL">
      <div className="admin-portal">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/map" element={<LiveMapPage />} />
            <Route path="/tourists" element={<TouristManagement />} />
            <Route path="/alerts" element={<AlertsManagement />} />
            <Route path="/geofences" element={<GeofenceManagement />} />
            <Route path="/ocr" element={<OCRProcessing />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;