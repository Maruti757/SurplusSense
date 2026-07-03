const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  foodType: {
    type: String,
    required: true,
    enum: ['packaged', 'cooked']
  },
  foodName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    default: 'pieces'
  },
  images: [{
    type: String
  }],
  brandName: String,
  manufactureDate: Date,
  expiryDate: Date,
  mealType: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other']
  },
  preparationTime: String,
  pickupDeadline: Date,
  description: String,
  donorName: {
    type: String,
    trim: true
  },
  donationAmount: {
    type: Number
  },
  donationDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'picked_up', 'rejected', 'expired'],
    default: 'pending'
  },
  pickupId: {
    type: String,
    unique: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    landmark: String,
    location: {
      lat: Number,
      lng: Number
    }
  },
  isAiApproved: {
    type: Boolean,
    default: false
  },
  aiAnalysis: {
    isValid: Boolean,
    daysUntilExpiry: Number,
    message: String,
    checkedAt: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Gamification fields
  freshnessScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  earlyDonationBonus: {
    type: Boolean,
    default: false
  },
  donationHour: {
    type: Number,  // 0-23, for chart grouping
    default: 12
  },
  pointsAwarded: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate pickup ID - shorter format
donationSchema.pre('save', async function(next) {
  if (!this.pickupId) {
    // Generate a shorter, 6-character pickup ID
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.pickupId = result;
  }
  next();
});

// Index for searching
donationSchema.index({ status: 1, foodType: 1, createdAt: -1 });
donationSchema.index({ 'address.city': 1 });
donationSchema.index({ donorId: 1, createdAt: -1 });
donationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Donation', donationSchema);
