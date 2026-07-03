import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="glassmorphic-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <span className="logo-icon-small">🍽️</span>
            Surplus<span style={{ color: 'var(--primary-light)' }}>Sense</span>
          </Link>
          <p className="footer-tagline">
            Eradicating hunger by intelligently connecting food donors with those in need. Every meal saved is a life touched.
          </p>
        </div>

        <div className="footer-links-group">
          <h4>Quick Links</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
          </ul>
        </div>

        <div className="footer-links-group">
          <h4>Get Involved</h4>
          <ul className="footer-links">
            <li><Link to="/register?role=donor">Become a Donor</Link></li>
            <li><Link to="/register?role=receiver">Register as Receiver</Link></li>
            <li><Link to="/login">User Login</Link></li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} SurplusSense. All Rights Reserved.</p>
      </div>

      <style>{`
        .glassmorphic-footer {
          background: rgba(9, 9, 11, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding: 4rem 2rem 1.5rem;
          color: var(--text-secondary);
          margin-top: auto;
          position: relative;
          z-index: 10;
        }

        .footer-container {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 4rem;
          margin-bottom: 3rem;
        }

        .footer-brand {
          max-width: 400px;
        }

        .footer-logo {
          font-size: 1.75rem;
          font-weight: 800;
          font-family: 'Outfit', sans-serif;
          color: white;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          transition: transform 0.3s;
        }

        .footer-logo:hover {
          transform: scale(1.02);
        }

        .logo-icon-small {
          background: var(--primary-glow);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          font-size: 1.1rem;
        }

        .footer-tagline {
          color: #94a3b8;
          line-height: 1.8;
          font-size: 0.95rem;
        }

        .footer-links-group h4 {
          color: white;
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
        }

        .footer-links {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .footer-links a {
          color: #94a3b8;
          text-decoration: none;
          transition: all 0.3s;
          display: inline-block;
        }

        .footer-links a:hover {
          color: var(--primary-light);
          transform: translateX(5px);
        }

        .footer-bottom {
          max-width: 1280px;
          margin: 0 auto;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          color: #64748b;
        }

        @media (max-width: 768px) {
          .footer-container {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }
          .footer-bottom {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
