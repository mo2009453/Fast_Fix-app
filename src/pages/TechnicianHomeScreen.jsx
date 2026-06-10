import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { LogOut, MapPin, Navigation, Wrench, Phone, Clock, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast.jsx';
import { supabase } from '@/lib/supabaseClient';

const MAX_DISTANCE_KM = 15;
const AVG_SPEED_KMH = 30;

// حساب المسافة بين إحداثيين
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const TechnicianHomeScreen = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [technician, setTechnician] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);

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

      // محاولة الحصول على الموقع
      const tryGeolocation = () => new Promise((resolve) => {
        if (!navigator.geolocation) {
          if (tech.lat && tech.lng) setCurrentLocation({ lat: tech.lat, lng: tech.lng });
          resolve();
          return;
        }
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCurrentLocation(loc);
            await supabase.from('technicians').update({ lat: loc.lat, lng: loc.lng }).eq('id', user.id);
            resolve();
          },
          () => {
            if (tech.lat && tech.lng) {
              setCurrentLocation({ lat: tech.lat, lng: tech.lng });
              toast({ description: 'تم استخدام موقعك المخزن.' });
            } else {
              toast({ title: 'تنبيه', description: 'يرجى تفعيل الموقع لعرض الطلبات.' });
            }
            resolve();
          }
        );
      });

      await tryGeolocation();
      setIsLoading(false); // ← هنا الإصلاح
    };

    init();
  }, []);

  useEffect(() => {
    if (!currentLocation || !technician) return;

    const fetchNearbyRequests = async () => {
      const { data: all, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('status', 'pending')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('created_at', { ascending: false });

      if (error) return;

      const nearby = all
        .filter(req => {
          const dist = getDistance(currentLocation.lat, currentLocation.lng, req.lat, req.lng);
          return dist <= MAX_DISTANCE_KM;
        })
        .map(req => ({
          ...req,
          distance: getDistance(currentLocation.lat, currentLocation.lng, req.lat, req.lng),
        }));

      setPendingRequests(nearby);
    };

    // جلب الطلبات النشطة الخاصة بالفني
    const fetchMyRequests = async () => {
      const { data: mine } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('technician_id', technician.id)
        .in('status', ['accepted', 'on_the_way', 'in_progress'])
        .order('created_at', { ascending: false });

      if (mine) setAcceptedRequests(mine);
    };

    fetchNearbyRequests();
    fetchMyRequests();
  }, [currentLocation, technician]);

  const handleAccept = async (id) => {
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ technician_id: technician.id, status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending');

    if (error) return toast({ title: 'خطأ', description: 'فشل قبول الطلب.' });

    toast({ title: 'تم القبول', description: 'أنت الآن مسؤول عن هذا الطلب.' });
    const item = pendingRequests.find(r => r.id === id);
    setPendingRequests(prev => prev.filter(r => r.id !== id));
    if (item) setAcceptedRequests(prev => [{ ...item, status: 'accepted' }, ...prev]);
  };

  const handleStatus = async (id, newStatus) => {
    await supabase.from('maintenance_requests').update({ status: newStatus }).eq('id', id);
    setAcceptedRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    toast({ title: 'تم', description: `الحالة أصبحت: ${newStatus}` });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/user-type');
  };

  // --- عرض شاشة تحميل جميلة ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mb-6"
        >
          <Wrench size={64} className="text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold text-primary mb-2">جاري تجهيز لوحة الفني</h2>
        <p className="text-muted-foreground">تحديد الموقع وجلب الطلبات...</p>
      </div>
    );
  }

  // --- الواجهة الرئيسية ---
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5"
    >
      {/* هيدر احترافي */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
            {t('technician')} Dashboard
          </h1>
          {technician && (
            <p className="text-lg font-medium text-foreground/80">
              {technician.full_name}
              <span className="ml-2 inline-flex items-center gap-1 text-sm text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full" /> متصل
              </span>
            </p>
          )}
          {currentLocation && (
            <p className="text-xs flex items-center gap-1 text-muted-foreground mt-1">
              <MapPin size={14} /> موقعك نشط
            </p>
          )}
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut size={16} /> {t('logout')}
        </Button>
      </header>

      {/* بطاقة الطلبات القريبة */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-2">طلبات قريبة منك</h2>
        <p className="text-sm text-muted-foreground mb-4">أقل من {MAX_DISTANCE_KM} كم</p>

        {pendingRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-8 text-center shadow-sm border border-dashed"
          >
            <Wrench size={64} className="mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-xl font-semibold mb-2">لا توجد طلبات قريبة حالياً</h3>
            <p className="text-muted-foreground">ستظهر هنا أي طلبات صيانة جديدة في منطقتك.</p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {pendingRequests.map(req => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-2xl p-5 shadow-md border hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-xl capitalize">
                      {t(req.device_type) || req.device_type}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {req.issue_description}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-3 text-xs">
                      <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                        <MapPin size={12} /> {req.distance?.toFixed(1)} كم
                      </span>
                      <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full">
                        <Clock size={12} /> {Math.round((req.distance || 0) / AVG_SPEED_KMH * 60)} دقيقة
                      </span>
                      {req.phone_number && (
                        <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                          <Phone size={12} /> {req.phone_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => handleAccept(req.id)} className="gap-2">
                    <Navigation size={16} /> قبول
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* الطلبات النشطة الخاصة بي */}
      {acceptedRequests.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">طلباتي النشطة</h2>
          <div className="grid gap-4">
            {acceptedRequests.map(req => (
              <div
                key={req.id}
                className="bg-card rounded-2xl p-5 shadow-md border border-primary/20"
              >
                <div>
                  <h3 className="font-bold text-xl">
                    {t(req.device_type) || req.device_type}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {req.issue_description}
                  </p>
                  {req.phone_number && (
                    <p className="text-sm mt-2 flex items-center gap-1">
                      <Phone size={14} /> {req.phone_number}
                    </p>
                  )}
                  <p className="text-sm mt-1 font-medium">
                    الحالة: <span className="text-primary capitalize">{req.status}</span>
                  </p>
                </div>
                <div className="flex gap-2 mt-4 flex-wrap">
                  {req.status === 'accepted' && (
                    <Button onClick={() => handleStatus(req.id, 'on_the_way')} className="gap-2">
                      <Navigation size={16} /> في الطريق
                    </Button>
                  )}
                  {req.status === 'on_the_way' && (
                    <Button onClick={() => handleStatus(req.id, 'in_progress')} className="gap-2">
                      <Wrench size={16} /> بدء الإصلاح
                    </Button>
                  )}
                  {req.status === 'in_progress' && (
                    <Button onClick={() => handleStatus(req.id, 'completed')} className="gap-2">
                      ✓ إتمام بنجاح
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
};

export default TechnicianHomeScreen;