import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast.jsx';
import {
  Shield, Clock, DollarSign, RefreshCw, Users, Wrench, Activity,
  FileText, Download, Eye, BarChart2, XCircle, CheckCircle
} from 'lucide-react';

// مكون Badge محلي (بديل عن الاستيراد المفقود)
const Badge = ({ children, variant = 'default' }) => {
  const colors = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    destructive: 'bg-red-100 text-red-800',
    default: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[variant] || colors.default}`}>
      {children}
    </span>
  );
};

// دالة مساعدة لتصدير CSV
const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  data.forEach(row => {
    const values = headers.map(h => {
      const val = row[h] == null ? '' : row[h];
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  });
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

const AdminPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // بيانات
  const [stats, setStats] = useState({ technicians: 0, customers: 0, requests: 0, pendingRecharges: 0 });
  const [allTechnicians, setAllTechnicians] = useState([]);
  const [requests, setRequests] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [logs, setLogs] = useState([]);

  // فلترة
  const [statusFilter, setStatusFilter] = useState('all');

  // عرض تفاصيل
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // رصيد يدوي
  const [manualAmount, setManualAmount] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // دالة تسجيل نشاط
  const logAction = async (action, details = '') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('admin_logs').insert({ admin_id: user.id, action, details });
  };

  // جلب كل البيانات
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // إحصائيات
      const [{ count: techCount }, { count: custCount }, { count: reqCount }, { count: recCount }] = await Promise.all([
        supabase.from('technicians').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }),
        supabase.from('recharge_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);
      setStats({ technicians: techCount || 0, customers: custCount || 0, requests: reqCount || 0, pendingRecharges: recCount || 0 });

      // الجداول
      const { data: techs } = await supabase.from('technicians').select('*').order('created_at', { ascending: false });
      const { data: reqs } = await supabase.from('maintenance_requests').select('*').order('created_at', { ascending: false });
      const { data: recs } = await supabase.from('recharge_requests').select('*').order('created_at', { ascending: false });
      const { data: custs } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      const { data: logsData } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(50);

      setAllTechnicians(techs || []);
      setRequests(reqs || []);
      setRecharges(recs || []);
      setCustomers(custs || []);
      setLogs(logsData || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'خطأ', description: 'فشل تحميل البيانات.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // تحديث حالة فني
  const updateTechnicianStatus = async (id, status) => {
    const { error } = await supabase.from('technicians').update({ status }).eq('id', id);
    if (!error) {
      await logAction(`تغيير حالة فني إلى ${status}`, `ID: ${id}`);
      fetchAllData();
      toast({ title: 'تم', description: 'تم تحديث حالة الفني.' });
    } else toast({ title: 'خطأ', description: error.message });
  };

  // تحديث طلب شحن/استرداد
  const handleRechargeAction = async (id, action) => {
    const { data: req } = await supabase.from('recharge_requests').select('*').eq('id', id).single();
    if (!req) return;
    if (action === 'approved') {
      const { data: userData } = await supabase.from('customers').select('balance').eq('id', req.user_id).single();
      const newBalance = (userData?.balance || 0) + req.amount;
      await supabase.from('customers').update({ balance: newBalance }).eq('id', req.user_id);
    }
    const { error } = await supabase.from('recharge_requests').update({ status: action, notes: `Admin ${action}` }).eq('id', id);
    if (!error) {
      await logAction(`${action === 'approved' ? 'قبول' : 'رفض'} طلب شحن`, `ID: ${id}, مبلغ: ${req.amount}`);
      fetchAllData();
      toast({ title: 'تم' });
    } else toast({ title: 'خطأ', description: error.message });
  };

  // إضافة رصيد يدوي
  const addManualBalance = async () => {
    if (!selectedCustomerId || !manualAmount) return;
    const amount = parseFloat(manualAmount);
    if (isNaN(amount) || amount <= 0) return;
    const { data: userData } = await supabase.from('customers').select('balance').eq('id', selectedCustomerId).single();
    const newBalance = (userData?.balance || 0) + amount;
    const { error } = await supabase.from('customers').update({ balance: newBalance }).eq('id', selectedCustomerId);
    if (!error) {
      await logAction(`إضافة رصيد يدوي`, `العميل: ${selectedCustomerId}, المبلغ: ${amount}`);
      fetchAllData();
      toast({ title: 'تم', description: `تم إضافة ${amount} جنيه.` });
      setManualAmount('');
    }
  };

  // تصدير
  const handleExport = (data, name) => exportToCSV(data, name);

  // بطاقات الإحصائيات
  const statCards = [
    { label: 'الفنيين', value: stats.technicians, icon: <Wrench size={24} />, color: 'bg-blue-500' },
    { label: 'العملاء', value: stats.customers, icon: <Users size={24} />, color: 'bg-green-500' },
    { label: 'الطلبات', value: stats.requests, icon: <FileText size={24} />, color: 'bg-purple-500' },
    { label: 'شحن معلق', value: stats.pendingRecharges, icon: <DollarSign size={24} />, color: 'bg-orange-500' },
  ];

  return (
    <div className="mt-6 bg-card border rounded-2xl p-4 md:p-6 shadow-lg">
      {/* الهيدر */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="text-primary" size={28} />
          <h2 className="text-2xl font-bold">لوحة الأدمن</h2>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAllData} disabled={loading}>
          <RefreshCw size={16} className={`mr-1 ${loading ? 'animate-spin' : ''}`} /> تحديث
        </Button>
      </div>

      {/* أزرار التبويبات */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'dashboard', label: 'الإحصائيات', icon: <BarChart2 size={16} /> },
          { key: 'technicians', label: 'الفنيين', icon: <Wrench size={16} />, badge: allTechnicians.filter(t => t.status === 'pending_review').length },
          { key: 'requests', label: 'الطلبات', icon: <FileText size={16} /> },
          { key: 'recharges', label: 'الشحن', icon: <DollarSign size={16} />, badge: stats.pendingRecharges },
          { key: 'customers', label: 'العملاء', icon: <Users size={16} /> },
          { key: 'logs', label: 'سجل النشاط', icon: <Activity size={16} /> },
        ].map(tab => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab.key)}
            size="sm"
            className="relative"
          >
            {tab.icon} <span className="ml-1">{tab.label}</span>
            {tab.badge > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* المحتوى */}
      {loading ? (
        <div className="text-center py-12"><RefreshCw className="animate-spin inline" size={32} /> <p>تحميل...</p></div>
      ) : (
        <>
          {/* الإحصائيات */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.color} text-white rounded-xl p-4 shadow-lg`}>
                  <div className="flex items-center justify-between"><span className="text-2xl font-bold">{s.value}</span>{s.icon}</div>
                  <p className="mt-2 text-sm opacity-90">{s.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* الفنيين */}
          {activeTab === 'technicians' && (
            <div>
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => handleExport(allTechnicians, 'technicians')}><Download size={14} /> تصدير</Button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {allTechnicians.map(tech => (
                  <div key={tech.id} className="flex items-center justify-between border rounded-lg p-3 bg-background/50">
                    <div>
                      <p className="font-medium">{tech.full_name}</p>
                      <p className="text-sm text-muted-foreground">{tech.email}</p>
                      <p className="text-xs">
                        الحالة: <Badge variant={tech.status === 'approved' ? 'success' : tech.status === 'pending_review' ? 'warning' : 'destructive'}>
                          {tech.status === 'approved' ? 'مفعل' : tech.status === 'pending_review' ? 'قيد المراجعة' : 'مرفوض'}
                        </Badge>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedTechnician(tech)}><Eye size={14} /></Button>
                      {tech.status === 'pending_review' && (
                        <><Button size="sm" onClick={() => updateTechnicianStatus(tech.id, 'approved')}>قبول</Button><Button size="sm" variant="destructive" onClick={() => updateTechnicianStatus(tech.id, 'rejected')}>رفض</Button></>
                      )}
                      {tech.status === 'approved' && <Button size="sm" variant="destructive" onClick={() => updateTechnicianStatus(tech.id, 'suspended')}>تعليق</Button>}
                      {tech.status === 'suspended' && <Button size="sm" onClick={() => updateTechnicianStatus(tech.id, 'approved')}>إعادة تفعيل</Button>}
                    </div>
                  </div>
                ))}
              </div>
              {/* نافذة تفاصيل فني */}
              {selectedTechnician && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedTechnician(null)}>
                  <div className="bg-card rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <h3 className="font-bold text-xl mb-4">{selectedTechnician.full_name}</h3>
                    <p>البريد: {selectedTechnician.email}</p>
                    <p>التخصص: {selectedTechnician.specialization}</p>
                    <p>المهارات: {selectedTechnician.skills}</p>
                    {selectedTechnician.skill_assessment && (
                      <div className="mt-2"><p className="font-semibold">نتيجة الاختبار:</p>
                        <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(selectedTechnician.skill_assessment, null, 2)}</pre>
                      </div>
                    )}
                    {selectedTechnician.documents && (
                      <div className="mt-2"><p className="font-semibold">المستندات:</p>
                        <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(selectedTechnician.documents, null, 2)}</pre>
                      </div>
                    )}
                    <Button className="mt-4" onClick={() => setSelectedTechnician(null)}>إغلاق</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* الطلبات */}
          {activeTab === 'requests' && (
            <div>
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => handleExport(requests, 'requests')}><Download size={14} /> تصدير</Button>
                <select className="border rounded p-1 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="all">كل الحالات</option>
                  <option value="pending">معلقة</option>
                  <option value="assigned">معين فني</option>
                  <option value="completed">مكتملة</option>
                  <option value="cancelled">ملغاة</option>
                </select>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {requests.filter(r => statusFilter === 'all' || r.status === statusFilter).map(req => (
                  <div key={req.id} className="border rounded-lg p-3 flex justify-between items-center bg-background/50">
                    <div>
                      <p className="font-medium">{req.device_type} <Badge>{req.status}</Badge></p>
                      <p className="text-sm">{req.issue_description?.slice(0, 50)}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSelectedRequest(req)}>تفاصيل</Button>
                  </div>
                ))}
              </div>
              {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedRequest(null)}>
                  <div className="bg-card rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                    <h3 className="font-bold text-xl mb-4">طلب #{selectedRequest.id}</h3>
                    <p>الجهاز: {selectedRequest.device_type}</p>
                    <p>الوصف: {selectedRequest.issue_description}</p>
                    <p>الحالة: {selectedRequest.status}</p>
                    <p>العميل: {selectedRequest.customer_id}</p>
                    <p>الفني: {selectedRequest.technician_id || '—'}</p>
                    <p>الشكاوى: {JSON.stringify(selectedRequest.complaints)}</p>
                    <Button className="mt-4" onClick={() => setSelectedRequest(null)}>إغلاق</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* الشحن */}
          {activeTab === 'recharges' && (
            <div>
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => handleExport(recharges, 'recharges')}><Download size={14} /> تصدير</Button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {recharges.map(req => (
                  <div key={req.id} className="border rounded-lg p-3 flex justify-between items-center bg-background/50">
                    <div>
                      <p className="font-medium">{req.email}</p>
                      <p className="text-sm">{req.amount} جنيه - {req.request_type}</p>
                      <Badge variant={req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'destructive'}>{req.status}</Badge>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleRechargeAction(req.id, 'approved')}>قبول</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleRechargeAction(req.id, 'rejected')}>رفض</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* العملاء */}
          {activeTab === 'customers' && (
            <div>
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => handleExport(customers, 'customers')}><Download size={14} /> تصدير</Button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {customers.map(cust => (
                  <div key={cust.id} className="border rounded-lg p-3 flex justify-between items-center bg-background/50">
                    <div>
                      <p className="font-medium">{cust.full_name || cust.email}</p>
                      <p className="text-sm">الرصيد: {cust.balance} جنيه</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedCustomerId(cust.id)}>إضافة رصيد</Button>
                    </div>
                  </div>
                ))}
              </div>
              {selectedCustomerId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedCustomerId(null)}>
                  <div className="bg-card rounded-2xl p-6" onClick={e => e.stopPropagation()}>
                    <h3 className="font-bold mb-2">إضافة رصيد يدوي</h3>
                    <Input type="number" value={manualAmount} onChange={e => setManualAmount(e.target.value)} placeholder="المبلغ" />
                    <Button className="mt-3" onClick={addManualBalance}>إضافة</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* سجل النشاطات */}
          {activeTab === 'logs' && (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto text-sm">
              {logs.map(log => (
                <div key={log.id} className="border-b pb-2">
                  <p><span className="font-semibold">{log.action}</span> <span className="text-muted-foreground">— {new Date(log.created_at).toLocaleString('ar-EG')}</span></p>
                  <p className="text-xs text-muted-foreground">{log.details}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminPanel;