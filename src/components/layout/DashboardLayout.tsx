import { useState } from 'react';
import { Navigate, Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  Flame, ReceiptText, BarChart3, UtensilsCrossed, Settings, Users,
  LogOut, Loader2, TrendingDown, Plus, List, PieChart, DollarSign, ChevronDown, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const DashboardLayout = () => {
  const { user, role, username, loading, logout } = useAuthStore();
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    }`;

  const subNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 pl-9 pr-3 py-2 rounded-lg text-sm transition-colors ${isActive
      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
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
        </nav>

        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <p className="font-medium text-sidebar-foreground">{username}</p>
              <p className="text-sidebar-foreground/50 capitalize">{role}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
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
