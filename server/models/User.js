
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  organizationName: {
    type: String,
    required: true,
    trim: true
  },
  organizationType: {
    type: String,
    required: true,
    enum: ['Restaurant', 'Hotel', 'Canteen', 'NGO', 'Service Club', 'Orphanage', 'Charity', 'Admin']
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
  role: {
    type: String,
    required: true,
    enum: ['donor', 'receiver', 'admin']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  // Suspension
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspendedReason: {
    type: String,
    default: ''
  },
  suspendedAt: {
    type: Date
  },
  // Gamification points
  points: {
    type: Number,
    default: 0
  },
  // Leaderboard stats (denormalized for fast queries)
  totalDonations: {
    type: Number,
    default: 0
  },
  totalQuantityDonated: {
    type: Number,
    default: 0
  },
  avgFreshnessScore: {
    type: Number,
    default: 0
  },
  freshnessScoreSum: {
    type: Number,
    default: 0
  },
  // Receiver stats
  todayReceiveCount: {
    type: Number,
    default: 0
  },
  lastReceiveDate: {
    type: Date
  },
  uniqueId: {
    type: String,
    unique: true,
    sparse: true
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  profileImage: String
}, {
  timestamps: true
});

// Generate unique ID (not for admin)
userSchema.pre('save', async function(next) {
  if (!this.uniqueId && this.role !== 'admin') {
    const prefix = this.role === 'donor' ? 'DON' : 'REC';
    this.uniqueId = `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }
  next();
});

// Hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};


module.exports = mongoose.model('User', userSchema);
