
    import React, { useState, useRef, useEffect } from 'react';
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
    import { Input } from '@/components/ui/input.jsx';
    import { Label } from '@/components/ui/label.jsx';
    import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx';
    import { useLanguage } from '@/contexts/LanguageContext.jsx';
    import { useToast } from '@/components/ui/use-toast.jsx';
    import { UploadCloud, Copy, AlertCircle } from 'lucide-react';

    const MIN_AMOUNT = 100;

    const AddBalanceDialog = ({ open, onOpenChange, onConfirmTransfer }) => {
      const { t } = useLanguage();
      const { toast } = useToast();
      const [paymentMethod, setPaymentMethod] = useState('instapay');
      const [amount, setAmount] = useState('');
      const [transferSource, setTransferSource] = useState('');
      const [transferScreenshot, setTransferScreenshot] = useState(null);
      const fileInputRef = useRef(null);
      const [paymentInstructionText, setPaymentInstructionText] = useState('');
      const [accountNumber, setAccountNumber] = useState('');

      useEffect(() => {
        if (paymentMethod === 'instapay') {
          setPaymentInstructionText(t('instapayDetails'));
          setAccountNumber('m.shamroukh25@insapay');
        } else if (paymentMethod === 'vodafoneCash') {
          setPaymentInstructionText(t('vodafoneCashDetails'));
          setAccountNumber('01060070299');
        } else if (paymentMethod === 'etisalatCash') {
          setPaymentInstructionText(t('etisalatCashDetails'));
          setAccountNumber('01141003640');
        } else {
          setPaymentInstructionText('');
          setAccountNumber('');
        }
      }, [paymentMethod, t]);

      const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
          setTransferScreenshot(file);
          toast({ title: t('success'), description: t('screenshotUploaded') });
        }
      };

      const handleConfirm = () => {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount < MIN_AMOUNT) {
          toast({ title: t('error'), description: t('minAmountError'), variant: 'destructive' });
          return;
        }
        if (!transferSource.trim()) {
          toast({ title: t('error'), description: t('transferSourceRequired'), variant: 'destructive' });
          return;
        }
        if (!transferScreenshot) {
          toast({ title: t('error'), description: t('screenshotRequired'), variant: 'destructive' });
          return;
        }
        onConfirmTransfer(paymentMethod, numericAmount, transferSource, transferScreenshot);
        
        setAmount('');
        setTransferSource('');
        setTransferScreenshot(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
      };

      const triggerFileInput = () => {
        fileInputRef.current?.click();
      };

      const handleCopy = async (text) => {
        try {
          await navigator.clipboard.writeText(text);
          toast({ title: t('copiedToClipboard'), description: text });
        } catch (err) {
          toast({ title: t('error'), description: t('failedToCopy'), variant: 'destructive' });
        }
      };

      return (
        <Dialog open={open} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setAmount('');
            setTransferSource('');
            setTransferScreenshot(null);
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
          }
          onOpenChange(isOpen);
        }}>
          <DialogContent className="sm:max-w-md glassmorphism-card">
            <DialogHeader>
              <DialogTitle>{t('addBalanceTitle')}</DialogTitle>
              <DialogDescription>
                {t('addBalanceDialogDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t('paymentMethod')}</Label>
                <RadioGroup defaultValue="instapay" onValueChange={setPaymentMethod} value={paymentMethod}>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="instapay" id="instapay" />
                    <Label htmlFor="instapay">{t('instapay')}</Label>
                  </div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="vodafoneCash" id="vodafoneCash" />
                    <Label htmlFor="vodafoneCash">{t('vodafoneCash')}</Label>
                  </div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="etisalatCash" id="etisalatCash" />
                    <Label htmlFor="etisalatCash">{t('etisalatCash')}</Label>
                  </div>
                </RadioGroup>
              </div>

              {paymentInstructionText && accountNumber && (
                <div className="p-3 my-2 border rounded-md bg-primary/10 text-primary-foreground">
                  <Label>{t('transferTo', { amount: amount || '...' })}</Label>
                  <div className="flex justify-between items-center mt-1">
                    <p className="font-semibold text-primary text-sm">{paymentInstructionText}</p>
                    <Button variant="ghost" size="icon" onClick={() => handleCopy(accountNumber)}>
                        <Copy className="h-4 w-4 text-primary" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="amount">{t('amount')}</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('amountPlaceholder')}
                  min={MIN_AMOUNT}
                  className="bg-background/70"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="transferSource">{t('transferSource')}</Label>
                <Input
                  id="transferSource"
                  type="text"
                  value={transferSource}
                  onChange={(e) => setTransferSource(e.target.value)}
                  placeholder={t('transferSourcePlaceholder')}
                  className="bg-background/70"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="transferScreenshot">{t('uploadScreenshot')}</Label>
                <Button variant="outline" onClick={triggerFileInput} className="w-full justify-start text-left font-normal bg-background/70">
                  <UploadCloud className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                  {transferScreenshot ? transferScreenshot.name : t('selectFile')}
                </Button>
                <Input
                  id="transferScreenshot"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>
              <div className="flex items-start p-3 rounded-md bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                <AlertCircle className="h-5 w-5 text-amber-500 ltr:mr-2 rtl:ml-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">{t('awaitingConfirmation')}</p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t('cancel')}</Button>
              </DialogClose>
              <Button onClick={handleConfirm}>{t('transferConfirmed')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    };

    export default AddBalanceDialog;
  