import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from '@/stores/authStore';
import Login from "./pages/Login";
import DashboardLayout from "./components/layout/DashboardLayout";
import Billing from "./pages/Billing";
import Reports from "./pages/Reports";
import MenuManagement from "./pages/MenuManagement";
import SettingsPage from "./pages/SettingsPage";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";
import AddExpense from "./pages/expenses/AddExpense";
import ExpenseList from "./pages/expenses/ExpenseList";
import EditExpense from "./pages/expenses/EditExpense";
import ExpenseReports from "./pages/expenses/ExpenseReports";
import ProfitLoss from "./pages/reports/ProfitLoss";
import Customers from "./pages/Customers";

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const AppContent = () => {
  useEffect(() => {
    console.log("AppContent: Mounted");
    useAuthStore.getState().initialize();
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="billing" replace />} />
          <Route path="billing" element={<Billing />} />
          <Route path="reports" element={<Reports />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="expenses" element={<ExpenseList />} />
          <Route path="expenses/add" element={<AddExpense />} />
          <Route path="expenses/edit/:id" element={<EditExpense />} />
          <Route path="expenses/reports" element={<ExpenseReports />} />
          <Route path="reports/profit-loss" element={<ProfitLoss />} />
          <Route path="customers" element={<Customers />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard/billing" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" expand={true} richColors />
      <AppContent />
    </TooltipProvider>
    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
);

export default App;
