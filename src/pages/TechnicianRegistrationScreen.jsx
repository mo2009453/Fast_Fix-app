import React, { useState, useEffect } from 'react';
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

// ==================== بنك الأسئلة (أسئلة مفتوحة) ====================
const QUESTIONS_BANK = {
  gas_heater: [
    { question: 'ما هو الغاز المستخدم في سخان الغاز المنزلي، وما هي خصائصه؟' },
    { question: 'كيف تعمل قطعة البيزو في إشعال السخان؟ اشرح العملية.' },
    { question: 'إذا لم يشتعل السخان، ما هي خطوات الفحص الأولى التي تقوم بها؟' },
    { question: 'ما هي وظيفة صمام الأمان في السخان، وكيف تختبره؟' },
    { question: 'كم مرة يفضل صيانة السخان، وما هي إجراءات الصيانة الأساسية؟' },
  ],
  electric_heater: [
    { question: 'ما هو العنصر الأساسي في السخان الكهربائي، وكيف يعمل؟' },
    { question: 'اشرح كيفية عمل الثرموستات في فصل التيار عند الوصول للحرارة المطلوبة.' },
    { question: 'ما هي الأسباب المحتملة لخروج ماء بارد من السخان الكهربائي؟' },
    { question: 'أين يوضع قضيب المغنسيوم (الأنود)، وما هي وظيفته؟' },
    { question: 'ما هو الجهد القياسي للسخان الكهربائي المنزلي، وكيف تتأكد من وصوله للسخان؟' },
  ],
  washing_machine: [
    { question: 'ما هي أسباب عدم تصريف الغسالة للماء؟ اشرح طريقة التشخيص.' },
    { question: 'عند حدوث اهتزاز قوي أثناء العصر، ما هي الأسباب المحتملة؟' },
    { question: 'ما هي وظيفة حساس مستوى الماء، وكيف تتأكد من أنه يعمل بشكل صحيح؟' },
    { question: 'كم مرة يجب تنظيف فلتر الغسالة، وكيف يتم تنظيفه؟' },
    { question: 'ما هي أسباب تسرب الماء من أسفل الغسالة؟' },
  ],
  refrigerator: [
    { question: 'ما هو الغاز المستخدم في الثلاجات الحديثة، وما هي مميزاته؟' },
    { question: 'لماذا تكون جوانب الثلاجة ساخنة أحياناً؟ اشرح السبب.' },
    { question: 'ما هي أسباب تراكم الثلج في الفريزر؟' },
    { question: 'ما هي وظيفة الكومبريسور، وكيف تختبره؟' },
    { question: 'كم مرة يجب تنظيف ملفات المكثف الخلفية، وكيف يتم تنظيفها؟' },
  ],
  air_conditioner: [
    { question: 'ما هي أسباب ضعف تبريد التكييف؟ اشرح طريقة التشخيص.' },
    { question: 'ما هي وظيفة المكثف في التكييف، وأين يقع؟' },
    { question: 'كم مرة يجب تنظيف فلاتر التكييف، وكيف يتم ذلك؟' },
    { question: 'ما هي أسباب تسرب الماء من الوحدة الداخلية للتكييف؟' },
    { question: 'ما هو وضع التشغيل الذي يوفر الطاقة، وكيف يعمل؟' },
  ],
  oven: [
    { question: 'ما هي أسباب عدم تسخين الفرن؟ اشرح طريقة التشخيص.' },
    { question: 'كيف تختبر عنصر التسخين في الفرن؟' },
    { question: 'ما هي أسباب خروج رائحة غاز قبل الاشتعال؟' },
    { question: 'كم مرة يجب معايرة حرارة الفرن، وكيف يتم ذلك؟' },
    { question: 'ما هي وظيفة صمام الأمان في البوتاجاز؟' },
  ],
};

// ========== الخطوة الأولى: إنشاء الحساب ==========
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

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: { data: { full_name: formData.fullName, user_type: 'technician' } },
    });

    if (authError) {
      toast({ title: t('error'), description: authError.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (authData?.user) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        toast({ title: t('info'), description: 'تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني ثم متابعة التسجيل.' });
        setIsLoading(false);
        return;
      }

      toast({ title: t('success'), description: 'تم إنشاء الحساب بنجاح!' });
      setIsLoading(false);
      nextStep();
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="text-xl font-bold text-center">اختيار الأجهزة التي تعمل عليها</h2>
      <p className="text-sm text-muted-foreground text-center">يمكنك اختيار أكثر من جهاز</p>
      
      <MultiSelect
        options={deviceOptions}
        selected={formData.selectedDevices}
        onChange={(val) => setFormData({...formData, selectedDevices: val})}
        placeholder="اضغط لاختيار الأجهزة..."
      />

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={prevStep}><ChevronLeft size={16} /> {t('previous')}</Button>
        <Button onClick={nextStep} disabled={formData.selectedDevices.length === 0}>
          {t('next')} <ChevronRight size={16} />
        </Button>
      </div>
    </motion.div>
  );
};

// ========== الخطوة الثالثة: رفع الملفات ==========
const StepDocumentUpload = ({ formData, setFormData, prevStep, nextStep }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState(
    formData.documents && Object.keys(formData.documents).length > 0
      ? formData.documents
      : {
          nationalIdFront: null,
          nationalIdBack: null,
          criminalRecord: null,
          certificates: [],
        }
  );
  const [sessionChecked, setSessionChecked] = useState(false);

  // التحقق من الجلسة عند تحميل المكون
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: t('error'), description: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً.', variant: 'destructive' });
        navigate('/login/technician');
      } else {
        setSessionChecked(true);
      }
    };
    checkSession();
  }, []);

  const handleFileUpload = async (fileType, file) => {
    if (!file) return;
    setUploading(fileType);

    const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    if (sessionError || !user) {
      toast({ title: t('error'), description: 'يجب تسجيل الدخول أولاً', variant: 'destructive' });
      setUploading(null);
      return;
    }

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${user.email}/${fileType}/${fileName}`;

    const { error } = await supabase.storage
      .from('technician-documents')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) {
      toast({ title: t('error'), description: `فشل رفع ${fileType}: ${error.message}`, variant: 'destructive' });
      setUploading(null);
      return;
    }

    setUploadedFiles(prev => ({
      ...prev,
      [fileType]: fileType === 'certificates' ? [...prev.certificates, filePath] : filePath,
    }));

    setUploading(null);
    toast({ title: t('success'), description: `تم رفع ${fileType} بنجاح` });
  };

  const handleNextStep = () => {
    if (!uploadedFiles.nationalIdFront || !uploadedFiles.nationalIdBack || !uploadedFiles.criminalRecord) {
      toast({ title: t('error'), description: 'يجب رفع صورة البطاقة (وجهين) والفيش الجنائي', variant: 'destructive' });
      return;
    }
    setFormData({ ...formData, documents: uploadedFiles });
    nextStep();
  };

  // إذا لم يتم التحقق من الجلسة بعد، نعرض رسالة تحميل
  if (!sessionChecked) {
    return (
      <div className="flex justify-center items-center h-32">
        <p className="text-muted-foreground">جارٍ التحقق من الجلسة...</p>
      </div>
    );
  }

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
          for (const file of Array.from(e.target.files)) await handleFileUpload('certificates', file);
        }} disabled={uploading === 'certificates'} />
        {uploadedFiles.certificates.length > 0 && <span className="text-green-500 text-xs">✓ {uploadedFiles.certificates.length} ملفات</span>}
      </div>
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={prevStep}><ChevronLeft size={16} /> {t('previous')}</Button>
        <Button onClick={handleNextStep} disabled={uploading !== null}>
          {t('next')} <ChevronRight size={16} />
        </Button>
      </div>
    </motion.div>
  );
};

// ==================== الخطوة الرابعة: اختبار المهارات (أسئلة مفتوحة) ====================
const StepSkillAssessment = ({ formData, setFormData, prevStep, submitForm }) => {
  const { t } = useLanguage();
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const devices = formData.selectedDevices;
  const currentDevice = devices[currentDeviceIndex];
  const questions = QUESTIONS_BANK[currentDevice] || [];

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => {
      const deviceAnswers = [...(prev[currentDevice] || Array(questions.length).fill(''))];
      deviceAnswers[questionIndex] = value;
      return { ...prev, [currentDevice]: deviceAnswers };
    });
  };

  const isCurrentDeviceComplete = () => {
    const deviceAnswers = answers[currentDevice] || [];
    return deviceAnswers.length === questions.length && deviceAnswers.every(a => a && a.trim() !== '');
  };

  const handleNextDevice = () => {
    if (currentDeviceIndex < devices.length - 1) {
      setCurrentDeviceIndex(prev => prev + 1);
    }
  };

  const handleSubmitAssessment = () => {
    setFormData({ ...formData, skillAssessment: { answers, devices } });
    setShowResults(true);
  };

  if (devices.length === 0) {
    return <div className="text-center">لا توجد أجهزة مختارة.</div>;
  }

  if (showResults) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-center">
        <h2 className="text-xl font-bold">تم تسجيل إجاباتك</h2>
        <p className="text-muted-foreground">
          تم حفظ إجاباتك لمراجعتها من قبل فريقنا. سيتم مراجعة طلبك قريباً.
        </p>
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => setShowResults(false)}>
            <ChevronLeft size={16} /> العودة للأسئلة
          </Button>
          <Button onClick={submitForm} className="gap-2">
            {t('submit')} <CheckCircle size={16} />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="text-xl font-bold text-center">
        اختبار المهارات - <span className="text-primary">{currentDeviceIndex + 1}/{devices.length}</span>
      </h2>
      <p className="text-center text-muted-foreground">
        الجهاز الحالي: <strong>{currentDevice}</strong>
      </p>

      <div className="space-y-6">
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="p-4 bg-muted/30 rounded-lg">
            <Label className="font-medium mb-2 block">{qIdx + 1}. {q.question}</Label>
            <Input
              type="text"
              placeholder="اكتب إجابتك هنا..."
              value={(answers[currentDevice] && answers[currentDevice][qIdx]) || ''}
              onChange={(e) => handleAnswerChange(qIdx, e.target.value)}
              className="bg-background/70"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={prevStep}><ChevronLeft size={16} /> {t('previous')}</Button>
        <div className="space-x-2 rtl:space-x-reverse">
          {currentDeviceIndex < devices.length - 1 && (
            <Button onClick={handleNextDevice} disabled={!isCurrentDeviceComplete()}>
              الجهاز التالي <ChevronRight size={16} />
            </Button>
          )}
          {currentDeviceIndex === devices.length - 1 && (
            <Button onClick={handleSubmitAssessment} disabled={!isCurrentDeviceComplete()}>
              إنهاء الاختبار <CheckCircle size={16} />
            </Button>
          )}
        </div>
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
    skillAssessment: null,
  });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const submitForm = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: t('error'), description: 'يجب تسجيل الدخول', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('technicians')
      .update({
        email: formData.email,
        specialization: formData.selectedDevices[0] || '',
        skills: formData.selectedDevices.join(', '),
        documents: formData.documents,
        skill_assessment: formData.skillAssessment,
        is_available: false,
        status: 'pending_review',
      })
      .eq('id', user.id);

    if (error) {
      toast({ title: t('error'), description: 'فشل حفظ البيانات: ' + error.message, variant: 'destructive' });
      return;
    }

    toast({ title: t('success'), description: 'تم تقديم طلب التسجيل. حسابك قيد المراجعة.' });
    navigate('/login/technician');
  };

  const steps = [
    { title: 'إنشاء الحساب', component: StepBasicInfo },
    { title: 'الأجهزة', component: StepDeviceSelection },
    { title: 'الملفات', component: StepDocumentUpload },
    { title: 'اختبار المهارات', component: StepSkillAssessment },
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