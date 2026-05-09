import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { signIn, authClient } from '@/lib/auth-client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const { error } = await signIn.email({
        email,
        password,
        rememberMe,
      });
      
      if (error) {
        setError(error.message || 'Invalid email or password');
        console.log(error);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResetError('');
    
    try {
      const { error } = await authClient.requestPasswordReset({
        email: forgotEmail,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        setResetError(error.message || t('auth.resetError'));
      } else {
        setResetSent(true);
      }
    } catch {
      setResetError(t('auth.resetError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="rounded-lg bg-card p-8 shadow-card">
            <button
              onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetError(''); }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('auth.backToLogin')}
            </button>

            <div className="text-center mb-8">
              <div className="flex h-48 w-auto items-center justify-center mx-auto mb-6">
                <img src="/login_logo.png" alt="ShulePro Logo" className="h-full object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">{t('auth.resetPassword')}</h1>
              <p className="text-sm text-muted-foreground mt-2">
                {t('auth.resetPasswordDescription')}
              </p>
            </div>

            {resetSent ? (
              <div className="text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40 mx-auto">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-foreground font-medium">{t('auth.resetLinkSent')}</p>
                <p className="text-xs text-muted-foreground">{t('auth.checkEmail')}</p>
              </div>
            ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {resetError && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {resetError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="forgot-email">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder={t('auth.enterEmail')}
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="h-12 pl-10 rounded-xl"
                      required
                    />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? t('auth.sending') : t('auth.sendResetLink')}
              </Button>
            </form>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="rounded-lg bg-card p-8 shadow-card">
          <div className="text-center mb-8">
            <div className="flex h-32 w-auto items-center justify-center mx-auto mb-6">
              <img src="/login_logo.png" alt="SHULEPRO Logo" className="h-full object-contain" />
            </div>
            <h1 className="text-2xl font-lazydog text-foreground">SHULEPRO</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {t('auth.subtitle')}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.enterEmail')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-10 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.enterPassword')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-10 pr-10 rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  {t('auth.rememberMe')}
                </Label>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:underline"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
