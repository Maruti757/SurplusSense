const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Donation = require('../models/Donation');
const Advertisement = require('../models/Advertisement');
const AppSettings = require('../models/AppSettings');

// ─── Admin Auth Middleware ─────────────────────────────────────────────────
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'foodshare_secret_key');
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// ─── Multer for Ad Uploads ─────────────────────────────────────────────────
const adsDir = path.join(__dirname, '../uploads/ads');
if (!fs.existsSync(adsDir)) fs.mkdirSync(adsDir, { recursive: true });

const adStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, adsDir),
  filename: (req, file, cb) => cb(null, `ad_${Date.now()}${path.extname(file.originalname)}`)
});
const uploadAd = multer({
  storage: adStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|webm|mov/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.split('/')[1]);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image/video files allowed'));
  }
});

// ─── Helper: ensure AppSettings doc exists ────────────────────────────────
const getSettings = async () => {
  let settings = await AppSettings.findOne({ key: 'global' });
  if (!settings) {
    settings = await AppSettings.create({ key: 'global' });
  }
  return settings;
};

// ══════════════════════════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════════════════════════
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalDonors,
      totalReceivers,
      totalDonations,
      todayDonations,
      activeDonations,
      completedDonations,
      suspendedUsers,
      settings
    ] = await Promise.all([
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'receiver' }),
      Donation.countDocuments(),
      Donation.countDocuments({ createdAt: { $gte: today } }),
      Donation.countDocuments({ status: 'pending' }),
      Donation.countDocuments({ status: 'picked_up' }),
      User.countDocuments({ isSuspended: true }),
      getSettings()
    ]);

    // Total quantity donated
    const qtyAgg = await Donation.aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    const totalQuantity = qtyAgg[0]?.total || 0;

    // Early donations today
    const earlyToday = await Donation.countDocuments({
      createdAt: { $gte: today },
      earlyDonationBonus: true
    });

    res.json({
      totalDonors,
      totalReceivers,
      totalDonations,
      todayDonations,
      activeDonations,
      completedDonations,
      suspendedUsers,
      totalQuantity,
      earlyToday,
      settings: {
        maxReceivesPerDay: settings.maxReceivesPerDay,
        minReceivesPerDay: settings.minReceivesPerDay,
        earlyDonationMultiplier: settings.earlyDonationMultiplier
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════

// Get all users (donors or receivers)
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const { role, search, status } = req.query;
    const query = {};
    if (role && role !== 'all') query.role = role;
    if (status === 'suspended') query.isSuspended = true;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { organizationName: { $regex: search, $options: 'i' } },
        { uniqueId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -otp')
      .sort({ createdAt: -1 });

    // For receivers, compute totalReceived stats
    const usersData = await Promise.all(users.map(async (u) => {
      const userData = u.toObject();
      if (u.role === 'receiver') {
        const totalReceived = await Donation.countDocuments({
          receiverId: u._id,
          status: { $in: ['accepted', 'picked_up'] }
        });
        const totalPickedUp = await Donation.countDocuments({
          receiverId: u._id,
          status: 'picked_up'
        });
        // Sum total quantity received
        const qtyAgg = await Donation.aggregate([
          { $match: { receiverId: u._id, status: { $in: ['accepted', 'picked_up'] } } },
          { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]);
        userData.totalReceived = totalReceived;
        userData.totalPickedUp = totalPickedUp;
        userData.totalQuantityReceived = qtyAgg[0]?.total || 0;
      }
      return userData;
    }));

    res.json({ users: usersData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single user with full details
router.get('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -otp');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Get their donation history
    let donationHistory = [];
    const userData = user.toObject();

    if (user.role === 'donor') {
      donationHistory = await Donation.find({ donorId: user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('foodName quantity unit status createdAt freshnessScore earlyDonationBonus pointsAwarded');
    } else if (user.role === 'receiver') {
      donationHistory = await Donation.find({ receiverId: user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('foodName quantity unit status createdAt freshnessScore')
        .populate('donorId', 'name organizationName');

      // Compute receiver stats
      const totalReceived = await Donation.countDocuments({
        receiverId: user._id,
        status: { $in: ['accepted', 'picked_up'] }
      });
      const totalPickedUp = await Donation.countDocuments({
        receiverId: user._id,
        status: 'picked_up'
      });
      const qtyAgg = await Donation.aggregate([
        { $match: { receiverId: user._id, status: { $in: ['accepted', 'picked_up'] } } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]);
      userData.totalReceived = totalReceived;
      userData.totalPickedUp = totalPickedUp;
      userData.totalQuantityReceived = qtyAgg[0]?.total || 0;
    }

    res.json({ user: userData, donationHistory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Suspend user
router.put('/users/:id/suspend', verifyAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot suspend admin' });

    user.isSuspended = true;
    user.suspendedReason = reason || 'Violation of terms of service';
    user.suspendedAt = new Date();
    await user.save();

    res.json({ message: `${user.name} has been suspended`, user: { id: user._id, isSuspended: true } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Unsuspend user
router.put('/users/:id/unsuspend', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isSuspended = false;
    user.suspendedReason = '';
    user.suspendedAt = undefined;
    await user.save();

    res.json({ message: `${user.name} has been unsuspended`, user: { id: user._id, isSuspended: false } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user (hard delete - use with caution)
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete admin' });

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: `User ${user.name} deleted permanently` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// LEADERBOARD — Top 10 Donors
// ══════════════════════════════════════════════════════════════════════════
router.get('/leaderboard', verifyAdmin, async (req, res) => {
  try {
    const { criteria = 'points' } = req.query;

    let sortField = 'points';
    if (criteria === 'quantity') sortField = 'totalQuantityDonated';
    else if (criteria === 'count') sortField = 'totalDonations';
    else if (criteria === 'freshness') sortField = 'avgFreshnessScore';
    else if (criteria === 'points') sortField = 'points';

    const donors = await User.find({ role: 'donor' })
      .select('name organizationName organizationType address points totalDonations totalQuantityDonated avgFreshnessScore isSuspended uniqueId createdAt profileImage')
      .sort({ [sortField]: -1 })
      .limit(10);

    // Attach rank
    const leaderboard = donors.map((d, idx) => ({
      rank: idx + 1,
      ...d.toObject()
    }));

    res.json({ leaderboard, criteria });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Public leaderboard (visible on landing page or donor dashboard)
router.get('/leaderboard/public', async (req, res) => {
  try {
    const donors = await User.find({ role: 'donor', isSuspended: false })
      .select('name organizationName points totalDonations totalQuantityDonated avgFreshnessScore')
      .sort({ points: -1 })
      .limit(10);

    const leaderboard = donors.map((d, idx) => ({
      rank: idx + 1,
      ...d.toObject()
    }));

    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// DONATION CHART — Line chart data
// ══════════════════════════════════════════════════════════════════════════
router.get('/donations/chart', verifyAdmin, async (req, res) => {
  try {
    const { period = '30days', type = 'daily', date } = req.query;

    let startDate = new Date();
    if (period === '7days') startDate.setDate(startDate.getDate() - 7);
    else if (period === '30days') startDate.setDate(startDate.getDate() - 30);
    else if (period === '90days') startDate.setDate(startDate.getDate() - 90);
    else if (period === '1year') startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setHours(0, 0, 0, 0);

    if (type === 'hourly') {
      // Donations by hour of day — supports date picker
      let dayStart, dayEnd;
      if (date) {
        dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
      } else {
        dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        dayEnd = new Date();
        dayEnd.setHours(23, 59, 59, 999);
      }

      const hourlyData = await Donation.aggregate([
        { $match: { createdAt: { $gte: dayStart, $lte: dayEnd } } },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 },
            quantity: { $sum: '$quantity' },
            earlyBonus: { $sum: { $cond: ['$earlyDonationBonus', 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Fill missing hours with 0
      const chartData = Array.from({ length: 24 }, (_, h) => {
        const found = hourlyData.find(d => d._id === h);
        return {
          hour: h,
          label: `${h.toString().padStart(2, '0')}:00`,
          count: found?.count || 0,
          quantity: found?.quantity || 0,
          earlyBonus: found?.earlyBonus || 0,
          isEarlyWindow: h < 21  // before 9 PM
        };
      });

      const selectedDate = date || new Date().toISOString().split('T')[0];
      return res.json({ type: 'hourly', date: selectedDate, data: chartData });
    }

    // Daily aggregation
    const dailyData = await Donation.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          quantity: { $sum: '$quantity' },
          earlyBonus: { $sum: { $cond: ['$earlyDonationBonus', 1, 0] } },
          avgFreshness: { $avg: '$freshnessScore' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const chartData = dailyData.map(d => ({
      date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
      count: d.count,
      quantity: d.quantity,
      earlyBonus: d.earlyBonus,
      avgFreshness: Math.round(d.avgFreshness || 0)
    }));

    res.json({ type: 'daily', period, data: chartData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// ALL DONATIONS (admin view)
// ══════════════════════════════════════════════════════════════════════════
router.get('/donations', verifyAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const donations = await Donation.find(query)
      .populate('donorId', 'name organizationName isPremium')
      .populate('receiverId', 'name organizationName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Donation.countDocuments(query);

    res.json({ donations, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// ADVERTISEMENT MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════

// Get all ads
router.get('/ads', verifyAdmin, async (req, res) => {
  try {
    const ads = await Advertisement.find()
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ ads });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Public: get active ads for landing page
router.get('/ads/public', async (req, res) => {
  try {
    const { slot } = req.query;
    const query = {
      isActive: true,
      $or: [{ endDate: { $gte: new Date() } }, { endDate: null }]
    };
    if (slot) query.slot = slot;

    const ads = await Advertisement.find(query).select('-uploadedBy').sort({ createdAt: -1 });
    res.json({ ads });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload new ad
router.post('/ads', verifyAdmin, uploadAd.single('file'), async (req, res) => {
  try {
    if (!req.file && !req.body.generatedImageUrl) {
      return res.status(400).json({ message: 'No file uploaded or generated image URL provided' });
    }

    const { title, description, slot, linkUrl, startDate, endDate, generatedImageUrl } = req.body;
    let isVideo = false;
    let fileUrl = '';

    if (req.file) {
      isVideo = /mp4|webm|mov/.test(path.extname(req.file.originalname).toLowerCase());
      fileUrl = `/uploads/ads/${req.file.filename}`;
    } else {
      fileUrl = generatedImageUrl;
      isVideo = false;
    }

    const ad = new Advertisement({
      title,
      description: description || '',
      type: isVideo ? 'video' : 'image',
      fileUrl,
      slot: slot || 'banner',
      linkUrl: linkUrl || '',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      uploadedBy: req.userId,
      isActive: true
    });

    await ad.save();
    res.status(201).json({ message: 'Advertisement uploaded successfully', ad });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update ad (toggle active, change slot, etc.)
router.put('/ads/:id', verifyAdmin, async (req, res) => {
  try {
    const { isActive, slot, title, description, linkUrl, endDate } = req.body;
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Ad not found' });

    if (isActive !== undefined) ad.isActive = isActive;
    if (slot) ad.slot = slot;
    if (title) ad.title = title;
    if (description !== undefined) ad.description = description;
    if (linkUrl !== undefined) ad.linkUrl = linkUrl;
    if (endDate !== undefined) ad.endDate = endDate ? new Date(endDate) : null;

    await ad.save();
    res.json({ message: 'Advertisement updated', ad });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete ad
router.delete('/ads/:id', verifyAdmin, async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Ad not found' });

    // Remove file from disk
    const filePath = path.join(__dirname, '../', ad.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await Advertisement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Advertisement deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Record ad view
router.post('/ads/:id/view', async (req, res) => {
  try {
    await Advertisement.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════════════════════
router.get('/settings', verifyAdmin, async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/settings', verifyAdmin, async (req, res) => {
  try {
    const { minReceivesPerDay, maxReceivesPerDay, earlyDonationMultiplier, aiImageApiUrl, aiImageApiKey } = req.body;
    const settings = await getSettings();

    if (minReceivesPerDay !== undefined) settings.minReceivesPerDay = minReceivesPerDay;
    if (maxReceivesPerDay !== undefined) settings.maxReceivesPerDay = maxReceivesPerDay;
    if (earlyDonationMultiplier !== undefined) settings.earlyDonationMultiplier = earlyDonationMultiplier;
    if (aiImageApiUrl !== undefined) settings.aiImageApiUrl = aiImageApiUrl;
    if (aiImageApiKey !== undefined) settings.aiImageApiKey = aiImageApiKey;

    await settings.save();
    res.json({ message: 'Settings updated', settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// CUSTOM AI IMAGE GENERATION
// ══════════════════════════════════════════════════════════════════════════
router.post('/generate-image', verifyAdmin, async (req, res) => {
  try {
    const { prompt } = req.body;
    const settings = await getSettings();
    const axios = require('axios');

    // If no API key is provided, use the free and unlimited Pollinations AI API
    if (!settings.aiImageApiUrl || !settings.aiImageApiKey) {
      const seed = Math.floor(Math.random() * 100000);
      const enhancedPrompt = prompt + ", highly detailed, clear image, no gibberish text, no random letters, clean background";
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1080&height=500&nologo=true&seed=${seed}`;
      
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const mimeType = response.headers['content-type'] || 'image/jpeg';
      return res.json({ url: `data:${mimeType};base64,${base64}` });
    }

    // Check if it is a Google Gemini API URL
    if (settings.aiImageApiUrl.includes('generativelanguage.googleapis.com')) {
      try {
        const url = settings.aiImageApiUrl.includes('?key=') 
          ? settings.aiImageApiUrl 
          : `${settings.aiImageApiUrl}?key=${settings.aiImageApiKey}`;
          
        let payload = { instances: [{ prompt: prompt }], parameters: { sampleCount: 1 } };
        if (url.includes(':generateContent')) {
          payload = { contents: [{ parts: [{ text: prompt }] }] };
        }
        
        const response = await axios.post(
          url,
          payload,
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        let base64 = response.data?.predictions?.[0]?.bytesBase64Encoded;
        let mimeType = response.data?.predictions?.[0]?.mimeType || 'image/jpeg';
        
        if (!base64 && response.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
          base64 = response.data.candidates[0].content.parts[0].inlineData.data;
          mimeType = response.data.candidates[0].content.parts[0].inlineData.mimeType;
        }

        if (base64) {
          return res.json({ url: `data:${mimeType};base64,${base64}` });
        } else {
          return res.status(500).json({ message: 'Invalid response from Gemini API' });
        }
      } catch (error) {
        if (error.response?.status === 404) {
          try {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${settings.aiImageApiKey}`;
            const listRes = await axios.get(listUrl);
            const models = listRes.data.models || [];
            const imgModels = models.filter(m => m.name.toLowerCase().includes('image') || m.name.toLowerCase().includes('vision')).map(m => m.name);
            return res.status(404).json({ message: `Model not found. Try one of these available models in your URL: ${imgModels.join(', ')}` });
          } catch (listErr) {
            // ignore list error, throw original
          }
        }
        throw error; // Let the outer catch handle it
      }
    }

    // Check if it is a Hugging Face Inference API URL
    if (settings.aiImageApiUrl.includes('huggingface.co')) {
      const response = await axios.post(
        settings.aiImageApiUrl,
        { inputs: prompt },
        { 
          headers: { Authorization: `Bearer ${settings.aiImageApiKey}` },
          responseType: 'arraybuffer' 
        }
      );
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const mimeType = response.headers['content-type'] || 'image/jpeg';
      return res.json({ url: `data:${mimeType};base64,${base64}` });
    } else {
      // Standard OpenAI / OpenRouter Compatible Image Generation API
      const response = await axios.post(
        settings.aiImageApiUrl,
        { prompt, n: 1, size: "1024x1024" },
        { headers: { Authorization: `Bearer ${settings.aiImageApiKey}`, 'Content-Type': 'application/json' } }
      );
      const url = response.data.data?.[0]?.url;
      if (url) return res.json({ url });
      return res.status(500).json({ message: 'Invalid response from AI API' });
    }
  } catch (error) {
    res.status(500).json({ message: error.response?.data?.error?.message || error.message });
  }
});

// Reset donor points
router.put('/users/:id/reset-points', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.points = 0;
    await user.save();
    res.json({ message: `Points reset for ${user.name}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// RECALCULATE ALL DONOR STATS from actual Donation documents
// ══════════════════════════════════════════════════════════════════════════
router.post('/recalculate-stats', verifyAdmin, async (req, res) => {
  try {
    const donors = await User.find({ role: 'donor' });
    let updated = 0;

    for (const donor of donors) {
      const donations = await Donation.find({ donorId: donor._id });
      const totalDonations = donations.length;
      const totalQuantityDonated = donations.reduce((s, d) => s + (d.quantity || 0), 0);
      const freshnessScoreSum = donations.reduce((s, d) => s + (d.freshnessScore || 50), 0);
      const avgFreshnessScore = totalDonations > 0 ? Math.round(freshnessScoreSum / totalDonations) : 0;

      let points = 0;
      for (const d of donations) {
        let pts = 10;
        if (d.earlyDonationBonus) pts += 15;
        if ((d.freshnessScore || 0) > 80) pts += 5;
        points += pts;
      }

      await User.findByIdAndUpdate(donor._id, {
        totalDonations,
        totalQuantityDonated,
        freshnessScoreSum,
        avgFreshnessScore,
        points
      });
      updated++;
    }

    res.json({ message: `Recalculated stats for ${updated} donors`, updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
