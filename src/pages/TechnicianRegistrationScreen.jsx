import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Wrench, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import MultiSelect from '@/components/MultiSelect.jsx';

// ========== الخطوة الأولى: البيانات الأساسية + إنشاء الحساب مباشرة ==========
const StepBasicInfo = ({ formData, setFormData, nextStep }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (!formData.fullName || !formData.email || !formData.password) {
      toast({ title: t('error'), description: t('allFieldsRequired'), variant: 'destructive' });
      return;
    }
    if (formData.password !== confirmPassword) {
      toast({ title: t('error'), description: t('passwordsDoNotMatch'), variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    // 1. إنشاء المستخدم عبر Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          user_type: 'technician',
        },
      },
    });

    if (authError) {
      toast({ title: t('error'), description: authError.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (authData?.user) {
      // 2. تسجيل الدخول التلقائي (إذا كان البريد غير مفعل، قد لا يكون هناك session)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        // ربما يحتاج تأكيد البريد - نخزن البيانات مؤقتاً وننتقل
        toast({ title: t('info'), description: 'تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني ثم متابعة التسجيل.' });
        // لا ننتقل للخطوة التالية إذا لم يتم تسجيل الدخول
        setIsLoading(false);
        return;
      }

      // 3. نجاح التسجيل وتسجيل الدخول -> انتقل للخطوة التالية
      toast({ title: t('success'), description: 'تم إنشاء الحساب بنجاح!' });
      setIsLoading(false);
      nextStep(); // الانتقال إلى اختيار الأجهزة
    } else {
      toast({ title: t('info'), description: t('checkEmailToConfirm') });
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div>
        <Label htmlFor="fullName">{t('fullName')}</Label>
        <Input id="fullName" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required />
      </div>
      <div>
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
      </div>
      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
      </div>
      <div>
        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
        <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={isLoading} className="gap-2">
          {isLoading ? t('loading') : t('next')} <ChevronRight size={16} />
        </Button>
      </div>
    </motion.div>
  );
};

// ========== الخطوة الثانية: اختيار الأجهزة ==========
const StepDeviceSelection = ({ formData, setFormData, nextStep, prevStep }) => {
  const { t } = useLanguage();

  const deviceOptions = [
    { value: 'gas_heater', label: 'سخان غاز' },
    { value: 'electric_heater', label: 'سخان كهربائي' },
    { value: 'washing_machine', label: 'غسالة' },
    { value: 'refrigerator', label: 'ثلاجة' },
    { value: 'air_conditioner', label: 'تكييف' },
    { value: 'oven', label: 'بوتاجاز / فرن' },
  ];

  const handleDevicesChange = (selectedValues) => {
    setFormData({ ...formData, selectedDevices: selectedValues });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="text-xl font-bold text-center">اختيار الأجهزة التي تعمل عليها</h2>
      <p className="text-sm text-muted-foreground text-center">يمكنك اختيار أكثر من جهاز</p>
      
      <MultiSelect
        options={deviceOptions}
        selected={formData.selectedDevices}
        onChange={handleDevicesChange}
        placeholder="اضغط لاختيار الأجهزة..."
      />

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={prevStep}>
          <ChevronLeft size={16} /> {t('previous')}
        </Button>
        <Button onClick={nextStep} disabled={formData.selectedDevices.length === 0}>
          {t('next')} <ChevronRight size={16} />
        </Button>
      </div>
    </motion.div>
  );
};

// ========== الخطوة الثالثة: رفع الملفات (بعد تسجيل الدخول) ==========
const StepDocumentUpload = ({ formData, setFormData, prevStep, submitForm }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState({
    nationalIdFront: null,
    nationalIdBack: null,
    criminalRecord: null,
    certificates: [],
  });

  const handleFileUpload = async (fileType, file) => {
    if (!file) return;

    setUploading(fileType);
    
    // الحصول على المستخدم الحالي (سيكون موجوداً بعد تسجيل الدخول)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: t('error'), description: 'يجب تسجيل الدخول أولاً', variant: 'destructive' });
      setUploading(null);
      return;
    }

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${user.email}/${fileType}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('technician-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      toast({ title: t('error'), description: `فشل رفع ${fileType}: ${error.message}`, variant: 'destructive' });
      setUploading(null);
      return;
    }

    setUploadedFiles(prev => ({
      ...prev,
      [fileType]: fileType === 'certificates' ? [...prev.certificates, data.path] : data.path,
    }));

    setUploading(null);
    toast({ title: t('success'), description: `تم رفع ${fileType} بنجاح` });
  };

  const handleFinalSubmit = () => {
    if (!uploadedFiles.nationalIdFront || !uploadedFiles.nationalIdBack || !uploadedFiles.criminalRecord) {
      toast({ title: t('error'), description: 'يجب رفع صورة البطاقة (وجهين) والفيش الجنائي', variant: 'destructive' });
      return;
    }

    setFormData({ ...formData, documents: uploadedFiles });
    submitForm();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-xl font-bold text-center">رفع المستندات المطلوبة</h2>
      <p className="text-sm text-muted-foreground text-center">يجب رفع المستندات التالية للمراجعة</p>

      <div>
        <Label>صورة البطاقة (وجه أمامي) *</Label>
        <Input type="file" accept="image/*" onChange={(e) => handleFileUpload('nationalIdFront', e.target.files[0])} disabled={uploading === 'nationalIdFront'} />
        {uploadedFiles.nationalIdFront && <span className="text-green-500 text-xs">✓ تم الرفع</span>}
      </div>
      <div>
        <Label>صورة البطاقة (وجه خلفي) *</Label>
        <Input type="file" accept="image/*" onChange={(e) => handleFileUpload('nationalIdBack', e.target.files[0])} disabled={uploading === 'nationalIdBack'} />
        {uploadedFiles.nationalIdBack && <span className="text-green-500 text-xs">✓ تم الرفع</span>}
      </div>
      <div>
        <Label>الفيش الجنائي *</Label>
        <Input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload('criminalRecord', e.target.files[0])} disabled={uploading === 'criminalRecord'} />
        {uploadedFiles.criminalRecord && <span className="text-green-500 text-xs">✓ تم الرفع</span>}
      </div>
      <div>
        <Label>شهادات الخبرة (اختياري)</Label>
        <Input type="file" accept="image/*,.pdf" multiple onChange={async (e) => {
          const files = Array.from(e.target.files);
          for (const file of files) {
            await handleFileUpload('certificates', file);
          }
        }} disabled={uploading === 'certificates'} />
        {uploadedFiles.certificates.length > 0 && (
          <span className="text-green-500 text-xs">✓ تم رفع {uploadedFiles.certificates.length} ملفات</span>
        )}
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={prevStep}><ChevronLeft size={16} /> {t('previous')}</Button>
        <Button onClick={handleFinalSubmit} disabled={uploading !== null}>
          {t('submit')} <CheckCircle size={16} />
        </Button>
      </div>
    </motion.div>
  );
};

// ========== المكون الرئيسي ==========
const TechnicianRegistrationScreen = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    selectedDevices: [],
    documents: {},
  });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const submitForm = async () => {
    // هنا سيتم حفظ باقي البيانات (الأجهزة والملفات) في جدول technicians
    // وحفظ حالة الحساب "قيد المراجعة"
    toast({ title: t('success'), description: 'عملية التسجيل قيد الإنشاء.' });
  };

  const steps = [
    { title: 'إنشاء الحساب', component: StepBasicInfo },
    { title: 'الأجهزة', component: StepDeviceSelection },
    { title: 'الملفات', component: StepDocumentUpload },
  ];

  const CurrentStepComponent = steps[step].component;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="w-full max-w-md bg-card rounded-xl shadow-2xl p-6">
        <div className="text-center mb-6">
          <Wrench size={48} className="mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold">{t('register')} - {t('technician')}</h1>
          <div className="flex justify-center mt-4 space-x-2 rtl:space-x-reverse">
            {steps.map((s, index) => (
              <div key={index} className={`h-2 w-16 rounded-full ${index <= step ? 'bg-primary' : 'bg-gray-300'}`} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">{steps[step].title}</p>
        </div>

        <CurrentStepComponent 
          formData={formData} 
          setFormData={setFormData} 
          nextStep={nextStep} 
          prevStep={prevStep} 
          submitForm={submitForm} 
        />
      </div>
    </div>
  );
};

export default TechnicianRegistrationScreen;