
    import React from 'react';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
    import { Button } from '@/components/ui/button.jsx';
    import { Wallet, PlusCircle } from 'lucide-react';

    const BalanceDisplay = ({ customerBalance, onAddFundsClick, t }) => {
      return (
        <Card className="mb-8 shadow-lg glassmorphism-card">
          <CardHeader>
            <CardTitle className="text-2xl text-primary flex items-center">
              <Wallet className="ltr:mr-2 rtl:ml-2" /> {t('customerBalance')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-lg font-semibold">{t('currentBalance', { balance: customerBalance.toFixed(2) })}</p>
            <Button onClick={onAddFundsClick} className="bg-green-500 hover:bg-green-600 text-white">
              <PlusCircle className="ltr:mr-2 rtl:ml-2 h-5 w-5" /> {t('addFunds')}
            </Button>
          </CardContent>
        </Card>
      );
    };

    export default BalanceDisplay;
  