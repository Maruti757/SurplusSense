const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');

// Simple FAQ responses
const faqResponses = {
  'hello': 'Hello! How can I help you today?',
  'hi': 'Hi there! How can I assist you?',
  'how to donate': 'To donate food, first register as a donor, then go to "Add Donation" in your dashboard. You can add either packaged or cooked food items.',
  'donate': 'To donate food, first register as a donor, then go to "Add Donation" in your dashboard. You can add either packaged or cooked food items.',
  'donation': 'To donate food, first register as a donor, then go to "Add Donation" in your dashboard. You can add either packaged or cooked food items.',
  'how to receive': 'To receive donations, register as a receiver. Once approved, you will receive notifications about available donations in your area.',
  'receive': 'To receive donations, register as a receiver. Once approved, you will receive notifications about available donations in your area.',
  'pickup': 'After accepting a donation, you will receive a unique pickup ID. Share this ID with the donor when you go to pick up the food.',
  'what is pickup id': 'The pickup ID is a unique code generated when you accept a donation. It helps verify your identity when collecting the food from the donor.',
  'expiry date': 'For packaged foods, please provide the manufacture and expiry dates. Our system will analyze if the item is safe for donation.',
  'manufacture date': 'For packaged foods, please provide the manufacture and expiry dates. Our system will analyze if the item is safe for donation.',
  'packaged food': 'Packaged food items include items like biscuits, chips, etc. You need to upload images and provide manufacture/expiry dates.',
  'cooked food': 'Cooked food includes meals like rice, curry, etc. Please upload photos and provide preparation time.',
  'location': 'You can search for a location using the address or use your current location. The map helps pin-point the exact pickup location.',
  'map': 'You can search for a location using the address or use your current location. The map helps pin-point the exact pickup location.',
  'address': 'You can search for a location using the address or use your current location. Add a landmark for easier navigation.',
  'otp': 'OTP (One Time Password) is sent to your email for verification during registration and login.',
  'verification': 'OTP (One Time Password) is sent to your email for verification during registration and login.',
  'ngo': 'NGOs can register as receivers to receive food donations for their beneficiaries.',
  'orphanage': 'Orphanages can register as receivers to receive food donations for children.',
  'restaurant': 'Restaurants can register as donors to donate excess food.',
  'hotel': 'Hotels can register as donors to donate excess food.',
  'contact': 'You can contact the donor/receiver through the phone number provided in the donation details.',
  'help': 'I can help you with: donations, receiving food, pickup process, OTP verification, and more. Just ask!',
  'default': 'I\'m here to help! You can ask me about:\n- How to donate food\n- How to receive donations\n- Pickup process\n- OTP verification\n- Packaged vs cooked food\n- And more!'
};

// Find best matching response
const findResponse = (message) => {
  const lowerMessage = message.toLowerCase();
  
  for (const [key, value] of Object.entries(faqResponses)) {
    if (lowerMessage.includes(key)) {
      return value;
    }
  }
  
  return faqResponses.default;
};

// Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    
    // Save user message
    const userMessage = new ChatMessage({
      userId,
      sessionId: sessionId || 'default',
      message,
      isFromBot: false
    });
    await userMessage.save();
    
    // Get bot response
    const botResponse = findResponse(message);
    
    // Save bot message
    const botMessage = new ChatMessage({
      userId,
      sessionId: sessionId || 'default',
      message: botResponse,
      isFromBot: true
    });
    await botMessage.save();
    
    res.json({ 
      response: botResponse,
      sessionId: sessionId || 'default'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get chat history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.query;
    
    const query = { sessionId };
    if (userId) query.userId = userId;
    
    const messages = await ChatMessage.find(query)
      .sort({ timestamp: 1 })
      .limit(50);
    
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
