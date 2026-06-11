import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { LogOut, MapPin, Clock, Wrench, Settings, User, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast.jsx';
import { supabase } from '@/lib/supabaseClient';

// --- مكون أمان لالتقاط الأخطاء ---
class SafeComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <AlertTriangle size={64} className="text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">حدث خطأ مفاجئ</h1>
          <p className="text-center text-muted-foreground mb-4">{this.state.error?.message || 'يرجى إعادة المحاولة'}</p>
          <Button onClick={() => this.setState({ error: null })} className="gap-2">
            <RefreshCw size={16} /> إعادة تحميل الواجهة
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- دوال مساعدة ---
const deviceTypes = [
  { value: 'washingMachine', labelKey: 'washingMachine' },
  { value: 'heater', labelKey: 'heater' },
  { value: 'oven', labelKey: 'oven' },
  { value: 'refrigerator', labelKey: 'refrigerator' },
  { value: 'airConditioner', labelKey: 'airConditioner' },
];

const getDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// --- الصفحة الرئيسية ---
const CustomerHomeScreenContent = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customer, setCustomer] = useState(null);
  const [balance, setBalance] = useState(0);
  const [reqForm, setReqForm] = useState({
    deviceType: '', issueDescription: '', phoneNumber: '', address: '', lat: null, lng: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [gettingLoc, setGettingLoc] = useState(false);
  const [bidders, setBidders] = useState({});
  const [pageReady, setPageReady] = useState(false);

  // التحميل الأول
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) {
          navigate('/login/customer');
          return;
        }

        const { data: cust, error: custErr } = await supabase
          .from('customers')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (custErr) console.warn('فشل جلب العميل:', custErr);
        const profile = cust || {};

        if (!cancelled) {
          setCustomer(profile);
          setBalance(profile.balance || 0);
          setReqForm(prev => ({
            ...prev,
            phoneNumber: profile.phone || '',
            address: profile.address || '',
          }));
        }

        const { data: reqs, error: reqsErr } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('customer_id', user.id)
          .in('status', ['pending', 'bidding', 'assigned', 'accepted', 'on_the_way', 'in_progress'])
          .order('created_at', { ascending: false });

        if (reqsErr) console.warn('فشل جلب الطلبات:', reqsErr);
        const requestsList = reqs || [];

        if (!cancelled) setRequests(requestsList);

        // جلب العروض
        const biddingIds = requestsList
          .filter(r => r.status === 'pending' || r.status === 'bidding')
          .map(r => r.id);

        if (biddingIds.length > 0) {
          const { data: bidsData, error: bidsErr } = await supabase
            .from('bids')
            .select('request_id, technician:technician_id ( id, full_name, phone, specialization, lat, lng )')
            .in('request_id', biddingIds);

          if (bidsErr) console.warn('فشل جلب العروض:', bidsErr);

          if (bidsData) {
            const map = {};
            bidsData.forEach(b => {
              const tech = b.technician;
              if (!tech || !tech.id) return;
              const req = requestsList.find(r => r.id === b.request_id);
              const dist = getDistance(req?.lat, req?.lng, tech.lat, tech.lng);
              if (!map[b.request_id]) map[b.request_id] = [];
              map[b.request_id].push({
                id: tech.id,
                full_name: tech.full_name || 'فني',
                phone: tech.phone || '',
                specialization: tech.specialization || '',
                distance: dist,
              });
            });
            if (!cancelled) setBidders(map);
          }
        }

        if (!cancelled) setPageReady(true);
      } catch (err) {
        console.error('خطأ عام في التحميل:', err);
        if (!cancelled) setPageReady(true); // حتى لا يعلق في التحميل
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const handleField = (f, v) => setReqForm(prev => ({ ...prev, [f]: v }));

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setGettingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setReqForm(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setGettingLoc(false);
      },
      () => { setGettingLoc(false); toast({ description: 'فشل تحديد الموقع.' }); }
    );
  };

  const handleCreate = async () => {
    if (!reqForm.deviceType || !reqForm.issueDescription || !reqForm.phoneNumber || reqForm.lat == null) {
      toast({ description: 'جميع الحقول والموقع مطلوبة.' }); return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('maintenance_requests').insert([{
      customer_id: user.id,
      device_type: reqForm.deviceType,
      issue_description: reqForm.issueDescription,
      phone_number: reqForm.phoneNumber,
      address: reqForm.address,
      lat: reqForm.lat,
      lng: reqForm.lng,
      status: 'pending'
    }]).select();
    setSubmitting(false);
    if (error) toast({ description: 'فشل: ' + error.message });
    else {
      toast({ description: 'تم إرسال الطلب!' });
      setRequests(prev => [data[0], ...prev]);
      setReqForm(prev => ({ ...prev, deviceType: '', issueDescription: '', address: '' }));
    }
  };

  const handleSelect = async (reqId, techId) => {
    const now = new Date();
    const expires = new Date(now.getTime() + 10 * 60000);
    const { data, error } = await supabase
      .from('maintenance_requests')
      .update({ technician_id: techId, status: 'assigned', assigned_at: now.toISOString(), expires_at: expires.toISOString() })
      .eq('id', reqId)
      .eq('customer_id', (await supabase.auth.getUser()).data.user.id)
      .select();

    if (error) {
      toast({ title: 'فشل', description: `${error.message} (${error.code})` });
    } else if (!data?.length) {
      toast({ title: 'فشل', description: 'لم يتم العثور على الطلب.' });
    } else {
      toast({ title: 'تم', description: 'تم تعيين الفني.' });
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'assigned', technician_id: techId, expires_at: expires.toISOString() } : r));
    }
  };

  const timeLeft = (exp) => {
    if (!exp) return '';
    const diff = new Date(exp) - new Date();
    if (diff <= 0) return 'انتهت';
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!pageReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient">
        <RefreshCw className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const avatarLetter = (customer?.full_name || 'ع')[0];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="flex justify-between items-center mb-8 bg-card/50 backdrop-blur-sm p-4 rounded-2xl shadow-lg border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            {avatarLetter}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {t('customer')} {t('home')}
            </h1>
            <p className="text-sm text-muted-foreground">الرصيد: {balance} جنيه</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => { localStorage.clear(); navigate('/user-type'); }}>
          <LogOut className="ltr:mr-2 rtl:ml-2 h-5 w-5" /> {t('logout')}
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
            <select value={reqForm.deviceType} onChange={e => handleField('deviceType', e.target.value)} className="w-full rounded-md border p-2">
              <option value="">اختر...</option>
              {deviceTypes.map(d => <option key={d.value} value={d.value}>{t(d.labelKey)}</option>)}
            </select>
          </div>
          <div>
            <Label>وصف العطل</Label>
            <Input value={reqForm.issueDescription} onChange={e => handleField('issueDescription', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>رقم الهاتف</Label>
              <Input value={reqForm.phoneNumber} onChange={e => handleField('phoneNumber', e.target.value)} />
            </div>
            <div>
              <Label>العنوان التفصيلي</Label>
              <Input value={reqForm.address} onChange={e => handleField('address', e.target.value)} placeholder="الشارع، المنطقة..." />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleGetLocation} disabled={gettingLoc}><MapPin size={16} /> تحديد الموقع</Button>
            {reqForm.lat != null && <span className="text-green-500 text-sm">✓ تم</span>}
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={submitting}>إرسال الطلب</Button>
        </div>
      </div>

      {/* الطلبات النشطة */}
      {requests.map(req => (
        <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card p-6 rounded-2xl shadow mb-6">
          <h3 className="font-bold text-xl flex items-center gap-2">
            <Wrench size={20} className="text-primary" /> {t(req.device_type)}
          </h3>
          <p className="text-sm mt-1">{req.issue_description}</p>
          <div className="flex gap-4 text-xs text-muted-foreground mt-2">
            <span>📞 {req.phone_number}</span>
            {req.address && <span>📍 {req.address}</span>}
          </div>

          {(req.status === 'pending' || req.status === 'bidding') && bidders[req.id] && bidders[req.id].length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <User size={16} /> الفنيون المتقدمون
              </h4>
              <div className="space-y-2">
                {bidders[req.id].map((tech, idx) => (
                  <div key={idx} className="flex justify-between items-center border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center text-white text-sm">
                        {(tech.full_name || 'ف')[0]}
                      </div>
                      <div>
                        <p className="font-medium">{tech.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tech.distance != null ? `🚗 ${tech.distance.toFixed(1)} كم` : '🚗 المسافة غير معروفة'} | {tech.specialization} | ★ 4.5
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleSelect(req.id, tech.id)}>اختيار</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {req.status === 'assigned' && (
            <div className="mt-4 border-t pt-4">
              <p className="font-medium text-green-700">✅ تم تعيين فني للطلب.</p>
              {req.expires_at && (
                <p className="text-xs flex items-center gap-1 mt-1">
                  <Clock size={14} /> الوقت المتبقي: {timeLeft(req.expires_at)}
                </p>
              )}
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
};

// المكون الرئيسي المغلف بالأمان
const CustomerHomeScreen = () => (
  <SafeComponent>
    <CustomerHomeScreenContent />
  </SafeComponent>
);

export default CustomerHomeScreen;