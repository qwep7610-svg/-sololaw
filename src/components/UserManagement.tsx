import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User, Search, Mail, X, ExternalLink, Calendar, Shield, Activity, Clock, ChevronRight, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'user' | 'lawyer'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    // 가입일순으로 정렬하여 실시간 동기화
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, []);

  // 사용자 상세 정보 조회 시 히스토리 가져오기
  useEffect(() => {
    if (!selectedUser) {
      setUserHistory([]);
      return;
    }

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const historyRef = collection(db, 'users', selectedUser.id, 'history');
        const q = query(historyRef, orderBy('createdAt', 'desc'), limit(5));
        const snap = await getDocs(q);
        setUserHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Failed to fetch user history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [selectedUser]);

  // 필터링 로직
  const filteredUsers = users.filter(u => {
    const matchesRole = filter === 'all' || u.role === filter;
    const matchesSearch = 
      (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100 shadow-sm">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <h3 className="text-lg md:text-xl font-bold text-slate-800">회원 관리 센터</h3>
        
        {/* 필터 탭 */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto scrollbar-hide">
          {(['all', 'user', 'lawyer'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                filter === t ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              {t === 'all' ? '전체' : t === 'user' ? '개인' : '변호사'}
            </button>
          ))}
        </div>
      </div>

      {/* 검색 바 */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text"
          placeholder="이름 또는 이메일 검색..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 목록 테이블 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase">
              <th className="px-4 py-3 whitespace-nowrap">사용자 정보</th>
              <th className="px-4 py-3 whitespace-nowrap">역할</th>
              <th className="px-4 py-3 whitespace-nowrap">가입일</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-700 truncate">{u.displayName || '이름 없음'}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" /> {u.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    u.role === 'lawyer' 
                    ? 'bg-purple-50 text-purple-600' 
                    : 'bg-blue-50 text-blue-600'
                  }`}>
                    {u.role === 'lawyer' ? '변호사' : '일반 개인'}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-slate-500 whitespace-nowrap">
                  {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-4 py-4 text-right whitespace-nowrap">
                  <button 
                    onClick={() => setSelectedUser(u)}
                    className="text-xs font-bold text-slate-400 hover:text-brand-600 underline transition-colors"
                  >
                    상세보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-4">
        {filteredUsers.map((u) => (
          <div key={u.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate">{u.displayName || '이름 없음'}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" /> {u.email}
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                u.role === 'lawyer' 
                ? 'bg-purple-100 text-purple-600' 
                : 'bg-blue-100 text-blue-600'
              }`}>
                {u.role === 'lawyer' ? '변호사' : '개인'}
              </span>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="text-[10px] text-slate-400">
                가입일: {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'N/A'}
              </div>
              <button 
                onClick={() => setSelectedUser(u)}
                className="text-[10px] font-bold text-brand-600 underline"
              >
                상세보기
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="py-12 text-center text-slate-400 text-sm">
          검색 결과가 없습니다.
        </div>
      )}

      {/* 상세 보기 모달 */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* 모달 헤더 */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{selectedUser.displayName || '이름 없음'}</h4>
                    <p className="text-xs text-slate-400">{selectedUser.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* 모달 컨텐츠 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                {/* 기본 정보 */}
                <section>
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" /> 계정 기본 정보
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-xs text-slate-400 mb-1">사용자 식별 코드 (UID)</div>
                      <div className="text-sm font-mono text-slate-600 break-all select-all">{selectedUser.id}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-xs text-slate-400 mb-1">가입 일시</div>
                      <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-500" />
                        {selectedUser.createdAt?.toDate ? selectedUser.createdAt.toDate().toLocaleString() : '정보 없음'}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-xs text-slate-400 mb-1">권한 및 역할</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          selectedUser.role === 'lawyer' 
                          ? 'bg-purple-100 text-purple-600' 
                          : 'bg-blue-100 text-blue-600'
                        }`}>
                          {selectedUser.role === 'lawyer' ? '변호사' : '일반 사용자'}
                        </span>
                        {selectedUser.isExpert && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-600 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> 전문가
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-xs text-slate-400 mb-1">로그인 제공업체</div>
                      <div className="text-sm font-semibold text-slate-700 mt-1 capitalize">
                        {selectedUser.providerId?.replace('.com', '') || 'Google'}
                      </div>
                    </div>
                  </div>
                </section>

                {/* 최근 활동 내역 */}
                <section>
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" /> 최근 서비스 이용 내역
                  </h5>
                  <div className="space-y-3">
                    {loadingHistory ? (
                      <div className="py-8 flex flex-col items-center justify-center text-slate-300 gap-2">
                        <Clock className="w-8 h-8 animate-pulse" />
                        <span className="text-xs">활동 내역 불러오는 중...</span>
                      </div>
                    ) : userHistory.length > 0 ? (
                      userHistory.map((h) => (
                        <div key={h.id} className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 group">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            h.type === 'consultation' ? 'bg-purple-50 text-purple-600' :
                            h.type === 'document' ? 'bg-blue-50 text-blue-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h6 className="font-bold text-slate-700 truncate">{h.title}</h6>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                {h.createdAt?.toDate ? h.createdAt.toDate().toLocaleDateString() : ''}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1">{h.content.replace(/<[^>]*>/g, '')}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 self-center group-hover:text-brand-500 transition-colors" />
                        </div>
                      ))
                    ) : (
                      <div className="py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Activity className="w-8 h-8 opacity-20" />
                        <p className="text-xs">아직 기록된 활동 내역이 없습니다.</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* 계정 관리 액션 */}
                <section className="pt-4">
                  <div className="p-6 bg-slate-900 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <h6 className="font-bold mb-1">상세 프로필 페이지</h6>
                      <p className="text-xs text-slate-400">해당 사용자의 공개 프로필 또는 전문 정보를 확인합니다.</p>
                    </div>
                    <button className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-2xl font-bold text-sm hover:bg-brand-50 transition-colors">
                      프로필 바로가기 <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
