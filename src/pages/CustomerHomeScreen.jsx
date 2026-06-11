import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { LogOut, MapPin, Clock, Wrench, Settings, User, AlertTriangle } from 'lucide-react';
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

// حساب المسافة مع التحقق من صحة الإحداثيات
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
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

  const [customer, setCustomer] = useState(null);
  const [customerBalance, setCustomerBalance] = useState(0);
  const [maintenanceRequest, setMaintenanceRequest] = useState({
    deviceType: '', issueDescription: '', phoneNumber: '', address: '', lat: null, lng: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeRequests, setActiveRequests] = useState([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [biddersMap, setBiddersMap] = useState({});

  useEffect(() => {
    supabase.rpc('expire_stale_assignments').catch(() => {});
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) { navigate('/login/customer'); return; }

        // جلب بيانات العميل
        const { data: cust, error: custError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (custError) {
          toast({ description: 'فشل تحميل الملف الشخصي.' });
          return;
        }

        const profile = cust || {};
        setCustomer(profile);
        setCustomerBalance(profile.balance || 0);
        setMaintenanceRequest(prev => ({
          ...prev,
          phoneNumber: profile.phone || '',
          address: profile.address || ''
        }));

        // جلب الطلبات
        const { data: requests, error: reqError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('customer_id', user.id)
          .in('status', ['pending', 'bidding', 'assigned', 'accepted', 'on_the_way', 'in_progress'])
          .order('created_at', { ascending: false });

        if (reqError || !requests) {
          setActiveRequests([]);
          return;
        }

        setActiveRequests(requests);

        // جلب العروض للطلبات المعلقة
        const biddingRequestIds = requests
          .filter(r => r.status === 'pending' || r.status === 'bidding')
          .map(r => r.id);

        if (biddingRequestIds.length > 0) {
          const { data: bids, error: bidsError } = await supabase
            .from('bids')
            .select('request_id, technician:technician_id ( id, full_name, phone, specialization, lat, lng )')
            .in('request_id', biddingRequestIds);

          if (bids && !bidsError) {
            const map = {};
            bids.forEach(b => {
              if (!b.technician) return; // ✅ تجاهل إذا لم توجد بيانات الفني

              if (!map[b.request_id]) map[b.request_id] = [];

              // حساب المسافة بأمان
              const request = requests.find(r => r.id === b.request_id);
              const distance = getDistance(
                request?.lat, request?.lng,
                b.technician.lat, b.technician.lng
              );

              map[b.request_id].push({
                id: b.technician.id,
                full_name: b.technician.full_name,
                phone: b.technician.phone,
                specialization: b.technician.specialization,
                distance: distance === Infinity ? null : distance,
              });
            });
            setBiddersMap(map);
          }
        }
      } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        toast({ description: 'حدث خطأ أثناء تحميل البيانات.' });
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
      address: maintenanceRequest.address,
      lat: maintenanceRequest.lat,
      lng: maintenanceRequest.lng,
      status: 'pending'
    }]).select();
    setIsLoading(false);
    if (error) toast({ description: 'خطأ: ' + error.message });
    else {
      toast({ description: 'تم إرسال الطلب!' });
      setActiveRequests(prev => [data[0], ...prev]);
      setMaintenanceRequest(prev => ({ ...prev, deviceType: '', issueDescription: '', address: '' }));
    }
  };

  const handleSelectTechnician = async (requestId, technicianId) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60000);
    const { data, error } = await supabase
      .from('maintenance_requests')
      .update({
        technician_id: technicianId,
        status: 'assigned',
        assigned_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .eq('id', requestId)
      .eq('customer_id', (await supabase.auth.getUser()).data.user.id)
      .select();

    if (error) {
      toast({
        title: 'فشل تأكيد الفني',
        description: `الخطأ: ${error.message} (كود: ${error.code})`,
        variant: 'destructive'
      });
    } else if (!data || data.length === 0) {
      toast({
        title: 'فشل تأكيد الفني',
        description: 'لم يتم العثور على الطلب أو ليس لديك صلاحية تعديله.',
        variant: 'destructive'
      });
    } else {
      toast({ title: 'تم', description: 'تم تعيين الفني. أمامه 10 دقائق للبدء.' });
      setActiveRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'assigned', technician_id: technicianId, expires_at: expiresAt.toISOString() } : r));
    }
  };

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
      <header className="flex justify-between items-center mb-8 bg-card/50 backdrop-blur-sm p-4 rounded-2xl shadow-lg border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            {customer?.full_name?.charAt(0) || 'ع'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">أهلاً {customer?.full_name || 'عميلنا'}</h1>
            <p className="text-xs text-muted-foreground">الرصيد: {customerBalance} جنيه</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => { localStorage.clear(); navigate('/user-type'); }}>
          <LogOut className="ltr:mr-2 rtl:ml-2 h-5 w-5" /> خروج
        </Button>
      </header>

      {/* نموذج الطلب */}
      <div className="bg-card p-6 rounded-2xl shadow mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Settings className="text-primary" /> طلب صيانة جديد
        </h2>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>رقم الهاتف</Label>
              <Input value={maintenanceRequest.phoneNumber} onChange={e => handleFieldChange('phoneNumber', e.target.value)} />
            </div>
            <div>
              <Label>العنوان التفصيلي</Label>
              <Input value={maintenanceRequest.address} onChange={e => handleFieldChange('address', e.target.value)} placeholder="الشارع، المنطقة..." />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleGetLocation} disabled={gettingLocation}><MapPin size={16} /> تحديد الموقع</Button>
            {maintenanceRequest.lat != null && <span className="text-green-500 text-sm">✓ تم</span>}
          </div>
          <Button className="w-full" onClick={handleCreateRequest} disabled={isLoading}>إرسال الطلب</Button>
        </div>
      </div>

      {/* الطلبات النشطة */}
      {activeRequests.map(request => (
        <motion.div key={request.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card p-6 rounded-2xl shadow mb-6">
          <h3 className="font-bold text-xl flex items-center gap-2">
            <Wrench size={20} className="text-primary" /> {t(request.device_type)}
          </h3>
          <p className="text-sm mt-1">{request.issue_description}</p>
          <div className="flex gap-4 text-xs text-muted-foreground mt-2">
            <span>📞 {request.phone_number}</span>
            {request.address && <span>📍 {request.address}</span>}
          </div>

          {(request.status === 'pending' || request.status === 'bidding') && biddersMap[request.id] && (
            <div className="mt-4 border-t pt-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <User size={16} /> الفنيون المتقدمون
              </h4>
              <div className="space-y-2">
                {biddersMap[request.id].map((tech, idx) => (
                  <div key={idx} className="flex justify-between items-center border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center text-white text-sm">
                        {tech.full_name?.charAt(0) || 'ف'}
                      </div>
                      <div>
                        <p className="font-medium">{tech.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tech.distance != null ? `🚗 ${tech.distance.toFixed(1)} كم` : '🚗 المسافة غير معروفة'} | {tech.specialization} | ★ 4.5
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleSelectTechnician(request.id, tech.id)}>اختيار</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {request.status === 'assigned' && (
            <div className="mt-4 border-t pt-4">
              <p className="font-medium text-green-700">✅ تم تعيين فني للطلب.</p>
              {request.expires_at && (
                <p className="text-xs flex items-center gap-1 mt-1">
                  <Clock size={14} /> الوقت المتبقي: {getTimeLeft(request.expires_at)}
                </p>
              )}
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
};

export default CustomerHomeScreen;