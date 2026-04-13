import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { motion } from 'motion/react';
import { Clock, XCircle, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'lawyer' | 'user';
  onNavigate: (view: any) => void;
}

export default function ProtectedRoute({ children, requiredRole, onNavigate }: ProtectedRouteProps) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-brand-600" />
        <p className="text-slate-500 font-medium">사용자 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Should be handled by parent (e.g., showing AuthWizard)
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-8 bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-xl">
        <h2 className="text-3xl font-bold text-[#0F172A] font-serif">접근 권한이 없습니다</h2>
        <p className="text-[#64748B] text-lg">해당 페이지에 접근할 수 있는 권한이 없습니다.</p>
        <button 
          onClick={() => onNavigate('home')}
          className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  if (user.role === 'lawyer') {
    if (user.status === 'pending') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto py-24 text-center space-y-8 bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-xl"
        >
          <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-12 h-12 text-amber-600" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-[#0F172A] font-serif">자격 검토 중입니다</h2>
            <p className="text-[#64748B] text-lg leading-relaxed">
              변호사 회원님, 환영합니다!<br />
              현재 운영팀에서 제출하신 자격 증빙 서류를 검토하고 있습니다.<br />
              승인 후 모든 서비스를 이용하실 수 있습니다. (최대 24시간 소요)
            </p>
          </div>
          <div className="pt-8 border-t border-slate-100">
            <button 
              onClick={() => logout()}
              className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </motion.div>
      );
    }

    if (user.status === 'rejected') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto py-24 text-center space-y-8 bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-xl"
        >
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-[#0F172A] font-serif">승인이 반려되었습니다</h2>
            <div className="p-6 bg-red-50 rounded-2xl border border-red-100 text-left">
              <p className="text-sm font-bold text-red-900 mb-2">반려 사유:</p>
              <p className="text-red-700 leading-relaxed">{user.rejectionReason || '제출하신 서류가 불충분하거나 자격 확인이 어렵습니다.'}</p>
            </div>
            <p className="text-[#64748B]">
              사유를 확인하신 후 자격 증빙 서류를 다시 준비하여 등록해 주세요.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 border-t border-slate-100">
            <button 
              onClick={() => onNavigate('lawyer_reg')}
              className="w-full sm:w-auto px-8 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
            >
              서류 다시 등록하기
            </button>
            <button 
              onClick={() => logout()}
              className="w-full sm:w-auto px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </motion.div>
      );
    }
  }

  return <>{children}</>;
}
