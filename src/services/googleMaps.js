import { Loader } from '@googlemaps/js-api-loader';

class GoogleMapsService {
  constructor() {
    this.isLoaded = false;
    this.loader = null;
    this.google = null;
  }

  async initialize() {
    if (this.isLoaded && this.google) {
      return this.google;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      throw new Error('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file.');
    }


    try {
      this.loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places', 'geometry', 'drawing', 'visualization']
      });

      this.google = await this.loader.load();
      this.isLoaded = true;
      
      console.log('Google Maps API loaded successfully');
      return this.google;
    } catch (error) {
      console.error('Error loading Google Maps API:', error);
      throw error;
    }
  }

  isApiLoaded() {
    return this.isLoaded && this.google;
  }

  getGoogle() {
    return this.google;
  }
}

// Export singleton instance
export const googleMapsService = new GoogleMapsService();
export default googleMapsService;