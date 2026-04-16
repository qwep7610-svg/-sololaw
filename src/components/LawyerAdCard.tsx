import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, MessageSquare, Award, Briefcase, Star, ShieldCheck, Info, Filter, LayoutGrid, List, MapPin, Clock, CreditCard, ChevronRight, User, Loader2 } from 'lucide-react';
import { matchLawyersByKeywords, generateLawyerAdCard } from '../services/gemini';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface LawyerProfile {
  id: string;
  name: string;
  firmName?: string;
  firmLogo?: string | null;
  experience: string;
  cases: string;
  specialties: string[];
  message: string;
  phone: string;
  kakao: string;
  rating: number;
  reviewCount: number;
  location: string;
  distance: string;
  bidPrice: number;
  consultationFee: string;
  hasActiveSubscription?: boolean;
  adStatus?: string;
  adPlan?: string;
  priority?: number;
}

interface AdCardData {
  headline: string;
  experienceSummary: string;
  winningCases: string;
  commitment: string;
}

const MOCK_LAWYERS: LawyerProfile[] = [
  {
    id: "L1",
    name: "김철수 변호사",
    firmName: "법무법인 한결",
    experience: "사법연수원 35기 (15년 차)",
    cases: "부동산 보증금 반환 소송 200건 이상",
    specialties: ["부동산", "임대차", "보증금", "민사"],
    message: "의뢰인의 소중한 재산, 끝까지 찾아드립니다.",
    phone: "010-1234-5678",
    kakao: "lawyer_kim",
    rating: 4.9,
    reviewCount: 128,
    location: "서울 서초구",
    distance: "1.2km",
    bidPrice: 5000,
    consultationFee: "5만원 / 30분",
    hasActiveSubscription: true,
    adStatus: 'active',
    adPlan: 'partnership',
    priority: 2
  },
  {
    id: "L2",
    name: "이영희 변호사",
    firmName: "법률사무소 정성",
    experience: "변호사시험 5회 (8년 차)",
    cases: "상간자 위자료 청구 소송 승소 다수",
    specialties: ["이혼", "가사", "위자료", "손해배상"],
    message: "냉철한 법리 분석으로 최선의 결과를 약속합니다.",
    phone: "010-9876-5432",
    kakao: "lawyer_lee",
    rating: 4.8,
    reviewCount: 85,
    location: "서울 강남구",
    distance: "2.5km",
    bidPrice: 3000,
    consultationFee: "3만원 / 30분",
    hasActiveSubscription: true,
    adStatus: 'active',
    adPlan: 'partnership',
    priority: 1
  },
  {
    id: "L3",
    name: "박민준 변호사",
    firmName: "법무법인 태평양",
    experience: "사법연수원 40기 (10년 차)",
    cases: "대여금 및 채권추심 전문",
    specialties: ["채권추심", "금전분쟁", "형사", "대여금"],
    message: "복잡한 금전 문제, 명쾌하게 해결해 드립니다.",
    phone: "010-5555-4444",
    kakao: "lawyer_park",
    rating: 4.7,
    reviewCount: 64,
    location: "서울 송파구",
    distance: "0.8km",
    bidPrice: 4000,
    consultationFee: "4만원 / 30분",
    adStatus: 'active',
    adPlan: 'partnership',
    priority: 0
  },
  {
    id: "L4",
    name: "최지우 변호사",
    firmName: "법률사무소 봄",
    experience: "변호사시험 8회 (5년 차)",
    cases: "임대차 계약 분쟁 및 명도 소송",
    specialties: ["부동산", "임대차", "명도소송", "민사"],
    message: "젊은 감각으로 꼼꼼하게 사건을 챙깁니다.",
    phone: "010-1111-2222",
    kakao: "lawyer_choi",
    rating: 4.6,
    reviewCount: 42,
    location: "서울 서초구",
    distance: "1.5km",
    bidPrice: 2000,
    consultationFee: "무료 (첫 상담)",
    adStatus: 'active',
    adPlan: 'partnership',
    priority: 0
  }
];

import { Logo } from './Logo';

export default function LawyerAdCard({ caseSummary }: { caseSummary: string }) {
  const [matchedData, setMatchedData] = useState<{
    category: string;
    keywords: string[];
    lawyers: LawyerProfile[];
    disclaimer: string;
  } | null>(null);
  const [adContent, setAdContent] = useState<Record<string, AdCardData | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'distance' | 'experience' | 'bidPrice'>('bidPrice');
  const [userLocation, setUserLocation] = useState<string>('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Shuffle logic for fair exposure when conditions are equal
  const shuffle = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  useEffect(() => {
    async function performMatching() {
      setIsLoading(true);
      try {
        // 1. Fetch real lawyers from Firestore who have active ads
        const lawyersRef = collection(db, 'lawyers');
        const q = query(lawyersRef, where('adStatus', '==', 'active'), where('adPlan', '==', 'partnership'), limit(20));
        const querySnapshot = await getDocs(q);
        
        const firestoreLawyers: LawyerProfile[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '익명 변호사',
            firmName: data.firmName || '법률사무소',
            firmLogo: data.photo || data.firmLogo || null,
            experience: data.experience || '경력 정보 없음',
            cases: data.cases || '다수의 승소 사례 보유',
            specialties: data.specialties || ['민사', '형사'],
            message: data.message || '의뢰인의 권익을 위해 최선을 다합니다.',
            phone: data.phone || '010-0000-0000',
            kakao: data.kakao || '',
            rating: data.rating || 5.0,
            reviewCount: data.reviewCount || 0,
            location: data.location || '전국',
            distance: '계산 중',
            bidPrice: data.priority || 0, // Use priority as bidPrice for sorting
            consultationFee: data.reviewPrice ? `${data.reviewPrice.toLocaleString()}원` : '별도 문의',
            hasActiveSubscription: data.hasActiveSubscription,
            adPlan: data.adPlan,
            priority: data.priority || 0
          };
        });

        // Use mock lawyers as fallback if no real lawyers found (for demo)
        const lawyersToMatch = firestoreLawyers.length > 0 ? firestoreLawyers : MOCK_LAWYERS;

        const result = await matchLawyersByKeywords({
          caseSummary,
          lawyers: lawyersToMatch,
          userLocation: userLocation || undefined
        });
        
        if (result) {
          // 2. Randomized exposure within same priority tiers
          // Group by priority
          const grouped = (result.lawyers as LawyerProfile[]).reduce((acc, lawyer) => {
            const p = lawyer.priority || 0;
            if (!acc[p]) acc[p] = [];
            acc[p].push(lawyer);
            return acc;
          }, {} as Record<number, LawyerProfile[]>);

          // Shuffle each group and flatten
          const fairLawyers = Object.keys(grouped)
            .sort((a, b) => Number(b) - Number(a)) // High priority first
            .flatMap(p => shuffle(grouped[Number(p)]));

          setMatchedData({ ...result, lawyers: fairLawyers });

          // Generate ad content for matched lawyers in parallel
          await Promise.all(fairLawyers.map(async (lawyer) => {
            if (!adContent[lawyer.id]) {
              try {
                const content = await generateLawyerAdCard({
                  lawyerInfo: {
                    name: lawyer.name,
                    experience: lawyer.experience,
                    cases: lawyer.cases,
                    specialty: lawyer.specialties.join(', ')
                  },
                  caseType: result.category,
                  lawyerMessage: lawyer.message
                });
                if (content) {
                  setAdContent(prev => ({ ...prev, [lawyer.id]: content }));
                }
              } catch (error) {
                console.error(`Failed to generate ad for lawyer ${lawyer.id}:`, error);
              }
            }
          }));
        }
      } catch (error) {
        console.error("Error matching lawyers:", error);
      } finally {
        setIsLoading(false);
      }
    }

    performMatching();
  }, [caseSummary, userLocation]);

  const sortedLawyers = useMemo(() => {
    if (!matchedData) return [];
    return [...matchedData.lawyers].sort((a, b) => {
      if (sortBy === 'distance') return parseFloat(a.distance) - parseFloat(b.distance);
      if (sortBy === 'experience') return b.experience.localeCompare(a.experience);
      if (sortBy === 'bidPrice') return b.bidPrice - a.bidPrice;
      return 0;
    });
  }, [matchedData, sortBy]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-slate-50 rounded-3xl border border-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Location Selection Prompt */}
      <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 space-y-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-brand-50 rounded-2xl border border-brand-100">
              <MapPin className="w-6 h-6 text-brand-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-[#0F172A] font-serif">내 주변 변호사 맞춤 추천</h4>
              <p className="text-sm text-slate-500 font-medium">
                지역을 선택하시면 해당 지역에서 활동 중인 <span className="text-brand-600 font-bold">SoloLaw 파트너 변호사</span>를 우선 추천해 드립니다.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {['서울 서초구', '수원 영통구', '인천 미추홀구'].map((loc) => (
              <button
                key={loc}
                onClick={() => setUserLocation(loc)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                  userLocation === loc
                    ? 'bg-brand-600 text-white shadow-xl shadow-brand-200 scale-105'
                    : 'bg-slate-50 text-slate-500 hover:bg-white hover:border-brand-200 border border-transparent'
                }`}
              >
                {loc}
              </button>
            ))}
            <button 
              onClick={() => {
                const input = prompt('지역을 입력해 주세요 (예: 서울 서초구)');
                if (input) setUserLocation(input);
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-all"
            >
              직접 입력
            </button>
          </div>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-600" />
            <h3 className="text-lg font-bold text-[#0F172A] font-serif">관련 분야 변호사 정보</h3>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">AD</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            * 이 영역은 광고비를 지불한 변호사의 정보가 노출되는 구역입니다.
          </p>
          {matchedData && (
            <p className="text-xs text-slate-500">
              추출된 카테고리: <span className="font-bold text-brand-600">{matchedData.category}</span>
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-400'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['bidPrice', 'distance', 'experience'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sortBy === option 
                    ? 'bg-white text-brand-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {option === 'bidPrice' ? '추천순' : option === 'distance' ? '거리순' : '경력순'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedLawyers.map((lawyer) => (
            <motion.div
              key={lawyer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 hover:border-brand-300 transition-all duration-300 flex flex-col relative group"
            >
              <div className="absolute top-4 right-4 z-10">
                <span className="text-[9px] bg-black/5 backdrop-blur-sm text-slate-500 px-2 py-1 rounded-full font-bold">유료 광고 포함</span>
              </div>

              <div className="p-6 flex-1 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shrink-0 group-hover:bg-brand-50 transition-colors relative overflow-hidden">
                    {lawyer.firmLogo ? (
                      <img src={lawyer.firmLogo} alt={lawyer.firmName || lawyer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      "👨‍⚖️"
                    )}
                    {lawyer.hasActiveSubscription && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10" title="SoloLaw 파트너 변호사">
                        <ShieldCheck className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[#0F172A]">{lawyer.name}</h4>
                      {lawyer.adPlan === 'partnership' && (
                        <div className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[9px] font-bold border border-indigo-100">
                          <ShieldCheck className="w-3 h-3" />
                          공식 파트너
                        </div>
                      )}
                      {lawyer.hasActiveSubscription && (
                        <span className="text-[9px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">파트너</span>
                      )}
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-xs font-bold">{lawyer.rating}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lawyer.firmName || "법률사무소"}</p>
                    <p className="text-xs text-slate-500">{lawyer.experience}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lawyer.specialties.slice(0, 3).map(s => (
                        <span key={s} className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-100">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 min-h-[140px] flex flex-col justify-center">
                  {adContent[lawyer.id] ? (
                    <>
                      <p className="text-sm font-bold text-brand-700 leading-tight break-keep">
                        "{adContent[lawyer.id]!.headline}"
                      </p>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex gap-2">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-slate-600 leading-relaxed break-keep">
                            {adContent[lawyer.id]!.experienceSummary}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-slate-700 font-medium leading-relaxed break-keep">
                            {adContent[lawyer.id]!.winningCases}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                      <div className="h-12 bg-slate-50 rounded" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[11px]">{lawyer.location} ({lawyer.distance})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">{lawyer.consultationFee}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
                <a
                  href={`tel:${lawyer.phone}`}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" /> 전화 상담
                </a>
                <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors">
                  상세 프로필 <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Table View (Comparison Interface) */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">변호사 정보</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">경력 및 전문성</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">위치 및 비용</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedLawyers.map((lawyer) => (
                <tr key={lawyer.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">👨‍⚖️</div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{lawyer.name}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded font-bold">AD</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500 mt-0.5">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-[11px] font-bold">{lawyer.rating}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-700 font-medium">{lawyer.experience}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{lawyer.cases}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <MapPin className="w-3 h-3" />
                        <span className="text-[11px]">{lawyer.location} ({lawyer.distance})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <CreditCard className="w-3 h-3" />
                        <span className="text-[11px]">{lawyer.consultationFee}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${lawyer.phone}`}
                        className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                        title="전화하기"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <button
                        className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                        title="상세보기"
                      >
                        <User className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legal Disclaimer */}
      <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl flex items-start gap-4">
        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-xs text-slate-700 font-bold">광고 안내 및 법적 고지</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {matchedData?.disclaimer}
            <br /><br />
            본 정보는 지역별로 등록된 변호사 회원들의 유료 광고 정보를 포함하고 있습니다. 
            'SoloLaw'는 사건의 수임이나 알선에 관여하지 않으며, 사용자가 직접 변호사의 경력과 정보를 확인하여 상담 여부를 결정해야 합니다. 
            모든 상담 및 계약은 변호사와 사용자 간의 직거래로 이루어집니다.
          </p>
        </div>
      </div>
    </div>
  );
}
