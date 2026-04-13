import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Lock, Smartphone, ArrowLeft, Check, AlertCircle, Loader2, KeyRound, Trash2 } from 'lucide-react';
import { db, auth, doc, updateDoc, getDoc, collection, query, where, getDocs, deleteDoc, writeBatch } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

export default function SecuritySettings({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setIs2FAEnabled(userDoc.data().is2FAEnabled || false);
        }
      } catch (error) {
        console.error("Error loading security settings:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [user]);

  const handleToggle2FA = async () => {
    if (!is2FAEnabled) {
      setShowPinSetup(true);
    } else {
      if (confirm('2단계 인증을 해제하시겠습니까? 보안이 취약해질 수 있습니다.')) {
        setIsSaving(true);
        try {
          await updateDoc(doc(db, 'users', user!.uid), {
            is2FAEnabled: false,
            twoFactorSecret: null
          });
          setIs2FAEnabled(false);
        } catch (error) {
          console.error("Error disabling 2FA:", error);
        } finally {
          setIsSaving(false);
        }
      }
    }
  };

  const handleSetupPin = async () => {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      alert('6자리 숫자를 입력해 주세요.');
      return;
    }
    if (pin !== confirmPin) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsSaving(true);
    try {
      // In a real app, we would hash this PIN. 
      // For this demo, we'll store it (ideally hashed/encrypted).
      await updateDoc(doc(db, 'users', user!.uid), {
        is2FAEnabled: true,
        twoFactorSecret: pin // Simplified for demo
      });
      setIs2FAEnabled(true);
      setShowPinSetup(false);
      setPin('');
      setConfirmPin('');
    } catch (error) {
      console.error("Error enabling 2FA:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!user) return;
    
    const confirmed = confirm('정말로 모든 데이터를 삭제하시겠습니까? 작성된 문서, 증거 사진, 분석 결과 등 모든 정보가 영구적으로 삭제되며 복구할 수 없습니다.');
    if (!confirmed) return;

    const secondConfirmed = confirm('마지막 확인입니다. 정말로 삭제하시겠습니까?');
    if (!secondConfirmed) return;

    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Delete lawyer profile
      batch.delete(doc(db, 'lawyer_profiles', user.uid));

      // 2. Delete complaints
      const complaintsQuery = query(collection(db, 'complaints'), where('userId', '==', user.uid));
      const complaintsSnap = await getDocs(complaintsQuery);
      complaintsSnap.forEach(d => batch.delete(d.ref));

      // 3. Delete history
      const historyQuery = query(collection(db, 'lawyer_profile_history'), where('userId', '==', user.uid));
      const historySnap = await getDocs(historyQuery);
      historySnap.forEach(d => batch.delete(d.ref));

      await batch.commit();
      alert('모든 데이터가 성공적으로 삭제되었습니다.');
      onBack();
    } catch (error) {
      console.error("Error deleting all data:", error);
      alert('데이터 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> 뒤로 가기
      </button>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-600 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#0F172A] font-serif">보안 설정</h2>
              <p className="text-sm text-[#64748B]">계정 보안을 강화하고 소중한 데이터를 보호하세요.</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 border border-slate-100">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                <Smartphone className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <p className="font-bold text-[#0F172A]">2단계 인증 (2FA)</p>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  로그인 시 추가 보안 PIN 번호를 확인합니다.<br />
                  해킹으로부터 계정을 안전하게 보호할 수 있습니다.
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle2FA}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${is2FAEnabled ? 'bg-brand-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${is2FAEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <AnimatePresence>
            {showPinSetup && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6 overflow-hidden"
              >
                <div className="p-6 rounded-2xl border-2 border-brand-100 bg-brand-50/30 space-y-4">
                  <div className="flex items-center gap-2 text-brand-700">
                    <KeyRound className="w-5 h-5" />
                    <p className="font-bold">보안 PIN 설정</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">새 PIN 번호 (6자리)</label>
                      <input 
                        type="password"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-center tracking-[1em] font-bold"
                        placeholder="••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">PIN 번호 확인</label>
                      <input 
                        type="password"
                        maxLength={6}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-center tracking-[1em] font-bold"
                        placeholder="••••••"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setShowPinSetup(false)}
                      className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                    >
                      취소
                    </button>
                    <button 
                      onClick={handleSetupPin}
                      disabled={isSaving || pin.length !== 6 || pin !== confirmPin}
                      className="flex-[2] py-3 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      설정 완료
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 flex gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-900">데이터 무결성 보장</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                변호사 프로필 정보의 모든 수정 사항은 감사 로그(Audit Log)에 기록됩니다. 
                이는 허위 정보 기재를 방지하고 사용자의 신뢰를 보호하기 위한 조치입니다.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-red-50 border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-red-900">모든 데이터 즉시 삭제</p>
                <p className="text-xs text-red-800 mt-1 leading-relaxed">
                  작성했던 모든 문서와 증거 사진을 서버에서 완전히 삭제합니다.<br />
                  삭제된 데이터는 복구가 불가능합니다.
                </p>
              </div>
            </div>
            <button
              onClick={handleDeleteAllData}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              전체 데이터 삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
