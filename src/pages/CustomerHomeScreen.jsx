import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { LogOut, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast.jsx';
import { supabase } from '@/lib/supabaseClient';
import ChatPopup from '@/components/ChatPopup.jsx';
import AdminPanel from '@/components/AdminPanel.jsx';
import RequestForm from '@/components/customer/RequestForm.jsx';
import RequestCard from '@/components/customer/RequestCard.jsx';
import RatingModal from '@/components/customer/RatingModal.jsx';
import ComplaintModal from '@/components/customer/ComplaintModal.jsx';
import FeedbackModal from '@/components/customer/FeedbackModal.jsx';
import CancelVisitModal from '@/components/customer/CancelVisitModal.jsx';

const VISIT_FEE = 100;

const CustomerHomeScreen = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customer, setCustomer] = useState(null);
  const [balance, setBalance] = useState(0);
  const [reqForm, setReqForm] = useState({ deviceType: '', issueDescription: '', phoneNumber: '', address: '', lat: null, lng: null });
  const [submitting, setSubmitting] = useState(false);
  const [gettingLoc, setGettingLoc] = useState(false);
  const [requests, setRequests] = useState([]);
  const [biddersMap, setBiddersMap] = useState({});
  const [pageReady, setPageReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const [chatRequestId, setChatRequestId] = useState(null);
  const [ratingOpen, setRatingOpen] = useState(null);
  const [stars, setStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [complaintOpen, setComplaintOpen] = useState(null);
  const [complaintText, setComplaintText] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [cancelVisitOpen, setCancelVisitOpen] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // --- جلب كل البيانات ---
  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login/customer'); return; }

    const { data: cust } = await supabase.from('customers').select('*').eq('id', user.id).maybeSingle();
    const profile = cust || {};
    setCustomer(profile);
    setBalance(profile.balance || 0);
    setReqForm(prev => ({ ...prev, phoneNumber: profile.phone || '', address: profile.address || '' }));

    const { data: adminData } = await supabase.from('admins').select('id').eq('id', user.id).maybeSingle();
    if (adminData) setIsAdmin(true);

    const { data: reqs } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('customer_id', user.id)
      .in('status', ['pending', 'bidding', 'assigned', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled'])
      .order('created_at', { ascending: false });

    const requestsList = reqs || [];
    setRequests(requestsList);

    // --- جلب العروض بالطريقة المنفصلة والآمنة ---
    const biddingIds = requestsList.filter(r => r.status === 'pending' || r.status === 'bidding').map(r => r.id);
    if (biddingIds.length > 0) {
      const { data: bidsData } = await supabase
        .from('bids')
        .select('request_id, technician_id')
        .in('request_id', biddingIds);

      if (bidsData && bidsData.length > 0) {
        const techIds = [...new Set(bidsData.map(b => b.technician_id))];

        const { data: techsData } = await supabase
          .from('technicians')
          .select('id, full_name, phone, specialization, avg_rating')
          .in('id', techIds);

        const techMap = {};
        if (techsData) {
          techsData.forEach(tech => { techMap[tech.id] = tech; });
        }

        const map = {};
        bidsData.forEach(b => {
          const tech = techMap[b.technician_id];
          if (!tech) return;
          if (!map[b.request_id]) map[b.request_id] = [];
          map[b.request_id].push({
            id: tech.id,
            full_name: tech.full_name || 'فني',
            phone: tech.phone || '',
            specialization: tech.specialization || '',
            avg_rating: tech.avg_rating || 0,
            distance: null,
          });
        });
        setBiddersMap(map);
      } else {
        setBiddersMap({});
      }
    } else {
      setBiddersMap({});
    }

    setPageReady(true);
  }, [navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- دوال مساعدة ---
  const handleFieldChange = (field, value) => setReqForm(prev => ({ ...prev, [field]: value }));

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

  // --- دوال الإجراءات ---
  const handleCreateRequest = async () => {
    if (!reqForm.deviceType || !reqForm.issueDescription || !reqForm.phoneNumber || reqForm.lat == null) {
      toast({ description: 'جميع الحقول والموقع مطلوبة.' }); return;
    }
    if (balance < VISIT_FEE) { toast({ description: 'الرصيد غير كافٍ.' }); return; }

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
      status: 'pending',
    }]).select();

    setSubmitting(false);
    if (error) {
      setBalance(balance);
      await supabase.from('customers').update({ balance }).eq('id', user.id);
      toast({ description: 'فشل: ' + error.message });
    } else {
      toast({ description: 'تم إرسال الطلب! تم خصم 100 جنيه.' });
      setRequests(prev => [data[0], ...prev]);
      setReqForm(prev => ({ ...prev, deviceType: '', issueDescription: '', address: '' }));
    }
  };

  const handleSelectTechnician = async (reqId, techId) => {
    const now = new Date();
    const expires = new Date(now.getTime() + 10 * 60000);
    const { data, error } = await supabase
      .from('maintenance_requests')
      .update({ technician_id: techId, status: 'assigned', assigned_at: now.toISOString(), expires_at: expires.toISOString() })
      .eq('id', reqId)
      .eq('customer_id', (await supabase.auth.getUser()).data.user.id)
      .select();
    if (error) toast({ title: 'فشل', description: error.message });
    else if (!data?.length) toast({ title: 'فشل', description: 'لم يتم العثور على الطلب.' });
    else {
      toast({ title: 'تم', description: 'تم تعيين الفني.' });
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'assigned', technician_id: techId, expires_at: expires.toISOString() } : r));
    }
  };

  const createRefundRequest = async (reqId, reason = '') => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('recharge_requests').insert({
      user_id: user.id, email: user.email, amount: VISIT_FEE,
      phone_number: customer?.phone || '', request_type: 'refund',
      related_request_id: reqId, status: 'pending', notes: reason,
    });
    toast({ description: 'تم تقديم طلب استرداد.' });
  };

  const handleCancelRequest = async (reqId) => {
    const { error } = await supabase.from('maintenance_requests')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', reqId).eq('customer_id', (await supabase.auth.getUser()).data.user.id);
    if (error) toast({ description: 'فشل الإلغاء.' });
    else { await createRefundRequest(reqId); setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'cancelled' } : r)); }
  };

  const handleCancelVisit = async (reqId) => {
    if (!cancelReason.trim()) { toast({ description: 'اكتب سبب الإلغاء.' }); return; }
    const { error } = await supabase.from('maintenance_requests')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: cancelReason })
      .eq('id', reqId).eq('customer_id', (await supabase.auth.getUser()).data.user.id);
    if (error) toast({ description: 'فشل الإلغاء.' });
    else {
      await createRefundRequest(reqId, cancelReason);
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'cancelled', cancel_reason: cancelReason } : r));
      setCancelVisitOpen(null); setCancelReason('');
    }
  };

  const handleSubmitComplaint = async (reqId) => {
    if (!complaintText.trim()) return;
    const { data: req } = await supabase.from('maintenance_requests').select('complaints').eq('id', reqId).single();
    const updated = [...(req?.complaints || []), { text: complaintText, date: new Date().toISOString() }];
    await supabase.from('maintenance_requests').update({ complaints: updated }).eq('id', reqId);
    toast({ description: 'تم تسجيل الشكوى.' });
    setComplaintOpen(null); setComplaintText('');
  };

  const handleSubmitFeedback = async (reqId) => {
    if (!feedbackText.trim()) return;
    await supabase.from('maintenance_requests').update({ feedback: feedbackText }).eq('id', reqId);
    toast({ description: 'تم إرسال التعليق.' });
    setFeedbackOpen(null); setFeedbackText('');
  };

  const handleSubmitRating = async (reqId) => {
    if (stars === 0) { toast({ description: 'اختر نجمة على الأقل.' }); return; }
    const req = requests.find(r => r.id === reqId);
    const { error } = await supabase.from('technician_ratings').insert({
      request_id: reqId, technician_id: req.technician_id,
      customer_id: customer.id, rating: stars, comment: ratingComment,
    });
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'تم', description: 'شكراً لتقييمك!' });
      setRatingOpen(null); setStars(0); setRatingComment('');
    }
  };

  if (!pageReady) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="animate-spin" size={32} /></div>;

  const activeRequests = requests.filter(r => ['pending', 'bidding', 'assigned', 'accepted', 'on_the_way', 'in_progress'].includes(r.status));
  const archivedRequests = requests.filter(r => ['completed', 'cancelled'].includes(r.status));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="flex justify-between items-center mb-8 bg-card/50 backdrop-blur-sm p-4 rounded-2xl shadow-lg border">
        <div>
          <h1 className="text-2xl font-bold text-primary">أهلاً {customer?.full_name || 'عميلنا'}</h1>
          <p className="text-sm text-muted-foreground">الرصيد: {balance} جنيه</p>
        </div>
        <Button variant="ghost" onClick={() => { localStorage.clear(); navigate('/user-type'); }}><LogOut /> {t('logout')}</Button>
      </header>

      <RequestForm
        reqForm={reqForm}
        onFieldChange={handleFieldChange}
        onGetLocation={handleGetLocation}
        onCreate={handleCreateRequest}
        submitting={submitting}
        gettingLoc={gettingLoc}
      />

      <div className="flex gap-4 mb-6">
        <Button variant={activeTab === 'active' ? 'default' : 'outline'} onClick={() => setActiveTab('active')}>قيد التنفيذ ({activeRequests.length})</Button>
        <Button variant={activeTab === 'archived' ? 'default' : 'outline'} onClick={() => setActiveTab('archived')}>الأرشيف ({archivedRequests.length})</Button>
      </div>

      {activeTab === 'active' && activeRequests.map(req => (
        <div key={req.id} className="bg-card p-6 rounded-2xl shadow mb-6">
          <div className="flex justify-between">
            <h3 className="font-bold text-xl">{req.device_type}</h3>
            {req.status === 'cancelled' && <span className="text-red-600"><XCircle size={16} /> ملغي</span>}
          </div>
          <p className="text-sm mt-1">{req.issue_description}</p>
          <p className="text-xs text-muted-foreground mt-2">📞 {req.phone_number} {req.address && `📍 ${req.address}`}</p>

          {req.status !== 'cancelled' && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                {[
                  { key: 'pending', label: 'تم الإرسال', icon: <CheckCircle size={16} /> },
                  { key: 'assigned', label: 'تم تعيين فني', icon: <User size={16} /> },
                  { key: 'accepted', label: 'الفني قبل', icon: <CheckCircle size={16} /> },
                  { key: 'on_the_way', label: 'في الطريق', icon: <Truck size={16} /> },
                  { key: 'in_progress', label: 'جاري الإصلاح', icon: <Wrench size={16} /> },
                  { key: 'completed', label: 'مكتمل', icon: <CheckCircle size={16} /> },
                ].map((step, idx) => {
                  const mapping = { pending: 0, bidding: 0, assigned: 1, accepted: 2, on_the_way: 3, in_progress: 4, completed: 5 };
                  const currentIdx = mapping[req.status] ?? 0;
                  return (
                    <div key={step.key} className={`flex flex-col items-center ${idx <= currentIdx ? 'text-primary' : 'text-muted-foreground/40'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${idx <= currentIdx ? 'bg-primary text-white' : 'bg-muted'}`}>
                        {step.icon}
                      </div>
                      <span className="text-[10px] mt-1">{step.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="w-full bg-muted h-2 rounded-full">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${( (mapping[req.status] ?? 0) / 5 ) * 100}%` }} />
              </div>
              {req.expires_at && req.status === 'assigned' && (
                <p className="text-xs text-red-500 mt-1"><Clock size={12} /> الوقت المتبقي: {timeLeft(req.expires_at)}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {(req.status === 'pending' || req.status === 'bidding') && (
              <>
                <Button variant="destructive" size="sm" onClick={() => handleCancelRequest(req.id)}><XCircle size={14} /> إلغاء</Button>
                {biddersMap[req.id]?.length > 0 && (
                  <div className="w-full mt-2">
                    <h4 className="font-semibold text-sm mb-1">الفنيون المتقدمون:</h4>
                    {biddersMap[req.id].map(tech => (
                      <div key={tech.id} className="flex justify-between items-center border rounded-lg p-2 mb-1">
                        <span>{tech.full_name} ({tech.specialization}) ⭐ {tech.avg_rating?.toFixed(1) || '0.0'}</span>
                        <Button size="sm" onClick={() => handleSelectTechnician(req.id, tech.id)}>اختيار</Button>
                      </div>
                    ))}
                    {/* صندوق التشخيص المؤقت */}
                    <div style={{ background: '#e0f2fe', padding: '10px', marginTop: '8px', borderRadius: '8px', fontSize: '12px', direction: 'ltr', textAlign: 'left' }}>
                      <strong>🔍 Debug Data:</strong><br/>
                      BiddersMap: {JSON.stringify(biddersMap[req.id])}<br/>
                    </div>
                  </div>
                )}
              </>
            )}

            {['assigned', 'accepted', 'on_the_way', 'in_progress'].includes(req.status) && (
              <>
                <Button variant="outline" size="sm" onClick={() => setChatRequestId(req.id)}><MessageCircle size={14} /> محادثة</Button>
                <Button variant="outline" size="sm" onClick={() => setCancelVisitOpen(req.id)}><XCircle size={14} /> إلغاء الزيارة</Button>
                <Button variant="outline" size="sm" onClick={() => setComplaintOpen(req.id)}><MessageSquare size={14} /> شكوى</Button>
                <Button variant="outline" size="sm" onClick={() => setFeedbackOpen(req.id)}><ThumbsUp size={14} /> تعليق</Button>
              </>
            )}
          </div>
        </div>
      ))}

      {activeTab === 'archived' && archivedRequests.map(req => (
        <div key={req.id} className="bg-card p-6 rounded-2xl shadow mb-6 opacity-80">
          <div className="flex justify-between">
            <h3 className="font-bold text-xl">{req.device_type}</h3>
            <span className={`text-sm font-semibold ${req.status === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
              {req.status === 'completed' ? 'مكتمل' : 'ملغي'}
            </span>
          </div>
          <p className="text-sm mt-1">{req.issue_description}</p>
          <p className="text-xs text-muted-foreground mt-2">📞 {req.phone_number} {req.address && `📍 ${req.address}`}</p>
          {req.status === 'completed' && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setRatingOpen(req.id)}><Star size={14} /> تقييم الفني</Button>
            </div>
          )}
        </div>
      ))}

      <RatingModal
        open={!!ratingOpen}
        onClose={() => setRatingOpen(null)}
        onSubmit={() => handleSubmitRating(ratingOpen)}
        stars={stars}
        setStars={setStars}
        comment={ratingComment}
        setComment={setRatingComment}
      />
      <ComplaintModal
        open={!!complaintOpen}
        onClose={() => setComplaintOpen(null)}
        onSubmit={() => handleSubmitComplaint(complaintOpen)}
        text={complaintText}
        setText={setComplaintText}
      />
      <FeedbackModal
        open={!!feedbackOpen}
        onClose={() => setFeedbackOpen(null)}
        onSubmit={() => handleSubmitFeedback(feedbackOpen)}
        text={feedbackText}
        setText={setFeedbackText}
      />
      <CancelVisitModal
        open={!!cancelVisitOpen}
        onClose={() => setCancelVisitOpen(null)}
        onSubmit={() => handleCancelVisit(cancelVisitOpen)}
        reason={cancelReason}
        setReason={setCancelReason}
      />

      {chatRequestId && (
        <ChatPopup requestId={chatRequestId} currentUser={{ id: customer?.id, userType: 'customer' }} onClose={() => setChatRequestId(null)} />
      )}
      {isAdmin && <AdminPanel />}
    </motion.div>
  );
};

export default CustomerHomeScreen;