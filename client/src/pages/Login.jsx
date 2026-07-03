import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Login = () => {
  const [activeTab, setActiveTab] = useState('donor');
  const [searchParams] = useSearchParams();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [otp, setOtp] = useState(['', '', '', '']);
  const [step, setStep] = useState('credentials');
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, verifyLoginOTP } = useAuth();
  const navigate = useNavigate();

  // Handle verified parameter from registration
  useEffect(() => {
    const verified = searchParams.get('verified');
    const role = searchParams.get('role');
    
    if (verified === 'true') {
      setSuccessMessage('✅ Registration successful! Please login with your credentials.');
      if (role) {
        setActiveTab(role);
      }
    }
  }, [searchParams]);

  const handleChange = (e) => {
    // Strip the tab prefix (e.g. "donor-email" → "email") so formData stays clean
    const key = e.target.name.replace(/^(donor|receiver|admin)-/, '');
    setFormData({ ...formData, [key]: e.target.value });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (activeTab === 'admin') {
        // Admin login — direct, no OTP, uses static axios import
        const res = await axios.post('/api/auth/admin/login', {
          email: formData.email,
          password: formData.password
        });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        // Hard reload so AuthContext re-checks the token
        window.location.href = '/admin';
        return;
      }

      if (step === 'credentials') {
        const result = await login(formData.email, formData.password, activeTab);
        
        if (result.requiresOTP) {
          setUserId(result.userId);
          setStep('otp');
        } else {
          navigate(activeTab === 'donor' ? '/donor' : '/receiver');
        }
      } else {
        const otpString = otp.join('');
        await verifyLoginOTP(userId, otpString);
        navigate(activeTab === 'donor' ? '/donor' : '/receiver');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getGradient = () => {
    if (activeTab === 'donor') return 'linear-gradient(135deg, #667eea, #764ba2)';
    if (activeTab === 'admin') return 'linear-gradient(135deg, #0f172a, #1e3a5f)';
    return 'linear-gradient(135deg, #FF6F00, #FF8F00)';
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

      {/* Login Card */}
      <div className="login-container" style={{
        width: '100%',
        maxWidth: '450px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '30px',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(100, 255, 218, 0.1)',
        position: 'relative',
        zIndex: 1,
        animation: 'slideUp 0.6s ease-out',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '2.5rem 2rem 1.5rem',
          background: getGradient(),
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '30px 30px 0 0'
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
            Welcome Back
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            margin: '0.5rem 0 0',
            fontSize: '1rem',
            position: 'relative',
            zIndex: 1
          }}>
            Login to continue your mission
          </p>
        </div>

        {/* Role Tabs */}
        <div style={{ padding: '2rem 2rem 0' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '0.5rem',
            background: '#f5f5f5',
            padding: '0.4rem',
            borderRadius: '15px'
          }}>
            <button
              type="button"
              onClick={() => { setActiveTab('donor'); setStep('credentials'); setError(''); setFormData({ email: '', password: '' }); }}
              style={{
                padding: '0.8rem 0.4rem',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                background: activeTab === 'donor' ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
                color: activeTab === 'donor' ? 'white' : '#666',
                boxShadow: activeTab === 'donor' ? '0 5px 15px rgba(102, 126, 234, 0.4)' : 'none'
              }}
            >🍽️ Donor</button>
            <button
              type="button"
              onClick={() => { setActiveTab('receiver'); setStep('credentials'); setError(''); setFormData({ email: '', password: '' }); }}
              style={{
                padding: '0.8rem 0.4rem',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                background: activeTab === 'receiver' ? 'linear-gradient(135deg, #FF6F00, #FF8F00)' : 'transparent',
                color: activeTab === 'receiver' ? 'white' : '#666',
                boxShadow: activeTab === 'receiver' ? '0 5px 15px rgba(255, 111, 0, 0.4)' : 'none'
              }}
            >🤝 Receiver</button>
            <button
              type="button"
              onClick={() => { setActiveTab('admin'); setStep('credentials'); setError(''); setFormData({ email: '', password: '' }); }}
              style={{
                padding: '0.8rem 0.4rem',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                background: activeTab === 'admin' ? 'linear-gradient(135deg, #0f172a, #1e3a5f)' : 'transparent',
                color: activeTab === 'admin' ? 'white' : '#666',
                boxShadow: activeTab === 'admin' ? '0 5px 15px rgba(15,23,42,0.5)' : 'none'
              }}
            >🛡️ Admin</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ padding: '1.5rem 2rem 0' }}>
          {successMessage && (
            <div style={{
              padding: '1rem',
              background: 'rgba(76, 175, 80, 0.1)',
              borderLeft: '4px solid #4CAF50',
              borderRadius: '8px',
              color: '#2E7D32',
              marginBottom: '1rem',
              animation: 'slideIn 0.5s ease-out'
            }}>
              {successMessage}
            </div>
          )}

          {error && (
            <div style={{
              padding: '1rem',
              background: 'rgba(244, 67, 54, 0.1)',
              borderLeft: '4px solid #f44336',
              borderRadius: '8px',
              color: '#f44336',
              marginBottom: '1rem',
              animation: 'shake 0.5s ease-in-out'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} autoComplete="off" style={{ padding: '0 2rem 2rem' }}>
          {step === 'credentials' ? (
            <>
              {/* Email Input */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  fontWeight: '600',
                  color: '#333',
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  Email Address <span style={{ color: '#f44336' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1.2rem',
                    zIndex: 1
                  }}>
                    📧
                  </span>
                  <input
                    type="email"
                    name={`${activeTab}-email`}
                    id={`${activeTab}-email`}
                    autoComplete="off"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email"
                    style={{
                      width: '100%',
                      padding: '14px 14px 14px 45px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      transition: 'all 0.3s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = activeTab === 'donor' ? '#667eea' : '#FF6F00';
                      e.target.style.boxShadow = `0 0 0 3px ${activeTab === 'donor' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(255, 111, 0, 0.1)'}`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
              
              {/* Password Input */}
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label style={{
                  fontWeight: '600',
                  color: '#333',
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  Password <span style={{ color: '#f44336' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1.2rem',
                    zIndex: 1
                  }}>
                    🔒
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name={`${activeTab}-password`}
                    id={`${activeTab}-password`}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '14px 45px 14px 45px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      transition: 'all 0.3s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = activeTab === 'donor' ? '#667eea' : '#FF6F00';
                      e.target.style.boxShadow = `0 0 0 3px ${activeTab === 'donor' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(255, 111, 0, 0.1)'}`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      padding: '5px',
                      zIndex: 1
                    }}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* OTP Verification */
            <div className="otp-section" style={{
              textAlign: 'center',
              animation: 'fadeIn 0.5s ease-out'
            }}>
              <div style={{
                width: '100px',
                height: '100px',
                background: getGradient(),
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
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = activeTab === 'donor' ? '#667eea' : '#FF6F00';
                      e.target.style.boxShadow = `0 0 0 3px ${activeTab === 'donor' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(255, 111, 0, 0.1)'}`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || (step === 'otp' && otp.join('').length !== 4)}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? '#999' : getGradient(),
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: loading || (step === 'otp' && otp.join('').length !== 4) ? 0.7 : 1,
              marginTop: '1rem'
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <div className="spinner" style={{
                  width: '20px',
                  height: '20px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Please wait...
              </div>
            ) : (
              step === 'credentials' ? 'Login' : 'Verify OTP'
            )}
          </button>

          {/* Admin Credentials Note — only shown on Admin tab */}
          {activeTab === 'admin' && step === 'credentials' && (
            <div style={{
              marginTop: '1.2rem',
              padding: '0.9rem 1.1rem',
              background: 'linear-gradient(135deg, rgba(15,23,42,0.06), rgba(30,58,95,0.08))',
              border: '1px dashed #94a3b8',
              borderRadius: '12px',
              fontSize: '0.88rem',
              color: '#475569',
              textAlign: 'center',
              lineHeight: '1.7'
            }}>
              🔑 <strong style={{ color: '#1e3a5f' }}>Demo Admin Credentials</strong><br />
              <span>Email: </span><code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>admin@foodshare.com</code><br />
              <span>Password: </span><code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>Admin@FoodShare2024</code>
            </div>
          )}

        </form>

        {/* Back to Login Link */}
        {step === 'otp' && (
          <div style={{ padding: '0 2rem 2rem', textAlign: 'center' }}>
            <button
              onClick={() => setStep('credentials')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTab === 'donor' ? '#667eea' : '#FF6F00',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600'
              }}
            >
              ← Back to Login
            </button>
          </div>
        )}

        {/* Register Link */}
        <div style={{
          padding: '1.5rem 2rem 2rem',
          borderTop: '1px solid #e0e0e0',
          textAlign: 'center'
        }}>
          <p style={{ color: '#666', margin: 0 }}>
            Don't have an account?{' '}
            <a
              href={activeTab === 'donor' ? "/register?role=donor" : "/register?role=receiver"}
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
              Register here
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

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
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
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .login-container {
          transition: transform 0.3s ease;
        }

        .login-container:hover {
          transform: translateY(-5px);
        }

        input:focus {
          outline: none;
        }

        @media (max-width: 480px) {
          .login-container {
            margin: 1rem;
          }
          
          .otp-section input {
            width: 40px;
            height: 50px;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;