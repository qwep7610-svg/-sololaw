import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, Loader2, Download, Copy, Check, RefreshCw, Sparkles, Save, ShieldAlert, Heart, Scale, Users, Gavel, AlertTriangle, Calculator, Calendar, FileSearch, Handshake, TrendingUp, Info, FileText, ChevronRight, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateDivorceDocument, analyzeAssetSplit, designParentingPlan, analyzeFaultEvidence, generateMediationAgreement, analyzeUserCase } from '../services/gemini';
import { useAuth } from '../lib/AuthContext';
import { saveToHistory } from '../services/historyService';
import StepIndicator from './StepIndicator';
import AIAssistantBubble from './AIAssistantBubble';
import LawyerMatching from './LawyerMatching';
import FinalReviewModal from './FinalReviewModal';

type DivorceType = 'property' | 'alimony' | 'asset_split' | 'parenting' | 'fault_evidence' | 'mediation';

export default function DivorceWizard({ onBack, onCalculateCost }: { onBack: () => void, onCalculateCost?: (data: any) => void }) {
  const { user } = useAuth();
  const [type, setType] = useState<DivorceType | null>(null);
  const [formData, setFormData] = useState({
    marriageDuration: '',
    children: '',
    plaintiffRole: '',
    defendantRole: '',
    supportAmount: '',
    infidelityDuration: '',
    evidence: '',
    medicalRecord: '',
    customContext: '',
    // Alimony Specific
    faultType: 'infidelity' as 'infidelity' | 'violence' | 'desertion' | 'other',
    faultDetails: '',
    impactDetails: '',
    // Asset Split
    isDoubleIncome: false,
    houseworkValue: '',
    preMarriageAssets: '',
    currentAssets: '',
    contributionDetails: '',
    financialContribution: [] as string[],
    nonFinancialContribution: [] as string[],
    // Housework Details
    careerInterruption: false,
    careerInterruptionDuration: '',
    childCareYears: '',
    houseworkRatio: '',
    elderlyCare: false,
    majorAssetManagement: false,
    // Parenting
    combinedIncome: '',
    childAge: '',
    custodyPreference: '',
    visitationPreference: '',
    extraExpenses: [] as string[],
    extraExpensesAmount: '',
    // Mediation
    propertyAgreement: '',
    custodyAgreement: '',
    alimonyAgreement: '',
    specialTerms: '',
  });
  
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{ primary_category: string; keywords: string[] } | null>(null);
  const [showFinalReview, setShowFinalReview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setSelectedFile({ data: base64, mimeType: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!type) return;
    setIsLoading(true);
    setResult(null);
    try {
      let docPromise;
      switch (type) {
        case 'property':
        case 'alimony':
          docPromise = generateDivorceDocument({ 
            type, 
            ...formData,
            financialContribution: formData.financialContribution,
            nonFinancialContribution: formData.nonFinancialContribution,
            faultType: formData.faultType,
            faultDetails: formData.faultDetails,
            impactDetails: formData.impactDetails
          });
          break;
        case 'asset_split':
          docPromise = analyzeAssetSplit({
            marriageDuration: formData.marriageDuration,
            isDoubleIncome: formData.isDoubleIncome,
            houseworkValue: formData.houseworkValue,
            houseworkDetails: {
              careerInterruption: formData.careerInterruption,
              careerInterruptionDuration: formData.careerInterruptionDuration,
              childCareYears: formData.childCareYears,
              houseworkRatio: formData.houseworkRatio,
              elderlyCare: formData.elderlyCare,
              majorAssetManagement: formData.majorAssetManagement
            },
            preMarriageAssets: formData.preMarriageAssets,
            currentAssets: formData.currentAssets,
            contributionDetails: formData.contributionDetails,
            financialContribution: formData.financialContribution,
            nonFinancialContribution: formData.nonFinancialContribution
          });
          break;
        case 'parenting':
          docPromise = designParentingPlan({
            combinedIncome: formData.combinedIncome,
            childAge: formData.childAge,
            custodyPreference: formData.custodyPreference,
            visitationPreference: formData.visitationPreference,
            extraExpenses: formData.extraExpenses,
            extraExpensesAmount: formData.extraExpensesAmount
          });
          break;
        case 'fault_evidence':
          docPromise = analyzeFaultEvidence({
            text: formData.evidence,
            file: selectedFile ? { data: selectedFile.data, mimeType: selectedFile.mimeType } : undefined
          });
          break;
        case 'mediation':
          docPromise = generateMediationAgreement({
            propertyAgreement: formData.propertyAgreement,
            custodyAgreement: formData.custodyAgreement,
            alimonyAgreement: formData.alimonyAgreement,
            specialTerms: formData.specialTerms
          });
          break;
      }
      
      const summaryForAnalysis = type === 'fault_evidence' ? formData.evidence : 
                                 type === 'alimony' ? formData.faultDetails :
                                 formData.customContext || formData.houseworkValue || '이혼 관련 법률 상담';

      const [generatedDoc, analysis] = await Promise.all([
        docPromise,
        analyzeUserCase(summaryForAnalysis)
      ]);

      setResult(generatedDoc);
      setAnalysisResult(analysis);
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (!result || !user) return;
    
    let title = '';
    let content = '';
    
    if (typeof result === 'string') {
      content = result;
      title = type === 'property' ? '재산분할 기여도 소명서' : 
              type === 'alimony' ? '위자료 청구 소장' : 
              type === 'fault_evidence' ? '유책 사유 증거 분석' : '이혼 조정 합의서';
    } else {
      title = type === 'asset_split' ? '재산분할 비율 분석' : '양육비 및 면접교섭 설계';
      content = type === 'asset_split' ? `예상 비율: ${result.ratio}\n\n${result.analysis}` : `표준 양육비: ${result.standardFee}\n\n${result.advice}`;
    }

    try {
      await saveToHistory(user.uid, 'divorce', {
        title,
        content,
        data: { ...formData, type, result }
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save to history:", error);
      setErrorMsg("저장 중 오류가 발생했습니다.");
    }
  };

  const handleCopy = () => {
    if (result) {
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
            if (type) {
              setType(null);
              setResult(null);
            } else {
              onBack();
            }
          }}
          className="flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 뒤로 가기
        </button>
        {type && (
          <div className="flex-1 max-w-xs">
            <StepIndicator 
              steps={[
                { id: 'input', label: '정보 입력' },
                { id: 'result', label: '분석 결과' }
              ]}
              currentStepIndex={result ? 1 : 0}
              isComplete={!!result}
            />
          </div>
        )}
      </div>

      {!type ? (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-[#0F172A]">이혼 소송 특화 지원</h2>
            <p className="text-[#64748B]">가장 힘든 시기, 법리적 권리를 명확히 주장할 수 있도록 돕습니다.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button 
              onClick={() => setType('property')}
              className="p-6 bg-white border border-[#E2E8F0] rounded-3xl hover:border-blue-500 hover:shadow-lg transition-all text-left space-y-3 group"
            >
              <div className="bg-blue-50 p-3 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Scale className="w-6 h-6 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#0F172A]">기여도 소명서 작성</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  재산 형성에 기여한 바를 법리적으로 정리한 소명서를 작성합니다.
                </p>
              </div>
            </button>

            <button 
              onClick={() => setType('asset_split')}
              className="p-6 bg-white border border-[#E2E8F0] rounded-2xl hover:border-indigo-500 hover:shadow-lg transition-all text-left space-y-3 group"
            >
              <div className="bg-indigo-50 p-3 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Calculator className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#0F172A]">재산분할 비율 분석</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  혼인 기간, 맞벌이 등을 분석하여 예상 분할 비율을 산출합니다.
                </p>
              </div>
            </button>

            <button 
              onClick={() => setType('parenting')}
              className="p-6 bg-white border border-[#E2E8F0] rounded-2xl hover:border-emerald-500 hover:shadow-lg transition-all text-left space-y-3 group"
            >
              <div className="bg-emerald-50 p-3 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#0F172A]">양육비 및 면접 설계</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  표준 양육비 계산 및 공동 양육 캘린더 초안을 생성합니다.
                </p>
              </div>
            </button>

            <button 
              onClick={() => setType('alimony')}
              className="p-6 bg-white border border-[#E2E8F0] rounded-2xl hover:border-red-500 hover:shadow-lg transition-all text-left space-y-3 group"
            >
              <div className="bg-red-50 p-3 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#0F172A]">위자료 청구 소장</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  상대방의 부정행위로 인한 정신적 고통을 소명하는 소장을 작성합니다.
                </p>
              </div>
            </button>

            <button 
              onClick={() => setType('fault_evidence')}
              className="p-6 bg-white border border-[#E2E8F0] rounded-2xl hover:border-amber-500 hover:shadow-lg transition-all text-left space-y-3 group"
            >
              <div className="bg-amber-50 p-3 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <FileSearch className="w-6 h-6 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#0F172A]">유책 사유 증거 분석</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  카톡, 사진 등을 분석하여 법적 이혼 사유 해당 여부를 판단합니다.
                </p>
              </div>
            </button>

            <button 
              onClick={() => setType('mediation')}
              className="p-6 bg-white border border-[#E2E8F0] rounded-2xl hover:border-slate-500 hover:shadow-lg transition-all text-left space-y-3 group"
            >
              <div className="bg-slate-50 p-3 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Handshake className="w-6 h-6 text-slate-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#0F172A]">조정 합의서 작성</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  격한 소송 대신 원만한 합의를 위한 조정 합의서 초안을 작성합니다.
                </p>
              </div>
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            <div className="space-y-2">
              <h4 className="font-bold text-amber-900">법적 & 윤리적 주의사항</h4>
              <ul className="text-sm text-amber-800 space-y-1 list-disc pl-4">
                <li><strong>증거 수집 주의</strong>: 도청, 위치 추적 등 불법적인 증거 수집은 형사 처벌의 대상이 될 수 있으며 법정에서 증거로 채택되지 않을 수 있습니다.</li>
                <li><strong>조정(Mediation) 권고</strong>: 소송의 피로도와 자녀의 정서를 고려하여, 가능한 경우 조정 절차를 통한 합리적 해결을 먼저 고려해 보시길 권장합니다.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#0F172A]">
                  {type === 'property' ? '기여도 소명 정보' : 
                   type === 'asset_split' ? '재산분할 분석 정보' :
                   type === 'parenting' ? '양육 및 면접 정보' :
                   type === 'alimony' ? '위자료 청구 정보' :
                   type === 'fault_evidence' ? '증거 분석 정보' : '조정 합의 정보'}
                </h2>
                <button 
                  onClick={() => { setType(null); setResult(null); }}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  유형 변경
                </button>
              </div>

              <div className="space-y-4">
                {(type === 'property' || type === 'asset_split') && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">혼인 기간</label>
                        <input 
                          type="text" 
                          placeholder="예: 12년"
                          value={formData.marriageDuration}
                          onChange={(e) => setFormData({...formData, marriageDuration: e.target.value})}
                          className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                      </div>
                      <div className="flex items-end pb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={formData.isDoubleIncome}
                            onChange={(e) => setFormData({...formData, isDoubleIncome: e.target.checked})}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700">맞벌이 여부</span>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">가사 및 육아 상황 (요약)</label>
                      <textarea 
                        placeholder="예: 전업주부로서 12년간 가사와 자녀 2명의 육아를 전담함"
                        value={formData.houseworkValue}
                        onChange={(e) => setFormData({...formData, houseworkValue: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm h-20 resize-none"
                      />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-blue-600" /> 기여도 상세 항목 선택
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">경제적 기여</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 'income', label: '근로/사업 소득' },
                              { id: 'inheritance', label: '상속/증여 재산' },
                              { id: 'investment', label: '재테크/투자 수익' },
                              { id: 'loan', label: '대출 상환 주도' },
                            ].map((item) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  const current = formData.financialContribution;
                                  const next = current.includes(item.id) 
                                    ? current.filter(id => id !== item.id)
                                    : [...current, item.id];
                                  setFormData({ ...formData, financialContribution: next });
                                }}
                                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                                  formData.financialContribution.includes(item.id)
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">비경제적 기여</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 'housework', label: '가사 노동 전담' },
                              { id: 'childcare', label: '육아 전담' },
                              { id: 'elderlycare', label: '양가 부모 부양' },
                              { id: 'business_support', label: '배우자 사업 내조' },
                            ].map((item) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  const current = formData.nonFinancialContribution;
                                  const next = current.includes(item.id) 
                                    ? current.filter(id => id !== item.id)
                                    : [...current, item.id];
                                  setFormData({ ...formData, nonFinancialContribution: next });
                                }}
                                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                                  formData.nonFinancialContribution.includes(item.id)
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={formData.careerInterruption}
                            onChange={(e) => setFormData({...formData, careerInterruption: e.target.checked})}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 transition-colors">경력 단절 여부</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={formData.majorAssetManagement}
                            onChange={(e) => setFormData({...formData, majorAssetManagement: e.target.checked})}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 transition-colors">자산 관리 주도</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">전담 육아 기간 (년)</label>
                          <input 
                            type="text" 
                            placeholder="예: 8년"
                            value={formData.childCareYears}
                            onChange={(e) => setFormData({...formData, childCareYears: e.target.value})}
                            className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">경력 단절 기간 (년)</label>
                          <input 
                            type="text" 
                            placeholder="예: 5년"
                            value={formData.careerInterruptionDuration}
                            onChange={(e) => setFormData({...formData, careerInterruptionDuration: e.target.value})}
                            className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">가사 분담 비율 (본인 %)</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5"
                            value={formData.houseworkRatio || '50'}
                            onChange={(e) => setFormData({...formData, houseworkRatio: e.target.value})}
                            className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                          <span className="text-xs font-bold text-blue-600 w-10">{formData.houseworkRatio || '50'}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">혼인 전 특유재산</label>
                      <input 
                        type="text" 
                        placeholder="예: 혼인 전 소유 아파트 3억 원"
                        value={formData.preMarriageAssets}
                        onChange={(e) => setFormData({...formData, preMarriageAssets: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">현재 공동 재산 규모</label>
                      <input 
                        type="text" 
                        placeholder="예: 아파트 10억, 예금 2억"
                        value={formData.currentAssets}
                        onChange={(e) => setFormData({...formData, currentAssets: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                  </>
                )}

                {type === 'parenting' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">부모 합산 소득</label>
                        <input 
                          type="text" 
                          placeholder="예: 월 800만 원"
                          value={formData.combinedIncome}
                          onChange={(e) => setFormData({...formData, combinedIncome: e.target.value})}
                          className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">자녀 연령</label>
                        <input 
                          type="text" 
                          placeholder="예: 만 5세, 만 8세"
                          value={formData.childAge}
                          onChange={(e) => setFormData({...formData, childAge: e.target.value})}
                          className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500">추가 교육비/의료비 발생 여부</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'education', label: '고액 교육비 (예체능 등)' },
                          { id: 'medical', label: '지속적 의료비 (질환 등)' },
                          { id: 'rehabilitation', label: '재활/치료비' },
                          { id: 'other', label: '기타 특수 비용' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              const current = formData.extraExpenses;
                              const next = current.includes(item.id) 
                                ? current.filter(id => id !== item.id)
                                : [...current, item.id];
                              setFormData({ ...formData, extraExpenses: next });
                            }}
                            className={`px-3 py-2 rounded-lg border text-[10px] font-bold transition-all ${
                              formData.extraExpenses.includes(item.id)
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      {formData.extraExpenses.length > 0 && (
                        <input 
                          type="text" 
                          placeholder="추가 비용의 대략적인 월 금액 (예: 월 50만 원)"
                          value={formData.extraExpensesAmount}
                          onChange={(e) => setFormData({...formData, extraExpensesAmount: e.target.value})}
                          className="w-full p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">양육권 희망 사항</label>
                      <textarea 
                        placeholder="예: 원고가 주 양육자로 지정되길 원함"
                        value={formData.custodyPreference}
                        onChange={(e) => setFormData({...formData, custodyPreference: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm h-20 resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">면접교섭 희망 사항</label>
                      <textarea 
                        placeholder="예: 격주 주말 1박 2일, 방학 중 1주일"
                        value={formData.visitationPreference}
                        onChange={(e) => setFormData({...formData, visitationPreference: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm h-20 resize-none"
                      />
                    </div>
                  </>
                )}

                {type === 'fault_evidence' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">증거 설명 (텍스트)</label>
                      <textarea 
                        placeholder="카톡 대화 내용이나 상황을 설명해 주세요."
                        value={formData.evidence}
                        onChange={(e) => setFormData({...formData, evidence: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm h-32 resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">증거 파일 업로드</label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                          selectedFile ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-400 hover:bg-slate-50'
                        }`}
                      >
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        {selectedFile ? (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-600" />
                            <span className="text-xs font-medium truncate max-w-[150px]">{selectedFile.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">파일 선택 (이미지/PDF)</span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {type === 'mediation' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">재산분할 합의 내용</label>
                      <textarea 
                        placeholder="예: 아파트는 원고 소유로 하고, 원고가 피고에게 2억 원을 지급함"
                        value={formData.propertyAgreement}
                        onChange={(e) => setFormData({...formData, propertyAgreement: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-500 outline-none text-sm h-20 resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">양육권 및 양육비 합의</label>
                      <textarea 
                        placeholder="예: 양육권은 원고, 양육비는 자녀 1인당 월 100만 원"
                        value={formData.custodyAgreement}
                        onChange={(e) => setFormData({...formData, custodyAgreement: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-500 outline-none text-sm h-20 resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">기타 특약 사항</label>
                      <textarea 
                        placeholder="예: 향후 서로의 사생활에 간섭하지 않으며 부제소 합의함"
                        value={formData.specialTerms}
                        onChange={(e) => setFormData({...formData, specialTerms: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-500 outline-none text-sm h-20 resize-none"
                      />
                    </div>
                  </>
                )}

                {type === 'alimony' && (
                  <>
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500">유책 사유 유형</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'infidelity', label: '부정행위 (외도)', icon: Heart },
                          { id: 'violence', label: '부당한 대우 (폭행/폭언)', icon: ShieldAlert },
                          { id: 'desertion', label: '악의적 유기', icon: ArrowLeft },
                          { id: 'other', label: '기타 중대한 사유', icon: AlertCircle },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setFormData({ ...formData, faultType: item.id as any })}
                            className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                              formData.faultType === item.id 
                                ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' 
                                : 'border-slate-200 bg-white text-slate-600 hover:border-red-200'
                            }`}
                          >
                            <item.icon className={`w-3.5 h-3.5 ${formData.faultType === item.id ? 'text-red-500' : 'text-slate-400'}`} />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">
                        {formData.faultType === 'infidelity' ? '부정행위 기간' : '피해 기간 및 빈도'}
                      </label>
                      <input 
                        type="text" 
                        placeholder={formData.faultType === 'infidelity' ? "예: 1년" : "예: 지난 3년간 지속적"}
                        value={formData.infidelityDuration}
                        onChange={(e) => setFormData({...formData, infidelityDuration: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">구체적인 유책 내용</label>
                      <textarea 
                        placeholder="사건의 경위를 구체적으로 적어주세요."
                        value={formData.faultDetails}
                        onChange={(e) => setFormData({...formData, faultDetails: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm h-24 resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">정신적/신체적 피해 상황</label>
                      <textarea 
                        placeholder="이로 인해 겪고 있는 고통이나 피해를 적어주세요."
                        value={formData.impactDetails}
                        onChange={(e) => setFormData({...formData, impactDetails: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm h-20 resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">보유 증거</label>
                      <textarea 
                        placeholder="예: 블랙박스 영상, 진단서, 카톡 캡처 등"
                        value={formData.evidence}
                        onChange={(e) => setFormData({...formData, evidence: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm h-20 resize-none"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">추가 맥락 (선택)</label>
                  <textarea 
                    placeholder="기타 강조하고 싶은 사정을 자유롭게 적어주세요."
                    value={formData.customContext}
                    onChange={(e) => setFormData({...formData, customContext: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm h-20 resize-none"
                  />
                </div>
              </div>

              <AIAssistantBubble 
                isVisible={!result && !isLoading}
                message={
                  type === 'property' ? '재산 형성에 기여한 바를 구체적으로 입력해 주세요. 전업주부의 가사 노동도 법적으로 중요한 기여로 인정받습니다.' :
                  type === 'asset_split' ? '혼인 기간과 맞벌이 여부, 그리고 가사 분담 정도를 입력하시면 예상 분할 비율을 AI가 분석해 드립니다.' :
                  type === 'parenting' ? '자녀의 연령과 부모의 소득을 바탕으로 표준 양육비를 산출하고, 원만한 공동 양육을 위한 캘린더 초안을 제안합니다.' :
                  type === 'alimony' ? '상대방의 유책 사유와 그로 인한 정신적 고통을 소명할 수 있는 내용을 입력해 주세요.' :
                  type === 'fault_evidence' ? '수집하신 증거들이 법적으로 어떤 의미를 갖는지, 이혼 사유로 충분한지 AI가 분석해 드립니다.' : '서로 합의된 내용을 바탕으로 법적 효력을 갖출 수 있는 조정 합의서 초안을 작성합니다.'
                }
                tip="구체적인 날짜나 금액을 포함할수록 더 정확한 분석이 가능합니다."
              />

              <button
                onClick={() => setShowFinalReview(true)}
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-white disabled:opacity-50 ${
                  type === 'property' || type === 'asset_split' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' :
                  type === 'parenting' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' :
                  type === 'alimony' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' :
                  type === 'fault_evidence' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' : 'bg-slate-600 hover:bg-slate-700 shadow-slate-100'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    분석 및 생성하기
                  </>
                )}
              </button>
            </div>
          </div>

          {showFinalReview && (
            <FinalReviewModal 
              onConfirm={() => {
                setShowFinalReview(false);
                handleGenerate();
              }}
              onCancel={() => setShowFinalReview(false)}
            />
          )}

          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden flex flex-col h-full"
                >
                  <div className="p-6 border-b border-[#E2E8F0] bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      <h2 className="text-lg font-bold text-[#0F172A]">분석 결과</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveToHistory}
                        className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium ${
                          isSaved ? 'bg-green-50 text-green-600 border border-green-200' : 'hover:bg-slate-200 text-[#64748B]'
                        }`}
                      >
                        {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {isSaved ? '저장됨' : '보관함 저장'}
                      </button>
                      {onCalculateCost && (
                        <button
                          onClick={() => onCalculateCost({
                            type: '이혼 소송',
                            content: typeof result === 'string' ? result : (result.analysis || result.advice || ''),
                            others: '재산분할, 위자료, 양육비 등 포함'
                          })}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium border border-blue-100"
                        >
                          <Calculator className="w-4 h-4" /> 비용 계산
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          if (!result) return;
                          const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
                          const blob = new Blob([text], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `이혼소송분석_${new Date().toISOString().split('T')[0]}.txt`;
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
                      <button onClick={handleCopy} className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-[#64748B]" title="복사">
                        {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                    {type === 'asset_split' && result.ratio && (
                      <div className="space-y-6">
                        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 text-center">
                          <h3 className="text-sm font-bold text-indigo-600 mb-2">예상 재산분할 비율</h3>
                          <p className="text-3xl font-black text-indigo-900">{result.ratio}</p>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2"><Info className="w-4 h-4 text-indigo-600" /> 상세 분석</h4>
                            <p className="text-sm text-[#475569] leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{result.analysis}</p>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2"><Gavel className="w-4 h-4 text-indigo-600" /> 관련 판례 경향</h4>
                            <ul className="space-y-2">
                              {result.precedents?.map((p: string, i: number) => (
                                <li key={`precedent-${i}`} className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">{p}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        {result.references && result.references.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                            <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" /> 관련 법령 및 판례</h4>
                            <div className="grid gap-2">
                              {result.references.map((ref: any, idx: number) => (
                                <a 
                                  key={ref.url || `ref-asset-${idx}`} 
                                  href={ref.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 border border-blue-100 hover:bg-blue-100 transition-colors group"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-blue-700 truncate">{ref.title}</p>
                                    <p className="text-[10px] text-blue-600/70 truncate">{ref.description}</p>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {type === 'parenting' && result.standardFee && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                            <h3 className="text-xs font-bold text-emerald-600 mb-1">표준 양육비</h3>
                            <p className="text-lg font-black text-emerald-900">{result.standardFee}</p>
                          </div>
                          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                            <h3 className="text-xs font-bold text-emerald-600 mb-1">나의 분담액</h3>
                            <p className="text-lg font-black text-emerald-900">{result.myShare}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-600" /> 공동 양육 캘린더 초안</h4>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 prose prose-sm max-w-none">
                            <ReactMarkdown>{result.calendarDraft}</ReactMarkdown>
                          </div>
                        </div>
                        <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                          <p className="text-xs text-emerald-800 leading-relaxed">{result.advice}</p>
                        </div>
                        {result.references && result.references.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                            <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" /> 관련 법령 및 판례</h4>
                            <div className="grid gap-2">
                              {result.references.map((ref: any, idx: number) => (
                                <a 
                                  key={ref.url || `ref-parenting-${idx}`} 
                                  href={ref.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 border border-blue-100 hover:bg-blue-100 transition-colors group"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-blue-700 truncate">{ref.title}</p>
                                    <p className="text-[10px] text-blue-600/70 truncate">{ref.description}</p>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {(typeof result === 'string') && (
                      <div className="prose prose-slate max-w-none">
                        <ReactMarkdown>{result}</ReactMarkdown>
                      </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <div className="flex items-start gap-2 text-[10px] text-slate-400 leading-relaxed italic">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        <p>
                          본 문서는 AI 기술로 작성된 초안이며, 법적 효력 및 결과에 대한 책임은 제출자 본인에게 있습니다. 
                          제출 전 반드시 법률 전문가의 검토를 거치시기 바랍니다.
                        </p>
                      </div>
                    </div>

                    {/* Lawyer Matching Section */}
                    {analysisResult && (
                      <div className="mt-12 pt-12 border-t border-slate-100 space-y-6">
                        <div className="text-center space-y-2">
                          <h3 className="text-xl font-bold text-[#0F172A]">전문가 검토 추천</h3>
                          <p className="text-sm text-[#64748B]">작성된 초안을 바탕으로 가장 적합한 변호사를 추천해 드립니다.</p>
                        </div>
                        
                        <LawyerMatching 
                          primaryCategory={analysisResult.primary_category}
                          keywords={analysisResult.keywords}
                          userCaseSummary={formData.customContext || formData.faultDetails || '이혼 관련 법률 상담'}
                          onSelectLawyer={(lawyer) => {
                            setErrorMsg(`${lawyer.name} 변호사님께 검토 요청 페이지로 이동합니다.`);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="h-full min-h-[500px] border-2 border-dashed border-[#E2E8F0] rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-50/30">
                  <div className="bg-white p-4 rounded-full shadow-sm">
                    <FileTextIcon size={32} color="#CBD5E1" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-[#94A3B8]">분석 결과가 여기에 표시됩니다</h3>
                    <p className="text-sm text-[#94A3B8] max-w-[240px]">
                      정보를 입력하고 분석 버튼을 눌러주세요.
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

function FileTextIcon({ size, color }: { size: number, color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}
