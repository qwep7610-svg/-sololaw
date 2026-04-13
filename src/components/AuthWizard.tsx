import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Briefcase, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Lock, 
  Bell, 
  Scale, 
  Check, 
  AlertCircle, 
  Info,
  Smartphone,
  Database,
  Globe,
  Loader2
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

import { db, doc, getDoc, setDoc, serverTimestamp } from '../lib/firebase';

type AuthType = 'user' | 'lawyer';
type Step = 'type' | 'auth' | '2fa' | 'info' | 'security' | 'complete';

export default function AuthWizard({ onComplete, onBack, initialType }: { 
  onComplete: (type: AuthType) => void, 
  onBack: () => void,
  initialType?: AuthType 
}) {
  const { user, loginWithGoogle, loginWithKakao, loginWithNaver } = useAuth();
  const [type, setType] = useState<AuthType | null>(initialType || null);
  const [step, setStep] = useState<Step>(initialType ? 'auth' : 'type');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [pin, setPin] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    aiOptOut: false,
    adModel: false,
    article2: false,
    article3: false
  });
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const nextStep = () => {
    if (step === 'type') setStep('auth');
    else if (step === 'auth') setStep('info');
    else if (step === 'info') setStep('security');
    else if (step === 'security') setStep('complete');
  };

  const prevStep = () => {
    if (step === 'auth') setStep('type');
    else if (step === 'info') setStep('auth');
    else if (step === 'security') setStep('info');
    else if (step === 'complete') setStep('security');
  };

  const check2FAAndProceed = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      
      // 관리자(admin)이거나 이미 가입된 사용자인 경우 모든 단계를 건너뛰고 즉시 완료
      if (userData?.role === 'admin' || user?.role === 'admin' || userData?.isRegistered) {
        onComplete(userData?.role || type || 'user');
        return;
      }

      if (userData?.is2FAEnabled) {
        setStep('2fa');
      } else {
        nextStep();
      }
    } catch (error) {
      console.error("Error checking 2FA:", error);
      nextStep(); // Fallback to normal flow
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await loginWithGoogle();
      if (!result) {
        setIsLoggingIn(false);
        return;
      }
    } catch (error: any) {
      console.error("Google login error:", error);
      let message = "로그인 중 오류가 발생했습니다. 다시 시도해 주세요.";
      if (error.code === 'auth/unauthorized-domain') {
        message = "현재 도메인이 Firebase 콘솔의 '승인된 도메인'에 등록되지 않았습니다. 관리자 설정이 필요합니다.";
      } else if (error.code === 'auth/popup-blocked') {
        message = "팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해 주세요.";
      } else if (error.message) {
        message = `로그인 실패: ${error.message}`;
      }
      alert(message);
      setIsLoggingIn(false);
    }
  };

  // Use useEffect to detect user login and trigger 2FA check
  useEffect(() => {
    if (!user) return;

    if (user.role === 'admin' || user.isRegistered) {
      onComplete((user.role as AuthType) || 'user');
      return;
    }

    if (step === 'auth' && isLoggingIn) {
      check2FAAndProceed(user.uid).finally(() => setIsLoggingIn(false));
    }
  }, [user, step, isLoggingIn]);

  const handleKakaoLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await loginWithKakao();
      if (!result) {
        setIsLoggingIn(false);
        return;
      }
    } catch (error: any) {
      alert(error.message);
      setIsLoggingIn(false);
    }
  };

  const handleNaverLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await loginWithNaver();
      if (!result) {
        setIsLoggingIn(false);
        return;
      }
    } catch (error: any) {
      alert(error.message);
      setIsLoggingIn(false);
    }
  };

  const handleComplete = async () => {
    if (!user || !type) return;
    
    setIsLoggingIn(true);
    try {
      // 1. Update user registration status
      await setDoc(doc(db, 'users', user.uid), {
        isRegistered: true,
        role: type,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. If lawyer, ensure lawyer doc exists with pending status
      if (type === 'lawyer') {
        const lawyerDoc = await getDoc(doc(db, 'lawyers', user.uid));
        if (!lawyerDoc.exists()) {
          await setDoc(doc(db, 'lawyers', user.uid), {
            id: user.uid,
            name: user.displayName || '변호사',
            email: user.email,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      onComplete(type);
    } catch (error) {
      console.error("Error completing registration:", error);
      alert("가입 완료 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {step === 'type' && (
          <motion.div
            key="type"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-[#0F172A] font-serif">나홀로소송 도우미 (SoloLaw)에 오신 것을 환영합니다</h2>
              <p className="text-[#64748B]">당신의 든든한 법률 페이스메이커가 되어 드릴게요.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button
                onClick={() => { setType('user'); nextStep(); }}
                className="group p-8 rounded-[2.5rem] border-2 border-slate-100 bg-white hover:border-brand-600 hover:shadow-2xl transition-all text-left space-y-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-100">
                  <User className="w-8 h-8" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-[#0F172A]">일반 사용자</h3>
                  <p className="text-sm text-[#64748B] mt-2 leading-relaxed">일상어로 소장을 작성하고,<br />내 사건의 승소 확률을 분석해 보세요.</p>
                </div>
                <div className="relative z-10 flex items-center gap-2 text-brand-600 font-bold text-sm pt-2">
                  일반 사용자로 시작 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => { setType('lawyer'); nextStep(); }}
                className="group p-8 rounded-[2.5rem] border-2 border-slate-800 bg-slate-900 hover:border-brand-500 hover:shadow-2xl transition-all text-left space-y-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-800 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-100">
                  <Briefcase className="w-8 h-8" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-white">변호사 / 전문가</h3>
                  <p className="text-slate-400 mt-2 leading-relaxed text-sm">경력을 등록하고 광고 카드를 생성하여<br />도움이 필요한 의뢰인과 만나보세요.</p>
                </div>
                <div className="relative z-10 flex items-center gap-2 text-brand-400 font-bold text-sm pt-2">
                  전문가로 시작 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
            
            <div className="pt-8 border-t border-slate-100 text-center space-y-4">
              <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                나중에 가입할게요
              </button>
              <p className="text-xs text-slate-400">
                관리자이신가요? <button onClick={() => { setType('user'); setStep('auth'); }} className="text-brand-600 font-bold hover:underline">관리자 로그인</button>
              </p>
            </div>
          </motion.div>
        )}

        {step === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white border border-slate-200 rounded-3xl p-8 space-y-8 shadow-sm"
          >
            <button onClick={prevStep} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
              <ArrowLeft className="w-4 h-4" /> 이전으로
            </button>

            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-[#0F172A]">간편 인증으로 시작하기</h3>
                <p className="text-sm text-[#64748B]">
                  {type === 'user' 
                    ? "복잡한 가입 절차 없이 SNS 계정으로 안전하게 시작하세요. 모든 데이터는 법적 보안 수준으로 보호됩니다."
                    : "대한변협 등록 번호와 연동된 안전한 인증을 통해 변호사 자격을 확인합니다."}
                </p>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleKakaoLogin}
                  disabled={isLoggingIn}
                  className="w-full py-4 rounded-2xl bg-[#FEE500] text-[#3C1E1E] font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <div className="w-6 h-6 bg-[#3C1E1E] rounded-full flex items-center justify-center text-[10px] text-[#FEE500] font-black">K</div>
                  카카오로 시작하기
                </button>
                <button 
                  onClick={handleNaverLogin}
                  disabled={isLoggingIn}
                  className="w-full py-4 rounded-2xl bg-[#03C75A] text-white font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] text-[#03C75A] font-black">N</div>
                  네이버로 시작하기
                </button>
                <button 
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="w-full py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
                  ) : (
                    <Globe className="w-5 h-5 text-blue-500" />
                  )}
                  구글로 시작하기
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3">
                <Lock className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  입력하신 모든 정보는 256비트 SSL 암호화를 통해 보호되며, 본인 외에는 누구도(개발사 포함) 열람할 수 없음을 약속드립니다.
                </p>
              </div>

              {user && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-50 border border-brand-100">
                  <CheckCircle2 className="w-5 h-5 text-brand-600" />
                  <p className="text-sm font-bold text-brand-900">{user.displayName}님으로 인증되었습니다.</p>
                </div>
              )}

              <button 
                onClick={nextStep}
                disabled={!user}
                className="w-full py-4 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none"
              >
                다음 단계로
              </button>
            </div>
          </motion.div>
        )}

        {step === '2fa' && (
          <motion.div
            key="2fa"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border border-slate-200 rounded-3xl p-8 space-y-8 shadow-sm text-center"
          >
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8 text-brand-600" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-[#0F172A]">2단계 인증</h3>
              <p className="text-sm text-[#64748B]">계정 보호를 위해 설정하신 6자리 보안 PIN을 입력해 주세요.</p>
            </div>

            <div className="max-w-[240px] mx-auto space-y-4">
              <input 
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-brand-500 outline-none text-center tracking-[1em] text-2xl font-bold"
                placeholder="••••••"
                autoFocus
              />
              
              <button 
                onClick={async () => {
                  setIsVerifyingPin(true);
                  try {
                    const userDoc = await getDoc(doc(db, 'users', user!.uid));
                    if (userDoc.exists() && userDoc.data().twoFactorSecret === pin) {
                      nextStep();
                    } else {
                      alert('PIN 번호가 일치하지 않습니다.');
                      setPin('');
                    }
                  } catch (error) {
                    console.error("Error verifying PIN:", error);
                  } finally {
                    setIsVerifyingPin(false);
                  }
                }}
                disabled={pin.length !== 6 || isVerifyingPin}
                className="w-full py-4 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVerifyingPin ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                인증 및 계속하기
              </button>
            </div>

            <button 
              onClick={() => {
                // In a real app, we might offer recovery options
                alert('보안 PIN을 잊으셨나요? 관리자에게 문의해 주세요.');
              }}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              PIN 번호를 잊으셨나요?
            </button>
          </motion.div>
        )}

        {step === 'info' && (
          <motion.div
            key="info"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white border border-slate-200 rounded-3xl p-8 space-y-8 shadow-sm"
          >
            <button onClick={prevStep} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
              <ArrowLeft className="w-4 h-4" /> 이전으로
            </button>

            {type === 'user' ? (
              <div className="space-y-6">
                <div className="space-y-3 mb-8">
                  <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
                    <Database className="w-6 h-6 text-brand-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#0F172A] tracking-tight">어떤 도움이 필요하신가요?</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    관심 분야를 선택하시면 맞춤형 법률 가이드를 제공해 드립니다.<br />
                    <span className="text-[11px] text-slate-400 mt-1 inline-block">* 중복 선택 가능</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {['민사소송', '이혼/가사', '형사고소', '행정심판', '임대차분쟁', '기타'].map((item) => {
                    const isSelected = selectedInterests.includes(item);
                    return (
                      <button 
                        key={item} 
                        onClick={() => toggleInterest(item)}
                        className={`p-4 rounded-2xl border transition-all text-sm font-bold flex items-center justify-between ${
                          isSelected 
                            ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm' 
                            : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-slate-50'
                        }`}
                      >
                        {item}
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                    <Bell className="w-4 h-4 text-brand-600" /> 알림 설정 (권장)
                  </h4>
                  <div className="space-y-2">
                    {[
                      { id: 'date', title: '재판 기일 알림', desc: '중요한 재판 날짜를 놓치지 않게 알려드려요.' },
                      { id: 'doc', title: '상대방 서면 도착 알림', desc: '상대방이 서류를 제출하면 즉시 알려드려요.' }
                    ].map((item) => (
                      <label key={item.id} className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                        <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{item.title}</p>
                          <p className="text-[11px] text-slate-500">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-[#0F172A]">변호사 자격 인증</h3>
                  <p className="text-sm text-[#64748B]">대한변호사협회 등록 번호를 입력하시면 실시간 자격 확인 후 가입이 승인됩니다.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">변호사 등록 번호</label>
                    <input 
                      type="text" 
                      placeholder="예: 12345"
                      className="w-full px-4 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    />
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 leading-relaxed">
                      사용자들은 구체적인 <strong>'승소 금액'</strong>이나 <strong>'사건 해결 수'</strong>에 가장 큰 신뢰를 느낍니다. 가입 후 프로필에서 상세히 기재해 주세요.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={agreements.adModel}
                      onChange={(e) => setAgreements(prev => ({ ...prev, adModel: e.target.checked }))}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" 
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">광고 모델 및 법적 고지 동의 (필수)</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        본 서비스의 변호사 노출은 '단순 유료 광고' 모델이며, 사건 알선 수수료를 받지 않습니다. 변호사법을 준수하는 파트너십에 동의합니다.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <button 
              onClick={nextStep}
              className="w-full py-4 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
            >
              다음 단계로
            </button>
          </motion.div>
        )}

        {step === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white border border-slate-200 rounded-3xl p-8 space-y-8 shadow-sm"
          >
            <button onClick={prevStep} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
              <ArrowLeft className="w-4 h-4" /> 이전으로
            </button>

            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-[#0F172A]">보안 및 데이터 정책</h3>
                <p className="text-sm text-[#64748B]">가장 안전한 법률 서비스를 위해 다음 설정을 확인해 주세요.</p>
              </div>

              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex gap-4">
                  <Smartphone className="w-6 h-6 text-indigo-600 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-indigo-900">2단계 인증(2FA) 설정 권장</p>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      소송 상대방의 해킹 시도 등으로부터 데이터를 보호하기 위해 로그인 시 추가 인증을 사용합니다.
                    </p>
                    <button className="text-xs font-bold text-indigo-600 hover:underline pt-1">지금 설정하기</button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={agreements.aiOptOut}
                      onChange={(e) => setAgreements(prev => ({ ...prev, aiOptOut: e.target.checked }))}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" 
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">AI 학습 활용 거부 (선택)</p>
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">Privacy</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        입력하신 민감한 소송 내용을 AI 모델 학습 데이터로 사용하지 않도록 설정합니다. 사용자의 데이터 주권을 보장합니다.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={agreements.article2}
                      onChange={(e) => setAgreements(prev => ({ ...prev, article2: e.target.checked }))}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" 
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">서비스 성격 및 한계 동의 (필수)</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        본 서비스는 AI 기반 문서 작성 보조 도구이며, 구체적인 법률 판단이나 대리 행위를 수행하지 않음에 동의합니다.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={agreements.article3}
                      onChange={(e) => setAgreements(prev => ({ ...prev, article3: e.target.checked }))}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" 
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">책임 제한 및 면책 조항 동의 (필수)</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        모든 소송 결과에 대한 책임은 사용자 본인에게 있으며, 제출 전 최종 검토 의무가 있음을 인지하고 동의합니다.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={agreements.terms}
                      onChange={(e) => setAgreements(prev => ({ ...prev, terms: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" 
                    />
                    <p className="text-sm font-bold text-slate-800">이용약관 및 개인정보 처리방침 동의 (필수)</p>
                  </label>
                </div>
              </div>

              <button 
                onClick={nextStep}
                className="w-full py-4 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
              >
                가입 완료하기
              </button>
            </div>
          </motion.div>
        )}

        {step === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-6 shadow-sm"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-[#0F172A]">가입이 완료되었습니다!</h3>
              <p className="text-[#64748B]">
                {type === 'user' 
                  ? "이제 당신의 든든한 법률 페이스메이커가 함께합니다."
                  : "변호사 회원님, 환영합니다! 이제 프로필 정보와 자격 증빙 서류를 등록해 주세요. 운영팀 확인 후 정식 승인됩니다."}
              </p>
            </div>
            <button 
              onClick={handleComplete}
              disabled={isLoggingIn}
              className="w-full py-4 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoggingIn && <Loader2 className="w-5 h-5 animate-spin" />}
              {type === 'lawyer' ? '프로필 등록하러 가기' : '시작하기'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
