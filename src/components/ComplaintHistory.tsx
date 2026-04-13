import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Trash2, Calendar, FileText, ChevronRight, Search, Inbox, AlertCircle, X, Calculator, Download, Edit3, Save, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../lib/AuthContext';
import { subscribeToHistory, deleteFromHistory, updateHistory, SavedComplaint } from '../services/historyService';

export default function ComplaintHistory({ onBack, onCalculateCost }: { onBack: () => void, onCalculateCost: (data: any) => void }) {
  const { user } = useAuth();
  const [history, setHistory] = useState<SavedComplaint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDetailViewMobile, setIsDetailViewMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToHistory(user.uid, (data) => {
      setHistory(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSelect = (id: string) => {
    if (isEditing) {
      if (!confirm("수정 중인 내용이 있습니다. 취소하고 다른 문서를 선택하시겠습니까?")) {
        return;
      }
      setIsEditing(false);
    }
    setSelectedId(id);
    setIsDetailViewMobile(true);
  };

  const startEditing = () => {
    const selected = history.find(item => item.id === selectedId);
    if (selected) {
      setEditTitle(selected.title);
      setEditContent(selected.content);
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user || !selectedId) return;
    setIsSaving(true);
    try {
      await updateHistory(user.uid, selectedId, {
        title: editTitle,
        content: editContent
      });
      setIsEditing(false);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Failed to save changes:", error);
      setErrorMsg("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId || !user) return;
    try {
      await deleteFromHistory(user.uid, deleteId);
      if (selectedId === deleteId) setSelectedId(null);
      setDeleteId(null);
    } catch (error) {
      console.error("Failed to delete history:", error);
      setErrorMsg("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteId(id);
  };

  const handleCalculateCost = () => {
    const selected = history.find(item => item.id === selectedId);
    if (selected && selected.data) {
      onCalculateCost(selected.data);
    }
  };

  const filteredHistory = history.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedComplaint = history.find(item => item.id === selectedId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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
            if (isDetailViewMobile) {
              setIsDetailViewMobile(false);
            } else {
              onBack();
            }
          }}
          className="flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> {isDetailViewMobile ? '목록으로' : '뒤로 가기'}
        </button>
        <h2 className="text-xl font-bold text-[#0F172A] font-serif">내 보관함</h2>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 relative">
        {/* List Section */}
        <div className={`lg:col-span-1 space-y-4 ${isDetailViewMobile ? 'hidden lg:block' : 'block'}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input 
              type="text"
              placeholder="제목 또는 내용 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none text-sm font-sans"
            />
          </div>

          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden divide-y divide-[#E2E8F0]">
            {isLoading ? (
              <div className="p-12 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-sm text-[#94A3B8]">불러오는 중...</p>
              </div>
            ) : filteredHistory.length > 0 ? (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full p-4 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer ${
                    selectedId === item.id ? 'bg-brand-50' : ''
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <h3 className={`font-bold text-sm truncate font-serif ${selectedId === item.id ? 'text-brand-600' : 'text-[#1E293B]'}`}>
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleDeleteClick(item.id, e)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500 opacity-0 lg:opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className={`w-4 h-4 ${selectedId === item.id ? 'text-[#2563EB]' : 'text-[#CBD5E1]'}`} />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center space-y-3">
                <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                  <Inbox className="w-6 h-6 text-[#CBD5E1]" />
                </div>
                <p className="text-sm text-[#94A3B8]">저장된 내역이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail Section */}
        <div className={`lg:col-span-2 ${isDetailViewMobile ? 'block' : 'hidden lg:block'}`}>
          <AnimatePresence mode="wait">
            {selectedComplaint ? (
              <motion.div
                key={selectedComplaint.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]"
              >
                <div className="p-4 md:p-6 border-b border-[#E2E8F0] bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    {isEditing ? (
                      <input 
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none font-bold text-lg font-serif"
                        placeholder="제목을 입력하세요"
                      />
                    ) : (
                      <>
                        <h2 className="text-lg font-bold text-[#0F172A] font-serif">{selectedComplaint.title}</h2>
                        <p className="text-xs text-[#64748B] font-sans">{selectedComplaint.date} 작성됨</p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={handleSave}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                          {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          저장
                        </button>
                        <button 
                          onClick={cancelEditing}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-[#64748B] hover:bg-slate-100 transition-colors whitespace-nowrap"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        {showSaveSuccess && (
                          <motion.div 
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-1 text-emerald-600 text-xs font-bold mr-2"
                          >
                            <Check className="w-3.5 h-3.5" /> 저장됨
                          </motion.div>
                        )}
                        <button 
                          onClick={startEditing}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold text-brand-600 hover:bg-brand-50 transition-colors whitespace-nowrap"
                        >
                          <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4" /> 수정
                        </button>
                        {selectedComplaint.title.includes('소장') && (
                          <button 
                            onClick={handleCalculateCost}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors whitespace-nowrap"
                          >
                            <Calculator className="w-3.5 h-3.5 md:w-4 md:h-4" /> 비용 계산
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            const blob = new Blob([selectedComplaint.content], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${selectedComplaint.title}_${selectedComplaint.date.split(' ')[0]}.txt`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold text-[#64748B] hover:bg-slate-100 transition-colors whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5 md:w-4 md:h-4" /> 다운로드
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(selectedComplaint.id)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> 삭제
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 md:p-8 flex-1 overflow-y-auto prose prose-slate max-w-none break-words">
                  {isEditing ? (
                    <textarea 
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-full min-h-[400px] p-4 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none font-sans text-sm leading-relaxed resize-none"
                      placeholder="내용을 입력하세요 (마크다운 지원)"
                    />
                  ) : (
                    <ReactMarkdown>{selectedComplaint.content}</ReactMarkdown>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[600px] border-2 border-dashed border-[#E2E8F0] rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-50/30">
                <div className="bg-white p-4 rounded-full shadow-sm">
                  <FileText className="w-8 h-8 text-[#CBD5E1]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[#94A3B8]">상세 내용을 확인하세요</h3>
                  <p className="text-sm text-[#94A3B8] max-w-[240px]">
                    왼쪽 목록에서 저장된 소장을 선택하면 상세 내용을 볼 수 있습니다.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-red-600">
                  <div className="bg-red-50 p-2 rounded-lg">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">내역 삭제</h3>
                </div>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  이 소장 내역을 삭제하시겠습니까? 삭제된 내역은 복구할 수 없습니다.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setDeleteId(null)}
                    className="flex-1 py-3 rounded-xl font-bold border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 transition-all"
                  >
                    취소
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-100"
                  >
                    삭제하기
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
