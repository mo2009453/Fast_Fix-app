// src/pages/TechnicianPendingReviewScreen.jsx

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Hourglass, MailCheck, ShieldCheck, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { supabase } from '@/lib/supabaseClient';

const TechnicianPendingReviewScreen = () => {
  const { t, language } = useLanguage();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const email = localStorage.getItem('technicianEmail'); // تأكد أن الإيميل بيتخزن وقت التسجيل

  useEffect(() => {
    const fetchStatus = async () => {
      if (!email) return;
      const { data, error } = await supabase
        .from('technicians_pending')
        .select('status')
        .eq('email', email)
        .single();

      if (!error && data) {
        setStatus(data.status);
      }
      setLoading(false);
    };

    fetchStatus();
  }, [email]);

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <Hourglass size={64} className="text-primary mx-auto mb-6 animate-spin" />
          <CardTitle className="text-2xl font-bold text-primary">{t('loading', 'Loading...')}</CardTitle>
        </>
      );
    }

    if (status === 'accepted') {
      return (
        <>
          <ShieldCheck size={64} className="text-green-500 mx-auto mb-6" />
          <CardTitle className="text-3xl font-bold text-green-600">{t('accepted', 'Application Accepted')}</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">{t('acceptedDesc', 'You are now approved! You can access the dashboard.')}</CardDescription>
        </>
      );
    }

    if (status === 'rejected') {
      return (
        <>
          <XCircle size={64} className="text-red-500 mx-auto mb-6" />
          <CardTitle className="text-3xl font-bold text-red-600">{t('rejected', 'Application Rejected')}</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">{t('rejectedDesc', 'Unfortunately, your application was not approved.')}</CardDescription>
        </>
      );
    }

    return (
      <>
        <motion.div
          animate={{ rotateY: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mx-auto mb-6"
        >
          <Hourglass size={64} className="text-primary" />
        </motion.div>
        <CardTitle className="text-3xl font-bold text-primary">{t('applicationPending', 'Application Pending Review')}</CardTitle>
        <CardDescription className="text-lg text-muted-foreground">
          {t('applicationUnderReview', 'Your application is under review.')}
        </CardDescription>
        <div className="flex items-center justify-center text-sm text-accent mt-2">
          <MailCheck size={20} className="ltr:mr-2 rtl:ml-2" />
          <span>{t('notificationViaPush', 'We will notify you via push notification and email.')}</span>
        </div>
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-secondary/20 to-background"
      key={language}
    >
      <Card className="w-full max-w-lg text-center shadow-2xl glassmorphism-card">
        <CardHeader>{renderContent()}</CardHeader>
        {status !== 'accepted' && (
          <CardContent>
            <img
              alt="Technician reviewing documents"
              className="w-full max-w-xs mx-auto mt-6 rounded-lg shadow-md"
              src="https://images.unsplash.com/photo-1603201667141-5a2d4c673378"
            />
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
};

export default TechnicianPendingReviewScreen;