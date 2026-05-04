import { useState } from 'react';
import { Navigate, Outlet, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import {
  Flame, ReceiptText, BarChart3, UtensilsCrossed, Settings, Users,
  LogOut, Loader2, TrendingDown, Plus, List, PieChart, DollarSign, ChevronDown, ChevronRight, RefreshCw
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const DashboardLayout = () => {
  const { user, role, username, loading, logout } = useAuthStore();
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear specific caches
      localStorage.removeItem('pos-cache:menu');
      localStorage.removeItem('pos-cache:categories');
      localStorage.removeItem('pos-cache:settings');
      
      // Invalidate all queries
      await queryClient.invalidateQueries();
      toast.success("System data refreshed successfully");
    } catch (e) {
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${isActive
      ? 'bg-primary text-primary-foreground premium-shadow scale-[1.02]'
      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1'
    }`;

  const subNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 pl-10 pr-4 py-2 rounded-lg text-sm transition-all duration-200 ${isActive
      ? 'text-primary font-semibold'
      : 'text-sidebar-foreground/50 hover:text-sidebar-accent-foreground'
    }`;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-56 bg-sidebar text-sidebar-foreground flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 flex items-center gap-2 border-b border-sidebar-border shrink-0">
          <div className="bg-sidebar-primary rounded-lg p-1.5">
            <Flame className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className="font-bold font-display text-sm tracking-tight">AKF</span>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          <NavLink to="/dashboard/billing" className={navLinkClass}>
            <ReceiptText className="w-4 h-4" /> Billing
          </NavLink>

          <NavLink to="/dashboard/customers" className={navLinkClass}>
            <Users className="w-4 h-4" /> Customers (Khata)
          </NavLink>

          {/* Reports section */}
          <div>
            <button
              onClick={() => setReportsOpen(o => !o)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <BarChart3 className="w-4 h-4" />
              Reports
              <span className="ml-auto">{reportsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</span>
            </button>
            {reportsOpen && (
              <div className="mt-0.5 space-y-0.5">
                <NavLink to="/dashboard/reports" className={subNavLinkClass}><List className="w-3.5 h-3.5" /> Sales</NavLink>
                <NavLink to="/dashboard/reports/profit-loss" className={subNavLinkClass}><DollarSign className="w-3.5 h-3.5" /> Profit & Loss</NavLink>
              </div>
            )}
          </div>

          {/* Expenses section */}
          <div>
            <button
              onClick={() => setExpensesOpen(o => !o)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <TrendingDown className="w-4 h-4" />
              Expenses
              <span className="ml-auto">{expensesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</span>
            </button>
            {expensesOpen && (
              <div className="mt-0.5 space-y-0.5">
                {role === 'admin' && (
                  <NavLink to="/dashboard/expenses/add" className={subNavLinkClass}><Plus className="w-3.5 h-3.5" /> Add Expense</NavLink>
                )}
                <NavLink to="/dashboard/expenses" end className={subNavLinkClass}><List className="w-3.5 h-3.5" /> View Expenses</NavLink>
                <NavLink to="/dashboard/expenses/reports" className={subNavLinkClass}><PieChart className="w-3.5 h-3.5" /> Reports</NavLink>
              </div>
            )}
          </div>

          {/* Admin-only items */}
          {role === 'admin' && (
            <>
              <NavLink to="/dashboard/menu" className={navLinkClass}><UtensilsCrossed className="w-4 h-4" /> Menu</NavLink>
              <NavLink to="/dashboard/settings" className={navLinkClass}><Settings className="w-4 h-4" /> Settings</NavLink>
              <NavLink to="/dashboard/users" className={navLinkClass}><Users className="w-4 h-4" /> Users</NavLink>
            </>
          )}

          <div className="pt-4 mt-4 border-t border-sidebar-border/30">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-sidebar-foreground/40 hover:text-primary hover:bg-white/5 transition-all"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              {refreshing ? 'Refreshing...' : 'Refresh System'}
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-sidebar-border/50 shrink-0 bg-black/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-bold text-sidebar-foreground truncate">{username}</p>
              <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold">{role}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-sidebar-foreground/40 hover:text-primary hover:bg-white/5 rounded-full transition-all"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
