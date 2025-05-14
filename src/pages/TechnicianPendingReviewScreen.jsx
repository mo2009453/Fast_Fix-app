
    import React from 'react';
    import { motion } from 'framer-motion';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
    import { Hourglass, MailCheck } from 'lucide-react';
    import { useLanguage } from '@/contexts/LanguageContext.jsx';

    const TechnicianPendingReviewScreen = () => {
      const { t, language } = useLanguage();

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
              <motion.div
                animate={{ rotateY: [0, 180, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mx-auto mb-6"
              >
                <Hourglass size={64} className="text-primary" />
              </motion.div>
              <CardTitle className="text-3xl font-bold text-primary">{t('applicationPending', 'Application Pending Review')}</CardTitle>
            </CardHeader>
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
                class="w-full max-w-xs mx-auto mt-6 rounded-lg shadow-md"
               src="https://images.unsplash.com/photo-1603201667141-5a2d4c673378" />
            </CardContent>
          </Card>
        </motion.div>
      );
    };

    export default TechnicianPendingReviewScreen;
  