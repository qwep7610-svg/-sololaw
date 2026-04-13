import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Calculator, Loader2, Copy, Check, AlertCircle, Sparkles, Save, ShieldCheck, Coins, Users, Laptop, Info, TrendingDown, Download } from 'lucide-react';
import { calculateLitigationCost } from '../services/gemini';
import { useAuth } from '../lib/AuthContext';
import { saveToHistory } from '../services/historyService';
import StepIndicator from './StepIndicator';
import AIAssistantBubble from './AIAssistantBubble';

interface CostResult {
  soga: {
    amount: number;
    formula: string;
    basis: string;
  };
  fees: {
    stampDuty: {
      original: number;
      discounted: number;
      isElectronic: boolean;
    };
    serviceFee: number;
    total: number;
  };
  strategy: {
    isSmallClaim: boolean;
    advice: string;
    recoverableAttorneyFee: string;
  };
}

export default function LitigationCostCalculator({ onBack, initialData }: { onBack: () => void, initialData?: any }) {
  const { user } = useAuth();
  const [type, setType] = useState(initialData?.type || '대여금 반환');
  const [instance, setInstance] = useState('1심 (지방법원)');
  const [content, setContent] = useState(initialData?.amount || initialData?.content || '');
  const [others, setOthers] = useState(initialData?.others || '');
  const [parties, setParties] = useState(2);
  const [isElectronic, setIsElectronic] = useState(true);
  
  const [result, setResult] = useState<CostResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (initialData) {
      handleCalculate();
    }
  }, []);

  const handleCalculate = async () => {
    const targetContent = content || initialData?.amount || initialData?.content;
    if (!targetContent) return;

    setIsLoading(true);
    setResult(null);
    try {
      const analysis = await calculateLitigationCost({ 
        type, 
        instance,
        content: targetContent, 
        others, 
        parties, 
        isElectronic 
      });
      setResult(analysis);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : '계산 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      const text = `[소가] ${result.soga.amount.toLocaleString()}원\n[인지대] ${result.fees.stampDuty.discounted.toLocaleString()}원\n[송달료] ${result.fees.serviceFee.toLocaleString()}원\n[총 비용] ${result.fees.total.toLocaleString()}원`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveToHistory = async () => {
    if (!result || !user) return;

    try {
      await saveToHistory(user.uid, 'cost_calc', {
        title: '소송 비용 계산 결과',
        content: `소가: ${result.soga.amount.toLocaleString()}원\n총 예상 비용: ${result.fees.total.toLocaleString()}원\n\n${result.strategy.advice}`,
        data: { type, content, others, result }
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save to history:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
              { id: 'result', label: '계산 결과' }
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
              <div className="bg-blue-50 p-2 rounded-lg">
                <Calculator className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-[#0F172A]">비용 계산 정보 입력</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">소송 유형</label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-4 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm bg-white"
                >
                  <option>대여금 반환</option>
                  <option>손해배상 (위자료 등)</option>
                  <option>건물 인도/명도</option>
                  <option>부당이득 반환</option>
                  <option>물품대금/공사대금</option>
                  <option>기타 민사소송</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">심급 (관할)</label>
                <select 
                  value={instance}
                  onChange={(e) => setInstance(e.target.value)}
                  className="w-full p-4 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm bg-white"
                >
                  <option>1심 (지방법원)</option>
                  <option>2심 (항소심/고등법원)</option>
                  <option>3심 (상고심/대법원)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">청구 내용 (금액 또는 목적물)</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="예: 빌려준 돈 5,000만원 / 보증금 1억에 월세 100만원인 상가"
                  className="w-full h-24 p-4 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">기타 청구 (이자, 위자료 등)</label>
                <input
                  type="text"
                  value={others}
                  onChange={(e) => setOthers(e.target.value)}
                  placeholder="예: 연 5% 이자, 위자료 1,000만원"
                  className="w-full p-4 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#64748B]" /> 당사자 수
                  </label>
                  <input
                    type="number"
                    min={2}
                    value={parties}
                    onChange={(e) => setParties(parseInt(e.target.value))}
                    className="w-full p-4 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                  />
                  <p className="text-[10px] text-[#94A3B8] mt-1">원고+피고 합계 (최소 2명)</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-2 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-[#64748B]" /> 제출 방식
                  </label>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button 
                      onClick={() => setIsElectronic(true)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isElectronic ? 'bg-white text-blue-600 shadow-sm' : 'text-[#64748B]'}`}
                    >
                      전자
                    </button>
                    <button 
                      onClick={() => setIsElectronic(false)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isElectronic ? 'bg-white text-blue-600 shadow-sm' : 'text-[#64748B]'}`}
                    >
                      종이
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <AIAssistantBubble 
              isVisible={!result && !isLoading}
              message="청구하려는 금액이나 목적물을 입력하시면 대략적인 인지대와 송달료를 계산해 드립니다. 전자소송으로 진행하면 인지대 10% 할인 혜택이 있어요!"
              tip="상대방이 여러 명일 경우 송달료가 증가하므로 당사자 수를 정확히 입력해 주세요."
            />

            <button
              onClick={handleCalculate}
              disabled={!content || isLoading}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-100"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  비용 산출 중...
                </>
              ) : (
                <>
                  <Coins className="w-5 h-5" />
                  소송 비용 계산하기
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
                  <Calculator className="w-8 h-8 text-[#CBD5E1]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[#94A3B8]">계산 결과가 여기에 표시됩니다</h3>
                  <p className="text-sm text-[#94A3B8] max-w-[240px]">
                    정보를 입력하고 계산 버튼을 눌러주세요.
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
                  <div className="w-16 h-16 border-4 border-[#E2E8F0] border-t-blue-600 rounded-full animate-spin" />
                  <Sparkles className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#0F172A]">비용을 산정하고 있습니다</h3>
                  <p className="text-[#64748B]">법정 기준에 맞춰 인지대와 송달료를 계산 중입니다.</p>
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
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-[#0F172A]">소송 비용 산출 결과</h2>
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
                      onClick={() => {
                        if (!result) return;
                        const text = `[소가] ${result.soga.amount.toLocaleString()}원\n[인지대] ${result.fees.stampDuty.discounted.toLocaleString()}원\n[송달료] ${result.fees.serviceFee.toLocaleString()}원\n[총 비용] ${result.fees.total.toLocaleString()}원\n\n[비용 회수 가이드]\n${result.strategy.advice}`;
                        const blob = new Blob([text], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `소송비용계산_${new Date().toISOString().split('T')[0]}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-[#64748B]"
                      title="다운로드"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleCopy}
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-[#64748B]"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                  {/* Soga Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#64748B] uppercase tracking-wider">산정된 소가 (소송물가액)</h3>
                      <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold">
                        {type}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100 text-center">
                      <p className="text-2xl md:text-3xl font-black text-[#0F172A] break-all">{result!.soga.amount.toLocaleString()}원</p>
                      <p className="text-xs text-[#64748B] mt-2 leading-relaxed break-keep">{result!.soga.formula}</p>
                    </div>
                    <div className="flex gap-2 p-3 bg-blue-50/30 rounded-xl border border-blue-100/50">
                      <Info className="w-4 h-4 text-blue-500 shrink-0" />
                      <p className="text-[10px] text-blue-700 leading-relaxed">{result!.soga.basis}</p>
                    </div>
                  </div>

                  {/* Fees Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#64748B] uppercase tracking-wider">법원 납부 비용 (예상)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-[#E2E8F0] space-y-1">
                        <p className="text-xs text-[#64748B] break-keep">인지대 {result!.fees.stampDuty.isElectronic && <span className="text-[10px] text-blue-500 font-bold">(10% 할인)</span>}</p>
                        <p className="text-lg font-bold text-[#0F172A]">{result!.fees.stampDuty.discounted.toLocaleString()}원</p>
                      </div>
                      <div className="p-4 rounded-xl border border-[#E2E8F0] space-y-1">
                        <p className="text-xs text-[#64748B] break-keep">송달료 ({parties}인 기준)</p>
                        <p className="text-lg font-bold text-[#0F172A]">{result!.fees.serviceFee.toLocaleString()}원</p>
                      </div>
                    </div>
                    <div className="bg-blue-600 p-6 rounded-2xl text-center shadow-lg shadow-blue-100">
                      <p className="text-xs text-blue-100 mb-1">총 예상 비용 합계</p>
                      <p className="text-2xl font-black text-white">{result!.fees.total.toLocaleString()}원</p>
                    </div>
                  </div>

                  {/* Strategy Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#64748B] uppercase tracking-wider">비용 절감 및 회수 전략</h3>
                    
                    {result!.strategy.isSmallClaim && (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex gap-3">
                        <TrendingDown className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-emerald-900">소액사건심판법 적용 대상</p>
                          <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                            소가가 3,000만원 이하이므로 절차가 간소하고 빠른 소액재판으로 진행됩니다.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 space-y-2">
                        <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2">
                          <Sparkles className="w-3 h-3" /> 비용 회수 가이드
                        </h4>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          {result!.strategy.advice}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                        <h4 className="text-xs font-bold text-[#0F172A] flex items-center gap-2">
                          <Users className="w-3 h-3" /> 변호사 보수 회수 한도
                        </h4>
                        <p className="text-xs text-[#64748B] leading-relaxed">
                          승소 시 상대방에게 청구할 수 있는 법정 변호사 보수 한도는 약 <span className="font-bold text-[#0F172A]">{result!.strategy.recoverableAttorneyFee}</span>입니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-[#64748B] shrink-0" />
                    <p className="text-[10px] text-[#64748B] leading-relaxed">
                      본 계산 결과는 입력된 정보를 바탕으로 한 추정치이며, 실제 법원에서 산정하는 금액과 차이가 있을 수 있습니다. 정확한 금액은 소장 접수 시 법원 안내를 확인하시기 바랍니다.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
