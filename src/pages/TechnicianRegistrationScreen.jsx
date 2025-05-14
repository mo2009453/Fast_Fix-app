import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { UserPlus, LogIn } from 'lucide-react';
import { supabase } from '@/src/lib/supabaseClient';

const CustomerRegistrationScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!fullName || !email || !password || !confirmPassword) {
      toast({
        title: t('error'),
        description: t('allFieldsRequired', 'All fields are required.'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: t('error'),
        description: t('passwordsDontMatch'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from('customers').insert([
      { full_name: fullName, email, password, balance: 0 },
    ]);

    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    toast({ title: t('success'), description: t('registrationSuccessful') });
    setLoading(false);
    navigate('/login/customer');
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
      <Card className="w-full max-w-md shadow-2xl glassmorphism-card">
        <CardHeader className="text-center">
          <UserPlus size={48} className="mx-auto mb-4 text-primary" />
          <CardTitle className="text-3xl font-bold text-primary">
            {t('register')} - {t('customer')}
          </CardTitle>
          <CardDescription>
            {t(
              'customerRegistrationSubtitle',
              'Create your customer account to start booking services.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="fullName">{t('fullName')}</Label>
              <Input
                id="fullName"
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
              disabled={loading}
            >
              {loading ? t('loading', 'Loading...') : t('register')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" asChild className="text-accent hover:underline">
            <Link to="/login/customer">
              <LogIn className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              {t('alreadyHaveAccount', 'Already have an account? Login')}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default CustomerRegistrationScreen;
