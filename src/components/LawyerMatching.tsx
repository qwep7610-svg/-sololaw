import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, Clock, MapPin, Award, CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

interface Lawyer {
  id: string;
  name: string;
  firm: string;
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
}

interface LawyerMatchingProps {
  primaryCategory: string;
  keywords: string[];
  userCaseSummary: string;
  onSelectLawyer: (lawyer: Lawyer) => void;
  userLocation?: string;
}

export default function LawyerMatching({ primaryCategory, keywords, userCaseSummary, onSelectLawyer, userLocation: initialLocation }: LawyerMatchingProps) {
  const { user } = useAuth();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(initialLocation || '');

  // Helper to parse response time string to minutes
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
    const fetchAndMatchLawyers = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch User Location if not provided
        let currentCity = userLocation;
        if (!currentCity && user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().location) {
            currentCity = userDoc.data().location;
            setUserLocation(currentCity);
          }
        }

        // 2. Fetch Lawyers from Firestore
        const lawyersRef = collection(db, 'lawyers');
        const q = query(
          lawyersRef, 
          where('status', '==', 'approved'),
          limit(20)
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedLawyers: Lawyer[] = [];
        querySnapshot.forEach((doc) => {
          fetchedLawyers.push({ id: doc.id, ...doc.data() } as Lawyer);
        });

        // 4. Apply Matching Priority Algorithm
        // Weights: Paid Ad (100), Active (50), Local (40), Response Time (Up to 40), Specialty Match (20)
        const sortedLawyers = fetchedLawyers.sort((a, b) => {
          let scoreA = 0;
          let scoreB = 0;

          // Paid First
          if (a.isPaidAd) scoreA += 100;
          if (b.isPaidAd) scoreB += 100;

          // Active First (lastActiveAt within 24h)
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          if (a.lastActiveAt?.toMillis() > oneDayAgo) scoreA += 50;
          if (b.lastActiveAt?.toMillis() > oneDayAgo) scoreB += 50;

          // Location Match
          if (currentCity && a.location.includes(currentCity)) scoreA += 40;
          if (currentCity && b.location.includes(currentCity)) scoreB += 40;

          // Response Time Weight
          const timeA = parseResponseTimeToMinutes(a.avgResponseTime);
          const timeB = parseResponseTimeToMinutes(b.avgResponseTime);
          
          if (timeA <= 30) scoreA += 40;
          else if (timeA <= 60) scoreA += 30;
          else if (timeA <= 180) scoreA += 20;
          else if (timeA <= 1440) scoreA += 10;

          if (timeB <= 30) scoreB += 40;
          else if (timeB <= 60) scoreB += 30;
          else if (timeB <= 180) scoreB += 20;
          else if (timeB <= 1440) scoreB += 10;

          // Specialty Match
          if (a.specialties.some(s => s.includes(primaryCategory))) scoreA += 20;
          if (b.specialties.some(s => s.includes(primaryCategory))) scoreB += 20;

          // Rating/Review weight
          scoreA += (a.rating * 2) + (a.reviewCount / 10);
          scoreB += (b.rating * 2) + (b.reviewCount / 10);

          return scoreB - scoreA;
        });

        setLawyers(sortedLawyers.slice(0, 5)); // Show top 5
      } catch (error) {
        console.error("Error matching lawyers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndMatchLawyers();
  }, [primaryCategory, keywords, user, userLocation]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-slate-100 rounded-2xl w-full"></div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-slate-50 rounded-2xl w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lawyer Cards */}
      <div className="grid gap-4">
        {lawyers.map((lawyer, index) => (
          <motion.div
            key={lawyer.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`group relative bg-white border rounded-2xl p-5 transition-all hover:shadow-md hover:border-blue-300 cursor-pointer ${
              lawyer.isPaidAd ? 'border-blue-100 bg-blue-50/20' : 'border-slate-200'
            }`}
            onClick={() => onSelectLawyer(lawyer)}
          >
            {lawyer.isPaidAd && (
              <div className="absolute top-4 right-4 bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                AD
              </div>
            )}
            
            <div className="flex gap-5">
              {/* Profile Image */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200">
                  {lawyer.profileImageUrl ? (
                    <img src={lawyer.profileImageUrl} alt={lawyer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Award className="w-8 h-8" />
                    </div>
                  )}
                </div>
                {lawyer.rating >= 4.8 && (
                  <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white p-1 rounded-lg shadow-sm">
                    <Star className="w-3 h-3 fill-current" />
                  </div>
                )}
                {index === 0 && !lawyer.isPaidAd && (
                  <div className="absolute -top-2 -left-2 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-sm uppercase tracking-tighter">
                    Best
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#0F172A]">{lawyer.name} 변호사</h3>
                      <span className="text-[10px] text-slate-400 font-medium">{lawyer.qualification}</span>
                    </div>
                    <p className="text-xs text-slate-500">{lawyer.firm}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{lawyer.feePerReview.toLocaleString()}원</p>
                    <p className="text-[10px] text-slate-400">1건 검토 기준</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {lawyer.specialties.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md">
                      {tag}
                    </span>
                  ))}
                  {userLocation && lawyer.location.includes(userLocation) && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md border border-blue-100">
                      지역 일치
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>누적 {lawyer.reviewCount}건</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Star className="w-3 h-3 text-amber-400 fill-current" />
                    <span>{lawyer.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className={`w-3 h-3 ${parseResponseTimeToMinutes(lawyer.avgResponseTime) <= 60 ? 'text-emerald-500' : 'text-blue-400'}`} />
                    <span className={parseResponseTimeToMinutes(lawyer.avgResponseTime) <= 60 ? 'text-emerald-600 font-bold' : ''}>
                      평균 {lawyer.avgResponseTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <MapPin className={`w-3 h-3 ${userLocation && lawyer.location.includes(userLocation) ? 'text-blue-500' : 'text-slate-400'}`} />
                    <span className={userLocation && lawyer.location.includes(userLocation) ? 'text-blue-600 font-bold' : ''}>
                      {lawyer.location}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hover Action */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1 text-xs font-bold text-blue-600">
                상세보기 <MessageSquare className="w-3 h-3" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {lawyers.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-sm text-slate-400">현재 매칭 가능한 변호사가 없습니다.</p>
        </div>
      )}

      {/* Legal Notice */}
      <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl flex items-start gap-4">
        <ShieldCheck className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-xs text-slate-700 font-bold">변호사법 위반 방지를 위한 안내</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            본 정보는 지역별로 등록된 변호사 회원들의 유료 광고 정보를 포함하고 있습니다. 
            'SoloLaw'는 사건의 수임이나 알선에 관여하지 않으며, 사용자가 직접 변호사의 경력과 정보를 확인하여 상담 여부를 결정해야 합니다. 
            모든 상담 및 계약은 변호사와 사용자 간의 직거래로 이루어집니다.
          </p>
        </div>
      </div>
    </div>
  );
}
