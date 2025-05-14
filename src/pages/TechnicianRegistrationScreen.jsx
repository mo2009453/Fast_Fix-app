// TechnicianRegistrationScreen.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const devicesOptions = ['ثلاجة', 'تكييف', 'غسالة ملابس', 'سخان', 'بوتاجاز'];

const TechnicianRegistrationScreen = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    devices: [],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDeviceToggle = (device) => {
    setFormData((prev) => ({
      ...prev,
      devices: prev.devices.includes(device)
        ? prev.devices.filter((d) => d !== device)
        : [...prev.devices, device],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { full_name, email, password, phone, devices } = formData;

    if (!email || !password || !full_name || !phone || devices.length === 0) {
      alert('يرجى ملء جميع الحقول واختيار جهاز واحد على الأقل.');
      return;
    }

    try {
      const { error } = await supabase.from('technicians_pending').insert([
        {
          full_name,
          email,
          password,
          phone,
          devices,
          status: 'pending',
        },
      ]);

      if (error) throw error;

      navigate('/TechnicianPendingReviewScreen');
    } catch (err) {
      console.error('Registration Error:', err.message);
      alert('حدث خطأ أثناء التسجيل. حاول مرة أخرى.');
    }
  };

  return (
    <motion.div
      className="flex items-center justify-center min-h-screen p-4 bg-muted/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">
            {t('technicianRegister', 'تسجيل الفني')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="full_name" placeholder="الاسم الكامل" value={formData.full_name} onChange={handleChange} />
            <Input name="email" placeholder="البريد الإلكتروني" value={formData.email} onChange={handleChange} />
            <Input name="password" placeholder="كلمة المرور" value={formData.password} onChange={handleChange} type="password" />
            <Input name="phone" placeholder="رقم الهاتف" value={formData.phone} onChange={handleChange} />

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">اختر الأجهزة المتخصصة</p>
              <div className="flex flex-wrap gap-2">
                {devicesOptions.map((device) => (
                  <Button
                    key={device}
                    type="button"
                    variant={formData.devices.includes(device) ? 'default' : 'outline'}
                    onClick={() => handleDeviceToggle(device)}
                  >
                    {device}
                  </Button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">
              تسجيل
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TechnicianRegistrationScreen;