import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import {
  LogOut, MapPin, Clock, Wrench, Phone, Navigation, CheckCircle,
  RefreshCw, AlertTriangle, Truck, MessageCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast.jsx';
import { supabase } from '@/lib/supabaseClient';
import ChatPopup from '@/components/ChatPopup.jsx';

const MAX_DISTANCE_KM = 15;

const getDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const TechnicianHomeScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [technician, setTechnician] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [myAssignedRequests, setMyAssignedRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [submittingBid, setSubmittingBid] = useState(null);
  const [delayReason, setDelayReason] = useState('');
  const [locationStatus, setLocationStatus] = useState('لم يتم تحديد الموقع');
  const [chatRequestId, setChatRequestId] = useState(null);

  // دالة جلب الطلبات
  const fetchPendingRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*') // نجلب كل الحقول مباشرة بدون علاقات
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      let nearby = [];
      if (currentLocation) {
        nearby = data.map((r) => {
          let distance = null;
          if (r.lat != null && r.lng != null) {
            distance = getDistance(currentLocation.lat, currentLocation.lng, r.lat, r.lng);
          }
          return { ...r, distance };
        });
      } else {
        nearby = data.map((r) => ({ ...r, distance: null }));
      }
      setPendingRequests(nearby);
    } catch (error) {
      console.error('فشل جلب الطلبات:', error);
      toast({ title: 'خطأ', description: 'فشل تحميل الطلبات: ' + error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, toast]);

  // جلب بيانات الفني وجلب الطلبات
  useEffect(() => {
    const init = async () => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        navigate('/login/technician');
        return;
      }

      const { data: tech, error: techErr } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', user.id)
        .single();

      if (techErr || !tech) {
        toast({ title: 'خطأ', description: 'تعذر تحميل بياناتك.' });
        navigate('/login/technician');
        return;
      }

      if (tech.status !== 'approved') {
        toast({ title: 'حساب قيد المراجعة', description: 'لا يمكنك الدخول حتى يوافق الأدمن.' });
        navigate('/login/technician');
        return;
      }

      setTechnician(tech);

      // طلب إذن الموقع الحالي
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCurrentLocation(loc);
            setLocationStatus('تم تحديد موقعك الحالي');
            // تحديث الموقع في قاعدة البيانات
            await supabase.from('technicians').update({ lat: loc.lat, lng: loc.lng }).eq('id', tech.id);
          },
          () => {
            // إذا رُفض الإذن، نستخدم الموقع المخزن إن وجد
            if (tech.lat && tech.lng) {
              setCurrentLocation({ lat: tech.lat, lng: tech.lng });
              setLocationStatus('تم استخدام الموقع المخزن');
            } else {
              setLocationStatus('لم يتم تحديد الموقع');
            }
          }
        );
      } else if (tech.lat && tech.lng) {
        setCurrentLocation({ lat: tech.lat, lng: tech.lng });
        setLocationStatus('تم استخدام الموقع المخزن');
      }

      // جلب الطلبات المعينة
      const { data: assigned } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('technician_id', tech.id)
        .in('status', ['assigned', 'accepted', 'on_the_way', 'in_progress']);
      if (assigned) setMyAssignedRequests(assigned);

      // جلب الطلبات المعلقة
      fetchPendingRequests();
    };

    init();
  }, [navigate, toast, fetchPendingRequests]);

  // دوال الإجراءات (تقديم عرض، تحديث حالة، تأجيل)
  const handlePlaceBid = async (requestId) => {
    setSubmittingBid(requestId);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('bids').insert({ request_id: requestId, technician_id: user.id });
    setSubmittingBid(null);
    if (error) {
      if (error.code === '23505') toast({ description: 'لقد قدمت عرضاً مسبقاً.' });
      else toast({ description: 'فشل تقديم العرض.' });
    } else {
      toast({ description: 'تم تقديم العرض. بانتظار موافقة العميل.' });
    }
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'accepted' || newStatus === 'on_the_way') updateData.expires_at = null;
    const { error } = await supabase.from('maintenance_requests').update(updateData).eq('id', requestId);
    if (error) {
      toast({ description: 'فشل تحديث الحالة.' });
      return;
    }
    setMyAssignedRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, ...updateData } : r))
    );
    toast({ description: `الحالة: ${newStatus}` });
  };

  const handleDelay = async (requestId) => {
    if (!delayReason.trim()) {
      toast({ description: 'اكتب سبب التأجيل.' });
      return;
    }
    const { error } = await supabase
      .from('maintenance_requests')
      .update({
        notes: delayReason,
        expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
      })
      .eq('id', requestId);
    if (error) {
      toast({ description: 'فشل التأجيل.' });
      return;
    }
    setMyAssignedRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, notes: delayReason } : r))
    );
    toast({ description: 'تم التأجيل.' });
    setDelayReason('');
  };

  const getTimeLeft = (expiresAt) => {
    if (!expiresAt) return '';
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return 'انتهت';
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!technician) {
    return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="animate-spin" size={32} /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="flex justify-between items-center mb-8 bg-card/50 backdrop-blur-sm p-4 rounded-2xl shadow-lg border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xl">
            {(technician?.full_name || 'ف')[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">{technician.full_name || 'فني'}</h1>
            <p className="text-xs flex items-center gap-1 text-muted-foreground">
              <MapPin size={12} /> {locationStatus}
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); localStorage.clear(); navigate('/user-type'); }}>
          <LogOut className="ltr:mr-2 rtl:ml-2" /> خروج
        </Button>
      </header>

      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={fetchPendingRequests} disabled={isLoading}>
          <RefreshCw size={16} className="mr-1" /> تحديث الطلبات
        </Button>
      </div>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">طلبات قريبة</h2>
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="animate-spin text-primary mx-auto mb-2" size={32} />
            <p>جاري تحميل الطلبات...</p>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="text-center bg-card rounded-2xl p-8 shadow-sm border border-dashed">
            <Wrench size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">لا توجد طلبات صيانة متاحة حالياً.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-card p-4 rounded-2xl shadow-md border hover:shadow-lg transition flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg capitalize">{req.device_type}</h3>
                  <p className="text-sm text-muted-foreground">{req.issue_description}</p>
                  <div className="flex gap-2 mt-2 text-xs">
                    {req.distance != null && (
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                        <MapPin size={12} className="inline" /> {req.distance.toFixed(1)} كم
                      </span>
                    )}
                    <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full">
                      <Clock size={12} className="inline" />{' '}
                      {req.distance ? Math.round(req.distance / 30) * 60 : '؟'} دقيقة
                    </span>
                  </div>
                  {/* عرض بيانات الاتصال من الطلب نفسه */}
                  {req.phone_number && (
                    <p className="text-xs flex items-center gap-1 mt-1">
                      <Phone size={12} /> {req.phone_number}
                    </p>
                  )}
                  {req.address && (
                    <p className="text-xs text-muted-foreground mt-1">📍 {req.address}</p>
                  )}
                </div>
                <Button onClick={() => handlePlaceBid(req.id)} disabled={submittingBid === req.id}>
                  تقديم عرض
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {myAssignedRequests.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">طلباتي النشطة</h2>
          {myAssignedRequests.map((req) => (
            <div key={req.id} className="bg-card p-4 rounded-2xl shadow mb-3 border-l-4 border-primary">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg">{req.device_type}</h3>
                  <p className="text-sm">{req.issue_description}</p>
                  {req.phone_number && (
                    <p className="text-xs flex items-center gap-1 mt-1">
                      <Phone size={12} /> {req.phone_number}
                    </p>
                  )}
                  <p className="text-xs mt-1">الحالة: <span className="font-semibold">{req.status}</span></p>
                  {req.expires_at && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <Clock size={12} /> {getTimeLeft(req.expires_at)}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-start">
                  {req.status === 'assigned' && (
                    <>
                      <Button size="sm" onClick={() => handleUpdateStatus(req.id, 'on_the_way')}><Truck size={14} className="mr-1" /> في الطريق</Button>
                      <Button size="sm" variant="outline" onClick={() => document.getElementById(`delay-${req.id}`).showModal()}>تأجيل</Button>
                    </>
                  )}
                  {req.status === 'on_the_way' && (
                    <Button size="sm" onClick={() => handleUpdateStatus(req.id, 'in_progress')}><Wrench size={14} className="mr-1" /> بدء الإصلاح</Button>
                  )}
                  {req.status === 'in_progress' && (
                    <Button size="sm" onClick={() => handleUpdateStatus(req.id, 'completed')}><CheckCircle size={14} className="mr-1" /> تم الإصلاح</Button>
                  )}

                  <Button size="sm" variant="secondary" onClick={() => setChatRequestId(req.id)}><MessageCircle size={14} className="mr-1" /> محادثة</Button>

                  <dialog id={`delay-${req.id}`} className="p-4 rounded-xl shadow-xl">
                    <h3 className="font-bold mb-2">سبب التأجيل</h3>
                    <Input value={delayReason} onChange={(e) => setDelayReason(e.target.value)} placeholder="اكتب السبب..." />
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => { handleDelay(req.id); document.getElementById(`delay-${req.id}`).close(); }}>تأكيد</Button>
                      <Button size="sm" variant="ghost" onClick={() => document.getElementById(`delay-${req.id}`).close()}>إلغاء</Button>
                    </div>
                  </dialog>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {chatRequestId && technician && (
        <ChatPopup requestId={chatRequestId} currentUser={{ id: technician.id, userType: 'technician' }} onClose={() => setChatRequestId(null)} />
      )}
    </motion.div>
  );
};

export default TechnicianHomeScreen;