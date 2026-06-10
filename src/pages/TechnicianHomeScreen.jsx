import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { LogOut, Wrench, MapPin, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast.jsx';
import { supabase } from '@/lib/supabaseClient';

const TechnicianHomeScreen = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [technician, setTechnician] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // جلب بيانات الفني والطلبات
  useEffect(() => {
    const fetchData = async () => {
      // 1. جلب الجلسة
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate('/login/technician');
        return;
      }

      // 2. جلب بيانات الفني
      const { data: techData, error: techError } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', user.id)
        .single();

      if (techError || !techData || techData.status !== 'approved') {
        toast({ title: t('error'), description: 'حسابك غير مفعل أو قيد المراجعة', variant: 'destructive' });
        navigate('/login/technician');
        return;
      }

      setTechnician(techData);

      // 3. جلب الطلبات المعلقة (اللي تناسب تخصص الفني)
      const techSkills = techData.skills ? techData.skills.split(', ') : [];
      let query = supabase
        .from('maintenance_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // لو الفني محدد أجهزة معينة، نجيب الطلبات اللي تناسب تخصصه
      if (techSkills.length > 0) {
        query = query.in('device_type', techSkills);
      }

      const { data: requests, error: requestsError } = await query;

      if (!requestsError) {
        setPendingRequests(requests || []);
      }

      // 4. جلب الطلبات اللي قبلها الفني
      const { data: accepted, error: acceptedError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('technician_id', user.id)
        .in('status', ['accepted', 'on_the_way', 'in_progress'])
        .order('created_at', { ascending: false });

      if (!acceptedError) {
        setAcceptedRequests(accepted || []);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [navigate, toast, t]);

  // قبول طلب صيانة
  const handleAcceptRequest = async (requestId) => {
    const { error } = await supabase
      .from('maintenance_requests')
      .update({
        technician_id: technician.id,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('status', 'pending'); // ضمان أن طلب لم يقبله أحد بعد

    if (error) {
      toast({ title: t('error'), description: 'فشل قبول الطلب. ربما تم قبوله من فني آخر.', variant: 'destructive' });
      // إعادة تحميل الطلبات
      return;
    }

    toast({ title: t('success'), description: 'تم قبول الطلب بنجاح!' });
    // إزالة الطلب من قائمة المعلقة وإضافته للقائمة المقبولة
    const accepted = pendingRequests.find(r => r.id === requestId);
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    if (accepted) {
      setAcceptedRequests(prev => [{ ...accepted, status: 'accepted', technician_id: technician.id }, ...prev]);
    }
  };

  // تغيير حالة الطلب (للطلبات المقبولة)
  const handleUpdateStatus = async (requestId, newStatus) => {
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status: newStatus })
      .eq('id', requestId)
      .eq('technician_id', technician.id);

    if (error) {
      toast({ title: t('error'), description: 'فشل تحديث الحالة', variant: 'destructive' });
      return;
    }

    setAcceptedRequests(prev =>
      prev.map(r => (r.id === requestId ? { ...r, status: newStatus } : r))
    );
    toast({ title: t('success'), description: 'تم تحديث الحالة' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    navigate('/user-type');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <p className="text-xl">جارٍ التحميل...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5"
    >
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">{t('technician')} {t('home')}</h1>
          {technician && (
            <p className="text-muted-foreground">
              {technician.full_name} - {technician.specialization}
            </p>
          )}
        </div>
        <Button variant="ghost" onClick={handleLogout} className="text-destructive">
          <LogOut className="ltr:mr-2 rtl:ml-2 h-5 w-5" /> {t('logout')}
        </Button>
      </header>

      {/* قسم الطلبات المعلقة */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">طلبات الصيانة المتاحة</h2>
        {pendingRequests.length === 0 ? (
          <div className="text-center p-8 bg-muted/30 rounded-lg">
            <Wrench size={48} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">لا توجد طلبات صيانة متاحة حالياً.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingRequests.map(request => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl p-4 shadow-md border"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">
                      {t(request.device_type) || request.device_type}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {request.issue_description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(request.created_at).toLocaleString('ar-EG')}
                    </p>
                  </div>
                  <Button onClick={() => handleAcceptRequest(request.id)}>
                    قبول الطلب
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* قسم الطلبات المقبولة */}
      {acceptedRequests.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">طلباتي النشطة</h2>
          <div className="grid gap-4">
            {acceptedRequests.map(request => (
              <div key={request.id} className="bg-card rounded-xl p-4 shadow-md border border-primary/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">
                      {t(request.device_type) || request.device_type}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {request.issue_description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      الحالة: <span className="font-semibold text-primary">{request.status}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {request.status === 'accepted' && (
                      <Button size="sm" onClick={() => handleUpdateStatus(request.id, 'on_the_way')}>
                        في الطريق
                      </Button>
                    )}
                    {request.status === 'on_the_way' && (
                      <Button size="sm" onClick={() => handleUpdateStatus(request.id, 'in_progress')}>
                        بدء العمل
                      </Button>
                    )}
                    {request.status === 'in_progress' && (
                      <Button size="sm" onClick={() => handleUpdateStatus(request.id, 'completed')}>
                        إتمام
                      </Button>
                    )}
                  </div>
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