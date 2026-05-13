import React, { useState } from 'react';
import { Lock, Wrench } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const getLoginErrorMessage = (message: string) => {
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'Email atau password salah.';
  }

  if (message.toLowerCase().includes('email not confirmed')) {
    return 'Email belum dikonfirmasi.';
  }

  return message;
};

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(getLoginErrorMessage(error.message));
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-stone-100 text-gray-900 flex items-center justify-center p-6 font-sans dark:bg-[#0F1115] dark:text-[#E0E2E6]">
      <div className="w-full max-w-sm bg-stone-50 border border-gray-200 shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
        <div className="p-6 border-b border-gray-200 dark:border-[#2A2D35]">
          <div className="flex items-center gap-2 text-[#F27D26] font-black text-xl italic tracking-tighter uppercase mb-6">
            <Wrench size={24} />
            <span>HOKY TEKNIK</span>
          </div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Masuk Inventaris</h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-2 dark:text-[#8E9299]">
            Hanya untuk pengguna yang berwenang
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-widest dark:text-[#8E9299]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-white border border-gray-300 p-3 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
              placeholder="anda@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-widest dark:text-[#8E9299]">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-white border border-gray-300 p-3 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
              placeholder="Kata sandi"
              autoComplete="current-password"
            />
          </div>

          {errorMessage && (
            <div className="bg-[#FF4444]/10 border border-[#FF4444]/40 p-3 text-[10px] uppercase font-bold tracking-widest text-[#FF4444]">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#F27D26] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed text-black py-3 px-4 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
          >
            <Lock size={16} />
            {isSubmitting ? 'Sedang masuk...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
};
