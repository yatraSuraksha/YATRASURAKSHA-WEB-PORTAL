# Yatra Suraksha Admin Portal

Smart Tourist Safety Monitoring & Incident Response System - Admin Dashboard

## 🚀 Features

- **Live Tourist Tracking** - Real-time location monitoring with Google Maps
- **Geofence Management** - Create and manage safety zones
- **Alert System** - Emergency alerts and incident response
- **Analytics Dashboard** - Tourism statistics and safety metrics
- **Document Processing** - OCR-based KYC verification
- **Multi-language Support** - Ready for Indian languages

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Google Maps API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create an API key with proper restrictions
5. Add your API key to `.env` file:

```env
VITE_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key_here
```

### 3. Backend Configuration

Make sure your backend is running on `http://localhost:3000`. Update `.env` if needed:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_BACKEND_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### 4. Start Development Server
```bash
npm run dev
```

## 📱 Available Pages

- **Dashboard** (`/`) - Overview with key metrics and quick map
- **Live Map** (`/map`) - Full-screen real-time tracking map
- **Tourist Management** (`/tourists`) - Tourist profiles and KYC
- **Alerts & Incidents** (`/alerts`) - Emergency response system
- **Geofence Management** (`/geofences`) - Safety zone configuration
- **Document Processing** (`/ocr`) - KYC document verification
- **Analytics** (`/analytics`) - Reports and statistics

## 🗺️ Map Features

- **Tourist Markers** - Color-coded by safety score
  - Green (80+): Safe
  - Yellow (60-79): Caution
  - Orange (40-59): Warning  
  - Red (<40): Danger

- **Geofences** - Visual safety zones
  - Safe zones (green)
  - Warning areas (yellow)
  - Danger zones (red)
  - Restricted areas (purple)

- **Heatmap** - Tourist density visualization
- **Real-time Updates** - Live location tracking
- **Interactive Controls** - Toggle layers and settings

## 🔧 API Integration

The portal integrates with these backend endpoints:

- `GET /api/users/all` - Tourist management
- `GET /api/tracking/stats` - Statistics
- `GET /api/tracking/location/heatmap` - Map data
- `GET /api/tracking/geofences` - Geofence management
- `GET /api/tracking/alerts/active` - Alert monitoring
- `POST /api/ocr/process` - Document processing

## 🛡️ Security Features

- Environment variable protection
- CORS-enabled API communication
- Secure file upload handling
- Input validation and sanitization

## 🌍 Google Maps API Requirements

Make sure to enable these libraries in your Google Maps configuration:
- `places` - For location search
- `geometry` - For geofence calculations
- `drawing` - For interactive geofence creation+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
