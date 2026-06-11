import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  LogOut, MapPin, Clock, Wrench, Settings, User, AlertTriangle, RefreshCw,
  XCircle, MessageSquare, ThumbsUp, CheckCircle, Truck, MessageCircle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast.jsx';
import { supabase } from '@/lib/supabaseClient';
import ChatPopup from '@/components/ChatPopup.jsx';

const VISIT_FEE = 100;

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
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
          <AlertTriangle size={64} className="text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">حدث خطأ</h1>
          <p className="text-center text-muted-foreground mb-4">{this.state.error?.message}</p>
          <Button onClick={() => this.setState({ error: null })}>
            <RefreshCw size={16} /> إعادة تحميل
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

  // حالات النماذج
  const [complaintOpen, setComplaintOpen] = useState(null);
  const [complaintText, setComplaintText] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [cancelVisitOpen, setCancelVisitOpen] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [chatRequestId, setChatRequestId] = useState(null); // لفتح الشات

  // تنظيف التعيينات المنتهية (آمن)
  useEffect(() => {
    const cleanup = async () => {
      if (supabase && typeof supabase.rpc === 'function') {
        try {
          await supabase.rpc('expire_stale_assignments');
        } catch (err) {
          // لا شيء
        }
      }
    };
    cleanup();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) { navigate('/login/customer'); return; }

        const { data: cust } = await supabase.from('customers').select('*').eq('id', user.id).maybeSingle();
        const profile = cust || {};
        if (!cancelled) {
          setCustomer(profile);
          setBalance(profile.balance || 0);
          setReqForm(prev => ({ ...prev, phoneNumber: profile.phone || '', address: profile.address || '' }));
        }

        const { data: reqs } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('customer_id', user.id)
          .in('status', ['pending', 'bidding', 'assigned', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled'])
          .order('created_at', { ascending: false });

        const requestsList = reqs || [];
        if (!cancelled) setRequests(requestsList);

        const biddingIds = requestsList.filter(r => r.status === 'pending' || r.status === 'bidding').map(r => r.id);
        if (biddingIds.length > 0) {
          const { data: bidsData } = await supabase.from('bids')
            .select('request_id, technician:technician_id ( id, full_name, phone, specialization, lat, lng )')
            .in('request_id', biddingIds);
          if (bidsData) {
            const map = {};
            bidsData.forEach(b => {
              const tech = b.technician;
              if (!tech?.id) return;
              const req = requestsList.find(r => r.id === b.request_id);
              const dist = getDistance(req?.lat, req?.lng, tech.lat, tech.lng);
              if (!map[b.request_id]) map[b.request_id] = [];
              map[b.request_id].push({
                id: tech.id, full_name: tech.full_name || 'فني', phone: tech.phone || '',
                specialization: tech.specialization || '', distance: dist,
              });
            });
            if (!cancelled) setBidders(map);
          }
        }
        if (!cancelled) setPageReady(true);
      } catch (err) {
        console.error(err);
        if (!cancelled) setPageReady(true);
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
      (pos) => { setReqForm(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude })); setGettingLoc(false); },
      () => { setGettingLoc(false); toast({ description: 'فشل تحديد الموقع.' }); }
    );
  };

  const handleCreate = async () => {
    if (!reqForm.deviceType || !reqForm.issueDescription || !reqForm.phoneNumber || reqForm.lat == null) {
      toast({ description: 'جميع الحقول والموقع مطلوبة.' }); return;
    }
    if (balance < VISIT_FEE) {
      toast({ description: 'الرصيد غير كافٍ.' }); return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const newBalance = balance - VISIT_FEE;
    setBalance(newBalance);
    await supabase.from('customers').update({ balance: newBalance }).eq('id', user.id);

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
    if (error) {    // استرجاع الرصيد إذا فشل الطلب
      setBalance(balance);
      await supabase.from('customers').update({ balance }).eq('id', user.id);
      toast({ description: 'فشل: ' + error.message });
    } else {
      toast({ description: 'تم إرسال الطلب! تم خصم 100 جنيه.' });
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
    if (error) toast({ title: 'فشل', description: `${error.message}` });
    else if (!data?.length) toast({ title: 'فشل', description: 'لم يتم العثور على الطلب.' });
    else {
      toast({ title: 'تم', description: 'تم تعيين الفني.' });
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'assigned', technician_id: techId, expires_at: expires.toISOString() } : r));
    }
  };

  // إنشاء طلب استرداد بدلاً من إعادة الرصيد مباشرة
  const createRefundRequest = async (reqId, reason = '') => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('recharge_requests').insert({
      user_id: user.id,
      email: user.email,
      amount: VISIT_FEE,
      phone_number: customer?.phone || '',
      request_type: 'refund',
      related_request_id: reqId,
      status: 'pending',
      notes: reason,
    });
    toast({ description: 'تم تقديم طلب استرداد. سيتم مراجعته خلال 24 ساعة.' });
  };

  const handleCancelRequest = async (reqId) => {
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', reqId)
      .eq('customer_id', (await supabase.auth.getUser()).data.user.id);
    if (error) {
      toast({ description: 'فشل الإلغاء.' });
    } else {
      await createRefundRequest(reqId);
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'cancelled' } : r));
    }
  };

  const handleCancelVisit = async (reqId) => {
    if (!cancelReason.trim()) { toast({ description: 'اكتب سبب الإلغاء.' }); return; }
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: cancelReason })
      .eq('id', reqId)
      .eq('customer_id', (await supabase.auth.getUser()).data.user.id);
    if (error) {
      toast({ description: 'فشل الإلغاء.' });
    } else {
      await createRefundRequest(reqId, cancelReason);
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'cancelled', cancel_reason: cancelReason } : r));
      setCancelVisitOpen(null);
      setCancelReason('');
    }
  };

  const handleSubmitComplaint = async (reqId) => {
    if (!complaintText.trim()) { toast({ description: 'اكتب الشكوى.' }); return; }
    const { data: req } = await supabase.from('maintenance_requests').select('complaints').eq('id', reqId).single();
    const currentComplaints = req?.complaints || [];
    const updated = [...currentComplaints, { text: complaintText, date: new Date().toISOString() }];
    await supabase.from('maintenance_requests').update({ complaints: updated }).eq('id', reqId);
    toast({ description: 'تم تسجيل الشكوى.' });
    setComplaintOpen(null);
    setComplaintText('');
  };

  const handleSubmitFeedback = async (reqId) => {
    if (!feedbackText.trim()) { toast({ description: 'اكتب تعليقاً.' }); return; }
    await supabase.from('maintenance_requests').update({ feedback: feedbackText }).eq('id', reqId);
    toast({ description: 'تم إرسال التعليق.' });
    setFeedbackOpen(null);
    setFeedbackText('');
  };

  const timeLeft = (exp) => {
    if (!exp) return '';
    const diff = new Date(exp) - new Date();
    if (diff <= 0) return 'انتهت';
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const statusSteps = [
    { key: 'pending', label: 'تم الإرسال', icon: <CheckCircle size={16} /> },
    { key: 'assigned', label: 'تم تعيين فني', icon: <User size={16} /> },
    { key: 'accepted', label: 'الفني قبل', icon: <CheckCircle size={16} /> },
    { key: 'on_the_way', label: 'في الطريق', icon: <Truck size={16} /> },
    { key: 'in_progress', label: 'جاري الإصلاح', icon: <Wrench size={16} /> },
    { key: 'completed', label: 'مكتمل', icon: <CheckCircle size={16} /> },
  ];

  const getStatusIndex = (status) => {
    const mapping = { pending: 0, bidding: 0, assigned: 1, accepted: 2, on_the_way: 3, in_progress: 4, completed: 5 };
    return mapping[status] ?? -1;
  };

  if (!pageReady) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="animate-spin" size={32} /></div>;

  const avatarLetter = (customer?.full_name || 'ع')[0];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="flex justify-between items-center mb-8 bg-card/50 backdrop-blur-sm p-4 rounded-2xl shadow-lg border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center text-white font-bold text-xl shadow-md">{avatarLetter}</div>
          <div>
            <h1 className="text-2xl font-bold text-primary">أهلاً {customer?.full_name || 'عميلنا'}</h1>
            <p className="text-sm text-muted-foreground">الرصيد: {balance} جنيه</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => { localStorage.clear(); navigate('/user-type'); }}><LogOut className="ltr:mr-2 rtl:ml-2" /> {t('logout')}</Button>
      </header>
  {/* نموذج الطلب */}
      <div className="bg-card p-6 rounded-2xl shadow mb-8">
        <h2 className="text-2xl font-bold mb-4"><Settings className="inline text-primary" /> طلب صيانة جديد</h2>
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
            <div><Label>رقم الهاتف</Label><Input value={reqForm.phoneNumber} onChange={e => handleField('phoneNumber', e.target.value)} /></div>
            <div><Label>العنوان</Label><Input value={reqForm.address} onChange={e => handleField('address', e.target.value)} placeholder="الشارع، المنطقة..." /></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleGetLocation} disabled={gettingLoc}><MapPin size={16} /> تحديد الموقع</Button>
            {reqForm.lat != null && <span className="text-green-500 text-sm">✓ تم</span>}
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={submitting}>إرسال الطلب (خصم {VISIT_FEE} جنيه)</Button>
        </div>
      </div>

      {/* الطلبات النشطة */}
      {requests.map(req => {
        const statusIdx = getStatusIndex(req.status);
        return (
          <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card p-6 rounded-2xl shadow mb-6">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-xl"><Wrench size={20} className="inline text-primary" /> {t(req.device_type)}</h3>
              {req.status === 'cancelled' ? (
                <span className="text-sm text-red-600 flex items-center gap-1"><XCircle size={16} /> ملغي</span>
              ) : null}
            </div>
            <p className="text-sm mt-1">{req.issue_description}</p>
            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
              <span>📞 {req.phone_number}</span>
              {req.address && <span>📍 {req.address}</span>}
            </div>

            {req.status !== 'cancelled' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  {statusSteps.map((step, idx) => (
                    <div key={step.key} className={`flex flex-col items-center ${idx <= statusIdx ? 'text-primary' : 'text-muted-foreground/40'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${idx <= statusIdx ? 'bg-primary text-white' : 'bg-muted'}`}>
                        {step.icon}
                      </div>
                      <span className="text-[10px] mt-1">{step.label}</span>
                    </div>
                  ))}
                </div>
                <div className="w-full bg-muted h-2 rounded-full">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(statusIdx / (statusSteps.length - 1)) * 100}%` }} />
                </div>
                {req.expires_at && req.status === 'assigned' && (
                  <p className="text-xs text-red-500 mt-1"><Clock size={12} /> الوقت المتبقي: {timeLeft(req.expires_at)}</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {(req.status === 'pending' || req.status === 'bidding') && (
                <>
                  <Button variant="destructive" size="sm" onClick={() => handleCancelRequest(req.id)}>
                    <XCircle size={14} className="mr-1" /> إلغاء الطلب
                  </Button>
                  {bidders[req.id]?.length > 0 && (
                    <div className="w-full mt-2">
                      <h4 className="font-semibold text-sm mb-1"><User size={14} className="inline" /> الفنيون المتقدمون:</h4>
                      {bidders[req.id].map(tech => (
                        <div key={tech.id} className="flex justify-between items-center border rounded-lg p-2 mb-1">
                          <span>{tech.full_name} ({tech.specialization})</span>
                          <Button size="sm" onClick={() => handleSelect(req.id, tech.id)}>اختيار</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {['assigned', 'accepted', 'on_the_way', 'in_progress'].includes(req.status) && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setChatRequestId(req.id)}>
                    <MessageCircle size={14} className="mr-1" /> محادثة
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCancelVisitOpen(req.id)}>
                    <XCircle size={14} className="mr-1" /> إلغاء الزيارة
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setComplaintOpen(req.id)}>
                    <MessageSquare size={14} className="mr-1" /> شكوى
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setFeedbackOpen(req.id)}>
                    <ThumbsUp size={14} className="mr-1" /> تعليق
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* النماذج المنبثقة */}
      {complaintOpen && (
        <dialog open className="p-4 rounded-xl shadow-xl fixed inset-0 m-auto z-50">
          <h3 className="font-bold mb-2">تقديم شكوى</h3>
          <Input value={complaintText} onChange={e => setComplaintText(e.target.value)} placeholder="اشرح المشكلة..." />
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => handleSubmitComplaint(complaintOpen)}>إرسال</Button>
            <Button size="sm" variant="ghost" onClick={() => { setComplaintOpen(null); setComplaintText(''); }}>إلغاء</Button>
          </div>
        </dialog>
      )}
      {feedbackOpen && (
        <dialog open className="p-4 rounded-xl shadow-xl fixed inset-0 m-auto z-50">
          <h3 className="font-bold mb-2">تعليق / تقييم</h3>
          <Input value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="اكتب تعليقك..." />
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => handleSubmitFeedback(feedbackOpen)}>إرسال</Button>
            <Button size="sm" variant="ghost" onClick={() => { setFeedbackOpen(null); setFeedbackText(''); }}>إلغاء</Button>
          </div>
        </dialog>
      )}
      {cancelVisitOpen && (
        <dialog open className="p-4 rounded-xl shadow-xl fixed inset-0 m-auto z-50">
          <h3 className="font-bold mb-2">سبب إلغاء الزيارة</h3>
          <Input value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="سبب الإلغاء..." />
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => handleCancelVisit(cancelVisitOpen)}>تأكيد</Button>
            <Button size="sm" variant="ghost" onClick={() => { setCancelVisitOpen(null); setCancelReason(''); }}>إلغاء</Button>
          </div>
        </dialog>
      )}
      {chatRequestId && (
        <ChatPopup
          requestId={chatRequestId}
          currentUser={{ id: customer?.id, userType: 'customer' }}
          onClose={() => setChatRequestId(null)}
        />
      )}
    </motion.div>
  );
};

const CustomerHomeScreen = () => (
  <SafeComponent>
    <CustomerHomeScreenContent />
  </SafeComponent>
);

export default CustomerHomeScreen;