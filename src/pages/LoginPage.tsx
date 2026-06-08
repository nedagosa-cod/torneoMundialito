// src/pages/LoginPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

// ============================================================
//  SUB-COMPONENTE: Input de campo
// ============================================================
interface FieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: string;
  autoComplete?: string;
  maxLength?: number;
}

const Field: React.FC<FieldProps> = ({
  id, label, type = 'text', placeholder, value, onChange, icon, autoComplete, maxLength,
}) => {
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm select-none pointer-events-none">
          {icon}
        </span>
        <input
          id={id}
          type={isPassword && showPass ? 'text' : type}
          className="input-field pl-9 pr-10"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          maxLength={maxLength}
          spellCheck={false}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPass((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-xs font-bold"
          >
            {showPass ? '🙈' : '👁️'}
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================
//  PARTÍCULAS (sin mezcla de animation shorthand + direction)
// ============================================================
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-sm"
          style={{
            width: '6px',
            height: '6px',
            left: `${(i * 5.7) % 100}%`,
            bottom: '0px',
            background: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#22c55e' : 'rgba(255,255,255,0.4)',
            opacity: 0.3,
            animationName: 'particle-rise',
            animationDuration: `${4 + (i % 5)}s`,
            animationTimingFunction: 'ease-in-out',
            animationDelay: `${i * 0.35}s`,
            animationIterationCount: 'infinite',
            animationFillMode: 'both',
          }}
        />
      ))}
    </div>
  );
}

// ============================================================
//  FORM DE LOGIN
// ============================================================
interface LoginFormProps { onSwitch: () => void }

const LoginForm: React.FC<LoginFormProps> = ({ onSwitch }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useStore();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const handleChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (v: string) => {
    setter(v);
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    await login(username.trim(), password.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
      <div ref={ref as unknown as React.RefObject<HTMLDivElement>}>
        <Field
          id="login-username"
          label="Correo electrónico o Cédula"
          placeholder="Ej: usuario@correo.com o Cédula"
          value={username}
          onChange={handleChange(setUsername)}
          icon="📧"
          autoComplete="username"
        />
      </div>
      <Field
        id="login-password"
        label="Número de cédula"
        type="password"
        placeholder="Ej: 1097675423"
        value={password}
        onChange={handleChange(setPassword)}
        icon="🪪"
        autoComplete="current-password"
      />

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in">
          <span className="text-red-400 text-sm mt-0.5">⚠️</span>
          <p className="text-red-400 text-xs font-medium leading-relaxed">{error}</p>
        </div>
      )}

      <button
        id="login-btn"
        type="submit"
        disabled={isLoading || !username.trim() || !password.trim()}
        className="btn-primary w-full text-base py-3.5 font-display"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Ingresando...
          </span>
        ) : (
          '📧 Ingresar'
        )}
      </button>

      <p className="text-center text-white/30 text-sm">
        ¿No tienes cuenta?{' '}
        <button
          type="button"
          id="switch-to-register"
          onClick={onSwitch}
          className="text-verde-400 font-bold hover:text-verde-300 transition-colors"
        >
          Regístrate aquí
        </button>
      </p>
    </form>
  );
};

// ============================================================
//  FORM DE REGISTRO
// ============================================================
interface RegisterFormProps { onSwitch: () => void }

const RegisterInfo: React.FC<RegisterFormProps> = ({ onSwitch }) => {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Icono decorativo */}
      <div className="flex justify-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(34,197,94,0.1))',
            border: '1px solid rgba(251,191,36,0.25)',
            boxShadow: '0 0 20px rgba(251,191,36,0.1)',
          }}
        >
          <span className="text-3xl select-none">📋</span>
        </div>
      </div>

      {/* Mensaje informativo */}
      <div
        className="rounded-xl p-4 border border-dorado-400/20"
        style={{ background: 'rgba(251,191,36,0.05)' }}
      >
        <h3 className="text-dorado-400 font-display font-bold text-sm mb-2 text-center">
          Registro vía Google Forms
        </h3>
        <p className="text-white/50 text-xs leading-relaxed text-center">
          Para participar en la Polla del Mundial, debes completar el
          <strong className="text-white/70"> formulario de registro</strong> proporcionado
          por la organización.
        </p>
      </div>

      {/* Pasos */}
      <div className="space-y-2.5">
        <div className="flex items-start gap-3 px-2">
          <span className="w-6 h-6 rounded-full bg-verde-400/15 border border-verde-400/30 flex items-center justify-center text-xs font-bold text-verde-400 flex-shrink-0">1</span>
          <p className="text-white/50 text-xs leading-relaxed pt-0.5">Completa el formulario de Google Forms que te compartieron</p>
        </div>
        <div className="flex items-start gap-3 px-2">
          <span className="w-6 h-6 rounded-full bg-verde-400/15 border border-verde-400/30 flex items-center justify-center text-xs font-bold text-verde-400 flex-shrink-0">2</span>
          <p className="text-white/50 text-xs leading-relaxed pt-0.5">Usa tu <strong className="text-white/70">correo electrónico</strong> y <strong className="text-white/70">número de cédula</strong> para ingresar</p>
        </div>
        <div className="flex items-start gap-3 px-2">
          <span className="w-6 h-6 rounded-full bg-verde-400/15 border border-verde-400/30 flex items-center justify-center text-xs font-bold text-verde-400 flex-shrink-0">3</span>
          <p className="text-white/50 text-xs leading-relaxed pt-0.5">¡Comienza a predecir y gana puntos! 🎉</p>
        </div>
      </div>

      {/* Botón para ir al login */}
      <button
        type="button"
        id="go-to-login-btn"
        onClick={onSwitch}
        className="btn-primary w-full text-base py-3.5 font-display"
      >
        📧 Ya tengo cuenta · Ingresar
      </button>
    </div>
  );
};

// ============================================================
//  PÁGINA PRINCIPAL
// ============================================================
export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const { clearError } = useStore();

  const switchMode = (next: 'login' | 'register') => {
    clearError();
    setMode(next);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #050814 0%, #080f24 60%, #0a2e19 100%)' }}
    >
      {/* Partículas de fondo */}
      <Particles />

      {/* Círculos de luz ambiente */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,255,135,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)', filter: 'blur(30px)' }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 relative"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(0,255,135,0.10))',
              border: '1px solid rgba(255,215,0,0.3)',
              boxShadow: '0 0 30px rgba(255,215,0,0.2), 0 0 60px rgba(0,255,135,0.1)',
            }}
          >
            <span className="text-4xl select-none" style={{ animationName: 'none' }}>🏆</span>
          </div>
          <h1
            className="font-display font-black text-3xl text-center tracking-wide"
            style={{
              background: 'linear-gradient(135deg, #ffe359 0%, #00ff87 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Polla del Mundial
          </h1>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mt-1.5">
            {mode === 'login' ? '¡Bienvenido de vuelta! 👋' : '¡Únete a la competencia! 🔥'}
          </p>
        </div>

        {/* Card principal */}
        <div
          className="rounded-3xl p-6 border border-white/10"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          {/* Tabs Login / Registro */}
          <div className="flex rounded-2xl p-1 mb-5 bg-pitch-950 border border-white/5 shadow-inner">
            <button
              id="tab-login"
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black font-display transition-all duration-200 ${mode === 'login'
                ? 'bg-gradient-verde text-pitch-950 shadow-md'
                : 'text-white/40 hover:text-white/60'
                }`}
            >
              ⚽ Ingresar
            </button>
            <button
              id="tab-register"
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black font-display transition-all duration-200 ${mode === 'register'
                ? 'bg-gradient-gold text-pitch-950 shadow-md'
                : 'text-white/40 hover:text-white/60'
                }`}
            >
              🏆 Registrarse
            </button>
          </div>

          {/* Formulario activo */}
          {mode === 'login' ? (
            <LoginForm onSwitch={() => switchMode('register')} />
          ) : (
            <RegisterInfo onSwitch={() => switchMode('login')} />
          )}
        </div>

        {/* Scoring legend */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-white/35 font-bold uppercase tracking-wider bg-white/5 border border-white/5 py-2 px-3 rounded-2xl">
          <span>🥇 Exacto: <strong className="text-dorado-300">3 pts</strong></span>
          <span>⚽ Resultado: <strong className="text-verde-400">1 pt</strong></span>
          <span>❌ Fallo: <strong>0 pts</strong></span>
        </div>
      </div>

      {/* Keyframe para partículas subiendo — definido con style tag para evitar conflicto shorthand */}
      <style>{`
        @keyframes particle-rise {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 0; }
          10%  { opacity: 0.4; }
          90%  { opacity: 0.2; }
          100% { transform: translateY(-100vh) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
