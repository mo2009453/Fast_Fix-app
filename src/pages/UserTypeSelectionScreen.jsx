
    import React from 'react';
    import { useNavigate } from 'react-router-dom';
    import { motion } from 'framer-motion';
    import { Button } from '@/components/ui/button.jsx';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
    import { Users, Wrench } from 'lucide-react';
    import { useLanguage } from '@/contexts/LanguageContext.jsx';

    const UserTypeSelectionScreen = () => {
      const navigate = useNavigate();
      const { t, language } = useLanguage();

      const handleSelection = (userType) => {
        navigate(`/login/${userType}`);
      };

      const cardVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
        hover: { scale: 1.05, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" },
        tap: { scale: 0.95 }
      };

      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-secondary/30 to-background"
          key={language}
        >
          <motion.div 
            className="text-center mb-12"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Wrench size={64} className="mx-auto mb-4 text-primary animate-pulse-subtle" />
            <h1 className="text-4xl font-bold text-primary">{t('welcomeTo')} {t('appName')}</h1>
            <p className="text-xl text-muted-foreground mt-2">{t('selectUserType')}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" whileHover="hover" whileTap="tap">
              <Card className="text-center overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300 glassmorphism-card">
                <CardHeader className="bg-primary/10">
                  <Users size={48} className="mx-auto mb-3 text-primary" />
                  <CardTitle className="text-3xl font-semibold text-primary">{t('customer')}</CardTitle>
                  <CardDescription className="text-muted-foreground">{t('customerUserTypeDescription', 'Access services and book technicians.')}</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground text-lg py-3"
                    onClick={() => handleSelection('customer')}
                  >
                    {t('customer')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" whileHover="hover" whileTap="tap" transition={{delay: 0.2}}>
              <Card className="text-center overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300 glassmorphism-card">
                <CardHeader className="bg-accent/10">
                  <Wrench size={48} className="mx-auto mb-3 text-accent" />
                  <CardTitle className="text-3xl font-semibold text-accent">{t('technician')}</CardTitle>
                  <CardDescription className="text-muted-foreground">{t('technicianUserTypeDescription', 'Offer your skills and find jobs.')}</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-accent text-accent hover:bg-accent/10 hover:text-accent text-lg py-3"
                    onClick={() => handleSelection('technician')}
                  >
                    {t('technician')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      );
    };

    export default UserTypeSelectionScreen;
  