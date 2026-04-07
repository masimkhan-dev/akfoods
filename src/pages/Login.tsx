import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Flame, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const { user, loading: authLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard/billing', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const cleanUsername = username.trim().toLowerCase();
      await login(cleanUsername, password);
      navigate('/dashboard/billing');
    } catch (err: any) {
      console.error("Login component error:", err);
      const errorMessage = err?.message || 'Invalid username or password';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setResetLoading(true);
    try {
      // Determine the email: if it contains '@', use as-is, otherwise append domain
      const email = resetEmail.trim().toLowerCase().includes('@')
        ? resetEmail.trim().toLowerCase()
        : `${resetEmail.trim().toLowerCase()}@akfburgers.local`;

      // @akfburgers.local emails can't receive real emails — warn user
      if (email.endsWith('@akfburgers.local')) {
        toast.error('Standard cashier accounts cannot use password reset. Please contact your admin to reset your password.');
        setResetLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`Password reset link sent to ${email}. Please check your inbox.`);
        setShowForgotPassword(false);
        setResetEmail('');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-0 overflow-hidden">
        <div className="bg-primary p-6 flex flex-col items-center gap-2">
          <div className="bg-primary-foreground/20 rounded-full p-3">
            <Flame className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display text-primary-foreground tracking-tight">AKF</h1>
          <p className="text-primary-foreground/70 text-sm">Point of Sale System</p>
        </div>
        <CardHeader className="pb-2 pt-6">
          <p className="text-center text-muted-foreground text-sm">
            {showForgotPassword ? 'Reset your password' : 'Sign in to continue'}
          </p>
        </CardHeader>
        <CardContent>
          {!showForgotPassword ? (
            // ── Login Form ──
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          ) : (
            // ── Forgot Password Form ──
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">Your Email Address</Label>
                <Input
                  id="resetEmail"
                  type="text"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email (e.g. admin@gmail.com)"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Note: Only accounts with a real email address can reset their password. Cashier accounts must contact the admin.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setResetEmail(''); }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Sign In
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
