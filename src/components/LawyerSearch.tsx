import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Scale, ShieldCheck, Star, Clock, CheckCircle2, MessageSquare, Award, ChevronRight, Info, Filter, X, Sparkles } from 'lucide-react';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { generateMatchingRecommendation } from '../services/gemini';

interface Lawyer {
  id: string;
  name: string;
  firm: string;
  firmName?: string;
  firmLogo?: string | null;
  qualification: string;
  specialties: string[];
  reviewCount: number;
  rating: number;
  avgResponseTime: string;
  location: string;
  feePerReview: number;
  isPaidAd?: boolean;
  lastActiveAt?: any;
  profileImageUrl?: string;
  hasActiveSubscription?: boolean;
  adStatus?: string;
  adPlan?: string;
  priority?: number;
}

const CATEGORIES = [
  '전체', '민사', '형사', '이혼/가사', '부동산/임대차', '상속', '성범죄', '교통사고', '근로/노동', '기업/상사'
];

const REGIONS = [
  '전국', '서울 서초구', '서울 강남구', '서울 송파구', '경기 수원시', '경기 성남시', '인천', '부산', '대구', '대전', '광주'
];

import { Logo } from './Logo';

export default function LawyerSearch({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [allLawyers, setAllLawyers] = useState<Lawyer[]>([]);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedRegion, setSelectedRegion] = useState('전국');
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendationText, setRecommendationText] = useState('');

  const parseResponseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 9999;
    const num = parseInt(timeStr.replace(/[^0-9]/g, ''));
    if (isNaN(num)) return 9999;
    if (timeStr.includes('분')) return num;
    if (timeStr.includes('시간')) return num * 60;
    if (timeStr.includes('일')) return num * 1440;
    return num;
  };

  useEffect(() => {
    const fetchLawyers = async () => {
      setIsLoading(true);
      try {
        const lawyersRef = collection(db, 'lawyers');
        const q = query(lawyersRef, where('status', '==', 'approved'), limit(100));
        const querySnapshot = await getDocs(q);
        const fetchedLawyers: Lawyer[] = [];
        querySnapshot.forEach((doc) => {
          fetchedLawyers.push({ id: doc.id, ...doc.data() } as Lawyer);
        });
        setAllLawyers(fetchedLawyers);
      } catch (error) {
        console.error("Error fetching lawyers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLawyers();
  }, []);

  useEffect(() => {
    // Filtering logic
    let filtered = allLawyers.filter(lawyer => {
      const categoryMatch = selectedCategory === '전체' || lawyer.specialties.some(s => s.includes(selectedCategory));
      const regionMatch = selectedRegion === '전국' || lawyer.location.includes(selectedRegion);
      
      const queryMatch = !searchQuery || 
                         lawyer.name.includes(searchQuery) || 
                         lawyer.firm.includes(searchQuery) || 
                         lawyer.specialties.some(s => s.includes(searchQuery)) ||
                         lawyer.location.includes(searchQuery);
      return categoryMatch && regionMatch && queryMatch;
    });

    // Sorting: Priority -> Subscription -> Rating
    filtered.sort((a, b) => {
      // Only apply priority/subscription sorting if adStatus is active
      const isAActive = a.adStatus === 'active';
      const isBActive = b.adStatus === 'active';

      // 1. Priority (Ad Plan)
      const priorityA = isAActive ? (a.priority || 0) : 0;
      const priorityB = isBActive ? (b.priority || 0) : 0;
      if (priorityA !== priorityB) return priorityB - priorityA;

      // 2. Subscription Status
      const aSub = (isAActive && a.hasActiveSubscription) ? 1 : 0;
      const bSub = (isBActive && b.hasActiveSubscription) ? 1 : 0;
      if (aSub !== bSub) return bSub - aSub;

      // 3. Rating
      return b.rating - a.rating;
    });

    // Randomized exposure within same priority tiers for fairness
    const grouped = filtered.reduce((acc, lawyer) => {
      const p = lawyer.priority || 0;
      if (!acc[p]) acc[p] = [];
      acc[p].push(lawyer);
      return acc;
    }, {} as Record<number, Lawyer[]>);

    const fairLawyers = Object.keys(grouped)
      .sort((a, b) => Number(b) - Number(a))
      .flatMap(p => {
        const arr = grouped[Number(p)];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      });

    setLawyers(fairLawyers);

    const fetchRecommendation = async () => {
      // AI Recommendation for the search
      if (selectedCategory !== '전체' || selectedRegion !== '전국') {
        const rec = await generateMatchingRecommendation({
          userNickname: user?.displayName || '사용자',
          primaryCategory: selectedCategory === '전체' ? '다양한' : selectedCategory,
          keywords: [selectedCategory, searchQuery].filter(Boolean),
          userLocation: selectedRegion === '전국' ? undefined : selectedRegion
        });
        setRecommendationText(rec);
      } else {
        setRecommendationText('SoloLaw 파트너 변호사들은 대한변호사협회 인증을 거친 신뢰할 수 있는 전문가들입니다.');
      }
    };

    fetchRecommendation();
  }, [allLawyers, selectedCategory, selectedRegion, searchQuery, user]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-[0.2em]">
            <Scale className="w-4 h-4" /> Lawyer Discovery
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] font-serif tracking-tight">내 주변 법률 전문가</h2>
          <p className="text-slate-500 text-sm font-medium">지역과 분야를 선택하여 가장 적합한 변호사를 직접 확인하세요.</p>
        </div>
        <button 
          onClick={onBack}
          className="self-start md:self-center px-5 py-2.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 rounded-2xl transition-all flex items-center gap-2 text-sm font-bold shadow-sm"
        >
          <X className="w-4 h-4" /> 닫기
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 space-y-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="변호사 이름, 로펌명, 또는 전문 분야 검색..."
              className="w-full pl-14 pr-6 py-4.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-500/20 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none text-sm font-medium"
            />
          </div>
          <div className="relative group">
            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
            <select 
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="pl-12 pr-10 py-4.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-500/20 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none text-sm appearance-none font-bold text-slate-700 cursor-pointer"
            >
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                selectedCategory === cat 
                  ? 'bg-brand-600 text-white shadow-xl shadow-brand-200 scale-105' 
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* AI Recommendation */}
      <AnimatePresence>
        {recommendationText && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-gradient-to-br from-brand-600 to-indigo-700 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-brand-200 group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-white/20 transition-colors" />
            <div className="relative z-10 flex items-start gap-6">
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/30">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-white font-bold text-lg font-serif tracking-tight">AI 맞춤 추천 가이드</h3>
                <p className="text-brand-50 text-sm md:text-base leading-relaxed font-medium">
                  {recommendationText}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-slate-500">
            총 <span className="font-bold text-brand-600">{lawyers.length}명</span>의 변호사가 검색되었습니다.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3 h-3" /> 추천순 정렬
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-slate-100 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {lawyers.map((lawyer, index) => (
              <motion.div
                key={lawyer.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group relative bg-white border rounded-3xl p-6 transition-all hover:shadow-xl hover:border-brand-300 cursor-pointer ${
                  lawyer.hasActiveSubscription ? 'border-brand-100 bg-brand-50/10' : 'border-slate-200'
                }`}
              >
                {lawyer.adStatus === 'active' && lawyer.hasActiveSubscription && (
                  <div className="absolute top-6 right-6 flex items-center gap-1.5 bg-brand-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                    <ShieldCheck className="w-3 h-3" /> 파트너
                  </div>
                )}
                
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Profile Image / Firm Logo */}
                  <div className="relative shrink-0 mx-auto md:mx-0">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                      {lawyer.firmLogo ? (
                        <img src={lawyer.firmLogo} alt={lawyer.firmName || lawyer.firm} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : lawyer.profileImageUrl ? (
                        <img src={lawyer.profileImageUrl} alt={lawyer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Award className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    {lawyer.adPlan === 'partnership' && (
                      <div className="absolute -top-2 -left-2 bg-indigo-600 text-white p-1.5 rounded-xl shadow-lg border-2 border-white z-10" title="솔로로 공식 파트너">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    )}
                    {lawyer.rating >= 4.8 && (
                      <div className="absolute -bottom-2 -right-2 bg-amber-400 text-white p-1.5 rounded-xl shadow-md">
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-[#0F172A]">{lawyer.name} 변호사</h3>
                          <span className="text-xs text-slate-400 font-medium">{lawyer.qualification}</span>
                        </div>
                        <p className="text-sm text-slate-500 font-medium">{lawyer.firmName || lawyer.firm}</p>
                      </div>
                      <div className="md:text-right">
                        <p className="text-lg font-bold text-brand-600">{lawyer.feePerReview.toLocaleString()}원</p>
                        <p className="text-[10px] text-slate-400">1건 검토 기준</p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {lawyer.specialties.map((tag, i) => (
                        <span key={`${lawyer.id}-tag-${i}`} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-lg group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-slate-50">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>누적 <strong>{lawyer.reviewCount}건</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Star className="w-4 h-4 text-amber-400 fill-current" />
                        <span><strong>{lawyer.rating}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className={`w-4 h-4 ${parseResponseTimeToMinutes(lawyer.avgResponseTime) <= 60 ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <span className={parseResponseTimeToMinutes(lawyer.avgResponseTime) <= 60 ? 'text-emerald-600 font-bold' : ''}>
                          평균 {lawyer.avgResponseTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className={`w-4 h-4 ${selectedRegion !== '전국' && lawyer.location.includes(selectedRegion) ? 'text-brand-500' : 'text-slate-400'}`} />
                        <span className={selectedRegion !== '전국' && lawyer.location.includes(selectedRegion) ? 'text-brand-600 font-bold' : ''}>
                          {lawyer.location}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover Action */}
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-100">
                    상담 신청하기 <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {lawyers.length === 0 && !isLoading && (
          <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 font-bold">검색 결과가 없습니다.</p>
              <p className="text-xs text-slate-400">지역이나 분야를 변경하여 다시 검색해 보세요.</p>
            </div>
            <button 
              onClick={() => {
                setSelectedCategory('전체');
                setSelectedRegion('전국');
                setSearchQuery('');
              }}
              className="text-brand-600 text-xs font-bold hover:underline"
            >
              필터 초기화
            </button>
          </div>
        )}
      </div>

      {/* Legal Notice */}
      <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl flex items-start gap-4">
        <Info className="w-6 h-6 text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-3">
          <p className="text-sm text-slate-700 font-bold">변호사법 위반 방지를 위한 안내 및 법적 고지</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            본 정보는 지역별로 등록된 변호사 회원들의 유료 광고 정보를 포함하고 있습니다. 
            'SoloLaw'는 사건의 수임이나 알선에 관여하지 않으며, 사용자가 직접 변호사의 경력과 정보를 확인하여 상담 여부를 결정해야 합니다. 
            모든 상담 및 계약은 변호사와 사용자 간의 직거래로 이루어집니다.
            <br /><br />
            플랫폼은 변호사법 제34조(변호사 아닌 자와의 동업 금지 등)를 준수하며, 특정 변호사를 추천하거나 승소를 보장하지 않습니다. 
            상담료 및 수임료는 변호사 사무실의 정책에 따라 달라질 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
