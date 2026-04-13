import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Search, Mail } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'user' | 'lawyer'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
      console.error("Error fetching users:", error);
    });

    return () => unsubscribe();
  }, []);

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
                  <button className="text-xs font-bold text-slate-400 hover:text-brand-600 underline">상세보기</button>
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
              <button className="text-[10px] font-bold text-brand-600 underline">상세보기</button>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="py-12 text-center text-slate-400 text-sm">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
}
