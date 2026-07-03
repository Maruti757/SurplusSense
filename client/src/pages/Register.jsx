import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LocationPicker from '../components/LocationPicker';

const Register = () => {
  const [activeTab, setActiveTab] = useState('donor');
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    organizationType: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      landmark: '',
      location: {
        lat: null,
        lng: null
      }
    }
  });
  
  const [location, setLocation] = useState(null);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [step, setStep] = useState('register');
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const { register, verifyOTP } = useAuth();
  const navigate = useNavigate();

  const organizationTypes = {
    donor: [
      { value: 'Restaurant', icon: '🍽️', desc: 'Restaurant / Cafe' },
      { value: 'Hotel', icon: '🏨', desc: 'Hotel / Resort' },
      { value: 'Canteen', icon: '🍱', desc: 'Canteen / Cafeteria' },
      { value: 'NGO', icon: '🤝', desc: 'NGO / Non-profit' },
      { value: 'Service Club', icon: '🎯', desc: 'Service Club' },
      { value: 'Orphanage', icon: '🏡', desc: 'Orphanage / Shelter' }
    ],
    receiver: [
      { value: 'NGO', icon: '🤝', desc: 'NGO / Non-profit' },
      { value: 'Orphanage', icon: '🏡', desc: 'Orphanage / Shelter' },
      { value: 'Charity', icon: '❤️', desc: 'Charity Organization' },
      { value: 'Service Club', icon: '🎯', desc: 'Service Club' }
    ]
  };

  useEffect(() => {
    if (formData.password) {
      calculatePasswordStrength(formData.password);
    }
  }, [formData.password]);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]+/)) strength += 25;
    if (password.match(/[A-Z]+/)) strength += 25;
    if (password.match(/[0-9]+/)) strength += 15;
    if (password.match(/[$@#&!]+/)) strength += 10;
    setPasswordStrength(strength);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData({ 
        ...formData, 
        address: { ...formData.address, [field]: value } 
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleLocationChange = (loc) => {
    setLocation(loc);
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        street: loc.street || prev.address.street,
        city: loc.city || prev.address.city,
        state: loc.state || prev.address.state,
        zipCode: loc.zipCode || prev.address.zipCode,
        landmark: loc.landmark || prev.address.landmark,
        location: {
          lat: loc.lat,
          lng: loc.lng
        }
      }
    }));
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const validateStep = () => {
    switch(currentStep) {
      case 1:
        if (!formData.name || !formData.email || !formData.phone) {
          setError('Please fill in all required fields');
          return false;
        }
        if (!/\S+@\S+\.\S+/.test(formData.email)) {
          setError('Please enter a valid email');
          return false;
        }
        if (!/^\d{10}$/.test(formData.phone)) {
          setError('Please enter a valid 10-digit phone number');
          return false;
        }
        break;
      case 2:
        if (!formData.organizationName || !formData.organizationType) {
          setError('Please fill in organization details');
          return false;
        }
        break;
      case 3:
        if (!location) {
          setError('Please select your location on the map');
          return false;
        }
        if (!formData.address.street || !formData.address.landmark || !formData.address.city || !formData.address.state || !formData.address.zipCode) {
          setError('Please fill in all address details including Street Address and Landmark');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        if (passwordStrength < 60) {
          setError('Please choose a stronger password');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep()) return;

    setLoading(true);
    setError('');

    try {
      if (step === 'register') {
        const result = await register({ ...formData, role: activeTab });
        setUserId(result.userId);
        setStep('otp');
      } else {
        const otpString = otp.join('');
        await verifyOTP(userId, otpString);
        navigate(`/login?role=${activeTab}&verified=true`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength < 40) return '#ff4444';
    if (passwordStrength < 60) return '#ffbb33';
    if (passwordStrength < 80) return '#00C851';
    return '#007E33';
  };

  const getStrengthText = () => {
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 60) return 'Fair';
    if (passwordStrength < 80) return 'Good';
    return 'Strong';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #1a1f35 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 20% 50%, rgba(100, 255, 218, 0.1) 0%, transparent 50%)',
        animation: 'pulse 4s ease-in-out infinite'
      }} />
      
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 80% 50%, rgba(138, 43, 226, 0.1) 0%, transparent 50%)',
        animation: 'pulse 4s ease-in-out infinite 2s'
      }} />

      <div className="register-container" style={{
        width: '100%',
        maxWidth: '600px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '30px',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(100, 255, 218, 0.1)',
        position: 'relative',
        zIndex: 1,
        animation: 'slideUp 0.6s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '2rem 2rem 1.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '30px 30px 0 0',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 150,
            height: 150,
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 200,
            height: 200,
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }} />
          
          <h2 style={{
            color: 'white',
            margin: 0,
            fontSize: '2rem',
            fontWeight: '700',
            position: 'relative',
            zIndex: 1
          }}>
            Join SurplusSense
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            margin: '0.5rem 0 0',
            fontSize: '1rem',
            position: 'relative',
            zIndex: 1
          }}>
            Start your journey to reduce food waste today
          </p>
        </div>

        {/* Progress Bar */}
        {step === 'register' && (
          <div style={{ padding: '1.5rem 2rem 0' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem'
            }}>
              {['Basic Info', 'Organization', 'Location & Security'].map((label, index) => (
                <div
                  key={index}
                  style={{
                    fontSize: '0.85rem',
                    color: index + 1 <= currentStep ? '#667eea' : '#999',
                    fontWeight: index + 1 <= currentStep ? '600' : '400'
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            <div style={{
              height: '6px',
              background: '#e0e0e0',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${(currentStep / totalSteps) * 100}%`,
                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                borderRadius: '3px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* Role Tabs */}
        <div style={{ padding: '1.5rem 2rem 0' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            background: '#f5f5f5',
            padding: '0.5rem',
            borderRadius: '15px'
          }}>
            <button
              type="button"
              onClick={() => { setActiveTab('donor'); setCurrentStep(1); }}
              style={{
                padding: '1rem',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                background: activeTab === 'donor' 
                  ? 'linear-gradient(135deg, #667eea, #764ba2)'
                  : 'transparent',
                color: activeTab === 'donor' ? 'white' : '#666',
                boxShadow: activeTab === 'donor' ? '0 5px 15px rgba(102, 126, 234, 0.4)' : 'none'
              }}
            >
              🍽️ Donor
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('receiver'); setCurrentStep(1); }}
              style={{
                padding: '1rem',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                background: activeTab === 'receiver' 
                  ? 'linear-gradient(135deg, #FF6F00, #FF8F00)'
                  : 'transparent',
                color: activeTab === 'receiver' ? 'white' : '#666',
                boxShadow: activeTab === 'receiver' ? '0 5px 15px rgba(255, 111, 0, 0.4)' : 'none'
              }}
            >
              🤝 Receiver
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            margin: '1rem 2rem 0',
            padding: '1rem',
            background: 'rgba(244, 67, 54, 0.1)',
            borderLeft: '4px solid #f44336',
            borderRadius: '8px',
            color: '#f44336',
            animation: 'shake 0.5s ease-in-out'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
          {step === 'register' ? (
            <>
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <div className="step fade-in">
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ 
                      fontWeight: '600', 
                      color: '#333',
                      display: 'block',
                      marginBottom: '0.5rem'
                    }}>
                      Full Name <span style={{ color: '#f44336' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        transition: 'all 0.3s ease',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label style={{ 
                        fontWeight: '600', 
                        color: '#333',
                        display: 'block',
                        marginBottom: '0.5rem'
                      }}>
                        Email <span style={{ color: '#f44336' }}>*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                      />
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label style={{ 
                        fontWeight: '600', 
                        color: '#333',
                        display: 'block',
                        marginBottom: '0.5rem'
                      }}>
                        Phone <span style={{ color: '#f44336' }}>*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="10-digit number"
                        maxLength={10}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Organization Details */}
              {currentStep === 2 && (
                <div className="step fade-in">
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ 
                      fontWeight: '600', 
                      color: '#333',
                      display: 'block',
                      marginBottom: '0.5rem'
                    }}>
                      Organization Name <span style={{ color: '#f44336' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleChange}
                      placeholder="Enter organization name"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                    />
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ 
                      fontWeight: '600', 
                      color: '#333',
                      display: 'block',
                      marginBottom: '0.5rem'
                    }}>
                      Organization Type <span style={{ color: '#f44336' }}>*</span>
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.75rem'
                    }}>
                      {organizationTypes[activeTab].map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({...formData, organizationType: type.value})}
                          style={{
                            padding: '1rem',
                            background: formData.organizationType === type.value
                              ? 'linear-gradient(135deg, #667eea, #764ba2)'
                              : '#f5f5f5',
                            border: formData.organizationType === type.value
                              ? 'none'
                              : '1px solid #e0e0e0',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            color: formData.organizationType === type.value ? 'white' : '#333',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{type.icon}</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{type.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Location & Security */}
              {currentStep === 3 && (
                <div className="step fade-in">
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ 
                      fontWeight: '600', 
                      color: '#333',
                      display: 'block',
                      marginBottom: '0.5rem'
                    }}>
                      📍 Location on Map <span style={{ color: '#f44336' }}>*</span>
                    </label>
                    <LocationPicker 
                      value={location} 
                      onChange={handleLocationChange}
                      label="Select your location"
                    />
                    {location && location.fullAddress && (
                      <div style={{ 
                        marginTop: '0.75rem', 
                        padding: '0.75rem', 
                        background: 'rgba(76, 175, 80, 0.1)', 
                        borderRadius: '8px',
                        border: '1px solid #4CAF50',
                        fontSize: '0.9rem',
                        color: '#2E7D32'
                      }}>
                        ✅ {location.fullAddress}
                      </div>
                    )}

                    {location && (
                      <div style={{ marginTop: '1.5rem', animation: 'fadeIn 0.5s ease-out' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div className="form-group">
                            <label style={{ fontWeight: '600', color: '#333', display: 'block', marginBottom: '0.5rem' }}>
                              Street Address <span style={{ color: '#f44336' }}>*</span>
                            </label>
                            <input
                              type="text"
                              name="address.street"
                              value={formData.address.street}
                              onChange={handleChange}
                              placeholder="House No, Building, Street Name"
                              required
                              style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '12px',
                                fontSize: '0.95rem',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label style={{ fontWeight: '600', color: '#333', display: 'block', marginBottom: '0.5rem' }}>
                              Landmark <span style={{ color: '#f44336' }}>*</span>
                            </label>
                            <input
                              type="text"
                              name="address.landmark"
                              value={formData.address.landmark}
                              onChange={handleChange}
                              placeholder="e.g. Near City Mall"
                              required
                              style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '12px',
                                fontSize: '0.95rem',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div className="form-group">
                            <label style={{ fontWeight: '600', color: '#333', display: 'block', marginBottom: '0.5rem' }}>
                              City <span style={{ color: '#f44336' }}>*</span>
                            </label>
                            <input
                              type="text"
                              name="address.city"
                              value={formData.address.city}
                              onChange={handleChange}
                              placeholder="City"
                              required
                              style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '12px',
                                fontSize: '0.95rem',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label style={{ fontWeight: '600', color: '#333', display: 'block', marginBottom: '0.5rem' }}>
                              State <span style={{ color: '#f44336' }}>*</span>
                            </label>
                            <input
                              type="text"
                              name="address.state"
                              value={formData.address.state}
                              onChange={handleChange}
                              placeholder="State"
                              required
                              style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '12px',
                                fontSize: '0.95rem',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label style={{ fontWeight: '600', color: '#333', display: 'block', marginBottom: '0.5rem' }}>
                              Zip Code <span style={{ color: '#f44336' }}>*</span>
                            </label>
                            <input
                              type="text"
                              name="address.zipCode"
                              value={formData.address.zipCode}
                              onChange={handleChange}
                              placeholder="Zip Code"
                              required
                              style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '12px',
                                fontSize: '0.95rem',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label style={{ 
                        fontWeight: '600', 
                        color: '#333',
                        display: 'block',
                        marginBottom: '0.5rem'
                      }}>
                        Password <span style={{ color: '#f44336' }}>*</span>
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Create password"
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                      />
                      {formData.password && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <div style={{
                            height: '6px',
                            background: '#e0e0e0',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${passwordStrength}%`,
                              background: getStrengthColor(),
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <p style={{
                            margin: '0.25rem 0 0',
                            fontSize: '0.8rem',
                            color: getStrengthColor()
                          }}>
                            Password Strength: {getStrengthText()}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label style={{ 
                        fontWeight: '600', 
                        color: '#333',
                        display: 'block',
                        marginBottom: '0.5rem'
                      }}>
                        Confirm Password <span style={{ color: '#f44336' }}>*</span>
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm password"
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '1rem'
              }}>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: 'transparent',
                      border: '2px solid #667eea',
                      borderRadius: '12px',
                      color: '#667eea',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = '#667eea';
                      e.target.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'transparent';
                      e.target.style.color = '#667eea';
                    }}
                  >
                    ← Previous
                  </button>
                )}
                
                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    style={{
                      flex: currentStep === 1 ? 1 : 2,
                      padding: '14px',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Next Step →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 2,
                      padding: '14px',
                      background: loading ? '#999' : 'linear-gradient(135deg, #667eea, #764ba2)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    {loading ? 'Registering...' : 'Complete Registration'}
                  </button>
                )}
              </div>
            </>
          ) : (
            /* OTP Verification Step */
            <div className="otp-verification fade-in" style={{ textAlign: 'center' }}>
              <div style={{
                width: '100px',
                height: '100px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '3rem',
                animation: 'pulse 2s infinite'
              }}>
                📧
              </div>
              
              <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>Verify Your Email</h3>
              <p style={{ color: '#666', marginBottom: '2rem' }}>
                Enter the 4-digit code sent to {formData.email}
              </p>
              
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'center',
                marginBottom: '2rem'
              }}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    style={{
                      width: '50px',
                      height: '60px',
                      textAlign: 'center',
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      border: '2px solid #e0e0e0',
                      borderRadius: '12px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || otp.join('').length !== 4}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: loading || otp.join('').length !== 4 ? 0.7 : 1,
                  marginBottom: '1rem'
                }}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <button
                type="button"
                onClick={() => setStep('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                ← Back to Registration
              </button>
            </div>
          )}
        </form>

        {/* Login Link */}
        <div style={{
          padding: '1.5rem 2rem 2rem',
          borderTop: '1px solid #e0e0e0',
          textAlign: 'center'
        }}>
          <p style={{ color: '#666', margin: 0 }}>
            Already have an account?{' '}
            <a 
              href={activeTab === 'donor' ? "/login?role=donor" : "/login?role=receiver"}
              style={{
                color: activeTab === 'donor' ? '#667eea' : '#FF6F00',
                fontWeight: '600',
                textDecoration: 'none',
                borderBottom: '2px solid transparent',
                transition: 'border-color 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.borderBottomColor = activeTab === 'donor' ? '#667eea' : '#FF6F00'}
              onMouseOut={(e) => e.target.style.borderBottomColor = 'transparent'}
            >
              Login here
            </a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .fade-in {
          animation: fadeIn 0.5s ease-out;
        }

        .step {
          transition: all 0.3s ease;
        }

        input:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        button:focus {
          outline: none;
        }

        @media (max-width: 480px) {
          .register-container {
            margin: 1rem;
          }
          
          .otp-verification input {
            width: 40px;
            height: 50px;
          }
        }
      `}</style>
    </div>
  );
};

export default Register;