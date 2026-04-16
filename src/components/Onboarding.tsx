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
    title: "Step 1. 상황 진단",
    term: "나의 소송 유형 찾기",
    definition: "지금 겪고 계신 상황을 일상어로 설명해 주세요. AI가 민사, 가사, 형사 등 가장 적합한 소송 유형을 찾아드립니다.",
    tip: "복잡한 법률 용어를 몰라도 괜찮습니다. AI가 당신의 이야기를 법률적 관점에서 분석하여 핵심 쟁점을 짚어줍니다.",
    icon: <Scale className="w-12 h-12 text-brand-600" />
  },
  {
    title: "Step 2. 서류 작성",
    term: "AI 소장/내용증명 생성",
    definition: "AI와 대화하며 질문에 답하기만 하세요. 논리적이고 설득력 있는 소장이나 내용증명 초안이 즉시 완성됩니다.",
    tip: "수백만 건의 법률 데이터를 학습한 AI가 당신에게 가장 유리한 법리적 근거와 문장을 제안합니다.",
    icon: <BookOpen className="w-12 h-12 text-indigo-600" />
  },
  {
    title: "Step 3. 증거 정리",
    term: "빈틈없는 증거 목록화",
    definition: "사진, 영수증, 대화 캡처본을 업로드하세요. AI가 증거 번호를 부여하고 증거설명서 초안을 자동으로 작성해 드립니다.",
    tip: "어떤 증거가 승소에 결정적인 역할을 할지 AI가 분석하여 우선순위를 추천해 드립니다.",
    icon: <ShieldCheck className="w-12 h-12 text-emerald-600" />
  },
  {
    title: "Step 4. 법원 대응",
    term: "보정명령 대응 가이드",
    definition: "법원에서 온 보정명령서를 업로드하면, AI가 무엇을 수정해야 하는지 분석하고 답변서 초안을 만들어 드립니다.",
    tip: "어려운 법원의 지시사항을 알기 쉽게 풀어서 설명해 드리니 당황하지 마세요.",
    icon: <Sparkles className="w-12 h-12 text-amber-600" />
  },
  {
    title: "Step 5. 전문가 검토",
    term: "변호사 최종 검토 연계",
    definition: "AI가 작성한 서류를 실제 파트너 변호사에게 검토받으세요. 법적 완성도를 100%로 끌어올려 승소 확률을 높입니다.",
    tip: "AI로 준비 비용은 낮추고, 변호사의 전문성으로 신뢰는 높였습니다. 마지막 한 걸음까지 함께합니다.",
    icon: <CheckCircle2 className="w-12 h-12 text-brand-600" />
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
