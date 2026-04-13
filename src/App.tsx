import React, { useState, lazy, Suspense, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scale, FileText, MessageSquare, Info, ChevronRight, Gavel, History, ShieldAlert, ListOrdered, TrendingUp, Building2, Mail, LogIn, LogOut, User as UserIcon, Loader2, Calculator, Heart, Menu, X, ShieldCheck, Camera, UserPlus, Briefcase, Clock, XCircle, MapPin, Sparkles, CreditCard, Activity } from 'lucide-react';
import LitigationManager from './components/LitigationManager';
import LawyerAdCard from './components/LawyerAdCard';
import { useAuth } from './lib/AuthContext';
import { db, doc, onSnapshot, handleFirestoreError, OperationType } from './lib/firebase';
import { useNavigation, View } from './hooks/useNavigation';
import ProtectedRoute from './components/ProtectedRoute';

import { Logo } from './components/Logo';
import Breadcrumbs from './components/Breadcrumbs';

// Lazy loaded components for code splitting
const ComplaintWizard = lazy(() => import('./components/ComplaintWizard'));
const DocumentSummarizer = lazy(() => import('./components/DocumentSummarizer'));
const ComplaintHistory = lazy(() => import('./components/ComplaintHistory'));
const CorrectionGuard = lazy(() => import('./components/CorrectionGuard'));
const AutoExhibit = lazy(() => import('./components/AutoExhibit'));
const LitigationCostCalculator = lazy(() => import('./components/LitigationCostCalculator'));
const AdminAppealWizard = lazy(() => import('./components/AdminAppealWizard'));
const DemandLetterWizard = lazy(() => import('./components/DemandLetterWizard'));
const DivorceWizard = lazy(() => import('./components/DivorceWizard'));
const LawyerRegistration = lazy(() => import('./components/LawyerRegistration'));
const AuthWizard = lazy(() => import('./components/AuthWizard'));
const SecuritySettings = lazy(() => import('./components/SecuritySettings'));
const TermsOfService = lazy(() => import('./components/TermsOfService'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const CustomerCenter = lazy(() => import('./components/CustomerCenter'));
const LawyerReviewService = lazy(() => import('./components/LawyerReviewService'));
const LawyerSearch = lazy(() => import('./components/LawyerSearch'));
const SubscriptionManager = lazy(() => import('./components/SubscriptionManager'));
const LitigationTypeFinder = lazy(() => import('./components/LitigationTypeFinder'));
const AboutUs = lazy(() => import('./components/AboutUs'));
const Onboarding = lazy(() => import('./components/Onboarding'));

export default function App() {
  const { view, navigateTo } = useNavigation('home');
  const [complaintInitialData, setComplaintInitialData] = useState<any>(() => {
    const saved = sessionStorage.getItem('SOLOLAW_COMPLAINT_INITIAL');
    return saved ? JSON.parse(saved) : null;
  });
  const [costCalculatorData, setCostCalculatorData] = useState<any>(null);
  const { user, loading, logout } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authType, setAuthType] = useState<'user' | 'lawyer' | undefined>(undefined);
  const [showTerms, setShowTerms] = useState(false);
  const [initialPolicyTab, setInitialPolicyTab] = useState<'terms' | 'privacy' | 'legal'>('terms');
  const [branding, setBranding] = useState<{ 
    appName: string; 
    appSubtext: string; 
    logoUrl: string | null;
    heroTitle?: string;
    heroDescription?: string;
    heroTitleSize?: number;
    heroTitleFont?: 'serif' | 'sans';
    heroDescriptionSize?: number;
    heroDescriptionFont?: 'serif' | 'sans';
    services?: any[];
    values?: any[];
  }>({
    appName: 'SoloLaw',
    appSubtext: 'SoloLaw 도우미',
    logoUrl: null,
    heroTitle: '어렵고 복잡한 법률 절차,\n이제 SoloLaw AI가 해결해 드립니다.',
    heroDescription: '변호사 없이도 완벽하게. 일상어로 설명하면 전문가 수준의 법률 문서를 즉시 생성합니다.\n지금 바로 등록하고 당신만의 스마트한 법률 도우미를 만나보세요.',
    heroTitleSize: 60,
    heroTitleFont: 'serif',
    heroDescriptionSize: 18,
    heroDescriptionFont: 'sans',
    services: [],
    values: []
  });

  const startComplaintWizard = (type?: string) => {
    // Map generic type to valid LitigationType
    let mappedType: any = type || null;
    if (type === '일반') mappedType = 'other';
    
    const initialData = { 
      type: mappedType, 
      timestamp: new Date(),
      location: '서울 성북구' // 대표님 사무실 인근 관할 추천용 기본값
    };
    setComplaintInitialData(initialData);
    sessionStorage.setItem('SOLOLAW_COMPLAINT_INITIAL', JSON.stringify(initialData));
    navigateTo('complaint');
  };

  useEffect(() => {
    const docRef = doc(db, 'app_settings', 'branding');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBranding({
          appName: data.appName || 'SoloLaw',
          appSubtext: data.appSubtext || 'SoloLaw 도우미',
          logoUrl: data.logoUrl || null,
          heroTitle: data.heroTitle || '어렵고 복잡한 법률 절차,\n이제 SoloLaw AI가 해결해 드립니다.',
          heroDescription: data.heroDescription || '변호사 없이도 완벽하게. 일상어로 설명하면 전문가 수준의 법률 문서를 즉시 생성합니다.\n지금 바로 등록하고 당신만의 스마트한 법률 도우미를 만나보세요.',
          heroTitleSize: data.heroTitleSize || 60,
          heroTitleFont: data.heroTitleFont || 'serif',
          heroDescriptionSize: data.heroDescriptionSize || 18,
          heroDescriptionFont: data.heroDescriptionFont || 'sans',
          services: data.services || [],
          values: data.values || []
        });
      }
    }, (error) => {
      console.error("Error fetching branding:", error);
      handleFirestoreError(error, OperationType.GET, 'app_settings/branding');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('SOLOLAW_ONBOARDING_SEEN');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingClose = () => {
    localStorage.setItem('SOLOLAW_ONBOARDING_SEEN', 'true');
    setShowOnboarding(false);
  };

  const handleCalculateCostFromHistory = (data: any) => {
    setCostCalculatorData(data);
    navigateTo('cost');
  };

  const memoizedBranding = useMemo(() => branding, [branding]);
  const memoizedUser = useMemo(() => user, [user]);

  const renderMainContent = () => {
    if (loading) {
      return (
        <div key="loading" className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-brand-600 animate-spin" />
          <p className="text-slate-500 font-medium">사용자 정보를 불러오는 중...</p>
        </div>
      );
    }

    if (memoizedUser && !memoizedUser.isRegistered) {
      return (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="py-12"
        >
          <AuthWizard 
            onComplete={(type) => {
              if (type === 'lawyer') navigateTo('lawyer_reg');
              else navigateTo('home');
            }}
            onBack={() => logout()}
            initialType={memoizedUser.role === 'lawyer' ? 'lawyer' : 'user'}
          />
        </motion.div>
      );
    }

    if (showAuth) {
      return (
        <motion.div
          key="auth"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="py-12"
        >
          <AuthWizard 
            onComplete={(type) => {
              setShowAuth(false);
              setAuthType(undefined);
              if (type === 'lawyer') navigateTo('lawyer_reg');
            }}
            onBack={() => {
              setShowAuth(false);
              setAuthType(undefined);
            }}
            initialType={authType}
          />
        </motion.div>
      );
    }

    if (view === 'home') {
      return (
        <motion.div
          key="home"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-12 py-12"
        >
          <div className="text-center space-y-8 max-w-4xl mx-auto py-16 px-10 rounded-[3rem] bg-white border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-brand-600 to-indigo-400" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-50 rounded-full blur-3xl opacity-40 pointer-events-none group-hover:opacity-60 transition-opacity" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-40 pointer-events-none group-hover:opacity-60 transition-opacity" />
            
            <div className="relative z-10 space-y-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 rounded-full text-xs font-bold tracking-wider uppercase border border-brand-100"
              >
                <Sparkles className="w-4 h-4" /> AI 기반 법률 솔루션
              </motion.div>
              
              <h2 
                className={`font-black text-[#0F172A] leading-[1.15] tracking-tight whitespace-pre-line ${memoizedBranding.heroTitleFont === 'sans' ? 'font-sans' : 'font-serif'}`}
                style={{ fontSize: `${memoizedBranding.heroTitleSize || 60}px` }}
              >
                {memoizedBranding.heroTitle?.split('SoloLaw AI').map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">SoloLaw AI</span>
                    )}
                  </span>
                ))}
              </h2>
              
              <p 
                className={`text-[#64748B] max-w-2xl mx-auto leading-relaxed whitespace-pre-line ${memoizedBranding.heroDescriptionFont === 'serif' ? 'font-serif' : 'font-sans'}`}
                style={{ fontSize: `${memoizedBranding.heroDescriptionSize || 18}px` }}
              >
                {memoizedBranding.heroDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-12 relative z-10 max-w-3xl mx-auto">
              <motion.button 
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (memoizedUser) {
                    startComplaintWizard();
                  } else {
                    setAuthType('user');
                    setShowAuth(true);
                  }
                }}
                className="group p-8 rounded-[2.5rem] bg-white border-2 border-slate-100 hover:border-brand-600 hover:shadow-2xl transition-all text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                <div className="relative z-10 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-100">
                    <UserIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">일반 사용자</h3>
                    <p className="text-slate-500 mt-2 leading-relaxed text-sm">
                      나홀로 소송을 준비하시나요?<br />
                      AI 도우미와 함께 소장을 작성해 보세요.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-brand-600 font-bold pt-2">
                    {memoizedUser ? '소장 작성 시작하기' : '지금 바로 등록'} <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.button>

              {!memoizedUser ? (
                <motion.button 
                  whileHover={{ y: -5, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setAuthType('lawyer');
                    setShowAuth(true);
                  }}
                  className="group p-8 rounded-[2.5rem] bg-slate-900 border-2 border-slate-800 hover:border-brand-500 hover:shadow-2xl transition-all text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                  <div className="relative z-10 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-100">
                      <Briefcase className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">변호사 / 전문가</h3>
                      <p className="text-slate-400 mt-2 leading-relaxed text-sm">
                        새로운 의뢰인을 찾고 계신가요?<br />
                        전문가 프로필을 등록하고 활동해 보세요.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-brand-400 font-bold pt-2">
                      전문가 등록하기 <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.button>
              ) : memoizedUser.role === 'lawyer' ? (
                <motion.button 
                  whileHover={{ y: -5, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigateTo('lawyer_review')}
                  className="group p-8 rounded-[2.5rem] bg-slate-900 border-2 border-slate-800 hover:border-brand-500 hover:shadow-2xl transition-all text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                  <div className="relative z-10 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-100">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">서류 검토하기</h3>
                      <p className="text-slate-400 mt-2 leading-relaxed text-sm">
                        의뢰인이 작성한 서류를 검토하고<br />
                        수익을 창출해 보세요.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-brand-400 font-bold pt-2">
                      검토 요청 확인 <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.button>
              ) : (
                <motion.button 
                  whileHover={{ y: -5, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigateTo('history')}
                  className="group p-8 rounded-[2.5rem] bg-slate-50 border-2 border-slate-100 hover:border-brand-600 hover:shadow-2xl transition-all text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                  <div className="relative z-10 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center shadow-lg shadow-slate-200">
                      <History className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">내 보관함</h3>
                      <p className="text-slate-500 mt-2 leading-relaxed text-sm">
                        작성 중이거나 완료된<br />
                        모든 문서를 확인하세요.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 font-bold pt-2">
                      보관함 가기 <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.button>
              )}
            </div>
          </div>

          <div className="max-w-4xl mx-auto w-full">
            <LitigationManager 
              onExpertConsult={() => navigateTo('lawyer_review')} 
              onStartComplaint={() => navigateTo('complaint')}
            />
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-3 px-4">
              <div className="w-1 h-8 bg-brand-600 rounded-full" />
              <h3 className="text-2xl font-bold text-[#0F172A]">주요 기능</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard 
                icon={<Scale className="w-8 h-8 text-brand-600" />}
                title="소송 유형 자동 분류"
                description="지금 겪고 계신 상황을 설명해 주세요. AI가 민사, 가사, 형사 등 가장 적합한 소송 유형을 찾아드리고 핵심 준비 사항을 안내합니다."
                onClick={() => navigateTo('litigation_finder')}
                color="bg-brand-50"
                primary
                badge="추천"
              />
              <FeatureCard 
                icon={<FileText className="w-8 h-8 text-indigo-600" />}
                title="소장 초안 작성"
                description="복잡한 법률 용어를 몰라도 괜찮습니다. 질문에 답하기만 하면 논리적인 소장 초안이 완성됩니다."
                onClick={() => startComplaintWizard()}
                color="bg-indigo-50"
                primary
              />
              <FeatureCard 
                icon={<Mail className="w-8 h-8 text-orange-600" />}
                title="내용증명 생성"
                description="상대방에게 심리적 압박과 법적 경고를 동시에 전달하는 전략적 내용증명을 작성합니다."
                onClick={() => navigateTo('demand_letter')}
                color="bg-orange-50"
              />
              <FeatureCard 
                icon={<Building2 className="w-8 h-8 text-brand-600" />}
                title="행정심판 청구"
                description="영업정지 등 부당한 행정처분에 대응하는 청구서와 집행정지 신청서를 자동으로 생성합니다."
                onClick={() => navigateTo('admin_appeal')}
                color="bg-brand-50"
              />
              <FeatureCard 
                icon={<Heart className="w-8 h-8 text-red-600" />}
                title="이혼 소송 지원"
                description="재산분할 기여도 소명 및 위자료 청구 등 이혼 소송에 필요한 핵심 문서를 전문적으로 지원합니다."
                onClick={() => navigateTo('divorce')}
                color="bg-red-50"
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-3 px-4">
              <div className="w-1 h-8 bg-emerald-600 rounded-full" />
              <h3 className="text-2xl font-bold text-[#0F172A]">전문가 연계</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeatureCard 
                icon={<MapPin className="w-8 h-8 text-emerald-600" />}
                title="내 지역 변호사 찾기"
                description="현재 위치나 관할 법원 근처에서 활동 중인 전문 변호사를 직접 검색하고 상담을 신청하세요."
                onClick={() => navigateTo('lawyer_search')}
                color="bg-emerald-50"
                badge="지역 기반"
                primary
              />
              <FeatureCard 
                icon={<ShieldCheck className="w-8 h-8 text-brand-600" />}
                title="변호사 서류 검토"
                description="AI가 작성한 초안을 파트너 변호사에게 직접 검토받아 법적 완성도를 높이세요."
                onClick={() => navigateTo('lawyer_review')}
                color="bg-brand-50"
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-3 px-4">
              <div className="w-1 h-8 bg-brand-600 rounded-full" />
              <h3 className="text-2xl font-bold text-[#0F172A]">법률 도구</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeatureCard 
                icon={<Calculator className="w-8 h-8 text-brand-600" />}
                title="소송 비용 계산"
                description="소가(소송물가액)를 산정하고, 인지대와 송달료 등 실제 법원에 납부할 비용을 계산합니다."
                onClick={() => navigateTo('cost')}
                color="bg-brand-50"
                badge="신규 기능"
              />
              <FeatureCard 
                icon={<FileText className="w-8 h-8 text-[#059669]" />}
                title="판례/문서 요약"
                description="복잡한 판결문이나 상대방의 답변서를 초등학생도 이해할 수 있을 만큼 쉽게 요약해 드립니다."
                onClick={() => navigateTo('summarizer')}
                color="bg-emerald-50"
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-3 px-4">
              <div className="w-1 h-8 bg-slate-400 rounded-full" />
              <h3 className="text-2xl font-bold text-[#0F172A]">기타 서비스</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard 
                icon={<ShieldAlert className="w-8 h-8 text-red-600" />}
                title="보정명령 대응"
                description="법원의 보정명령서를 분석하여 무엇이 잘못되었는지 짚어주고, 수정된 답변 초안을 제시합니다."
                onClick={() => navigateTo('correction')}
                color="bg-red-50"
              />
              <FeatureCard 
                icon={<ListOrdered className="w-8 h-8 text-emerald-600" />}
                title="증거 자동 정리"
                description="사진, 영수증, 계약서 등을 업로드하면 AI가 번호를 부여하고 증거설명서 초안을 작성합니다."
                onClick={() => navigateTo('exhibit')}
                color="bg-emerald-50"
              />
              <FeatureCard 
                icon={<ShieldCheck className="w-8 h-8 text-brand-600" />}
                title="전문가 유료 검토"
                description="AI가 작성한 서류를 전문 변호사가 직접 검토하고 보완해 드립니다. (정액 이용료 발생)"
                onClick={() => navigateTo('lawyer_review')}
                color="bg-brand-50"
                badge="추천"
              />
              <FeatureCard 
                icon={<UserPlus className="w-8 h-8 text-brand-600" />}
                title="변호사 홍보 등록"
                description="변호사님의 경력을 등록하고 AI를 통해 최적화된 광고 카드를 생성하여 홍보하세요."
                onClick={() => navigateTo('lawyer_reg')}
                color="bg-brand-50"
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-3 px-4">
              <div className="w-1 h-8 bg-brand-600 rounded-full" />
              <h3 className="text-2xl font-bold text-[#0F172A]">고객 지원</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard 
                icon={<MessageSquare className="w-8 h-8 text-brand-600" />}
                title="고객센터"
                description="서비스 이용 중 궁금한 점이나 불편한 사항이 있으시면 언제든지 문의해 주세요."
                onClick={() => navigateTo('customer_center')}
                color="bg-brand-50"
              />
              <FeatureCard 
                icon={<Info className="w-8 h-8 text-indigo-600" />}
                title="회사 소개"
                description="SoloLaw AI를 만드는 사람들과 우리의 비전을 소개합니다."
                onClick={() => navigateTo('about')}
                color="bg-indigo-50"
              />
            </div>
          </div>
        </motion.div>
      );
    }

    if (view === 'complaint') {
      if (!memoizedUser) {
        return (
          <motion.div
            key="auth-redirect"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-12"
          >
            <AuthWizard 
              onComplete={(type) => {
                if (type === 'lawyer') navigateTo('lawyer_reg');
                // Stay on complaint view after login
              }}
              onBack={() => navigateTo('home')}
              initialType="user"
            />
          </motion.div>
        );
      }
      return <ProtectedRoute onNavigate={navigateTo}><ComplaintWizard onBack={() => navigateTo('home')} initialData={complaintInitialData} /></ProtectedRoute>;
    }
    if (view === 'history') {
      if (!memoizedUser) {
        return (
          <motion.div
            key="auth-redirect-history"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-12"
          >
            <AuthWizard 
              onComplete={() => {}}
              onBack={() => navigateTo('home')}
              initialType="user"
            />
          </motion.div>
        );
      }
      return <ProtectedRoute onNavigate={navigateTo}><ComplaintHistory onBack={() => navigateTo('home')} onCalculateCost={handleCalculateCostFromHistory} /></ProtectedRoute>;
    }
    if (view === 'lawyer_reg') {
      if (!memoizedUser) {
        return (
          <motion.div
            key="auth-redirect-lawyer-reg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-12"
          >
            <AuthWizard 
              onComplete={() => navigateTo('lawyer_reg')}
              onBack={() => navigateTo('home')}
              initialType="lawyer"
            />
          </motion.div>
        );
      }
      return <ProtectedRoute onNavigate={navigateTo}><LawyerRegistration onBack={() => navigateTo('home')} /></ProtectedRoute>;
    }
    if (view === 'lawyer_search') return <LawyerSearch onBack={() => navigateTo('home')} />;
    if (view === 'lawyer_review') return <ProtectedRoute onNavigate={navigateTo}><LawyerReviewService onBack={() => navigateTo('home')} /></ProtectedRoute>;
    if (view === 'subscription') return <ProtectedRoute requiredRole="lawyer" onNavigate={navigateTo}><SubscriptionManager onBack={() => navigateTo('home')} /></ProtectedRoute>;
    if (view === 'cost') return <LitigationCostCalculator onBack={() => navigateTo('home')} />;
    if (view === 'summarizer') {
      if (!memoizedUser) {
        return (
          <motion.div
            key="auth-redirect-summarizer"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-12"
          >
            <AuthWizard 
              onComplete={(type) => {
                if (type === 'lawyer') navigateTo('lawyer_reg');
              }}
              onBack={() => navigateTo('home')}
              initialType="user"
            />
          </motion.div>
        );
      }
      return <ProtectedRoute onNavigate={navigateTo}><DocumentSummarizer onBack={() => navigateTo('home')} /></ProtectedRoute>;
    }
    if (view === 'litigation_finder') return <LitigationTypeFinder onBack={() => navigateTo('home')} onStartComplaint={(situation) => { setComplaintInitialData({ summary: situation }); navigateTo('complaint'); }} />;
    if (view === 'demand_letter') {
      if (!memoizedUser) {
        return (
          <motion.div
            key="auth-redirect-demand"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-12"
          >
            <AuthWizard 
              onComplete={() => {}}
              onBack={() => navigateTo('home')}
              initialType="user"
            />
          </motion.div>
        );
      }
      return <ProtectedRoute onNavigate={navigateTo}><DemandLetterWizard onBack={() => navigateTo('home')} /></ProtectedRoute>;
    }
    if (view === 'admin_appeal') {
      if (!memoizedUser) {
        return (
          <motion.div
            key="auth-redirect-appeal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-12"
          >
            <AuthWizard 
              onComplete={() => {}}
              onBack={() => navigateTo('home')}
              initialType="user"
            />
          </motion.div>
        );
      }
      return <ProtectedRoute onNavigate={navigateTo}><AdminAppealWizard onBack={() => navigateTo('home')} /></ProtectedRoute>;
    }
    if (view === 'divorce') {
      if (!memoizedUser) {
        return (
          <motion.div
            key="auth-redirect-divorce"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-12"
          >
            <AuthWizard 
              onComplete={() => {}}
              onBack={() => navigateTo('home')}
              initialType="user"
            />
          </motion.div>
        );
      }
      return <ProtectedRoute onNavigate={navigateTo}><DivorceWizard onBack={() => navigateTo('home')} /></ProtectedRoute>;
    }
    if (view === 'correction') return <ProtectedRoute onNavigate={navigateTo}><CorrectionGuard onBack={() => navigateTo('home')} onConsultLawyer={() => navigateTo('lawyer_review')} /></ProtectedRoute>;
    if (view === 'exhibit') return <ProtectedRoute onNavigate={navigateTo}><AutoExhibit onBack={() => navigateTo('home')} /></ProtectedRoute>;
    if (view === 'customer_center') return <CustomerCenter onBack={() => navigateTo('home')} />;
    if (view === 'about') return <AboutUs onBack={() => navigateTo('home')} />;
    if (view === 'security') return <ProtectedRoute onNavigate={navigateTo}><SecuritySettings onBack={() => navigateTo('home')} /></ProtectedRoute>;
    if (view === 'admin') return <ProtectedRoute requiredRole="admin" onNavigate={navigateTo}><AdminDashboard /></ProtectedRoute>;

    return null;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
              <div className="cursor-pointer group" onClick={() => navigateTo('home')}>
                <Logo 
                  size="md" 
                  text={memoizedBranding.appName} 
                  subtext={memoizedBranding.appSubtext} 
                  src={memoizedBranding.logoUrl || undefined} 
                  priority
                />
              </div>
          
          <div className="flex items-center gap-3 md:gap-6">
            <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
              <button 
                onClick={() => navigateTo('home')}
                className={`text-sm font-medium transition-colors ${view === 'home' ? 'text-brand-600' : 'text-[#64748B] hover:text-[#0F172A]'}`}
                aria-current={view === 'home' ? 'page' : undefined}
              >
                홈
              </button>
              <button 
                onClick={() => navigateTo('lawyer_search')}
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${view === 'lawyer_search' ? 'text-brand-600' : 'text-[#64748B] hover:text-[#0F172A]'}`}
                aria-current={view === 'lawyer_search' ? 'page' : undefined}
              >
                <MapPin className="w-4 h-4" /> 변호사 찾기
              </button>
              <button 
                onClick={() => navigateTo('history')}
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${view === 'history' ? 'text-brand-600' : 'text-[#64748B] hover:text-[#0F172A]'}`}
                aria-current={view === 'history' ? 'page' : undefined}
              >
                <History className="w-4 h-4" /> 내 보관함
              </button>
            </nav>

            <div className="flex items-center gap-2">
              <div className="relative">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#64748B]" />
                ) : user ? (
                  <div className="relative">
                    <button 
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors"
                      aria-label="User menu"
                      aria-expanded={showUserMenu}
                      aria-haspopup="true"
                    >
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-[#E2E8F0]" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white">
                          <UserIcon className="w-5 h-5" />
                        </div>
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {showUserMenu && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />
                          <motion.div 
                            key="user-menu"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-[#E2E8F0] shadow-xl z-30 overflow-hidden"
                          >
                            <div className="p-4 border-b border-[#E2E8F0]">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-bold text-[#0F172A] truncate">{user.displayName}</p>
                                {user.role === 'lawyer' && (
                                  <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full font-bold">변호사</span>
                                )}
                                {user.role === 'admin' && (
                                  <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-bold">관리자</span>
                                )}
                              </div>
                              <p className="text-xs text-[#64748B] truncate">{user.email}</p>
                            </div>
                            {user.role === 'admin' && (
                              <button 
                                onClick={() => {
                                  navigateTo('admin');
                                  setShowUserMenu(false);
                                }}
                                className="w-full flex items-center gap-2 p-4 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium border-b border-[#E2E8F0]"
                              >
                                <ShieldCheck className="w-4 h-4 text-brand-600" /> 관리자 대시보드
                              </button>
                            )}
                            {user.role === 'lawyer' && (
                              <button 
                                onClick={() => {
                                  navigateTo('subscription');
                                  setShowUserMenu(false);
                                }}
                                className="w-full flex items-center gap-2 p-4 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium border-b border-[#E2E8F0]"
                              >
                                <CreditCard className="w-4 h-4 text-brand-600" /> 구독 및 결제 관리
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                navigateTo('security');
                                setShowUserMenu(false);
                              }}
                              className="w-full flex items-center gap-2 p-4 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium border-b border-[#E2E8F0]"
                            >
                              <ShieldCheck className="w-4 h-4 text-brand-600" /> 보안 설정
                            </button>
                            <button 
                              onClick={() => {
                                logout();
                                setShowUserMenu(false);
                              }}
                              className="w-full flex items-center gap-2 p-4 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                            >
                              <LogOut className="w-4 h-4" /> 로그아웃
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-200">
                    <button 
                      onClick={() => {
                        if (user) {
                          navigateTo('home');
                        } else {
                          setAuthType('user');
                          setShowAuth(true);
                        }
                      }}
                      className="flex items-center gap-2 bg-brand-600 text-white px-3 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold hover:bg-brand-700 transition-all shadow-md shadow-brand-100 group"
                    >
                      <UserIcon className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                      <span className="hidden xs:inline">일반 로그인</span>
                    </button>
                    <div className="w-px h-6 bg-slate-200 hidden sm:block mx-1" />
                    <button 
                      onClick={() => {
                        if (user) {
                          navigateTo('lawyer_reg');
                        } else {
                          setAuthType('lawyer');
                          setShowAuth(true);
                        }
                      }}
                      className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold hover:border-brand-600 hover:text-brand-600 transition-all group"
                    >
                      <Briefcase className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                      <span className="hidden xs:inline">변호사 로그인</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-[#64748B] hover:bg-slate-100 rounded-lg transition-colors"
                aria-label={showMobileMenu ? "Close menu" : "Open menu"}
                aria-expanded={showMobileMenu}
              >
                {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-[#E2E8F0] overflow-hidden"
            >
              <nav className="flex flex-col p-4 gap-2">
                <button 
                  onClick={() => navigateTo('home')}
                  className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors ${view === 'home' ? 'bg-blue-50 text-[#2563EB]' : 'text-[#64748B] hover:bg-slate-50'}`}
                >
                  홈
                </button>
                <button 
                  onClick={() => navigateTo('lawyer_search')}
                  className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors ${view === 'lawyer_search' ? 'bg-blue-50 text-[#2563EB]' : 'text-[#64748B] hover:bg-slate-50'}`}
                >
                  <MapPin className="w-4 h-4" /> 변호사 찾기
                </button>
                <button 
                  onClick={() => navigateTo('history')}
                  className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors ${view === 'history' ? 'bg-blue-50 text-[#2563EB]' : 'text-[#64748B] hover:bg-slate-50'}`}
                >
                  <History className="w-4 h-4" /> 내 보관함
                </button>
                {user?.role === 'lawyer' && (
                  <button 
                    onClick={() => navigateTo('subscription')}
                    className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors ${view === 'subscription' ? 'bg-blue-50 text-[#2563EB]' : 'text-[#64748B] hover:bg-slate-50'}`}
                  >
                    <CreditCard className="w-4 h-4" /> 구독 및 결제 관리
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (user?.role === 'lawyer') {
                      navigateTo('lawyer_reg');
                    } else {
                      setAuthType('lawyer');
                      setShowAuth(true);
                      setShowMobileMenu(false);
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors ${view === 'lawyer_reg' ? 'bg-blue-50 text-[#2563EB]' : 'text-[#64748B] hover:bg-slate-50'}`}
                >
                  <UserPlus className="w-4 h-4" /> 변호사 등록 및 수정
                </button>

                {!user && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <button 
                      onClick={() => {
                        setAuthType('user');
                        setShowAuth(true);
                        setShowMobileMenu(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-100"
                    >
                      <UserIcon className="w-4 h-4" /> 일반 로그인 / 시작하기
                    </button>
                    <button 
                      onClick={() => {
                        setAuthType('lawyer');
                        setShowAuth(true);
                        setShowMobileMenu(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-sm"
                    >
                      <Briefcase className="w-4 h-4" /> 변호사 로그인 / 등록
                    </button>
                  </div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <Breadcrumbs currentView={view} onNavigate={navigateTo} />

      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin" />
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-brand-600 animate-pulse" />
            </div>
            <p className="text-slate-500 font-medium animate-pulse">SoloLaw AI 엔진을 불러오는 중...</p>
          </div>
        }>
          <AnimatePresence mode="wait">
            {renderMainContent()}
          </AnimatePresence>
        </Suspense>
      </main>
      <footer className="bg-white border-t border-[#E2E8F0] py-12 mt-auto">
        <div className="max-w-5xl mx-auto px-4 space-y-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Logo 
              size="lg" 
              className="justify-center" 
              text={memoizedBranding.appName} 
              subtext={memoizedBranding.appSubtext} 
              src={memoizedBranding.logoUrl || undefined} 
            />
            <p className="text-xs text-[#64748B] font-medium max-w-xs mx-auto">
              누구나 쉽고 정확하게 준비하는 법률 문서, {memoizedBranding.appName}가 함께합니다.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[11px] font-bold text-[#64748B]">
            <button onClick={() => navigateTo('about')} className="hover:text-[#0F172A] transition-colors">회사 소개</button>
            <button onClick={() => { setInitialPolicyTab('terms'); setShowTerms(true); }} className="hover:text-[#0F172A] transition-colors">이용약관</button>
            <button onClick={() => { setInitialPolicyTab('privacy'); setShowTerms(true); }} className="hover:text-[#0F172A] transition-colors">개인정보처리방침</button>
            <button onClick={() => navigateTo('customer_center')} className="hover:text-[#0F172A] transition-colors">고객센터</button>
            <button onClick={() => { setInitialPolicyTab('legal'); setShowTerms(true); }} className="hover:text-[#0F172A] transition-colors">법적 고지</button>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col items-center justify-center gap-4">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-sans text-center">
              © 2026 {memoizedBranding.appName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <Suspense fallback={null}>
        <AnimatePresence>
          {showTerms && (
            <TermsOfService initialTab={initialPolicyTab} onClose={() => setShowTerms(false)} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showOnboarding && (
            <Onboarding onClose={handleOnboardingClose} />
          )}
        </AnimatePresence>
      </Suspense>
    </div>
  );
}

const FeatureCard = React.memo(function FeatureCard({ icon, title, description, onClick, color, primary, badge }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  onClick: () => void;
  color: string;
  primary?: boolean;
  badge?: string;
}) {
  return (
    <button 
      onClick={onClick}
      className={`group relative p-6 md:p-8 rounded-3xl border transition-all duration-300 text-left flex flex-col items-start gap-4 md:gap-6 hover:-translate-y-1 ${
        primary 
          ? 'bg-white border-brand-200 shadow-lg shadow-blue-900/5 md:col-span-2 lg:col-span-1 hover:shadow-xl hover:shadow-blue-900/10 hover:border-brand-300' 
          : 'bg-white border-[#E2E8F0] hover:border-brand-300 hover:shadow-xl hover:shadow-slate-200/50'
      }`}
      aria-label={`${title}: ${description}`}
    >
      {badge && (
        <div className="absolute top-4 right-4 bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider font-sans shadow-sm">
          {badge}
        </div>
      )}
      <div className={`${color} p-3 md:p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <div className="space-y-2 flex-1">
        <h3 className={`text-lg md:text-xl font-bold font-serif ${primary ? 'text-brand-700' : 'text-[#0F172A]'}`}>{title}</h3>
        <p className="text-[#64748B] text-xs md:text-sm leading-relaxed font-sans">{description}</p>
      </div>
      <div className="flex items-center gap-2 text-brand-600 font-bold text-sm font-sans mt-auto pt-2">
        시작하기 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
});
