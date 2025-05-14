
    import React from 'react';
    import { motion } from 'framer-motion';
    import { Card, CardContent, CardTitle } from '@/components/ui/card.jsx';
    import { Button } from '@/components/ui/button.jsx';
    import { Star } from 'lucide-react';

    const AcceptedTechniciansList = ({ technicians, t }) => {
      return (
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-primary">{t('acceptedTechnicians')}</h2>
          {technicians.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {technicians.map((tech, index) => (
                <motion.div
                  key={tech.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ translateY: -5 }}
                >
                  <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 glassmorphism-card">
                    <div className="h-40 bg-gradient-to-r from-gray-300 to-gray-400 flex items-center justify-center">
                      <img  class="w-24 h-24 rounded-full object-cover border-4 border-background shadow-md" alt={tech.name} src="https://images.unsplash.com/photo-1616985480957-a0547263ae1d" />
                    </div>
                    <CardContent className="p-4">
                      <CardTitle className="text-xl text-primary">{tech.name}</CardTitle>
                      <div className="flex items-center text-yellow-500 my-1">
                        {[...Array(Math.floor(tech.rating))].map((_, i) => <Star key={`full-${i}`} fill="currentColor" className="h-5 w-5" />)}
                        {tech.rating % 1 !== 0 && <Star key="half" fill="currentColor" className="h-5 w-5 opacity-50" />}
                        {[...Array(5 - Math.ceil(tech.rating))].map((_, i) => <Star key={`empty-${i}`} className="h-5 w-5 text-gray-300" />)}
                        <span className="ltr:ml-2 rtl:mr-2 text-sm text-muted-foreground">({tech.rating})</span>
                      </div>
                      <p className="text-sm text-muted-foreground h-10 overflow-hidden">{t('skills')}: {tech.skills.join(', ')}</p>
                      <p className="text-xs text-muted-foreground">{t('distance', 'Distance')}: {tech.distance} km</p>
                      <Button className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90">{t('contactTechnician')}</Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground p-4 bg-secondary/30 rounded-md text-center">{t('noAcceptedTechnicians')}</p>
          )}
        </div>
      );
    };

    export default AcceptedTechniciansList;
  