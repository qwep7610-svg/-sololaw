import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Heart, RefreshCw, Loader2 } from 'lucide-react';
import { generateMentalCareMessage } from '../services/gemini';
import LitigationAIHelper from './LitigationAIHelper';

const LITIGATION_STORAGE_KEY = 'SOLO_LAW_LITIGATION_DATA';

interface Deadline {
  id: string;
  title: string;
  date: string;
  type: 'hearing' | 'appeal' | 'submission' | 'other';
}

interface LitigationData {
  progress: number;
  deadlines: Deadline[];
  lastMessage: string;
  currentStep: string;
  lawsuitType: string;
  caseDescription: string;
}

const initialLitigationData: LitigationData = {
  progress: 15,
  deadlines: [
    { id: '1', title: '변론 기일', date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], type: 'hearing' },
    { id: '2', title: '증거 보완 제출 기한', date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], type: 'submission' },
  ],
  lastMessage: '상대방의 주장은 예상 범위 내에 있습니다. 차분히 답변서를 준비합시다.',
  currentStep: '소장 작성 전',
  lawsuitType: '임대차 보증금 반환',
  caseDescription: ''
};

const STEPS = ['소장 작성 전', '주소보정명령', '답변서 수령', '변론기일 지정'];

export default function LitigationManager({ 
  onExpertConsult,
  onStartComplaint
}: { 
  onExpertConsult?: () => void;
  onStartComplaint?: () => void;
}) {
  const [data, setData] = useState<LitigationData>(initialLitigationData);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LITIGATION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setData({
        ...initialLitigationData,
        ...parsed
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LITIGATION_STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const handleRefreshMessage = React.useCallback(async () => {
    setIsGeneratingMessage(true);
    try {
      const message = await generateMentalCareMessage({
        progress: data.progress,
        deadlines: data.deadlines
      });
      setData(prev => ({ ...prev, lastMessage: message }));
    } catch (error) {
      console.error("Failed to generate message:", error);
      setData(prev => ({ ...prev, lastMessage: error instanceof Error ? error.message : "메시지를 생성하지 못했습니다." }));
    } finally {
      setIsGeneratingMessage(false);
    }
  }, [data.progress, data.deadlines]);

  return (
    <div className="space-y-6">
      {/* Mental Care Message */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 via-indigo-500 to-brand-600" />
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-brand-50 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="shrink-0">
            <div className="bg-brand-50 p-5 rounded-[1.5rem] shadow-inner border border-brand-100/50 relative group-hover:scale-110 transition-transform duration-500">
              <Heart className="w-8 h-8 text-brand-600 fill-brand-100" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-500 rounded-full animate-ping" />
            </div>
          </div>
          
          <div className="space-y-4 flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-xl text-[#0F172A] font-serif">오늘의 안심 메시지</h3>
                <p className="text-[10px] font-bold text-brand-600 uppercase tracking-[0.2em]">SoloLaw AI Mental Care</p>
              </div>
              <button 
                onClick={handleRefreshMessage}
                disabled={isGeneratingMessage}
                className="hidden md:flex p-2.5 bg-slate-50 hover:bg-white rounded-xl transition-all disabled:opacity-50 text-slate-400 hover:text-brand-600 shadow-sm border border-slate-100 hover:border-brand-200 hover:rotate-180 duration-500"
                title="새로운 메시지 받기"
              >
                {isGeneratingMessage ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
              </button>
            </div>
            
            <div className="relative">
              <span className="absolute -left-4 -top-2 text-4xl text-brand-200 font-serif opacity-50">"</span>
              <p className="text-[#334155] text-lg md:text-xl leading-relaxed font-medium italic px-2">
                {data.lastMessage}
              </p>
              <span className="absolute -right-2 -bottom-2 text-4xl text-brand-200 font-serif opacity-50">"</span>
            </div>

            <button 
              onClick={handleRefreshMessage}
              disabled={isGeneratingMessage}
              className="md:hidden w-full py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-500 flex items-center justify-center gap-2"
            >
              {isGeneratingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              새로운 메시지 받기
            </button>
          </div>
        </div>
        
        <div className="absolute -right-8 -bottom-8 opacity-[0.02] text-brand-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
          <ScaleIcon size={200} />
        </div>
      </motion.div>

      <LitigationAIHelper 
        currentStep={data.currentStep}
        lawsuitType={data.lawsuitType}
        progress={data.progress}
        onStartComplaint={onStartComplaint}
        onConsultLawyer={onExpertConsult}
      />
    </div>
  );
}

function ScaleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h18" />
    </svg>
  );
}
