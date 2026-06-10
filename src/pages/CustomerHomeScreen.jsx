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

// --- تمت الإضافة: استيراد Supabase ---
import { supabase } from '@/lib/supabaseClient';

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

  // --- الدالة الجديدة التي تستخدم Supabase ---
  const handleCreateMaintenanceRequest = async () => {
    if (!maintenanceRequest.deviceType || !maintenanceRequest.issueDescription) {
      toast({ title: t('error'), description: t('allFieldsRequired'), variant: 'destructive' });
      return;
    }

    // 1. جلب المستخدم الحقيقي من Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast({ title: t('error'), description: 'يجب تسجيل الدخول', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    // 2. التحقق من الرصيد المحلي
    if (customerBalance < VISIT_FEE) {
      toast({ title: t('error'), description: t('insufficientBalance'), variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    // خصم الرسوم
    setCustomerBalance(prev => prev - VISIT_FEE);

    // 3. بناء الطلب وإرساله إلى Supabase
    const newRequest = {
      customer_id: user.id,
      device_type: maintenanceRequest.deviceType,
      issue_description: maintenanceRequest.issueDescription,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert([newRequest])
      .select();

    if (error) {
      console.error('Error creating request:', error);
      toast({ title: t('error'), description: 'فشل في إرسال الطلب', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    // 4. نجاح
    toast({ title: t('success'), description: 'تم إرسال الطلب للفنيين القريبين!' });
    setMaintenanceRequest({ deviceType: '', issueDescription: '' });

    // إضافة الطلب محليًا (كي يظهر فورًا في القائمة)
    if (data && data[0]) {
      setActiveRequests(prev => [...prev, data[0]]);
    }

    setIsLoading(false);
  };

  const handleOpenAddBalanceDialog = () => setIsAddBalanceDialogOpen(true);

  // --- دالة الشحن الجديدة (ترسل طلب شحن بدلاً من إضافة الرصيد مباشرة) ---
  const handleConfirmTransfer = (method, amount, source, screenshot) => {
    setIsAddBalanceDialogOpen(false);

    const transferData = {
      method,
      amount,
      source,
      screenshotName: screenshot ? screenshot.name : 'N/A',
      userEmail: currentUserEmail,
      timestamp: new Date().toISOString(),
    };

    // حفظ نسخة مؤقتة محلياً (اختياري)
    const pendingTransfers = JSON.parse(localStorage.getItem('pendingTransfers')) || [];
    pendingTransfers.push(transferData);
    localStorage.setItem('pendingTransfers', JSON.stringify(pendingTransfers));

    // إرسال طلب الشحن إلى جدول recharge_requests في Supabase
    const insertRechargeRequest = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: t('error'), description: 'يجب تسجيل الدخول لطلب الشحن', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('recharge_requests').insert([{
        user_id: user.id,
        email: currentUserEmail,
        amount: amount,
        phone_number: source,
        screenshot_path: screenshot ? screenshot.name : null,
        status: 'pending'
      }]);

      if (error) {
        console.error('خطأ في إرسال طلب الشحن:', error);
        toast({ title: t('error'), description: 'فشل إرسال طلب الشحن', variant: 'destructive' });
      } else {
        toast({ title: t('success'), description: 'تم إرسال طلب الشحن للمراجعة. سيتم إضافة الرصيد بعد الموافقة.' });
      }
    };

    insertRechargeRequest();
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
        onConfirmTransfer={handleConfirmTransfer}
      />
    </motion.div>
  );
};

export default CustomerHomeScreen;