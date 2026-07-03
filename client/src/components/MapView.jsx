// MapView.jsx - Fixed version with proper null checks and initialization
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with webpack/vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapView = ({ location, onLocationChange, readOnly = false, height = '300px' }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(location);

  // Update current location when prop changes
  useEffect(() => {
    setCurrentLocation(location);
  }, [location]);

  // Initialize map only once
  useEffect(() => {
    // Don't initialize if map container doesn't exist or map is already initialized
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      // Default coordinates (center of India if no location provided)
      const defaultLat = 20.5937;
      const defaultLng = 78.9629;
      
      // Use provided location or default
      const initialLat = currentLocation?.lat ?? defaultLat;
      const initialLng = currentLocation?.lng ?? defaultLng;

      // Create map instance
      const map = L.map(mapRef.current).setView([initialLat, initialLng], 13);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Store map instance
      mapInstanceRef.current = map;
      
      // Add marker if location exists
      if (currentLocation?.lat && currentLocation?.lng) {
        const marker = L.marker([currentLocation.lat, currentLocation.lng], {
          draggable: !readOnly
        }).addTo(map);
        
        markerRef.current = marker;

        // Handle marker drag events
        if (!readOnly) {
          marker.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng();
            const newLocation = { 
              lat, 
              lng,
              fullAddress: currentLocation?.fullAddress || 'Selected location'
            };
            
            // Reverse geocode to get address
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
              .then(res => res.json())
              .then(data => {
                newLocation.fullAddress = data.display_name || `${lat}, ${lng}`;
                newLocation.street = data.address?.road || '';
                newLocation.city = data.address?.city || data.address?.town || data.address?.village || '';
                newLocation.state = data.address?.state || '';
                newLocation.zipCode = data.address?.postcode || '';
                
                if (onLocationChange) {
                  onLocationChange(newLocation);
                }
                setCurrentLocation(newLocation);
              })
              .catch(() => {
                if (onLocationChange) {
                  onLocationChange(newLocation);
                }
                setCurrentLocation(newLocation);
              });
          });
        }
      }

      // Add click listener for read-write mode
      if (!readOnly) {
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          
          // Remove existing marker if any
          if (markerRef.current) {
            map.removeLayer(markerRef.current);
          }

          // Add new marker
          const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
          markerRef.current = marker;

          const newLocation = { lat, lng };

          // Reverse geocode
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(res => res.json())
            .then(data => {
              newLocation.fullAddress = data.display_name || `${lat}, ${lng}`;
              newLocation.street = data.address?.road || '';
              newLocation.city = data.address?.city || data.address?.town || data.address?.village || '';
              newLocation.state = data.address?.state || '';
              newLocation.zipCode = data.address?.postcode || '';
              
              if (onLocationChange) {
                onLocationChange(newLocation);
              }
              setCurrentLocation(newLocation);
            })
            .catch(() => {
              if (onLocationChange) {
                onLocationChange(newLocation);
              }
              setCurrentLocation(newLocation);
            });

          // Handle marker drag
          marker.on('dragend', (dragEvent) => {
            const { lat: newLat, lng: newLng } = dragEvent.target.getLatLng();
            const draggedLocation = { lat: newLat, lng: newLng };
            
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`)
              .then(res => res.json())
              .then(data => {
                draggedLocation.fullAddress = data.display_name || `${newLat}, ${newLng}`;
                draggedLocation.street = data.address?.road || '';
                draggedLocation.city = data.address?.city || data.address?.town || data.address?.village || '';
                draggedLocation.state = data.address?.state || '';
                draggedLocation.zipCode = data.address?.postcode || '';
                
                if (onLocationChange) {
                  onLocationChange(draggedLocation);
                }
                setCurrentLocation(draggedLocation);
              })
              .catch(() => {
                if (onLocationChange) {
                  onLocationChange(draggedLocation);
                }
                setCurrentLocation(draggedLocation);
              });
          });
        });
      }

      setIsMapInitialized(true);

    } catch (error) {
      console.error('Error initializing map:', error);
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        setIsMapInitialized(false);
      }
    };
  }, []); // Empty dependency array - run only once

  // Update marker when location prop changes (but not on every render)
  useEffect(() => {
    if (!mapInstanceRef.current || !currentLocation?.lat || !currentLocation?.lng) return;

    try {
      const map = mapInstanceRef.current;
      const { lat, lng } = currentLocation;

      // Remove existing marker
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }

      // Add new marker
      const marker = L.marker([lat, lng], {
        draggable: !readOnly
      }).addTo(map);
      
      markerRef.current = marker;
      
      // Center map on new location
      map.setView([lat, lng], 13);

    } catch (error) {
      console.error('Error updating marker:', error);
    }
  }, [currentLocation?.lat, currentLocation?.lng, readOnly]);

  // Handle map container not found
  if (!mapRef.current && isMapInitialized) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
      <p>Loading map...</p>
    </div>;
  }

  return (
    <div>
      <div 
        ref={mapRef} 
        style={{ 
          height, 
          width: '100%', 
          borderRadius: '8px',
          border: '1px solid #ddd'
        }} 
      />
      {currentLocation?.fullAddress && (
        <div style={{ 
          marginTop: '0.5rem', 
          padding: '0.5rem', 
          background: 'rgb(11, 15, 32)', 
          borderRadius: '4px',
          fontSize: '0.9rem'
        }}>
          📍 {currentLocation.fullAddress}
        </div>
      )}
    </div>
  );
};

export default MapView;