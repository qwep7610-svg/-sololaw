import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, FileText, Loader2, Copy, Check, AlertCircle, Camera, Upload, X, File, ListOrdered, Save, Trash2, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeExhibits } from '../services/gemini';
import { useAuth } from '../lib/AuthContext';
import { saveToHistory } from '../services/historyService';

interface SelectedFile {
  id: string;
  name: string;
  data: string;
  mimeType: string;
  preview?: string;
}

export default function AutoExhibit({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    for (const file of selectedFiles) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        const preview = file.type.startsWith('image/') ? event.target?.result as string : undefined;
        setFiles(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          data: base64,
          mimeType: file.type,
          preview
        }]);
      };
      reader.readAsDataURL(file);
    }
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
        setFiles(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          name: `exhibit_${new Date().getTime()}.jpg`,
          data: base64,
          mimeType: 'image/jpeg',
          preview: dataUrl
        }]);
        stopCamera();
      }
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;

    setIsLoading(true);
    setResult(null);
    try {
      const analysis = await analyzeExhibits(files.map(f => ({
        data: f.data,
        mimeType: f.mimeType,
        name: f.name
      })));
      setResult(analysis || '분석에 실패했습니다.');
    } catch (error) {
      console.error(error);
      setResult(error instanceof Error ? error.message : '오류가 발생했습니다. 다시 시도해 주세요.');
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
      await saveToHistory(user.uid, 'exhibit', {
        title: '입증자료 자동 정리 결과',
        content: result,
        data: { fileCount: files.length }
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save to history:", error);
      setErrorMsg("저장 중 오류가 발생했습니다.");
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
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-50 p-2 rounded-lg">
                  <ListOrdered className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-[#0F172A]">입증자료 업로드</h2>
              </div>
            </div>

            <p className="text-sm text-[#64748B] leading-relaxed">
              사진, 영수증, 계약서 등을 업로드하세요. AI가 사건 흐름에 맞게 번호를 부여하고 증거설명서 초안을 작성합니다.
            </p>
            
            <div className="flex gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                <Upload className="w-4 h-4" /> 파일 추가
              </button>
              <button 
                onClick={startCamera}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                <Camera className="w-4 h-4" /> 카메라 촬영
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="application/pdf,image/*" 
                multiple
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

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {files.map((file) => (
                <div key={file.id} className="relative p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    {file.preview ? (
                      <img src={file.preview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <File className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{file.mimeType.split('/')[1]}</p>
                  </div>
                  <button 
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {files.length === 0 && (
                <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400">선택된 파일이 없습니다.</p>
                </div>
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={files.length === 0 || isLoading}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-100"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  증거 분석 중...
                </>
              ) : (
                <>
                  <ListOrdered className="w-5 h-5" />
                  증거 자동 정리하기
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
                  <FileText className="w-8 h-8 text-[#CBD5E1]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[#94A3B8]">정리 결과가 여기에 표시됩니다</h3>
                  <p className="text-sm text-[#94A3B8] max-w-[240px]">
                    입증 자료를 업로드하고 정리 버튼을 눌러주세요.
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
                  <div className="w-16 h-16 border-4 border-[#E2E8F0] border-t-emerald-600 rounded-full animate-spin" />
                  <ListOrdered className="w-6 h-6 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#0F172A]">증거를 정리하고 있습니다</h3>
                  <p className="text-[#64748B]">사건의 흐름을 분석하여 번호를 부여하는 중입니다.</p>
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
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-lg font-bold text-[#0F172A]">증거 정리 결과</h2>
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
                        const blob = new Blob([result], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `증거설명서_${new Date().toISOString().split('T')[0]}.txt`;
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
                <div className="p-8 flex-1 overflow-y-auto prose prose-slate max-w-none prose-headings:text-[#0F172A] prose-headings:font-bold prose-p:text-[#475569] prose-p:leading-relaxed prose-table:text-sm">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
                <div className="p-6 bg-emerald-50 border-t border-emerald-100">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      이 증거설명서는 AI가 분석한 초안입니다. 실제 제출 전 반드시 내용을 확인하고 수정하시기 바랍니다.
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
