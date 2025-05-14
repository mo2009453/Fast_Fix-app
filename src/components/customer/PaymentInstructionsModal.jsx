
    import React from 'react';
    import {
      Dialog,
      DialogContent,
      DialogHeader,
      DialogTitle,
      DialogDescription,
      DialogFooter,
      DialogClose,
    } from '@/components/ui/dialog.jsx';
    import { Button } from '@/components/ui/button.jsx';
    import { useLanguage } from '@/contexts/LanguageContext.jsx';
    import { AlertCircle, Copy, Paperclip } from 'lucide-react';
    import { useToast } from '@/components/ui/use-toast.jsx';

    const PaymentInstructionsModal = ({ open, onOpenChange, paymentDetailsData, onConfirmTransfer }) => {
      const { t } = useLanguage();
      const { toast } = useToast();
      
      if (!paymentDetailsData) {
        return null; 
      }
      const { method, amount, source, screenshot } = paymentDetailsData;

      let paymentInstructionText = '';
      let accountNumber = '';

      if (method === 'instapay') {
        paymentInstructionText = t('instapayDetails');
        accountNumber = 'm.shamroukh25@insapay';
      } else if (method === 'vodafoneCash') {
        paymentInstructionText = t('vodafoneCashDetails');
        accountNumber = '01060070299';
      } else if (method === 'etisalatCash') {
        paymentInstructionText = t('etisalatCashDetails');
        accountNumber = '01141003640';
      }

      const handleCopy = async (text) => {
        try {
          await navigator.clipboard.writeText(text);
          toast({ title: t('copiedToClipboard'), description: text });
        } catch (err) {
          toast({ title: t('error'), description: t('failedToCopy'), variant: 'destructive' });
        }
      };

      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md glassmorphism-card">
            <DialogHeader>
              <DialogTitle>{t('paymentInstructionsTitle')}</DialogTitle>
              <DialogDescription>
                {t('transferTo', { amount: (amount || 0).toFixed(2) })}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div className="p-3 border rounded-md bg-primary/10 text-primary-foreground flex justify-between items-center">
                <p className="font-semibold text-primary">{paymentInstructionText}</p>
                {accountNumber && (
                    <Button variant="ghost" size="icon" onClick={() => handleCopy(accountNumber)}>
                        <Copy className="h-4 w-4 text-primary" />
                    </Button>
                )}
              </div>
              
              <div className="text-sm space-y-1">
                <p><span className="font-semibold">{t('transferSource')}:</span> {source || 'N/A'}</p>
                {screenshot && <p className="flex items-center"><Paperclip className="h-4 w-4 ltr:mr-1 rtl:ml-1 text-muted-foreground" /> <span className="font-semibold">{t('uploadScreenshot')}:</span> {screenshot.name}</p>}
              </div>

              <div className="flex items-start p-3 rounded-md bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                <AlertCircle className="h-5 w-5 text-amber-500 ltr:mr-2 rtl:ml-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">{t('awaitingConfirmation')}</p>
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
              <DialogClose asChild>
                <Button variant="outline">{t('close')}</Button>
              </DialogClose>
              <Button onClick={onConfirmTransfer}>{t('transferConfirmed')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    };

    export default PaymentInstructionsModal;
  