import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await api.post(endpoint, { username, password });

      if (isLogin) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('username', response.data.username);
        toast.success('Login successful');
        navigate('/');
      } else {
        toast.success('Registration successful. Please login.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1597920940566-a77511f9327d?crop=entropy&cs=srgb&fm=jpg&q=85)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-slate-900/90"></div>

      <Card className="relative z-10 w-full max-w-md p-8 bg-white shadow-2xl" data-testid="login-card">
        <div className="mb-8">
          <h1 className="font-mono font-semibold text-3xl text-slate-900 mb-2" data-testid="app-title">
            PlagiarismControl
          </h1>
          <p className="font-sans text-base text-slate-600" data-testid="app-subtitle">
            Academic Code Integrity System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="username" className="font-mono text-xs uppercase tracking-widest text-slate-500">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 font-mono"
              required
              data-testid="username-input"
            />
          </div>

          <div>
            <Label htmlFor="password" className="font-mono text-xs uppercase tracking-widest text-slate-500">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 font-mono"
              required
              data-testid="password-input"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-900 text-white hover:bg-indigo-800 font-mono text-sm uppercase tracking-wider py-3 button-shadow"
            data-testid="submit-button"
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-sans text-sm text-slate-600 hover:text-indigo-900 underline"
            data-testid="toggle-auth-mode"
          >
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
          </button>
        </div>
      </Card>
    </div>
  );
}

export default Login;
