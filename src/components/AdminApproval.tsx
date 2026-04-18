import React, { useState, useEffect } from 'react';
import { Check, X, ExternalLink, ShieldCheck, Mail, Clock, AlertCircle, FileText, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, handleFirestoreError, OperationType, addDoc } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

interface PendingLawyer {
  id: string;
  name: string;
  firmName: string;
  email: string;
  regNumber: string;
  pendingChanges?: {
    specialty?: string;
    experience?: string;
    cases?: string;
  };
  verificationDocUrl?: string;
  qualificationDocUrl?: string;
  updatedAt?: any;
}

export default function AdminApproval({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [pendingLawyers, setPendingLawyers] = useState<PendingLawyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Fetch lawyers with pending approval requests
    const q = query(collection(db, 'lawyers'), where('pendingApproval', '==', true));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lawyers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PendingLawyer[];
      setPendingLawyers(lawyers);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching pending lawyers:", error);
      handleFirestoreError(error, OperationType.LIST, 'lawyers');
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (lawyer: PendingLawyer) => {
    if (!user) return;
    setProcessingId(lawyer.id);
    try {
      const updates: any = {
        pendingApproval: false,
        updatedAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
      };

      // If there are pending changes to profile, apply them
      if (lawyer.pendingChanges) {
        updates.specialty = lawyer.pendingChanges.specialty;
        updates.experience = lawyer.pendingChanges.experience;
        updates.cases = lawyer.pendingChanges.cases;
        updates.pendingChanges = null; // Clear pending changes

        // Also update the public profile document
        await updateDoc(doc(db, 'lawyer_profiles', lawyer.id), {
          specialty: updates.specialty,
          experience: updates.experience,
          cases: updates.cases,
          updatedAt: serverTimestamp()
        });
      }

      await updateDoc(doc(db, 'lawyers', lawyer.id), updates);
      
      // Log admin action
      await addDoc(collection(db, 'admin_audit_logs'), {
        adminId: user.uid,
        adminName: user.displayName || 'Admin',
        action: 'APPROVE_PROFILE_UPDATE',
        targetId: lawyer.id,
        targetName: lawyer.name,
        timestamp: serverTimestamp()
      });

      setSuccessMsg(`${lawyer.name} 변호사의 프로필 업데이트가 승인되었습니다.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      console.error("Approval error:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (lawyer: PendingLawyer) => {
    if (!user) return;
    const reason = window.prompt('반려 사유를 입력해 주세요:');
    if (reason === null) return;
    
    setProcessingId(lawyer.id);
    try {
      await updateDoc(doc(db, 'lawyers', lawyer.id), {
        pendingApproval: false,
        rejectionReason: reason,
        pendingChanges: null, // Clear pending changes
        updatedAt: serverTimestamp()
      });

      // Log admin action
      await addDoc(collection(db, 'admin_audit_logs'), {
        adminId: user.uid,
        adminName: user.displayName || 'Admin',
        action: 'REJECT_PROFILE_UPDATE',
        targetId: lawyer.id,
        targetName: lawyer.name,
        reason: reason,
        timestamp: serverTimestamp()
      });

      setSuccessMsg(`${lawyer.name} 변호사의 요청이 반려되었습니다.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      console.error("Rejection error:", error);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">변호사 프로필 승인 관리</h2>
          <p className="text-slate-500 mt-1">프로필 수정 및 증빙 서류 제출 내역을 검토합니다.</p>
        </div>
        <div className="bg-white border px-4 py-2 rounded-2xl flex items-center gap-2 shadow-sm">
          <Clock className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-bold text-slate-700">대기 중: {pendingLawyers.length}건</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {pendingLawyers.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-slate-100 rounded-[2.5rem] p-16 text-center shadow-sm"
            >
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">검토 대기 중인 요청이 없습니다.</h3>
              <p className="text-slate-400 mt-2">모든 변호사가 최신 상태이거나 승인되었습니다.</p>
            </motion.div>
          ) : (
            pendingLawyers.map((lawyer) => (
              <motion.div
                key={lawyer.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Lawyer Info Card */}
                  <div className="lg:w-1/3 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                        <User className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-slate-900">{lawyer.name}</h4>
                        <p className="text-sm text-slate-500">{lawyer.firmName}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 p-5 bg-slate-50 rounded-3xl border border-slate-100 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold">이메일</span>
                        <span className="text-slate-700 font-medium">{lawyer.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold">등록번호</span>
                        <span className="text-slate-700 font-mono">{lawyer.regNumber}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold">요청일시</span>
                        <span className="text-slate-700">{lawyer.updatedAt?.toDate().toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">제출 서류</p>
                      <div className="grid grid-cols-2 gap-3">
                        {lawyer.verificationDocUrl ? (
                          <a 
                            href={lawyer.verificationDocUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex flex-col items-center p-3 bg-white border border-slate-100 rounded-2xl hover:border-brand-600 hover:text-brand-600 transition-all group"
                          >
                            <FileText className="w-6 h-6 mb-1 opacity-50 group-hover:opacity-100" />
                            <span className="text-[10px] font-bold">협회 등록증</span>
                          </a>
                        ) : (
                          <div className="flex flex-col items-center p-3 bg-slate-50 border border-slate-100 rounded-2xl opacity-40 grayscale">
                            <FileText className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">등록증 미제출</span>
                          </div>
                        )}
                        {lawyer.qualificationDocUrl ? (
                          <a 
                            href={lawyer.qualificationDocUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex flex-col items-center p-3 bg-white border border-slate-100 rounded-2xl hover:border-brand-600 hover:text-brand-600 transition-all group"
                          >
                            <ShieldCheck className="w-6 h-6 mb-1 opacity-50 group-hover:opacity-100" />
                            <span className="text-[10px] font-bold">자격 증명서</span>
                          </a>
                        ) : (
                          <div className="flex flex-col items-center p-3 bg-slate-50 border border-slate-100 rounded-2xl opacity-40 grayscale">
                            <ShieldCheck className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">자격증 미제출</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Changes Review */}
                  <div className="flex-1 space-y-6">
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                      <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-brand-400" />
                        수정 요청 내역
                      </h4>
                      
                      <div className="space-y-6">
                        {lawyer.pendingChanges ? (
                          <>
                            {lawyer.pendingChanges.specialty && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">전문 분야</p>
                                <p className="text-sm font-medium bg-white/5 p-4 rounded-xl border border-white/5">{lawyer.pendingChanges.specialty}</p>
                              </div>
                            )}
                            {lawyer.pendingChanges.experience && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">경력 사항</p>
                                <p className="text-sm font-medium bg-white/5 p-4 rounded-xl border border-white/5">{lawyer.pendingChanges.experience}</p>
                              </div>
                            )}
                            {lawyer.pendingChanges.cases && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">승소 사례</p>
                                <p className="text-sm font-medium bg-white/5 p-4 rounded-xl border border-white/5 whitespace-pre-wrap">{lawyer.pendingChanges.cases}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-slate-400 italic text-sm py-8 text-center bg-white/5 rounded-2xl border border-white/5">서류 기반 인증 요청입니다.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleReject(lawyer)}
                        disabled={processingId === lawyer.id}
                        className="flex-1 py-4 bg-white border-2 border-slate-100 text-red-600 rounded-2xl font-black text-sm hover:border-red-200 hover:bg-red-50 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                      >
                        <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        요청 반려
                      </button>
                      <button 
                        onClick={() => handleApprove(lawyer)}
                        disabled={processingId === lawyer.id}
                        className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-brand-600 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 shadow-xl shadow-slate-200"
                      >
                        {processingId === lawyer.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            처리 중...
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            최종 승인 및 프로필 반영
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 z-50 font-bold"
          >
            <ShieldCheck className="w-5 h-5" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
