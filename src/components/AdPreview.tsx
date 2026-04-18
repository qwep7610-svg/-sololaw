import React from 'react';
import { Star, ShieldCheck, MapPin, Scale, MessageSquare, Phone, Clock, Briefcase, CreditCard, ChevronRight } from 'lucide-react';

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
            <div className="relative bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(37,99,235,0.15)] scale-[1.02] flex flex-col group animate-fade-in-up">
              <div className="absolute top-4 right-4 z-10">
                <span className="text-[9px] bg-black/5 backdrop-blur-sm text-slate-500 px-2 py-1 rounded-full font-bold">유료 광고 포함</span>
              </div>

              <div className="p-5 flex-1 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shrink-0 relative overflow-hidden">
                    { (lawyerInfo.photo || lawyerInfo.photoURL || lawyerInfo.firmLogo) ? (
                      <img 
                        src={lawyerInfo.photo || lawyerInfo.photoURL || lawyerInfo.firmLogo} 
                        alt="프로필" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      "👨‍⚖️"
                    )}
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10">
                      <ShieldCheck className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[#0F172A] text-sm truncate">{lawyerInfo.name || lawyerInfo.displayName || '박변호'} 변호사</h4>
                      <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[10px] font-bold">4.9</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{lawyerInfo.firmName || "솔로로 법무법인"}</p>
                    <p className="text-[10px] text-slate-500 truncate">{lawyerInfo.experience || "10년 차 변호사"}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lawyerInfo.specialties?.slice(0, 2).map((s: string, i: number) => (
                        <span key={i} className="text-[9px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-100">#{s}</span>
                      )) || (
                        <span className="text-[9px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded border border-brand-100">#전문직전문</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Ad Content - Matching LawyerAdCard style */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-brand-700 leading-tight break-keep">
                    "{lawyerInfo.specialties?.length ? `${lawyerInfo.specialties[0]} 분쟁 해결,` : '의뢰인의 정당한 권리,'} AI가 돕고 제가 지켜드립니다."
                  </p>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-600 leading-relaxed break-keep">
                        {lawyerInfo.experience || '유명 법무법인 출신의 풍부한 실전 경험으로 사건의 핵심을 찌릅니다.'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-700 font-medium leading-relaxed break-keep">
                        {lawyerInfo.cases || '다양한 소송 사례를 통해 쌓은 노하우로 최선의 결과를 도출합니다.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{lawyerInfo.location || "서울 서초구"} (1.2km)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">50,000원</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-colors">
                  <Phone className="w-3.5 h-3.5" /> 전화 상담
                </button>
                <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 text-white text-[10px] font-bold hover:bg-brand-700 transition-colors">
                  상세 프로필 <ChevronRight className="w-3.5 h-3.5" />
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
            <h5 className="font-bold text-sm mb-1">SoloLaw Partnership 혜택</h5>
            <p className="text-xs leading-relaxed opacity-80">
              ✨ 검색 결과 최상단 고정 노출 및 전용 배지가 부여됩니다. 특히 '직통 전화상담' 버튼을 통해 잠재 고객과의 연결성이 350% 이상 향상됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
