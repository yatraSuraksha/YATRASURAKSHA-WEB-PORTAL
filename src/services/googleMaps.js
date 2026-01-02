class GoogleMapsService {
  constructor() {
    this.isLoaded = false;
    this.google = null;
    this.loadPromise = null;
  }

  async initialize() {
    // Return cached promise if already loading
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Return if already loaded
    if (this.isLoaded && this.google) {
      return this.google;
    }

    // Check if Google Maps is already loaded globally (from script tag)
    if (window.google && window.google.maps) {
      this.google = window.google;
      this.isLoaded = true;
      console.log('Google Maps API already loaded globally');
      return this.google;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      throw new Error('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file.');
    }

    // Load via script tag (like production)
    this.loadPromise = new Promise((resolve, reject) => {
      // Check again in case it loaded while we were setting up
      if (window.google && window.google.maps) {
        this.google = window.google;
        this.isLoaded = true;
        resolve(this.google);
        return;
      }

      // Create callback function
      const callbackName = 'googleMapsCallback_' + Date.now();
      window[callbackName] = () => {
        this.google = window.google;
        this.isLoaded = true;
        console.log('Google Maps API loaded successfully via script tag');
        delete window[callbackName];
        resolve(this.google);
      };

      // Create script tag
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,drawing,visualization&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        delete window[callbackName];
        reject(new Error('Failed to load Google Maps API script'));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  isApiLoaded() {
    return this.isLoaded && this.google;
  }

  getGoogle() {
    return this.google;
  }
}

// Export singleton instance
const googleMapsService = new GoogleMapsService();
export default googleMapsService;