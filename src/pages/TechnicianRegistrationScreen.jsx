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
      alert(t('allFieldsRequired', 'Please fill in all fields.'));
      return;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `technicians/${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('technician_files')
      .upload(filePath, file);

    if (uploadError) {
      alert(t('fileUploadError', 'File upload failed'));
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
      alert(t('registrationError', 'Registration failed'));
      return;
    }

    navigate('/TechnicianPendingReviewScreen');
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
          <CardTitle className="text-3xl font-bold text-primary">
            {t('technicianRegistration', 'Technician Registration')}
          </CardTitle>
          <CardDescription>
            {t('pleaseFillForm', 'Please fill out the form below to register as a technician.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label={t('fullName', 'Full Name')}
            placeholder={t('enterFullName', 'Enter your full name')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label={t('email', 'Email')}
            type="email"
            placeholder="example@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label={t('phone', 'Phone')}
            type="tel"
            placeholder="01xxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Select
            label={t('devices', 'Devices')}
            multiple
            value={devices}
            onChange={(e) =>
              setDevices([...e.target.selectedOptions].map((option) => option.value))
            }
          >
            <option value="fridge">{t('fridge', 'Fridge')}</option>
            <option value="ac">{t('ac', 'Air Conditioner')}</option>
            <option value="washing_machine">{t('washingMachine', 'Washing Machine')}</option>
            <option value="heater">{t('heater', 'Heater')}</option>
            <option value="stove">{t('stove', 'Stove')}</option>
          </Select>
          <Input
            label={t('uploadFile', 'Upload File')}
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <Button onClick={handleSubmit}>
            {t('submit', 'Submit')}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TechnicianRegistrationScreen;