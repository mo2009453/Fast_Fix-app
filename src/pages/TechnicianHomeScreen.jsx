import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { LogOut, MapPin, Clock, Wrench, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast.jsx';
import { supabase } from '@/lib/supabaseClient';

const MAX_DISTANCE_KM = 15;

const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
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
  const [delayReason, setDelayReason] = useState(''); // للتأجيل

  useEffect(() => {
    supabase.rpc('expire_stale_assignments');
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login/technician'); return; }
      const { data: tech } = await supabase.from('technicians').select('*').eq('id', user.id).single();
      if (!tech || tech.status !== 'approved') { navigate('/login/technician'); return; }
      setTechnician(tech);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCurrentLocation(loc);
            await supabase.from('technicians').update({ lat: loc.lat, lng: loc.lng }).eq('id', user.id);
          },
          () => { if (tech.lat) setCurrentLocation({ lat: tech.lat, lng: tech.lng }); }
        );
      } else if (tech.lat) setCurrentLocation({ lat: tech.lat, lng: tech.lng });

      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!currentLocation) return;
    const fetchRequests = async () => {
      const { data } = await supabase.from('maintenance_requests').select('*').eq('status', 'pending').not('lat', 'is', null);
      if (data) {
        const nearby = data.filter(r => getDistance(currentLocation.lat, currentLocation.lng, r.lat, r.lng) <= MAX_DISTANCE_KM)
          .map(r => ({ ...r, distance: getDistance(currentLocation.lat, currentLocation.lng, r.lat, r.lng) }));
        setPendingRequests(nearby);
      }
    };
    fetchRequests();
  }, [currentLocation]);

  const handlePlaceBid = async (requestId) => {
    setSubmittingBid(requestId);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('bids').insert({
      request_id: requestId,
      technician_id: user.id
    });
    setSubmittingBid(null);
    if (error) {
      if (error.code === '23505') toast({ description: 'لقد قدمت عرضاً مسبقاً.' });
      else toast({ description: 'فشل تقديم العرض.' });
    } else {
      toast({ description: 'تم تقديم العرض. بانتظار موافقة العميل.' });
    }
  };

  useEffect(() => {
    if (!technician) return;
    const fetchAssigned = async () => {
      await supabase.rpc('expire_stale_assignments'); // تنظيف سريع
      const { data } = await supabase.from('maintenance_requests')
        .select('*')
        .eq('technician_id', technician.id)
        .in('status', ['assigned', 'accepted', 'on_the_way', 'in_progress']);
      if (data) setMyAssignedRequests(data);
    };
    fetchAssigned();
  }, [technician]);

  const handleUpdateStatus = async (requestId, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'accepted') {
      updateData.expires_at = null; // إلغاء الصلاحية
    }
    const { error } = await supabase.from('maintenance_requests').update(updateData).eq('id', requestId);
    if (error) {
      toast({ description: 'فشل تحديث الحالة.' });
      return;
    }
    setMyAssignedRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...updateData } : r));
    toast({ description: `الحالة تغيرت إلى ${newStatus}` });
  };

  const handleDelay = async (requestId) => {
    if (!delayReason.trim()) {
      toast({ description: 'يرجى كتابة سبب التأجيل.' });
      return;
    }
    const { error } = await supabase
      .from('maintenance_requests')
      .update({
        status: 'accepted', // أو أي حالة مناسبة، مع الاحتفاظ بالوقت
        notes: delayReason,
        expires_at: new Date(Date.now() + 30 * 60000).toISOString() // تمديد 30 دقيقة مثلاً
      })
      .eq('id', requestId);
    if (error) {
      toast({ description: 'فشل تأجيل الزيارة.' });
      return;
    }
    setMyAssignedRequests(prev => prev.map(r => r.id === requestId ? { ...r, notes: delayReason } : r));
    toast({ description: 'تم تأجيل الزيارة وإبلاغ العميل.' });
    setDelayReason('');
  };

  const getTimeLeft = (expiresAt) => {
    if (!expiresAt) return '';
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return 'انتهت الصلاحية';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Wrench className="animate-bounce" size={48} /> تحميل...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">لوحة الفني {technician?.full_name}</h1>
        <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); localStorage.clear(); navigate('/user-type'); }}>
          <LogOut className="ltr:mr-2 rtl:ml-2 h-5 w-5" /> خروج
        </Button>
      </header>

      {/* طلبات قريبة */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-2">طلبات قريبة (أقل من {MAX_DISTANCE_KM} كم)</h2>
        {pendingRequests.length === 0 && <p className="text-muted-foreground">لا توجد طلبات.</p>}
        {pendingRequests.map(req => (
          <div key={req.id} className="bg-card p-4 rounded-2xl shadow mb-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{req.device_type}</h3>
                <p className="text-sm">{req.issue_description}</p>
                <p className="text-xs text-muted-foreground">المسافة: {req.distance?.toFixed(1)} كم</p>
              </div>
              <Button onClick={() => handlePlaceBid(req.id)} disabled={submittingBid === req.id}>
                {submittingBid === req.id ? '...' : 'تقديم عرض'}
              </Button>
            </div>
          </div>
        ))}
      </section>

      {/* طلباتي المعينة */}
      {myAssignedRequests.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">طلباتي المعينة</h2>
          {myAssignedRequests.map(req => (
            <div key={req.id} className="bg-card p-4 rounded-2xl shadow mb-3 border-l-4 border-primary">
              <h3 className="font-bold">{req.device_type}</h3>
              <p className="text-sm">{req.issue_description}</p>
              {req.status === 'assigned' && (
                <>
                  <p className="text-xs flex items-center gap-1 text-red-600">
                    <Clock size={14} /> {getTimeLeft(req.expires_at)}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => handleUpdateStatus(req.id, 'accepted')}>بدء العمل</Button>
                    <details>
                      <summary className="text-xs text-blue-600 cursor-pointer">تأجيل</summary>
                      <div className="flex gap-1 mt-1">
                        <Input size="sm" placeholder="سبب التأجيل" value={delayReason} onChange={e => setDelayReason(e.target.value)} />
                        <Button size="sm" onClick={() => handleDelay(req.id)}>تأكيد</Button>
                      </div>
                    </details>
                  </div>
                </>
              )}
              {req.status === 'accepted' && (
                <>
                  <p className="text-xs">رقم العميل: {req.phone_number}</p>
                  <Button className="mt-2" size="sm" onClick={() => handleUpdateStatus(req.id, 'on_the_way')}>في الطريق</Button>
                </>
              )}
              {req.status === 'on_the_way' && (
                <Button className="mt-2" size="sm" onClick={() => handleUpdateStatus(req.id, 'in_progress')}>بدء الإصلاح</Button>
              )}
              {req.status === 'in_progress' && (
                <Button className="mt-2" size="sm" onClick={() => handleUpdateStatus(req.id, 'completed')}>تم الإصلاح</Button>
              )}
              {req.notes && <p className="text-xs text-muted-foreground mt-1">ملاحظة: {req.notes}</p>}
            </div>
          ))}
        </section>
      )}
    </motion.div>
  );
};

export default TechnicianHomeScreen;