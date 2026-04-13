import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Mail, Loader2, Copy, Check, AlertCircle, Sparkles, Save, User, MapPin, FileText, Send, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateDemandLetter, analyzeUserCase } from '../services/gemini';
import { useAuth } from '../lib/AuthContext';
import { saveToHistory } from '../services/historyService';
import StepIndicator from './StepIndicator';
import AIAssistantBubble from './AIAssistantBubble';
import LawyerMatching from './LawyerMatching';

export default function DemandLetterWizard({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    sender: '',
    receiver: '',
    title: '',
    context: '',
    requirement: '',
    consequence: ''
  });
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{ primary_category: string; keywords: string[] } | null>(null);

  const handleGenerate = async () => {
    if (!formData.sender || !formData.receiver || !formData.title || !formData.context) return;

    setIsLoading(true);
    setResult(null);
    try {
      const [letter, analysis] = await Promise.all([
        generateDemandLetter(formData),
        analyzeUserCase(formData.context)
      ]);
      setResult(letter);
      setAnalysisResult(analysis);
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : '내용증명 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveToHistory = async () => {
    if (!result || !user) return;

    try {
      await saveToHistory(user.uid, 'demand_letter', {
        title: `내용증명: ${formData.title}`,
        content: result,
        data: formData
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save to history:", error);
      setErrorMsg("저장 중 오류가 발생했습니다.");
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `내용증명_${formData.title}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 뒤로 가기
        </button>
        <div className="flex-1 max-w-xs">
          <StepIndicator 
            steps={[
              { id: 'input', label: '정보 입력' },
              { id: 'result', label: '작성 결과' }
            ]}
            currentStepIndex={result ? 1 : 0}
            isComplete={!!result}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-orange-50 p-2 rounded-lg">
                <Mail className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-bold text-[#0F172A]">내용증명 정보 입력</h2>
            </div>

            <p className="text-sm text-[#64748B] leading-relaxed">
              상대방에게 강력한 법적 경고를 전달할 수 있는 내용증명을 작성합니다. 사실관계를 명확히 입력해 주세요.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#64748B] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> 발신인 (이름/주소)
                  </label>
                  <input 
                    type="text" 
                    value={formData.sender}
                    onChange={(e) => setFormData(prev => ({ ...prev, sender: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="홍길동 / 서울시..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#64748B] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> 수신인 (이름/주소)
                  </label>
                  <input 
                    type="text" 
                    value={formData.receiver}
                    onChange={(e) => setFormData(prev => ({ ...prev, receiver: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="김철수 / 경기도..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> 사건 제목
                </label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  placeholder="예: 미지급 임대료 청구의 건"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> 사건 경위
                </label>
                <textarea 
                  value={formData.context}
                  onChange={(e) => setFormData(prev => ({ ...prev, context: e.target.value }))}
                  className="w-full h-24 p-3 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-orange-500 outline-none text-sm resize-none"
                  placeholder="언제, 무슨 일이 있었는지 일상어로 입력해 주세요."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> 요구 사항
                </label>
                <input 
                  type="text" 
                  value={formData.requirement}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirement: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  placeholder="예: 2024년 5월 1일까지 미납금 500만원 입금"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> 미이행 시 조치
                </label>
                <input 
                  type="text" 
                  value={formData.consequence}
                  onChange={(e) => setFormData(prev => ({ ...prev, consequence: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  placeholder="예: 민형사상 법적 조치 및 지연손해금 청구"
                />
              </div>
            </div>

            <AIAssistantBubble 
              isVisible={!result && !isLoading}
              message="내용증명은 상대방에게 심리적 압박을 주고, 추후 소송에서 강력한 증거가 됩니다. 육하원칙에 따라 사실관계를 명확히 입력해 주세요."
              tip="발신인과 수신인의 주소는 우체국 발송 시 실제 주소와 일치해야 합니다."
            />

            <button
              onClick={handleGenerate}
              disabled={!formData.sender || !formData.receiver || !formData.title || isLoading}
              className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-100"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  내용증명 작성 중...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  내용증명 생성하기
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result Section */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {!result && !isLoading ? (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[500px] border-2 border-dashed border-[#E2E8F0] rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-50/30"
              >
                <div className="bg-white p-4 rounded-full shadow-sm">
                  <Mail className="w-8 h-8 text-[#CBD5E1]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[#94A3B8]">생성된 내용증명이 여기에 표시됩니다</h3>
                  <p className="text-sm text-[#94A3B8] max-w-[240px]">
                    정보를 입력하고 생성 버튼을 눌러주세요.
                  </p>
                </div>
              </motion.div>
            ) : isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[500px] bg-white border border-[#E2E8F0] rounded-2xl p-8 flex flex-col items-center justify-center space-y-6 text-center"
              >
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-[#E2E8F0] border-t-orange-600 rounded-full animate-spin" />
                  <Sparkles className="w-6 h-6 text-orange-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#0F172A]">전략적 압박 문구를 구성 중입니다</h3>
                  <p className="text-[#64748B]">법률적 용어를 배치하여 강력한 경고 메시지를 만듭니다.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden flex flex-col h-full"
              >
                <div className="p-6 border-b border-[#E2E8F0] bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-orange-600" />
                    <h2 className="text-lg font-bold text-[#0F172A]">내용증명 초안</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveToHistory}
                      className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium ${
                        isSaved 
                          ? 'bg-green-50 text-green-600 border border-green-200' 
                          : 'hover:bg-slate-200 text-[#64748B] border border-transparent'
                      }`}
                    >
                      {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {isSaved ? '저장됨' : '보관함 저장'}
                    </button>
                    <button
                      onClick={handleCopy}
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-[#64748B]"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="p-8 flex-1 overflow-y-auto prose prose-slate max-w-none prose-headings:text-[#0F172A] prose-headings:font-bold prose-p:text-[#475569] prose-p:leading-relaxed">
                  <ReactMarkdown>{result}</ReactMarkdown>
                  
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="flex items-start gap-2 text-[10px] text-slate-400 leading-relaxed italic">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      <p>
                        본 문서는 AI 기술로 작성된 초안이며, 법적 효력 및 결과에 대한 책임은 제출자 본인에게 있습니다. 
                        제출 전 반드시 법률 전문가의 검토를 거치시기 바랍니다.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-orange-50 border-t border-orange-100 flex items-center justify-between">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                    <p className="text-[10px] text-orange-800 leading-relaxed">
                      이 내용증명은 AI가 작성한 초안입니다. 발송 전 반드시 내용을 확인하고, 우체국을 통해 정식으로 발송하시기 바랍니다.
                    </p>
                  </div>
                  <button 
                    onClick={handleDownload}
                    className="p-2 hover:bg-orange-100 rounded-lg text-orange-600 transition-colors"
                    title="다운로드"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>

                {/* Lawyer Matching Section */}
                {analysisResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 pt-8 border-t border-slate-100 space-y-6"
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-bold text-[#0F172A]">전문가 검토 추천</h3>
                      <p className="text-sm text-[#64748B]">작성된 초안을 바탕으로 가장 적합한 변호사를 추천해 드립니다.</p>
                    </div>
                    
                    <LawyerMatching 
                      primaryCategory={analysisResult.primary_category}
                      keywords={analysisResult.keywords}
                      userCaseSummary={formData.context}
                      onSelectLawyer={(lawyer) => {
                        setErrorMsg(`${lawyer.name} 변호사님께 검토 요청 페이지로 이동합니다.`);
                      }}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
