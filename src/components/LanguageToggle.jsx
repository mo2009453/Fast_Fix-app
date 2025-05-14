
    import React from 'react';
    import { useLanguage } from '@/contexts/LanguageContext.jsx';
    import { Button } from '@/components/ui/button.jsx';
    import { Languages } from 'lucide-react';

    const LanguageToggle = () => {
      const { language, toggleLanguage, t } = useLanguage();

      return (
        <Button
          variant="outline"
          size="icon"
          onClick={toggleLanguage}
          className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm"
          aria-label={language === 'ar' ? t('english') : t('arabic')}
        >
          <Languages className="h-5 w-5" />
        </Button>
      );
    };

    export default LanguageToggle;
  