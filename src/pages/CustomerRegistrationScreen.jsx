import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast.jsx';
import { supabase } from '@/lib/supabaseClient';
import { UserPlus, LogIn } from 'lucide-react';

const CustomerRegistrationScreen = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword) {
      toast({ title: t('error'), description: t('allFieldsRequired'), variant: 'destructive' });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: t('error'), description: t('passwordsDoNotMatch'), variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    // 1. إنشاء المستخدم عبر Supabase Auth (وليس جدول customers)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName, // سيستخدمه الـ Trigger تلقائياً
        },
      },
    });

    if (authError) {
      toast({ title: t('error'), description: authError.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (authData?.user) {
      // 2. تعبئة حقل email في جدول customers (لأن Trigger لا يضيفه)
      const { error: updateError } = await supabase
        .from('customers')
        .update({ email: email })
        .eq('id', authData.user.id);

      if (updateError) {
        console.error('تحديث البريد الإلكتروني فشل:', updateError);
        // لا نعرض خطأ للمستخدم، لأن حسابه أنشئ بنجاح
      }

      toast({ title: t('success'), description: t('registrationSuccessful') });
      navigate('/customer/home');
    } else {
      // يتطلب تأكيد البريد الإلكتروني
      toast({ title: t('info'), description: t('checkEmailToConfirm') });
    }

    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-secondary/20 to-background"
    >
      <div className="w-full max-w-md shadow-2xl glassmorphism-card rounded-xl p-6 bg-card">
        <div className="text-center mb-6">
          <UserPlus size={48} className="mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold text-primary">
            {t('register')} - {t('customer')}
          </h1>
          <p className="text-muted-foreground">
            {t('customerRegistrationSubtitle', 'Create your customer account to start booking services.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">{t('fullName')}</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="bg-background/70"
            />
          </div>
          <div>
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background/70"
            />
          </div>
          <div>
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-background/70"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-background/70"
            />
          </div>
          <Button
            type="submit"
            className="w-full text-lg py-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground"
            disabled={isLoading}
          >
            {isLoading ? t('loading', 'Loading...') : t('register')}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Button variant="link" asChild className="text-accent hover:underline">
            <Link to="/login/customer">
              <LogIn className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              {t('alreadyHaveAccount', 'Already have an account? Login')}
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default CustomerRegistrationScreen;