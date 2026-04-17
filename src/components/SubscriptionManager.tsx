import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Calendar, CheckCircle2, AlertCircle, ChevronRight, X, ShieldCheck, Clock, History, ArrowUpCircle, XCircle, Loader2, Info, Eye } from 'lucide-react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { loadTossPayments } from '@tosspayments/payment-sdk';
import AdPreview from './AdPreview';
import SinglePlanCard from './SinglePlan';

interface PaymentRecord {
  id: string;
  amount: number;
  date: any;
  status: 'completed' | 'failed' | 'pending';
  planName: string;
}

const PARTNERSHIP_PLAN = {
  id: 'partnership',
  name: 'SoloLaw Partnership',
  price: 99000,
  features: [
    'AI 사건 요약 리포트 제공',
    '검색 결과 최상단 우선 노출',
    '직통 전화 및 1:1 채팅 활성화',
    '공식 파트너 골드 엠블럼 부여'
  ],
  color: 'text-brand-600',
  bg: 'bg-brand-50'
};

const BASIC_PLAN = {
  id: 'basic',
  name: '미가입',
  price: 0,
  features: ['기본 프로필 노출'],
  color: 'text-slate-400',
  bg: 'bg-slate-50'
};

export default function SubscriptionManager({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [lawyerData, setLawyerData] = useState<any>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const [paymentSettings, setPaymentSettings] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        // Fetch app settings for payment
        const payRef = doc(db, 'app_settings', 'payment');
        const paySnap = await getDoc(payRef);
        if (paySnap.exists()) {
          setPaymentSettings(paySnap.data());
        }

        // Fetch lawyer profile
        const lawyerRef = doc(db, 'lawyers', user.uid);
        const lawyerSnap = await getDoc(lawyerRef);
        if (lawyerSnap.exists()) {
          setLawyerData(lawyerSnap.data());
        }

        // Fetch payment history (mocking with some data if empty)
        const paymentsRef = collection(db, 'payments');
        const q = query(
          paymentsRef, 
          where('lawyerId', '==', user.uid),
          orderBy('date', 'desc'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        const fetchedPayments: PaymentRecord[] = [];
        querySnapshot.forEach((doc) => {
          fetchedPayments.push({ id: doc.id, ...doc.data() } as PaymentRecord);
        });
        
        // If no real payments, add a mock one for demo
        if (fetchedPayments.length === 0) {
          fetchedPayments.push({
            id: 'mock-1',
            amount: 55000,
            date: { seconds: Date.now() / 1000 - 86400 * 15 },
            status: 'completed',
            planName: 'SoloLaw Partnership'
          });
        }
        
        setPayments(fetchedPayments);
      } catch (error) {
        console.error("Error fetching subscription data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleUpgrade = async (plan: any) => {
    if (!user) return;

    // Toss Payments Configuration
    const clientKey = (import.meta as any).env.VITE_TOSS_CLIENT_KEY;
    if (!clientKey) {
      console.error("Toss Client Key (VITE_TOSS_CLIENT_KEY) is missing.");
      setErrorMsg("결제 설정 정보가 없습니다. 관리자에게 문의하여 VITE_TOSS_CLIENT_KEY 환경 변수를 설정해 주세요.");
      return;
    }

    setIsProcessing(true);
    try {
      // Store pending subscription info to use after redirect
      localStorage.setItem('pending_subscription', JSON.stringify({
        planType: plan.id,
        amount: plan.price,
        lawyerId: user.uid,
        planName: plan.name
      }));

      const tossPayments = await loadTossPayments(clientKey);

      // Request Billing Auth (Card Registration)
      await tossPayments.requestBillingAuth('카드', {
        customerKey: user.uid,
        successUrl: `${window.location.origin}/payment/billing-success`,
        failUrl: `${window.location.origin}/payment/billing-fail`,
      });
      
    } catch (error: any) {
      console.error("Toss Billing Auth failed:", error);
      setErrorMsg(error.message || "결제 등록 준비 중 오류가 발생했습니다.");
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      const lawyerRef = doc(db, 'lawyers', user.uid);
      await updateDoc(lawyerRef, {
        cancelAtPeriodEnd: true,
        updatedAt: serverTimestamp()
      });
      
      setLawyerData((prev: any) => ({
        ...prev,
        cancelAtPeriodEnd: true
      }));
      
      setShowCancelModal(false);
      setErrorMsg("구독 취소가 예약되었습니다. 현재 이용 기간 종료 후에는 광고가 중단됩니다.");
    } catch (error) {
      console.error("Cancel failed:", error);
      setErrorMsg("구독 취소 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImmediateDelete = async () => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      const lawyerRef = doc(db, 'lawyers', user.uid);
      await updateDoc(lawyerRef, {
        subscriptionPlan: 'basic',
        subscriptionStatus: 'inactive',
        subscriptionExpiresAt: null,
        cancelAtPeriodEnd: false,
        updatedAt: serverTimestamp()
      });
      
      setLawyerData((prev: any) => ({
        ...prev,
        subscriptionPlan: 'basic',
        subscriptionStatus: 'inactive',
        subscriptionExpiresAt: null,
        cancelAtPeriodEnd: false
      }));
      
      setShowCancelModal(false);
      setErrorMsg("멤버십이 즉시 삭제되었습니다. 이제 광고가 중단되었습니다.");
    } catch (error) {
      console.error("Immediate delete failed:", error);
      setErrorMsg("멤버십 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-brand-600" />
        <p className="text-slate-500 font-medium">구독 정보를 불러오는 중...</p>
      </div>
    );
  }

  // Dynamic plans based on settings
  const currentPlanId = lawyerData?.subscriptionPlan || 'basic';
  const currentPlan = currentPlanId === 'basic' ? BASIC_PLAN : {
    ...PARTNERSHIP_PLAN,
    price: paymentSettings?.ad_plans?.partnership || PARTNERSHIP_PLAN.price
  };
  const expiryDate = lawyerData?.subscriptionExpiresAt?.toDate?.() || new Date(lawyerData?.subscriptionExpiresAt) || null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      {errorMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">알림</h3>
              <p className="text-sm text-slate-600">{errorMsg}</p>
              <button 
                onClick={() => setErrorMsg(null)}
                className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-[0.2em]">
            <CreditCard className="w-4 h-4" /> Subscription Management
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] font-serif tracking-tight">구독 및 결제 관리</h2>
          <p className="text-slate-500 text-sm font-medium">현재 이용 중인 플랜을 확인하고 관리하세요.</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center">
          <button 
            onClick={() => (window as any).navigateToDemo?.()}
            className="px-5 py-2.5 bg-brand-50 border border-brand-100 text-brand-600 hover:bg-brand-100 rounded-2xl transition-all flex items-center gap-2 text-sm font-bold shadow-sm"
          >
            <Eye className="w-4 h-4" /> 미리보기 데모
          </button>
          <button 
            onClick={onBack}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 rounded-2xl transition-all flex items-center gap-2 text-sm font-bold shadow-sm"
          >
            <X className="w-4 h-4" /> 닫기
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Current Plan Status */}
        <div className="md:col-span-2 space-y-8">
          <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-full h-2 ${currentPlan.bg.replace('bg-', 'bg-')}`} />
            <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${currentPlan.bg} ${currentPlan.color}`}>
                    Current Plan
                  </span>
                  <h3 className="text-3xl font-bold text-[#0F172A] font-serif">{currentPlan.name} 플랜</h3>
                </div>
                
                <div className="space-y-3">
                  {currentPlan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-brand-500" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-3xl p-6 flex flex-col justify-between items-center text-center min-w-[200px] border border-slate-100">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Next Billing Date</p>
                  <p className="text-lg font-bold text-slate-700">
                    {expiryDate ? expiryDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '무제한'}
                  </p>
                </div>
                <div className="pt-4 space-y-2 w-full">
                  <button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="w-full py-3 bg-brand-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-100 hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowUpCircle className="w-4 h-4" /> 플랜 변경하기
                  </button>
                  {lawyerData?.subscriptionPlan !== 'basic' && !lawyerData?.cancelAtPeriodEnd && (
                    <button 
                      onClick={() => setShowCancelModal(true)}
                      className="w-full py-3 bg-white border border-slate-200 text-slate-400 rounded-xl text-xs font-bold hover:text-red-500 hover:border-red-200 transition-all"
                    >
                      구독 취소
                    </button>
                  )}
                  {lawyerData?.cancelAtPeriodEnd && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2 text-left">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-700 leading-tight">
                        구독 취소가 예약되었습니다. {expiryDate?.toLocaleDateString()} 이후에 광고가 중단됩니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Payment History */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold text-[#0F172A] font-serif flex items-center gap-2">
                <History className="w-5 h-5 text-brand-600" /> 결제 내역
              </h3>
            </div>
            <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-lg shadow-slate-200/30">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">결제 일시</th>
                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">상품명</th>
                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">결제 금액</th>
                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(p.date.seconds * 1000).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-5">
                        <span className="text-sm font-bold text-slate-800">{p.planName}</span>
                      </td>
                      <td className="p-5">
                        <span className="text-sm font-black text-brand-600">₩{p.amount.toLocaleString()}</span>
                      </td>
                      <td className="p-5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {p.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {p.status === 'completed' ? '결제 완료' : '결제 실패'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-brand-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl shadow-brand-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors" />
            <div className="relative z-10 space-y-6">
              <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold font-serif">Partnership Benefits</h4>
                <p className="text-brand-50 text-xs leading-relaxed font-medium">
                  SoloLaw 파트너 변호사가 되시면 AI 기반의 맞춤형 광고와 지역 타겟팅을 통해 더 많은 의뢰인을 만날 수 있습니다.
                </p>
              </div>
              <ul className="space-y-3">
                {['신뢰도 높은 파트너 뱃지', '실시간 상담 알림', 'AI 광고 최적화'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px] font-bold text-brand-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-300" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-lg shadow-slate-200/30 space-y-4">
            <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-600" /> 결제 안내
            </h4>
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                • 모든 결제 금액에는 부가가치세(VAT)가 포함되어 있습니다.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                • 구독 기간 중 플랜을 변경하시면 즉시 적용되며, 차액은 일할 계산되어 청구되거나 다음 결제 시 차감됩니다.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                • 결제 관련 문의는 고객센터(1588-0000) 또는 1:1 문의를 이용해 주세요.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowCancelModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-900">구독을 취소하시겠습니까?</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  취소 후에도 현재 결제 주기가 끝날 때까지는 혜택이 유지됩니다. 이후에는 광고가 자동으로 중단됩니다.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : '기간 종료 후 해지 (권장)'}
                </button>
                <button 
                  onClick={() => handleImmediateDelete()}
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-white border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : '지금 즉시 삭제 (환불 불가)'}
                </button>
                <button 
                  onClick={() => setShowCancelModal(false)}
                  className="w-full py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  아니요, 유지할게요
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowUpgradeModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-12 space-y-10 max-h-[90vh] overflow-y-auto">
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-bold text-[#0F172A] font-serif tracking-tight">비즈니스 성장을 위한 최적의 플랜</h3>
                  <p className="text-slate-500 font-medium">변호사님의 필요에 맞는 플랜을 선택하세요.</p>
                </div>

                <div className="max-w-md mx-auto">
                  <SinglePlanCard 
                    price={paymentSettings?.ad_plans?.partnership || 99000}
                    onSubscribe={() => {
                      const partnershipPlan = {
                        id: 'partnership',
                        name: 'SoloLaw Partnership',
                        price: paymentSettings?.ad_plans?.partnership || 99000
                      };
                      handleUpgrade(partnershipPlan);
                    }}
                  />
                </div>

                {/* Ad Preview Section */}
                {selectedPlan && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100"
                  >
                    <AdPreview 
                      planType={selectedPlan.id} 
                      lawyerInfo={lawyerData || { name: user?.displayName }} 
                    />
                  </motion.div>
                )}

                <div className="flex justify-center">
                  <button 
                    onClick={() => setShowUpgradeModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center gap-2"
                  >
                    나중에 변경하기 <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
