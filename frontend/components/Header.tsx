// frontend/components/Header.tsx (Complete, Final Code)
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Upload, LogOut, FileCog, MessageSquare, LoaderCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function Header() {
  const pathname = usePathname();
  const { supabase, user, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("You've been logged out.");
    router.push('/login');
  };

  return (
    <header className="bg-slate-900/70 backdrop-blur-lg border-b border-slate-700 p-4 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold gradient-text">
          AI Study Buddy
        </Link>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {isLoading ? (
            <LoaderCircle className="animate-spin text-slate-400" />
          ) : user ? (
            <>
              {/* --- NEW "CHAT" LINK ADDED HERE --- */}
              <Link 
                href="/chat" 
                className="flex items-center space-x-2 px-4 py-2 bg-slate-700 font-semibold rounded-lg hover:bg-indigo-600 transition-all" 
                title="Go to Chat Sessions"
              >
                <MessageSquare size={18} />
                <span className="hidden sm:inline">Chat</span>
              </Link>

              <Link 
                href="/converter" 
                className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-slate-700 font-semibold rounded-lg hover:bg-indigo-600 transition-all" 
                title="DOCX to PDF Converter"
              >
                <FileCog size={18} />
                <span className="hidden sm:inline">Converter</span>
              </Link>
              
              {/* This is the Dashboard/Upload button */}
              {pathname.startsWith('/chat') || pathname.startsWith('/converter') ? (
                <Link 
                  href="/" 
                  className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-indigo-600 font-semibold rounded-lg hover:bg-indigo-700 transition-all"
                  title="Go to Dashboard"
                >
                  <Upload size={18} />
                  <span>Dashboard</span>
                </Link>
              ) : null}

              <button 
                onClick={handleLogout} 
                className="flex items-center space-x-2 px-3 py-2 bg-slate-700 font-semibold rounded-lg hover:bg-red-500/80 transition-all" 
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : null }
        </div>
      </div>
    </header>
  );
}