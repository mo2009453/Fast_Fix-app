import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx';
import { Hourglass, MailCheck, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext.jsx';

const TechnicianPendingReviewScreen = () => {
  const { t, language } = useLanguage();
  const [status, setStatus] = useState('loading');
  const router = useRouter();

  useEffect(() => {
    const fetchTechnicianStatus = async () => {
      const email = localStorage.getItem('technician_email');
      if (!email) return setStatus('error');

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

    fetchTechnicianStatus();
  }, []);

  const renderContent = () => {
    switch (status) {
      case 'pending':
        return (
          <Card className="w-full max-w-lg text-center shadow-2xl glassmorphism-card">
            <CardHeader>
              <motion.div
                animate={{ rotateY: [0, 180, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="mx-auto mb-6"
              >
                <Hourglass size={64} className="text-primary" />
              </motion.div>
              <CardTitle className="text-3xl font-bold text-primary">
                {t('applicationPending', 'Application Pending Review')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription className="text-lg text-muted-foreground">
                {t('applicationUnderReview')}
              </CardDescription>
              <div className="flex items-center justify-center text-sm text-accent">
                <MailCheck size={20} className="ltr:mr-2 rtl:ml-2" />
                <span>
                  {t('notificationViaPush', 'We will notify you via push notification and email.')}
                </span>
              </div>
              <img
                alt="Technician reviewing documents"
                className="w-full max-w-xs mx-auto mt-6 rounded-lg shadow-md"
                src="https://images.unsplash.com/photo-1603201667141-5a2d4c673378"
              />
            </CardContent>
          </Card>
        );
      case 'accepted':
        return (
          <Card className="w-full max-w-lg text-center shadow-2xl glassmorphism-card">
            <CardHeader>
              <ThumbsUp size={64} className="mx-auto mb-4 text-green-500" />
              <CardTitle className="text-3xl font-bold text-green-600">
                {t('applicationAccepted', 'Application Accepted!')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('youCanNowAccessDashboard', 'You can now access your technician dashboard.')}
              </CardDescription>
            </CardContent>
          </Card>
        );
      case 'rejected':
        return (
          <Card className="w-full max-w-lg text-center shadow-2xl glassmorphism-card">
            <CardHeader>
              <ThumbsDown size={64} className="mx-auto mb-4 text-red-500" />
              <CardTitle className="text-3xl font-bold text-red-600">
                {t('applicationRejected', 'Application Rejected')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('applicationRejectedMessage', 'Unfortunately, your application has been rejected.')}
              </CardDescription>
            </CardContent>
          </Card>
        );
      case 'error':
        return <p className="text-red-500">{t('errorFetchingStatus', 'Error fetching technician status.')}</p>;
      default:
        return <p className="text-muted-foreground">{t('loading', 'Loading...')}</p>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-secondary/20 to-background"
      key={language}
    >
      {renderContent()}
    </motion.div>
  );
};

export default TechnicianPendingReviewScreen;
