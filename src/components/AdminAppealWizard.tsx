import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, FileText, Loader2, Copy, Check, AlertCircle, Sparkles, Save, Building2, Calendar, User, MessageSquare, Info, Camera, Upload, X, File as FileIcon, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateAdminAppeal, analyzeAdminNotice } from '../services/gemini';
import { useAuth } from '../lib/AuthContext';
import { saveToHistory } from '../services/historyService';
import StepIndicator from './StepIndicator';
import AIAssistantBubble from './AIAssistantBubble';

interface AdminNoticeAnalysis {
  noticeDate: string;
  deadlineDate: string;
  dispositionSummary: string;
  reductionAdvice: string;
}

export default function AdminAppealWizard({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    appellant: '',
    respondent: '',
    disposition: '',
    noticeDate: '',
    purpose: '',
    reason: ''
  });

  const [analysis, setAnalysis] = useState<AdminNoticeAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      try {
        const result = await analyzeAdminNotice({ data: base64, mimeType: file.type });
        if (result) {
          setAnalysis(result);
          setFormData(prev => ({
            ...prev,
            noticeDate: result.noticeDate,
            disposition: result.dispositionSummary
          }));
        }
      } catch (error) {
        console.error(error);
        setErrorMsg(error instanceof Error ? error.message : '문서 분석 중 오류가 발생했습니다.');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setErrorMsg("카메라에 접근할 수 없습니다.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        const base64 = dataUrl.split(',')[1];
        
        // Convert dataUrl to File object to reuse processFile
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            processFile(file);
            stopCamera();
          });
      }
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const appeal = await generateAdminAppeal(formData);
      setResult(appeal);
      setStep(3);
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : '청구서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (!result || !user) return;
    try {
      await saveToHistory(user.uid, 'admin_appeal', {
        title: '행정심판청구서 및 집행정지 신청서',
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

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
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
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 뒤로 가기
        </button>
        <div className="flex-1 max-w-xs">
          <StepIndicator 
            steps={[
              { id: 'analyze', label: '통지서 분석' },
              { id: 'input', label: '상세 입력' },
              { id: 'result', label: '서류 생성' }
            ]}
            currentStepIndex={step - 1}
            isComplete={step === 3}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#0F172A]">처분 통지서 분석</h2>
              <p className="text-[#64748B]">받으신 처분 통지서를 업로드해 주세요. 청구 기한과 내용을 자동으로 분석합니다.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-xl border-2 border-dashed border-[#E2E8F0] hover:border-[#2563EB] hover:bg-blue-50/30 transition-all group"
                  >
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-[#64748B] group-hover:text-[#2563EB] mx-auto mb-2" />
                      <span className="text-sm font-medium text-[#64748B] group-hover:text-[#2563EB]">파일 업로드</span>
                    </div>
                  </button>
                  <button 
                    onClick={startCamera}
                    className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-xl border-2 border-dashed border-[#E2E8F0] hover:border-[#2563EB] hover:bg-blue-50/30 transition-all group"
                  >
                    <div className="text-center">
                      <Camera className="w-6 h-6 text-[#64748B] group-hover:text-[#2563EB] mx-auto mb-2" />
                      <span className="text-sm font-medium text-[#64748B] group-hover:text-[#2563EB]">카메라 촬영</span>
                    </div>
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                </div>

                {isCameraActive && (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                      <button onClick={capturePhoto} className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
                        <div className="w-10 h-10 rounded-full border-2 border-black" />
                      </button>
                      <button onClick={stopCamera} className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                )}

                {isAnalyzing && (
                  <div className="p-8 text-center space-y-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin mx-auto" />
                    <p className="text-sm font-medium text-[#2563EB]">통지서를 정밀 분석하고 있습니다...</p>
                  </div>
                )}

                {analysis && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-[#0F172A]">분석 결과</h3>
                      <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black">
                        청구 기한: {analysis.deadlineDate}까지
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <Calendar className="w-4 h-4 text-[#64748B] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-[#94A3B8] uppercase">처분 통지일</p>
                          <p className="text-sm text-[#475569]">{analysis.noticeDate}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Info className="w-4 h-4 text-[#64748B] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-[#94A3B8] uppercase">처분 내용 요약</p>
                          <p className="text-sm text-[#475569]">{analysis.dispositionSummary}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-[#94A3B8] uppercase">감경 전략 제언</p>
                          <p className="text-sm text-[#475569]">{analysis.reductionAdvice}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-[#1E40AF] flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> 행정심판 청구 기한 안내
                  </h3>
                  <div className="space-y-3 text-sm text-[#1E40AF]/80 leading-relaxed">
                    <p>• 행정심판은 처분이 있음을 안 날로부터 <strong>90일 이내</strong>에 청구해야 합니다.</p>
                    <p>• 기한이 지나면 심판 청구 자체가 불가능해지므로 주의가 필요합니다.</p>
                    <p>• 영업정지 등 즉각적인 타격이 있는 경우 <strong>집행정지 신청</strong>을 함께 진행해야 합니다.</p>
                  </div>
                </div>

                <AIAssistantBubble 
                  isVisible={step === 1}
                  message="받으신 행정처분 통지서를 사진으로 찍거나 업로드해 주세요. AI가 청구 기한과 처분 내용을 분석하여 감경을 위한 전략적 조언을 제공합니다."
                  tip="글자가 잘 보이도록 밝은 곳에서 촬영해 주세요. PDF 파일도 지원합니다."
                />
              </div>
            </div>

            <button 
              onClick={() => setStep(2)}
              className="w-full bg-[#2563EB] text-white py-4 rounded-xl font-bold hover:bg-[#1D4ED8] transition-all"
            >
              상세 정보 입력하기
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#0F172A]">상세 정보 입력</h2>
              <p className="text-[#64748B]">청구서 작성을 위해 필요한 정보를 입력해 주세요.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#64748B] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> 청구인 정보 (성함/상호)
                  </label>
                  <input 
                    type="text" 
                    value={formData.appellant}
                    onChange={(e) => setFormData(prev => ({ ...prev, appellant: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB] outline-none text-sm"
                    placeholder="예: 홍길동 (또는 OO식당)"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#64748B] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> 피청구인 (처분 기관)
                  </label>
                  <input 
                    type="text" 
                    value={formData.respondent}
                    onChange={(e) => setFormData(prev => ({ ...prev, respondent: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB] outline-none text-sm"
                    placeholder="예: OO구청장"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#64748B] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> 처분이 있음을 안 날
                  </label>
                  <input 
                    type="date" 
                    value={formData.noticeDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, noticeDate: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB] outline-none text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#64748B] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> 처분 내용
                  </label>
                  <input 
                    type="text" 
                    value={formData.disposition}
                    onChange={(e) => setFormData(prev => ({ ...prev, disposition: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB] outline-none text-sm"
                    placeholder="예: 영업정지 2개월"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#64748B] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> 청구 취지
                  </label>
                  <input 
                    type="text" 
                    value={formData.purpose}
                    onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB] outline-none text-sm"
                    placeholder="예: OO구청장이 내린 영업정지 처분을 취소한다"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#64748B] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> 청구 원인 (억울한 사정)
              </label>
              <textarea 
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full h-32 p-4 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB] outline-none text-sm resize-none"
                placeholder="처분이 부당하다고 생각하는 이유를 자유롭게 적어주세요. (예: 고의가 없었음, 생계 곤란 등)"
              />
            </div>

            <AIAssistantBubble 
              isVisible={step === 2}
              message="청구 원인은 행정심판의 핵심입니다. 처분의 위법성뿐만 아니라, 처분으로 인해 겪게 될 가혹한 경제적 사정이나 고의가 없었음을 강조하는 것이 좋습니다."
              tip="생계형 운전자나 영세 사업자의 경우, 처분이 가족의 생계에 미치는 영향을 구체적으로 적어주세요."
            />

            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-xl font-bold border border-[#E2E8F0] hover:bg-slate-50 transition-all"
              >
                이전으로
              </button>
              <button 
                onClick={handleGenerate}
                disabled={isLoading}
                className="flex-[2] bg-[#2563EB] text-white py-4 rounded-xl font-bold hover:bg-[#1D4ED8] transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                청구서 및 집행정지 신청서 생성
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && result && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden flex flex-col h-[700px]"
          >
            <div className="p-6 border-b border-[#E2E8F0] bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-lg font-bold text-[#0F172A]">생성된 서류 초안</h2>
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
                <button 
                  onClick={() => {
                    if (!result) return;
                    const blob = new Blob([result], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `행정심판청구서_${new Date().toISOString().split('T')[0]}.txt`;
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
            <div className="p-6 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-[#2563EB] shrink-0" />
                <p className="text-xs text-[#1E40AF] leading-relaxed">
                  이 서류는 AI가 작성한 초안입니다. 제출 전 반드시 내용을 확인하고 수정하시기 바랍니다.
                </p>
              </div>
              <button 
                onClick={() => setStep(2)}
                className="text-sm font-bold text-[#2563EB] hover:underline"
              >
                내용 수정하기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
