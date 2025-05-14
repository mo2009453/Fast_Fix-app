import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Select } from '@/components/ui/select.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useNavigate } from 'react-router-dom'; // استبدال useRouter بـ useNavigate

const TechnicianRegistrationScreen = () => {
  const { t, language } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [devices, setDevices] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  const navigate = useNavigate(); // استخدام useNavigate بدلاً من useRouter

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!fullName || !email || !phone || devices.length === 0 || !selectedFile) {
      alert(t('allFieldsRequired', 'Please fill in all fields.'));
      return;
    }

    // رفع الملف إلى Supabase Storage هنا
    const { data, error: fileError } = await supabase.storage
      .from('technician_files')
      .upload(`files/${selectedFile.name}`, selectedFile);

    if (fileError) {
      alert(t('fileUploadError', 'Error uploading file.'));
      return;
    }

    // إضافة البيانات إلى Supabase
    const { data: technicianData, error: technicianError } = await supabase
      .from('technicians_pending')
      .insert([
        {
          full_name: fullName,
          email: email,
          phone: phone,
          devices: devices,
          file_url: data?.Path,
          status: 'pending',
        },
      ]);

    if (technicianError) {
      alert(t('registrationError', 'Error registering technician.'));
      return;
    }

    // التنقل إلى الشاشة التالية بعد التسجيل الناجح
    navigate('/TechnicianPendingReviewScreen'); // استخدام navigate بدلاً من router.push
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-secondary/20 to-background"
      key={language}
    >
      <Card className="w-full max-w-lg text-center shadow-2xl glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">{t('technicianRegistration', 'Technician Registration')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label={t('fullName', 'Full Name')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label={t('email', 'Email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label={t('phone', 'Phone')}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Select
            label={t('selectDevices', 'Select Devices')}
            value={devices}
            onChange={(e) => setDevices([...e.target.selectedOptions].map(option => option.value))}
            multiple
          >
            <option value="fridge">{t('fridge', 'Fridge')}</option>
            <option value="ac">{t('ac', 'Air Conditioner')}</option>
            <option value="washing_machine">{t('washingMachine', 'Washing Machine')}</option>
            <option value="heater">{t('heater', 'Heater')}</option>
            <option value="stove">{t('stove', 'Stove')}</option>
          </Select>
          <div>
            <input
              type="file"
              onChange={handleFileChange}
              className="file-input"
            />
          </div>
          <Button onClick={handleSubmit}>{t('submit', 'Submit')}</Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TechnicianRegistrationScreen;