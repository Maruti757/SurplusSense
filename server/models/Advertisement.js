const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  type: {
    type: String,
    required: true,
    enum: ['image', 'video']
  },
  fileUrl: {
    type: String,
    required: true
  },
  // Which slot on the Landing page
  slot: {
    type: String,
    required: true,
    enum: ['hero', 'banner', 'sidebar', 'popup'],
    default: 'banner'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  linkUrl: {
    type: String,
    default: ''
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Only show ads that haven't expired
advertisementSchema.index({ slot: 1, isActive: 1 });

module.exports = mongoose.model('Advertisement', advertisementSchema);
