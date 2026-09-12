import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Credenciais inválidas.');
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0c0e] px-4 py-12">
      {/* Background gradient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-144 w-xl -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#E0176A]/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-112 w-md translate-y-1/3 rounded-full bg-[#FF5A36]/10 blur-[110px]" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl"
      >
        <div className="flex justify-center">
          <img src="/br7hori.png" alt="BR7" className="h-25 w-auto" />
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 flex items-center gap-2 text-sm text-[#9ca3af]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6.75c0-.621.504-1.125 1.125-1.125h17.25c.621 0 1.125.504 1.125 1.125v10.5c0 .621-.504 1.125-1.125 1.125H3.375A1.125 1.125 0 0 1 2.25 17.25V6.75Z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6" />
              </svg>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-white placeholder-white/30 transition-colors focus:border-[#E0176A] focus:outline-none"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 flex items-center gap-2 text-sm text-[#9ca3af]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-white placeholder-white/30 transition-colors focus:border-[#E0176A] focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-[#9ca3af]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-transparent text-[#E0176A] focus:ring-0 focus:ring-offset-0"
            />
            Lembrar-me
          </label>
          <span
            className="cursor-not-allowed text-[#7a7d85]"
            title="Recuperação de senha ainda não disponível"
          >
            Esqueci senha?
          </span>
        </div>

        {error && <p className="text-sm text-[#FF5A36]">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-xl bg-linear-to-r from-[#E0176A] to-[#FF5A36] py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-[#E0176A]/30 transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
