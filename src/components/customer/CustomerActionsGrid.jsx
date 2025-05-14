
    import React from 'react';
    import { motion } from 'framer-motion';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
    import { Button } from '@/components/ui/button.jsx';
    import { Settings, History, Star } from 'lucide-react';

    const CustomerActionsGrid = ({ t }) => {
      const actions = [
        { id: 'bookings', icon: Settings, titleKey: 'manageBookings', descKey: 'manageBookingsDesc', buttonKey: 'viewBookings' },
        { id: 'history', icon: History, titleKey: 'viewHistory', descKey: 'viewHistoryDesc', buttonKey: 'viewServiceHistory' },
        { id: 'rate', icon: Star, titleKey: 'rateTechnician', descKey: 'rateTechnicianDesc', buttonKey: 'ratePreviousTechnicians' },
      ];

      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {actions.map(action => {
            const Icon = action.icon;
            return (
              <motion.div key={action.id} whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card className="h-full hover:shadow-xl transition-shadow duration-300 glassmorphism-card">
                  <CardHeader>
                    <CardTitle className="flex items-center text-accent">
                      <Icon className="ltr:mr-2 rtl:ml-2" /> {t(action.titleKey)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{t(action.descKey)}</p>
                    <Button className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90">{t(action.buttonKey)}</Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      );
    };
    export default CustomerActionsGrid;
  