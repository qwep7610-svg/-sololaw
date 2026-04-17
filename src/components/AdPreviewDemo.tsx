import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Smartphone, Monitor, Layout, Sparkles, ShieldCheck, Phone, MapPin, Scale, MessageSquare, Star, Briefcase, Award, ExternalLink } from 'lucide-react';
import AdPreview from './AdPreview';
import { db, doc, getDoc } from '../lib/firebase';

interface AdPreviewDemoProps {
  onBack: () => void;
}

export default function AdPreviewDemo({ onBack }: AdPreviewDemoProps) {
  const [activePlan, setActivePlan] = useState<'partnership'>('partnership');
  const [viewType, setViewType] = useState<'mobile' | 'web'>('mobile');
  const [paymentSettings, setPaymentSettings] = useState<any>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const payRef = doc(db, 'app_settings', 'payment');
        const paySnap = await getDoc(payRef);
        if (paySnap.exists()) {
          setPaymentSettings(paySnap.data());
        }
      } catch (error) {
        console.error("Error loading payment settings:", error);
      }
    }
    loadSettings();
  }, []);

  const mockLawyer = {
    name: '박정환',
    uid: 'demo-lawyer-id',
    location: '서울 서초구',
    specialties: ['민사', '형사', '가사'],
    description: '15년 경력의 베테랑 변호사가 당신의 권리를 지켜드립니다. 정확한 분석과 전략으로 최선의 결과를 약속합니다.',
    photoURL: 'https://picsum.photos/seed/lawyer1/200/200',
    reviewPrice: 50000,
    status: 'approved'
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">광고 노출 미리보기 데모</h1>
              <p className="text-sm text-slate-500">실제 서비스에서 광고가 어떻게 노출되는지 확인하세요.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Controls */}
          <div className="space-y-8">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <Layout className="w-7 h-7 text-brand-600" />
                광고 플랜
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                <div
                  className="p-6 rounded-3xl border-2 border-brand-600 bg-brand-50 shadow-lg shadow-brand-100/20 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-600/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-1 rounded-lg uppercase bg-brand-600 text-white">Partnership</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">
                          <Sparkles className="w-3 h-3" /> BEST
                        </span>
                      </div>
                      <span className="text-lg font-bold text-slate-900">월 {(paymentSettings?.ad_plans?.partnership || 99000).toLocaleString()}원</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">SoloLaw Partnership</h3>
                    <p className="text-sm text-slate-500 mt-1">최상단 고정 노출, 강조 UI, 직통 전화 버튼 및 공식 파트너 배지 제공</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/20">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                {viewType === 'mobile' ? (
                  <><Smartphone className="w-6 h-6 text-brand-400" /> 모바일 노출 특징</>
                ) : (
                  <><Monitor className="w-6 h-6 text-brand-400" /> 웹페이지 노출 특징</>
                )}
              </h3>
              <ul className="space-y-4 text-slate-400 text-sm">
                {viewType === 'mobile' ? (
                  <>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-brand-400" />
                      </div>
                      <span><strong>실제 기기 사이즈 반영:</strong> 390x844 (iPhone 13/14 Pro) 해상도 기준으로 렌더링됩니다.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-brand-400" />
                      </div>
                      <span><strong>인터랙티브 요소:</strong> 프리미엄 플랜의 경우 전화 상담 버튼이 강조되어 클릭률이 평균 3배 높습니다.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-brand-400" />
                      </div>
                      <span><strong>신뢰도 향상:</strong> ShieldCheck 아이콘과 전문 배지가 사용자에게 신뢰감을 줍니다.</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-brand-400" />
                      </div>
                      <span><strong>데스크탑 최적화:</strong> 넓은 화면을 활용하여 변호사의 경력과 승소 사례를 더 상세하게 노출합니다.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-brand-400" />
                      </div>
                      <span><strong>검색 결과 상단 고정:</strong> 프리미엄/스탠다드 플랜은 검색 결과 최상단에 고정되어 압도적인 노출량을 확보합니다.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-brand-400" />
                      </div>
                      <span><strong>브랜드 이미지 강화:</strong> 로고와 전문 분야 태그가 강조되어 변호사님의 브랜딩 효과를 극대화합니다.</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setViewType('mobile')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewType === 'mobile' ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-4 h-4" /> 모바일
              </button>
              <button 
                onClick={() => setViewType('web')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewType === 'web' ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Monitor className="w-4 h-4" /> 웹페이지
              </button>
            </div>

            <div className="w-full sticky top-32">
              <div className="mb-4 text-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Live {viewType === 'mobile' ? 'Mobile' : 'Webpage'} Preview
                </span>
              </div>
              
              {viewType === 'mobile' ? (
                <div className="flex justify-center">
                  <AdPreview 
                    planType={activePlan} 
                    lawyerInfo={mockLawyer} 
                  />
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
                  {/* Browser Header Mock */}
                  <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-4">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] text-slate-400 flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3" /> https://sololaw.ai/search?q=민사소송
                    </div>
                  </div>

                  {/* Search Results Content Mock */}
                  <div className="p-8 space-y-8">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-brand-600" />
                        <h3 className="text-lg font-bold text-[#0F172A] font-serif">관련 분야 추천 변호사</h3>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">AD</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full" />
                        <div className="w-16 h-2 bg-slate-50 rounded-full" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {/* The Active Plan Card */}
                      <motion.div
                        key={activePlan}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`border rounded-3xl overflow-hidden transition-all duration-300 flex flex-col md:flex-row relative group ${
                          activePlan === 'partnership' ? 'border-brand-300 shadow-xl shadow-brand-100/20 ring-1 ring-brand-100' : 'border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="p-6 flex-1 flex flex-col md:flex-row gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl shrink-0 relative overflow-hidden">
                            <img src={mockLawyer.photoURL} alt={mockLawyer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            {activePlan === 'partnership' && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10">
                                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h4 className="text-xl font-bold text-[#0F172A]">{mockLawyer.name} 변호사</h4>
                              {activePlan === 'partnership' && (
                                <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-[10px] font-bold border border-indigo-100 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" /> 솔로로 공식 파트너
                                </span>
                              )}
                              <div className="flex items-center gap-1 text-amber-500">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="text-sm font-bold">4.9</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {mockLawyer.specialties.map(s => (
                                <span key={s} className="text-[10px] bg-slate-50 text-slate-600 px-2 py-1 rounded-lg border border-slate-100 font-medium">{s}</span>
                              ))}
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm font-bold text-brand-700 leading-tight">
                                "15년 경력의 베테랑 변호사가 당신의 권리를 지켜드립니다."
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex gap-2">
                                  <Briefcase className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                  <p className="text-xs text-slate-600 leading-relaxed">
                                    민사/형사/가사 전문, 1,000건 이상의 상담 실적 보유
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <ShieldCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                    부동산 보증금 반환 소송 승소율 95% 기록
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                             <div className="md:w-48 flex flex-col justify-between border-l border-slate-100 pl-6 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-slate-500">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="text-xs">{mockLawyer.location}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-500">
                                <Scale className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">상담료 50,000원</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {activePlan === 'partnership' && (
                                <button className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-100">
                                  <Phone className="w-3.5 h-3.5" /> 전화 상담
                                </button>
                              )}
                              <button className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                상세 프로필 <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Mock Other Results */}
                      <div className="opacity-40 pointer-events-none space-y-6 pt-4">
                        <div className="h-4 bg-slate-100 rounded w-1/4" />
                        {[1, 2, 3].map(i => (
                          <div key={i} className="border border-slate-100 rounded-3xl p-6 flex gap-6">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl" />
                            <div className="flex-1 space-y-3">
                              <div className="h-4 bg-slate-100 rounded w-1/3" />
                              <div className="h-3 bg-slate-50 rounded w-1/2" />
                              <div className="h-12 bg-slate-50 rounded w-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
