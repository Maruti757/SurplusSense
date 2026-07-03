import React, { useState } from 'react';
import axios from 'axios';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [status, setStatus] = useState({
    loading: false,
    success: false,
    error: null
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: null });

    try {
      await axios.post('/api/contact', formData);
      setStatus({ loading: false, success: true, error: null });
      setFormData({ name: '', email: '', subject: '', message: '' });
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setStatus(prev => ({ ...prev, success: false }));
      }, 5000);
    } catch (err) {
      setStatus({
        loading: false,
        success: false,
        error: err.response?.data?.message || 'Failed to send message. Please try again.'
      });
    }
  };

  return (
    <div className="fade-in" style={{ padding: '4rem 2rem', maxWidth: '1100px', margin: '0 auto', minHeight: 'calc(100vh - 72px)' }}>
      <div className="text-center slide-up" style={{ marginBottom: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff 0%, #a1a1aa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1.25rem' }}>
          Get In Touch
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto', lineHeight: '1.6' }}>
          Have questions about donating? Need help setting up your receiver account? 
          We're here to help. Send us a message and our team will respond shortly.
        </p>
      </div>

      <div className="grid slide-up" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', animationDelay: '0.1s' }}>
        {/* Contact Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2.5rem', borderLeft: '4px solid var(--primary)', background: 'linear-gradient(145deg, var(--card-bg) 0%, rgba(17,24,39,0.4) 100%)' }}>
            <div style={{ background: 'var(--primary-glow)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid rgba(5,150,105,0.2)' }}>
              <span style={{ fontSize: '1.5rem' }}>📍</span>
            </div>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.5rem' }}>
              Headquarters
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '1.1rem' }}>
              #24 Innovation Drive<br />
              Tech Park, Hubli, Karnataka<br />
              580021
            </p>
          </div>
          
          <div className="card" style={{ padding: '2.5rem', borderLeft: '4px solid var(--accent)', background: 'linear-gradient(145deg, var(--card-bg) 0%, rgba(17,24,39,0.4) 100%)' }}>
            <div style={{ background: 'rgba(59,130,246,0.15)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid rgba(59,130,246,0.2)' }}>
              <span style={{ fontSize: '1.5rem' }}>✉️</span>
            </div>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.5rem' }}>
              Direct Contact
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: 'var(--accent)' }}>Email:</span> support@surplussense.com
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: 'var(--accent)' }}>Phone:</span> +91 63663 67698
              </p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="card" style={{ padding: '3rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'var(--primary-glow)', filter: 'blur(70px)', borderRadius: '50%', zIndex: 0, opacity: 0.5 }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ marginBottom: '2rem', color: 'var(--text-primary)', fontSize: '1.75rem' }}>Send a Message</h2>
            
            {status.success && (
              <div style={{ padding: '1rem 1.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderRadius: 'var(--radius-md)', marginBottom: '2rem', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>✅</span> Your message has been sent successfully. We will get back to you soon.
              </div>
            )}

            {status.error && (
              <div style={{ padding: '1rem 1.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 'var(--radius-md)', marginBottom: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>❌</span> {status.error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Your Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  style={{ background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border)' }}
                />
              </div>
              
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                  style={{ background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border)' }}
                />
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="How can we help?"
                  style={{ background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                <label>Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="5"
                  placeholder="Write your message here..."
                  style={{ background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border)', resize: 'vertical' }}
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1.1rem', fontSize: '1.1rem', opacity: status.loading ? 0.7 : 1 }}
                disabled={status.loading}
              >
                {status.loading ? 'Sending Message...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
