'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { LoaderCircle } from 'lucide-react';

export default function LoginPage() {
  const { supabase, session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Redirect if user is already logged in
  useEffect(() => {
    if (session) {
      router.push('/');
    }
  }, [session, router]);

  const handleAuthAction = async (action: 'login' | 'signup') => {
    setIsSubmitting(true);
    const authMethod = action === 'login' 
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/` } });
      
    const { error } = await authMethod;

    if (error) {
      toast.error(error.message);
    } else {
      if (action === 'login') {
        toast.success('Logged in successfully!');
        router.refresh(); // This re-runs middleware and redirects to '/'
      } else {
        toast.success('Check your email for a verification link!');
      }
    }
    setIsSubmitting(false);
  };

  return (
    <main className="flex justify-center items-center mt-20 px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-slate-800 rounded-xl shadow-2xl border border-slate-700">
        <div>
          <h2 className="text-3xl font-bold text-center text-white">Welcome to Study Buddy</h2>
          <p className="mt-2 text-center text-sm text-slate-400">Sign in or create an account to continue</p>
        </div>
        <div className="space-y-6">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min. 6 characters)" className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white" />
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <button onClick={() => handleAuthAction('login')} disabled={isSubmitting || !email || !password} className="w-full flex justify-center py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
              {isSubmitting ? <LoaderCircle className="animate-spin" /> : 'Login'}
            </button>
            <button onClick={() => handleAuthAction('signup')} disabled={isSubmitting || !email || !password} className="w-full flex justify-center py-3 px-4 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors">
              {isSubmitting ? <LoaderCircle className="animate-spin" /> : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}