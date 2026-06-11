import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast.jsx';
import {
  Shield, Clock, DollarSign, RefreshCw, Users, Wrench, Activity,
  FileText, Download, Eye, BarChart2, XCircle, CheckCircle, Image as ImageIcon,
  Ban, PlayCircle, Truck, Check, X, Phone, CreditCard, AlertTriangle
} from 'lucide-react';

// مكون Badge محلي
const Badge = ({ children, variant = 'default' }) => {
  const colors = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    destructive: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
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

// دالة مساعدة لإنشاء رابط مؤقت للصور
const getSignedUrl = async (bucket, path) => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300); // صالحة 5 دقائق
  if (error) return null;
  return data.signedUrl;
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
  const [selectedRecharge, setSelectedRecharge] = useState(null);

  // مستندات
  const [techDocsUrls, setTechDocsUrls] = useState({});
  const [rechargeScreenshotUrl, setRechargeScreenshotUrl] = useState(null);

  // رصيد يدوي
  const [manualAmount, setManualAmount] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // المبلغ المعتمد للشحن
  const [approvedAmount, setApprovedAmount] = useState('');

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
      const { data: reqs } = await supabase.from('maintenance_requests').select('*, customer:customer_id(full_name, phone)').order('created_at', { ascending: false });
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

  // تحديث طلب شحن/استرداد (مع مبلغ معتمد)
  const handleRechargeAction = async (id, action, amountOverride = null) => {
    const { data: req } = await supabase.from('recharge_requests').select('*').eq('id', id).single();
    if (!req) return;
    const finalAmount = amountOverride || req.amount;
    if (action === 'approved') {
      const { data: userData } = await supabase.from('customers').select('balance').eq('id', req.user_id).single();
      const newBalance = (userData?.balance || 0) + finalAmount;
      await supabase.from('customers').update({ balance: newBalance }).eq('id', req.user_id);
    }
    const { error } = await supabase.from('recharge_requests').update({ status: action, notes: `Admin ${action}, مبلغ: ${finalAmount}` }).eq('id', id);
    if (!error) {
      await logAction(`${action === 'approved' ? 'قبول' : 'رفض'} طلب شحن`, `ID: ${id}, مبلغ: ${finalAmount}`);
      fetchAllData();
      setSelectedRecharge(null);
      setApprovedAmount('');
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

  // تحديث حالة طلب صيانة
  const updateRequestStatus = async (reqId, newStatus) => {
    const { error } = await supabase.from('maintenance_requests').update({ status: newStatus }).eq('id', reqId);
    if (!error) {
      await logAction(`تغيير حالة طلب إلى ${newStatus}`, `Request ID: ${reqId}`);
      fetchAllData();
      toast({ title: 'تم', description: `تم تغيير الحالة إلى ${newStatus}` });
    } else toast({ title: 'خطأ', description: error.message });
  };

  // تحميل مستندات فني
  const loadTechnicianDocs = async (tech) => {
    if (!tech?.documents) return;
    const docs = tech.documents;
    const urls = {};
    if (docs.nationalIdFront) urls.nationalIdFront = await getSignedUrl('technician-documents', docs.nationalIdFront);
    if (docs.nationalIdBack) urls.nationalIdBack = await getSignedUrl('technician-documents', docs.nationalIdBack);
    if (docs.criminalRecord) urls.criminalRecord = await getSignedUrl('technician-documents', docs.criminalRecord);
    setTechDocsUrls(urls);
  };

  // تحميل سكرين شوت الشحن
  const loadRechargeScreenshot = async (rec) => {
    if (!rec?.screenshot_path) return;
    const url = await getSignedUrl('technician-documents', rec.screenshot_path); // يفترض إن الصور مرفوعة في نفس الباكت
    setRechargeScreenshotUrl(url);
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
                      <Button size="sm" variant="outline" onClick={() => { setSelectedTechnician(tech); loadTechnicianDocs(tech); }}><Eye size={14} /></Button>
                      {tech.status === 'pending_review' && (
                        <><Button size="sm" onClick={() => updateTechnicianStatus(tech.id, 'approved')}>قبول</Button><Button size="sm" variant="destructive" onClick={() => updateTechnicianStatus(tech.id, 'rejected')}>رفض</Button></>
                      )}
                      {tech.status === 'approved' && <Button size="sm" variant="destructive" onClick={() => updateTechnicianStatus(tech.id, 'suspended')}>تعليق</Button>}
                      {tech.status === 'suspended' && <Button size="sm" onClick={() => updateTechnicianStatus(tech.id, 'approved')}>إعادة تفعيل</Button>}
                    </div>
                  </div>
                ))}
              </div>
              {/* نافذة تفاصيل فني - تدعم عرض المستندات */}
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
                    <div className="mt-4">
                      <p className="font-semibold mb-2">المستندات المرفوعة:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {techDocsUrls.nationalIdFront && (
                          <a href={techDocsUrls.nationalIdFront} target="_blank" rel="noreferrer">
                            <img src={techDocsUrls.nationalIdFront} alt="وجه البطاقة" className="w-full h-32 object-cover rounded border" />
                            <p className="text-xs text-center">وجه البطاقة</p>
                          </a>
                        )}
                        {techDocsUrls.nationalIdBack && (
                          <a href={techDocsUrls.nationalIdBack} target="_blank" rel="noreferrer">
                            <img src={techDocsUrls.nationalIdBack} alt="ظهر البطاقة" className="w-full h-32 object-cover rounded border" />
                            <p className="text-xs text-center">ظهر البطاقة</p>
                          </a>
                        )}
                        {techDocsUrls.criminalRecord && (
                          <a href={techDocsUrls.criminalRecord} target="_blank" rel="noreferrer">
                            <ImageIcon className="w-full h-32 text-muted-foreground" />
                            <p className="text-xs text-center">الفيش الجنائي</p>
                          </a>
                        )}
                      </div>
                    </div>
                    <Button className="mt-4" onClick={() => setSelectedTechnician(null)}>إغلاق</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* الطلبات - مع تحكم كامل */}
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
                      <p className="text-xs text-muted-foreground">العميل: {req.customer?.full_name || req.customer_id}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSelectedRequest(req)}>تفاصيل</Button>
                  </div>
                ))}
              </div>
              {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedRequest(null)}>
                  <div className="bg-card rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <h3 className="font-bold text-xl mb-4">طلب #{selectedRequest.id}</h3>
                    <p><strong>الجهاز:</strong> {selectedRequest.device_type}</p>
                    <p><strong>الوصف:</strong> {selectedRequest.issue_description}</p>
                    <p><strong>الحالة:</strong> <Badge>{selectedRequest.status}</Badge></p>
                    <p><strong>العميل:</strong> {selectedRequest.customer?.full_name || selectedRequest.customer_id} ({selectedRequest.phone_number})</p>
                    <p><strong>الفني:</strong> {selectedRequest.technician_id || '—'}</p>
                    {selectedRequest.complaints && selectedRequest.complaints.length > 0 && (
                      <div className="mt-2"><strong>الشكاوى:</strong> {JSON.stringify(selectedRequest.complaints)}</div>
                    )}
                    <div className="mt-4 border-t pt-4">
                      <p className="font-semibold mb-2">تغيير الحالة:</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateRequestStatus(selectedRequest.id, 'pending')}>إعادة فتح</Button>
                        <Button size="sm" variant="outline" onClick={() => updateRequestStatus(selectedRequest.id, 'assigned')}>تعيين فني</Button>
                        <Button size="sm" variant="outline" onClick={() => updateRequestStatus(selectedRequest.id, 'accepted')}>مقبول</Button>
                        <Button size="sm" variant="outline" onClick={() => updateRequestStatus(selectedRequest.id, 'on_the_way')}>في الطريق</Button>
                        <Button size="sm" variant="outline" onClick={() => updateRequestStatus(selectedRequest.id, 'in_progress')}>جاري</Button>
                        <Button size="sm" variant="outline" onClick={() => updateRequestStatus(selectedRequest.id, 'completed')}>مكتمل</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateRequestStatus(selectedRequest.id, 'cancelled')}>إلغاء</Button>
                      </div>
                    </div>
                    <Button className="mt-4" variant="ghost" onClick={() => setSelectedRequest(null)}>إغلاق</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* الشحن - مع معلومات كاملة وسكرين شوت */}
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
                      <p className="text-xs text-muted-foreground">رقم الموبايل: {req.phone_number || '—'}</p>
                      <Badge variant={req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'destructive'}>{req.status}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedRecharge(req); loadRechargeScreenshot(req); }}>تفاصيل</Button>
                      {req.status === 'pending' && (
                        <>
                          <Button size="sm" onClick={() => handleRechargeAction(req.id, 'approved')}>قبول</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRechargeAction(req.id, 'rejected')}>رفض</Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* نافذة تفاصيل الشحن */}
              {selectedRecharge && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedRecharge(null)}>
                  <div className="bg-card rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                    <h3 className="font-bold text-xl mb-4">تفاصيل الشحن</h3>
                    <p><strong>البريد:</strong> {selectedRecharge.email}</p>
                    <p><strong>المبلغ المطلوب:</strong> {selectedRecharge.amount} جنيه</p>
                    <p><strong>رقم الموبايل:</strong> {selectedRecharge.phone_number || '—'}</p>
                    <p><strong>النوع:</strong> {selectedRecharge.request_type}</p>
                    {rechargeScreenshotUrl && (
                      <div className="mt-4">
                        <p className="font-semibold mb-2">إشعار التحويل:</p>
                        <a href={rechargeScreenshotUrl} target="_blank" rel="noreferrer">
                          <img src={rechargeScreenshotUrl} alt="إشعار التحويل" className="w-full h-40 object-cover rounded border" />
                        </a>
                      </div>
                    )}
                    {selectedRecharge.status === 'pending' && (
                      <div className="mt-4 border-t pt-4">
                        <Label className="mb-2 block">المبلغ المعتمد (اختياري):</Label>
                        <Input
                          type="number"
                          value={approvedAmount}
                          onChange={e => setApprovedAmount(e.target.value)}
                          placeholder={String(selectedRecharge.amount)}
                        />
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" onClick={() => handleRechargeAction(selectedRecharge.id, 'approved', parseFloat(approvedAmount) || selectedRecharge.amount)}>
                            قبول
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRechargeAction(selectedRecharge.id, 'rejected')}>رفض</Button>
                        </div>
                      </div>
                    )}
                    <Button className="mt-4" variant="ghost" onClick={() => setSelectedRecharge(null)}>إغلاق</Button>
                  </div>
                </div>
              )}
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