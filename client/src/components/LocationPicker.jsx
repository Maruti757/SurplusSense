// LocationPicker.jsx - Fixed version with proper null handling
import { useState, useEffect } from 'react';
import MapView from './MapView';

const LocationPicker = ({ value, onChange, label = 'Select Location' }) => {
  const [location, setLocation] = useState(value || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Update internal state when prop changes
  useEffect(() => {
    setLocation(value || null);
  }, [value]);

  const handleMapChange = (newLocation) => {
    setLocation(newLocation);
    if (onChange) {
      onChange(newLocation);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result) => {
    const newLocation = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      fullAddress: result.display_name,
      street: result.address?.road || '',
      city: result.address?.city || result.address?.town || result.address?.village || '',
      state: result.address?.state || '',
      zipCode: result.address?.postcode || ''
    };
    
    setLocation(newLocation);
    setSearchQuery('');
    setSearchResults([]);
    
    if (onChange) {
      onChange(newLocation);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          const newLocation = {
            lat: latitude,
            lng: longitude,
            fullAddress: data.display_name || `${latitude}, ${longitude}`,
            street: data.address?.road || '',
            city: data.address?.city || data.address?.town || data.address?.village || '',
            state: data.address?.state || '',
            zipCode: data.address?.postcode || ''
          };
          
          setLocation(newLocation);
          if (onChange) {
            onChange(newLocation);
          }
        } catch (error) {
          console.error('Error getting address:', error);
          
          const newLocation = {
            lat: latitude,
            lng: longitude,
            fullAddress: `${latitude}, ${longitude}`
          };
          
          setLocation(newLocation);
          if (onChange) {
            onChange(newLocation);
          }
        }
      },
      (error) => {
        alert('Unable to get your location: ' + error.message);
      }
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a location..."
            style={{ flex: 1, padding: '0.5rem' }}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            onClick={handleSearch} 
            className="btn btn-primary"
            disabled={isSearching}
            style={{ padding: '0.5rem 1rem' }}
          >
            {isSearching ? '...' : 'Search'}
          </button>
        </div>
        
        <button 
          onClick={handleUseCurrentLocation}
          className="btn"
          style={{ 
            width: '100%', 
            padding: '0.5rem',
            background: 'rgba(63, 57, 221, 0.1)',
            border: '1px solid var(--success)',
            color: 'var(--success)'
          }}
        >
          📍 Use My Current Location
        </button>
      </div>

      {searchResults.length > 0 && (
        <div style={{ 
          marginBottom: '1rem', 
          border: '1px solid #1e1515ff', 
          borderRadius: '4px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {searchResults.map((result, index) => (
            <div
              key={index}
              onClick={() => handleSelectResult(result)}
              style={{
                padding: '0.75rem',
                borderBottom: index < searchResults.length - 1 ? '1px solid #090909ff' : 'none',
                cursor: 'pointer',
                
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2b2020ff'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(56, 36, 36, 0.8)'}
            >
              {result.display_name}
            </div>
          ))}
        </div>
      )}

      <MapView 
        location={location}
        onLocationChange={handleMapChange}
        height="300px"
      />
    </div>
  );
};

export default LocationPicker;