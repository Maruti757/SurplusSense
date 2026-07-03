/**
 * Distance Calculator Module
 * Calculates distance and travel time between two locations
 * Uses Haversine formula for distance and estimates travel time
 */

// Average speeds in km/h for different transport modes
const SPEEDS = {
  car: 40,      // Average city speed for car
  bike: 25,     // Average speed for bike/scooter
  walk: 5       // Average walking speed
};

// Calculate distance using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

const toRad = (deg) => {
  return deg * (Math.PI / 180);
};

// Calculate travel time based on distance and transport mode
const calculateTravelTime = (distance, mode) => {
  const speed = SPEEDS[mode] || SPEEDS.car;
  const hours = distance / speed;
  let minutes = Math.round(hours * 60);
  if (minutes < 1) {
    minutes = 1;
  }
  
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
  }
};

// Get all transport options with distance and time
const getRouteInfo = (fromLat, fromLng, toLat, toLng) => {
  const distance = calculateDistance(fromLat, fromLng, toLat, toLng);
  
  // Round distance to 1 decimal place
  const roundedDistance = Math.round(distance * 10) / 10;
  
  return {
    distance: roundedDistance,
    distanceText: roundedDistance < 1 
      ? `${Math.round(roundedDistance * 1000)} m` 
      : `${roundedDistance} km`,
    transports: {
      car: {
        mode: 'car',
        icon: '🚗',
        label: 'Car',
        time: calculateTravelTime(distance, 'car'),
        price: roundedDistance > 5 ? Math.round(roundedDistance * 2) : 0
      },
      bike: {
        mode: 'bike',
        icon: '🏍️',
        label: 'Bike',
        time: calculateTravelTime(distance, 'bike'),
        price: roundedDistance > 3 ? Math.round(roundedDistance * 1.5) : 0
      },
      walk: {
        mode: 'walk',
        icon: '🚶',
        label: 'Walk',
        time: calculateTravelTime(distance, 'walk'),
        price: 0
      }
    },
    // Estimate coordinates for polyline (simplified)
    route: {
      start: { lat: fromLat, lng: fromLng },
      end: { lat: toLat, lng: toLng }
    }
  };
};

// Format address for display
const formatAddress = (address) => {
  if (!address) return '';
  
  const parts = [
    address.street,
    address.city,
    address.state,
    address.zipCode
  ].filter(Boolean);
  
  return parts.join(', ');
};

module.exports = {
  calculateDistance,
  calculateTravelTime,
  getRouteInfo,
  formatAddress,
  SPEEDS
};
