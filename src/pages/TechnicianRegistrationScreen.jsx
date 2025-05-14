import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TechnicianRegistrationScreen = () => {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [devices, setDevices] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase.from('technicians_pending').insert([
      {
        full_name: fullName,
        phone,
        email,
        password: hashedPassword,
        devices,
        status: 'pending',
      },
    ]);

    setIsSubmitting(false);

    if (error) {
      alert('حدث خطأ أثناء التسجيل: ' + error.message);
    } else {
      router.push('/TechnicianPendingReviewScreen');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background p-4"
    >
      <Card className="w-full max-w-xl shadow-lg border border-gray-200">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">
            تسجيل كفني جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block mb-1 font-medium">الاسم الكامل</label>
              <Input
                type="text"
                placeholder="ادخل اسمك بالكامل"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">رقم الهاتف</label>
              <Input
                type="tel"
                placeholder="مثال: 01012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">البريد الإلكتروني</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">كلمة المرور</label>
              <Input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">الأجهزة التي تتخصص فيها</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'fridge', label: 'ثلاجة' },
                  { value: 'ac', label: 'تكييف' },
                  { value: 'washing_machine', label: 'غسالة ملابس' },
                  { value: 'heater', label: 'سخان' },
                  { value: 'stove', label: 'بوتاجاز' },
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={value}
                      checked={devices.includes(value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDevices((prev) => [...prev, value]);
                        } else {
                          setDevices((prev) => prev.filter((item) => item !== value));
                        }
                      }}
                      className="accent-primary w-4 h-4"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                اختر الأجهزة التي يمكنك العمل عليها.
              </p>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full mt-4">
              {isSubmitting ? 'جاري التسجيل...' : 'تسجيل'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TechnicianRegistrationScreen;