import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

const Landing = () => {
  const [mounted, setMounted] = useState(false);
  const [heroAds, setHeroAds] = useState([]);
  const [bannerAds, setBannerAds] = useState([]);
  const [popupAd, setPopupAd] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    setMounted(true);
    // Fetch active ads and leaderboard
    axios.get('/api/admin/ads/public?slot=hero').then(r => setHeroAds(r.data.ads || [])).catch(() => {});
    axios.get('/api/admin/ads/public?slot=banner').then(r => setBannerAds(r.data.ads || [])).catch(() => {});
    axios.get('/api/admin/ads/public?slot=popup').then(r => {
      if (r.data.ads?.[0]) { setPopupAd(r.data.ads[0]); setTimeout(() => setShowPopup(true), 3000); }
    }).catch(() => {});
    axios.get('/api/admin/leaderboard/public').then(r => setLeaderboard(r.data.leaderboard || [])).catch(() => {});
  }, []);


  return (
    <div style={{ overflow: "hidden", minHeight: "100vh", background: "var(--background)", color: "var(--text-primary)" }}>
      {/* Animated Background Orbs */}
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* Hero Section */}
      <section className={`hero-section ${mounted ? 'visible' : ''}`}>
        <div className="hero-content">
          <div className="badge-pill stagger-1">
            <span className="sparkle">✨</span> Revolutionizing Food Sharing
          </div>
          <h1 className="hero-title stagger-2">
            SURPLUS <span className="text-gradient">SENSE</span>
          </h1>
          <p className="hero-subtitle stagger-3">
            Eradicating hunger by intelligently connecting food donors with those in need. Join our network and turn your surplus into hope.
          </p>

          <div className="cta-group stagger-4">
            <Link to="/register?role=donor" className="btn-hero btn-hero-primary group">
              Become a Donor
              <span className="arrow">→</span>
            </Link>
            <Link to="/register?role=receiver" className="btn-hero btn-hero-secondary">
              Register as Receiver
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          
          <div className="features-grid">
            <div className="feature-card animated-card delay-1">
              <div className="icon-backdrop"></div>
              <div className="feature-icon-wrapper">
                 <span className="icon">🍽️</span>
              </div>
              <h3>For Donors</h3>
              <p>Upload surplus food details. Our AI instantly verifies the quality, ensuring safe donations are processed without a hitch.</p>
            </div>

            <div className="feature-card animated-card delay-2">
              <div className="icon-backdrop warning-backdrop"></div>
              <div className="feature-icon-wrapper">
                 <span className="icon">🤝</span>
              </div>
              <h3>For Receivers</h3>
              <p>Get instant notifications for available food in your area. Use our secure pickup IDs to collect donations hassle-free.</p>
            </div>

            <div className="feature-card animated-card delay-3">
              <div className="icon-backdrop accent-backdrop"></div>
              <div className="feature-icon-wrapper">
                 <span className="icon">🤖</span>
              </div>
              <h3>AI Quality Check</h3>
              <p>State-of-the-art vision models evaluate food safety, making sure every donation meets health standards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Hero Ad Slot (shown below CTA buttons if admin has uploaded one) ── */}
      {heroAds.length > 0 && (
        <div style={{ position:'relative',zIndex:10,maxWidth:1000,margin:'-2rem auto 0',padding:'0 20px' }}>
          {heroAds.map(ad => (
            <a key={ad._id} href={ad.linkUrl || '#'} target="_blank" rel="noreferrer" style={{ display:'block',borderRadius:24,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}
              onClick={() => axios.post(`/api/admin/ads/${ad._id}/view`)}>
              {ad.type === 'video'
                ? <video src={ad.fileUrl} className="ad-media" autoPlay muted loop playsInline style={{width:'100%',height:280,objectFit:'cover',display:'block'}} />
                : <img src={ad.fileUrl} alt={ad.title} style={{width:'100%',height:280,objectFit:'cover',display:'block'}} />}
              <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'24px 32px',background:'linear-gradient(to top,rgba(0,0,0,.8),transparent)',color:'white'}}>
                <h3 style={{margin:0,fontSize:'1.5rem'}}>{ad.title}</h3>
                {ad.description && <p style={{margin:'4px 0 0',opacity:.8,fontSize:'.9rem'}}>{ad.description}</p>}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Stats Section */}
      <section className="stats-showcase">
        <div className="container stats-container">
          <div className="stat-item">
            <div className="stat-number text-gradient">10K+</div>
            <div className="stat-label">Meals Shared</div>
          </div>
          <div className="stat-item">
            <div className="stat-number text-gradient">500+</div>
            <div className="stat-label">Active Partners</div>
          </div>
          <div className="stat-item">
            <div className="stat-number text-gradient">50+</div>
            <div className="stat-label">Cities Covered</div>
          </div>
        </div>
      </section>

      {/* ── Banner Ads ── */}
      {bannerAds.length > 0 && (
        <section style={{ position:'relative',zIndex:10,padding:'3rem 20px',maxWidth:1200,margin:'0 auto' }}>
          <div style={{ display:'flex',gap:16,overflowX:'auto',paddingBottom:12,scrollbarWidth:'none' }}>
            {bannerAds.map(ad => (
              <a key={ad._id} href={ad.linkUrl || '#'} target="_blank" rel="noreferrer"
                style={{ minWidth:360,borderRadius:20,overflow:'hidden',position:'relative',display:'block',boxShadow:'0 10px 30px rgba(0,0,0,.35)',flexShrink:0 }}
                onClick={() => axios.post(`/api/admin/ads/${ad._id}/view`)}>
                {ad.type === 'video'
                  ? <video src={ad.fileUrl} style={{width:'100%',height:200,objectFit:'cover',display:'block'}} autoPlay muted loop playsInline />
                  : <img src={ad.fileUrl} alt={ad.title} style={{width:'100%',height:200,objectFit:'cover',display:'block'}} />}
                <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'16px 20px',background:'linear-gradient(to top,rgba(0,0,0,.75),transparent)',color:'white'}}>
                  <div style={{fontWeight:700,fontSize:'1rem'}}>{ad.title}</div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── Top Donors Leaderboard ── */}
      {leaderboard.length > 0 && (
        <section className="top-donors-section" style={{ position:'relative',zIndex:10 }}>
          <div className="container">
            <h2 className="section-title">🏆 Top Donors This Month</h2>
            <div className="donors-showcase">
              {leaderboard.slice(0, 5).map((donor, i) => (
                <div key={donor._id} className={`donor-rank-card ${i === 0 ? 'gold' : ''}`}>
                  <div className="rank-number">{['🥇','🥈','🥉','4','5'][i]}</div>
                  <div style={{ width:60,height:60,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:'1.5rem',margin:'0 auto 1rem' }}>
                    {donor.name[0]}
                  </div>
                  <h4>{donor.name}</h4>
                  <p>{donor.organizationName}</p>
                  <div className="points-badge">⭐ {donor.points} pts</div>
                  {donor.isPremium && <div className="premium-label">👑 PREMIUM</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Popup Ad ── */}
      {showPopup && popupAd && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem' }}
          onClick={() => setShowPopup(false)}>
          <div style={{ maxWidth:500,width:'100%',background:'#111',borderRadius:20,overflow:'hidden',position:'relative',boxShadow:'0 30px 60px rgba(0,0,0,.6)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPopup(false)} style={{ position:'absolute',top:12,right:12,background:'rgba(0,0,0,.5)',border:'none',color:'white',borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:'1rem',zIndex:10 }}>✕</button>
            <a href={popupAd.linkUrl || '#'} target="_blank" rel="noreferrer" style={{ display:'block' }} onClick={() => axios.post(`/api/admin/ads/${popupAd._id}/view`)}>
              {popupAd.type === 'video'
                ? <video src={popupAd.fileUrl} style={{width:'100%',maxHeight:300,objectFit:'cover',display:'block'}} autoPlay muted loop playsInline />
                : <img src={popupAd.fileUrl} alt={popupAd.title} style={{width:'100%',maxHeight:300,objectFit:'cover',display:'block'}} />}
              <div style={{ padding:'1.25rem 1.5rem',color:'white' }}>
                <h3 style={{ margin:0,fontSize:'1.25rem' }}>{popupAd.title}</h3>
                {popupAd.description && <p style={{ margin:'8px 0 0',color:'#94a3b8',fontSize:'.875rem' }}>{popupAd.description}</p>}
              </div>
            </a>
          </div>
        </div>
      )}


      <style>{`
        .bg-orbs {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          overflow: hidden;
          z-index: 0;
          pointer-events: none;
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.4;
          animation: float 20s infinite alternate cubic-bezier(0.4, 0, 0.2, 1);
        }
        .orb-1 {
          background: #059669;
          width: 50vw; height: 50vw;
          top: -10%; left: -10%;
        }
        .orb-2 {
          background: #3b82f6;
          width: 40vw; height: 40vw;
          top: 40%; right: -10%;
          animation-delay: -5s;
        }
        .orb-3 {
          background: #f59e0b;
          width: 30vw; height: 30vw;
          bottom: -10%; left: 30%;
          animation-delay: -10s;
        }

        .hero-section {
          position: relative;
          z-index: 10;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6rem 20px;
          text-align: center;
        }

        .badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50px;
          font-size: 0.9rem;
          margin-bottom: 24px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }

        .hero-title {
          font-size: clamp(3rem, 8vw, 5.5rem);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          color: white;
          letter-spacing: -0.04em;
        }

        .text-gradient {
          background: linear-gradient(135deg, #34d399 0%, #059669 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: clamp(1.1rem, 2vw, 1.3rem);
          max-width: 600px;
          margin: 0 auto 3rem;
          color: #94a3b8;
          line-height: 1.6;
        }

        .cta-group {
          display: flex;
          gap: 1rem;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
        }

        .btn-hero {
          padding: 1rem 2.5rem;
          border-radius: 50px;
          font-size: 1.05rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        .btn-hero-primary {
          background: white;
          color: #022c22;
          box-shadow: 0 0 30px rgba(255,255,255,0.1);
        }

        .btn-hero-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 40px rgba(255,255,255,0.2);
        }

        .btn-hero-primary .arrow {
          transition: transform 0.3s;
        }
        .btn-hero-primary:hover .arrow {
          transform: translateX(5px);
        }

        .btn-hero-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .btn-hero-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-3px);
        }

        /* Initial transparent state for animations */
        .stagger-1, .stagger-2, .stagger-3, .stagger-4 {
          opacity: 0;
          transform: translateY(30px);
        }
        
        /* Execution of stagger animations using an active class on parent */
        .hero-section.visible .stagger-1 { animation: slideUpFade 0.8s forwards 0.1s; }
        .hero-section.visible .stagger-2 { animation: slideUpFade 0.8s forwards 0.2s; }
        .hero-section.visible .stagger-3 { animation: slideUpFade 0.8s forwards 0.3s; }
        .hero-section.visible .stagger-4 { animation: slideUpFade 0.8s forwards 0.4s; }

        .features-section {
          position: relative;
          z-index: 10;
          padding: 4rem 0 8rem;
        }

        .section-title {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 4rem;
          color: white;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2.5rem;
          padding: 0 20px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .feature-card {
           background: linear-gradient(160deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%);
           border: 1px solid rgba(255, 255, 255, 0.08);
           border-top: 1px solid rgba(255, 255, 255, 0.15);
           backdrop-filter: blur(24px);
           -webkit-backdrop-filter: blur(24px);
           padding: 3.5rem 2.5rem;
           border-radius: 24px;
           box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
           position: relative;
           text-align: center;
           transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
           overflow: hidden;
           display: flex;
           flex-direction: column;
           align-items: center;
        }

        .feature-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent 60%);
          pointer-events: none;
        }

        .feature-card:hover {
          transform: translateY(-12px);
          border-color: rgba(52, 211, 153, 0.3);
          box-shadow: 0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(5, 150, 105, 0.2);
        }

        .icon-backdrop {
          position: absolute;
          top: 3.5rem;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 80px;
          background: var(--primary);
          border-radius: 50%;
          filter: blur(35px);
          opacity: 0.15;
          z-index: 0;
          transition: opacity 0.4s, filter 0.4s;
        }

        .warning-backdrop { background: var(--secondary); }
        .accent-backdrop { background: var(--accent); }

        .feature-card:hover .icon-backdrop {
          opacity: 0.4;
          filter: blur(45px);
        }

        .feature-icon-wrapper {
          width: 75px; height: 75px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.25rem;
          margin-bottom: 2rem;
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.05);
          position: relative;
          z-index: 1;
          transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .feature-card:hover .feature-icon-wrapper {
          transform: scale(1.05);
        }

        .feature-card h3 {
          font-size: 1.6rem;
          color: white;
          margin-bottom: 1rem;
          position: relative;
          z-index: 1;
        }
        
        .feature-card p {
          color: #94a3b8;
          line-height: 1.7;
          font-size: 1.05rem;
          position: relative;
          z-index: 1;
        }

        .animated-card {
           animation: cardReveal 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards, floatContinuous 6s ease-in-out infinite;
           opacity: 0;
           transform-origin: bottom center;
        }
        
        /* Stagger the entrance and the continuous float so they don't move in sync */
        .delay-1 { animation-delay: 0.1s, 0.1s; }
        .delay-2 { animation-delay: 0.3s, 2s; }
        .delay-3 { animation-delay: 0.5s, 4s; }

        @keyframes cardReveal {
          0% { 
            opacity: 0; 
            transform: translateY(80px) scale(0.9) rotateX(-15deg); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0) scale(1) rotateX(0deg); 
          }
        }
        
        @keyframes floatContinuous {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        .stats-showcase {
          position: relative;
          z-index: 10;
          padding: 6rem 20px;
          background: rgba(0,0,0,0.2);
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
        }
        
        .stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 3rem;
          text-align: center;
        }

        .stat-number {
          font-size: 4rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 0.5rem;
          font-family: 'Outfit', sans-serif;
        }

        .stat-label {
          color: #94a3b8;
          font-size: 1.1rem;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .landing-footer {
          position: relative;
          z-index: 10;
          padding: 3rem 20px;
          text-align: center;
          color: #64748b;
        }

        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes float {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(3vw, -5vh) rotate(10deg) scale(1.1); }
          66% { transform: translate(-2vw, 2vh) rotate(-5deg) scale(0.9); }
          100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        }

        .ad-space-section {
          padding: 2rem 20px;
          max-width: 1200px;
          margin: 0 auto 4rem;
        }

        .ad-carousel {
          display: flex;
          gap: 20px;
          overflow-x: auto;
          padding-bottom: 20px;
          scrollbar-width: none;
        }

        .ad-banner-item {
          min-width: 100%;
          height: 400px;
          border-radius: 30px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }

        .ad-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ad-overlay {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 40px;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          color: white;
        }

        .ad-overlay h3 {
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .ad-btn {
          display: inline-block;
          padding: 10px 24px;
          background: var(--primary);
          color: white;
          border-radius: 50px;
          text-decoration: none;
          font-weight: 700;
        }

        .top-donors-section {
          padding: 4rem 20px;
        }

        .donors-showcase {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .donor-rank-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 30px 20px;
          text-align: center;
          position: relative;
          transition: transform 0.3s;
        }

        .donor-rank-card:hover { transform: translateY(-10px); }

        .donor-rank-card.gold {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%);
          border-color: rgba(251, 191, 36, 0.3);
        }

        .rank-number {
          position: absolute;
          top: 15px; left: 15px;
          font-weight: 800;
          color: #94a3b8;
        }

        .donor-rank-card img {
          width: 80px; height: 80px;
          border-radius: 50%;
          margin-bottom: 1rem;
          border: 3px solid rgba(255,255,255,0.1);
        }

        .donor-rank-card h4 {
          margin: 0 0 4px 0;
          color: white;
        }

        .donor-rank-card p {
          font-size: 0.85rem;
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .points-badge {
          display: inline-block;
          padding: 4px 12px;
          background: rgba(139, 92, 246, 0.2);
          color: #a78bfa;
          border-radius: 30px;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .premium-label {
          margin-top: 10px;
          font-size: 0.65rem;
          font-weight: 800;
          color: #fbbf24;
          letter-spacing: 1px;
        }

      `}</style>
    </div>
  );
};

export default Landing;
