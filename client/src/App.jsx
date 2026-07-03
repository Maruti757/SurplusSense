import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import DonorDashboard from './pages/DonorDashboard';
import ReceiverDashboard from './pages/ReceiverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Chatbot from './components/Chatbot';
import ProtectedRoute from './components/ProtectedRoute';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="app">
          <ScrollToTop />
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route 
              path="/donor/*" 
              element={
                <ProtectedRoute role="donor">
                  <DonorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/receiver/*" 
              element={
                <ProtectedRoute role="receiver">
                  <ReceiverDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <Footer />
          <Chatbot />
        </div>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
