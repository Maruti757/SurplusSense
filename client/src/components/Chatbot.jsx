import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "👋 Hello! I'm your SurplusSense Assistant. How can I help you today?", isBot: true }
  ]);
  const [input, setInput] = useState('');
  const [sessionId] = useState(`session_${Date.now()}`);
  const [quickReplies, setQuickReplies] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { user } = useAuth();

  const defaultQuickReplies = [
    { text: '🍽️ How to donate', icon: '🎁' },
    { text: '📦 How to receive', icon: '📥' },
    { text: '🔍 What is pickup ID', icon: '❓' },
    { text: '🆘 Help', icon: '🆘' }
  ];

  useEffect(() => {
    setQuickReplies(defaultQuickReplies);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = { text, isBot: false, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await axios.post('/api/chatbot/chat', {
        message: text,
        sessionId,
        userId: user?.id
      });

      setIsTyping(false);
      const botMessage = { 
        text: response.data.response, 
        isBot: true, 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setIsTyping(false);
      const errorMessage = { 
        text: '😕 Sorry, I encountered an error. Please try again.', 
        isBot: true 
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickReply = (text) => {
    sendMessage(text);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chatbot-container">
      {/* Chat Toggle Button */}
      <button 
        className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle chat"
      >
        {!isOpen ? (
          <>
            <span className="toggle-icon">🤖</span>
            <span className="toggle-text">Chat Support</span>
            <span className="pulse-dot"></span>
          </>
        ) : (
          <span className="toggle-icon close">✕</span>
        )}
      </button>

      {/* Chat Window */}
      <div className={`chatbot-window ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="header-left">
            <div className="bot-avatar">
              <span className="avatar-icon">🤖</span>
              <span className="status-dot online"></span>
            </div>
            <div className="header-info">
              <h3>SurplusSense Assistant</h3>
              <p className="status-text">Online • Usually replies instantly</p>
            </div>
          </div>
          <button 
            className="close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
          >
            ✕
          </button>
        </div>
        
        {/* Messages Area */}
        <div className="chatbot-messages">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message-wrapper ${msg.isBot ? 'bot' : 'user'}`}
            >
              {msg.isBot && (
                <div className="message-avatar">🤖</div>
              )}
              <div className="message-content">
                <div className={`message-bubble ${msg.isBot ? 'bot' : 'user'}`}>
                  {msg.text}
                </div>
                {msg.timestamp && (
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                )}
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="message-wrapper bot">
              <div className="message-avatar">🤖</div>
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {messages.length <= 2 && (
          <div className="quick-replies">
            <p className="quick-replies-title">Suggested questions:</p>
            <div className="quick-replies-grid">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  className="quick-reply-btn"
                  onClick={() => handleQuickReply(reply.text)}
                >
                  <span className="reply-icon">{reply.icon}</span>
                  <span className="reply-text">{reply.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <form className="chatbot-input-area" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="chat-input"
          />
          <button 
            type="submit" 
            className="send-btn"
            disabled={!input.trim()}
          >
            <span className="send-icon">➤</span>
          </button>
        </form>
      </div>

      <style jsx>{`
        .chatbot-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }

        /* Toggle Button */
        .chatbot-toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 50px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .chatbot-toggle:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
        }

        .chatbot-toggle.open {
          background: #dc2626;
          box-shadow: 0 4px 20px rgba(220, 38, 38, 0.3);
        }

        .toggle-icon {
          font-size: 24px;
          transition: transform 0.3s ease;
        }

        .chatbot-toggle:hover .toggle-icon {
          transform: scale(1.1);
        }

        .toggle-text {
          white-space: nowrap;

        }

        .pulse-dot {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        /* Chat Window */
        .chatbot-window {
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 380px;
          height: 600px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          transform: scale(0.8) translateY(20px);
          transform-origin: bottom right;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }

        .chatbot-window.open {
          opacity: 1;
          transform: scale(1) translateY(0);
          pointer-events: all;
        }

        /* Header */
        .chatbot-header {
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .bot-avatar {
          position: relative;
        }

        .avatar-icon {
          font-size: 40px;
        }

        .status-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
        }

        .status-dot.online {
          background: #10b981;
        }

        .header-info h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .status-text {
          margin: 4px 0 0;
          font-size: 12px;
          opacity: 0.9;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }

        /* Messages Area */
        .chatbot-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #f8fafc;
        }

        .message-wrapper {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          animation: slideIn 0.3s ease;
        }

        .message-wrapper.user {
          justify-content: flex-end;
        }

        .message-avatar {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .message-content {
          max-width: 70%;
        }

        .message-bubble {
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.5;
          word-wrap: break-word;
        }

        .message-bubble.bot {
          background: white;
          color: #1e293b;
          border-top-left-radius: 4px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .message-bubble.user {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-top-right-radius: 4px;
        }

        .message-time {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 4px;
          display: block;
        }

        /* Typing Indicator */
        .typing-indicator {
          background: white;
          padding: 12px 16px;
          border-radius: 18px;
          border-top-left-radius: 4px;
          display: flex;
          gap: 4px;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: #94a3b8;
          border-radius: 50%;
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        /* Quick Replies */
        .quick-replies {
          padding: 16px 20px;
          background: white;
          border-top: 1px solid #e2e8f0;
        }

        .quick-replies-title {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        .quick-replies-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .quick-reply-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 13px;
          color: #1e293b;
        }

        .quick-reply-btn:hover {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .reply-icon {
          font-size: 16px;
        }

        /* Input Area */
        .chatbot-input-area {
          padding: 16px 20px;
          background: white;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 10px;
        }

        .chat-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 25px;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .chat-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .send-btn {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .send-btn:hover:not(:disabled) {
          transform: scale(1.1);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .send-icon {
          font-size: 18px;
         
        }

        /* Animations */
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-6px);
          }
        }

        /* Responsive */
        @media (max-width: 480px) {
          .chatbot-window {
            width: calc(100vw - 40px);
            height: 500px;
            right: 0;
            bottom: 70px;
          }

          .chatbot-toggle {
            padding: 10px 20px;
          }

          .toggle-text {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Chatbot;