import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Users, 
  BarChart3, 
  Lock, 
  Megaphone, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  EyeOff, 
  FileText, 
  AlertTriangle, 
  Activity,
  Search,
  Filter,
  ArrowUpRight,
  History,
  ShieldAlert,
  TrendingUp,
  Clock,
  CreditCard,
  ExternalLink,
  Trash2,
  AlertCircle,
  ChevronRight,
  MessageSquare,
  Plus,
  Palette,
  Settings2,
  Wallet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { db, collection, query, where, onSnapshot, updateDoc, setDoc, doc, addDoc, serverTimestamp, orderBy, deleteDoc, getDoc, handleFirestoreError, OperationType, writeBatch } from '../lib/firebase';
import { verifyLawyerCredentials, generateSecurityGuideline, manageAdInventory, generateSettlementReport } from '../services/gemini';
import { useAuth } from '../lib/AuthContext';
import PolicyEditor from './PolicyEditor';
import BrandingSettings from './BrandingSettings';
import UserManagement from './UserManagement';

type AdminTab = 'verification' | 'monitoring' | 'revenue' | 'security' | 'stats' | 'policies' | 'branding' | 'payments' | 'subscriptions' | 'users';

const AdminFeatureManager = ({ branding }: { branding: any }) => {
  
  const toggleVisibility = async (featureId: string) => {
    const docRef = doc(db, 'app_settings', 'branding');
    const currentStatus = branding.featureVisibility?.[featureId] ?? true;
    
    try {
      if (!branding.featureVisibility) {
        await updateDoc(docRef, {
          featureVisibility: { [featureId]: !currentStatus }
        });
      } else {
        await updateDoc(docRef, {
          [`featureVisibility.${featureId}`]: !currentStatus
        });
      }
    } catch (error) {
      console.error("기능 노출 설정 업데이트 실패:", error);
    }
  };

  const featureList = [
    { id: 'litigation_finder', name: '소송 유형 찾기' },
    { id: 'complaint_wizard', name: '소장 작성 마법사' },
    { id: 'demand_letter', name: '내용증명 생성' },
    { id: 'admin_appeal', name: '행정심판 청구' },
    { id: 'divorce', name: '이혼 소송 지원' },
    { id: 'lawyer_search', name: '변호사 찾기' },
    { id: 'lawyer_review', name: '변호사 서류 검토' },
    { id: 'cost_calculator', name: '소송 비용 계산기' },
    { id: 'summarizer', name: '판례/문서 요약' },
    { id: 'correction', name: '보정명령 대응' },
    { id: 'exhibit', name: '증거 자동 정리' },
    { id: 'lawyer_reg', name: '변호사 홍보 등록' },
    { id: 'customer_center', name: '고객센터' },
    { id: 'about', name: '회사 소개' },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-6 text-slate-800">
        <Settings2 className="w-5 h-5 text-brand-600" />
        <h3 className="font-bold text-lg">서비스 기능 노출 관리</h3>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
        <p className="text-sm text-blue-700 leading-relaxed">
          <strong>💡 관리자 안내:</strong> 기능을 숨기더라도 관리자 계정으로는 메인 화면에서 해당 기능을 계속 확인하고 테스트할 수 있습니다. (숨김 상태는 "숨김(관리자용)" 배지로 표시됩니다.) 일반 사용자에게 어떻게 보이는지 확인하려면 메인 화면 상단의 <strong>'사용자 뷰'</strong> 버튼을 클릭하세요.
        </p>
      </div>

      <div className="space-y-3">
        {featureList.map((f) => {
          const isVisible = branding.featureVisibility?.[f.id] !== false;
          
          return (
            <div key={f.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all">
              <span className="font-semibold text-slate-700">{f.name}</span>
              <button
                onClick={() => toggleVisibility(f.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isVisible 
                  ? 'bg-brand-600 text-white' 
                  : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {isVisible ? '공개 중' : '숨김 완료'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('verification');
  const { user } = useAuth();
  const [lawyerFilter, setLawyerFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [allLawyers, setAllLawyers] = useState<any[]>([]);
  const [pendingLawyers, setPendingLawyers] = useState<any[]>([]);
  const [approvedLawyers, setApprovedLawyers] = useState<any[]>([]);
  const [reviewRequests, setReviewRequests] = useState<any[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [adSlots, setAdSlots] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [securityGuideline, setSecurityGuideline] = useState<string>('');
  const [adAnalysis, setAdAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [showSecureViewer, setShowSecureViewer] = useState<string | null>(null);
  const [viewerTimer, setViewerTimer] = useState<number>(0);
  const [auditReason, setAuditReason] = useState<{ show: boolean; action: string; targetId: string; onConfirm: (reason: string) => void }>({
    show: false,
    action: '',
    targetId: '',
    onConfirm: () => {}
  });
  const [reasonInput, setReasonInput] = useState('');
  const [verificationStep, setVerificationStep] = useState<{ lawyerId: string, step: 1 | 2 | 3 } | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{ show: boolean, lawyer: any } | null>(null);
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [branding, setBranding] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Stats data (mock for now, in real app would come from Firestore aggregations)
  const caseStats = [
    { name: '전세사기', value: 45 },
    { name: '임대차분쟁', value: 25 },
    { name: '이혼/가사', value: 15 },
    { name: '행정심판', value: 10 },
    { name: '기타', value: 5 },
  ];

  const correctionStats = [
    { month: '1월', count: 12 },
    { month: '2월', count: 19 },
    { month: '3월', count: 15 },
    { month: '4월', count: 22 },
  ];

  const COLORS = ['#0F172A', '#2563EB', '#64748B', '#94A3B8', '#CBD5E1'];

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    // Fetch all lawyers for filtering
    const lawyersQuery = query(collection(db, 'lawyers'), orderBy('createdAt', 'desc'));
    const unsubscribeLawyers = onSnapshot(lawyersQuery, (snapshot) => {
      const lawyers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setAllLawyers(lawyers);
      setPendingLawyers(lawyers.filter(l => l.status === 'pending'));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'lawyers');
    });

    // Fetch approved lawyers for revenue management
    const approvedQuery = query(collection(db, 'lawyers'), where('status', '==', 'approved'));
    const unsubscribeApproved = onSnapshot(approvedQuery, (snapshot) => {
      setApprovedLawyers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'lawyers');
    });

    // Fetch review requests for monitoring
    const reviewsQuery = query(collection(db, 'review_requests'), orderBy('createdAt', 'desc'));
    const unsubscribeReviews = onSnapshot(reviewsQuery, (snapshot) => {
      setReviewRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'review_requests');
    });

    // Fetch ad slots
    const commercialsQuery = query(collection(db, 'ad_slots'), orderBy('bidAmount', 'desc'));
    const unsubscribeAds = onSnapshot(commercialsQuery, (snapshot) => {
      setAdSlots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ad_slots');
    });

    // Fetch settlements
    const settlementsQuery = query(collection(db, 'settlements'), orderBy('createdAt', 'desc'));
    const unsubscribeSettlements = onSnapshot(settlementsQuery, (snapshot) => {
      setSettlements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'settlements');
    });

    // Fetch access logs
    const logsQuery = query(collection(db, 'admin_access_logs'), orderBy('timestamp', 'desc'));
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      setAccessLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'admin_access_logs');
    });

    // Fetch branding settings
    const brandingRef = doc(db, 'app_settings', 'branding');
    const unsubscribeBranding = onSnapshot(brandingRef, (docSnap) => {
      if (docSnap.exists()) {
        setBranding(docSnap.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'app_settings/branding');
    });

    // Fetch subscriptions
    const subscriptionsQuery = query(collection(db, 'subscriptions'), orderBy('createdAt', 'desc'));
    const unsubscribeSubscriptions = onSnapshot(subscriptionsQuery, (snapshot) => {
      setSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'subscriptions');
    });

    return () => {
      unsubscribeLawyers();
      unsubscribeApproved();
      unsubscribeReviews();
      unsubscribeAds();
      unsubscribeSettlements();
      unsubscribeLogs();
      unsubscribeBranding();
      unsubscribeSubscriptions();
    };
  }, [user]);

  useEffect(() => {
    let interval: any;
    if (showSecureViewer) {
      setViewerTimer(30); // 30 seconds auto-close
      interval = setInterval(() => {
        setViewerTimer(prev => {
          if (prev <= 1) {
            setShowSecureViewer(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showSecureViewer]);

  const logAdminAction = async (action: string, targetUser: string, reason: string) => {
    try {
      await addDoc(collection(db, 'admin_access_logs'), {
        adminId: user?.uid,
        adminName: user?.displayName || 'Admin',
        action,
        targetUser,
        reason,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to log admin action:", error);
    }
  };

  const handleAuditAction = (action: string, targetId: string, onConfirm: (reason: string) => void) => {
    setAuditReason({ show: true, action, targetId, onConfirm });
    setReasonInput('');
  };

  const confirmAuditAction = () => {
    if (!reasonInput.trim()) return;
    auditReason.onConfirm(reasonInput);
    setAuditReason({ ...auditReason, show: false });
  };

  const REJECTION_TEMPLATES = [
    "신분증 유효기간 만료",
    "등록번호 불일치",
    "증빙 서류 화질 불량 (식별 불가)",
    "변호사 자격 정지 상태",
    "소속 정보 불일치"
  ];

  const handleCopyAndSearch = (regNumber: string) => {
    navigator.clipboard.writeText(regNumber);
    window.open('https://www.koreanbar.or.kr/pages/search/search1.asp', '_blank');
  };

  const handleApproveLawyer = async (lawyer: any, reason: string) => {
    setLoading(true);
    try {
      // 1. Update user role to 'lawyer' and set isExpert: true
      await setDoc(doc(db, 'users', lawyer.id), {
        role: 'lawyer',
        isExpert: true,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Update registration status
      await setDoc(doc(db, 'lawyers', lawyer.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        isExpert: true,
        // 3. Securely delete document URL after approval
        verificationDocUrl: null 
      }, { merge: true });

      await logAdminAction('APPROVE_LAWYER', lawyer.id, reason);
      
      // 4. Send notification
      await addDoc(collection(db, 'notifications'), {
        userId: lawyer.id,
        title: '변호사 자격 승인 완료',
        message: '승인이 완료되었습니다. 이제 전문가 검토 업무를 시작하실 수 있습니다.',
        type: 'approval',
        createdAt: serverTimestamp(),
        read: false
      });

      setErrorMsg("변호사 승인이 완료되었습니다. 증빙 서류는 보안을 위해 즉시 파기되었습니다.");
    } catch (error) {
      console.error("Approval failed:", error);
      setErrorMsg("승인 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectLawyer = async (lawyer: any, rejectionReason: string, auditReasonStr: string) => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'lawyers', lawyer.id), {
        status: 'rejected',
        rejectionReason,
        rejectedAt: serverTimestamp()
      }, { merge: true });
      await logAdminAction('REJECT_LAWYER', lawyer.id, auditReasonStr);

      // Send notification
      await addDoc(collection(db, 'notifications'), {
        userId: lawyer.id,
        title: '변호사 자격 승인 반려',
        message: `서류 검토 결과 반려되었습니다. 사유: ${rejectionReason}`,
        type: 'rejection',
        createdAt: serverTimestamp(),
        read: false
      });

      setErrorMsg("반려 처리가 완료되었습니다.");
    } catch (error) {
      console.error("Rejection failed:", error);
      setErrorMsg("반려 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLawyer = async (lawyer: any) => {
    setDeleteConfirm(null);
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'lawyers', lawyer.id));
      await logAdminAction('DELETE_LAWYER', lawyer.id, 'Admin deleted lawyer registration');
      setErrorMsg("변호사 등록 정보가 삭제되었습니다.");
    } catch (error) {
      console.error("Delete failed:", error);
      setErrorMsg("삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLawyer = async (lawyer: any) => {
    setVerifyingId(lawyer.id);
    try {
      const result = await verifyLawyerCredentials({
        name: lawyer.name,
        regNumber: lawyer.regNumber,
        location: lawyer.location,
        file: lawyer.verificationFile
      });

      if (result) {
        await setDoc(doc(db, 'lawyers', lawyer.id), {
          status: result.status === 'approved' ? 'approved' : 'rejected',
          verificationResult: result,
          verifiedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setErrorMsg(error instanceof Error ? error.message : '검증 중 오류가 발생했습니다.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleGenerateSecurity = async () => {
    setLoading(true);
    try {
      const guideline = await generateSecurityGuideline();
      setSecurityGuideline(guideline);
    } catch (error) {
      console.error("Failed to generate security guideline:", error);
      setErrorMsg(error instanceof Error ? error.message : '보안 프로토콜 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeAds = async () => {
    setLoading(true);
    try {
      const analysis = await manageAdInventory({
        category: '부동산',
        lawyers: [] // In real app, pass actual lawyer ad data
      });
      setAdAnalysis(analysis);
    } catch (error) {
      console.error("Failed to analyze ads:", error);
      setErrorMsg(error instanceof Error ? error.message : '광고 분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSettlement = async (lawyerId: string, lawyerName: string, stats: any) => {
    if (!confirm(`${lawyerName} 변호사님에 대한 정산을 실행하시겠습니까?`)) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Create settlement record
      const settlementRef = doc(collection(db, 'settlements'));
      batch.set(settlementRef, {
        lawyerId,
        lawyerName,
        totalAmount: stats.grossRevenue,
        platformFeeTotal: stats.platformFee,
        pgFeeTotal: stats.pgFee,
        netAmount: stats.netAmount,
        status: 'completed',
        period: new Date().toISOString().substring(0, 7), // e.g., 2024-04
        reviewCount: stats.count,
        createdAt: serverTimestamp(),
        paidAt: serverTimestamp()
      });

      // 2. Update review requests to 'completed' settlement status
      const pendingRequests = reviewRequests.filter(r => r.lawyerId === lawyerId && r.settlementStatus === 'pending' && r.status === 'completed');
      pendingRequests.forEach(req => {
        const reqRef = doc(db, 'review_requests', req.id);
        batch.update(reqRef, { settlementStatus: 'completed' });
      });

      await batch.commit();
      setErrorMsg('정산이 완료되었습니다.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settlements');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (lawyerName: string, stats: any) => {
    setLoading(true);
    try {
      const report = await generateSettlementReport({
        lawyerName,
        count: stats.count,
        totalAmount: stats.grossRevenue,
        pgFee: stats.pgFee,
        platformFee: stats.platformFee,
        finalSettlement: stats.netAmount
      });
      setErrorMsg(report);
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subId: string) => {
    if (!confirm('정말로 이 구독을 취소하시겠습니까?')) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'subscriptions', subId), {
        status: 'inactive',
        updatedAt: serverTimestamp()
      });
      setErrorMsg('구독이 취소되었습니다.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `subscriptions/${subId}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateLawyerStats = (lawyerId: string) => {
    const lawyerRequests = reviewRequests.filter(r => r.lawyerId === lawyerId && r.status === 'completed');
    const pendingRequests = lawyerRequests.filter(r => r.settlementStatus === 'pending');
    
    const stats = {
      grossRevenue: lawyerRequests.reduce((sum, r) => sum + (r.paymentAmount || 0), 0),
      platformFee: lawyerRequests.reduce((sum, r) => sum + (r.platformFee || 0), 0),
      pgFee: lawyerRequests.reduce((sum, r) => sum + (r.pgFee || 0), 0),
      pendingBalance: pendingRequests.reduce((sum, r) => sum + (r.settlementAmount || 0), 0),
      paidAmount: settlements.filter(s => s.lawyerId === lawyerId && s.status === 'completed').reduce((sum, s) => sum + (s.netAmount || 0), 0),
      netAmount: pendingRequests.reduce((sum, r) => sum + (r.settlementAmount || 0), 0),
      count: pendingRequests.length
    };
    
    return stats;
  };

  const filteredLawyers = allLawyers.filter(l => l.status === lawyerFilter);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A] font-serif flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-brand-600" />
            관리자 대시보드
          </h2>
          <p className="text-[#64748B] mt-1">플랫폼 운영 및 보안 관리를 위한 통합 대시보드</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-[#E2E8F0] shadow-sm overflow-x-auto scrollbar-hide">
          {[
            { id: 'verification', label: '변호사 승인', icon: ShieldCheck },
            { id: 'users', label: '회원 관리', icon: Users },
            { id: 'monitoring', label: '검토 모니터링', icon: Activity },
            { id: 'subscriptions', label: '구독 관리', icon: CreditCard },
            { id: 'revenue', label: '정산/광고', icon: CreditCard },
            { id: 'security', label: '보안/로그', icon: Lock },
            { id: 'stats', label: '통계 리포트', icon: BarChart3 },
            { id: 'payments', label: '결제 내역', icon: Wallet },
            { id: 'policies', label: '정책 관리', icon: FileText },
            { id: 'branding', label: '브랜딩 설정', icon: Palette },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-brand-600 text-white shadow-lg' 
                  : 'text-[#64748B] hover:text-brand-600 hover:bg-brand-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <UserManagement />
          </motion.div>
        )}

        {activeTab === 'verification' && (
          <motion.div
            key="verification"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 mb-4">
              {(['pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setLawyerFilter(status)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    lawyerFilter === status 
                      ? 'bg-brand-600 text-white shadow-md' 
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {status === 'pending' ? '승인 대기' : status === 'approved' ? '승인 완료' : '반려됨'}
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                    lawyerFilter === status ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {allLawyers.filter(l => l.status === status).length}
                  </span>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#F1F5F9] flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-600" />
                  변호사 목록 ({lawyerFilter === 'pending' ? '승인 대기' : lawyerFilter === 'approved' ? '승인 완료' : '반려됨'})
                </h3>
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                {filteredLawyers.length === 0 ? (
                  <div className="p-12 text-center text-[#64748B]">
                    해당 상태의 변호사가 없습니다.
                  </div>
                ) : (
                  filteredLawyers.map((lawyer) => (
                      <div key={lawyer.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                              {lawyer.profileImageUrl ? (
                                <img src={lawyer.profileImageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-6 h-6 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-[#0F172A] truncate">{lawyer.name} 변호사</h4>
                                {lawyer.status === 'approved' && <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <button 
                                  onClick={() => handleCopyAndSearch(lawyer.regNumber)}
                                  className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg hover:bg-brand-100 transition-all flex items-center gap-1 whitespace-nowrap"
                                >
                                  <ExternalLink className="w-3 h-3" /> 대한변협 자격 조회
                                </button>
                                <span className="text-[10px] text-slate-400 truncate">등록번호: {lawyer.regNumber} | {lawyer.location}</span>
                              </div>
                              <p className="text-[10px] md:text-xs text-slate-400 mt-1">신청일: {lawyer.createdAt?.toDate().toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            {lawyer.status === 'pending' && (
                              <button 
                                onClick={() => setVerificationStep({ lawyerId: lawyer.id, step: 1 })}
                                className="w-full sm:w-auto px-4 py-2 bg-brand-600 text-white rounded-xl text-xs md:text-sm font-bold hover:bg-brand-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-100 whitespace-nowrap"
                              >
                                <ShieldCheck className="w-4 h-4" />
                                승인 프로세스 시작
                              </button>
                            )}
                            {lawyer.status === 'rejected' && (
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="text-[10px] md:text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">반려됨</span>
                                  <p className="text-[10px] text-slate-400 mt-1">사유: {lawyer.rejectionReason}</p>
                                </div>
                                <button 
                                  onClick={() => setDeleteConfirm(lawyer)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                  title="목록에서 삭제"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                            {lawyer.status === 'approved' && (
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="text-[10px] md:text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">승인 완료</span>
                                  <p className="text-[10px] text-slate-400 mt-1">승인일: {lawyer.approvedAt?.toDate().toLocaleString()}</p>
                                </div>
                                <button 
                                  onClick={() => setDeleteConfirm(lawyer)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                  title="목록에서 삭제"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'monitoring' && (
          <motion.div
            key="monitoring"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#F1F5F9] flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-600" />
                  유료 검토 배정 현황 (Queue)
                </h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="text-xs font-bold text-[#64748B] uppercase tracking-wider border-b border-slate-100">
                        <th className="pb-4 px-4">신청일</th>
                        <th className="pb-4 px-4">사용자</th>
                        <th className="pb-4 px-4">담당 변호사</th>
                        <th className="pb-4 px-4">상태</th>
                        <th className="pb-4 px-4">SLA (24h)</th>
                        <th className="pb-4 px-4">액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {reviewRequests.map((req) => {
                        const createdAt = req.createdAt?.toDate();
                        const now = new Date();
                        const hoursPassed = createdAt ? (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60) : 0;
                        const isUrgent = hoursPassed > 18 && req.status !== 'completed';

                        return (
                          <tr key={req.id} className="text-sm hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-4 text-slate-500 whitespace-nowrap">{createdAt?.toLocaleString()}</td>
                            <td className="py-4 px-4 font-bold whitespace-nowrap">{req.userDisplayName}</td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              {req.lawyerDisplayName ? (
                                <span className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-brand-600" />
                                  {req.lawyerDisplayName}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">미배정</span>
                              )}
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                req.status === 'completed' ? 'bg-green-50 text-green-600' :
                                req.status === 'reviewing' ? 'bg-blue-50 text-blue-600' :
                                'bg-orange-50 text-orange-600'
                              }`}>
                                {req.status === 'completed' ? '완료' : req.status === 'reviewing' ? '검토중' : '대기중'}
                              </span>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              {isUrgent ? (
                                <span className="flex items-center gap-1 text-red-600 font-bold animate-pulse">
                                  <AlertTriangle className="w-4 h-4" />
                                  지연 임박 ({Math.round(24 - hoursPassed)}h 남음)
                                </span>
                              ) : (
                                <span className="text-slate-400">정상</span>
                              )}
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <button 
                                onClick={() => handleAuditAction('SAMPLE_REPORT', req.id, (reason) => {
                                  logAdminAction('SAMPLE_REPORT', req.userId, reason);
                                  setErrorMsg("품질 검수를 위한 리포트 열람 권한이 부여되었습니다.");
                                })}
                                className="p-2 hover:bg-brand-50 rounded-lg text-brand-600 transition-colors"
                                title="리포트 샘플링 검수"
                              >
                                <Search className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'revenue' && (
          <motion.div
            key="revenue"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-brand-600" />
                    변호사별 정산 관리
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    실시간 정산 데이터 집계 중
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-50">
                        <th className="pb-4 font-bold">변호사 정보</th>
                        <th className="pb-4 font-bold text-right">누적 매출</th>
                        <th className="pb-4 font-bold text-right">솔루션 이용료</th>
                        <th className="pb-4 font-bold text-right">정산 예정액</th>
                        <th className="pb-4 font-bold text-right">정산 완료액</th>
                        <th className="pb-4 font-bold text-center">정산 주기</th>
                        <th className="pb-4 font-bold text-right">작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {approvedLawyers.map((lawyer) => {
                        const stats = calculateLawyerStats(lawyer.uid);
                        return (
                          <tr key={lawyer.id} className="group hover:bg-slate-50/50 transition-all">
                            <td className="py-4">
                              <div className="font-bold text-[#0F172A]">{lawyer.name}</div>
                              <div className="text-[10px] text-slate-400">{lawyer.email}</div>
                            </td>
                            <td className="py-4 text-right font-medium text-slate-600">
                              {stats.grossRevenue.toLocaleString()}원
                            </td>
                            <td className="py-4 text-right font-medium text-brand-600">
                              {stats.platformFee.toLocaleString()}원
                            </td>
                            <td className="py-4 text-right">
                              <span className="font-bold text-amber-600">{stats.pendingBalance.toLocaleString()}원</span>
                            </td>
                            <td className="py-4 text-right font-medium text-slate-600">
                              {stats.paidAmount.toLocaleString()}원
                            </td>
                            <td className="py-4 text-center">
                              <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-500 font-bold whitespace-nowrap">
                                {lawyer.settlementCycle || '주간'}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleGenerateReport(lawyer.name, stats)}
                                  className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-brand-600"
                                  title="정산 리포트 생성"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleExecuteSettlement(lawyer.uid, lawyer.name, stats)}
                                  disabled={stats.pendingBalance <= 0}
                                  className="px-3 py-1.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition-all disabled:opacity-30 disabled:grayscale"
                                >
                                  정산 실행
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {approvedLawyers.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      승인된 변호사가 없습니다.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 space-y-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-brand-600" />
                    광고 슬롯 관리
                  </h3>
                  <div className="space-y-4">
                    {adSlots.map((slot) => (
                      <div key={slot.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{slot.slotId}</span>
                            <h4 className="font-bold">{slot.lawyerName}</h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">입찰가: {slot.bidAmount.toLocaleString()}원 | 기간: {slot.startDate} ~ {slot.endDate}</p>
                        </div>
                        <button className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all">
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    ))}
                    <button className="w-full py-4 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-slate-500 text-sm font-bold hover:bg-brand-50 hover:border-brand-300 hover:text-brand-600 transition-all flex items-center justify-center gap-2 group">
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-brand-300 group-hover:bg-brand-100 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" />
                      </div>
                      새 광고 슬롯 추가
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 space-y-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-600" />
                    최근 정산 완료 내역
                  </h3>
                  <div className="space-y-4">
                    {settlements.map((s) => (
                      <div key={s.id} className="p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm">{s.lawyerName}</h4>
                            <p className="text-[10px] text-slate-400">{s.period} 정산 완료 | {s.reviewCount}건</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand-600">{s.netAmount.toLocaleString()}원</p>
                          <p className="text-[10px] text-slate-400">수수료: {s.platformFeeTotal?.toLocaleString()}원</p>
                        </div>
                      </div>
                    ))}
                    {settlements.length === 0 && (
                      <div className="py-12 text-center text-slate-400 text-sm">
                        정산 내역이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#F1F5F9] flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-brand-600" />
                  관리자 감사 로그 (Audit Log)
                </h3>
                <button 
                  onClick={handleGenerateSecurity}
                  className="text-xs font-bold text-brand-600 hover:underline"
                >
                  보안 가이드라인 생성
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {accessLogs.map((log) => (
                    <div key={log.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        log.action.includes('APPROVE') ? 'bg-green-100 text-green-600' :
                        log.action.includes('REJECT') ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm">{log.adminName}</h4>
                          <span className="text-[10px] text-slate-400">{log.timestamp?.toDate().toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-[#0F172A] mt-1">
                          <span className="font-bold text-brand-600">[{log.action}]</span> {log.targetUser} 사용자에 대한 작업 수행
                        </p>
                        <div className="mt-2 p-2 bg-white rounded-lg border border-slate-100 text-[11px] text-slate-500 italic">
                          사유: {log.reason}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-600" />
                사건 유형별 통계
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={caseStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {caseStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {caseStats.map((stat, index) => (
                  <div key={stat.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs text-[#64748B]">{stat.name} ({stat.value}%)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-brand-600" />
                보정명령 발생 빈도 추이
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={correctionStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#2563EB" 
                      strokeWidth={3} 
                      dot={{ r: 6, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-[#64748B] mt-4 text-center">
                * AI 작성 서류 중 법원 보정명령이 발생한 케이스의 월별 추이입니다.
              </p>
            </div>
          </motion.div>
        )}

        {activeTab === 'policies' && (
          <motion.div
            key="policies"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <PolicyEditor />
          </motion.div>
        )}

        {activeTab === 'branding' && (
          <motion.div
            key="branding"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {branding && <AdminFeatureManager branding={branding} />}
            <BrandingSettings />
          </motion.div>
        )}

        {activeTab === 'subscriptions' && (
          <motion.div
            key="subscriptions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#F1F5F9] flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand-600" />
                  구독 관리 (변호사 멤버십)
                </h3>
                <span className="text-xs font-medium px-2 py-1 bg-brand-50 text-brand-600 rounded-full">
                  활성 구독: {subscriptions.filter(s => s.status === 'active').length}건
                </span>
              </div>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-50">
                      <th className="p-6 font-bold whitespace-nowrap">변호사 ID</th>
                      <th className="p-6 font-bold whitespace-nowrap">플랜</th>
                      <th className="p-6 font-bold whitespace-nowrap">결제 금액</th>
                      <th className="p-6 font-bold whitespace-nowrap">다음 결제일</th>
                      <th className="p-6 font-bold whitespace-nowrap">상태</th>
                      <th className="p-6 font-bold text-right whitespace-nowrap">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="p-6 font-medium text-slate-700 whitespace-nowrap">{sub.lawyerId}</td>
                        <td className="p-6 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            sub.planType === 'premium' ? 'bg-purple-100 text-purple-600' :
                            sub.planType === 'standard' ? 'bg-blue-100 text-blue-600' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {sub.planType}
                          </span>
                        </td>
                        <td className="p-6 font-bold text-slate-900 whitespace-nowrap">{sub.amount?.toLocaleString()}원</td>
                        <td className="p-6 text-slate-500 whitespace-nowrap">{sub.nextBillingDate?.toDate().toLocaleDateString()}</td>
                        <td className="p-6 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            sub.status === 'active' ? 'bg-green-100 text-green-600' :
                            sub.status === 'failed' ? 'bg-red-100 text-red-600' :
                            'bg-slate-100 text-slate-400'
                          }`}>
                            {sub.status === 'active' ? '활성' : sub.status === 'failed' ? '결제 실패' : '비활성'}
                          </span>
                        </td>
                        <td className="p-6 text-right whitespace-nowrap">
                          {sub.status === 'active' && (
                            <button
                              onClick={() => handleCancelSubscription(sub.id)}
                              className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                            >
                              구독 취소
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {subscriptions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400">
                          구독 내역이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'payments' && (
          <motion.div
            key="payments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Payment History Section */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#F1F5F9]">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-brand-600" />
                  결제 내역 (서류 검토 서비스)
                </h3>
              </div>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-50">
                      <th className="p-6 font-bold whitespace-nowrap">결제 일시</th>
                      <th className="p-6 font-bold whitespace-nowrap">사용자</th>
                      <th className="p-6 font-bold whitespace-nowrap">변호사</th>
                      <th className="p-6 font-bold whitespace-nowrap">결제 금액</th>
                      <th className="p-6 font-bold whitespace-nowrap">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {reviewRequests.filter(r => r.paymentAmount > 0).map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="p-6 text-slate-500 whitespace-nowrap">{req.createdAt?.toDate().toLocaleString()}</td>
                        <td className="p-6 font-medium text-slate-700 whitespace-nowrap">{req.userDisplayName}</td>
                        <td className="p-6 text-slate-600 whitespace-nowrap">{req.lawyerDisplayName || '미지정'}</td>
                        <td className="p-6 font-bold text-brand-600 whitespace-nowrap">{req.paymentAmount?.toLocaleString()}원</td>
                        <td className="p-6 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            req.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {req.status === 'completed' ? '검토 완료' : '진행 중'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {reviewRequests.filter(r => r.paymentAmount > 0).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400">
                          결제 내역이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Secure Viewer Modal */}
      <AnimatePresence>
        {showSecureViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-4 bg-brand-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  <h3 className="font-bold">보안 문서 뷰어 (Secure Viewer)</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs">
                    <Clock className="w-3 h-3" />
                    {viewerTimer}초 후 자동 닫힘
                  </div>
                  <button 
                    onClick={() => setShowSecureViewer(null)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center relative group">
                {/* Anti-capture overlay */}
                <div className="absolute inset-0 z-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
                <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center opacity-[0.03] select-none text-4xl font-bold text-black rotate-[-45deg] whitespace-nowrap">
                  CONFIDENTIAL - SoloLaw Admin
                </div>
                
                <img 
                  src={pendingLawyers.find(l => l.id === showSecureViewer)?.verificationDocUrl || "https://picsum.photos/seed/doc/800/600"} 
                  alt="Verification Document"
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-4 bg-slate-50 text-center text-xs text-slate-500">
                * 본 화면은 보안을 위해 캡처가 방지되며, 일정 시간 후 자동으로 닫힙니다.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3-Step Verification Workflow Modal */}
      <AnimatePresence>
        {verificationStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0F172A]">변호사 자격 검증 프로세스</h3>
                    <p className="text-xs text-slate-500">단계별 매뉴얼에 따라 철저히 검증해 주세요.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setVerificationStep(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <XCircle className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-8">
                {/* Progress Bar */}
                <div className="flex items-center justify-between mb-10 relative">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                  <div 
                    className="absolute top-1/2 left-0 h-0.5 bg-brand-600 -translate-y-1/2 z-0 transition-all duration-500" 
                    style={{ width: `${((verificationStep.step - 1) / 2) * 100}%` }}
                  />
                  {[1, 2, 3].map((s) => (
                    <div key={`vstep-${s}`} className="relative z-10 flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                        verificationStep.step === s 
                          ? 'bg-brand-600 text-white ring-4 ring-brand-50' 
                          : verificationStep.step > s 
                            ? 'bg-brand-600 text-white' 
                            : 'bg-white border-2 border-slate-200 text-slate-400'
                      }`}>
                        {verificationStep.step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
                      </div>
                      <span className={`text-[10px] font-bold ${verificationStep.step >= s ? 'text-brand-600' : 'text-slate-400'}`}>
                        {s === 1 ? '서류 검토' : s === 2 ? '자격 교차 검증' : '최종 승인'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="min-h-[300px]">
                  {verificationStep.step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-brand-50 p-4 rounded-2xl">
                        <h4 className="font-bold text-brand-900 text-sm mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Step 1: 서류 검토 (Verification)
                        </h4>
                        <ul className="text-xs text-brand-800/70 space-y-2 leading-relaxed">
                          <li>• <strong>변호사 등록 증명원:</strong> 성함, 생년월일, 등록번호 일치 여부 확인</li>
                          <li>• <strong>신분증 사본:</strong> 등록 증명원상의 정보와 실제 인물 대조</li>
                          <li>• <strong>사무실 정보:</strong> 실제 존재하는 법률 사무소인지 교차 검증</li>
                        </ul>
                      </div>
                      <div className="flex justify-center">
                        <button 
                          onClick={() => {
                            logAdminAction('VIEW_DOCS', verificationStep.lawyerId, '자격 검증 프로세스 1단계');
                            setShowSecureViewer(verificationStep.lawyerId);
                          }}
                          className="px-6 py-3 bg-white border-2 border-brand-100 text-brand-600 rounded-2xl font-bold text-sm hover:bg-brand-50 transition-all flex items-center gap-2"
                        >
                          <Eye className="w-5 h-5" />
                          제출 서류 보안 열람 (30초)
                        </button>
                      </div>
                    </div>
                  )}

                  {verificationStep.step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-amber-50 p-4 rounded-2xl">
                        <h4 className="font-bold text-amber-900 text-sm mb-2 flex items-center gap-2">
                          <Search className="w-4 h-4" /> Step 2: 자격 교차 검증 (Cross-Check)
                        </h4>
                        <p className="text-xs text-amber-800/70 leading-relaxed">
                          서류 위조 위험이 있으므로 공식 채널을 통해 실시간 상태를 확인합니다.
                          대한변협 검색 결과가 <strong>'정상'</strong> 상태인지 반드시 확인하세요.
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 w-full text-center">
                          <span className="text-xs text-slate-400 block mb-1">등록번호</span>
                          <span className="text-xl font-mono font-bold text-[#0F172A]">
                            {allLawyers.find(l => l.id === verificationStep.lawyerId)?.regNumber}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleCopyAndSearch(allLawyers.find(l => l.id === verificationStep.lawyerId)?.regNumber)}
                          className="w-full py-4 bg-[#0F172A] text-white rounded-2xl font-bold text-sm hover:bg-black transition-all flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-5 h-5" />
                          대한변호사협회 공식 사이트에서 조회하기
                        </button>
                      </div>
                    </div>
                  )}

                  {verificationStep.step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-green-50 p-4 rounded-2xl">
                        <h4 className="font-bold text-green-900 text-sm mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Step 3: 최종 승인 및 권한 부여
                        </h4>
                        <p className="text-xs text-green-800/70 leading-relaxed">
                          모든 검증이 완료되었습니다. 승인 시 변호사에게 즉시 알림이 발송되며,
                          <strong>개인정보 보호를 위해 제출된 증빙 서류는 즉시 영구 파기됩니다.</strong>
                        </p>
                      </div>
                      <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                        <p className="text-sm text-slate-500 mb-4">최종 승인 사유를 입력해 주세요.</p>
                        <textarea 
                          value={reasonInput}
                          onChange={(e) => setReasonInput(e.target.value)}
                          placeholder="예: 대한변협 조회 결과 정상 확인됨, 서류 일치함"
                          className="w-full p-4 rounded-xl border border-slate-200 text-sm h-24 outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-8">
                  {verificationStep.step > 1 ? (
                    <button 
                      onClick={() => setVerificationStep({ ...verificationStep, step: (verificationStep.step - 1) as 1 | 2 | 3 })}
                      className="flex-1 py-4 rounded-2xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
                    >
                      이전 단계
                    </button>
                  ) : (
                    <button 
                      onClick={() => setRejectionModal({ show: true, lawyer: allLawyers.find(l => l.id === verificationStep.lawyerId) })}
                      className="flex-1 py-4 rounded-2xl border border-red-100 text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
                    >
                      자격 미달로 반려
                    </button>
                  )}
                  
                  {verificationStep.step < 3 ? (
                    <button 
                      onClick={() => setVerificationStep({ ...verificationStep, step: (verificationStep.step + 1) as 1 | 2 | 3 })}
                      className="flex-1 py-4 rounded-2xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
                    >
                      다음 단계로
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        if (!reasonInput.trim()) {
                          setErrorMsg("승인 사유를 입력해 주세요.");
                          return;
                        }
                        handleApproveLawyer(allLawyers.find(l => l.id === verificationStep.lawyerId), reasonInput);
                        setVerificationStep(null);
                        setReasonInput('');
                      }}
                      className="flex-1 py-4 rounded-2xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
                    >
                      최종 승인 및 서류 파기
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {rejectionModal?.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">변호사 승인 반려</h3>
              <p className="text-sm text-[#64748B] mb-6">
                반려 사유를 선택하거나 직접 입력해 주세요. 변호사에게 알림이 발송됩니다.
              </p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {REJECTION_TEMPLATES.map((template) => (
                    <button
                      key={template}
                      onClick={() => setCustomRejectionReason(template)}
                      className={`text-left px-4 py-3 rounded-xl border text-xs font-medium transition-all ${
                        customRejectionReason === template 
                          ? 'border-brand-600 bg-brand-50 text-brand-600' 
                          : 'border-slate-100 hover:border-slate-200 text-slate-600'
                      }`}
                    >
                      {template}
                    </button>
                  ))}
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">상세 사유 (직접 입력)</label>
                  <textarea 
                    value={customRejectionReason}
                    onChange={(e) => setCustomRejectionReason(e.target.value)}
                    placeholder="반려 사유를 구체적으로 입력해 주세요."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-sm h-24 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setRejectionModal(null)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-[#64748B] hover:bg-slate-50 transition-all"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      if (!customRejectionReason.trim()) return;
                      handleAuditAction('REJECT', rejectionModal.lawyer.id, (auditReason) => {
                        handleRejectLawyer(rejectionModal.lawyer, customRejectionReason, auditReason);
                        setRejectionModal(null);
                        setVerificationStep(null);
                        setCustomRejectionReason('');
                      });
                    }}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all"
                  >
                    반려 확정
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audit Reason Modal */}
      <AnimatePresence>
        {auditReason.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-6">
                <ShieldAlert className="w-8 h-8 text-brand-600" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">데이터 접근 사유 입력</h3>
              <p className="text-sm text-[#64748B] mb-6">
                민감 정보 접근 또는 중요 작업 수행을 위해 구체적인 사유를 입력해 주세요. 이 내용은 감사 로그에 영구 기록됩니다.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">작업 내용</label>
                  <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold text-brand-600">
                    {auditReason.action}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">접근 사유</label>
                  <textarea
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    placeholder="예: 변호사 자격 검증을 위한 서류 확인, 고객 문의 응대 등"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-sm h-24 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setAuditReason({ ...auditReason, show: false })}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-[#64748B] hover:bg-slate-50 transition-all"
                  >
                    취소
                  </button>
                  <button
                    onClick={confirmAuditAction}
                    disabled={!reasonInput.trim()}
                    className="flex-1 py-3 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-all disabled:opacity-50"
                  >
                    확인 및 진행
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-red-50 rounded-full">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">변호사 정보 삭제</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    <strong>{deleteConfirm.name}</strong> 변호사의 등록 정보를 삭제하시겠습니까?<br />
                    이 작업은 되돌릴 수 없으며, 모든 관련 데이터가 영구 삭제됩니다.
                  </p>
                </div>
                <div className="flex gap-3 w-full pt-4">
                  <button 
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
                  >
                    취소
                  </button>
                  <button 
                    onClick={() => handleDeleteLawyer(deleteConfirm)}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                  >
                    삭제하기
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
