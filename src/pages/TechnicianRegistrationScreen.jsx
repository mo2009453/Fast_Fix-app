import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Select } from '@/components/ui/select.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';

const TechnicianRegistrationScreen = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [devices, setDevices] = useState([]);
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName || !email || !phone || devices.length === 0 || !file) {
      alert('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `technicians/${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('technician_files')
      .upload(filePath, file);

    if (uploadError) {
      alert('فشل في رفع الملف.');
      return;
    }

    const { error: insertError } = await supabase
      .from('technicians_pending')
      .insert({
        full_name: fullName,
        email,
        phone,
        devices,
        file_url: uploadData.path,
        status: 'pending',
      });

    if (insertError) {
      alert('حدث خطأ أثناء التسجيل.');
      return;
    }

    navigate('/TechnicianPendingReviewScreen');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex items-center justify-center min-h-screen p-6 bg-gradient-to-br from-background via-secondary/20 to-background"
      key={language}
    >
      <Card className="w-full max-w-xl text-start shadow-2xl glassmorphism-card p-4">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary mb-2">
            تسجيل فني جديد
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            يرجى تعبئة البيانات التالية بدقة لتسجيلك كمقدم خدمة.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 mt-4">
          <div>
            <label className="block mb-1 font-medium">الاسم الكامل</label>
            <Input
              placeholder="أدخل اسمك الكامل"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">البريد الإلكتروني</label>
            <Input
              type="email"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">رقم الهاتف</label>
            <Input
              type="tel"
              placeholder="01xxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">الأجهزة التي تتخصص فيها</label>
            <select
              multiple
              value={devices}
              onChange={(e) =>
                setDevices([...e.target.selectedOptions].map((opt) => opt.value))
              }
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="fridge">ثلاجة</option>
              <option value="ac">تكييف</option>
              <option value="washing_machine">غسالة ملابس</option>
              <option value="heater">سخان</option>
              <option value="stove">بوتاجاز</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">اضغط مع الاستمرار لتحديد أكثر من جهاز.</p>
          </div>

          <div>
            <label className="block mb-1 font-medium">رفع ملف التعريف (CV أو صورة شهادة)</label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>

          <Button className="w-full mt-4" onClick={handleSubmit}>
            تسجيل
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TechnicianRegistrationScreen;