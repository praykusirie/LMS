import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Banknote, 
  Receipt, 
  AlertTriangle, 
  TrendingUp,
  Loader2
} from 'lucide-react';
import { StatsCard } from '@/components/ui-custom';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

interface FinanceStats {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  total_invoices: number;
  monthly_revenue: {
    month: string;
    total_invoiced: number;
    total_paid: number;
  }[];
  recent_payments: {
    id: string;
    invoice_number: string;
    student_name: string;
    amount: number;
    payment_date: string;
    payment_method: string;
  }[];
  outstanding_invoices: {
    id: string;
    invoice_number: string;
    student_name: string;
    total_amount: number;
    total_paid: number;
    balance: number;
    created_at: string;
  }[];
}

export function AccountantDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/dashboard/finance-stats');
        setStats(res.data);
      } catch (error) {
        console.error('Error fetching finance dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const fmt = (n: number) => `TZS ${Number(n).toLocaleString()}`;

  const statCards = stats ? [
    { title: t('dashboard.totalInvoiced', 'Total Invoiced'), value: fmt(stats.total_invoiced), icon: Receipt, color: 'navy' as const },
    { title: t('dashboard.totalPaid', 'Total Paid'), value: fmt(stats.total_paid), icon: Banknote, color: 'green' as const },
    { title: t('dashboard.outstanding', 'Outstanding'), value: fmt(stats.total_outstanding), icon: AlertTriangle, color: 'amber' as const },
    { title: t('dashboard.invoiceCount', 'Invoices'), value: String(stats.total_invoices), icon: TrendingUp, color: 'navy' as const },
  ] : [];

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.financeDashboard', 'Finance Dashboard')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('dashboard.financeSubtitle', 'Invoice and payment overview')}</p>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {statCards.map((stat, index) => (
              <StatsCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} delay={0.1 + index * 0.08} />
            ))}
          </div>

          {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Monthly Revenue Chart */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="lg:col-span-2 rounded-[20px] bg-card p-5 shadow-card"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">{t('dashboard.monthlyRevenue', 'Monthly Revenue')}</h3>
                <p className="text-sm text-muted-foreground">{t('dashboard.invoicedVsPaid', 'Invoiced vs Paid')}</p>
              </div>
              <div className="h-[300px]">
                {stats.monthly_revenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.monthly_revenue}>
                      <defs>
                        <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16A34A" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="total_invoiced" stroke="#1E3A8A" fill="url(#colorInvoiced)" strokeWidth={2} name="Invoiced" />
                      <Area type="monotone" dataKey="total_paid" stroke="#16A34A" fill="url(#colorPaid)" strokeWidth={2} name="Paid" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No revenue data available yet</div>
                )}
              </div>
            </motion.div>

            {/* Recent Payments */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="rounded-[20px] bg-card p-5 shadow-card"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.recentPayments', 'Recent Payments')}</h3>
              <div className="space-y-3">
                {stats.recent_payments.length > 0 ? stats.recent_payments.slice(0, 6).map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.student_name}</p>
                      <p className="text-xs text-muted-foreground">{p.invoice_number} Â· {new Date(p.payment_date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">+TZS {Number(p.amount).toLocaleString()}</span>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No recent payments</p>
                )}
              </div>
            </motion.div>
          </div>
          )}

          {/* Outstanding Invoices */}
          {stats && stats.outstanding_invoices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="rounded-[20px] bg-card p-5 shadow-card"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('dashboard.outstandingInvoices', 'Outstanding Invoices')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Invoice</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Student</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Total</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Paid</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.outstanding_invoices.slice(0, 10).map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-2.5 px-3 font-medium">{inv.invoice_number}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{inv.student_name}</td>
                      <td className="py-2.5 px-3 text-right">TZS {Number(inv.total_amount).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-green-600">TZS {Number(inv.total_paid).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-amber-600">TZS {Number(inv.balance).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
          )}
        </>
      )}
    </div>
  );
}
