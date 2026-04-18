import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  FileText, 
  ShieldCheck, 
  AlertTriangle,
  Lightbulb,
  ClipboardList,
  Scale,
  Search
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIResultViewerProps {
  content: string;
  type?: 'summary' | 'correction' | 'analysis' | 'general';
}

export default function AIResultViewer({ content, type = 'general' }: AIResultViewerProps) {
  // Try to parse sections if it's a known format
  const sections = parseAIContent(content, type);

  if (sections.length > 0) {
    return (
      <div className="space-y-6">
        {sections.map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`rounded-2xl border p-5 ${section.className || 'bg-white border-slate-100 shadow-sm'}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${section.iconBg || 'bg-slate-50'}`}>
                {section.icon || <Sparkles className="w-4 h-4 text-slate-500" />}
              </div>
              <h3 className={`font-bold text-sm md:text-base ${section.titleColor || 'text-slate-900'}`}>
                {section.title}
              </h3>
            </div>
            <div className="prose prose-slate prose-sm max-w-none break-words text-slate-600 leading-relaxed font-sans">
              <ReactMarkdown>{section.content}</ReactMarkdown>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Fallback to plain markdown
  return (
    <div className="prose prose-slate max-w-none break-words">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

interface Section {
  title: string;
  content: string;
  icon?: React.ReactNode;
  iconBg?: string;
  titleColor?: string;
  className?: string;
}

function parseAIContent(content: string, type: string): Section[] {
  const sections: Section[] = [];

  // 1. Litigation Classification / Analysis Logic
  if (type === 'analysis' || type === 'general') {
    const typeMatch = content.match(/(?:### ⚖️ )?추천 소송 유형:? ([\s\S]*?)(?=- \*\*핵심 요약:|\*\*핵심 요약:|$)/);
    const summaryMatch = content.match(/\*\*핵심 요약:\*\*? ([\s\S]*?)(?=- \*\*준비할 증거:|\*\*준비할 증거:|$)/);
    const evidenceMatch = content.match(/\*\*준비할 증거:\*\*? ([\s\S]*?)(?=- \*\*나홀로 팁:|\*\*나홀로 팁:|$)/);
    const tipsMatch = content.match(/\*\*나홀로 팁:\*\*? ([\s\S]*?)$/);

    if (typeMatch) {
      sections.push({
        title: '추천 소송 유형',
        content: typeMatch[1].trim(),
        icon: <Scale className="w-4 h-4 text-brand-600" />,
        iconBg: 'bg-brand-50',
        titleColor: 'text-brand-900',
        className: 'bg-white border-brand-200 shadow-sm ring-1 ring-brand-100'
      });
    }

    if (summaryMatch) {
      sections.push({
        title: '핵심 요약',
        content: summaryMatch[1].trim(),
        icon: <Search className="w-4 h-4 text-indigo-600" />,
        iconBg: 'bg-indigo-50',
        titleColor: 'text-indigo-900',
      });
    }

    if (evidenceMatch) {
      sections.push({
        title: '준비할 증거',
        content: evidenceMatch[1].trim(),
        icon: <ClipboardList className="w-4 h-4 text-emerald-600" />,
        iconBg: 'bg-emerald-50',
        titleColor: 'text-emerald-900',
      });
    }

    if (tipsMatch) {
      sections.push({
        title: '나홀로 팁',
        content: tipsMatch[1].trim(),
        icon: <Lightbulb className="w-4 h-4 text-amber-600" />,
        iconBg: 'bg-amber-50',
        titleColor: 'text-amber-900',
        className: 'bg-amber-50/50 border-amber-100 italic'
      });
    }
  }

  // 2. Document Summarization Logic (if not already handled)
  if (sections.length === 0 && (type === 'summary' || type === 'general')) {
    const summaryMatch = content.match(/핵심 요약:([\s\S]*?)(?=사용자의 유불리:|다음 행동 가이드:|$)/);
    const prosConsMatch = content.match(/사용자의 유불리:([\s\S]*?)(?=다음 행동 가이드:|$)/);
    const actionsMatch = content.match(/다음 행동 가이드:([\s\S]*?)$/);

    if (summaryMatch) {
      sections.push({
        title: '핵심 요약',
        content: summaryMatch[1].trim(),
        icon: <FileText className="w-4 h-4 text-brand-600" />,
        iconBg: 'bg-brand-50',
        titleColor: 'text-brand-900',
        className: 'bg-gradient-to-br from-brand-50/50 to-white border-brand-100'
      });
    }

    if (prosConsMatch) {
      const prosConsText = prosConsMatch[1].trim();
      const isNegative = prosConsText.includes('불리') || prosConsText.includes('주의') || prosConsText.includes('위험');
      sections.push({
        title: '유불리 분석',
        content: prosConsText,
        icon: isNegative ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />,
        iconBg: isNegative ? 'bg-amber-50' : 'bg-emerald-50',
        titleColor: isNegative ? 'text-amber-900' : 'text-emerald-900',
        className: isNegative ? 'bg-amber-50/30 border-amber-100' : 'bg-emerald-50/30 border-emerald-100'
      });
    }

    if (actionsMatch) {
      sections.push({
        title: '다음 행동 가이드',
        content: actionsMatch[1].trim(),
        icon: <ArrowRight className="w-4 h-4 text-blue-600" />,
        iconBg: 'bg-blue-50',
        titleColor: 'text-blue-900',
        className: 'bg-blue-50/30 border-blue-100'
      });
    }
  }

  // 3. Correction Orders Logic
  if (sections.length === 0 && (type === 'correction' || type === 'general')) {
    const analysisMatch = content.match(/(?:## 🔍 )?보정 명령 분석 결과([\s\S]*?)(?=(?:## 🛠️ )?해결 방법|(?:## 📝 )?보정서 초안|$)/);
    const solutionMatch = content.match(/(?:## 🛠️ )?해결 방법 \(Step-by-Step\)([\s\S]*?)(?=(?:## 📝 )?보정서 초안|$)/);
    const draftMatch = content.match(/(?:## 📝 )?보정서 초안([\s\S]*?)$/);

    if (analysisMatch) {
      sections.push({
        title: '명령 분석 결과',
        content: analysisMatch[1].trim(),
        icon: <ShieldCheck className="w-4 h-4 text-brand-600" />,
        iconBg: 'bg-brand-50',
        titleColor: 'text-brand-900',
        className: 'bg-white border-brand-100'
      });
    }

    if (solutionMatch) {
      sections.push({
        title: '해결 방법 (Step-by-Step)',
        content: solutionMatch[1].trim(),
        icon: <ClipboardList className="w-4 h-4 text-blue-600" />,
        iconBg: 'bg-blue-50',
        titleColor: 'text-blue-900',
        className: 'bg-blue-50/30 border-blue-100 shadow-sm'
      });
    }

    if (draftMatch) {
      sections.push({
        title: '보정서 초안',
        content: draftMatch[1].trim(),
        icon: <FileText className="w-4 h-4 text-slate-600" />,
        iconBg: 'bg-slate-100',
        titleColor: 'text-slate-900',
        className: 'bg-slate-50 border-slate-200 font-mono text-xs'
      });
    }
  }

  // 4. Catch-all for markdown with high-level headers
  if (sections.length === 0) {
    const headerRegex = /#+ ([^\n]+)\n([\s\S]*?)(?=#+ |$)/g;
    let match;
    while ((match = headerRegex.exec(content)) !== null) {
      const title = match[1].trim();
      const sectionContent = match[2].trim();
      
      let icon = <Lightbulb className="w-4 h-4 text-brand-500" />;
      let iconBg = 'bg-brand-50';
      
      if (title.includes('팁') || title.includes('추천') || title.includes('가이드')) {
        icon = <Sparkles className="w-4 h-4 text-brand-500" />;
      } else if (title.includes('주의') || title.includes('위험') || title.includes('경고')) {
        icon = <AlertTriangle className="w-4 h-4 text-red-500" />;
        iconBg = 'bg-red-50';
      } else if (title.includes('해결') || title.includes('전략')) {
        icon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        iconBg = 'bg-emerald-50';
      }

      sections.push({
        title,
        content: sectionContent,
        icon,
        iconBg
      });
    }
  }

  return sections;
}
