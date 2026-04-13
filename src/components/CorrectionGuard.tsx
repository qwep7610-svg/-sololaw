import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ShieldAlert, Loader2, Copy, Check, AlertCircle, Sparkles, Camera, Upload, X, File, Gavel, Save, Download, Lock, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeCorrectionOrder } from '../services/gemini';
import { useAuth } from '../lib/AuthContext';
import { saveToHistory } from '../services/historyService';

interface SelectedFile {
  name: string;
  data: string;
  mimeType: string;
  preview?: string;
}

export default function CorrectionGuard({ onBack, onConsultLawyer }: { onBack: () => void; onConsultLawyer: () => void }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      const preview = file.type.startsWith('image/') ? event.target?.result as string : undefined;
      setSelectedFile({
        name: file.name,
        data: base64,
        mimeType: file.type,
        preview
      });
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
      alert("카메라에 접근할 수 없습니다. 권한을 확인해 주세요.");
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
        setSelectedFile({
          name: `correction_order_${new Date().getTime()}.jpg`,
          data: base64,
          mimeType: 'image/jpeg',
          preview: dataUrl
        });
        stopCamera();
      }
    }
  };

  const handleAnalyze = async () => {
    if (!text.trim() && !selectedFile) return;

    setIsLoading(true);
    setResult(null);
    try {
      const analysis = await analyzeCorrectionOrder({
        text: text.trim() || undefined,
        file: selectedFile ? { data: selectedFile.data, mimeType: selectedFile.mimeType } : undefined
      });
      setResult(analysis || '분석에 실패했습니다.');
    } catch (error) {
      console.error(error);
      setResult(error instanceof Error ? error.message : '오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const examples = [
    {
      title: "주소 보정",
      text: "피고의 주소가 불명확하여 송달되지 않았으니, 7일 이내에 피고의 정확한 주소를 보정하시기 바랍니다.",
      icon: "🏠"
    },
    {
      title: "인지대 미납",
      text: "소장에 첩부할 인지액이 부족하오니, 이 명령을 받은 날로부터 5일 이내에 부족한 인지액 15,000원을 납부하시기 바랍니다.",
      icon: "💰"
    },
    {
      title: "증거 보완",
      text: "원고가 주장하는 대여 사실을 입증할 수 있는 객관적인 증거(차용증 등)가 부족하오니 이를 보완하여 제출하시기 바랍니다.",
      icon: "📄"
    }
  ];

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
      await saveToHistory(user.uid, 'correction', {
        title: '보정명령 분석 결과',
        content: result,
        data: { text, fileName: selectedFile?.name }
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
          className="flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors group"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 뒤로 가기
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4 p-3 bg-slate-900 rounded-xl shadow-lg border border-slate-800 mb-6"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-500" /> 본 내용은 암호화되어 보호 중입니다
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 rounded-md border border-slate-700">
          <ShieldCheck className="w-3 h-3 text-brand-400" />
          <span className="text-[9px] font-bold text-slate-400">AES-256</span>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-brand-50 p-2 rounded-lg">
                  <ShieldAlert className="w-5 h-5 text-brand-600" />
                </div>
                <h2 className="text-lg font-bold text-[#0F172A] font-serif">보정명령서 입력</h2>
              </div>
            </div>

            <p className="text-sm text-[#64748B] leading-relaxed">
              법원에서 온 보정명령서를 촬영하거나 업로드해 주세요. AI가 즉시 분석하여 대응 방안을 알려드립니다.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-xs md:text-sm font-medium transition-colors"
              >
                <Upload className="w-4 h-4" /> 파일 업로드
              </button>
              <button 
                onClick={startCamera}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-xs md:text-sm font-medium transition-colors"
              >
                <Camera className="w-4 h-4" /> 카메라 촬영
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="application/pdf,image/*" 
                className="hidden" 
              />
            </div>

            {isCameraActive && (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <button 
                    onClick={capturePhoto}
                    className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg"
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-black" />
                  </button>
                  <button 
                    onClick={stopCamera}
                    className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            {selectedFile && (
              <div className="relative p-4 rounded-xl border border-red-100 bg-red-50/50 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white border border-red-100 flex items-center justify-center overflow-hidden shrink-0">
                  {selectedFile.preview ? (
                    <img src={selectedFile.preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <File className="w-6 h-6 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-900 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-red-600 uppercase">{selectedFile.mimeType.split('/')[1]}</p>
                </div>
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="p-1 hover:bg-red-100 rounded-lg text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#64748B]">
                  또는 명령서 내용을 직접 입력해 주세요.
                </p>
                <button 
                  onClick={() => setShowExamples(!showExamples)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  {showExamples ? '예시 숨기기' : '예시 보기'}
                </button>
              </div>

              <AnimatePresence>
                {showExamples && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-2 overflow-hidden"
                  >
                    {examples.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setText(ex.text);
                          setShowExamples(false);
                        }}
                        className="p-3 text-left bg-slate-50 hover:bg-brand-50 border border-slate-100 hover:border-brand-200 rounded-xl transition-all group"
                      >
                        <div className="text-lg mb-1">{ex.icon}</div>
                        <div className="text-[10px] font-bold text-slate-800 group-hover:text-brand-700">{ex.title}</div>
                        <div className="text-[9px] text-slate-400 line-clamp-1">{ex.text}</div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="보정명령 내용을 입력하세요..."
                className="w-full h-[150px] p-4 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none text-sm leading-relaxed"
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={(!text.trim() && !selectedFile) || isLoading}
              className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-100 font-sans"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Gavel className="w-5 h-5" />
                  대응 방안 분석하기
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
                  <ShieldAlert className="w-8 h-8 text-[#CBD5E1]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[#94A3B8]">분석 결과가 여기에 표시됩니다</h3>
                  <p className="text-sm text-[#94A3B8] max-w-[240px]">
                    보정명령서를 업로드하고 분석 버튼을 눌러주세요.
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
                  <div className="w-16 h-16 border-4 border-[#E2E8F0] border-t-red-600 rounded-full animate-spin" />
                  <ShieldAlert className="w-6 h-6 text-red-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#0F172A]">명령서를 분석하고 있습니다</h3>
                  <p className="text-[#64748B]">법원의 지적 사항을 파악하여 해결책을 찾는 중입니다.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden flex flex-col h-full"
              >
                <div className="p-4 md:p-6 border-b border-[#E2E8F0] bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                    <h2 className="text-lg font-bold text-[#0F172A]">대응 가이드</h2>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                    <button
                      onClick={handleSaveToHistory}
                      className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-[10px] md:text-xs font-medium whitespace-nowrap ${
                        isSaved 
                          ? 'bg-green-50 text-green-600 border border-green-200' 
                          : 'hover:bg-slate-200 text-[#64748B] border border-transparent'
                      }`}
                      title="보관함 저장"
                    >
                      {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      {isSaved ? '저장됨' : '보관함 저장'}
                    </button>
                    <button 
                      onClick={() => {
                        if (!result) return;
                        const blob = new Blob([result], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `보정명령대응_${new Date().toISOString().split('T')[0]}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-[#64748B] flex items-center gap-1.5 text-[10px] md:text-xs font-medium whitespace-nowrap"
                      title="다운로드"
                    >
                      <Download className="w-4 h-4" /> 다운로드
                    </button>
                    <button
                      onClick={handleCopy}
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-[#64748B] flex items-center gap-1.5 text-[10px] md:text-xs font-medium whitespace-nowrap"
                      title="결과 복사"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      복사
                    </button>
                  </div>
                </div>
                <div className="p-4 md:p-8 flex-1 overflow-y-auto prose prose-slate max-w-none prose-headings:text-[#0F172A] prose-headings:font-bold prose-p:text-[#475569] prose-p:leading-relaxed break-words">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
                <div className="p-6 bg-brand-50 border-t border-brand-100 space-y-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-brand-600 shrink-0" />
                    <p className="text-xs text-brand-700 leading-relaxed">
                      이 분석 결과는 참고용이며, 법적 효력을 갖지 않습니다. 
                      보정 기한 내에 정확한 서류를 제출하지 않으면 소송이 각하될 수 있으니 주의하세요.
                    </p>
                  </div>
                  <button 
                    onClick={onConsultLawyer}
                    className="w-full py-4 bg-white border border-brand-200 text-brand-600 rounded-xl font-bold text-sm hover:bg-brand-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    이 결과로 변호사에게 상담 받기 <ArrowLeft className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
