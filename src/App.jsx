
    import React from 'react';
    import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
    import { motion } from 'framer-motion';
    import { Toaster } from '@/components/ui/toaster.jsx';
    import { LanguageProvider } from '@/contexts/LanguageContext.jsx';
    import LanguageToggle from '@/components/LanguageToggle.jsx';

    import SplashScreen from '@/pages/SplashScreen.jsx';
    import UserTypeSelectionScreen from '@/pages/UserTypeSelectionScreen.jsx';
    import LoginScreen from '@/pages/LoginScreen.jsx';
    import CustomerRegistrationScreen from '@/pages/CustomerRegistrationScreen.jsx';
    import TechnicianRegistrationScreen from '@/pages/TechnicianRegistrationScreen.jsx';
    import TechnicianSkillAssessmentScreen from '@/pages/TechnicianSkillAssessmentScreen.jsx';
    import TechnicianPendingReviewScreen from '@/pages/TechnicianPendingReviewScreen.jsx';
    import CustomerHomeScreen from '@/pages/CustomerHomeScreen.jsx';
    import TechnicianHomeScreen from '@/pages/TechnicianHomeScreen.jsx';

    function App() {
      return (
        <LanguageProvider>
          <Router>
            <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 text-foreground">
              <LanguageToggle />
              <Routes>
                <Route path="/" element={<SplashScreen />} />
                <Route path="/user-type" element={<UserTypeSelectionScreen />} />
                <Route path="/login/:userType" element={<LoginScreen />} />
                <Route path="/register/customer" element={<CustomerRegistrationScreen />} />
                <Route path="/register/technician" element={<TechnicianRegistrationScreen />} />
                <Route path="/technician/skill-assessment" element={<TechnicianSkillAssessmentScreen />} />
                <Route path="/technician/pending-review" element={<TechnicianPendingReviewScreen />} />
                <Route path="/customer/home" element={<CustomerHomeScreen />} />
                <Route path="/technician/home" element={<TechnicianHomeScreen />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
              <Toaster />
            </div>
          </Router>
        </LanguageProvider>
      );
    }

    export default App;
  