
    import React, { useEffect } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { motion } from 'framer-motion';
    import { Wrench } from 'lucide-react';
    import { useLanguage } from '@/contexts/LanguageContext.jsx';

    const SplashScreen = () => {
      const navigate = useNavigate();
      const { t, language } = useLanguage();

      useEffect(() => {
        const timer = setTimeout(() => {
          navigate('/user-type');
        }, 3000);
        return () => clearTimeout(timer);
      }, [navigate]);

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="flex flex-col items-center justify-center min-h-screen gradient-bg text-primary-foreground p-4"
          key={language} 
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
          >
            <Wrench size={128} className="mb-6 text-accent drop-shadow-lg" />
          </motion.div>
          <motion.h1 
            className="text-5xl md:text-7xl font-bold mb-3 tracking-tight"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {t('appName')}
          </motion.h1>
          <motion.p 
            className="text-lg md:text-xl text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {t('tagline')}
          </motion.p>
          <motion.div 
            className="mt-12 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            {t('splashLoading')}
          </motion.div>
        </motion.div>
      );
    };

    export default SplashScreen;
  