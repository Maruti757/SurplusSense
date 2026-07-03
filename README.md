# FoodShare - Waste Food Management System

A comprehensive MERN stack application for managing food donations, connecting donors (restaurants, hotels, NGOs, etc.) with receivers (charities, orphanages, etc.).

## Features

### ✅ Authentication
- Separate registration/login for Donors and Receivers
- OTP verification via email
- JWT-based secure authentication

### ✅ Donor Dashboard
- Add **Packaged Food** with images (front/back), MFD & EXP dates
- Add **Cooked Food** with photos
- **OCR Scanning**: Upload product images to automatically extract MFD and EXP dates
- **AI Food Analysis**: Validates dates and determines if donation is allowed
- **Profile Management**: Update address and location
- **Google Maps Integration**: Search location like Zomato/Swiggy
- **Pickup Verification**: Generate unique pickup IDs

### ✅ Receiver Dashboard
- Real-time notifications for new donations
- First-come-first-serve acceptance system
- Email confirmation on acceptance
- **Google Maps Route**: Show route from receiver to donor location
- Unique pickup ID verification
- View donation history

### ✅ Chatbot Service
- AI-powered chatbot for both donors and receivers

## Tech Stack

### Frontend
- React 18 with Vite
- React Router DOM
- Axios
- Socket.io-client
- Tesseract.js (OCR)
- Google Maps API

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- Socket.io
- Nodemailer

## Project Structure

```
foodshare/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── context/      # Auth & Socket contexts
│   │   ├── pages/        # Page components
│   │   ├── utils/        # Utility functions (OCR)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   └── package.json
├── server/                # Express Backend
│   ├── models/           # Mongoose models
│   ├── routes/           # API routes
│   ├── utils/           # Utilities (email, distance, AI)
│   ├── uploads/         # Image uploads
│   ├── index.js
│   └── package.json
├── .env                  # Environment variables
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)
- Google Maps API Key

### Backend Setup

```
bash
cd server
npm install
npm start
```

The server will run on http://localhost:5000

### Frontend Setup

```
bash
cd client
npm install
npm run dev
```

The client will run on http://localhost:5173

## Configuration

### Environment Variables

Create a `.env` file in the `server` directory:
```
env
MONGO_URI=mongodb://localhost:27017/foodshare
JWT_SECRET=your_jwt_secret
PORT=5000
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

Create a `.env` file in the `client` directory:
```
env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## API Endpoints

### Auth
- `POST /api/auth/donor/register` - Register donor
- `POST /api/auth/receiver/register` - Register receiver
- `POST /api/auth/login` - Login
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/profile` - Update profile
- `GET /api/auth/me` - Get current user

### Donations
- `POST /api/donations` - Create donation
- `GET /api/donations/my-donations` - Get my donations
- `POST /api/donations/analyze` - AI analyze food dates
- `POST /api/donations/verify-pickup/:id` - Verify pickup

### Receiver
- `GET /api/receiver/available` - Get available donations
- `GET /api/receiver/notifications` - Get notifications
- `POST /api/receiver/accept/:id` - Accept donation
- `GET /api/receiver/route/:id` - Get route info

### Chatbot
- `POST /api/chatbot/message` - Send message to chatbot

## Key Features in Detail

### 1. Location Search (Like Zomato/Swiggy)
- Google Places Autocomplete for address search
- Current location detection
- Interactive map for pin-pointing location

### 2. OCR Scanning
- Upload product images
- Automatic extraction of MFD and EXP dates
- Date validation against manually entered dates
- If dates don't match, donation is blocked

### 3. AI Food Analysis
- Validates packaged food dates
- Calculates days until expiry
- Safety score (0-100)
- Blocks expired items automatically
- Provides recommendations

### 4. Notifications
- Real-time Socket.io notifications
- Email notifications
- In-app notification center

### 5. Pickup Verification
- Unique pickup ID generation
- QR-style verification
- Email confirmation to donor

## Troubleshooting

### Issue: Notifications not showing
- Ensure MongoDB is running
- Check Socket.io connection in browser console
- Verify user is logged in as receiver

### Issue: Map not loading
- Verify Google Maps API key is valid
- Check API has Maps JavaScript API enabled
- Ensure API key is in index.html

### Issue: OCR not working
- Check image quality (clear product labels)
- Ensure Tesseract.js is installed
- Try with different images

### Issue: "Donor location not set"
- Update profile with address and location
- Use the map picker in profile edit
- Save changes and try again

## License

MIT License
