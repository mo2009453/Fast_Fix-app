import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Hourglass, MailCheck, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { supabase } from '@/lib/supabaseClient.js';

const TechnicianPendingReviewScreen = () => {
  const { t, language } = useLanguage();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const fetchStatus = async () => {
      const email = localStorage.getItem('technician_email');
      if (!email) {
        setStatus('error');
        return;
      }

      const { data, error } = await supabase
        .from('technician_pending')
        .select('status')
        .eq('email', email)
        .single();

      if (error || !data) {
        setStatus('error');
      } else {
        setStatus(data.status);
      }
    };

    fetchStatus();
  }, []);

  const renderContent = () => {
    switch (status) {
      case 'pending':
        return (
          <>
            <motion.div
              animate={{ rotateY: [0, 180, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mx-auto mb-6"
            >
              <Hourglass size={64} className="text-primary" />
            </motion.div>
            <CardTitle className="text-3xl font-bold text-primary">
              {t('applicationPending', 'Application Pending Review')}
            </CardTitle>
            <CardContent className="space-y-4">
              <CardDescription className="text-lg text-muted-foreground">
                {t('applicationUnderReview')}
              </CardDescription>
              <div className="flex items-center justify-center text-sm text-accent">
                <MailCheck size={20} className="ltr:mr-2 rtl:ml-2" />
                <span>{t('notificationViaPush', 'We will notify you via push notification and email.')}</span>
              </div>
              <img
                alt="Technician reviewing documents"
                className="w-full max-w-xs mx-auto mt-6 rounded-lg shadow-md"
                src="https://images.unsplash.com/photo-1603201667141-5a2d4c673378"
              />
            </CardContent>
          </>
        );
      case 'accepted':
        return (
          <>
            <CheckCircle size={64} className="mx-auto mb-6 text-green-600" />
            <CardTitle className="text-3xl font-bold text-green-600">
              {t('applicationAccepted', 'Application Accepted')}
            </CardTitle>
            <CardContent>
              <p className="text-muted-foreground text-lg">
                {t('youCanNowAccess', 'You can now access your dashboard and start receiving tasks.')}
              </p>
            </CardContent>
          </>
        );
      case 'rejected':
        return (
          <>
            <XCircle size={64} className="mx-auto mb-6 text-red-600" />
            <CardTitle className="text-3xl font-bold text-red-600">
              {t('applicationRejected', 'Application Rejected')}
            </CardTitle>
            <CardContent>
              <p className="text-muted-foreground text-lg">
                {t('rejectionMessage', 'Unfortunately, your application was rejected.')}
              </p>
            </CardContent>
          </>
        );
      default:
        return (
          <>
            <AlertTriangle size={64} className="mx-auto mb-6 text-yellow-500" />
            <CardTitle className="text-3xl font-bold text-yellow-500">
              {t('statusError', 'Unable to fetch status')}
            </CardTitle>
            <CardContent>
              <p className="text-muted-foreground text-lg">
                {t('tryAgainLater', 'Please try again later or contact support.')}
              </p>
            </CardContent>
          </>
        );
    }
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
        <CardHeader>
          {renderContent()}
        </CardHeader>
      </Card>
    </motion.div>
  );
};

export default TechnicianPendingReviewScreen;