import React, { useState } from 'react';
import { ShieldAlert, CheckCircle } from 'lucide-react';

interface FinalReviewModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function FinalReviewModal({ onConfirm, onCancel }: FinalReviewModalProps) {
  const [checks, setChecks] = useState({
    factual: false,
    aiLimit: false,
    lawyerConsult: false
  });

  const allChecked = Object.values(checks).every(Boolean);

  const handleCheck = (key: keyof typeof checks) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* 헤더: 경고 아이콘 */}
        <div className="bg-amber-50 p-8 text-center border-b border-amber-100">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">문서 생성 전 최종 확인</h2>
          <p className="text-sm text-slate-500 mt-2">안전한 법률 절차를 위해 아래 사항을 확인해 주세요.</p>
        </div>

        {/* 체크리스트 영역 */}
        <div className="p-8 space-y-4">
          <button 
            onClick={() => handleCheck('factual')}
            className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left ${checks.factual ? 'border-brand-500 bg-brand-50/30' : 'border-slate-100 bg-slate-50'}`}
          >
            <CheckCircle className={`w-5 h-5 mt-0.5 shrink-0 ${checks.factual ? 'text-brand-600' : 'text-slate-300'}`} />
            <div>
              <p className="font-bold text-slate-800 text-sm">사실관계 확인</p>
              <p className="text-xs text-slate-500 leading-relaxed">입력하신 일시, 장소, 인적 사항 등 사실관계에 오류가 없음을 확인했습니다.</p>
            </div>
          </button>

          <button 
            onClick={() => handleCheck('aiLimit')}
            className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left ${checks.aiLimit ? 'border-brand-500 bg-brand-50/30' : 'border-slate-100 bg-slate-50'}`}
          >
            <CheckCircle className={`w-5 h-5 mt-0.5 shrink-0 ${checks.aiLimit ? 'text-brand-600' : 'text-slate-300'}`} />
            <div>
              <p className="font-bold text-slate-800 text-sm">AI 생성 한계 인지</p>
              <p className="text-xs text-slate-500 leading-relaxed">본 문서는 AI 기술로 자동 생성된 초안이며, 최신 판례 및 법적 효력을 보장하지 않음을 인지합니다.</p>
            </div>
          </button>

          <button 
            onClick={() => handleCheck('lawyerConsult')}
            className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left ${checks.lawyerConsult ? 'border-brand-500 bg-brand-50/30' : 'border-slate-100 bg-slate-50'}`}
          >
            <CheckCircle className={`w-5 h-5 mt-0.5 shrink-0 ${checks.lawyerConsult ? 'text-brand-600' : 'text-slate-300'}`} />
            <div>
              <p className="font-bold text-slate-800 text-sm">전문가 검토 권장</p>
              <p className="text-xs text-slate-500 leading-relaxed">정확한 법리 해석을 위해 파트너 변호사의 유료 검토를 거치는 것을 강력히 권장합니다.</p>
            </div>
          </button>
        </div>

        {/* 하단 버튼 */}
        <div className="p-8 pt-0 flex flex-col gap-3">
          <button 
            disabled={!allChecked}
            onClick={onConfirm}
            className={`w-full py-5 rounded-2xl font-black text-lg transition-all shadow-xl ${
              allChecked ? 'bg-slate-900 text-white shadow-slate-200 hover:scale-[1.02] active:scale-[0.98]' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            확인 및 문서 생성하기
          </button>
          <button 
            onClick={onCancel}
            className="w-full py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
          >
            다시 수정하기
          </button>
        </div>
      </div>
    </div>
  );
}
