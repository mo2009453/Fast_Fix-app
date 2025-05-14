import React, { useState } from 'react'; import { motion } from 'framer-motion'; import { Input } from '@/components/ui/input'; import { Button } from '@/components/ui/button'; import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'; import { createClient } from '@supabase/supabase-js'; import { useRouter } from 'next/navigation'; import bcrypt from 'bcryptjs'; import { CheckCircle, Circle } from 'lucide-react';

const supabase = createClient( process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY );

const devicesList = [ { value: 'fridge', label: 'ثلاجة', icon: '🥶' }, { value: 'ac', label: 'تكييف', icon: '❄️' }, { value: 'washing_machine', label: 'غسالة ملابس', icon: '🧺' }, { value: 'heater', label: 'سخان', icon: '♨️' }, { value: 'stove', label: 'بوتاجاز', icon: '🔥' }, ];

const TechnicianRegistrationScreen = () => { const router = useRouter();

const [fullName, setFullName] = useState(''); const [phone, setPhone] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [devices, setDevices] = useState([]); const [isSubmitting, setIsSubmitting] = useState(false);

const handleRegister = async (e) => { e.preventDefault(); setIsSubmitting(true);

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

const toggleDevice = (device) => { setDevices((prev) => prev.includes(device) ? prev.filter((d) => d !== device) : [...prev, device] ); };

return ( <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.5 }} className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background p-4" > <Card className="w-full max-w-xl shadow-lg border border-gray-200"> <CardHeader> <CardTitle className="text-2xl font-bold text-center text-primary"> تسجيل كفني جديد </CardTitle> </CardHeader> <CardContent className="space-y-6"> <form onSubmit={handleRegister} className="space-y-5"> <div> <label className="block mb-1 font-medium">الاسم الكامل</label> <Input type="text" placeholder="ادخل اسمك بالكامل" value={fullName} onChange={(e) => setFullName(e.target.value)} required /> </div>

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
          <div className="grid grid-cols-2 gap-4">
            {devicesList.map(({ value, label, icon }) => {
              const selected = devices.includes(value);
              return (
                <div
                  key={value}
                  onClick={() => toggleDevice(value)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                    selected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="text-xl">{icon}</span>
                    {label}
                  </span>
                  {selected ? (
                    <CheckCircle className="text-primary w-5 h-5" />
                  ) : (
                    <Circle className="text-muted-foreground w-5 h-5" />
                  )}
                </div>
              );
            })}
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

); };

export default TechnicianRegistrationScreen;

