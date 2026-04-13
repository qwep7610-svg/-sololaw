import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';

interface AIAssistantBubbleProps {
  message: string;
  tip?: string;
  isVisible: boolean;
}

export default function AIAssistantBubble({ message, tip, isVisible }: AIAssistantBubbleProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isVisible || isDismissed) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="relative z-30"
    >
      <div className="bg-white rounded-2xl p-4 shadow-xl border border-brand-100 flex gap-4 max-w-sm relative group">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-100">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">AI 가이드</span>
            <button 
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs md:text-sm text-slate-700 font-medium leading-relaxed">
            {message}
          </p>
          {tip && (
            <div className="pt-2 mt-2 border-t border-slate-50">
              <p className="text-[10px] text-slate-400 italic">
                💡 팁: {tip}
              </p>
            </div>
          )}
        </div>

        {/* Speech bubble tail */}
        <div className="absolute -left-2 top-4 w-4 h-4 bg-white border-l border-t border-brand-100 rotate-[-45deg] rounded-sm" />
      </div>
    </motion.div>
  );
}
