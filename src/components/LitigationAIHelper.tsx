import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, MessageCircle, Loader2, ChevronRight } from 'lucide-react';
import { generateLitigationGuide } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

interface LitigationAIHelperProps {
  currentStep: string;
  lawsuitType: string;
  progress: number;
  onStartComplaint?: () => void;
  onConsultLawyer?: () => void;
}

export default function LitigationAIHelper({ 
  currentStep, 
  lawsuitType, 
  progress,
  onStartComplaint,
  onConsultLawyer
}: LitigationAIHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [guide, setGuide] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGuide = async () => {
    setIsLoading(true);
    try {
      const result = await generateLitigationGuide({ currentStep, lawsuitType, progress });
      setGuide(result);
    } catch (error) {
      console.error("Failed to fetch AI guide:", error);
      setGuide("가이드를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !guide) {
      fetchGuide();
    }
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-[350px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-brand-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-bold">SoloLaw AI 가이드</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-1 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                  <p className="text-sm text-slate-500 font-medium">맞춤형 가이드를 생성 중입니다...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                    <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">현재 상태</p>
                    <p className="text-slate-700 font-bold">{lawsuitType} - {currentStep}</p>
                  </div>
                  
                  <div className="prose prose-slate prose-sm max-w-none">
                    <ReactMarkdown>{guide || ''}</ReactMarkdown>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-3 font-medium">도움이 더 필요하신가요?</p>
                    <div className="grid grid-cols-1 gap-2">
                      <button 
                        onClick={() => {
                          onStartComplaint?.();
                          setIsOpen(false);
                        }}
                        className="flex items-center justify-between p-3 bg-slate-50 hover:bg-brand-50 rounded-xl text-sm text-slate-700 hover:text-brand-700 transition-all group"
                      >
                        <span>소장 작성 시작하기</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-400" />
                      </button>
                      <button 
                        onClick={() => {
                          onConsultLawyer?.();
                          setIsOpen(false);
                        }}
                        className="flex items-center justify-between p-3 bg-slate-50 hover:bg-brand-50 rounded-xl text-sm text-slate-700 hover:text-brand-700 transition-all group"
                      >
                        <span>변호사에게 서류 검토 받기</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-400" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'bg-slate-800 text-white rotate-90' : 'bg-brand-600 text-white'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-bounce" />
        )}
      </motion.button>
    </div>
  );
}
