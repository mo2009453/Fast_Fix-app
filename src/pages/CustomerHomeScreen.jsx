
    import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { Button } from '@/components/ui/button.jsx';
    import { LogOut } from 'lucide-react';
    import { useLanguage } from '@/contexts/LanguageContext.jsx';
    import { useNavigate } from 'react-router-dom';
    import { useToast } from '@/components/ui/use-toast.jsx';

    import BalanceDisplay from '@/components/customer/BalanceDisplay.jsx';
    import MaintenanceRequestForm from '@/components/customer/MaintenanceRequestForm.jsx';
    import CustomerActionsGrid from '@/components/customer/CustomerActionsGrid.jsx';
    import AcceptedTechniciansList from '@/components/customer/AcceptedTechniciansList.jsx';
    import AddBalanceDialog from '@/components/customer/AddBalanceDialog.jsx';
    // PaymentInstructionsModal is no longer directly used here for initial display
    // import PaymentInstructionsModal from '@/components/customer/PaymentInstructionsModal.jsx'; 

    const VISIT_FEE = 100;

    const deviceTypes = [
      { value: 'washingMachine', labelKey: 'washingMachine' },
      { value: 'heater', labelKey: 'heater' },
      { value: 'oven', labelKey: 'oven' },
      { value: 'refrigerator', labelKey: 'refrigerator' },
      { value: 'airConditioner', labelKey: 'airConditioner' },
    ];

    const mockTechniciansData = [
      { id: 1, name: "Ahmed Ali", rating: 4.5, skills: ['washingMachine', 'refrigerator'], photoKey: "technician1", distance: 10, acceptedRequests: [] },
      { id: 2, name: "Fatima Hassan", rating: 4.8, skills: ['airConditioner'], photoKey: "technician2", distance: 5, acceptedRequests: [] },
      { id: 3, name: "Youssef Ibrahim", rating: 4.2, skills: ['oven', 'heater'], photoKey: "technician3", distance: 25, acceptedRequests: [] },
      { id: 4, name: "Sara Gamal", rating: 4.9, skills: ['washingMachine', 'oven'], photoKey: "technician4", distance: 15, acceptedRequests: [] },
    ];


    const CustomerHomeScreen = () => {
      const { t, language } = useLanguage();
      const navigate = useNavigate();
      const { toast } = useToast();

      const [currentUserEmail, setCurrentUserEmail] = useState('');
      const [customerBalance, setCustomerBalance] = useState(0);
      const [maintenanceRequest, setMaintenanceRequest] = useState({ deviceType: '', issueDescription: '' });
      const [isLoading, setIsLoading] = useState(false);
      const [activeRequests, setActiveRequests] = useState([]);
      const [displayedTechnicians, setDisplayedTechnicians] = useState([]);
      
      const [isAddBalanceDialogOpen, setIsAddBalanceDialogOpen] = useState(false);
      // const [isPaymentInstructionsModalOpen, setIsPaymentInstructionsModalOpen] = useState(false); // Kept for potential future use
      // const [paymentDetailsData, setPaymentDetailsData] = useState({ method: '', amount: 0, source: '', screenshot: null }); // Kept for potential future use

      useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.email) {
          setCurrentUserEmail(user.email);
          const balance = parseFloat(localStorage.getItem(`customerBalance_${user.email}`)) || 0;
          setCustomerBalance(balance);
          const requests = JSON.parse(localStorage.getItem(`customerActiveRequests_${user.email}`)) || [];
          setActiveRequests(requests);
        } else {
          navigate('/login/customer'); 
        }
      }, [navigate]);


      useEffect(() => {
        if (currentUserEmail) {
            localStorage.setItem(`customerBalance_${currentUserEmail}`, customerBalance.toString());
        }
      }, [customerBalance, currentUserEmail]);

      useEffect(() => {
        if (currentUserEmail) {
            localStorage.setItem(`customerActiveRequests_${currentUserEmail}`, JSON.stringify(activeRequests));
            updateDisplayedTechnicians();
        }
      }, [activeRequests, language, t, currentUserEmail]);
      
      const updateDisplayedTechnicians = () => {
        const currentRequestId = activeRequests.length > 0 ? activeRequests[activeRequests.length - 1]?.id : null;
        if (!currentRequestId) {
            setDisplayedTechnicians([]);
            return;
        }

        const technicians = mockTechniciansData
            .filter(tech => tech.distance <= 20 && tech.acceptedRequests.includes(currentRequestId))
            .map(tech => ({
                ...tech,
                name: tech.name, 
                skills: tech.skills.map(skill => t(skill))
            }));
        setDisplayedTechnicians(technicians);
      };

      const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('userType');
        navigate('/user-type');
      };

      const handleMaintenanceRequestFieldChange = (field, value) => {
        setMaintenanceRequest(prev => ({ ...prev, [field]: value }));
      };

      const handleCreateMaintenanceRequest = async () => {
        if (!maintenanceRequest.deviceType || !maintenanceRequest.issueDescription) {
          toast({ title: t('error'), description: t('allFieldsRequired'), variant: 'destructive' });
          return;
        }
        setIsLoading(true);
        toast({ title: t('checkingBalance') });
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (customerBalance < VISIT_FEE) {
          toast({ title: t('error'), description: t('insufficientBalance'), variant: 'destructive' });
          setIsLoading(false);
          return;
        }

        setCustomerBalance(prev => prev - VISIT_FEE);
        toast({ title: t('creatingRequest') });
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const newRequestId = `REQ-${Date.now()}`;
        const newRequest = { 
            id: newRequestId, 
            ...maintenanceRequest, 
            status: 'pending_acceptance', 
            createdAt: new Date().toISOString() 
        };
        setActiveRequests(prev => [...prev, newRequest]);

        setTimeout(() => {
            mockTechniciansData.forEach(tech => {
                if (tech.skills.includes(maintenanceRequest.deviceType) && Math.random() > 0.5) { 
                    tech.acceptedRequests.push(newRequestId);
                }
            });
            updateDisplayedTechnicians(); 
        }, 2000);

        toast({ title: t('success'), description: t('requestCreatedSuccessfully') });
        setMaintenanceRequest({ deviceType: '', issueDescription: '' });
        setIsLoading(false);
      };
      
      const handleOpenAddBalanceDialog = () => setIsAddBalanceDialogOpen(true);

      const handleConfirmTransfer = (method, amount, source, screenshot) => {
        setIsAddBalanceDialogOpen(false); // Close the dialog after confirming
        toast({ title: t('paymentPending') });
        
        const pendingTransferData = { 
            method, 
            amount, 
            source, 
            screenshotName: screenshot ? screenshot.name : 'N/A', // Storing only name for simplicity
            userEmail: currentUserEmail, 
            timestamp: new Date().toISOString() 
        };

        const pendingTransfers = JSON.parse(localStorage.getItem('pendingTransfers')) || [];
        pendingTransfers.push(pendingTransferData);
        localStorage.setItem('pendingTransfers', JSON.stringify(pendingTransfers));

        // Simulate admin approval delay
        setTimeout(() => {
          setCustomerBalance(prev => prev + amount);
          toast({ title: t('success'), description: t('paymentSuccessful') });
        }, 5000); 
      };


      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5"
          key={language}
        >
          <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-primary">{t('customer')} {t('home')}</h1>
            <Button variant="ghost" onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
              <LogOut className="ltr:mr-2 rtl:ml-2 h-5 w-5" /> {t('logout')}
            </Button>
          </header>

          <BalanceDisplay 
            customerBalance={customerBalance}
            onAddFundsClick={handleOpenAddBalanceDialog}
            t={t}
          />

          <MaintenanceRequestForm
            maintenanceRequest={maintenanceRequest}
            onFieldChange={handleMaintenanceRequestFieldChange}
            onSubmit={handleCreateMaintenanceRequest}
            isLoading={isLoading}
            t={t}
            deviceTypes={deviceTypes}
            visitFee={VISIT_FEE}
          />
          
          <CustomerActionsGrid t={t} />

          <AcceptedTechniciansList technicians={displayedTechnicians} t={t} />

          <AddBalanceDialog
            open={isAddBalanceDialogOpen}
            onOpenChange={setIsAddBalanceDialogOpen}
            onConfirmTransfer={handleConfirmTransfer} // Changed from onProceed
          />

          {/* 
            PaymentInstructionsModal is not directly invoked here anymore for initial details.
            It could be used for a separate confirmation screen if needed in the future.
            Example:
            <PaymentInstructionsModal
              open={isPaymentInstructionsModalOpen}
              onOpenChange={setIsPaymentInstructionsModalOpen}
              paymentDetailsData={paymentDetailsData}
              onConfirmTransfer={() => {
                // Logic after user confirms they've seen instructions and made transfer
                setIsPaymentInstructionsModalOpen(false);
                // ... further processing ...
              }}
            />
          */}

        </motion.div>
      );
    };

    export default CustomerHomeScreen;
  