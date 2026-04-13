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
  subtext = 'SoloLaw 도우미',
  priority = false
}) => {
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-10 h-10'
  };

  const containerSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative ${containerSizes[size]} flex items-center justify-center shrink-0`}>
        {src ? (
          <div className="absolute inset-0 rounded-full overflow-hidden border-2 border-brand-100 shadow-sm">
            <img 
              src={src} 
              alt="Logo" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          </div>
        ) : (
          <>
            {/* Outer Circle with Gradient Border */}
            <div className="absolute inset-0 rounded-full border-2 border-brand-200 opacity-50" />
            
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-indigo-50 rounded-full scale-90" />
            
            {/* The Icon */}
            <div className="relative z-10 text-brand-600">
              <Scale className={iconSizes[size]} strokeWidth={1.5} />
              
              {/* Decorative dots to mimic the "network" feel of the image */}
              <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
              <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-indigo-400 rounded-full" />
            </div>
          </>
        )}
      </div>

      {showText && (
        <div className="flex flex-col leading-tight text-left">
          <span className={`${textSizes[size]} font-black tracking-tight text-[#0F172A] font-sans`}>
            {text === 'SoloLaw' ? (
              <>Solo<span className="text-brand-600">Law</span></>
            ) : text}
          </span>
          {size !== 'sm' && subtext && (
            <span className="text-[10px] text-brand-500 font-bold uppercase tracking-[0.2em]">
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
