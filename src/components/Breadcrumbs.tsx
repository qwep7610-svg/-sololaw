import { ChevronRight, Home } from 'lucide-react';

// View별 한글 명칭 매핑
const viewNameMap: Record<string, string> = {
  complaint: '소장 작성 마법사',
  history: '내 보관함',
  cost: '소송 비용 계산기',
  summarizer: '판례/문서 요약',
  lawyer_search: '변호사 찾기',
  lawyer_review: '변호사 서류 검토',
  about: '회사 소개',
  customer_center: '고객 센터',
  correction: '보정명령 가드',
  exhibit: '자동 증거 정리',
  admin_appeal: '행정심판 마법사',
  demand_letter: '내용증명 마법사',
  divorce: '이혼 소송 마법사',
  lawyer_reg: '변호사 등록',
  security: '보안 설정',
  admin: '관리자 대시보드',
  subscription: '구독 관리',
  litigation_finder: '소송 유형 찾기'
};

interface BreadcrumbsProps {
  currentView: string;
  onNavigate: (view: any) => void;
}

export default function Breadcrumbs({ currentView, onNavigate }: BreadcrumbsProps) {
  // 홈 화면에서는 노출하지 않음
  if (currentView === 'home') return null;

  const name = viewNameMap[currentView] || currentView;

  return (
    <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center text-sm text-[#64748B]" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <button 
            onClick={() => onNavigate('home')}
            className="hover:text-brand-600 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span className="sr-only">홈</span>
          </button>
        </li>

        <li className="flex items-center space-x-2">
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <span className="font-bold text-brand-600 truncate max-w-[200px] md:max-w-none">
            {name}
          </span>
        </li>
      </ol>
    </nav>
  );
}
