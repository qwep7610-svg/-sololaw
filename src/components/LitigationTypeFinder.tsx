import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Scale, Sparkles, ArrowLeft, Loader2, Info, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { classifyLitigationType } from '../services/gemini';
import Markdown from 'react-markdown';

export default function LitigationTypeFinder({ onBack, onStartComplaint }: { onBack: () => void; onStartComplaint: (situation: string) => void }) {
  const [situation, setSituation] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!situation.trim()) return;
    setIsAnalyzing(true);
    try {
      const response = await classifyLitigationType(situation);
      setResult(response);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 뒤로 가기
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-[0.2em]">
          <Scale className="w-4 h-4" /> Litigation Classification
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] font-serif tracking-tight">소송 유형 자동 분류</h2>
        <p className="text-slate-500 text-sm font-medium">억울한 상황을 입력하시면 AI가 가장 적합한 소송 유형과 준비 사항을 안내해 드립니다.</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 space-y-6">
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-700 ml-1">상황 설명</label>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="예: 친구에게 500만원을 빌려줬는데 1년째 갚지 않고 연락도 잘 안 됩니다. 차용증은 없지만 카톡 대화 내용은 있습니다."
            className="w-full h-40 px-6 py-5 rounded-3xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-500/20 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none text-sm leading-relaxed"
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !situation.trim()}
          className="w-full py-5 bg-brand-600 text-white rounded-2xl font-bold text-lg hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              AI 분석 중...
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              무료 분석 시작하기
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white border border-brand-100 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-brand-100/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
              
              <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                  <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-200">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#0F172A]">AI 분석 결과</h3>
                    <p className="text-xs text-slate-400 font-medium">입력하신 내용을 바탕으로 도출된 가이드입니다.</p>
                  </div>
                </div>

                <div className="markdown-body prose prose-slate max-w-none prose-h3:text-brand-700 prose-h3:font-serif prose-h3:text-2xl prose-li:text-slate-600 prose-li:font-medium">
                  <Markdown>{result}</Markdown>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 flex gap-4 border border-slate-100">
                  <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    본 분석 결과는 인공지능에 의해 생성되었으며 법적 효력이 없습니다. 
                    구체적인 사안에 따라 법적 판단이 달라질 수 있으므로, 반드시 변호사와 상담하시거나 법률구조공단의 도움을 받으시기 바랍니다.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button 
                    onClick={() => onStartComplaint(situation)}
                    className="flex-[2] py-4 bg-brand-600 text-white rounded-2xl font-bold text-sm hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 flex items-center justify-center gap-2"
                  >
                    이 내용으로 소장 초안 바로 만들기 <Sparkles className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    결과 저장/인쇄
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Cards */}
      {!result && !isAnalyzing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <Info className="w-6 h-6 text-brand-600" />
            </div>
            <h4 className="font-bold text-[#0F172A]">어떤 내용을 입력해야 하나요?</h4>
            <ul className="space-y-2 text-sm text-slate-500 font-medium">
              <li className="flex items-center gap-2">• 육하원칙에 따른 구체적인 상황</li>
              <li className="flex items-center gap-2">• 분쟁의 원인이 된 금액이나 물건</li>
              <li className="flex items-center gap-2">• 현재 확보하고 있는 증거 자료</li>
              <li className="flex items-center gap-2">• 상대방의 현재 태도나 반응</li>
            </ul>
          </div>
          <div className="bg-gradient-to-br from-brand-50/50 to-white p-8 rounded-[2rem] border border-brand-100/50 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-brand-100/20">
              <Scale className="w-6 h-6 text-brand-600" />
            </div>
            <h4 className="font-bold text-[#0F172A]">분류 가능한 소송 유형</h4>
            <div className="flex flex-wrap gap-2">
              {['민사 소송', '가사 소송', '민사신청', '행정 소송', '형사 절차'].map(tag => (
                <span key={tag} className="px-3 py-1.5 bg-white rounded-xl text-[11px] font-bold text-brand-700 border border-brand-100 shadow-sm hover:border-brand-300 transition-colors">
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              SoloLaw AI는 대한민국 법령과 최신 판례를 바탕으로 가장 적합한 절차를 안내합니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
