import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { LogOut, MapPin, Navigation } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast.jsx';
import { supabase } from '@/lib/supabaseClient';

const MAX_DISTANCE_KM = 15;
const AVG_SPEED_KMH = 30;

// دالة حساب المسافة
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const TechnicianHomeScreen = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [technician, setTechnician] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null); // { lat, lng }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login/technician'); return; }

      const { data: tech, error: techErr } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', user.id)
        .single();

      if (techErr || !tech || tech.status !== 'approved') {
        toast({ title: 'خطأ', description: 'حسابك قيد المراجعة.' });
        navigate('/login/technician');
        return;
      }
      setTechnician(tech);

      // محاولة الحصول على الموقع الحالي للفني
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCurrentLocation(loc);
            // تحديث موقع الفني في قاعدة البيانات
            await supabase.from('technicians').update({ lat: loc.lat, lng: loc.lng }).eq('id', user.id);
          },
          (err) => {
            // إذا لم يسمح، استخدم الموقع المخزن إن وجد
            if (tech.lat && tech.lng) {
              setCurrentLocation({ lat: tech.lat, lng: tech.lng });
              toast({ description: 'تم استخدام موقعك المخزن مسبقاً.' });
            } else {
              toast({ title: 'تنبيه', description: 'يرجى تفعيل الموقع لعرض الطلبات القريبة.' });
            }
          }
        );
      } else if (tech.lat && tech.lng) {
        setCurrentLocation({ lat: tech.lat, lng: tech.lng });
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!currentLocation || !technician) return;

    const fetchRequests = async () => {
      // جلب جميع الطلبات المعلقة
      const { data: all, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('status', 'pending')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('created_at', { ascending: false });

      if (error) return;

      // تصفية الطلبات التي تبعد أقل من MAX_DISTANCE_KM
      const nearby = all.filter(req => {
        const dist = getDistanceFromLatLonInKm(currentLocation.lat, currentLocation.lng, req.lat, req.lng);
        return dist <= MAX_DISTANCE_KM;
      }).map(req => ({
        ...req,
        distance: getDistanceFromLatLonInKm(currentLocation.lat, currentLocation.lng, req.lat, req.lng),
      }));

      setPendingRequests(nearby);
    };

    fetchRequests();
  }, [currentLocation, technician]);

  const handleAcceptRequest = async (requestId) => {
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ technician_id: technician.id, status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('status', 'pending');

    if (error) {
      toast({ title: 'خطأ', description: 'فشل قبول الطلب.' });
      return;
    }

    toast({ title: 'تم', description: 'تم قبول الطلب.' });
    const accepted = pendingRequests.find(r => r.id === requestId);
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    if (accepted) setAcceptedRequests(prev => [{ ...accepted, status: 'accepted' }, ...prev]);
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    await supabase.from('maintenance_requests').update({ status: newStatus }).eq('id', requestId);
    setAcceptedRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
    toast({ title: 'تم', description: `تم تغيير الحالة إلى ${newStatus}` });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/user-type');
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">تحميل...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">لوحة الفني</h1>
          {technician && <p>{technician.full_name}</p>}
          {currentLocation && (
            <p className="text-xs flex items-center gap-1"><MapPin size={14} /> موقعك الحالي مفعّل</p>
          )}
        </div>
        <Button variant="ghost" onClick={handleLogout}><LogOut /> خروج</Button>
      </header>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">طلبات قريبة (أقل من {MAX_DISTANCE_KM} كم)</h2>
        {pendingRequests.length === 0 ? (
          <p className="text-center text-muted-foreground">لا توجد طلبات قريبة الآن.</p>
        ) : (
          pendingRequests.map(req => (
            <div key={req.id} className="bg-card p-4 rounded-xl shadow mb-3">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-bold">{t(req.device_type)}</h3>
                  <p className="text-sm">{req.issue_description}</p>
                  <p className="text-xs text-muted-foreground">
                    المسافة: {req.distance?.toFixed(1)} كم | الوقت التقريبي: {Math.round((req.distance || 0) / AVG_SPEED_KMH * 60)} دقيقة
                  </p>
                  {req.phone_number && <p className="text-xs">رقم العميل: {req.phone_number}</p>}
                </div>
                <Button onClick={() => handleAcceptRequest(req.id)}>قبول الطلب</Button>
              </div>
            </div>
          ))
        )}
      </section>

      {acceptedRequests.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">طلباتي النشطة</h2>
          {acceptedRequests.map(req => (
            <div key={req.id} className="bg-card p-4 rounded-xl shadow mb-3 border border-primary/20">
              <div>
                <h3 className="font-bold">{t(req.device_type)}</h3>
                <p className="text-sm">{req.issue_description}</p>
                {req.phone_number && <p className="text-sm">رقم العميل: {req.phone_number}</p>}
                <p className="text-xs">الحالة: {req.status}</p>
              </div>
              <div className="flex gap-2 mt-2">
                {req.status === 'accepted' && (
                  <Button size="sm" onClick={() => handleUpdateStatus(req.id, 'on_the_way')}>في الطريق</Button>
                )}
                {req.status === 'on_the_way' && (
                  <Button size="sm" onClick={() => handleUpdateStatus(req.id, 'in_progress')}>بدأ العمل</Button>
                )}
                {req.status === 'in_progress' && (
                  <Button size="sm" onClick={() => handleUpdateStatus(req.id, 'completed')}>تم الإصلاح</Button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </motion.div>
  );
};

export default TechnicianHomeScreen;