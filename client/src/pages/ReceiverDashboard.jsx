import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import LocationPicker from '../components/LocationPicker';

const ReceiverSidebar = () => {
  const { notifications } = useSocket();
  
  return (
    <div className="sidebar">
      <ul className="sidebar-menu">
        <li><Link to="/receiver">Dashboard</Link></li>
        <li><Link to="/receiver/available">Available Donations</Link></li>
        <li><Link to="/receiver/history">My Accepted</Link></li>
        <li><Link to="/receiver/notifications">Notifications {notifications.length > 0 && `(${notifications.length})`}</Link></li>
        <li><Link to="/receiver/profile">My Profile</Link></li>
      </ul>
    </div>
  );
};

const ReceiverHome = () => {
  const { user } = useAuth();
  const [availableCount, setAvailableCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const available = await axios.get('/api/receiver/available');
      setAvailableCount(available.data.donations.length);
      
      const history = await axios.get('/api/receiver/history');
      setAcceptedCount(history.data.donations.length);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Welcome 🙏, {user?.name}!</h2>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{availableCount}</div>
          <div className="stat-label">Available Donations</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{acceptedCount}</div>
          <div className="stat-label">Accepted Donations</div>
        </div>
      </div>

      <div className="grid grid-3">
        <Link to="/receiver/available" className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍲</div>
          <h3>Browse Available</h3>
          <p style={{ color: 'var(--text-secondary)' }}>View all available food donations</p>
        </Link>
        
        <Link to="/receiver/history" className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h3>My Accepted</h3>
          <p style={{ color: 'var(--text-secondary)' }}>View your accepted donations</p>
        </Link>
        
        <Link to="/receiver/notifications" className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔔</div>
          <h3>Notifications</h3>
          <p style={{ color: 'var(--text-secondary)' }}>View all notifications</p>
        </Link>
      </div>
    </div>
  );
};

// Route Display Component - Shows distance and time like Zomato/Swiggy
const RouteDisplay = ({ distance, onShowRoute }) => {
  if (!distance) return null;

  const { transports, distanceText } = distance;

  return (
    <div style={{ 
      marginTop: '1rem', 
      padding: '1rem', 
      background: 'linear-gradient(135deg, #100d0dff 0%, #8f4e4eff 100%)', 
      borderRadius: '12px',
      border: '1px solid #060606ff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>📍 {distanceText}</span>
        </div>
        <button 
          onClick={onShowRoute}
          style={{
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            padding: '0.4rem 0.8rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          🗺️ Route
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {Object.values(transports).map((transport) => (
          <div 
            key={transport.mode}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.4rem 0.6rem',
              background:'black',
              borderRadius: '8px',
              fontSize: '0.85rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{transport.icon}</span>
            <span style={{ fontWeight: '500' }}>{transport.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Map Modal Component
const MapModal = ({ show, onClose, routeInfo, donorAddress, donorName }) => {
  if (!show || !routeInfo) return null;

  // Create a simple static map URL with route
  const getStaticMapUrl = () => {
    const { route } = routeInfo;
    const centerLat = (route.start.lat + route.end.lat) / 2;
    const centerLng = (route.start.lng + route.end.lng) / 2;
    const latDelta = Math.abs(route.start.lat - route.end.lat) * 1.5;
    const lngDelta = Math.abs(route.start.lng - route.end.lng) * 1.5;
    
    // Using OpenStreetMap static
    return `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng - lngDelta}%2C${centerLat - latDelta}%2C${centerLng + lngDelta}%2C${centerLat + latDelta}&layer=mapnik&marker=${route.start.lat}%2C${route.start.lng}&marker=${route.end.lat}%2C${route.end.lng}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>🗺️ Route to Donor</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {donorName && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f5f5f5', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontWeight: '600' }}>{donorName}</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>{donorAddress}</p>
          </div>
        )}

        <div style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
          <iframe
            title="Route Map"
            width="100%"
            height="300"
            frameBorder="0"
            scrolling="no"
            src={getStaticMapUrl()}
            style={{ display: 'block' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {Object.values(routeInfo.transports).map((t) => (
            <div 
              key={t.mode}
              style={{
                flex: '1 1 120px',
                padding: '0.75rem',
                background: '#f5f5f5',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{t.icon}</div>
              <div style={{ fontWeight: '600' }}>{t.label}</div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>{t.time}</div>
              {t.price > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#888' }}>~₹{t.price}</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <a 
            href={`https://www.google.com/maps/dir/?api=1&origin=&destination=${routeInfo.route.end.lat},${routeInfo.route.end.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ display: 'inline-block', textDecoration: 'none' }}
          >
            📱 Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  );
};

const AvailableDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [accepting, setAccepting] = useState(null);
  const [success, setSuccess] = useState(null);
  const [acceptedPickupId, setAcceptedPickupId] = useState(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const response = await axios.get('/api/receiver/available');
      setDonations(response.data.donations);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (donationId) => {
    setAccepting(donationId);
    try {
      const response = await axios.post(`/api/receiver/accept/${donationId}`);
      setSuccess({
        message: `Successfully accepted! Show this Pickup ID to the donor when you go for pickup.`,
        pickupId: response.data.pickupId,
        foodName: response.data.donation.foodName
      });
      setAcceptedPickupId(response.data.pickupId);
      fetchDonations();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to accept donation');
    } finally {
      setAccepting(null);
    }
  };

  const handleShowRoute = async (donationId) => {
    try {
      const response = await axios.get(`/api/receiver/route/${donationId}`);
      
      // Check if there's an error in the response (new format: 200 with error object)
      if (response.data.error) {
        const { code, message } = response.data.error;
        
        if (code === 'RECEIVER_LOCATION_MISSING') {
          alert('Your location is not set. Please update your profile with your address and location.');
        } else if (code === 'DONOR_LOCATION_MISSING') {
          alert('Donor location is not available. They may not have set their pickup location.');
        } else {
          alert(message || 'Could not load route. Please try again later.');
        }
        return;
      }
      
      // Success - route is available
      setRouteInfo(response.data.route);
      setSelectedRoute(donationId);
      setShowRouteModal(true);
    } catch (error) {
      console.error('Error fetching route:', error);
      alert('Could not load route. Please try again later.');
    }
  };

  const cookedDonations   = donations.filter(d => d.foodType === 'cooked');
  const packagedDonations = donations.filter(d => d.foodType !== 'cooked');


  return (
    <div>
      <div className="page-header">
        <h2>Available Donations</h2>
      </div>

      {success && (
        <div style={{ 
          padding: '1.5rem', 
          background: 'linear-gradient(135deg, #FF6F00 0%, #FF8F00 100%)', 
          borderRadius: '12px', 
          color: 'white', 
          marginBottom: '1.5rem',
          boxShadow: '0 4px 15px rgba(255, 111, 0, 0.3)'
        }}>
          <h3 style={{ marginBottom: '0.5rem' }}>🎉 Accepted Successfully!</h3>
          <p style={{ marginBottom: '1rem' }}>{success.message}</p>
          <div style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '1rem', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '0.25rem', opacity: 0.9 }}>Your Pickup ID (Show to Donor)</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', letterSpacing: '3px' }}>{success.pickupId}</p>
          </div>
          <p style={{ fontSize: '0.8rem', marginTop: '1rem', opacity: 0.8 }}>
            📧 Confirmation email sent to donor. They will verify your Pickup ID when you go for pickup.
          </p>
          <button 
            onClick={() => setSuccess(null)}
            style={{
              marginTop: '1rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* Filter tabs with live counts */}
      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All ({donations.length})
        </button>
        <button className={`tab ${filter === 'packaged' ? 'active' : ''}`} onClick={() => setFilter('packaged')}>
          📦 Packaged ({packagedDonations.length})
        </button>
        <button className={`tab ${filter === 'cooked' ? 'active' : ''}`} onClick={() => setFilter('cooked')}>
          🍲 Cooked ({cookedDonations.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner"></div></div>
      ) : donations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍽️</div>
          <h3>No donations available</h3>
          <p>Check back later for new donations</p>
        </div>
      ) : (
        <>
          {/* ══ COOKED FOOD SECTION ══ */}
          {(filter === 'all' || filter === 'cooked') && (
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '3px solid #ff9800' }}>
                <span style={{ fontSize: '1.6rem' }}>🍲</span>
                <h3 style={{ margin: 0, color: '#e65100' }}>Cooked Food</h3>
                <span style={{ background: 'linear-gradient(135deg,#ff9800,#e65100)', color: 'white', borderRadius: '20px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: '700' }}>
                  {cookedDonations.length}
                </span>
              </div>
              {cookedDonations.length === 0 ? (
                <p style={{ color: '#aaa', fontStyle: 'italic' }}>No cooked food donations available right now.</p>
              ) : (
                <div className="grid">
                  {cookedDonations.map(donation => (
                    <div key={donation._id} className="card" style={{ borderTop: '4px solid #ff9800', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', background: 'linear-gradient(135deg,#ff9800,#e65100)', color: 'white' }}>🍲 Cooked</div>
                      <div className="card-header" style={{ paddingRight: '90px' }}>
                        <h4 className="card-title">{donation.foodName}</h4>
                        <span className="card-badge badge-pending">Available</span>
                      </div>
                      <div className="donation-meta">
                        <span>🔢 {donation.quantity} {donation.unit}</span>
                        {donation.mealType && <span>🍽️ {donation.mealType}</span>}
                      </div>
                      {donation.preparationTime && (
                        <p style={{ fontSize: '0.85rem', color: '#ff9800', marginTop: '0.5rem' }}>⏰ Prepared: {new Date(donation.preparationTime).toLocaleString()}</p>
                      )}
                      {(donation.address || donation.donorId?.address) && (
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', borderLeft: '3px solid #667eea', paddingLeft: '8px' }}>
                          <p style={{ margin: '2px 0' }}>
                            <strong>📍 Address:</strong> {
                              (donation.address?.street || donation.donorId?.address?.street) ? `${donation.address?.street || donation.donorId?.address?.street}, ` : ''
                            }{
                              donation.address?.city || donation.donorId?.address?.city || ''
                            }{
                              (donation.address?.state || donation.donorId?.address?.state) ? `, ${donation.address?.state || donation.donorId?.address?.state}` : ''
                            }{
                              (donation.address?.zipCode || donation.donorId?.address?.zipCode) ? ` - ${donation.address?.zipCode || donation.donorId?.address?.zipCode}` : ''
                            }
                          </p>
                          {(donation.address?.landmark || donation.donorId?.address?.landmark) && (
                            <p style={{ margin: '2px 0', fontStyle: 'italic' }}>
                              <strong>🏢 Landmark:</strong> {donation.address?.landmark || donation.donorId?.address?.landmark}
                            </p>
                          )}
                        </div>
                      )}
                      {donation.pickupDeadline && <p><strong>Pickup by:</strong> {new Date(donation.pickupDeadline).toLocaleString()}</p>}
                      <RouteDisplay distance={donation.distance} onShowRoute={() => handleShowRoute(donation._id)} />
                      <div style={{ marginTop: '1rem' }}>
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleAccept(donation._id)} disabled={accepting === donation._id}>
                          {accepting === donation._id ? 'Accepting...' : 'Accept'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ PACKAGED FOOD SECTION ══ */}
          {(filter === 'all' || filter === 'packaged') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '3px solid #4caf50' }}>
                <span style={{ fontSize: '1.6rem' }}>📦</span>
                <h3 style={{ margin: 0, color: '#1b5e20' }}>Packaged Food</h3>
                <span style={{ background: 'linear-gradient(135deg,#4caf50,#1b5e20)', color: 'white', borderRadius: '20px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: '700' }}>
                  {packagedDonations.length}
                </span>
              </div>
              {packagedDonations.length === 0 ? (
                <p style={{ color: '#aaa', fontStyle: 'italic' }}>No packaged food donations available right now.</p>
              ) : (
                <div className="grid">
                  {packagedDonations.map(donation => (
                    <div key={donation._id} className="card" style={{ borderTop: '4px solid #4caf50', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', background: 'linear-gradient(135deg,#4caf50,#1b5e20)', color: 'white' }}>📦 Packaged</div>
                      <div className="card-header" style={{ paddingRight: '90px' }}>
                        <h4 className="card-title">{donation.foodName}</h4>
                        <span className="card-badge badge-pending">Available</span>
                      </div>
                      <div className="donation-meta">
                        <span>🔢 {donation.quantity} {donation.unit}</span>
                        {donation.brandName && <span>🏷️ {donation.brandName}</span>}
                      </div>
                      {donation.expiryDate && (
                        <p style={{ fontSize: '0.85rem', color: '#4caf50', marginTop: '0.5rem' }}>📅 Expires: {new Date(donation.expiryDate).toLocaleDateString()}</p>
                      )}
                      {(donation.address || donation.donorId?.address) && (
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', borderLeft: '3px solid #4caf50', paddingLeft: '8px' }}>
                          <p style={{ margin: '2px 0' }}>
                            <strong>📍 Address:</strong> {
                              (donation.address?.street || donation.donorId?.address?.street) ? `${donation.address?.street || donation.donorId?.address?.street}, ` : ''
                            }{
                              donation.address?.city || donation.donorId?.address?.city || ''
                            }{
                              (donation.address?.state || donation.donorId?.address?.state) ? `, ${donation.address?.state || donation.donorId?.address?.state}` : ''
                            }{
                              (donation.address?.zipCode || donation.donorId?.address?.zipCode) ? ` - ${donation.address?.zipCode || donation.donorId?.address?.zipCode}` : ''
                            }
                          </p>
                          {(donation.address?.landmark || donation.donorId?.address?.landmark) && (
                            <p style={{ margin: '2px 0', fontStyle: 'italic' }}>
                              <strong>🏢 Landmark:</strong> {donation.address?.landmark || donation.donorId?.address?.landmark}
                            </p>
                          )}
                        </div>
                      )}
                      {donation.pickupDeadline && <p><strong>Pickup by:</strong> {new Date(donation.pickupDeadline).toLocaleString()}</p>}
                      <RouteDisplay distance={donation.distance} onShowRoute={() => handleShowRoute(donation._id)} />
                      <div style={{ marginTop: '1rem' }}>
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleAccept(donation._id)} disabled={accepting === donation._id}>
                          {accepting === donation._id ? 'Accepting...' : 'Accept'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Route Modal */}
      <MapModal 
        show={showRouteModal} 
        onClose={() => setShowRouteModal(false)}
        routeInfo={routeInfo}
        donorAddress={routeInfo?.donorAddress}
        donorName={routeInfo?.donorName}
      />
    </div>
  );
};

const AcceptedDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const response = await axios.get('/api/receiver/history');
      setDonations(response.data.donations);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowRoute = async (donationId) => {
    try {
      const response = await axios.get(`/api/receiver/route/${donationId}`);
      
      // Check if there's an error in the response (new format: 200 with error object)
      if (response.data.error) {
        const { code, message } = response.data.error;
        
        if (code === 'RECEIVER_LOCATION_MISSING') {
          alert('Your location is not set. Please update your profile with your address and location.');
        } else if (code === 'DONOR_LOCATION_MISSING') {
          alert('Donor location is not available.');
        } else {
          alert(message || 'Could not load route. Please try again later.');
        }
        return;
      }
      
      // Success - route is available
      setRouteInfo(response.data.route);
      setShowRouteModal(true);
    } catch (error) {
      console.error('Error fetching route:', error);
      alert('Could not load route. Please try again later.');
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>My Accepted Donations</h2>
      
      <div style={{ 
        padding: '1rem', 
        background: 'rgba(255, 111, 0, 0.1)', 
        borderRadius: '8px', 
        marginBottom: '1.5rem',
        border: '1px solid var(--accent)'
      }}>
        <h4 style={{ marginBottom: '0.5rem' }}>ℹ️ How Pickup Works</h4>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <li>When you accept a donation, you receive a unique Pickup ID</li>
          <li>Go to the donor's location with your Pickup ID</li>
          <li>The donor will verify your Pickup ID to confirm the pickup</li>
          <li>After verification, a thank you email will be sent to the donor</li>
        </ol>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner"></div>
        </div>
      ) : donations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No accepted donations</h3>
          <p>Accept donations to see them here</p>
          <Link to="/receiver/available" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Browse Available
          </Link>
        </div>
      ) : (
        <div className="grid">
          {donations.map(donation => (
            <div key={donation._id} className="card">
              <div className="card-header">
                <h4 className="card-title">{donation.foodName}</h4>
                <span className={`card-badge badge-${donation.status === 'accepted' ? 'accepted' : 'picked'}`}>
                  {donation.status === 'picked_up' ? 'Completed' : donation.status}
                </span>
              </div>
              
              <div className="donation-meta">
                <span>📦 {donation.quantity} {donation.unit}</span>
                <span>🍽️ {donation.foodType}</span>
              </div>
              
              {donation.status === 'accepted' && donation.pickupId && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  background: 'linear-gradient(135deg, #FF6F00 0%, #FF8F00 100%)',
                  borderRadius: '8px',
                  color: 'white',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '0.25rem' }}>Your Pickup ID</p>
                  <p style={{ fontSize: '1.8rem', fontWeight: '700', letterSpacing: '3px', margin: 0 }}>{donation.pickupId}</p>
                  <p style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.5rem' }}>Show this to the donor</p>
                </div>
              )}
              
              {donation.status === 'picked_up' && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  background: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid var(--success)',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '1.2rem', margin: 0 }}>✅ Pickup Completed!</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--success)' }}>Thank you email sent to donor</p>
                </div>
              )}
              
              {donation.donorId && (
                <div style={{ marginTop: '1rem' }}>
                  <p><strong>Donor:</strong> {donation.donorId.organizationName}</p>
                  <p><strong>Contact:</strong> {donation.donorId.phone}</p>
                  {donation.donorId.address && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', borderLeft: '3px solid #667eea', paddingLeft: '8px' }}>
                      <p style={{ margin: '2px 0' }}>
                        <strong>📍 Address:</strong> {donation.donorId.address.street ? `${donation.donorId.address.street}, ` : ''}{donation.donorId.address.city || ''}{donation.donorId.address.state ? `, ${donation.donorId.address.state}` : ''}{donation.donorId.address.zipCode ? ` - ${donation.donorId.address.zipCode}` : ''}
                      </p>
                      {donation.donorId.address.landmark && (
                        <p style={{ margin: '2px 0', fontStyle: 'italic' }}>
                          <strong>🏢 Landmark:</strong> {donation.donorId.address.landmark}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {donation.status === 'accepted' && (
                    <button 
                      onClick={() => handleShowRoute(donation._id)}
                      style={{
                        marginTop: '0.5rem',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      🗺️ Show Route
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Route Modal */}
      <MapModal 
        show={showRouteModal} 
        onClose={() => setShowRouteModal(false)}
        routeInfo={routeInfo}
        donorAddress={routeInfo?.donorAddress}
        donorName={routeInfo?.donorName}
      />
    </div>
  );
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/receiver/notifications');
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`/api/receiver/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Notifications</h2>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <h3>No notifications</h3>
          <p>You're all caught up!</p>
        </div>
      ) : (
        <div className="grid">
          {notifications.map(notification => (
            <div 
              key={notification._id} 
              className="card"
              style={{ opacity: notification.isRead ? 0.7 : 1 }}
            >
              <div className="card-header">
                <span className="card-badge badge-pending">
                  {notification.type === 'new_donation' ? 'New Donation' : notification.type}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {new Date(notification.createdAt).toLocaleString()}
                </span>
              </div>
              <p>{notification.message}</p>
              {!notification.isRead && (
                <button 
                  className="btn" 
                  style={{ marginTop: '1rem' }}
                  onClick={() => markAsRead(notification._id)}
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ReceiverProfile = () => {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    organizationName: user?.organizationName || '',
    organizationType: user?.organizationType || '',
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    landmark: user?.address?.landmark || '',
    lat: user?.address?.location?.lat || '',
    lng: user?.address?.location?.lng || ''
  });

  // Initialize location from user data
  useEffect(() => {
    if (user?.address?.location) {
      setLocation({
        lat: user.address.location.lat,
        lng: user.address.location.lng,
        fullAddress: `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''}`
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocationChange = (loc) => {
    console.log('Location changed:', loc);
    setLocation(loc);
    setFormData(prev => ({
      ...prev,
      street: loc.street || prev.street,
      city: loc.city || prev.city,
      state: loc.state || prev.state,
      zipCode: loc.zipCode || prev.zipCode,
      landmark: loc.landmark || prev.landmark,
      lat: loc.lat || '',
      lng: loc.lng || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.put('/api/auth/profile', formData);
      setUser(response.data.user);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const hasLocation = user?.address?.location?.lat && user?.address?.location?.lng;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>My Profile</h2>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="btn btn-primary"
          >
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {success && (
        <div style={{ padding: '1rem', background: 'rgba(76, 175, 80, 0.1)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--success)', marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(244, 67, 54, 0.1)', border: '1px solid var(--error)', borderRadius: '8px', color: 'var(--error)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {!hasLocation && !isEditing && (
        <div style={{ 
          padding: '1rem', 
          background: 'rgba(255, 111, 0, 0.1)', 
          border: '1px solid var(--accent)', 
          borderRadius: '8px', 
          marginBottom: '1.5rem' 
        }}>
          <p style={{ margin: 0, color: 'var(--accent)', fontWeight: '500' }}>
            ⚠️ Your location is not set! Click "Edit Profile" below to add your address and location.
            This is required to see routes to food donations.
          </p>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem' }}>
            {user?.name?.charAt(0)}
          </div>
          <div>
            <h3>{user?.name}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{user?.organizationName}</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>ID: {user?.uniqueId}</p>
          </div>
        </div>

        {!isEditing ? (
          // Display Mode
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={user?.email} disabled />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" value={user?.phone} disabled />
              </div>
            </div>

            <div className="form-group">
              <label>Organization Type</label>
              <input type="text" value={user?.organizationType} disabled />
            </div>

            <div className="form-group">
              <label>Address</label>
              <textarea 
                value={user?.address ? `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''} ${user.address.zipCode || ''}` : 'Not set'} 
                disabled 
              />
            </div>

            {user?.address?.landmark && (
              <div className="form-group">
                <label>Landmark</label>
                <input 
                  type="text" 
                  value={user.address.landmark} 
                  disabled 
                />
              </div>
            )}

            {hasLocation && (
              <div className="form-group">
                <label>📍 Location</label>
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'rgba(76, 175, 80, 0.1)', 
                  borderRadius: '8px',
                  border: '1px solid var(--success)'
                }}>
                  ✅ Location set ({user.address.location.lat.toFixed(4)}, {user.address.location.lng.toFixed(4)})
                </div>
              </div>
            )}
          </>
        ) : (
          // Edit Mode
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Organization Name</label>
                <input 
                  type="text" 
                  name="organizationName" 
                  value={formData.organizationName} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Organization Type</label>
                <input type="text" value={formData.organizationType} disabled />
              </div>
            </div>

            {/* LocationPicker only shown in edit mode */}
            {isEditing && (
              <div className="form-group">
                <label>📍 Your Location (Required for route features)</label>
                <LocationPicker 
                  value={location} 
                  onChange={handleLocationChange}
                  label="Select Your Location"
                />
                {location && location.fullAddress && (
                  <div style={{ 
                    marginTop: '0.75rem', 
                    padding: '0.75rem', 
                    background: 'rgba(76, 175, 80, 0.1)', 
                    borderRadius: '8px',
                    border: '1px solid var(--success)'
                  }}>
                    ✅ Location confirmed: {location.fullAddress}
                  </div>
                )}
              </div>
            )}

            {isEditing && location && (
              <div style={{ marginTop: '1.5rem', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label>Street Address <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="text" 
                      name="street" 
                      value={formData.street} 
                      onChange={handleChange} 
                      placeholder="House No, Building, Street Name"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Landmark <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="text" 
                      name="landmark" 
                      value={formData.landmark} 
                      onChange={handleChange} 
                      placeholder="e.g. Near City Mall"
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label>City <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="text" 
                      name="city" 
                      value={formData.city} 
                      onChange={handleChange} 
                      placeholder="City"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>State <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="text" 
                      name="state" 
                      value={formData.state} 
                      onChange={handleChange} 
                      placeholder="State"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Zip Code <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="text" 
                      name="zipCode" 
                      value={formData.zipCode} 
                      onChange={handleChange} 
                      placeholder="Zip Code"
                      required 
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : '💾 Save Changes'}
              </button>
              <button 
                type="button" 
                className="btn"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: user?.name || '',
                    phone: user?.phone || '',
                    organizationName: user?.organizationName || '',
                    organizationType: user?.organizationType || '',
                    street: user?.address?.street || '',
                    city: user?.address?.city || '',
                    state: user?.address?.state || '',
                    zipCode: user?.address?.zipCode || '',
                    landmark: user?.address?.landmark || '',
                    lat: user?.address?.location?.lat || '',
                    lng: user?.address?.location?.lng || ''
                  });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const ReceiverDashboard = () => {
  return (
    <div className="dashboard">
      <ReceiverSidebar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<ReceiverHome />} />
          <Route path="/available" element={<AvailableDonations />} />
          <Route path="/history" element={<AcceptedDonations />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<ReceiverProfile />} />
        </Routes>
      </div>
    </div>
  );
};

export default ReceiverDashboard;