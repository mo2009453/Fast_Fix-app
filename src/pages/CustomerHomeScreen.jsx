import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { LogOut, MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast.jsx';
import { supabase } from '@/lib/supabaseClient';

const VISIT_FEE = 100;

const deviceTypes = [
  { value: 'washingMachine', labelKey: 'washingMachine' },
  { value: 'heater', labelKey: 'heater' },
  { value: 'oven', labelKey: 'oven' },
  { value: 'refrigerator', labelKey: 'refrigerator' },
  { value: 'airConditioner', labelKey: 'airConditioner' },
];

// دالة حساب المسافة بين نقطتين (بالكيلومترات) - haversine
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // نصف قطر الأرض
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const CustomerHomeScreen = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [customerBalance, setCustomerBalance] = useState(0);
  const [maintenanceRequest, setMaintenanceRequest] = useState({
    deviceType: '',
    issueDescription: '',
    phoneNumber: '',
    lat: null,
    lng: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeRequests, setActiveRequests] = useState([]);
  const [acceptedTechnicians, setAcceptedTechnicians] = useState([]);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate('/login/customer');
        return;
      }
      setCurrentUserEmail(user.email);

      const { data: customerData, error: balanceError } = await supabase
        .from('customers')
        .select('balance')
        .eq('id', user.id)
        .single();
      if (!balanceError && customerData) {
        setCustomerBalance(customerData.balance);
      } else {
        setCustomerBalance(0);
      }

      // جلب الطلبات النشطة من Supabase
      const { data: requests, error: reqError } = await supabase
        .from('maintenance_requests')
        .select('*, technician:technician_id ( id, full_name, phone, specialization, experience_years, lat, lng )')
        .eq('customer_id', user.id)
        .in('status', ['pending', 'accepted', 'on_the_way', 'in_progress'])
        .order('created_at', { ascending: false });

      if (!reqError) {
        setActiveRequests(requests || []);
      }
    };

    fetchUserData();
  }, [navigate]);

  // تحديث قائمة الفنيين المقبولين (عندما يوجد طلب له technician_id)
  useEffect(() => {
    const techs = activeRequests
      .filter(req => req.technician && req.technician.full_name)
      .map(req => {
        const tech = req.technician;
        let distance = null;
        if (req.lat && req.lng && tech.lat && tech.lng) {
          distance = getDistanceFromLatLonInKm(req.lat, req.lng, tech.lat, tech.lng);
        }
        return {
          id: tech.id,
          name: tech.full_name,
          phone: tech.phone,
          specialization: tech.specialization,
          experienceYears: tech.experience_years,
          distance,
        };
      });
    setAcceptedTechnicians(techs);
  }, [activeRequests]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    navigate('/user-type');
  };

  const handleFieldChange = (field, value) => {
    setMaintenanceRequest(prev => ({ ...prev, [field]: value }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: t('error'), description: 'متصفحك لا يدعم تحديد الموقع', variant: 'destructive' });
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMaintenanceRequest(prev => ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }));
        setGettingLocation(false);
        toast({ title: t('success'), description: 'تم تحديد موقعك بنجاح' });
      },
      (error) => {
        toast({ title: t('error'), description: 'فشل تحديد الموقع: ' + error.message, variant: 'destructive' });
        setGettingLocation(false);
      }
    );
  };

  const handleCreateMaintenanceRequest = async () => {
    if (!maintenanceRequest.deviceType || !maintenanceRequest.issueDescription || !maintenanceRequest.phoneNumber) {
      toast({ title: t('error'), description: 'جميع الحقول مطلوبة (الجهاز، الوصف، رقم الهاتف)', variant: 'destructive' });
      return;
    }
    if (maintenanceRequest.lat == null || maintenanceRequest.lng == null) {
      toast({ title: t('error'), description: 'يرجى تحديد موقعك أولاً', variant: 'destructive' });
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast({ title: t('error'), description: 'يجب تسجيل الدخول', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    if (customerBalance < VISIT_FEE) {
      toast({ title: t('error'), description: t('insufficientBalance'), variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    setCustomerBalance(prev => prev - VISIT_FEE);
    const { error: deductError } = await supabase
      .from('customers')
      .update({ balance: customerBalance - VISIT_FEE })
      .eq('id', user.id);
    if (deductError) console.error('فشل خصم الرصيد:', deductError);

    const newRequest = {
      customer_id: user.id,
      device_type: maintenanceRequest.deviceType,
      issue_description: maintenanceRequest.issueDescription,
      phone_number: maintenanceRequest.phoneNumber,
      lat: maintenanceRequest.lat,
      lng: maintenanceRequest.lng,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert([newRequest])
      .select();

    if (error) {
      toast({ title: t('error'), description: 'فشل إنشاء الطلب: ' + error.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    toast({ title: t('success'), description: 'تم إرسال الطلب للفنيين القريبين!' });
    setMaintenanceRequest({ deviceType: '', issueDescription: '', phoneNumber: '', lat: null, lng: null });
    if (data && data[0]) {
      setActiveRequests(prev => [data[0], ...prev]);
    }
    setIsLoading(false);
  };

  const handleOpenAddBalanceDialog = () => {}; // سنبقيها فارغة أو يمكننا إضافة النافذة لاحقاً

  const handleConfirmTransfer = () => {}; // مؤقت

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5"
    >
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">{t('customer')} {t('home')}</h1>
        <Button variant="ghost" onClick={handleLogout} className="text-destructive">
          <LogOut className="ltr:mr-2 rtl:ml-2 h-5 w-5" /> {t('logout')}
        </Button>
      </header>

      <div className="bg-card rounded-xl p-6 shadow-md mb-8">
        <h2 className="text-2xl font-semibold mb-4">طلب صيانة جديد</h2>
        <div className="space-y-4">
          <div>
            <Label>نوع الجهاز</Label>
            <select
              value={maintenanceRequest.deviceType}
              onChange={(e) => handleFieldChange('deviceType', e.target.value)}
              className="w-full rounded-md border border-input bg-background/70 px-3 py-2 text-sm"
            >
              <option value="">اختر الجهاز</option>
              {deviceTypes.map(d => (
                <option key={d.value} value={d.value}>{t(d.labelKey)}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>وصف العطل</Label>
            <Input value={maintenanceRequest.issueDescription} onChange={(e) => handleFieldChange('issueDescription', e.target.value)} />
          </div>
          <div>
            <Label>رقم الهاتف للتواصل</Label>
            <Input value={maintenanceRequest.phoneNumber} onChange={(e) => handleFieldChange('phoneNumber', e.target.value)} placeholder="01xxxxxxxxx" />
          </div>
          <div>
            <Label>موقعك الحالي</Label>
            <div className="flex gap-2 items-center">
              <Button variant="outline" onClick={handleGetLocation} disabled={gettingLocation}>
                <MapPin size={16} className="ltr:mr-2 rtl:ml-2" />
                {gettingLocation ? 'جاري التحديد...' : 'تحديد موقعي'}
              </Button>
              {maintenanceRequest.lat != null && (
                <span className="text-green-500 text-sm">✓ تم تحديد الموقع</span>
              )}
            </div>
          </div>
          <Button onClick={handleCreateMaintenanceRequest} disabled={isLoading} className="w-full">
            {isLoading ? 'جاري الإرسال...' : `إرسال الطلب (رسوم الكشف: ${VISIT_FEE} جنيه)`}
          </Button>
        </div>
      </div>

      {acceptedTechnicians.length > 0 && (
        <div className="bg-card rounded-xl p-6 shadow-md mb-8">
          <h2 className="text-2xl font-semibold mb-4">الفنيون المقبولون لطلبك</h2>
          {acceptedTechnicians.map((tech, idx) => (
            <div key={idx} className="border rounded-lg p-3 mb-2">
              <p className="font-bold">{tech.name}</p>
              {tech.specialization && <p className="text-sm">التخصص: {tech.specialization}</p>}
              {tech.distance != null && (
                <p className="text-sm">المسافة: {tech.distance.toFixed(1)} كم</p>
              )}
              {tech.phone && <p className="text-sm">رقم الهاتف: {tech.phone}</p>}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default CustomerHomeScreen;