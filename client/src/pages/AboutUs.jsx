import React from 'react';
import { Link } from 'react-router-dom';

const AboutUs = () => {
  return (
    <div className="fade-in" style={{ padding: '4rem 2rem', maxWidth: '1280px', margin: '0 auto', minHeight: 'calc(100vh - 72px)' }}>
      {/* Hero Section */}
      <div className="text-center slide-up" style={{ marginBottom: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'inline-block', padding: '0.5rem 1.5rem', background: 'var(--primary-glow)', color: 'var(--primary-light)', borderRadius: 'var(--radius-full)', fontWeight: '600', marginBottom: '1.5rem', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
          Our Story
        </div>
        <h1 style={{ fontSize: '4rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff 0%, #a1a1aa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1.5rem' }}>
          About <span style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SurplusSense</span>
        </h1>
        <p style={{ fontSize: '1.35rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8' }}>
          We believe that no good food should go to waste when there are people going hungry. SurplusSense bridges the critical gap between excess and need through intelligent distribution.
        </p>
      </div>

      {/* Mission, Vision & Impact */}
      <div className="grid grid-3 slide-up" style={{ gap: '2rem', marginBottom: '6rem', animationDelay: '0.1s' }}>
        <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', borderTop: '4px solid var(--primary)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '150px', height: '150px', background: 'var(--primary-glow)', filter: 'blur(40px)', borderRadius: '50%', zIndex: 0 }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🎯</div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Our Mission</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '1.05rem' }}>
              To systematically reduce food waste by creating a seamless, efficient, and reliable platform that connects food donors with organizations and individuals in need. We strive to make food redistribution effortless and impactful.
            </p>
          </div>
        </div>
        <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', borderTop: '4px solid var(--accent)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', width: '150px', height: '150px', background: 'rgba(59, 130, 246, 0.15)', filter: 'blur(40px)', borderRadius: '50%', zIndex: 0 }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>👁️‍🗨️</div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Our Vision</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '1.05rem' }}>
              A world where every community has sustainable access to nutritious food, where surplus is viewed as a resource rather than waste, and where technology empowers widespread social good.
            </p>
          </div>
        </div>
        <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', borderTop: '4px solid var(--secondary)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '150px', height: '150px', background: 'rgba(245, 158, 11, 0.15)', filter: 'blur(40px)', borderRadius: '50%', zIndex: 0 }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🌍</div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Our Impact</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '1.05rem' }}>
              By diverting high-quality meals from landfills, we don't just feed the hungry &mdash; we actively reduce greenhouse gas emissions and build stronger, more resilient local communities united by compassion.
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="slide-up" style={{ marginBottom: '6rem', animationDelay: '0.2s' }}>
        <div className="text-center" style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '3rem', color: 'var(--text-primary)' }}>How It Works</h2>
        </div>
        <div className="grid grid-3" style={{ gap: '2rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', background: 'rgba(17, 24, 39, 0.6)' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <span style={{ fontSize: '2.5rem' }}>🍽️</span>
            </div>
            <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)', fontSize: '1.5rem' }}>1. Donors Post Food</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6' }}>Restaurants, caterers, and individuals list their surplus high-quality food on our platform quickly and easily.</p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', background: 'rgba(17, 24, 39, 0.6)' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto', border: '1px solid rgba(5, 150, 105, 0.2)' }}>
              <span style={{ fontSize: '2.5rem' }}>📱</span>
            </div>
            <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)', fontSize: '1.5rem' }}>2. Receivers Match</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6' }}>Local NGOs and receivers get real-time matching notifications based on their location, needs, and our AI safety analysis.</p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', background: 'rgba(17, 24, 39, 0.6)' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <span style={{ fontSize: '2.5rem' }}>🤝</span>
            </div>
            <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)', fontSize: '1.5rem' }}>3. Seamless Pickup</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6' }}>Receivers accept the donation, follow integrated routing, and securely collect the food using a verified pickup ID.</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="card slide-up" style={{ background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.1) 0%, rgba(4, 120, 87, 0.4) 100%)', padding: '5rem 3rem', textAlign: 'center', border: '1px solid var(--primary)', position: 'relative', overflow: 'hidden', animationDelay: '0.3s' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, var(--primary-light), transparent)' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'white' }}>Join the Movement</h2>
          <p style={{ fontSize: '1.25rem', marginBottom: '3rem', maxWidth: '700px', margin: '0 auto 3rem auto', color: '#d1d5db' }}>
            Whether you have surplus food to share or you help distribute food to those in need, we need you. Every meal saved is a life touched.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
            <Link to="/register" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.15rem' }}>
              Get Started Now
            </Link>
            <Link to="/contact" className="btn btn-outline" style={{ padding: '1rem 2.5rem', fontSize: '1.15rem', background: 'rgba(255,255,255,0.05)', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
