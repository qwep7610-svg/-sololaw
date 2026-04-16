import React from 'react';
import { CheckCircle2, Zap, ShieldCheck } from 'lucide-react';

interface SinglePlanCardProps {
  onSubscribe: () => void;
  price?: number;
}

export default function SinglePlanCard({ onSubscribe, price = 99000 }: SinglePlanCardProps) {
  const benefits = [
    { title: 'AI 사건 요약 리포트', desc: '상담 전 의뢰인의 핵심 쟁점을 AI가 미리 분석해 드립니다.' },
    { title: '상단 우선 노출', desc: '지역/분야 검색 시 파트너 변호사가 최상단에 우선 배치됩니다.' },
    { title: '직통 연결 시스템', desc: '전화 및 1:1 채팅을 통해 의뢰인과 즉시 연결됩니다.' },
    { title: '공식 파트너 인증', desc: '신뢰도를 높여주는 파트너 전용 골드 배지가 부여됩니다.' },
  ];

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 relative">
        {/* 상단 강조 영역 */}
        <div className="bg-brand-600 p-10 text-center text-white">
          <div className="inline-flex items-center gap-2 bg-brand-500 px-4 py-1 rounded-full text-xs font-black mb-4">
            <Zap className="w-3 h-3 fill-white" /> BEST VALUE
          </div>
          <h2 className="text-2xl font-black mb-2">솔로로 파트너십</h2>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-black">{price.toLocaleString()}</span>
            <span className="text-lg opacity-80">원 / 월</span>
          </div>
        </div>

        {/* 혜택 리스트 */}
        <div className="p-10 space-y-6">
          {benefits.map((b, i) => (
            <div key={i} className="flex gap-4">
              <div className="mt-1">
                <CheckCircle2 className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{b.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}

          {/* 결제 버튼 */}
          <button 
            onClick={onSubscribe}
            className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-slate-200 mt-4 active:scale-95"
          >
            파트너십 시작하기
          </button>
          
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 mt-6 font-medium">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> 토스 안전 결제</span>
            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
            <span>언제든 해지 가능</span>
          </div>
        </div>
      </div>
    </div>
  );
}
