@echo off
echo ========================================
echo   FoodShare - Waste Food Management
echo ========================================
echo.

echo Starting MongoDB...
echo (Make sure MongoDB is installed and running)
echo.

echo Starting Backend Server...
cd server
start cmd /k "npm start"
cd ..

echo Starting Frontend...
cd client
start cmd /k "npm run dev"
cd ..

echo.
echo ========================================
echo FoodShare is starting!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo ========================================
