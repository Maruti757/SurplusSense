import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isHome = location.pathname === '/';

  return (
    <nav className={`navbar-modern ${scrolled ? 'glassmorphic' : 'transparent'} ${isHome ? 'absolute-top' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-brand-animated">
          {/* Animated inline logo */}
          <span className="logo-wrap">
            {/* Geometric icon — two interlocked hexagonal S shapes */}
            <svg className="logo-icon" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="iconGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#c026d3" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              {/* Outer shape */}
              <path d="M30 4 L52 17 L52 43 L30 56 L8 43 L8 17 Z" stroke="url(#iconGrad)" strokeWidth="3.5" fill="none" strokeLinejoin="round"/>
              {/* Inner S-like cutout shapes */}
              <path d="M30 15 L44 23 L44 37 L30 45 L16 37 L16 23 Z" stroke="url(#iconGrad)" strokeWidth="3" fill="none" strokeLinejoin="round"/>
              <line x1="30" y1="4"  x2="30" y2="15" stroke="url(#iconGrad)" strokeWidth="3.5"/>
              <line x1="30" y1="45" x2="30" y2="56" stroke="url(#iconGrad)" strokeWidth="3.5"/>
            </svg>

            <span className="logo-text-group">
              <span className="logo-title">SurplusSense</span>
              <span className="logo-sub">SAVE FOOD</span>
            </span>
          </span>
        </Link>
        
        <div className="navbar-links-animated">
          <Link to="/" className="nav-item">Home</Link>
          <Link to="/about" className="nav-item">About Us</Link>
          <Link to="/contact" className="nav-item">Contact Us</Link>
          
          {!user ? (
            <>
              <Link to="/login" className="nav-item">Login</Link>
              <Link to="/register" className="btn-get-started">
                Get Started
              </Link>
            </>
          ) : user.role === 'admin' ? (
            <>
              <Link to="/admin" className="nav-item nav-item--admin">🛡️ Admin Panel</Link>
              <span className="user-greeting">👑 {user.name}</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </>
          ) : (
            <>
              <Link to={user.role === 'donor' ? '/donor' : '/receiver'} className="nav-item">
                Dashboard
              </Link>
              {user.isPremium && <span className="nav-premium-badge">💎 Premium</span>}
              <span className="user-greeting">Hi 👋, {user.name}</span>
              <button onClick={handleLogout} className="btn-logout">
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .absolute-top {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
        }

        .navbar-modern {
          padding: 1.2rem 2rem;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          animation: navSlideDown 0.8s ease-out;
          border-bottom: 1px solid transparent;
          z-index: 50;
          position: sticky;
          top: 0;
        }

        .navbar-container {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .transparent {
          background: transparent;
        }

        .glassmorphic {
          background: rgba(9, 9, 11, 0.85); /* Dark blur */
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 1rem 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
        }

        .navbar-brand-animated {
          font-size: 1.5rem;
          font-weight: 800;
          font-family: 'Outfit', sans-serif;
          color: white;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: transform 0.3s;
        }

        .navbar-brand-animated:hover {
          transform: scale(1.05);
        }

        .logo-wrap {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .logo-icon {
          width: 46px;
          height: 46px;
          flex-shrink: 0;
          animation: iconHue 4s linear infinite, logoPulse 2.5s ease-in-out alternate infinite;
          transform-origin: center;
          filter: drop-shadow(0 0 6px rgba(192, 38, 211, 0.5));
        }

        .logo-text-group {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        /* "SurplusSense" — shimmer sweep */
        .logo-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.35rem;
          font-weight: 800;
          color: white;
          background: linear-gradient(
            90deg,
            #ffffff 0%,
            #ffffff 30%,
            #f0abfc 50%,
            #ffffff 70%,
            #ffffff 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerSweep 2.6s linear infinite;
          letter-spacing: -0.02em;
        }

        /* "SAVE FOOD" — gradient pulse glow */
        .logo-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          background: linear-gradient(90deg, #f97316, #c026d3, #7c3aed, #f97316);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: saveFoodGlow 3s ease-in-out infinite;
        }

        @keyframes shimmerSweep {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }

        @keyframes saveFoodGlow {
          0%   { background-position: 0% center; }
          50%  { background-position: 150% center; }
          100% { background-position: 0% center; }
        }

        @keyframes iconHue {
          0%   { filter: drop-shadow(0 0 6px rgba(249,115,22,0.6)) hue-rotate(0deg); }
          50%  { filter: drop-shadow(0 0 10px rgba(192,38,211,0.8)) hue-rotate(40deg); }
          100% { filter: drop-shadow(0 0 6px rgba(249,115,22,0.6)) hue-rotate(0deg); }
        }

        .navbar-links-animated {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .nav-item {
          color: #e2e8f0;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
          position: relative;
          padding: 0.5rem 0;
          transition: color 0.3s;
        }

        .nav-item:hover {
          color: var(--primary-light);
        }

        .nav-item::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0;
          width: 0%;
          height: 2px;
          background: var(--primary-light);
          transition: width 0.3s ease;
          border-radius: 2px;
        }

        .nav-item:hover::after {
          width: 100%;
        }

        .btn-get-started {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
          padding: 0.6rem 1.5rem;
          border-radius: 50px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .btn-get-started:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(5, 150, 105, 0.3);
        }

        .user-greeting {
          color: #a1a1aa;
          font-weight: 500;
        }

        .btn-logout {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 0.5rem 1.25rem;
          border-radius: 50px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }

        .btn-logout:hover {
          background: #ef4444;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        }

        @keyframes navSlideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes floatSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
