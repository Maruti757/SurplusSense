const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Donation = require('../models/Donation');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');
const { sendDonationConfirmation, sendPickupDetailsToReceiver } = require('../utils/email');
const { getRouteInfo, formatAddress } = require('../utils/distanceCalculator');

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
    if (decoded.role !== 'receiver') {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get notifications
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ receiverId: req.userId })
      .populate('donationId')
      .sort({ createdAt: -1 });
    
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, receiverId: req.userId },
      { isRead: true },
      { new: true }
    );
    
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Accept donation - generates pickup ID for receiver
router.post('/accept/:donationId', verifyToken, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.donationId);
    
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    
    if (donation.status !== 'pending') {
      return res.status(400).json({ message: 'This donation is no longer available' });
    }
    
    // Get receiver details
    const receiver = await User.findById(req.userId);
    
    // Update donation - status becomes accepted, receiver assigned
    donation.status = 'accepted';
    donation.receiverId = req.userId;
    await donation.save();
    
    // Get donor details
    const donor = await User.findById(donation.donorId);
    
    // Send confirmation email to donor
    await sendDonationConfirmation(donor, receiver, donation);
    
    // Send pickup details to receiver
    await sendPickupDetailsToReceiver(receiver, donation, donor);
    
    res.json({
      message: 'Donation accepted successfully',
      donation,
      pickupId: donation.pickupId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reject/Decline donation
router.post('/decline/:donationId', verifyToken, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.donationId);
    
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    
    donation.status = 'rejected';
    await donation.save();
    
    res.json({ message: 'Donation declined' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get accepted donations history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const donations = await Donation.find({
      receiverId: req.userId,
      status: { $in: ['accepted', 'picked_up'] }
    })
      .populate('donorId', 'name organizationName phone email address')
      .sort({ updatedAt: -1 });
    
    res.json({ donations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get available donations with distance from receiver
router.get('/available', verifyToken, async (req, res) => {
  try {
    const { foodType, city } = req.query;
    
    // Get receiver's location
    const receiver = await User.findById(req.userId);
    
    const query = { 
      status: 'pending', 
      isActive: true,
      donorId: { $ne: req.userId }
    };
    
    if (foodType) query.foodType = foodType;
    if (city) query['address.city'] = city;
    
    const donations = await Donation.find(query)
      .populate('donorId', 'name organizationName phone address')
      .sort({ createdAt: -1 });
    
    // Calculate distance for each donation if receiver has location
    const donationsWithDistance = donations.map(donation => {
      const donationObj = donation.toObject();
      
      if (receiver?.address?.location?.lat && receiver.address.location.lng && 
          donationObj.address?.location?.lat && donation.address.location.lng) {
        const routeInfo = getRouteInfo(
          receiver.address.location.lat,
          receiver.address.location.lng,
          donation.address.location.lat,
          donation.address.location.lng
        );
        
        donationObj.distance = routeInfo;
        donationObj.distanceText = routeInfo.distanceText;
      } else {
        donationObj.distance = null;
        donationObj.distanceText = donationObj.address?.city || 'Location not available';
      }
      
      return donationObj;
    });
    
    // Sort by distance if available
    donationsWithDistance.sort((a, b) => {
      if (a.distance && b.distance) {
        return a.distance.distance - b.distance.distance;
      }
      return 0;
    });
    
    res.json({ donations: donationsWithDistance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get route/distance info for a specific donation
router.get('/route/:donationId', verifyToken, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.donationId)
      .populate('donorId', 'name organizationName phone address');
    
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    
    const receiver = await User.findById(req.userId);
    
    // Always return donor info even without location
    const response = {
      donorAddress: formatAddress(donation.address),
      donorName: donation.donorId?.organizationName || donation.donorId?.name,
      donorPhone: donation.donorId?.phone
    };
    
    // Check if both locations are available
    const hasReceiverLocation = receiver?.address?.location?.lat && receiver?.address?.location?.lng;
    const hasDonorLocation = donation.address?.location?.lat && donation.address?.location?.lng;
    
    if (!hasReceiverLocation) {
      // Return donor info but indicate route not available
      return res.json({
        ...response,
        route: null,
        error: {
          code: 'RECEIVER_LOCATION_MISSING',
          message: 'Your location is not set. Please update your profile with address and location to see route.'
        }
      });
    }
    
    if (!hasDonorLocation) {
      return res.json({
        ...response,
        route: null,
        error: {
          code: 'DONOR_LOCATION_MISSING',
          message: 'Donor has not set their pickup location.'
        }
      });
    }
    
    const routeInfo = getRouteInfo(
      receiver.address.location.lat,
      receiver.address.location.lng,
      donation.address.location.lat,
      donation.address.location.lng
    );
    
    res.json({
      ...response,
      route: routeInfo,
      error: null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
