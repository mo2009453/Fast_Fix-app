import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { LogIn, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const LoginScreen = () => {
  const navigate = useNavigate();
  const { userType } = useParams();
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      toast({ title: t('error'), description: t('emailPasswordRequired'), variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (data?.user) {
      // لو كان فني، نتأكد من حالته
      if (userType === 'technician') {
        const { data: techData, error: techError } = await supabase
          .from('technicians')
          .select('status')
          .eq('id', data.user.id)
          .single();

        if (techError || !techData || techData.status !== 'approved') {
          toast({
            title: t('error'),
            description: 'حسابك قيد المراجعة. لا يمكنك الدخول حالياً.',
            variant: 'destructive',
          });
          await supabase.auth.signOut(); // نسجل خروج عشان الجلسة
          setLoading(false);
          return;
        }
      }

      // تخزين البيانات في localStorage
      localStorage.setItem(
        'user',
        JSON.stringify({ id: data.user.id, email: data.user.email, userType, isLoggedIn: true })
      );
      localStorage.setItem('userType', userType);

      toast({ title: t('success'), description: t('loginSuccessful') });
      setLoading(false);

      if (userType === 'customer') navigate('/customer/home');
      else if (userType === 'technician') navigate('/technician/home');
    }
  };

  const pageTitle = userType === 'customer' ? t('customer') : t('technician');
  const registrationPath = userType === 'customer' ? '/register/customer' : '/register/technician';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-secondary/20 to-background"
      key={language}
    >
      <Card className="w-full max-w-md shadow-2xl glassmorphism-card">
        <CardHeader className="text-center">
          <LogIn size={48} className="mx-auto mb-4 text-primary" />
          <CardTitle className="text-3xl font-bold text-primary">{t('login')} - {pageTitle}</CardTitle>
          <CardDescription>{t('loginSubtitle', `Please enter your credentials to access your ${userType} account.`)}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-background/70" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-background/70" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('loading') : t('login')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-4">
          <Link to="#" className="text-sm text-primary hover:underline">{t('forgotPassword')}</Link>
          <Button variant="link" asChild className="text-accent hover:underline">
            <Link to={registrationPath}><UserPlus className="ltr:mr-2 rtl:ml-2 h-4 w-4" /> {t('createNewAccount')}</Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default LoginScreen;