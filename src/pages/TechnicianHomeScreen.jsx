import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { LogOut, MapPin, Clock, Wrench, Phone, Navigation, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast.jsx';
import { supabase } from '@/lib/supabaseClient';

const MAX_DISTANCE_KM = 15;

const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
  const [locationStatus, setLocationStatus] = useState('جاري تحديد الموقع...'); // حالة الموقع

  useEffect(() => {
    supabase.rpc('expire_stale_assignments').catch(() => {});
  }, []);

  // تحديد الموقع عند الدخول
  useEffect(() => {
    const getUserLocation = async () => {
      if (!navigator.geolocation) {
        setLocationStatus('المتصفح لا يدعم الموقع');
        setIsLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentLocation(loc);
          setLocationStatus('تم تحديد موقعك');
          // تحديث الموقع في قاعدة البيانات
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('technicians').update({ lat: loc.lat, lng: loc.lng }).eq('id', user.id);
          }
        },
        (err) => {
          setLocationStatus('لم يتم الحصول على إذن الموقع. قد لا تظهر الطلبات القريبة.');
          // محاولة استخدام الموقع المخزن
          if (technician?.lat && technician?.lng) {
            setCurrentLocation({ lat: technician.lat, lng: technician.lng });
          }
        },
        { timeout: 10000 }
      );
    };
    getUserLocation();
  }, [technician]);

  // جلب بيانات الفني والطلبات
  useEffect(() => {
    const init = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { navigate('/login/technician'); return; }
      const { data: tech, error: techError } = await supabase.from('technicians').select('*').eq('id', user.id).single();
      if (techError || !tech || tech.status !== 'approved') {
        toast({ title: 'خطأ', description: 'حسابك قيد المراجعة أو غير موجود.' });
        navigate('/login/technician');
        return;
      }
      setTechnician(tech);
      setIsLoading(false);
    };
    init();
  }, [navigate, toast]);

  // جلب الطلبات المعلقة بناءً على الموقع
  useEffect(() => {
    if (!technician) return;
    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*, customer:customer_id ( full_name, phone, address )')
        .eq('status', 'pending')
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (error) {
        console.error('فشل جلب الطلبات:', error);
        return;
      }

      let nearby = [];
      if (currentLocation) {
        nearby = data.filter(r => {
          const dist = getDistance(currentLocation.lat, currentLocation.lng, r.lat, r.lng);
          return dist !== null && dist <= MAX_DISTANCE_KM;
        }).map(r => ({
          ...r,
          distance: getDistance(currentLocation.lat, currentLocation.lng, r.lat, r.lng),
        }));
      } else {
        // لا يوجد موقع، نظهر كل الطلبات المعلقة (حتى يحدد الموقع)
        nearby = data.map(r => ({ ...r, distance: null }));
      }
      setPendingRequests(nearby);
    };

    fetchRequests();
  }, [currentLocation, technician]);

  // جلب الطلبات المعينة للفني
  useEffect(() => {
    if (!technician) return;
    const fetchAssigned = async () => {
      await supabase.rpc('expire_stale_assignments').catch(() => {});
      const { data } = await supabase
        .from('maintenance_requests')
        .select('*, customer:customer_id ( full_name, phone, address )')
        .eq('technician_id', technician.id)
        .in('status', ['assigned', 'accepted', 'on_the_way', 'in_progress']);
      if (data) setMyAssignedRequests(data);
    };
    fetchAssigned();
  }, [technician]);

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
    if (error) { toast({ description: 'فشل تحديث الحالة.' }); return; }
    setMyAssignedRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...updateData } : r));
    toast({ description: `الحالة: ${newStatus}` });
  };

  const handleDelay = async (requestId) => {
    if (!delayReason.trim()) { toast({ description: 'اكتب سبب التأجيل.' }); return; }
    const { error } = await supabase.from('maintenance_requests').update({
      notes: delayReason,
      expires_at: new Date(Date.now() + 30 * 60000).toISOString()
    }).eq('id', requestId);
    if (error) { toast({ description: 'فشل التأجيل.' }); return; }
    setMyAssignedRequests(prev => prev.map(r => r.id === requestId ? { ...r, notes: delayReason } : r));
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient">
        <RefreshCw className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="flex justify-between items-center mb-8 bg-card/50 backdrop-blur-sm p-4 rounded-2xl shadow-lg border">
        <div>
          <h1 className="text-2xl font-bold text-primary">الفني {technician?.full_name}</h1>
          <p className="text-xs flex items-center gap-1 text-muted-foreground">
            <MapPin size={12} /> {locationStatus}
          </p>
        </div>
        <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); localStorage.clear(); navigate('/user-type'); }}>
          <LogOut className="ltr:mr-2 rtl:ml-2" /> خروج
        </Button>
      </header>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">طلبات قريبة</h2>
        {!currentLocation && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm mb-4">
            <AlertTriangle className="inline text-yellow-600" size={16} /> لم يتم تحديد موقعك بعد. يُرجى السماح بالموقع لعرض الطلبات القريبة.
          </div>
        )}
        {pendingRequests.length === 0 ? (
          <div className="text-center bg-card rounded-2xl p-8 shadow-sm border border-dashed">
            <Wrench size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">لا توجد طلبات صيانة متاحة قريبة منك.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-card p-4 rounded-2xl shadow-md border hover:shadow-lg transition">
                <div className="flex justify-between items-start">
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
                        <Clock size={12} className="inline" /> {req.distance ? Math.round(req.distance / 30 * 60) : '؟'} دقيقة
                      </span>
                    </div>
                  </div>
                  <Button onClick={() => handlePlaceBid(req.id)} disabled={submittingBid === req.id}>
                    تقديم عرض
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* طلباتي النشطة (نفس الكود السابق مع تحسينات طفيفة) */}
      {myAssignedRequests.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">طلباتي النشطة</h2>
          {myAssignedRequests.map(req => (
            <div key={req.id} className="bg-card p-4 rounded-2xl shadow mb-3 border-l-4 border-primary">
              {/* ... (نفس هيكل عرض بطاقة الطلب المعين من الكود السابق، يمكنك استخدام نفس التصميم) ... */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{req.device_type}</h3>
                  <p className="text-sm">{req.issue_description}</p>
                  {req.customer?.phone && <p className="text-xs">📞 {req.customer.phone}</p>}
                  <p className="text-xs">الحالة: {req.status}</p>
                  {req.expires_at && <p className="text-xs text-red-500"><Clock size={12} /> {getTimeLeft(req.expires_at)}</p>}
                </div>
                <div className="flex gap-2">
                  {req.status === 'assigned' && (
                    <Button size="sm" onClick={() => handleUpdateStatus(req.id, 'on_the_way')}>في الطريق</Button>
                  )}
                  {req.status === 'on_the_way' && (
                    <Button size="sm" onClick={() => handleUpdateStatus(req.id, 'in_progress')}>بدء الإصلاح</Button>
                  )}
                  {req.status === 'in_progress' && (
                    <Button size="sm" onClick={() => handleUpdateStatus(req.id, 'completed')}>تم</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => document.getElementById(`delay-${req.id}`).showModal()}>تأجيل</Button>
                  <dialog id={`delay-${req.id}`} className="p-4 rounded-xl shadow-xl">
                    <h3 className="font-bold mb-2">سبب التأجيل</h3>
                    <Input value={delayReason} onChange={e => setDelayReason(e.target.value)} />
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
    </motion.div>
  );
};

export default TechnicianHomeScreen;