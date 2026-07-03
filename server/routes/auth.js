const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendOTP } = require('../utils/email');

// Generate OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Send OTP to Email only
const sendOTPEmail = async (email, otp) => {
  try {
    const result = await sendOTP(email, otp);
    if (result.success) {
      console.log(`OTP email sent to ${email}`);
      return true;
    }
  } catch (error) {
    console.error('Email send error:', error.message);
  }
  return true;
};

// Register Donor
router.post('/donor/register', async (req, res) => {
  try {
    const { name, email, phone, password, organizationName, organizationType, address } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or phone' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Create user
    const user = new User({
      name,
      email,
      phone,
      password,
      organizationName,
      organizationType,
      address,
      role: 'donor',
      otp: { code: otp, expiresAt: otpExpiresAt }
    });
    
    await user.save();
    
    // Send OTP to email only
    await sendOTPEmail(email, otp);
    
    // Development mode: return OTP in response
    res.status(201).json({ 
      message: 'Registration successful. Please verify OTP.',
      userId: user._id,
      otp: otp
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Register Receiver
router.post('/receiver/register', async (req, res) => {
  try {
    const { name, email, phone, password, organizationName, organizationType, address } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or phone' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Create user (auto-approved for now)
    const user = new User({
      name,
      email,
      phone,
      password,
      organizationName,
      organizationType,
      address,
      role: 'receiver',
      isApproved: true,
      otp: { code: otp, expiresAt: otpExpiresAt }
    });
    
    await user.save();
    
    // Send OTP to email only
    await sendOTPEmail(email, otp);
    
    res.status(201).json({ 
      message: 'Registration successful. Please verify OTP. Awaiting admin approval.',
      userId: user._id,
      otp: otp
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.otp.code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({ message: 'OTP expired' });
    }
    
    user.isVerified = true;
    user.otp = undefined;
    await user.save();
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'foodshare_secret_key',
      { expiresIn: '7d' }
    );
    
    res.json({ 
      message: 'OTP verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        organizationName: user.organizationName,
        organizationType: user.organizationType,
        role: user.role,
        uniqueId: user.uniqueId
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate new OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    user.otp = { code: otp, expiresAt: otpExpiresAt };
    await user.save();
    
    // Send OTP to email only
    await sendOTPEmail(user.email, otp);
    
    res.json({ message: 'OTP resent successfully', otp: otp });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper to build user response object
const buildUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  organizationName: user.organizationName,
  organizationType: user.organizationType,
  role: user.role,
  uniqueId: user.uniqueId,
  address: user.address,
  points: user.points || 0,
  totalDonations: user.totalDonations || 0,
  isSuspended: user.isSuspended || false
});

// Admin Login (no OTP)
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      return res.status(400).json({ message: 'Invalid admin credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'foodshare_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Admin login successful',
      token,
      user: buildUserResponse(user),
      requiresOTP: false
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    const user = await User.findOne({ email, role });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check suspension
    if (user.isSuspended) {
      return res.status(403).json({ 
        message: `Your account has been suspended. Reason: ${user.suspendedReason || 'Violation of terms of service'}. Please contact support.`,
        suspended: true
      });
    }
    
    if (user.role === 'receiver' && !user.isApproved) {
      return res.status(400).json({ message: 'Your account is pending approval' });
    }
    
    if (user.isVerified) {
      // Direct login for verified users
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET || 'foodshare_secret_key',
        { expiresIn: '7d' }
      );
      
      res.json({ 
        message: 'Login successful',
        token,
        user: buildUserResponse(user),
        requiresOTP: false
      });
      return;
    }
    
    // OTP required for unverified users
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    user.otp = { code: otp, expiresAt: otpExpiresAt };
    await user.save();
    
    await sendOTPEmail(email, otp);
    
    res.json({ 
      message: 'Please verify OTP sent to your email',
      requiresOTP: true,
      userId: user._id,
      otp: otp
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify Login OTP
router.post('/verify-login-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.otp.code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({ message: 'OTP expired' });
    }
    
    user.otp = undefined;
    await user.save();
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'foodshare_secret_key',
      { expiresIn: '7d' }
    );
    
    res.json({ 
      message: 'Login successful',
      token,
      user: buildUserResponse(user)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'foodshare_secret_key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'foodshare_secret_key');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const { name, phone, organizationName, street, city, state, zipCode, landmark, lat, lng } = req.body;
    
    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (organizationName) user.organizationName = organizationName;
    
    // Update address - handle null/undefined values properly
    user.address = {
      street: street !== undefined ? street : (user.address?.street || ''),
      city: city !== undefined ? city : (user.address?.city || ''),
      state: state !== undefined ? state : (user.address?.state || ''),
      zipCode: zipCode !== undefined ? zipCode : (user.address?.zipCode || ''),
      landmark: landmark !== undefined ? landmark : (user.address?.landmark || ''),
      location: {
        lat: lat !== undefined && lat !== null ? lat : (user.address?.location?.lat || null),
        lng: lng !== undefined && lng !== null ? lng : (user.address?.location?.lng || null)
      }
    };
    
    await user.save();
    
    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        organizationName: user.organizationName,
        organizationType: user.organizationType,
        role: user.role,
        uniqueId: user.uniqueId,
        address: user.address
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
