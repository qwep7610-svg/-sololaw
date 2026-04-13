import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  currentView: string;
  onNavigate: (view: any) => void;
}

// view 상태값에 따른 한글 명칭 매핑
const viewNameMap: Record<string, string> = {
  home: '홈',
  complaint: '소장 작성 마법사',
  history: '내 보관함',
  cost: '소송 비용 계산기',
  summarizer: '판례/문서 요약',
  lawyer_search: '변호사 찾기',
  lawyer_review: '변호사 서류 검토',
  about: '회사 소개',
  customer_center: '고객 센터',
  litigation_finder: '소송 유형 찾기',
  demand_letter: '내용증명 작성',
  admin_appeal: '행정심판 청구',
  divorce: '이혼 소송 지원',
  correction: '보정명령 대응',
  exhibit: '증거 자동 정리',
  lawyer_reg: '전문가 등록',
  security: '보안 설정',
  subscription: '멤버십 관리',
  admin: '관리자 대시보드',
};

export default function Breadcrumbs({ currentView, onNavigate }: BreadcrumbsProps) {
  // 홈 화면이거나 로딩 중일 때는 표시하지 않음
  if (currentView === 'home') return null;

  const currentLabel = viewNameMap[currentView] || currentView;

  return (
    <nav className="bg-white border-b border-slate-100" aria-label="Breadcrumb">
      <div className="max-w-5xl mx-auto px-4 h-10 flex items-center text-xs md:text-sm text-slate-500">
        <ol className="flex items-center space-x-2">
          {/* 홈으로 바로가기 */}
          <li className="flex items-center">
            <button 
              onClick={() => onNavigate('home')}
              className="hover:text-brand-600 transition-colors flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden md:inline">홈</span>
            </button>
          </li>
          
          {/* 현재 경로 표시 */}
          <li className="flex items-center space-x-2">
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-semibold text-brand-600 truncate max-w-[200px]">
              {currentLabel}
            </span>
          </li>
        </ol>
      </div>
    </nav>
  );
}
