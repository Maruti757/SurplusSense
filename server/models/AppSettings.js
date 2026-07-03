const mongoose = require('mongoose');

// Singleton settings document for platform-wide config
const appSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global'
  },
  // Minimum number of donations a receiver can claim per day
  minReceivesPerDay: {
    type: Number,
    default: 3
  },
  // Maximum receives per day per receiver
  maxReceivesPerDay: {
    type: Number,
    default: 5
  },
  // Points multiplier for early donations before 9PM
  earlyDonationMultiplier: {
    type: Number,
    default: 1.5
  },
  // Premium pricing (in paisa for Stripe INR, or cents for USD)
  premiumMonthlyPrice: {
    type: Number,
    default: 29900  // ₹299
  },
  premiumYearlyPrice: {
    type: Number,
    default: 249900 // ₹2499
  },
  // Maintenance mode
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  aiImageApiUrl: {
    type: String,
    default: ''
  },
  aiImageApiKey: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AppSettings', appSettingsSchema);
