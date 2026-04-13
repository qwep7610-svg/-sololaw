import { motion } from 'motion/react';
import { Check } from 'lucide-react';

interface Step {
  id: string;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStepIndex: number;
  isComplete?: boolean;
}

export default function StepIndicator({ steps, currentStepIndex, isComplete = false }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between w-full mb-8 px-2">
      {steps.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isPast = index < currentStepIndex || isComplete;
        
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center relative">
              <motion.div 
                initial={false}
                animate={{
                  backgroundColor: isPast ? '#2563EB' : isActive ? '#FFFFFF' : '#F1F5F9',
                  borderColor: isPast || isActive ? '#2563EB' : '#E2E8F0',
                  color: isPast ? '#FFFFFF' : isActive ? '#2563EB' : '#94A3B8'
                }}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 flex items-center justify-center text-xs md:text-sm font-bold z-10 shadow-sm`}
              >
                {isPast ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : index + 1}
              </motion.div>
              <span className={`absolute -bottom-6 whitespace-nowrap text-[10px] md:text-xs font-bold transition-colors ${isActive || isPast ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
                {step.label}
              </span>
            </div>
            
            {index < steps.length - 1 && (
              <div className="flex-1 h-[2px] mx-2 md:mx-4 bg-slate-100 relative overflow-hidden">
                <motion.div 
                  initial={false}
                  animate={{ width: isPast ? '100%' : '0%' }}
                  className="absolute inset-0 bg-brand-600"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
