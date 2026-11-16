'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import { Stethoscope, Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn(email, password);
    setLoading(false);

    if (res.success) {
      // Role-Based Redirect: Admin -> /admin, Student -> /student
      if (res.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/student');
      }
    } else {
      setError(res.error || 'Identifiants incorrects (email ou mot de passe invalide).');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 mx-auto flex items-center justify-center text-white shadow-md shadow-teal-500/20">
          <Stethoscope className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Connexion à Guidini</h1>
        <p className="text-xs text-slate-500">
          Portail académique • Faculté de Médecine (DFGSM 2)
        </p>
      </div>

      {!isConfigured && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
          <span className="font-semibold block">Mode Démonstration Actif :</span>
          <p>
            • Admin : entrez <code className="bg-amber-100 px-1 rounded font-bold">admin.med@univ.dz</code><br />
            • Étudiant : entrez votre email personnel ou universitaire.
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Email universitaire ou personnel
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="etudiant@univ.dz ou delegue@univ.dz"
              className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Mot de passe
            </label>
            <Link
              href="/auth/reset-password"
              className="text-xs text-teal-700 hover:text-teal-800 font-medium hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember Session */}
        <div className="flex items-center justify-between text-xs text-slate-600">
          <label
            onClick={() => setRememberMe(!rememberMe)}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            {rememberMe ? (
              <CheckSquare className="w-4 h-4 text-teal-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>Rester connecté</span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? 'Connexion en cours...' : 'Se connecter'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Footer navigation */}
      <div className="text-center pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-2">
        <div>
          Pas encore inscrit ?{' '}
          <Link href="/auth/register" className="text-teal-700 font-semibold hover:underline">
            Créer un compte étudiant
          </Link>
        </div>
        <div>
          <Link href="/auth/join" className="text-slate-500 hover:text-slate-800">
            Rejoindre la cohorte avec un code d'invitation
          </Link>
        </div>
      </div>
    </div>
  );
}
