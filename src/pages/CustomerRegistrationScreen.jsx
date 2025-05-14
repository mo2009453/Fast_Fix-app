
    import React, { useState } from 'react';
    import { useNavigate, Link } from 'react-router-dom';
    import { motion } from 'framer-motion';
    import { Button } from '@/components/ui/button.jsx';
    import { Input } from '@/components/ui/input.jsx';
    import { Label } from '@/components/ui/label.jsx';
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card.jsx';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
    import { useToast } from '@/components/ui/use-toast.jsx';
    import { useLanguage } from '@/contexts/LanguageContext.jsx';
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
      const [loading, setLoading] = useState(false);

      const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
      };

      const handleFileChange = (e) => {
        const { name, files } = e.target;
        if (files && files[0]) {
          setFormData(prev => ({ ...prev, [name]: files[0] }));
        }
      };
      
      const handleDeviceChange = (value) => {
        setFormData(prev => ({ ...prev, specializedDevices: value }));
      };

      const validateStep1 = () => {
        const { fullName, fullAddress, mobileNumber, email, password, confirmPassword } = formData;
        if (!fullName || !fullAddress || !mobileNumber || !email || !password || !confirmPassword) {
          toast({ title: t('error'), description: t('allFieldsRequired', 'All fields are required.'), variant: 'destructive' });
          return false;
        }
        if (password !== confirmPassword) {
          toast({ title: t('error'), description: t('passwordsDontMatch'), variant: 'destructive' });
          return false;
        }
        if (formData.specializedDevices.length === 0) {
          toast({ title: t('error'), description: t('devicesRequired'), variant: 'destructive' });
          return false;
        }
        return true;
      };
      
      const validateStep2 = () => {
        const { nationalIdFront, nationalIdBack, criminalRecord, selfie } = formData;
        if (!nationalIdFront || !nationalIdBack || !criminalRecord || !selfie) {
          toast({ title: t('error'), description: t('allDocumentsRequired', 'All documents and selfie are required.'), variant: 'destructive' });
          return false;
        }
        return true;
      };

      const handleNext = () => {
        if (step === 1 && validateStep1()) {
          setStep(2);
        }
      };
      
      const handleSubmit = async (e) => {
        e.preventDefault();
        if (step === 2 && validateStep2()) {
          setLoading(true);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Store registration info in localStorage (temporary)
          const users = JSON.parse(localStorage.getItem('users_technician_pending')) || [];
          users.push(formData); // Storing full form data for review
          localStorage.setItem('users_technician_pending', JSON.stringify(users));

          toast({ title: t('success'), description: t('applicationSubmitted', 'Application submitted successfully! You will be redirected for skill assessment.') });
          setLoading(false);
          navigate('/technician/skill-assessment', { state: { devices: formData.specializedDevices } });
        }
      };
      
      const renderFileName = (file) => {
        return file ? <span className="text-sm text-green-600 truncate max-w-[150px] ltr:ml-2 rtl:mr-2">{file.name}</span> : <span className="text-sm text-muted-foreground ltr:ml-2 rtl:mr-2">{t('noFileChosen', 'No file chosen')}</span>;
      }

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
              <CardDescription>{t('technicianRegistrationSubtitle', 'Join our network of skilled technicians.')} {t('step', 'Step')} {step}/2</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {step === 1 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <Input name="fullName" placeholder={t('fullName')} value={formData.fullName} onChange={handleChange} required className="bg-background/70" />
                    <Input name="fullAddress" placeholder={t('fullAddress')} value={formData.fullAddress} onChange={handleChange} required className="bg-background/70" />
                    <Input name="mobileNumber" type="tel" placeholder={t('mobileNumber')} value={formData.mobileNumber} onChange={handleChange} required className="bg-background/70" />
                    <Input name="email" type="email" placeholder={t('email')} value={formData.email} onChange={handleChange} required className="bg-background/70" />
                    <Input name="password" type="password" placeholder={t('password')} value={formData.password} onChange={handleChange} required className="bg-background/70" />
                    <Input name="confirmPassword" type="password" placeholder={t('confirmPassword')} value={formData.confirmPassword} onChange={handleChange} required className="bg-background/70" />
                    <div>
                      <Label>{t('specializedDevices')}</Label>
                       <Select onValueChange={handleDeviceChange} value={formData.specializedDevices.join(',')}>
                        <SelectTrigger className="w-full bg-background/70">
                          <SelectValue placeholder={t('selectDevices')} />
                        </SelectTrigger>
                        <SelectContent>
                          {deviceOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {t(option.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* This is a simplified multi-select. For true multi-select, a different component or approach would be needed. */}
                      {/* For now, we'll treat it as single select for simplicity, or user can select one by one. */}
                      {/* A proper multi-select with shadcn/ui would involve custom implementation or a library extension. */}
                       <p className="text-xs text-muted-foreground mt-1">{t('multiSelectHint', 'For multiple devices, select one. More can be added later or use a comma-separated list if input allows.')}</p>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div>
                      <Label htmlFor="nationalIdFront">{t('uploadNationalId')}</Label>
                      <div className="flex items-center">
                        <Button type="button" variant="outline" asChild className="w-full justify-start bg-background/70">
                          <label htmlFor="nationalIdFront" className="cursor-pointer flex items-center">
                            <UploadCloud className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> {t('uploadFront', 'Upload Front')} {renderFileName(formData.nationalIdFront)}
                          </label>
                        </Button>
                        <Input id="nationalIdFront" name="nationalIdFront" type="file" onChange={handleFileChange} className="hidden" accept="image/*,.pdf" />
                      </div>
                      <div className="flex items-center mt-2">
                         <Button type="button" variant="outline" asChild className="w-full justify-start bg-background/70">
                          <label htmlFor="nationalIdBack" className="cursor-pointer flex items-center">
                            <UploadCloud className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> {t('uploadBack', 'Upload Back')} {renderFileName(formData.nationalIdBack)}
                          </label>
                        </Button>
                        <Input id="nationalIdBack" name="nationalIdBack" type="file" onChange={handleFileChange} className="hidden" accept="image/*,.pdf" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="criminalRecord">{t('uploadCriminalRecord')}</Label>
                      <Button type="button" variant="outline" asChild className="w-full justify-start bg-background/70">
                        <label htmlFor="criminalRecord" className="cursor-pointer flex items-center">
                          <UploadCloud className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> {t('uploadDocument', 'Upload Document')} {renderFileName(formData.criminalRecord)}
                        </label>
                      </Button>
                      <Input id="criminalRecord" name="criminalRecord" type="file" onChange={handleFileChange} className="hidden" accept="image/*,.pdf" />
                    </div>
                    <div>
                      <Label htmlFor="selfie">{t('liveSelfie')}</Label>
                      <Button type="button" variant="outline" asChild className="w-full justify-start bg-background/70">
                        <label htmlFor="selfie" className="cursor-pointer flex items-center">
                          <Camera className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> {t('captureSelfie', 'Capture Selfie')} {renderFileName(formData.selfie)}
                        </label>
                      </Button>
                      <Input id="selfie" name="selfie" type="file" capture="user" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-4">
                  {step === 2 && (
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full">
                      {t('previous', 'Previous')}
                    </Button>
                  )}
                  {step === 1 ? (
                    <Button type="button" onClick={handleNext} className="w-full text-lg py-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground">
                      {t('next')}
                    </Button>
                  ) : (
                    <Button type="submit" className="w-full text-lg py-3 bg-gradient-to-r from-accent to-orange-600 hover:from-accent/90 hover:to-orange-600/90 text-primary-foreground" disabled={loading}>
                      {loading ? t('submitting', 'Submitting...') : t('submitAndSendForReview')}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button variant="link" asChild className="text-accent hover:underline">
                <Link to="/login/technician">
                  <LogIn className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> {t('alreadyHaveAccount', 'Already have an account? Login')}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      );
    };

    export default TechnicianRegistrationScreen;
  
