import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Scale, BookOpen, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

interface OnboardingStep {
  title: string;
  term: string;
  definition: string;
  tip: string;
  icon: React.ReactNode;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: "소송의 주인공들",
    term: "원고 vs 피고",
    definition: "소송을 시작한 사람을 '원고', 소송을 당한 사람을 '피고'라고 부릅니다.",
    tip: "나홀로 소송을 준비하신다면 대부분 '원고'의 입장에서 시작하시게 될 거예요.",
    icon: <Scale className="w-12 h-12 text-brand-600" />
  },
  {
    title: "소송의 시작",
    term: "소장 (Complaint)",
    definition: "내가 왜 소송을 하는지, 무엇을 원하는지 적어서 법원에 내는 첫 번째 서류입니다.",
    tip: "솔로로 AI가 여러분의 사연을 법률 용어로 가득 찬 멋진 소장으로 바꿔드립니다.",
    icon: <BookOpen className="w-12 h-12 text-indigo-600" />
  },
  {
    title: "강력한 경고장",
    term: "내용증명 (Demand Letter)",
    definition: "소송 전, 상대방에게 내 요구사항을 공식적으로 전달했다는 사실을 우체국이 증명해주는 문서입니다.",
    tip: "내용증명만으로도 문제가 해결되는 경우가 많으니 소송 전 꼭 검토해 보세요.",
    icon: <ShieldCheck className="w-12 h-12 text-emerald-600" />
  },
  {
    title: "법원의 피드백",
    term: "보정명령 (Correction Order)",
    definition: "법원이 제출된 서류를 보고 '이 부분은 부족하니 고쳐오세요'라고 내리는 지시입니다.",
    tip: "당황하지 마세요! 보정명령서를 솔로로에 업로드하면 어떻게 고쳐야 할지 바로 알려드립니다.",
    icon: <Sparkles className="w-12 h-12 text-amber-600" />
  }
];

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 flex">
              {ONBOARDING_STEPS.map((_, i) => (
                <div 
                  key={i}
                  className={`h-full transition-all duration-500 ${
                    i <= currentStep ? 'bg-brand-600' : 'bg-transparent'
                  }`}
                  style={{ width: `${100 / ONBOARDING_STEPS.length}%` }}
                />
              ))}
            </div>

            <button 
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 md:p-12 space-y-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <motion.div 
                  key={currentStep}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center shadow-inner border border-slate-100"
                >
                  {step.icon}
                </motion.div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em]">
                    {step.title}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bold text-[#0F172A] font-serif">
                    {step.term}
                  </h3>
                </div>

                <div className="space-y-4">
                  <p className="text-slate-600 text-lg leading-relaxed font-medium">
                    {step.definition}
                  </p>
                  <div className="bg-brand-50/50 p-4 rounded-2xl border border-brand-100/50 flex gap-3 text-left">
                    <Sparkles className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-brand-700 leading-relaxed font-medium">
                      {step.tip}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className={`flex items-center gap-2 text-sm font-bold transition-colors ${
                    currentStep === 0 ? 'text-transparent pointer-events-none' : 'text-slate-400 hover:text-slate-800'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>

                <div className="flex gap-1.5">
                  {ONBOARDING_STEPS.map((_, i) => (
                    <div 
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === currentStep ? 'w-4 bg-brand-600' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
                >
                  {currentStep === ONBOARDING_STEPS.length - 1 ? (
                    <>시작하기 <CheckCircle2 className="w-4 h-4" /></>
                  ) : (
                    <>다음 <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
