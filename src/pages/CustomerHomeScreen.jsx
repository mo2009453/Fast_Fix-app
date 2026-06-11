import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { LogOut, MapPin, Clock, Star, Phone } from 'lucide-react';
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

// حساب المسافة
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const CustomerHomeScreen = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [customerBalance, setCustomerBalance] = useState(0);
  const [maintenanceRequest, setMaintenanceRequest] = useState({
    deviceType: '', issueDescription: '', phoneNumber: '', lat: null, lng: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeRequests, setActiveRequests] = useState([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [biddersMap, setBiddersMap] = useState({});

  // تنظيف التعيينات المنتهية الصلاحية عند تحميل الصفحة
  useEffect(() => {
    supabase.rpc('expire_stale_assignments');
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login/customer'); return; }
      setCurrentUserEmail(user.email);

      const { data: cust } = await supabase.from('customers').select('balance').eq('id', user.id).single();
      if (cust) setCustomerBalance(cust.balance);

      const { data: requests } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('customer_id', user.id)
        .in('status', ['pending', 'bidding', 'assigned', 'accepted', 'on_the_way', 'in_progress'])
        .order('created_at', { ascending: false });

      if (requests) setActiveRequests(requests);

      if (requests && requests.length > 0) {
        const requestIds = requests.filter(r => r.status === 'bidding' || r.status === 'pending').map(r => r.id);
        if (requestIds.length > 0) {
          const { data: bids } = await supabase
            .from('bids')
            .select('request_id, technician:technician_id ( id, full_name, phone, specialization, lat, lng )')
            .in('request_id', requestIds);

          if (bids) {
            const map = {};
            bids.forEach(b => {
              if (!map[b.request_id]) map[b.request_id] = [];
              map[b.request_id].push({ ...b.technician, distance: getDistance(
                requests.find(r => r.id === b.request_id)?.lat,
                requests.find(r => r.id === b.request_id)?.lng,
                b.technician.lat,
                b.technician.lng
              )});
            });
            setBiddersMap(map);
          }
        }
      }
    };
    init();
  }, []);

  const handleFieldChange = (field, value) => setMaintenanceRequest(prev => ({ ...prev, [field]: value }));

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMaintenanceRequest(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setGettingLocation(false);
      },
      () => { setGettingLocation(false); toast({ description: 'فشل تحديد الموقع.' }); }
    );
  };

  const handleCreateRequest = async () => {
    if (!maintenanceRequest.deviceType || !maintenanceRequest.issueDescription || !maintenanceRequest.phoneNumber || maintenanceRequest.lat == null) {
      toast({ description: 'جميع الحقول والموقع مطلوبة.' }); return;
    }
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('maintenance_requests').insert([{
      customer_id: user.id,
      device_type: maintenanceRequest.deviceType,
      issue_description: maintenanceRequest.issueDescription,
      phone_number: maintenanceRequest.phoneNumber,
      lat: maintenanceRequest.lat,
      lng: maintenanceRequest.lng,
      status: 'pending'
    }]).select();
    setIsLoading(false);
    if (error) toast({ description: 'خطأ: ' + error.message });
    else {
      toast({ description: 'تم إرسال الطلب!' });
      setActiveRequests(prev => [data[0], ...prev]);
      setMaintenanceRequest({ deviceType: '', issueDescription: '', phoneNumber: '', lat: null, lng: null });
    }
  };

  const handleSelectTechnician = async (requestId, technicianId) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60000); // 10 دقائق
    const { error } = await supabase
      .from('maintenance_requests')
      .update({
        technician_id: technicianId,
        status: 'assigned',
        assigned_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .eq('id', requestId)
      .eq('customer_id', (await supabase.auth.getUser()).data.user.id);

    if (error) toast({ description: 'فشل تأكيد الفني.' });
    else {
      toast({ description: 'تم تعيين الفني. أمامه 10 دقائق للبدء.' });
      setActiveRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'assigned', technician_id: technicianId, expires_at: expiresAt.toISOString() } : r));
    }
  };

  // حساب الوقت المتبقي
  const getTimeLeft = (expiresAt) => {
    if (!expiresAt) return '';
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return 'انتهت الصلاحية';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">{t('customer')} {t('home')}</h1>
        <Button variant="ghost" onClick={() => { localStorage.clear(); navigate('/user-type'); }}>
          <LogOut className="ltr:mr-2 rtl:ml-2 h-5 w-5" /> {t('logout')}
        </Button>
      </header>

      {/* نموذج طلب جديد */}
      <div className="bg-card p-6 rounded-2xl shadow mb-8">
        <h2 className="text-2xl font-bold mb-4">طلب صيانة جديد</h2>
        <div className="space-y-4">
          <div>
            <Label>نوع الجهاز</Label>
            <select value={maintenanceRequest.deviceType} onChange={e => handleFieldChange('deviceType', e.target.value)} className="w-full rounded-md border p-2">
              <option value="">اختر...</option>
              {deviceTypes.map(d => <option key={d.value} value={d.value}>{t(d.labelKey)}</option>)}
            </select>
          </div>
          <div>
            <Label>وصف العطل</Label>
            <Input value={maintenanceRequest.issueDescription} onChange={e => handleFieldChange('issueDescription', e.target.value)} />
          </div>
          <div>
            <Label>رقم الهاتف</Label>
            <Input value={maintenanceRequest.phoneNumber} onChange={e => handleFieldChange('phoneNumber', e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleGetLocation} disabled={gettingLocation}><MapPin size={16} /> تحديد الموقع</Button>
            {maintenanceRequest.lat != null && <span className="text-green-500 text-sm">✓ تم</span>}
          </div>
          <Button className="w-full" onClick={handleCreateRequest} disabled={isLoading}>إرسال الطلب</Button>
        </div>
      </div>

      {/* عرض الطلبات النشطة والعروض */}
      {activeRequests.map(request => (
        <div key={request.id} className="bg-card p-6 rounded-2xl shadow mb-6">
          <h3 className="font-bold text-xl">{t(request.device_type)} - <span className="text-sm text-muted-foreground">{request.status}</span></h3>
          <p className="text-sm mt-1">{request.issue_description}</p>
          <p className="text-xs text-muted-foreground">هاتفك: {request.phone_number}</p>

          {(request.status === 'pending' || request.status === 'bidding') && biddersMap[request.id] && (
            <div className="mt-4 border-t pt-4">
              <h4 className="font-semibold mb-2">الفنيون المتقدمون:</h4>
              <div className="space-y-2">
                {biddersMap[request.id].map((tech, idx) => (
                  <div key={idx} className="flex justify-between items-center border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{tech.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        المسافة: {tech.distance?.toFixed(1)} كم | {tech.specialization} | ★ 4.5
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleSelectTechnician(request.id, tech.id)}>اختيار</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {request.status === 'assigned' && (
            <div className="mt-4 border-t pt-4">
              <p className="font-medium text-green-700">تم تعيين فني للطلب.</p>
              {request.expires_at && (
                <p className="text-xs flex items-center gap-1 mt-1">
                  <Clock size={14} /> الوقت المتبقي: {getTimeLeft(request.expires_at)}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </motion.div>
  );
};

export default CustomerHomeScreen;