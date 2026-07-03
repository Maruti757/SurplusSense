// OpenStreetMap + Nominatim Geocoding Service
// Completely FREE - No API key required

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

export const searchPlaces = async (query) => {
  if (!query || query.length < 3) return [];
  
  try {
    const url = `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FoodShare/1.0'
      }
    });
    
    const data = await response.json();
    
    return data.map(item => ({
      id: item.place_id,
      title: item.display_name,
      address: item.display_name,
      city: item.address?.city || item.address?.town || item.address?.village || '',
      state: item.address?.state || '',
      country: item.address?.country || '',
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      landmark: item.address?.road || ''
    }));
  } catch (error) {
    console.error('OSM search error:', error);
    return [];
  }
};

export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true }
    );
  });
};

export const reverseGeocode = async (lat, lng) => {
  try {
    const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FoodShare/1.0'
      }
    });
    
    const data = await response.json();
    
    if (data) {
      return {
        address: data.display_name,
        city: data.address?.city || data.address?.town || data.address?.village || '',
        state: data.address?.state || '',
        country: data.address?.country || '',
        landmark: data.address?.road || ''
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
};

export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(2);
};

export const getRouteInfo = async (fromLat, fromLng, toLat, toLng) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&steps=true`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance: (route.distance / 1000).toFixed(2),
        duration: Math.round(route.duration / 60),
        geometry: route.geometry
      };
    }
    return null;
  } catch (error) {
    console.error('Route calculation error:', error);
    return null;
  }
};

export default { searchPlaces, getCurrentLocation, reverseGeocode, calculateDistance, getRouteInfo };
