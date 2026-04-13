import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Mail, Phone, MessageSquare, Clock, ShieldAlert, Loader2, Scale } from 'lucide-react';
import { db, doc, getDoc } from '../lib/firebase';

export default function CustomerCenter({ onBack }: { onBack: () => void }) {
  const [legalNotice, setLegalNotice] = useState('');
  const [config, setConfig] = useState({
    email: 'support@sololaw.com',
    phone: '1588-0000',
    hours: {
      weekdays: '09:00 - 18:00',
      lunch: '12:00 - 13:00',
      weekends: '휴무'
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const legalSnap = await getDoc(doc(db, 'policies', 'legal'));
        if (legalSnap.exists()) {
          setLegalNotice(legalSnap.data().content);
        }

        const configSnap = await getDoc(doc(db, 'config', 'customer_center'));
        if (configSnap.exists()) {
          setConfig(configSnap.data() as any);
        }
      } catch (error) {
        console.error("Error loading customer center data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between px-2">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-600 transition-all group"
        >
          <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm group-hover:border-brand-200 group-hover:bg-brand-50 transition-all">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          </div>
          뒤로 가기
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">Help Center</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl" />
              <div className="relative flex items-center gap-4">
                <div className="p-3 bg-brand-600 rounded-2xl shadow-lg shadow-brand-100">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Support</span>
                    <div className="h-px w-8 bg-brand-200" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A] font-serif tracking-tight">고객센터</h2>
                  <p className="text-sm text-[#64748B] mt-1">서비스 이용 중 궁금한 점이나 불편한 사항을 알려주세요.</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <Mail className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F172A]">이메일 문의</h4>
                    <p className="text-sm text-[#64748B]">{config.email}</p>
                  </div>
                </div>
                <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <Phone className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F172A]">전화 문의</h4>
                    <p className="text-sm text-[#64748B]">{config.phone}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-600" />
                  <h3 className="font-bold text-[#0F172A]">운영 시간</h3>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <ul className="space-y-2 text-sm text-[#64748B]">
                    <li className="flex justify-between">
                      <span>평일 (월~금)</span>
                      <span className="font-bold text-[#0F172A]">{config.hours.weekdays}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>점심 시간</span>
                      <span className="font-bold text-[#0F172A]">{config.hours.lunch}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>주말 및 공휴일</span>
                      <span className="text-slate-400">{config.hours.weekends}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-brand-600" />
              <h3 className="text-lg font-bold text-[#0F172A]">법적 고지</h3>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              </div>
            ) : (
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="whitespace-pre-wrap text-sm text-slate-600 leading-relaxed">
                  {legalNotice}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-brand-600 rounded-3xl p-8 text-white space-y-4 shadow-xl shadow-brand-100">
            <Scale className="w-10 h-10 opacity-50" />
            <h3 className="text-xl font-bold font-serif leading-tight">
              전문 변호사의<br />도움이 필요하신가요?
            </h3>
            <p className="text-brand-100 text-sm leading-relaxed">
              AI가 작성한 서류를 바탕으로 전문 변호사에게 직접 상담을 받아보실 수 있습니다.
            </p>
            <button className="w-full py-3 bg-white text-brand-600 rounded-xl font-bold hover:bg-brand-50 transition-colors shadow-lg">
              변호사 추천 받기
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
            <h4 className="font-bold text-[#0F172A]">자주 묻는 질문</h4>
            <div className="space-y-3">
              {[
                "AI 소장 작성은 법적 효력이 있나요?",
                "비용은 어떻게 결제하나요?",
                "개인정보는 안전하게 보호되나요?"
              ].map((q, i) => (
                <button key={i} className="w-full text-left p-3 rounded-xl hover:bg-slate-50 text-xs text-slate-600 transition-colors flex items-center justify-between group">
                  {q}
                  <ArrowLeft className="w-3 h-3 rotate-180 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
