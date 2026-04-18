import React from 'react';
import { Scale } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  src?: string | null;
  text?: string;
  subtext?: string;
  priority?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md', 
  showText = true,
  src = null,
  text = 'SoloLaw',
  subtext = 'AI Legal Assistant',
  priority = false
}) => {
  const containerSizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20'
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className={`relative ${containerSizes[size]} shrink-0`}>
        {src ? (
          <div className="absolute inset-0 rounded-2xl overflow-hidden border-2 border-brand-100 shadow-lg shadow-brand-100/20">
            <img 
              src={src} 
              alt="Logo" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
              loading={priority ? "eager" : "lazy"}
            />
          </div>
        ) : (
          <div className="w-full h-full relative group">
            {/* Background Shape */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-indigo-700 rounded-2xl rotate-3 group-hover:rotate-6 transition-transform duration-300" />
            <div className="absolute inset-0 bg-white rounded-2xl shadow-md border border-brand-100 flex items-center justify-center -rotate-3 group-hover:-rotate-1 transition-transform duration-300">
              {/* Custom SVG Logo */}
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[60%] h-[60%] text-brand-600">
                <path d="M12 28L28 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <path d="M22 6L34 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <path d="M28 12L25 15" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <path d="M15 25L12 28" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <path d="M7 33H17" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="32" cy="8" r="3" fill="#6366F1" className="animate-pulse" />
                <path d="M32 8C34 8 36 10 36 12" stroke="#6366F1" strokeWidth="1.5" strokeDasharray="2 2" />
              </svg>
            </div>
            {/* AI Sparkle */}
            <div className="absolute -top-1 -right-1">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-400 rounded-full blur-sm animate-ping opacity-50" />
                <div className="relative bg-brand-500 w-2.5 h-2.5 rounded-full border-2 border-white" />
              </div>
            </div>
          </div>
        )}
      </div>

      {showText && (
        <div className="flex flex-col leading-none text-left">
          <span className={`${textSizes[size]} font-black tracking-tighter text-slate-900 font-sans flex items-center gap-1`}>
            {text === 'SoloLaw' ? (
              <>
                <span className="text-slate-900">Solo</span>
                <span className="text-brand-600">Law</span>
              </>
            ) : text}
          </span>
          {size !== 'sm' && subtext && (
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1">
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
