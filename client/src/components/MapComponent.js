// Map Component using Leaflet + OpenStreetMap
// Completely FREE - No API key required

import { useState, useEffect } from 'react';
import MapView from './MapView';
import { getRouteInfo, calculateDistance } from '../utils/osmGeocoding';

const MapComponent = ({ 
  donorLocation, 
  receiverLocation, 
  showRoute = true,
  onRouteInfo = null 
}) => {
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (showRoute && donorLocation && receiverLocation) {
      fetchRoute();
    }
  }, [donorLocation, receiverLocation, showRoute]);

  const fetchRoute = async () => {
    if (!donorLocation || !receiverLocation) return;
    
    setIsLoading(true);
    try {
      const route = await getRouteInfo(
        receiverLocation.lat, 
        receiverLocation.lng,
        donorLocation.lat, 
        donorLocation.lng
      );

      if (route && route.geometry) {
        const coords = decodePolyline(route.geometry.coordinates);
        setRouteCoordinates(coords);
        
        const info = {
          distance: `${route.distance} km`,
          duration: `${route.duration} min`,
          distanceValue: parseFloat(route.distance) * 1000,
          durationValue: route.duration * 60
        };
        setRouteInfo(info);
        
        if (onRouteInfo) {
          onRouteInfo(info);
        }
      } else {
        const dist = calculateDistance(
          receiverLocation.lat, 
          receiverLocation.lng,
          donorLocation.lat, 
          donorLocation.lng
        );
        
        const info = {
          distance: `${dist} km`,
          duration: 'Calculating...',
          distanceValue: parseFloat(dist) * 1000,
          durationValue: 0
        };
        setRouteInfo(info);
        
        if (onRouteInfo) {
          onRouteInfo(info);
        }
      }
    } catch (error) {
      console.error('Route calculation error:', error);
      if (donorLocation && receiverLocation) {
        const dist = calculateDistance(
          receiverLocation.lat, receiverLocation.lng,
          donorLocation.lat, donorLocation.lng
        );
        const info = {
          distance: `${dist} km`,
          duration: 'N/A',
          distanceValue: parseFloat(dist) * 1000,
          durationValue: 0
        };
        setRouteInfo(info);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const decodePolyline = (encoded) => {
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push([lat / 1e5, lng / 1e5]);
    }

    return poly;
  };

  const getMarkers = () => {
    const markers = [];
    
    if (donorLocation) {
      markers.push({
        lat: donorLocation.lat,
        lng: donorLocation.lng,
        label: 'D',
        popup: 'Donor Location'
      });
    }
    
    if (receiverLocation) {
      markers.push({
        lat: receiverLocation.lat,
        lng: receiverLocation.lng,
        label: 'R',
        popup: 'Your Location'
      });
    }
    
    return markers;
  };

  const center = receiverLocation || donorLocation || [20.5937, 78.9629];

  return (
    <div>
      {routeInfo && (
        <div style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #2E7D32, #00ACC1)',
          borderRadius: '12px',
          marginBottom: '1rem',
          color: 'white'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.5rem' }}>📍</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{routeInfo.distance}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Distance</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.5rem' }}>⏱️</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{routeInfo.duration}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Est. Time</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center' }}>
            <button
              onClick={fetchRoute}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '20px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          Calculating route...
        </div>
      )}

      <MapView
        center={[center.lat || center[0], center.lng || center[1]]}
        zoom={13}
        markers={getMarkers()}
        routeCoordinates={routeCoordinates}
        height="350px"
      />
    </div>
  );
};

export default MapComponent;

