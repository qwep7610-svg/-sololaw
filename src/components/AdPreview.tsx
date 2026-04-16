import React from 'react';
import { Star, ShieldCheck, MapPin, Scale, MessageSquare, Phone, Clock } from 'lucide-react';

export type PlanType = 'basic' | 'partnership' | 'standard' | 'premium' | 'pro';

interface PreviewProps {
  planType: PlanType;
  lawyerInfo: any;
}

export default function AdPreview({ planType, lawyerInfo }: PreviewProps) {
  // Map all paid plans to the new partnership style for consistency
  const isPartnership = true;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">모바일 노출 미리보기</h3>
          <p className="text-sm text-slate-500 mt-1">실제 앱에서 변호사님의 카드가 노출되는 모습입니다.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Live Preview</span>
        </div>
      </div>

      {/* Mobile Frame Container */}
      <div className="flex justify-center py-4">
        <div className="relative w-[320px] h-[580px] bg-slate-900 rounded-[3rem] p-3 shadow-2xl border-[8px] border-slate-800 overflow-hidden">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20" />
          
          {/* Screen Content */}
          <div className="w-full h-full bg-slate-50 rounded-[2.2rem] overflow-y-auto overflow-x-hidden relative pt-10 px-4 pb-8 custom-scrollbar">
            {/* Mock Header */}
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="flex-1 mx-4 h-8 bg-white rounded-full border border-slate-200 flex items-center px-3">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200" />
            </div>

            {/* Ad Card */}
            <div className="relative p-5 rounded-[2rem] border-2 border-brand-500 bg-white shadow-[0_20px_50px_rgba(37,99,235,0.15)] scale-[1.02] overflow-hidden">
              
              {/* 파트너십 배경 효과 */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-indigo-600" />
                <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '12px 12px' }} />
              </div>

              {/* 플랜별 태그 */}
              <div className="absolute -top-3 left-6 px-3 py-1 bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-[10px] font-black rounded-full flex items-center gap-1 shadow-lg z-10 animate-bounce-subtle">
                <Star className="w-3 h-3 fill-white" /> SOLO LAW PARTNER
              </div>

              <div className="flex gap-4 relative z-10">
                {/* 프로필 이미지 */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-brand-100 shadow-md transition-all">
                    <img 
                      src={lawyerInfo.photoURL || `https://picsum.photos/seed/${lawyerInfo.name || 'lawyer'}/200/200`} 
                      alt="프로필" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md border border-brand-50 animate-pulse-subtle">
                    <ShieldCheck className="w-5 h-5 text-brand-600 fill-brand-50" />
                  </div>
                </div>

                {/* 정보 영역 */}
                <div className="flex-grow space-y-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 truncate">
                      {lawyerInfo.firmName || '솔로로 법률사무소'}
                    </span>
                    <span className="text-[9px] font-bold text-brand-600 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" /> 10분 내 응답
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900 flex items-center gap-1 truncate">
                    {lawyerInfo.name || lawyerInfo.displayName || '박변호'} 변호사
                  </h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {lawyerInfo.specialties?.slice(0, 2).map((s: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 text-[9px] rounded-md font-bold transition-colors bg-brand-50 text-brand-700">#{s}</span>
                    )) || (
                      <>
                        <span className="px-2 py-0.5 text-[9px] rounded-md font-bold bg-brand-50 text-brand-700">#민사전문</span>
                        <span className="px-2 py-0.5 text-[9px] rounded-md font-bold bg-brand-50 text-brand-700">#손해배상</span>
                      </>
                    )}
                    <span className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] rounded-md font-bold shadow-sm">#실시간상담</span>
                  </div>
                </div>
              </div>

              {/* 하단 버튼 */}
              <div className="grid grid-cols-2 gap-2 mt-5 relative z-10">
                <button className="py-3 bg-slate-50 text-slate-600 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-slate-100 transition-colors border border-slate-100">
                  <MessageSquare className="w-3 h-3" /> 상세 프로필
                </button>
                <button className="py-3 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 shadow-brand-200">
                   <Phone className="w-3 h-3 fill-white" /> 직통 전화상담
                </button>
              </div>
            </div>

            {/* Mock Content Below */}
            <div className="mt-6 space-y-4 opacity-40">
              <div className="h-24 bg-white rounded-2xl border border-slate-200" />
              <div className="h-24 bg-white rounded-2xl border border-slate-200" />
            </div>
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-slate-700 rounded-full" />
        </div>
      </div>

      {/* 안내 문구 */}
      <div className="p-6 rounded-[2rem] border transition-all duration-500 bg-brand-50 border-brand-100 text-brand-900">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-xl shrink-0 bg-brand-100">
            <Star className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h5 className="font-bold text-sm mb-1">솔로로 파트너십 혜택</h5>
            <p className="text-xs leading-relaxed opacity-80">
              ✨ 검색 결과 최상단 고정 노출 및 전용 배지가 부여됩니다. 특히 '직통 전화상담' 버튼을 통해 잠재 고객과의 연결성이 350% 이상 향상됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
