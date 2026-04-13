import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  FileText, 
  MessageSquare, 
  ChevronRight, 
  AlertCircle, 
  Loader2, 
  User, 
  Briefcase,
  ExternalLink,
  CreditCard,
  Check,
  History,
  Inbox
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../lib/AuthContext';
import { db, collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, doc, updateDoc, getDoc, handleFirestoreError, OperationType } from '../lib/firebase';
import { generateLawyerReviewReport, generateReviewServiceCopy } from '../services/gemini';
import { subscribeToHistory } from '../services/historyService';

type Status = 'pending' | 'assigned' | 'reviewing' | 'completed';

interface ReviewRequest {
  id: string;
  userId: string;
  userDisplayName: string;
  lawyerId: string | null;
  lawyerDisplayName: string | null;
  status: Status;
  userDraft: string;
  lawyerNotes: string;
  report: string;
  createdAt: any;
  updatedAt: any;
}

const STATUS_LABELS: Record<Status, string> = {
  pending: '신청 완료',
  assigned: '변호사 배정',
  reviewing: '검토 중',
  completed: '결과 완료'
};

const STATUS_COLORS: Record<Status, string> = {
  pending: 'bg-blue-100 text-blue-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  reviewing: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700'
};

export default function LawyerReviewService({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [view, setView] = useState<'landing' | 'apply' | 'history' | 'detail'>('landing');
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ReviewRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [landingCopy, setLandingCopy] = useState<string>('');
  const [userDrafts, setUserDrafts] = useState<any[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string>('');
  const [lawyerNotes, setLawyerNotes] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lawyerStatus, setLawyerStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load landing copy
  useEffect(() => {
    async function loadCopy() {
      try {
        const copy = await generateReviewServiceCopy();
        setLandingCopy(copy);
      } catch (error) {
        console.error("Failed to load landing copy:", error);
      }
    }
    loadCopy();
  }, []);

  // Load lawyer status
  useEffect(() => {
    if (user?.role === 'lawyer') {
      const unsubscribe = onSnapshot(doc(db, 'lawyers', user.uid), (doc) => {
        if (doc.exists()) {
          setLawyerStatus(doc.data().status);
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Load user's review requests or lawyer's assigned tasks
  useEffect(() => {
    if (!user) return;

    const q = user.role === 'lawyer' 
      ? query(collection(db, 'review_requests'), orderBy('createdAt', 'desc')) // Lawyers see all for now, or we could filter by assigned
      : query(collection(db, 'review_requests'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReviewRequest));
      setRequests(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'review_requests');
    });

    return () => unsubscribe();
  }, [user]);

  // Load user's Firestore drafts
  useEffect(() => {
    if (!user || user.role === 'lawyer') return;

    const unsubscribe = subscribeToHistory(user.uid, (history) => {
      setUserDrafts(history);
    });

    return () => unsubscribe();
  }, [user]);

  const handleApply = async () => {
    if (!user || !selectedDraftId) return;
    
    const draft = userDrafts.find(d => d.id === selectedDraftId);
    if (!draft) return;

    setIsLoading(true);
    try {
      // Default price if not set by lawyer (e.g., 50,000 KRW)
      const paymentAmount = 50000; 
      const pgFee = Math.floor(paymentAmount * 0.033);
      const platformFee = 5000;
      const settlementAmount = paymentAmount - pgFee - platformFee;

      await addDoc(collection(db, 'review_requests'), {
        userId: user.uid,
        userDisplayName: user.displayName || '익명 사용자',
        lawyerId: null,
        lawyerDisplayName: null,
        status: 'pending',
        userDraft: draft.content,
        lawyerNotes: '',
        report: '',
        paymentAmount,
        pgFee,
        platformFee,
        settlementAmount,
        settlementStatus: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setView('history');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'review_requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignToMe = async (requestId: string) => {
    if (!user || user.role !== 'lawyer') return;
    
    if (lawyerStatus !== 'approved') {
      setErrorMsg('변호사 자격 승인 완료 후 이용 가능합니다. 관리자 대시보드에서 승인 상태를 확인해 주세요.');
      return;
    }

    try {
      await updateDoc(doc(db, 'review_requests', requestId), {
        lawyerId: user.uid,
        lawyerDisplayName: user.displayName || '변호사',
        status: 'assigned',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `review_requests/${requestId}`);
    }
  };

  const handleStartReview = async (requestId: string) => {
    if (lawyerStatus !== 'approved') {
      setErrorMsg('변호사 자격 승인 완료 후 이용 가능합니다.');
      return;
    }
    try {
      await updateDoc(doc(db, 'review_requests', requestId), {
        status: 'reviewing',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `review_requests/${requestId}`);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedRequest || !lawyerNotes) return;

    setIsGenerating(true);
    try {
      const report = await generateLawyerReviewReport({
        userDraft: selectedRequest.userDraft,
        lawyerNotes: lawyerNotes
      });

      await updateDoc(doc(db, 'review_requests', selectedRequest.id), {
        lawyerNotes: lawyerNotes,
        report: report,
        status: 'completed',
        updatedAt: serverTimestamp()
      });
      
      // Update local state to show the report immediately
      setSelectedRequest(prev => prev ? { ...prev, report, status: 'completed' } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `review_requests/${selectedRequest.id}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
      <div className="flex items-center justify-between">
        <button 
          onClick={() => {
            if (view === 'landing') onBack();
            else setView('landing');
          }}
          className="flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 뒤로 가기
        </button>
        <h2 className="text-xl font-bold text-[#0F172A] font-serif">변호사 유료 검토 서비스</h2>
      </div>

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm text-center space-y-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-600 to-indigo-600" />
              
              {landingCopy ? (
                <div className="prose prose-slate max-w-none">
                  <ReactMarkdown>{landingCopy}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                  <p className="text-slate-500">서비스 정보를 불러오는 중...</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button 
                  onClick={() => setView('apply')}
                  className="w-full sm:w-auto px-8 py-4 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-5 h-5" /> 전문가에게 내 서류 검토 받기
                </button>
                <button 
                  onClick={() => setView('history')}
                  className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <History className="w-5 h-5" /> 내 검토 내역 보기
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-bold text-[#0F172A]">빠른 결과</h4>
                <p className="text-sm text-[#64748B]">신청 후 평균 24시간 이내에 전문 변호사의 검토 리포트가 도착합니다.</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="font-bold text-[#0F172A]">정확한 법리</h4>
                <p className="text-sm text-[#64748B]">AI가 놓칠 수 있는 미세한 법적 쟁점과 증거의 효력을 변호사가 직접 짚어드립니다.</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-indigo-600" />
                </div>
                <h4 className="font-bold text-[#0F172A]">합리적 비용</h4>
                <p className="text-sm text-[#64748B]">정식 선임 비용의 일부만으로도 전문적인 서면 검토 서비스를 받으실 수 있습니다.</p>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'apply' && (
          <motion.div
            key="apply"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-[#0F172A]">검토받을 서류 선택</h3>
              <p className="text-sm text-[#64748B]">내 보관함에 저장된 서류 중 변호사의 검토가 필요한 항목을 선택해 주세요.</p>
            </div>

            <div className="space-y-4">
              {userDrafts.length > 0 ? (
                <div className="grid gap-3">
                  {userDrafts.map((draft) => (
                    <button
                      key={draft.id}
                      onClick={() => setSelectedDraftId(draft.id)}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        selectedDraftId === draft.id 
                          ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-100' 
                          : 'border-slate-200 hover:border-brand-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${selectedDraftId === draft.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[#0F172A]">{draft.title}</p>
                          <p className="text-xs text-[#64748B]">{draft.date}</p>
                        </div>
                      </div>
                      {selectedDraftId === draft.id && <Check className="w-5 h-5 text-brand-600" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">보관함에 저장된 서류가 없습니다.</p>
                  <p className="text-xs text-slate-400 mt-1">먼저 AI 소장 작성을 완료해 주세요.</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-blue-900">검토 서비스 이용료</span>
                <span className="text-lg font-black text-brand-600">50,000원</span>
              </div>
              <p className="text-xs text-blue-700 leading-relaxed">
                * 결제 대금은 플랫폼 수수료를 제외하고 담당 변호사에게 직접 전달됩니다.<br />
                * 검토 시작 후에는 환불이 어려울 수 있으니 신중히 선택해 주세요.
              </p>
            </div>

            <button 
              onClick={handleApply}
              disabled={!selectedDraftId || isLoading}
              className="w-full py-4 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
              결제 및 검토 신청하기
            </button>
          </motion.div>
        )}

        {view === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#0F172A]">
                {user?.role === 'lawyer' ? '검토 요청 목록' : '내 검토 신청 내역'}
              </h3>
              <span className="text-xs text-slate-400">{requests.length}건</span>
            </div>

            {requests.length > 0 ? (
              <div className="grid gap-4">
                {requests.map((req) => (
                  <button
                    key={req.id}
                    onClick={() => {
                      setSelectedRequest(req);
                      setView('detail');
                    }}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-brand-300 transition-all text-left flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                        {req.status === 'completed' ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <Clock className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_COLORS[req.status]}`}>
                            {STATUS_LABELS[req.status]}
                          </span>
                          <span className="text-xs text-slate-400">
                            {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : '방금 전'}
                          </span>
                        </div>
                        <p className="font-bold text-[#0F172A] mt-1 truncate max-w-[200px] md:max-w-md">
                          {req.userDraft.split('\n')[0].substring(0, 30)}...
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {user?.role === 'lawyer' ? `신청자: ${req.userDisplayName}` : `담당 변호사: ${req.lawyerDisplayName || '배정 대기 중'}`}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 hidden md:block" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
                <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500">내역이 없습니다.</p>
              </div>
            )}
          </motion.div>
        )}

        {view === 'detail' && selectedRequest && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            {/* Progress Tracker */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                {(['pending', 'assigned', 'reviewing', 'completed'] as Status[]).map((s, idx) => (
                  <div key={s} className="flex flex-col items-center gap-2 relative flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors ${
                      requests.find(r => r.id === selectedRequest.id)?.status === s || 
                      (['pending', 'assigned', 'reviewing', 'completed'].indexOf(selectedRequest.status) >= idx)
                        ? 'bg-brand-600 text-white' 
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className={`text-[10px] font-bold ${
                      selectedRequest.status === s ? 'text-brand-600' : 'text-slate-400'
                    }`}>
                      {STATUS_LABELS[s]}
                    </span>
                    {idx < 3 && (
                      <div className={`absolute top-4 left-1/2 w-full h-0.5 -z-0 ${
                        ['pending', 'assigned', 'reviewing', 'completed'].indexOf(selectedRequest.status) > idx
                          ? 'bg-brand-600'
                          : 'bg-slate-100'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">신청자</p>
                    <p className="text-sm font-bold text-slate-800">{selectedRequest.userDisplayName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-xs text-slate-500">담당 변호사</p>
                    <p className="text-sm font-bold text-slate-800">{selectedRequest.lawyerDisplayName || '배정 중'}</p>
                  </div>
                  <Briefcase className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: User Draft */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#0F172A] flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-600" /> 신청 서류 초안
                  </h4>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 leading-relaxed max-h-[400px] overflow-y-auto whitespace-pre-wrap font-sans border border-slate-100">
                  {selectedRequest.userDraft}
                </div>
              </div>

              {/* Right: Lawyer Review / Report */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="font-bold text-[#0F172A] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" /> 전문가 검토 결과
                </h4>

                {selectedRequest.status === 'completed' ? (
                  <div className="space-y-6">
                    <div className="prose prose-slate prose-sm max-w-none p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 leading-relaxed">
                      <ReactMarkdown>{selectedRequest.report}</ReactMarkdown>
                    </div>
                    
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        본 검토 결과는 담당 변호사 개인이 작성한 것이며, <strong>나홀로소송 도우미 (SoloLaw)</strong>는 검토 내용에 개입하거나 그 결과에 책임을 지지 않습니다. 검토 의견에 대한 상세 문의는 담당 변호사 사무실로 직접 연락하시기 바랍니다.
                      </p>
                      <button 
                        onClick={() => setErrorMsg('변호사 사무실 연결 기능은 준비 중입니다.')}
                        className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" /> 담당 변호사와 유료 전화 상담하기
                      </button>
                    </div>
                  </div>
                ) : user?.role === 'lawyer' ? (
                  <div className="space-y-4">
                    {selectedRequest.lawyerId === user.uid ? (
                      <>
                        {selectedRequest.status === 'assigned' ? (
                          <div className="text-center py-12 space-y-4">
                            <p className="text-sm text-slate-500">검토를 시작하시겠습니까?</p>
                            <button 
                              onClick={() => handleStartReview(selectedRequest.id)}
                              className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all"
                            >
                              검토 시작하기
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">검토 메모 (핵심 수정 사항)</label>
                              <textarea 
                                value={lawyerNotes}
                                onChange={(e) => setLawyerNotes(e.target.value)}
                                placeholder="청구취지 보완, 증거 효력 부족 등 핵심 내용을 입력하세요..."
                                className="w-full h-48 p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-600 outline-none text-sm font-sans resize-none"
                              />
                            </div>
                            <button 
                              onClick={handleGenerateReport}
                              disabled={!lawyerNotes || isGenerating}
                              className="w-full py-4 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                              AI 리포트 생성 및 완료
                            </button>
                          </div>
                        )}
                      </>
                    ) : selectedRequest.lawyerId === null ? (
                      <div className="text-center py-12 space-y-4">
                        <p className="text-sm text-slate-500">아직 배정된 변호사가 없습니다.</p>
                        <button 
                          onClick={() => handleAssignToMe(selectedRequest.id)}
                          className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all"
                        >
                          내가 검토하기 (배정)
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-sm text-slate-500">다른 변호사가 검토 중인 사건입니다.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-500">변호사가 서류를 꼼꼼히 검토하고 있습니다.</p>
                    <p className="text-xs text-slate-400">조금만 기다려 주세요!</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
