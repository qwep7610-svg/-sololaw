import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "예기치 못한 오류가 발생했습니다.";
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            isFirestoreError = true;
            if (parsed.error.includes('permission-denied')) {
              errorMessage = "접근 권한이 없습니다. 로그인 상태를 확인하거나 관리자에게 문의해 주세요.";
            } else {
              errorMessage = `데이터 처리 중 오류가 발생했습니다: ${parsed.error}`;
            }
          }
        }
      } catch (e) {
        // Not a JSON error message
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-8 md:p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#0F172A] font-serif">오류가 발생했습니다</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-5 h-5" /> 다시 시도하기
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" /> 홈으로 이동
              </button>
            </div>

            {isFirestoreError && (
              <p className="text-[10px] text-slate-400 pt-4">
                Error ID: {Math.random().toString(36).substring(7).toUpperCase()}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
