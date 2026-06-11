import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { LogOut, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast.jsx';
import { supabase } from '@/lib/supabaseClient';
import ChatPopup from '@/components/ChatPopup.jsx';
import AdminPanel from '@/components/AdminPanel.jsx';

// استيراد المكونات الجديدة
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
  const [comment, setComment] = useState('');
  const [complaintOpen, setComplaintOpen] = useState(null);
  const [complaintText, setComplaintText] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [cancelVisitOpen, setCancelVisitOpen] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login/customer'); return; }

    const { data: cust } = await supabase.from('customers').select('*').eq('id', user.id).maybeSingle();
    const profile = cust || {};
    setCustomer(profile);
    setBalance(profile.balance || 0);
    setReqForm(prev => ({ ...prev, phoneNumber: profile.phone || '', address: profile.address || '' }));

    const { data: adminData } = await supabase.from('admins').select('id').eq('id', user.id).maybeSingle();
    if (adminData) setIsAdmin(true);

    const { data: reqs } = await supabase.from('maintenance_requests')
      .select('*')
      .eq('customer_id', user.id)
      .in('status', ['pending', 'bidding', 'assigned', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled'])
      .order('created_at', { ascending: false });

    const requestsList = reqs || [];
    setRequests(requestsList);

    const biddingIds = requestsList.filter(r => r.status === 'pending' || r.status === 'bidding').map(r => r.id);
    if (biddingIds.length > 0) {
      const { data: bidsData } = await supabase.from('bids')
        .select('request_id, technician:technician_id ( id, full_name, phone, specialization, lat, lng, avg_rating )')
        .in('request_id', biddingIds);
      if (bidsData) {
        const map = {};
        bidsData.forEach(b => {
          const tech = b.technician;
          if (!tech?.id) return;
          if (!map[b.request_id]) map[b.request_id] = [];
          map[b.request_id].push({ ...tech, distance: null });
        });
        setBiddersMap(map);
      }
    }
    setPageReady(true);
  };

  useEffect(() => { fetchData(); }, []);

  // --- دوال الإجراءات (الكاملة) ---
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
      toast({ description: 'تم إرسال الطلب!' });
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
      customer_id: customer.id, rating: stars, comment: comment,
    });
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'تم', description: 'شكراً لتقييمك!' });
      setRatingOpen(null); setStars(0); setComment('');
    }
  };

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

      <RequestForm reqForm={reqForm} onFieldChange={(f,v) => setReqForm(p => ({...p, [f]:v}))} onGetLocation={handleGetLocation} onCreate={handleCreateRequest} submitting={submitting} gettingLoc={gettingLoc} />

      <div className="flex gap-4 mb-6">
        <Button variant={activeTab === 'active' ? 'default' : 'outline'} onClick={() => setActiveTab('active')}>النشطة ({activeRequests.length})</Button>
        <Button variant={activeTab === 'archived' ? 'default' : 'outline'} onClick={() => setActiveTab('archived')}>المؤرشفة ({archivedRequests.length})</Button>
      </div>

      {activeTab === 'active' && activeRequests.map(req => (
        <RequestCard key={req.id} req={req} bidders={biddersMap[req.id]} onSelect={handleSelectTechnician} onCancel={handleCancelRequest} onCancelVisit={(id) => setCancelVisitOpen(id)} onComplaint={(id) => setComplaintOpen(id)} onFeedback={(id) => setFeedbackOpen(id)} onChat={(id) => setChatRequestId(id)} onRate={(id) => setRatingOpen(id)} />
      ))}

      {activeTab === 'archived' && archivedRequests.map(req => (
        <RequestCard key={req.id} req={req} onRate={(id) => setRatingOpen(id)} />
      ))}

      <RatingModal open={ratingOpen} onClose={() => setRatingOpen(null)} onSubmit={() => handleSubmitRating(ratingOpen)} stars={stars} setStars={setStars} comment={comment} setComment={setComment} />
      <ComplaintModal open={complaintOpen} onClose={() => setComplaintOpen(null)} onSubmit={() => handleSubmitComplaint(complaintOpen)} text={complaintText} setText={setComplaintText} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(null)} onSubmit={() => handleSubmitFeedback(feedbackOpen)} text={feedbackText} setText={setFeedbackText} />
      <CancelVisitModal open={cancelVisitOpen} onClose={() => setCancelVisitOpen(null)} onSubmit={() => handleCancelVisit(cancelVisitOpen)} reason={cancelReason} setReason={setCancelReason} />

      {chatRequestId && <ChatPopup requestId={chatRequestId} currentUser={{ id: customer?.id, userType: 'customer' }} onClose={() => setChatRequestId(null)} />}
      {isAdmin && <AdminPanel />}
    </motion.div>
  );
};

export default CustomerHomeScreen;