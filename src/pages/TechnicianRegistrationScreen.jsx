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

// الخطوة الأولى: البيانات الأساسية
const StepBasicInfo = ({ formData, setFormData, nextStep }) => {
  const { t } = useLanguage();
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleNext = () => {
    if (!formData.fullName || !formData.email || !formData.password) {
      alert(t('allFieldsRequired'));
      return;
    }
    if (formData.password !== confirmPassword) {
      alert(t('passwordsDoNotMatch'));
      return;
    }
    nextStep();
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
        <Button onClick={handleNext} className="gap-2">{t('next')} <ChevronRight size={16} /></Button>
      </div>
    </motion.div>
  );
};

// الخطوة الثانية: اختيار الأجهزة (حقيقية)
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

// الخطوة الثالثة: رفع الملفات (مؤقتة)
const StepDocumentUpload = ({ formData, setFormData, prevStep, submitForm }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
    <h2 className="text-xl font-bold mb-4">رفع الملفات</h2>
    <p>هنا سيتم رفع البطاقة والفيش الجنائي (سيتم بناؤها لاحقاً).</p>
    <div className="flex justify-between mt-6">
      <Button variant="outline" onClick={prevStep}><ChevronLeft size={16} /> {('previous')}</Button>
      <Button onClick={submitForm}>{('submit')} <CheckCircle size={16} /></Button>
    </div>
  </motion.div>
);

// المكون الرئيسي
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
    documents: {}
  });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const submitForm = async () => {
    // سيتم بناء هذه الدالة بالكامل في المراحل القادمة
    toast({ title: t('success'), description: 'عملية التسجيل قيد الإنشاء.' });
  };

  const steps = [
    { title: 'البيانات الأساسية', component: StepBasicInfo },
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
          {/* مؤشر الخطوات */}
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