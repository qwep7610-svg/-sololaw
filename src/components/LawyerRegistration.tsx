import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Camera, Save, Trash2, UserPlus, Image as ImageIcon, Check, AlertCircle, Sparkles, ShieldCheck, Loader2, Info, Megaphone, FileCheck, AlertTriangle, CreditCard, User as UserIcon } from 'lucide-react';
import { db, auth, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { generateLawyerMarketingCopy, checkLawyerAdCompliance } from '../services/gemini';

declare global {
  interface Window {
    IMP: any;
  }
}

interface LawyerProfile {
  name: string;
  experience: string;
  cases: string;
  specialty: string;
  message: string;
  photo: string | null;
  firmLogo: string | null;
  firmName: string;
  regNumber: string;
  location: string;
  reviewPrice: number;
  settlementCycle: string;
}

export default function LawyerRegistration({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<LawyerProfile>({
    name: '',
    experience: '',
    cases: '',
    specialty: '',
    message: '',
    photo: null,
    firmLogo: null,
    firmName: '',
    regNumber: '',
    location: '',
    reviewPrice: 50000,
    settlementCycle: '주간 (월-일 집계 후 익주 금요일 입금)'
  });
  const [verificationFile, setVerificationFile] = useState<{ data: string; mimeType: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [adCopy, setAdCopy] = useState<{
    headline: string;
    subtext: string;
    tags: string[];
    cta_text: string;
  } | null>(null);
  const [complianceResult, setComplianceResult] = useState<{
    isCompliant: boolean;
    violations: string[];
    analysis: string;
    recommendation: string;
  } | null>(null);
  const [isGeneratingAd, setIsGeneratingAd] = useState(false);
  const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        // Load public profile
        const docRef = doc(db, 'lawyer_profiles', user.uid);
        let docSnap;
        try {
          docSnap = await getDoc(docRef);
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `lawyer_profiles/${user.uid}`);
        }
        
        // Load registration info
        const regRef = doc(db, 'lawyers', user.uid);
        let regSnap;
        try {
          regSnap = await getDoc(regRef);
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `lawyers/${user.uid}`);
        }

        // Load subscription
        const subRef = doc(db, 'subscriptions', user.uid);
        let subSnap;
        try {
          subSnap = await getDoc(subRef);
          if (subSnap.exists()) {
            setCurrentSubscription(subSnap.data());
          }
        } catch (e) {
          // It's okay if subscription doesn't exist, but we should handle permission errors
          if (e instanceof Error && e.message.includes('permission')) {
            handleFirestoreError(e, OperationType.GET, `subscriptions/${user.uid}`);
          }
        }

        let combinedProfile = { ...profile };

        if (docSnap.exists()) {
          combinedProfile = { ...combinedProfile, ...docSnap.data() };
        }
        
        if (regSnap.exists()) {
          const regData = regSnap.data();
          setStatus(regData.status || 'pending');
          combinedProfile = { 
            ...combinedProfile, 
            regNumber: regData.regNumber || '',
            location: regData.location || '',
            reviewPrice: regData.reviewPrice || 50000,
            settlementCycle: regData.settlementCycle || '주간 (월-일 집계 후 익주 금요일 입금)'
          };
        }

        setProfile(combinedProfile as LawyerProfile);
      } catch (error) {
        console.error("Error loading lawyer profile:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to ~1MB for Firestore)
    if (file.size > 800000) {
      alert('사진 크기가 너무 큽니다. 800KB 이하의 사진을 선택해 주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setProfile(prev => ({ ...prev, photo: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) {
      alert('로고 크기가 너무 큽니다. 800KB 이하의 사진을 선택해 주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setProfile(prev => ({ ...prev, firmLogo: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleVerificationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) {
      alert('서류 크기가 너무 큽니다. 800KB 이하의 파일을 선택해 주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setVerificationFile({
        data: base64,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRequestBillingKey = (plan: 'basic' | 'standard' | 'premium', amount: number) => {
    if (!window.IMP) {
      alert('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    
    const { IMP } = window;
    // Note: This is a test merchant ID. In production, use your real PortOne ID.
    IMP.init('imp00000000'); 

    IMP.request_pay({
      pg: 'html5_inicis.billing',
      pay_method: 'card',
      merchant_uid: `billing_${user?.uid}_${Date.now()}`,
      name: `SoloLaw 변호사 정액제 광고 (${plan.toUpperCase()})`,
      amount: 0, // Billing key issuance is 0 won
      customer_uid: `lawyer_${user?.uid}`, // Unique ID for this lawyer's card
    }, async (rsp: any) => {
      if (rsp.success) {
        try {
          setIsSubscribing(true);
          const response = await fetch('/api/subscriptions/billing-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lawyerId: user?.uid,
              customer_uid: rsp.customer_uid,
              planType: plan,
              amount: amount
            })
          });
          
          if (response.ok) {
            alert('정기 결제 등록이 완료되었습니다.');
            // Reload subscription
            const subRef = doc(db, 'subscriptions', user!.uid);
            const subSnap = await getDoc(subRef);
            if (subSnap.exists()) {
              setCurrentSubscription(subSnap.data());
            }
          } else {
            const errData = await response.json();
            alert(`서버 저장 중 오류가 발생했습니다: ${errData.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Subscription error:', error);
          alert('통신 중 오류가 발생했습니다.');
        } finally {
          setIsSubscribing(false);
        }
      } else {
        alert(`등록 실패: ${rsp.error_msg}`);
      }
    });
  };

  const handleSave = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (!user.email) {
      alert('이메일 정보가 확인되지 않습니다. 다시 로그인해 주세요.');
      return;
    }
    if (!profile.name || !profile.experience || !profile.regNumber || !profile.location) {
      alert('이름, 경력 사항, 등록번호, 소속 정보는 필수 입력 항목입니다.');
      return;
    }

    setIsSaving(true);
    try {
      // 2. Save/Update registration for admin verification
      const regRef = doc(db, 'lawyers', user.uid);
      const regSnap = await getDoc(regRef);
      const existingReg = regSnap.data();
      
      // If no existing verification doc, require one
      if (!existingReg?.verificationDocUrl && !verificationFile) {
        alert('자격 증빙 서류를 업로드해 주세요.');
        setIsSaving(false);
        return;
      }

      const profileData = {
        name: profile.name,
        experience: profile.experience,
        cases: profile.cases,
        specialty: profile.specialty,
        message: profile.message,
        photo: profile.photo,
        firmLogo: profile.firmLogo,
        firmName: profile.firmName,
        userId: user.uid,
        updatedAt: serverTimestamp()
      };

      // 1. Save current public profile
      await setDoc(doc(db, 'lawyer_profiles', user.uid), profileData);

      // 2. Save/Update registration for admin verification
      // We only set status to pending if it's a new registration or if they want to re-verify
      await setDoc(regRef, {
        name: profile.name,
        email: user.email,
        regNumber: profile.regNumber,
        location: profile.location,
        reviewPrice: Number(profile.reviewPrice),
        settlementCycle: profile.settlementCycle,
        status: regSnap.exists() ? regSnap.data().status : 'pending',
        verificationFile: verificationFile,
        verificationDocUrl: verificationFile ? `data:${verificationFile.mimeType};base64,${verificationFile.data}` : (regSnap.exists() ? regSnap.data().verificationDocUrl : null),
        updatedAt: serverTimestamp(),
        createdAt: regSnap.exists() ? regSnap.data().createdAt : serverTimestamp()
      }, { merge: true });

      // 3. Save to history for audit trail
      await addDoc(collection(db, 'lawyer_profile_history'), {
        userId: user.uid,
        profileData: profile,
        modifiedAt: serverTimestamp(),
      });

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);

      // Save ad copy if generated
      if (adCopy) {
        await setDoc(doc(db, 'lawyer_ads', user.uid), {
          ...adCopy,
          userId: user.uid,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error: any) {
      console.error("Error saving lawyer profile:", error);
      if (error.message?.includes('permission')) {
        alert('권한이 없습니다. 관리자에게 문의하거나 다시 로그인해 주세요.');
      } else {
        alert('프로필 저장 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (confirm('입력된 정보를 모두 삭제하시겠습니까?')) {
      setIsSaving(true);
      try {
        // We don't delete the history, only the current profile
        // Or we could just reset the local state and save an empty profile
        const emptyProfile: LawyerProfile = {
          name: '',
          experience: '',
          cases: '',
          specialty: '',
          message: '',
          photo: null,
          firmLogo: null,
          firmName: '',
          regNumber: '',
          location: '',
          reviewPrice: 50000,
          settlementCycle: '주간 (월-일 집계 후 익주 금요일 입금)'
        };
        setProfile(emptyProfile);
        
        await setDoc(doc(db, 'lawyer_profiles', user!.uid), {
          name: '',
          experience: '',
          cases: '',
          specialty: '',
          message: '',
          photo: null,
          firmLogo: null,
          firmName: '',
          userId: user!.uid,
          updatedAt: serverTimestamp()
        });

        await setDoc(doc(db, 'lawyers', user!.uid), {
          name: '',
          regNumber: '',
          location: '',
          updatedAt: serverTimestamp()
        }, { merge: true });

        await addDoc(collection(db, 'lawyer_profile_history'), {
          userId: user!.uid,
          profileData: emptyProfile,
          modifiedAt: serverTimestamp(),
          action: 'clear'
        });

      } catch (error) {
        console.error("Error clearing lawyer profile:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleGenerateAd = async () => {
    if (!profile.name || !profile.specialty || !profile.experience) {
      alert('이름, 전문 분야, 경력 사항을 먼저 입력해 주세요.');
      return;
    }
    setIsGeneratingAd(true);
    try {
      const result = await generateLawyerMarketingCopy({
        name: profile.name,
        specialty: profile.specialty,
        experience: profile.experience,
        service_style: profile.message || '친절하고 정확한 법률 검토'
      });
      if (result) {
        setAdCopy(result);
        // Automatically check compliance
        setIsCheckingCompliance(true);
        const compliance = await checkLawyerAdCompliance(JSON.stringify(result));
        setComplianceResult(compliance);
      }
    } catch (error) {
      console.error("Error generating ad:", error);
    } finally {
      setIsGeneratingAd(false);
      setIsCheckingCompliance(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
        <p className="text-slate-500 font-medium">프로필 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between px-2">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-600 transition-all group"
        >
          <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm group-hover:border-brand-200 group-hover:bg-brand-50 transition-all">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          </div>
          뒤로 가기
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          <span className="text-[11px] text-slate-600 font-bold">변호사 전용 모드</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {status === 'pending' && (
          <div className="bg-brand-50 border-b border-brand-100 p-8 space-y-4">
            <div className="flex items-center gap-3 text-brand-600">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="text-lg font-bold">[변호사 자격 승인 대기 안내]</h3>
            </div>
            <div className="space-y-3 text-sm text-brand-800/80 leading-relaxed">
              <p><strong>SoloLaw</strong>를 선택해 주셔서 감사합니다.</p>
              <p>전문가 회원의 신뢰도를 위해 현재 관리자가 대한변호사협회 등록 정보를 바탕으로 자격 검토를 진행 중입니다.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="bg-white/50 p-4 rounded-2xl">
                  <p className="font-bold text-brand-900 mb-1 text-xs">소요 시간</p>
                  <p className="text-xs">업무일 기준 평균 2~3시간 이내</p>
                </div>
                <div className="bg-white/50 p-4 rounded-2xl">
                  <p className="font-bold text-brand-900 mb-1 text-xs">검토 내용</p>
                  <p className="text-xs">변호사 등록번호 및 신분 일치 여부</p>
                </div>
              </div>
              <p className="mt-4 text-xs">• 승인 완료 시 등록하신 이메일로 알림이 발송됩니다.</p>
              <p className="text-xs">• 자격 검토 중에는 프로필 수정 및 앱 둘러보기만 가능하며, 유료 검토 서비스 수락은 승인 후 활성화됩니다.</p>
            </div>
          </div>
        )}
        {status === 'rejected' && (
          <div className="bg-red-50 border-b border-red-100 p-8 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold">[변호사 자격 승인 거절 안내]</h3>
            </div>
            <div className="space-y-3 text-sm text-red-800/80 leading-relaxed">
              <p>제출하신 정보로 자격 확인이 불가능하여 승인이 거절되었습니다.</p>
              <p className="font-bold mt-2">거절 사유:</p>
              <div className="bg-white/50 p-4 rounded-2xl text-red-900">
                {/* We should fetch the rejection reason from the lawyer doc */}
                정보 불일치 또는 증빙 서류 미비. 프로필 정보를 다시 확인하고 수정해 주세요.
              </div>
              <p className="mt-4 text-xs">• 정보를 수정하여 다시 저장하시면 재검토가 진행됩니다.</p>
            </div>
          </div>
        )}
        <div className="p-8 border-b border-slate-100 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-brand-600 rounded-2xl shadow-lg shadow-brand-100">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Management</span>
                <div className="h-px w-8 bg-brand-200" />
              </div>
              <h2 className="text-2xl font-bold text-[#0F172A] font-serif tracking-tight">변호사 프로필 등록 및 수정</h2>
              <p className="text-sm text-[#64748B] mt-1">입력하신 정보를 바탕으로 AI가 최적화된 광고 카드를 생성합니다.</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Photo & Logo Upload Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-300">
                  {profile.photo ? (
                    <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-10 h-10 text-slate-300" />
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-3 bg-brand-600 text-white rounded-2xl shadow-lg hover:bg-brand-700 transition-all hover:scale-110"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              <p className="text-xs text-slate-400 font-bold">프로필 사진 (얼굴)</p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-300">
                  {profile.firmLogo ? (
                    <img src={profile.firmLogo} alt="Firm Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                  )}
                </div>
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => handleLogoChange(e as any);
                    input.click();
                  }}
                  className="absolute -bottom-2 -right-2 p-3 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 transition-all hover:scale-110"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 font-bold">커스텀 로고 (사무소 로고)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                value={profile.name}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                placeholder="예: 홍길동 변호사"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                사무소/브랜드명
              </label>
              <input 
                type="text"
                value={profile.firmName}
                onChange={(e) => setProfile(prev => ({ ...prev, firmName: e.target.value }))}
                placeholder="예: 법무법인 SoloLaw"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                사법연수원/변시 기수 <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                value={profile.experience}
                onChange={(e) => setProfile(prev => ({ ...prev, experience: e.target.value }))}
                placeholder="예: 사법연수원 40기 / 변시 5회"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                변호사 등록번호 <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                value={profile.regNumber}
                onChange={(e) => setProfile(prev => ({ ...prev, regNumber: e.target.value }))}
                placeholder="예: 12345"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1 ml-1 flex items-center gap-1">
                <Info className="w-3 h-3" /> 대한변호사협회에 등록된 정식 등록번호를 입력해 주세요.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                소속 지역/법률사무소 <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                value={profile.location}
                onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                placeholder="예: 서울 서초구 / 법무법인 한결"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                검토 서비스 비용 (원) <span className="text-red-500">*</span>
              </label>
              <input 
                type="number"
                value={profile.reviewPrice}
                onChange={(e) => setProfile(prev => ({ ...prev, reviewPrice: Number(e.target.value) }))}
                placeholder="예: 50000"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1 ml-1 flex items-center gap-1">
                <Info className="w-3 h-3" /> 사용자가 지불할 서비스 금액을 직접 설정합니다.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                희망 정산 주기 <span className="text-red-500">*</span>
              </label>
              <select 
                value={profile.settlementCycle}
                onChange={(e) => setProfile(prev => ({ ...prev, settlementCycle: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-sm bg-white"
              >
                <option value="주간 (월-일 집계 후 익주 금요일 입금)">주간 (월-일 집계 후 익주 금요일 입금)</option>
                <option value="월간 (매월 말일 집계 후 익월 10일 입금)">월간 (매월 말일 집계 후 익월 10일 입금)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[#0F172A]">전문 분야</label>
            <input 
              type="text"
              value={profile.specialty}
              onChange={(e) => setProfile(prev => ({ ...prev, specialty: e.target.value }))}
              placeholder="예: 부동산, 임대차, 가사, 형사 (쉼표로 구분)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1 ml-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> 부동산, 임대차, 보증금 등 주요 전문 분야를 쉼표(,)로 구분하여 입력해 주세요.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[#0F172A]">주요 승소 사례</label>
            <textarea 
              value={profile.cases}
              onChange={(e) => setProfile(prev => ({ ...prev, cases: e.target.value }))}
              placeholder="예: 보증금 반환 소송 100건 이상 승소, 상간자 위자료 청구 승소율 90% 등"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-sm min-h-[100px] resize-none"
            />
            <p className="text-[11px] text-slate-500 mt-1 ml-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> 판결 결과, 인용 금액 등 구체적인 성과를 바탕으로 작성해 주세요.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[#0F172A]">변호사 한마디 (핵심 가치)</label>
            <input 
              type="text"
              value={profile.message}
              onChange={(e) => setProfile(prev => ({ ...prev, message: e.target.value }))}
              placeholder="예: 의뢰인의 권리, 끝까지 책임지고 지켜드립니다."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              변호사 자격 증빙 서류 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*,application/pdf';
                  input.onchange = (e) => handleVerificationFileChange(e as any);
                  input.click();
                }}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-all flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {verificationFile ? '서류 변경하기' : '증빙 서류 업로드'}
              </button>
              {verificationFile && (
                <div className="flex items-center gap-2 text-brand-600 text-xs font-bold">
                  <Check className="w-4 h-4" />
                  서류가 선택되었습니다.
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 ml-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> 변호사 신분증 또는 자격 증명서 사진을 업로드해 주세요. (관리자 확인용)
            </p>
          </div>

          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              입력하신 정보는 변호사법 광고 규정을 준수하여 객관적인 사실 위주로 작성해 주세요. 
              AI가 문구를 다듬을 때 허위 또는 과장 광고가 되지 않도록 주의합니다.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleClear}
              className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" /> 초기화
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-[2] py-4 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : isSaved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
              {isSaving ? '저장 중...' : isSaved ? '저장 완료' : '프로필 저장하기'}
            </button>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">SoloLaw 파트너십 구독</h3>
              <p className="text-xs text-slate-500">정액제 광고로 더 많은 의뢰인을 만나보세요.</p>
            </div>
          </div>

          {currentSubscription ? (
            <div className="bg-brand-50 border border-brand-100 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-brand-600 font-bold uppercase tracking-wider">현재 이용 중인 플랜</p>
                  <h4 className="text-xl font-bold text-brand-900">
                    {currentSubscription.planType === 'premium' ? '프리미엄' : 
                     currentSubscription.planType === 'standard' ? '스탠다드' : '베이직'} 플랜
                  </h4>
                </div>
                <div className="px-3 py-1 bg-brand-600 text-white text-[10px] font-bold rounded-full">
                  구독 중
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-white/50 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-500 mb-1">다음 결제 예정일</p>
                  <p className="text-sm font-bold text-slate-700">
                    {currentSubscription.nextBillingDate?.toDate ? 
                      currentSubscription.nextBillingDate.toDate().toLocaleDateString() : 
                      new Date(currentSubscription.nextBillingDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-white/50 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-500 mb-1">월 결제 금액</p>
                  <p className="text-sm font-bold text-slate-700">
                    {currentSubscription.amount.toLocaleString()}원
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-brand-700 flex items-center gap-1">
                <Info className="w-3 h-3" /> 매달 자동 결제되며, 언제든 해지 가능합니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'basic', name: '베이직', price: 99000, color: 'slate' },
                { id: 'standard', name: '스탠다드', price: 199000, color: 'brand' },
                { id: 'premium', name: '프리미엄', price: 299000, color: 'amber' }
              ].map((plan) => (
                <div 
                  key={plan.id}
                  className={`border-2 rounded-2xl p-5 space-y-4 transition-all hover:shadow-md ${
                    plan.id === 'standard' ? 'border-brand-200 bg-brand-50/30' : 'border-slate-100'
                  }`}
                >
                  <div className="space-y-1">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${
                      plan.id === 'premium' ? 'text-amber-600' : plan.id === 'standard' ? 'text-brand-600' : 'text-slate-500'
                    }`}>
                      {plan.name}
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {plan.price.toLocaleString()}원 <span className="text-xs font-normal text-slate-400">/ 월</span>
                    </p>
                  </div>
                  
                  <ul className="space-y-2">
                    <li className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-green-500" /> 리스트 상단 노출
                    </li>
                    <li className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-green-500" /> AI 홍보 카드 제공
                    </li>
                  </ul>

                  <button
                    onClick={() => handleRequestBillingKey(plan.id as any, plan.price)}
                    disabled={isSubscribing}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                      plan.id === 'standard' 
                        ? 'bg-brand-600 text-white hover:bg-brand-700' 
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isSubscribing ? '처리 중...' : '구독하기'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-brand-600" />
            <h3 className="text-lg font-bold text-[#0F172A]">AI 광고 카드 생성 및 관리</h3>
          </div>
          <button
            onClick={handleGenerateAd}
            disabled={isGeneratingAd || status !== 'approved'}
            className="px-4 py-2 bg-brand-50 text-brand-600 rounded-xl text-xs font-bold hover:bg-brand-100 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingAd ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI 광고 문구 생성하기
          </button>
        </div>

        {status !== 'approved' && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex gap-3">
            <Info className="w-5 h-5 text-slate-400 shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed">
              광고 카드 생성 및 노출은 <strong>변호사 자격 승인 완료 후</strong> 가능합니다. 
              승인 대기 중에는 미리보기만 가능합니다.
            </p>
          </div>
        )}

        {adCopy && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">미리보기</p>
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 opacity-50 blur-2xl group-hover:scale-110 transition-transform" />
                <div className="relative space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200">
                      {profile.photo ? (
                        <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-300 m-3" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{profile.name}</h4>
                      <p className="text-[10px] text-slate-500">{profile.location}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h5 className="text-lg font-bold text-brand-600 leading-tight">{adCopy.headline}</h5>
                    <p className="text-xs text-slate-600 leading-relaxed">{adCopy.subtext}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {adCopy.tags.map((tag, i) => (
                      <span key={`tag-${i}`} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">#{tag}</span>
                    ))}
                  </div>
                  <button className="w-full py-3 bg-brand-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-brand-100">
                    {adCopy.cta_text}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">변호사법 준수 검토 결과</p>
              {isCheckingCompliance ? (
                <div className="p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                  <p className="text-xs text-slate-500">규정 준수 여부를 분석 중입니다...</p>
                </div>
              ) : complianceResult ? (
                <div className={`p-6 rounded-3xl border ${complianceResult.isCompliant ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'} space-y-4`}>
                  <div className="flex items-center gap-2">
                    {complianceResult.isCompliant ? (
                      <FileCheck className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    )}
                    <h4 className={`font-bold ${complianceResult.isCompliant ? 'text-green-700' : 'text-amber-700'}`}>
                      {complianceResult.isCompliant ? '광고 규정 준수 확인됨' : '주의 및 수정 권고'}
                    </h4>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 leading-relaxed">{complianceResult.analysis}</p>
                    {!complianceResult.isCompliant && (
                      <div className="space-y-2 mt-2">
                        <p className="text-[11px] font-bold text-amber-800">위반 가능성 항목:</p>
                        <ul className="list-disc list-inside text-[11px] text-amber-700 space-y-1">
                          {complianceResult.violations.map((v, i) => <li key={i}>{v}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4 p-3 bg-white/50 rounded-xl border border-white">
                      <p className="text-[11px] font-bold text-slate-700 mb-1">개선 권고안:</p>
                      <p className="text-[11px] text-slate-600 italic">"{complianceResult.recommendation}"</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="bg-brand-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-400 rounded-full -mr-32 -mt-32 opacity-20 blur-3xl" />
        <div className="relative space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-800 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-brand-400" />
            </div>
            <h3 className="text-lg font-bold">SoloLaw 파트너십 안내 (정액제 광고 상품)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-brand-300">"SoloLaw는 사건 수임에 관여하지 않습니다."</h4>
              <p className="text-xs text-brand-100/80 leading-relaxed">
                본 플랫폼은 변호사법을 준수하며, 의뢰인과의 상담이나 수임 과정에서 어떠한 수수료도 취하지 않습니다. 
                변호사님께서는 오직 <strong>'플랫폼 내 노출 공간'</strong>에 대한 정액 광고비만 지불하시면 됩니다.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-brand-300">신뢰의 기술</h4>
              <p className="text-xs text-brand-100/80 leading-relaxed">
                사용자가 AI로 작성한 초안을 들고 변호사님을 찾아갑니다. 
                기초 사실관계가 정리되어 있어 상담 효율이 극대화됩니다.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-brand-300">투명한 비용</h4>
              <p className="text-xs text-brand-100/80 leading-relaxed">
                월 <strong>99,000원</strong>의 정액 비용으로, 추가 비용 없이 귀하의 전문성을 나홀로 소송 유저들에게 알리세요.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-brand-300">데이터 매칭</h4>
              <p className="text-xs text-brand-100/80 leading-relaxed">
                사용자가 작성 중인 문서의 카테고리(예: 전세사기 내용증명)와 변호사님의 전문 분야가 일치할 때 우선적으로 노출됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
