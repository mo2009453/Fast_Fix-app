import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { LogOut, MapPin, Clock, Wrench, Phone, Navigation, CheckCircle, RefreshCw, Truck, MessageCircle } from 'lucide-react';
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
  const [locationStatus, setLocationStatus] = useState('جاري تحديد الموقع...');
  const [chatRequestId, setChatRequestId] = useState(null);

  // جلب الطلبات المعلقة (دالة قابلة لإعادة الاستخدام)
  const fetchPending = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      let list = data || [];
      if (currentLocation) {
        list = list.map(r => {
          const dist = (r.lat && r.lng) ? getDistance(currentLocation.lat, currentLocation.lng, r.lat, r.lng) : null;
          return { ...r, distance: dist };
        });
      } else {
        list = list.map(r => ({ ...r, distance: null }));
      }
      setPendingRequests(list);
    } catch (e) {
      toast({ description: 'فشل تحميل الطلبات.' });
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, toast]);

  // تحميل أولي
  useEffect(() => {
    const boot = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login/technician'); return; }

      const { data: tech, error: techErr } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', user.id)
        .single();

      if (techErr || !tech || tech.status !== 'approved') {
        toast({ description: 'الحساب غير مفعل.' });
        navigate('/login/technician');
        return;
      }

      setTechnician(tech);

      // موقع
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCurrentLocation(loc);
            setLocationStatus('تم تحديد الموقع');
            supabase.from('technicians').update({ lat: loc.lat, lng: loc.lng }).eq('id', tech.id);
          },
          () => {
            if (tech.lat && tech.lng) {
              setCurrentLocation({ lat: tech.lat, lng: tech.lng });
              setLocationStatus('موقع مخزن');
            } else {
              setLocationStatus('لم يحدد');
            }
          }
        );
      } else if (tech.lat && tech.lng) {
        setCurrentLocation({ lat: tech.lat, lng: tech.lng });
        setLocationStatus('موقع مخزن');
      }

      // طلباتي
      const { data: assigned } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('technician_id', tech.id)
        .in('status', ['assigned', 'accepted', 'on_the_way', 'in_progress']);
      if (assigned) setMyAssignedRequests(assigned);

      fetchPending();
    };
    boot();
  }, []);

  // إجراءات
  const handleBid = async (id) => {
    setSubmittingBid(id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('bids').insert({ request_id: id, technician_id: user.id });
    setSubmittingBid(null);
    if (error) toast({ description: error.code === '23505' ? 'عرض مسبق.' : 'فشل العرض.' });
    else toast({ description: 'تم تقديم العرض.' });
  };

  const handleStatus = async (id, status) => {
    await supabase.from('maintenance_requests').update({ status }).eq('id', id);
    setMyAssignedRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const handleDelay = async (id) => {
    if (!delayReason.trim()) return;
    await supabase.from('maintenance_requests').update({ notes: delayReason }).eq('id', id);
    setMyAssignedRequests(prev => prev.map(r => r.id === id ? { ...r, notes: delayReason } : r));
    setDelayReason('');
  };

  if (!technician) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="animate-spin" size={32} /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="flex justify-between items-center mb-8 bg-card/50 backdrop-blur-sm p-4 rounded-2xl shadow-lg border">
        <div>
          <h1 className="text-2xl font-bold text-primary">{technician.full_name}</h1>
          <p className="text-xs flex items-center gap-1"><MapPin size={12} /> {locationStatus}</p>
        </div>
        <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); localStorage.clear(); navigate('/user-type'); }}><LogOut /> خروج</Button>
      </header>

      <Button variant="outline" size="sm" onClick={fetchPending} disabled={isLoading} className="mb-4"><RefreshCw size={16} className="mr-1" /> تحديث</Button>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">طلبات معلقة</h2>
        {isLoading ? <p className="text-center">تحميل...</p> : pendingRequests.length === 0 ? <p className="text-center text-muted-foreground">لا توجد طلبات.</p> : (
          <div className="grid gap-4">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-card p-4 rounded-2xl shadow flex justify-between">
                <div>
                  <h3 className="font-bold">{req.device_type}</h3>
                  <p className="text-sm">{req.issue_description}</p>
                  <p className="text-xs text-muted-foreground">{req.phone_number} {req.address && `📍 ${req.address}`}</p>
                  {req.distance != null && <p className="text-xs">🚗 {req.distance.toFixed(1)} كم</p>}
                </div>
                <Button onClick={() => handleBid(req.id)} disabled={submittingBid === req.id}>عرض</Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {myAssignedRequests.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">طلباتي</h2>
          {myAssignedRequests.map(req => (
            <div key={req.id} className="bg-card p-4 rounded-2xl shadow mb-3 border-l-4 border-primary">
              <h3 className="font-bold">{req.device_type}</h3>
              <p className="text-sm">{req.issue_description}</p>
              <p className="text-xs">الحالة: {req.status}</p>
              {req.phone_number && <p className="text-xs">📞 {req.phone_number}</p>}
              <div className="flex gap-2 mt-2">
                {req.status === 'assigned' && <Button size="sm" onClick={() => handleStatus(req.id, 'on_the_way')}>في الطريق</Button>}
                {req.status === 'on_the_way' && <Button size="sm" onClick={() => handleStatus(req.id, 'in_progress')}>بدء الإصلاح</Button>}
                {req.status === 'in_progress' && <Button size="sm" onClick={() => handleStatus(req.id, 'completed')}>تم</Button>}
                <Button size="sm" variant="secondary" onClick={() => setChatRequestId(req.id)}>محادثة</Button>
              </div>
              <dialog id={`delay-${req.id}`} className="p-4 rounded-xl">
                <h3 className="font-bold">تأجيل</h3>
                <Input value={delayReason} onChange={e => setDelayReason(e.target.value)} />
                <Button size="sm" onClick={() => { handleDelay(req.id); document.getElementById(`delay-${req.id}`).close(); }}>تأكيد</Button>
              </dialog>
            </div>
          ))}
        </section>
      )}

      {chatRequestId && <ChatPopup requestId={chatRequestId} currentUser={{ id: technician.id, userType: 'technician' }} onClose={() => setChatRequestId(null)} />}
    </motion.div>
  );
};

export default TechnicianHomeScreen;