import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Unauthorized() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-lg bg-card p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
          <ShieldAlert className="h-7 w-7 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t('auth.accessDenied')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('auth.unauthorizedDesc')}
        </p>
        <Button className="mt-6 bg-primary hover:bg-primary/90" onClick={() => navigate('/dashboard')}>
          {t('auth.backToDashboard')}
        </Button>
      </div>
    </div>
  );
}


