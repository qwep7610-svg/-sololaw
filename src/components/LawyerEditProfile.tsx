import React, { useState, useEffect } from 'react';
import { Upload, Info, CheckCircle2, Clock, ArrowLeft, Save, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, doc, updateDoc, getDoc, serverTimestamp, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

interface LawyerProfileData {
  name: string;
  firmName: string;
  specialty: string;
  experience: string;
  cases: string;
  message: string;
  regNumber: string;
  location: string;
  pendingApproval?: boolean;
  verificationDocUrl?: string; // Bar Registration
  qualificationDocUrl?: string; // Qualification Certificate
  pendingChanges?: {
    specialty?: string;
    experience?: string;
    cases?: string;
  };
}

export default function LawyerEditProfile({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<LawyerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const regSnap = await getDoc(doc(db, 'lawyers', user!.uid));
        const profileSnap = await getDoc(doc(db, 'lawyer_profiles', user!.uid));
        
        if (regSnap.exists() && profileSnap.exists()) {
          const regData = regSnap.data();
          const profileData = profileSnap.data();
          setProfile({
            ...profileData,
            ...regData,
            name: regData.name || profileData.name || '',
            firmName: regData.firmName || profileData.firmName || '',
            regNumber: regData.regNumber || '',
            location: regData.location || '',
          } as LawyerProfileData);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'verification' | 'qualification') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) {
      setErrorMsg('파일 크기가 너무 큽니다. 800KB 이하의 파일을 선택해 주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const field = type === 'verification' ? 'verificationDocUrl' : 'qualificationDocUrl';
      
      try {
        await updateDoc(doc(db, 'lawyers', user!.uid), {
          [field]: base64,
          pendingApproval: true,
          updatedAt: serverTimestamp()
        });
        setProfile(prev => prev ? { ...prev, [field]: base64, pendingApproval: true } : null);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `lawyers/${user!.uid}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCareerInfo = async () => {
    if (!user || !profile) return;
    setIsSaving(true);
    try {
      // For career info, we store it in pendingChanges until admin approves
      await updateDoc(doc(db, 'lawyers', user.uid), {
        pendingChanges: {
          specialty: profile.specialty,
          experience: profile.experience,
          cases: profile.cases,
        },
        pendingApproval: true,
        updatedAt: serverTimestamp()
      });
      setProfile(prev => prev ? { ...prev, pendingApproval: true } : null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `lawyers/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-brand-600 animate-spin" />
        <p className="text-slate-500 font-medium">프로필 로딩 중...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">프로필 관리</h2>
        </div>
        {profile.pendingApproval && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-xs font-bold border border-amber-100 shadow-sm"
          >
            <Clock className="w-4 h-4" /> 관리자 승인 대기 중
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Info */}
        <div className="space-y-6">
          <section className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">기본 정보</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 font-bold mb-1">성함</p>
                <p className="text-lg font-bold text-slate-900">{profile.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold mb-1">소속</p>
                <p className="text-sm font-medium text-slate-700">{profile.firmName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold mb-1">등록번호</p>
                <p className="text-sm font-mono text-slate-600">{profile.regNumber}</p>
              </div>
            </div>
          </section>

          <section className="bg-brand-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-brand-100 relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg">인증 상태</h4>
                <p className="text-brand-100 text-sm opacity-80">프로필 인증을 완료하면 검색 노출도가 상승합니다.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Editing Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* File Uploads */}
          <section className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">증빙 서류 제출</h3>
                <p className="text-slate-500 text-xs">변협 등록 및 자격 확인을 위한 서류를 업로드해 주세요.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <input 
                  type="file" 
                  className="hidden" 
                  id="bar-reg-input" 
                  onChange={(e) => handleFileUpload(e, 'verification')}
                  accept=".pdf,image/*"
                />
                <label 
                  htmlFor="bar-reg-input"
                  className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed transition-all cursor-pointer ${
                    profile.verificationDocUrl 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-brand-300 hover:bg-brand-50'
                  }`}
                >
                  {profile.verificationDocUrl ? (
                    <>
                      <CheckCircle2 className="w-8 h-8 mb-2" />
                      <span className="text-sm font-bold">협회 등록증 완료</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-sm font-bold">지방변호사회 등록증</span>
                    </>
                  )}
                </label>
              </div>

              <div className="relative group">
                <input 
                  type="file" 
                  className="hidden" 
                  id="qual-input" 
                  onChange={(e) => handleFileUpload(e, 'qualification')}
                  accept=".pdf,image/*"
                />
                <label 
                  htmlFor="qual-input"
                  className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed transition-all cursor-pointer ${
                    profile.qualificationDocUrl 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-brand-300 hover:bg-brand-50'
                  }`}
                >
                  {profile.qualificationDocUrl ? (
                    <>
                      <CheckCircle2 className="w-8 h-8 mb-2" />
                      <span className="text-sm font-bold">자격증명 완료</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-sm font-bold">전문 변호사 자격증</span>
                    </>
                  )}
                </label>
              </div>
            </div>
            <p className="flex items-start gap-2 text-[10px] text-slate-400 bg-slate-50 p-3 rounded-xl">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              업로드하신 서류는 관리자 확인용으로만 사용되며, 확인 즉시 시스템에서 파기되거나 암호화 저장됩니다.
            </p>
          </section>

          {/* Career Info */}
          <section className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-slate-900">커리어 정보 업데이트</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">전문 분야</label>
                <input 
                  type="text" 
                  value={profile.specialty}
                  onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-500 transition-all font-medium"
                  placeholder="예: 부동산, 임대차 분쟁, 이혼"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">경력 및 기수</label>
                <input 
                  type="text" 
                  value={profile.experience}
                  onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-500 transition-all font-medium"
                  placeholder="예: 사법연수원 40기, 법무법인 XX 파트너"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">승소 사례 요약</label>
                <textarea 
                  value={profile.cases}
                  onChange={(e) => setProfile({ ...profile, cases: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-500 transition-all font-medium min-h-[120px] resize-none"
                  placeholder="최근 3년간의 주요 승소 사례를 입력해 주세요."
                />
              </div>
            </div>

            <button 
              onClick={handleSaveCareerInfo}
              disabled={isSaving}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-brand-600 transition-all disabled:opacity-50 shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  승인 요청 중...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  요청 완료!
                </>
              ) : (
                '프로필 승인 요청하기'
              )}
            </button>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 z-50 font-bold text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            {errorMsg}
            <button onClick={() => setErrorMsg(null)} className="ml-2 hover:opacity-50">×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
