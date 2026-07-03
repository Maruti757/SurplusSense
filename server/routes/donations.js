const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const User = require('../models/User');
const AppSettings = require('../models/AppSettings');
const Notification = require('../models/Notification');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const { sendNewDonationNotification, sendThankYouEmail } = require('../utils/email');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'foodshare_secret_key');
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GAMIFICATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const awardPoints = async (donorId, freshnessScore, earlyBonus) => {
  let points = 10; // base
  if (earlyBonus) points += 15;
  if (freshnessScore > 80) points += 5;

  await User.findByIdAndUpdate(donorId, {
    $inc: { points }
  });

  return points;
};

/**
 * Update donor's aggregated stats after a successful donation.
 */
const updateDonorStats = async (donorId, quantity, freshnessScore) => {
  const user = await User.findById(donorId);
  if (!user) return;

  const newTotal = (user.totalDonations || 0) + 1;
  const newQty = (user.totalQuantityDonated || 0) + quantity;
  const newFreshnessSum = (user.freshnessScoreSum || 0) + freshnessScore;
  const newAvgFreshness = newFreshnessSum / newTotal;

  await User.findByIdAndUpdate(donorId, {
    totalDonations: newTotal,
    totalQuantityDonated: newQty,
    freshnessScoreSum: newFreshnessSum,
    avgFreshnessScore: Math.round(newAvgFreshness)
  });
};

// Analyze cooked food based on preparation time
const analyzeCookedFood = (foodName, preparationTime) => {
  const prepTime = parseInt(preparationTime) || 0;
  const foodNameLower = (foodName || '').toLowerCase();
  
  const hoursSincePreparation = prepTime;
  
  const spoilageTimes = {
    'rice': 4, 'dal': 4, 'curry': 4, 'soup': 3, 'gravy': 4,
    'vegetables': 4, 'paneer': 3, 'chicken': 2, 'meat': 2, 'fish': 2,
    'egg': 3, 'paratha': 4, 'roti': 6, 'chapati': 6,
    'biryani': 6, 'pulao': 6, 'fried rice': 6, 'noodles': 5, 'pasta': 5,
    'sandwich': 4, 'burger': 4, 'pizza': 4, 'samosa': 6,
    'pakora': 6, 'chaat': 5, 'bhelpuri': 4,
    'pickle': 48, 'chutney': 24, 'papad': 48, 'chips': 168,
    'biscuit': 168, 'cake': 72, 'bread': 72
  };
  
  let maxSafeHours = 4;
  for (const [key, hours] of Object.entries(spoilageTimes)) {
    if (foodNameLower.includes(key)) {
      maxSafeHours = hours;
      break;
    }
  }
  
  let isValid = true;
  let safetyScore = 100;
  let status = 'fresh';
  let message = '';
  let recommendations = [];
  
  if (hoursSincePreparation <= 0) {
    status = 'fresh'; safetyScore = 100;
    message = '✅ Freshly prepared - Safe for donation!';
    recommendations = ['Food appears to be freshly prepared', 'Ideal for donation - recipients will receive fresh food', 'Ensure food is stored properly until pickup'];
  } else if (hoursSincePreparation <= 2) {
    status = 'fresh'; safetyScore = 95;
    message = '✅ Very Fresh - Prepared recently, safe for donation!';
    recommendations = ['Food is fresh and safe', 'Best quality for donation', 'Ensure proper handling until pickup'];
  } else if (hoursSincePreparation <= maxSafeHours) {
    status = 'good'; safetyScore = 80;
    message = `⚠️ Good - ${hoursSincePreparation} hours since preparation. Still safe.`;
    recommendations = ['Food is still within safe time limit', 'Donate soon for best quality', 'Inform recipient about preparation time'];
  } else if (hoursSincePreparation <= maxSafeHours + 2) {
    status = 'use caution'; safetyScore = 50;
    message = `⚠️ CAUTION - ${hoursSincePreparation} hours since preparation. Use quickly.`;
    recommendations = ['Food is approaching spoilage time', 'Only donate if recipient can consume immediately', 'Clearly inform recipient about age of food', 'Consider not donating if food has been left unrefrigerated'];
  } else {
    isValid = false; status = 'spoiled'; safetyScore = 10;
    message = `🚫 SPOILED - ${hoursSincePreparation} hours since preparation. NOT safe!`;
    recommendations = ['Food has exceeded safe preparation time', 'High risk of bacterial growth', 'Do NOT donate - may cause food poisoning', 'Dispose of food properly'];
  }
  
  return { isValid, message, hoursSincePreparation, maxSafeHours, safetyScore, status, recommendations, foodName: foodName || 'Unknown', analysisType: 'cooked' };
};

// ─── Public: Analyze food (used by donation form) ──────────────────────────
router.post('/analyze', async (req, res) => {
  try {
    const { foodType, manufactureDate, expiryDate, preparationTime, foodName } = req.body;
    
    if (foodType === 'cooked') {
      const analysis = analyzeCookedFood(foodName, preparationTime);
      return res.json({ analysis });
    }
    
    if (foodType !== 'packaged') {
      return res.json({ analysis: { isValid: true, message: 'Unknown food type.', daysUntilExpiry: null, safetyScore: 70, status: 'unknown', recommendations: ['Please ensure food is fresh.'] } });
    }
    
    const mfd = new Date(manufactureDate);
    const exp = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    const totalShelfLife = Math.ceil((exp - mfd) / (1000 * 60 * 60 * 24));
    const remainingPercentage = Math.round((daysUntilExpiry / totalShelfLife) * 100);
    
    if (exp <= mfd) return res.json({ analysis: { isValid: false, message: 'Expiry date must be after manufacture date', daysUntilExpiry: null, safetyScore: 0, status: 'invalid', recommendations: ['Please check the dates entered'] } });
    if (daysUntilExpiry < 0) return res.json({ analysis: { isValid: false, message: '⚠️ EXPIRED! This item has already expired and cannot be donated.', daysUntilExpiry, safetyScore: 0, status: 'expired', recommendations: ['This item has expired and should not be consumed', 'Please dispose of this item properly', 'Do not attempt to donate expired food'] } });
    
    let isValid = true, safetyScore = 100, status = 'fresh', recommendations = [], message = '';
    if (daysUntilExpiry <= 3) { isValid = false; safetyScore = 10; status = 'critical'; message = `🚫 EXPIRES SOON - Only ${daysUntilExpiry} days until expiry. Not safe for donation.`; recommendations = ['This item will expire within 3 days', 'Not recommended for donation as recipient may not have time to use it', 'Consider disposing of this item']; }
    else if (daysUntilExpiry <= 7) { safetyScore = 40; status = 'expiring soon'; message = `⚠️ Expiring Soon - ${daysUntilExpiry} days until expiry. Use caution.`; recommendations = ['This item expires within a week', 'Only donate if recipient can use immediately', 'Inform recipient about the short shelf life']; }
    else if (daysUntilExpiry <= 14) { safetyScore = 70; status = 'use soon'; message = `⏰ Use Soon - ${daysUntilExpiry} days until expiry. Still safe but limited time.`; recommendations = ['This item is still safe to donate', 'Recommend to use within 2 weeks', 'Inform recipient about expiry date']; }
    else if (daysUntilExpiry <= 30) { safetyScore = 85; status = 'good'; message = `✅ Good - ${daysUntilExpiry} days until expiry. Safe for donation.`; recommendations = ['This item is in good condition', 'Safe for donation with ample time for consumption']; }
    else { safetyScore = 100; status = 'excellent'; message = `⭐ Excellent - ${daysUntilExpiry} days until expiry. Perfect for donation!`; recommendations = ['This item is in excellent condition', 'Ideal for donation with plenty of shelf life remaining']; }
    
    res.json({ analysis: { isValid, message, daysUntilExpiry, safetyScore, status, remainingShelfLife: remainingPercentage, recommendations } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Create single donation ────────────────────────────────────────────────
router.post('/', verifyToken, upload.array('images', 5), async (req, res) => {
  try {
    const {
      foodType, donorName, donationAmount, donationDate, foodName, quantity, unit,
      brandName, manufactureDate, expiryDate, mealType, preparationTime,
      pickupDeadline, description, street, city, state, zipCode, landmark, lat, lng
    } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // ── Gamification: compute freshness score ──────────────────────────────
    let freshnessScore = 50;
    if (foodType === 'cooked') {
      const analysis = analyzeCookedFood(foodName, preparationTime);
      freshnessScore = analysis.safetyScore;
    } else if (foodType === 'packaged' && expiryDate) {
      const daysLeft = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 30) freshnessScore = 100;
      else if (daysLeft > 14) freshnessScore = 85;
      else if (daysLeft > 7) freshnessScore = 70;
      else if (daysLeft > 3) freshnessScore = 40;
      else freshnessScore = 10;
    }

    // ── Gamification: check early donation bonus (before 9PM / 21:00) ──────
    const now = new Date();
    const donationHour = now.getHours();
    const earlyDonationBonus = donationHour < 21;

    const donationData = {
      donorId: req.userId,
      foodType, donorName, donationAmount, donationDate, foodName,
      quantity, unit, brandName, manufactureDate, expiryDate,
      preparationTime, pickupDeadline, description,
      address: {
        street, city, state, zipCode, landmark,
        location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined
      },
      images: req.files ? req.files.map(f => f.path) : [],
      freshnessScore,
      earlyDonationBonus,
      donationHour
    };

    if (mealType && mealType.trim() !== '') donationData.mealType = mealType;

    if ((!street || !city) && user.address) {
      donationData.address = {
        street: street || user.address.street || '',
        city: city || user.address.city || '',
        state: state || user.address.state || '',
        zipCode: zipCode || user.address.zipCode || '',
        landmark: landmark || user.address.landmark || '',
        location: (lat && lng) ? { lat: parseFloat(lat), lng: parseFloat(lng) } : (user.address.location || null)
      };
    }

    const donation = new Donation(donationData);
    await donation.save();

    // ── Award points and update donor stats ───────────────────────────────
    const pointsAwarded = await awardPoints(req.userId, freshnessScore, earlyDonationBonus);
    donation.pointsAwarded = pointsAwarded;
    await donation.save();
    await updateDonorStats(req.userId, Number(quantity) || 0, freshnessScore);

    // ── Priority listing: premium donors' donations shown first ───────────
    // (handled on the GET query by sorting isPremium donors first)

    const io = req.app.get('io');
    const receivers = await User.find({ role: 'receiver', isSuspended: false });
    
    for (const receiver of receivers) {
      const notification = new Notification({
        receiverId: receiver._id,
        donationId: donation._id,
        message: `New donation available: ${quantity} ${unit} of ${foodName}`,
        type: 'new_donation'
      });
      await notification.save();
      
      if (io) {
        io.to(receiver._id.toString()).emit('new_donation', {
          donationId: donation._id,
          message: notification.message,
          foodName, quantity, unit
        });
      }
      
      await sendNewDonationNotification(receiver, donation, user);
    }
    
    res.status(201).json({
      message: 'Donation created successfully',
      donation,
      pointsAwarded,
      earlyDonationBonus,
      freshnessScore
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Bulk Donation ─────────────────────────────────────────────────────────
router.post('/bulk', verifyToken, upload.array('images', 20), async (req, res) => {
  try {
    const { items, pickupDeadline } = req.body;
    const parsedItems = JSON.parse(items);
    const files = req.files || [];
    
    const donations = [];
    const user = await User.findById(req.userId);
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = new Date();
    const donationHour = now.getHours();
    const earlyDonationBonus = donationHour < 21;
    
    for (let i = 0; i < parsedItems.length; i++) {
      const item = parsedItems[i];

      // Compute freshness for each item
      let freshnessScore = 50;
      if (item.foodType === 'cooked') {
        const analysis = analyzeCookedFood(item.foodName, item.preparationTime);
        freshnessScore = analysis.safetyScore;
      } else if (item.expiryDate) {
        const daysLeft = Math.ceil((new Date(item.expiryDate) - now) / (1000 * 60 * 60 * 24));
        if (daysLeft > 30) freshnessScore = 100;
        else if (daysLeft > 14) freshnessScore = 85;
        else if (daysLeft > 7) freshnessScore = 70;
        else if (daysLeft > 3) freshnessScore = 40;
        else freshnessScore = 10;
      }
      
      const donationData = {
        donorId: req.userId,
        foodType: item.foodType || 'packaged',
        foodName: item.foodName,
        quantity: item.quantity,
        unit: item.unit,
        brandName: item.brandName || '',
        manufactureDate: item.manufactureDate || null,
        expiryDate: item.expiryDate || null,
        mealType: item.mealType || null,
        preparationTime: item.preparationTime || null,
        pickupDeadline,
        status: 'pending',
        address: user.address || {},
        freshnessScore,
        earlyDonationBonus,
        donationHour
      };
      
      if (files[i]) donationData.images = [files[i].path];
      
      const donation = new Donation(donationData);
      await donation.save();

      // Award points per item
      const pts = await awardPoints(req.userId, freshnessScore, earlyDonationBonus);
      donation.pointsAwarded = pts;
      await donation.save();
      await updateDonorStats(req.userId, Number(item.quantity) || 0, freshnessScore);

      donations.push(donation);
    }
    
    const io = req.app.get('io');
    const receivers = await User.find({ role: 'receiver', isSuspended: false });
    
    for (const donation of donations) {
      for (const receiver of receivers) {
        const notification = new Notification({
          receiverId: receiver._id,
          donationId: donation._id,
          message: `New bulk donation: ${donation.quantity} ${donation.unit} of ${donation.foodName}`,
          type: 'new_donation'
        });
        await notification.save();
        
        if (io) {
          io.to(receiver._id.toString()).emit('new_donation', {
            donationId: donation._id,
            message: notification.message,
            foodName: donation.foodName,
            quantity: donation.quantity,
            unit: donation.unit
          });
        }
      }
    }
    
    res.status(201).json({ success: true, message: `${donations.length} donations created successfully`, donations });
  } catch (error) {
    console.error('Bulk donation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Get all donations ────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, foodType, city } = req.query;

    const query = { status: 'pending', isActive: true };
    if (foodType) query.foodType = foodType;
    if (city) query['address.city'] = city;

    const donations = await Donation.find(query)
      .populate('donorId', 'name organizationName phone address')
      .sort({ createdAt: -1 });

    res.json({ donations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Get my donations (with premium CSV export endpoint) ──────────────────
router.get('/my-donations', verifyToken, async (req, res) => {
  try {
    const donations = await Donation.find({ donorId: req.userId })
      .populate('receiverId', 'name organizationName phone')
      .sort({ createdAt: -1 });
    
    res.json({ donations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Get single donation ───────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donorId', 'name organizationName phone email address isPremium')
      .populate('receiverId', 'name organizationName phone');
    
    if (!donation) return res.status(404).json({ message: 'Donation not found' });
    res.json({ donation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Update donation ───────────────────────────────────────────────────────
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const donation = await Donation.findOne({ _id: req.params.id, donorId: req.userId });
    if (!donation) return res.status(404).json({ message: 'Donation not found or unauthorized' });
    if (donation.status !== 'pending') return res.status(400).json({ message: 'Cannot update donation after acceptance' });

    const updates = req.body;
    Object.assign(donation, updates);
    await donation.save();
    res.json({ message: 'Donation updated successfully', donation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Delete donation ───────────────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const donation = await Donation.findOne({ _id: req.params.id, donorId: req.userId });
    if (!donation) return res.status(404).json({ message: 'Donation not found or unauthorized' });
    if (donation.status !== 'pending') return res.status(400).json({ message: 'Cannot delete donation after acceptance' });

    donation.isActive = false;
    await donation.save();
    res.json({ message: 'Donation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Verify pickup by donor ────────────────────────────────────────────────
router.post('/verify-pickup/:id', verifyToken, async (req, res) => {
  try {
    const { pickupId } = req.body;
    
    const donation = await Donation.findOne({
      _id: req.params.id,
      donorId: req.userId
    }).populate('donorId');
    
    if (!donation) return res.status(404).json({ message: 'Donation not found or unauthorized' });
    if (donation.status !== 'accepted') return res.status(400).json({ message: 'This donation is not in accepted state' });
    if (donation.pickupId !== pickupId) return res.status(400).json({ message: 'Invalid pickup ID' });
    
    const receiver = await User.findById(donation.receiverId);
    donation.status = 'picked_up';
    await donation.save();
    
    await sendThankYouEmail(donation.donorId, receiver, donation);
    
    res.json({ message: 'Pickup verified successfully! Thank you for your donation.', donation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;