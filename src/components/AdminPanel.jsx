import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx'; // افترض أن لديك مكون badge
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast.jsx';
import { Shield, UserCheck, Clock, DollarSign, RefreshCw } from 'lucide-react';

const AdminPanel = () => {
  const { toast } = useToast();
  const [technicians, setTechnicians] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('technicians'); // 'technicians' or 'recharges'

  const fetchData = async () => {
    setLoading(true);
    // جلب الفنيين المعلقين
    const { data: techs } = await supabase
      .from('technicians')
      .select('*')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false });
    if (techs) setTechnicians(techs);

    // جلب طلبات الشحن/الاسترداد المعلقة
    const { data: rechargesData } = await supabase
      .from('recharge_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (rechargesData) setRecharges(rechargesData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const approveTechnician = async (id) => {
    const { error } = await supabase
      .from('technicians')
      .update({ status: 'approved' })
      .eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تمت الموافقة', description: 'تم تفعيل حساب الفني.' });
      setTechnicians(prev => prev.filter(t => t.id !== id));
    }
  };

  const rejectTechnician = async (id) => {
    const { error } = await supabase
      .from('technicians')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الرفض', description: 'تم رفض الفني.' });
      setTechnicians(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleRechargeAction = async (id, action) => {
    // action: 'approved' or 'rejected'
    const { data: req } = await supabase
      .from('recharge_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (!req) return;

    if (action === 'approved') {
      // زيادة رصيد المستخدم
      const { data: userData } = await supabase
        .from('customers')
        .select('balance')
        .eq('id', req.user_id)
        .single();

      const newBalance = (userData?.balance || 0) + req.amount;

      const { error: updateBalanceError } = await supabase
        .from('customers')
        .update({ balance: newBalance })
        .eq('id', req.user_id);

      if (updateBalanceError) {
        toast({ title: 'خطأ', description: 'فشل تحديث الرصيد.' });
        return;
      }
    }

    // تحديث حالة الطلب
    const { error } = await supabase
      .from('recharge_requests')
      .update({ status: action, notes: `Admin ${action} on ${new Date().toISOString()}` })
      .eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: `تم ${action === 'approved' ? 'قبول' : 'رفض'} الطلب.` });
      setRecharges(prev => prev.filter(r => r.id !== id));
    }
  };

  if (loading) return <div className="p-4 text-center"><RefreshCw className="animate-spin inline" /> تحميل...</div>;

  return (
    <div className="bg-card border rounded-2xl p-4 mt-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="text-primary" />
        <h2 className="text-xl font-bold">لوحة الأدمن</h2>
      </div>

      <div className="flex gap-4 mb-4">
        <Button variant={activeTab === 'technicians' ? 'default' : 'outline'} onClick={() => setActiveTab('technicians')}>
          فنيين قيد المراجعة ({technicians.length})
        </Button>
        <Button variant={activeTab === 'recharges' ? 'default' : 'outline'} onClick={() => setActiveTab('recharges')}>
          طلبات الشحن/الاسترداد ({recharges.length})
        </Button>
      </div>

      {activeTab === 'technicians' && (
        <div className="space-y-3">
          {technicians.length === 0 && <p className="text-muted-foreground">لا يوجد فنيون قيد المراجعة.</p>}
          {technicians.map(tech => (
            <div key={tech.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="font-medium">{tech.full_name}</p>
                <p className="text-sm text-muted-foreground">{tech.email}</p>
                <p className="text-xs">التخصص: {tech.specialization}</p>
                {tech.skills && <p className="text-xs">المهارات: {tech.skills}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approveTechnician(tech.id)}>قبول</Button>
                <Button size="sm" variant="destructive" onClick={() => rejectTechnician(tech.id)}>رفض</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'recharges' && (
        <div className="space-y-3">
          {recharges.length === 0 && <p className="text-muted-foreground">لا توجد طلبات شحن أو استرداد معلقة.</p>}
          {recharges.map(req => (
            <div key={req.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="font-medium">{req.email}</p>
                <p className="text-sm">المبلغ: {req.amount} جنيه</p>
                <p className="text-xs">نوع الطلب: {req.request_type === 'refund' ? 'استرداد' : 'شحن'}</p>
                {req.related_request_id && <p className="text-xs">طلب صيانة: #{req.related_request_id}</p>}
                {req.notes && <p className="text-xs text-muted-foreground">ملاحظات: {req.notes}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleRechargeAction(req.id, 'approved')}>قبول</Button>
                <Button size="sm" variant="destructive" onClick={() => handleRechargeAction(req.id, 'rejected')}>رفض</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;