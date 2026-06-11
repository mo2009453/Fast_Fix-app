import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { LogOut, MapPin, Clock, Wrench, Phone, User, Navigation, CheckCircle, AlertCircle, Home } from 'lucide-react';
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
  const [delayReason, setDelayReason] = useState('');

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
      const { data } = await supabase.from('maintenance_requests').select('*, customer:customer_id ( full_name, phone, address )').eq('status', 'pending').not('lat', 'is', null);
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
      await supabase.rpc('expire_stale_assignments');
      const { data } = await supabase.from('maintenance_requests')
        .select('*, customer:customer_id ( full_name, phone, address )')
        .eq('technician_id', technician.id)
        .in('status', ['assigned', 'accepted', 'on_the_way', 'in_progress']);
      if (data) setMyAssignedRequests(data);
    };
    fetchAssigned();
  }, [technician]);

  const handleUpdateStatus = async (requestId, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'accepted' || newStatus === 'on_the_way') {
      updateData.expires_at = null;
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
        status: 'accepted',
        notes: delayReason,
        expires_at: new Date(Date.now() + 30 * 60000).toISOString()
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

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
        <Wrench size={64} className="text-primary" />
      </motion.div>
      <p className="mt-4 text-lg font-medium animate-pulse">جاري تجهيز لوحة القيادة...</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* هيدر بتصميم سحري */}
      <header className="flex justify-between items-center mb-8 bg-card/50 backdrop-blur-sm p-4 rounded-2xl shadow-lg border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            {technician?.full_name?.charAt(0) || 'ف'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">{technician?.full_name}</h1>
            <p className="text-xs flex items-center gap-1 text-muted-foreground">
              <MapPin size={12} /> الموقع نشط
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); localStorage.clear(); navigate('/user-type'); }}>
          <LogOut className="ltr:mr-2 rtl:ml-2 h-5 w-5" /> خروج
        </Button>
      </header>

      {/* طلبات قريبة */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Navigation className="text-primary" /> طلبات قريبة
        </h2>
        {pendingRequests.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-8 text-center shadow-sm border border-dashed">
            <Wrench size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">لا توجد طلبات صيانة قريبة حالياً.</p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {pendingRequests.map(req => (
              <motion.div key={req.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.01 }} className="bg-card rounded-2xl p-5 shadow-md border hover:shadow-lg transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg capitalize flex items-center gap-2">
                      <Wrench size={18} className="text-primary" /> {req.device_type}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{req.issue_description}</p>
                    <div className="flex gap-3 mt-3 text-xs">
                      <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                        <MapPin size={12} /> {req.distance?.toFixed(1)} كم
                      </span>
                      <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full">
                        <Clock size={12} /> {Math.round((req.distance || 0) / 30 * 60)} دقيقة
                      </span>
                    </div>
                  </div>
                  <Button onClick={() => handlePlaceBid(req.id)} disabled={submittingBid === req.id} className="bg-gradient-to-r from-primary to-purple-600 text-white">
                    تقديم عرض
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* طلباتي المعينة */}
      {myAssignedRequests.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="text-green-500" /> طلباتي النشطة
          </h2>
          {myAssignedRequests.map(req => {
            const customer = req.customer || {};
            return (
              <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl p-5 shadow-md mb-4 border-l-4 border-primary hover:shadow-lg transition-all">
                {/* بيانات العميل التفصيلية */}
                <div className="bg-muted/30 p-3 rounded-xl mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm">
                      {customer.full_name?.charAt(0) || 'ع'}
                    </div>
                    <span className="font-bold">{customer.full_name || 'العميل'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {customer.phone && <p className="flex items-center gap-1"><Phone size={14} /> {customer.phone}</p>}
                    {customer.address && <p className="flex items-center gap-1 col-span-2"><Home size={14} /> {customer.address}</p>}
                  </div>
                </div>

                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Wrench size={18} className="text-primary" /> {req.device_type}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{req.issue_description}</p>
                
                <div className="flex justify-between items-center mt-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    req.status === 'assigned' ? 'bg-yellow-100 text-yellow-700' :
                    req.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                    req.status === 'on_the_way' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {req.status === 'assigned' ? '⏳ بانتظار البدء' :
                     req.status === 'accepted' ? '✅ مقبول' :
                     req.status === 'on_the_way' ? '🚗 في الطريق' :
                     '🔧 جاري الإصلاح'}
                  </span>
                  
                  <div className="flex gap-2">
                    {req.status === 'assigned' && (
                      <>
                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => handleUpdateStatus(req.id, 'on_the_way')}>
                          <Navigation size={14} className="mr-1" /> في الطريق
                        </Button>
                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-300" onClick={() => document.getElementById(`delay-${req.id}`).showModal()}>
                          <Clock size={14} className="mr-1" /> تأجيل
                        </Button>
                        <dialog id={`delay-${req.id}`} className="p-4 rounded-xl shadow-xl">
                          <h3 className="font-bold mb-2">سبب التأجيل</h3>
                          <Input value={delayReason} onChange={e => setDelayReason(e.target.value)} placeholder="اكتب السبب..." />
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={() => { handleDelay(req.id); document.getElementById(`delay-${req.id}`).close(); }}>تأكيد</Button>
                            <Button size="sm" variant="ghost" onClick={() => document.getElementById(`delay-${req.id}`).close()}>إلغاء</Button>
                          </div>
                        </dialog>
                      </>
                    )}
                    {(req.status === 'on_the_way' || req.status === 'accepted') && (
                      <>
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleUpdateStatus(req.id, 'in_progress')}>
                          <Wrench size={14} className="mr-1" /> بدء الإصلاح
                        </Button>
                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-300" onClick={() => document.getElementById(`delay-${req.id}`).showModal()}>
                          <Clock size={14} className="mr-1" /> تأجيل
                        </Button>
                      </>
                    )}
                    {req.status === 'in_progress' && (
                      <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-600 text-white" onClick={() => handleUpdateStatus(req.id, 'completed')}>
                        <CheckCircle size={14} className="mr-1" /> تم الإصلاح
                      </Button>
                    )}
                  </div>
                </div>
                {req.notes && <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">📝 {req.notes}</p>}
              </motion.div>
            );
          })}
        </section>
      )}
    </motion.div>
  );
};

export default TechnicianHomeScreen;