import React, { useState } from 'react';
import { AlertTriangle, ChevronLeft, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WithdrawalPageProps {
  onConfirm: () => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
}

export default function WithdrawalPage({ onConfirm, onBack, isLoading = false }: WithdrawalPageProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
      
      <button 
        onClick={onBack} 
        disabled={isLoading}
        className="flex items-center gap-1 text-slate-400 mb-8 hover:text-slate-600 transition-colors group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> 
        <span className="text-sm font-medium">뒤로가기</span>
      </button>

      <div className="text-center mb-8">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-red-100"
        >
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </motion.div>
        <h2 className="text-2xl font-black text-slate-900 font-serif tracking-tight">정말 떠나시나요?</h2>
        <p className="text-sm text-slate-500 mt-3 leading-relaxed">
          탈퇴 시 그동안 쌓인 소중한 정보와 혜택들이<br />
          <span className="text-red-600 font-bold underline underline-offset-4">모두 삭제되며 복구할 수 없습니다.</span>
        </p>
      </div>

      <div className="space-y-4 mb-8">
        <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-red-100 transition-colors">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
            작성 중인 소장 및 법률 문서
          </h4>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed ml-3.5">
            AI와 함께 정성껏 만든 소장 초안과 법률 문서들이 즉시 파기됩니다.
          </p>
        </div>
        <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-red-100 transition-colors">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
            전문가 상담 및 매칭 내역
          </h4>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed ml-3.5">
            변호사님과 주고받은 상담 기록 및 예약 정보가 모두 사라집니다.
          </p>
        </div>
      </div>

      <div className="bg-red-50/30 p-4 rounded-2xl border border-red-100/50 mb-8">
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative mt-1">
            <input 
              type="checkbox" 
              checked={agreed} 
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={isLoading}
              className="peer w-5 h-5 rounded-lg border-slate-300 text-red-600 focus:ring-red-500 checked:bg-red-600 transition-all cursor-pointer appearance-none border-2" 
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">
              <div className="w-2.5 h-1.5 border-l-2 border-b-2 border-white -rotate-45 mb-0.5" />
            </div>
          </div>
          <span className="text-sm text-slate-600 font-medium leading-relaxed">
            안내 사항을 모두 확인하였으며, <span className="text-red-700 font-bold">모든 데이터 삭제</span> 및 탈퇴에 동의합니다.
          </span>
        </label>
      </div>

      <button 
        disabled={!agreed || isLoading}
        onClick={onConfirm}
        className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 ${
          agreed && !isLoading 
            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl shadow-red-200 hover:scale-[1.02] active:scale-[0.98]' 
            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <>
            <Trash2 className="w-5 h-5" />
            회원탈퇴 완료
          </>
        )}
      </button>
      
      <p className="text-[10px] text-slate-400 text-center mt-6">
        * 결제 기록 등 법령에 의해 보관이 필요한 정보는 관련 법규에 따라 일정 기간 보존됩니다.
      </p>
    </div>
  );
}
