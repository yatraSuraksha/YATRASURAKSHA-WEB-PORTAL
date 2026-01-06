// Azure Maps Service for loading and managing Azure Maps API

class AzureMapsService {
  constructor() {
    this.isLoaded = false;
    this.atlas = null;
    this.loadPromise = null;
  }

  async initialize() {
    // Return cached promise if already loading
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Return if already loaded
    if (this.isLoaded && this.atlas) {
      return this.atlas;
    }

    // Check if Azure Maps is already loaded globally
    if (window.atlas) {
      this.atlas = window.atlas;
      this.isLoaded = true;
      console.log('Azure Maps API already loaded globally');
      return this.atlas;
    }

    const subscriptionKey = import.meta.env.VITE_AZURE_MAPS_KEY;
    
    if (!subscriptionKey) {
      throw new Error('Azure Maps subscription key not configured. Please set VITE_AZURE_MAPS_KEY in your .env file.');
    }

    // Load Azure Maps SDK
    this.loadPromise = this._loadAzureMaps();
    return this.loadPromise;
  }

  async _loadAzureMaps() {
    return new Promise((resolve, reject) => {
      // Load CSS first
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.css';
      document.head.appendChild(cssLink);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.js';
      script.async = true;
      
      script.onload = () => {
        if (window.atlas) {
          this.atlas = window.atlas;
          this.isLoaded = true;
          console.log('Azure Maps API loaded successfully');
          resolve(this.atlas);
        } else {
          reject(new Error('Azure Maps failed to initialize'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Azure Maps API script'));
      };

      document.head.appendChild(script);
    });
  }

  isApiLoaded() {
    return this.isLoaded && this.atlas;
  }

  getAtlas() {
    return this.atlas;
  }

  getSubscriptionKey() {
    return import.meta.env.VITE_AZURE_MAPS_KEY;
  }

  getClientId() {
    return import.meta.env.VITE_AZURE_MAPS_CLIENT_ID;
  }
}

// Export singleton instance
const azureMapsService = new AzureMapsService();
export default azureMapsService;
