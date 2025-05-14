import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { MultiSelect } from '@/components/custom/MultiSelect.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { supabase } from '@/lib/supabaseClient.js';
import { UserPlus, LogIn, UploadCloud, Camera } from 'lucide-react';

const deviceOptions = [
  { value: 'washingMachine', labelKey: 'washingMachine' },
  { value: 'heater', labelKey: 'heater' },
  { value: 'oven', labelKey: 'oven' },
  { value: 'refrigerator', labelKey: 'refrigerator' },
  { value: 'airConditioner', labelKey: 'airConditioner' },
];

const TechnicianRegistrationScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    fullAddress: '',
    mobileNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    specializedDevices: [],
    nationalIdFront: null,
    nationalIdBack: null,
    criminalRecord: null,
    selfie: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    }
  };

  const handleDevicesChange = (selected) => {
    setFormData((prev) => ({
      ...prev,
      specializedDevices: selected.map((item) => item.value),
    }));
  };

  const validateStep1 = () => {
    const { fullName, fullAddress, mobileNumber, email, password, confirmPassword, specializedDevices } = formData;
    if (!fullName || !fullAddress || !mobileNumber || !email || !password || !confirmPassword) {
      toast({ title: t('error'), description: t('allFieldsRequired'), variant: 'destructive' });
      return false;
    }
    if (password !== confirmPassword) {
      toast({ title: t('error'), description: t('passwordsDontMatch'), variant: 'destructive' });
      return false;
    }
    if (specializedDevices.length === 0) {
      toast({ title: t('error'), description: t('devicesRequired'), variant: 'destructive' });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const { nationalIdFront, nationalIdBack, criminalRecord, selfie } = formData;
    if (!nationalIdFront || !nationalIdBack || !criminalRecord || !selfie) {
      toast({ title: t('error'), description: t('allDocumentsRequired'), variant: 'destructive' });
      return false;
    }
    return true;
  };

  const uploadFile = async (file, pathPrefix) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `${pathPrefix}/${fileName}`;
    const { error } = await supabase.storage.from('technician_documents').upload(filePath, file);
    if (error) throw error;
    return filePath;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);

    try {
      const nationalIdFrontPath = await uploadFile(formData.nationalIdFront, 'national_id_front');
      const nationalIdBackPath = await uploadFile(formData.nationalIdBack, 'national_id_back');
      const criminalRecordPath = await uploadFile(formData.criminalRecord, 'criminal_record');
      const selfiePath = await uploadFile(formData.selfie, 'selfie');

      const { error } = await supabase.from('technicians_pending').insert({
        full_name: formData.fullName,
        full_address: formData.fullAddress,
        mobile_number: formData.mobileNumber,
        email: formData.email,
        password: formData.password,
        specialized_devices: formData.specializedDevices,
        national_id_front: nationalIdFrontPath,
        national_id_back: nationalIdBackPath,
        criminal_record: criminalRecordPath,
        selfie: selfiePath,
      });

      if (error) throw error;

      toast({ title: t('success'), description: t('applicationSubmitted') });
      navigate('/technician/skill-assessment', { state: { devices: formData.specializedDevices } });
    } catch (err) {
      console.error(err);
      toast({ title: t('error'), description: t('submissionFailed', 'Submission failed. Please try again.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const renderFileName = (file) => {
    return file ? (
      <span className="text-sm text-green-600 truncate max-w-[150px] ltr:ml-2 rtl:mr-2">{file.name}</span>
    ) : (
      <span className="text-sm text-muted-foreground ltr:ml-2 rtl:mr-2">{t('noFileChosen')}</span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-secondary/20 to-background"
      key={language}
    >
      <Card className="w-full max-w-lg shadow-2xl glassmorphism-card">
        <CardHeader className="text-center">
          <UserPlus size={48} className="mx-auto mb-4 text-primary" />
          <CardTitle className="text-3xl font-bold text-primary">{t('register')} - {t('technician')}</CardTitle>
          <CardDescription>{t('technicianRegistrationSubtitle')} {t('step')} {step}/2</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <Input name="fullName" placeholder={t('fullName')} value={formData.fullName} onChange={handleChange} required />
                <Input name="fullAddress" placeholder={t('fullAddress')} value={formData.fullAddress} onChange={handleChange} required />
                <Input name="mobileNumber" placeholder={t('mobileNumber')} value={formData.mobileNumber} onChange={handleChange} required />
                <Input name="email" type="email" placeholder={t('email')} value={formData.email} onChange={handleChange} required />
                <Input name="password" type="password" placeholder={t('password')} value={formData.password} onChange={handleChange} required />
                <Input name="confirmPassword" type="password" placeholder={t('confirmPassword')} value={formData.confirmPassword} onChange={handleChange} required />
                <div>
                  <Label>{t('specializedDevices')}</Label>
                  <MultiSelect
                    options={deviceOptions.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))}
                    value={formData.specializedDevices}
                    onChange={handleDevicesChange}
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {['nationalIdFront', 'nationalIdBack', 'criminalRecord', 'selfie'].map((field, i) => (
                  <div key={i}>
                    <Label htmlFor={field}>{t(field)}</Label>
                    <Button type="button" variant="outline" asChild className="w-full justify-start bg-background/70">
                      <label htmlFor={field} className="cursor-pointer flex items-center">
                        {field === 'selfie' ? <Camera className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> : <UploadCloud className="ltr:mr-2 rtl:ml-2 h-4 w-4" />}
                        {t('upload')} {renderFileName(formData[field])}
                      </label>
                    </Button>
                    <Input id={field} name={field} type="file" onChange={handleFileChange} className="hidden" accept={field === 'selfie' ? 'image/*' : 'image/*,.pdf'} />
                  </div>
                ))}
              </motion.div>
            )}

            <div className="flex gap-4">
              {step === 2 && (
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full">
                  {t('previous')}
                </Button>
              )}
              {step === 1 ? (
                <Button type="button" onClick={() => validateStep1() && setStep(2)} className="w-full">
                  {t('next')}
                </Button>
              ) : (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('submitting') : t('submitAndSendForReview')}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" asChild>
            <Link to="/login/technician">
              <LogIn className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> {t('alreadyHaveAccount')}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default TechnicianRegistrationScreen;