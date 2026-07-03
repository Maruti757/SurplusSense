const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const ocrRoutes = require('./routes/ocr');
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const receiverRoutes = require('./routes/receiver');
const chatbotRoutes = require('./routes/chatbot');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://surplussense.onrender.com",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/ads', express.static(path.join(__dirname, 'uploads/ads')));

app.use('/api/ocr', ocrRoutes);

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://marutim1429_db_user:R54IS0WXBezpuJYt@cluster0.cuxvzci.mongodb.net/';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');
    try {
      const User = require('./models/User');
      const AppSettings = require('./models/AppSettings');
      const adminExists = await User.findOne({ role: 'admin' });
      if (!adminExists) {
        const admin = new User({
          name: 'FoodShare Administrator',
          email: 'admin@foodshare.com',
          phone: '9999999999',
          password: 'Admin@FoodShare2024',
          organizationName: 'FoodShare HQ',
          organizationType: 'Admin',
          role: 'admin',
          isVerified: true,
          isApproved: true
        });
        await admin.save();
        console.log('✅ Default Admin account seeded');
      }
      const settingsExist = await AppSettings.findOne({ key: 'global' });
      if (!settingsExist) {
        await AppSettings.create({ key: 'global' });
        console.log('✅ Default app settings seeded');
      }
    } catch (err) {
      console.log('❌ Error seeding defaults:', err.message);
    }
  })
  .catch(err => console.log('❌ MongoDB Connection Error:', err));

// Socket.io for real-time notifications
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log('User joined room:', userId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/receiver', receiverRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FoodShare API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 FoodShare server running on port ${PORT}`);
});
