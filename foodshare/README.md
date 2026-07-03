# FoodShare - Waste Food Management System

A MERN stack application for managing food donations from restaurants, hotels, NGOs, and other food donors to receiver organizations like NGOs and orphanages.

## Features

- **Separate Registration/Login** for Donors and Receivers
- **OTP Verification** via Email
- **AI Food Safety Analysis** for packaged food items
- **Google Maps Integration** for location pickup
- **Real-time Notifications** for receivers
- **Unique Pickup ID** verification system
- **Chatbot Service** for both donors and receivers
- **Image Upload** support for food items

## Tech Stack

### Frontend
- React.js with Vite
- React Router for navigation
- Axios for API calls
- Socket.io-client for real-time features
- CSS custom styling

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- JWT for authentication
- Nodemailer for emails
- Socket.io for real-time features

## Prerequisites

1. Node.js installed
2. MongoDB installed and running
3. npm or yarn package manager

## Installation

### Backend Setup
```
bash
cd server
npm install
```

### Frontend Setup
```
bash
cd client
npm install
```

## Configuration

### Backend (.env file in server/)
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/foodshare
JWT_SECRET=your_jwt_secret
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

### Frontend (.env file in client/)
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Running the Application

### Start Backend
```
bash
cd server
npm start
```

### Start Frontend
```
bash
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

## User Types

### Donors
- Restaurants, Hotels, Canteens
- NGOs, Service Clubs, Orphanages
- Can add packaged or cooked food donations
- AI checks expiry dates for packaged items
- View donation history

### Receivers
- Registered NGOs, Orphanages, Charities
- Receive notifications for new donations
- Accept donations on first-come-first-serve basis
- Get unique pickup ID for verification
- View acceptance history

## API Endpoints

### Auth
- POST /api/auth/donor/register
- POST /api/auth/receiver/register
- POST /api/auth/login
- POST /api/auth/verify-otp
- POST /api/auth/resend-otp

### Donations
- POST /api/donations (create donation)
- GET /api/donations (list donations)
- GET /api/donations/:id (single donation)
- POST /api/donations/analyze (AI analysis)

### Receiver
- GET /api/receiver/notifications
- POST /api/receiver/accept/:donationId
- GET /api/receiver/history

### Chatbot
- POST /api/chatbot/message

## License

MIT License
