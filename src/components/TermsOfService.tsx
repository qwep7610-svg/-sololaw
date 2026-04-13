import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Scale, ShieldAlert, AlertCircle, Info, ShieldCheck, Lock, Loader2 } from 'lucide-react';
import { db, doc, getDoc } from '../lib/firebase';

type Tab = 'terms' | 'privacy' | 'legal';

export default function TermsOfService({ onClose, initialTab = 'terms' }: { onClose: () => void, initialTab?: Tab }) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [termsContent, setTermsContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');
  const [legalContent, setLegalContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPolicies() {
      try {
        const termsDoc = await getDoc(doc(db, 'policies', 'terms'));
        if (termsDoc.exists()) {
          setTermsContent(termsDoc.data().content);
        } else {
          setTermsContent(`[솔로로(SoloLaw)] 서비스 이용약관

[제1장] 총칙

제1조 (목적)
본 약관은 나홀로소송 도우미 솔로로(SoloLaw)가 제공하는 '솔로로(SoloLaw)' 서비스(이하 '서비스')를 이용함에 있어 회사와 회원 간의 권리, 의무 및 책임 사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (용어의 정의)
솔로로(SoloLaw) 서비스: 회사가 운영하는 모바일 앱 또는 웹 인터페이스를 통해 제공되는 다음 각 목의 솔루션을 의미합니다.
가. AI 서류 작성 보조: 사용자가 입력한 데이터를 바탕으로 소장, 고소장 등 법률 문서의 초안을 자동 생성하는 서비스
나. 전문가 유료 검토 솔루션: 회원이 작성한 문서 초안을 변호사회원에게 전달하고 검토 의견을 받을 수 있도록 제공되는 기술적 환경
다. 법률 정보 및 계산기: 공판 절차 안내, 인지대/송달료 계산 등 객관적 정보 제공 서비스

회원: 본 약관에 동의하고 서비스를 이용하는 일반회원 및 변호사회원을 포함합니다.

솔루션 이용계약: 변호사회원이 회사가 제공하는 검토 시스템 및 광고 인벤토리를 사용하는 대가로 회사에 솔루션 사용료를 지급하는 계약을 의미합니다.

제3조 (서비스의 성격 및 한계)
본 서비스는 회원이 스스로 법적 대응을 할 수 있도록 돕는 'IT 기반 문서 작성 도구'입니다.
회사는 변호사법을 준수하며, 특정 사건에 대한 구체적인 법률 판단을 내리거나 승소 가능성을 보장하는 상담을 제공하지 않습니다.
모든 서비스 내 결과물은 회원의 입력값에 기초한 '초안'이며, 제출 전 최종 검토 및 법적 책임은 회원 본인에게 있습니다.

[제2장] 서비스 이용 및 제한

제4조 (회원가입 및 승인)
서비스 이용계약은 회원이 되려는 자가 약관에 동의하고 간편인증 등을 통해 가입을 신청함에 따라 성립합니다.
변호사회원은 가입 시 자격 번호를 입력해야 하며, 회사는 별도의 서류 확인 절차를 거쳐 전문가 권한을 승인합니다.

제5조 (변호사 광고 및 유료 검토)
서비스 내 노출되는 변호사 정보는 해당 변호사가 회사에 비용을 지불하고 게재한 '유료 광고'입니다.
'전문가 유료 검토' 서비스는 회원과 변호사 간의 개별적인 계약이며, 회사는 결제 시스템 및 데이터 전달 솔루션만을 제공합니다.
회사는 변호사와 회원 간의 수임 계약에 일절 관여하지 않으며, 사건 성사 여부에 따른 수수료(리베이트)를 수취하지 않습니다.

[제3장] 데이터 보안 및 AI 활용

제6조 (개인정보 및 사건 데이터 보호)
회사는 회원이 입력한 사건 경위 및 개인정보를 암호화하여 관리하며, 수사기관의 적법한 요청이 있는 경우를 제외하고 제3자에게 노출하지 않습니다.
회원은 본인이 작성한 데이터를 언제든지 삭제할 수 있으며, 탈퇴 시 모든 사건 데이터는 즉시 파기됩니다.

제7조 (AI 학습 및 가명처리)
회사는 서비스 고도화를 위해 회원의 게시물 및 답변 내용을 활용할 수 있습니다. 단, 이 경우 개인정보보호법에 따라 가명처리(비식별화)를 거쳐 특정 개인을 알아볼 수 없도록 조치한 통계적 데이터만을 활용합니다.

[제4장] 책임의 제한 (면책 조항)

제8조 (회사의 면책)
기술적 한계: 회사는 AI가 생성한 문구가 법적 완결성을 가짐을 보증하지 않습니다. 법령 개정 등으로 인해 최신 정보와 차이가 있을 수 있습니다.
사용자 책임: 회원이 AI 결과물을 수정 없이 제출하여 발생하는 법원 보정명령, 기각, 패소 등의 결과에 대해 회사는 책임을 지지 않습니다.
당사자 간 분쟁: 일반회원과 변호사회원 사이의 상담 또는 검토 과정에서 발생한 분쟁에 대해 회사는 개입할 의무가 없으며, 손해배상 책임이 없습니다.

[제5장] 기타

제9조 (분쟁의 해결)
회사와 회원 간에 발생한 분쟁은 대한민국 법령에 따르며, 관할 법원은 민사소송법이 정한 바에 따릅니다.`);
        }

        const privacyDoc = await getDoc(doc(db, 'policies', 'privacy'));
        if (privacyDoc.exists()) {
          setPrivacyContent(privacyDoc.data().content);
        } else {
          setPrivacyContent(`1. 수집하는 개인정보의 항목\n회사는 서비스 제공을 위해 필요한 최소한의 정보를 수집합니다...`);
        }

        const legalDoc = await getDoc(doc(db, 'policies', 'legal'));
        if (legalDoc.exists()) {
          setLegalContent(legalDoc.data().content);
        } else {
          setLegalContent(`[법적 고지]\n본 서비스에서 제공하는 모든 정보와 AI가 생성한 문서는 법적 참고용이며, 실제 변호사의 자문을 대신할 수 없습니다...`);
        }
      } catch (error) {
        console.error("Error loading policies:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadPolicies();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-brand-600" />
              <h2 className="text-xl font-bold text-[#0F172A] font-serif">법적 고지 및 정책</h2>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('terms')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'terms' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                이용약관
              </button>
              <button 
                onClick={() => setActiveTab('privacy')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'privacy' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                개인정보 처리방침
              </button>
              <button 
                onClick={() => setActiveTab('legal')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'legal' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                법적 고지
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              <p className="text-slate-500">정책 정보를 불러오는 중...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'terms' ? (
                <motion.div 
                  key="terms"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-8 whitespace-pre-wrap text-sm text-slate-600 leading-relaxed"
                >
                  {termsContent}
                </motion.div>
              ) : activeTab === 'privacy' ? (
                <motion.div 
                  key="privacy"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-8 whitespace-pre-wrap text-sm text-slate-600 leading-relaxed"
                >
                  {privacyContent}
                </motion.div>
              ) : (
                <motion.div 
                  key="legal"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-8 whitespace-pre-wrap text-sm text-slate-600 leading-relaxed"
                >
                  {legalContent}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={onClose}
            className="w-full py-4 rounded-3xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
          >
            확인했습니다
          </button>
        </div>
      </motion.div>
    </div>
  );
}
