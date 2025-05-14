
    import React from 'react';
    import { motion } from 'framer-motion';
    import { Button } from '@/components/ui/button.jsx';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
    import { Bell, CheckCircle, XCircle, User, MapPin, Edit3, Star, LogOut } from 'lucide-react';
    import { useLanguage } from '@/contexts/LanguageContext.jsx';
    import { useNavigate } from 'react-router-dom';

    const TechnicianHomeScreen = () => {
      const { t, language } = useLanguage();
      const navigate = useNavigate();

      const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('userType');
        navigate('/user-type');
      };

      const serviceRequests = [
        { id: 1, clientName: "Aisha Mohammed", service: t('refrigerator') + " " + t('repair', "Repair"), location: "123 Main St, Dubai", status: "new" },
        { id: 2, clientName: "Omar Abdullah", service: t('airConditioner') + " " + t('maintenance', "Maintenance"), location: "456 Palm Jumeirah, Dubai", status: "inProgress" },
        { id: 3, clientName: "Layla Khaled", service: t('washingMachine') + " " + t('installation', "Installation"), location: "789 Marina Walk, Dubai", status: "completed" },
      ];

      const getStatusColor = (status) => {
        if (status === "new") return "text-blue-500";
        if (status === "inProgress") return "text-yellow-500";
        if (status === "completed") return "text-green-500";
        return "text-muted-foreground";
      };
      
      const getStatusText = (status) => {
        if (status === "new") return t('new', 'New');
        if (status === "inProgress") return t('inProgress');
        if (status === "completed") return t('completed');
        return status;
      }

      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5"
          key={language}
        >
          <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-primary">{t('technician')} {t('home')}</h1>
             <Button variant="ghost" onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
              <LogOut className="ltr:mr-2 rtl:ml-2 h-5 w-5" /> {t('logout')}
            </Button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 300 }}>
              <Card className="h-full hover:shadow-xl transition-shadow duration-300 glassmorphism-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-accent"><Bell className="ltr:mr-2 rtl:ml-2" /> {t('newServiceRequests')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('newRequestsDesc', 'View and manage incoming service requests from customers.')}</p>
                  <Button className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90">{t('viewRequests', 'View Requests')}</Button>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 300 }}>
              <Card className="h-full hover:shadow-xl transition-shadow duration-300 glassmorphism-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-accent"><Star className="ltr:mr-2 rtl:ml-2" /> {t('rateClient')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('rateClientDesc', 'Provide feedback on clients after completing a job.')}</p>
                  <Button className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90">{t('ratePreviousClients', 'Rate Clients')}</Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-primary">{t('currentJobs', 'Current Jobs & Requests')}</h2>
            {serviceRequests.length > 0 ? (
              <div className="space-y-4">
                {serviceRequests.map((req, index) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, x: language === 'ar' ? 50 : -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 glassmorphism-card">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl text-primary">{req.service}</CardTitle>
                            <CardDescription className="flex items-center text-muted-foreground">
                              <User className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> {req.clientName}
                            </CardDescription>
                          </div>
                          <span className={`font-semibold px-2 py-1 rounded-full text-xs ${getStatusColor(req.status)} bg-opacity-20 ${req.status === "new" ? "bg-blue-500/20" : req.status === "inProgress" ? "bg-yellow-500/20" : "bg-green-500/20"}`}>
                            {getStatusText(req.status)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="flex items-center text-sm mb-3">
                          <MapPin className="ltr:mr-2 rtl:ml-2 h-4 w-4 text-accent" /> {req.location}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          {req.status === 'new' && (
                            <>
                              <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600 text-white">
                                <CheckCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> {t('accept')}
                              </Button>
                              <Button size="sm" variant="destructive" className="flex-1">
                                <XCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> {t('decline')}
                              </Button>
                            </>
                          )}
                          {req.status === 'inProgress' && (
                            <Button size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                              <Edit3 className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> {t('updateJobStatus')}
                            </Button>
                          )}
                           {req.status === 'completed' && (
                            <Button size="sm" variant="outline" className="flex-1 border-primary text-primary hover:bg-primary/10">
                              <Star className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> {t('rateClient')}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t('noCurrentJobs', 'No current jobs or new requests at the moment.')}</p>
            )}
          </div>
        </motion.div>
      );
    };

    export default TechnicianHomeScreen;
  