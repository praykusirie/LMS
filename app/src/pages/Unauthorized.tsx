import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-[24px] bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <ShieldAlert className="h-7 w-7 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to access this page.
        </p>
        <Button className="mt-6 bg-navy hover:bg-navy/90" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
