import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, Loader2, FileText, Check, Mail, Phone, Clock } from 'lucide-react';
import { db, doc, setDoc, getDoc, serverTimestamp } from '../lib/firebase';

interface Policy {
  content: string;
  updatedAt: any;
}

export default function PolicyEditor() {
  const [terms, setTerms] = useState('');
  const [privacy, setPrivacy] = useState('');
  const [legal, setLegal] = useState('');
  const [customerCenter, setCustomerCenter] = useState({
    email: 'support@sololaw.com',
    phone: '1588-0000',
    hours: {
      weekdays: '09:00 - 18:00',
      lunch: '12:00 - 13:00',
      weekends: '휴무'
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    async function loadPolicies() {
      try {
        const termsDoc = await getDoc(doc(db, 'policies', 'terms'));
        if (termsDoc.exists()) {
          setTerms(termsDoc.data().content);
        } else {
          setTerms(`[솔로로(SoloLaw)] 서비스 이용약관

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
          setPrivacy(privacyDoc.data().content);
        } else {
          setPrivacy(`1. 수집하는 개인정보의 항목\n회사는 서비스 제공을 위해 필요한 최소한의 정보를 수집합니다...`);
        }

        const legalDoc = await getDoc(doc(db, 'policies', 'legal'));
        if (legalDoc.exists()) {
          setLegal(legalDoc.data().content);
        } else {
          setLegal(`[법적 고지]\n본 서비스에서 제공하는 모든 정보와 AI가 생성한 문서는 법적 참고용이며, 실제 변호사의 자문을 대신할 수 없습니다.\n\n1. 서비스 이용의 한계\n사용자는 본 서비스를 통해 얻은 정보를 바탕으로 결정을 내리기 전 반드시 전문가의 확인을 거쳐야 합니다.\n\n2. 책임의 소재\n서비스 이용 과정에서 발생하는 모든 결과에 대한 책임은 사용자 본인에게 있으며, 회사는 어떠한 법적 책임도 지지 않습니다.`);
        }

        const ccDoc = await getDoc(doc(db, 'config', 'customer_center'));
        if (ccDoc.exists()) {
          setCustomerCenter(ccDoc.data() as any);
        }
      } catch (error) {
        console.error("Error loading policies:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadPolicies();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await setDoc(doc(db, 'policies', 'terms'), {
        content: terms,
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'policies', 'privacy'), {
        content: privacy,
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'policies', 'legal'), {
        content: legal,
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'config', 'customer_center'), {
        ...customerCenter,
        updatedAt: serverTimestamp()
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error("Error saving policies:", error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-slate-500">정책 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-lg">법적 고지 및 정책 관리</h3>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveStatus === 'success' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaving ? '저장 중...' : saveStatus === 'success' ? '저장 완료' : '변경사항 저장'}
          </button>
        </div>

        {saveStatus === 'error' && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
            저장 중 오류가 발생했습니다. 권한을 확인해 주세요.
          </div>
        )}

        <div className="space-y-8">
          <div className="space-y-3">
            <label className="block text-sm font-bold text-[#0F172A]">이용약관</label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-y text-sm"
              placeholder="이용약관 내용을 입력하세요..."
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-[#0F172A]">개인정보 처리방침</label>
            <textarea
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-y text-sm"
              placeholder="개인정보 처리방침 내용을 입력하세요..."
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-[#0F172A]">법적 고지 (고객센터)</label>
            <textarea
              value={legal}
              onChange={(e) => setLegal(e.target.value)}
              className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-y text-sm"
              placeholder="법적 고지 내용을 입력하세요..."
            />
          </div>

          <div className="pt-8 border-t border-slate-100 space-y-6">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-brand-600" />
              <h4 className="font-bold text-lg">고객센터 정보 설정</h4>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-bold text-[#0F172A]">이메일 주소</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={customerCenter.email}
                    onChange={(e) => setCustomerCenter({ ...customerCenter, email: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-bold text-[#0F172A]">대표 전화번호</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={customerCenter.phone}
                    onChange={(e) => setCustomerCenter({ ...customerCenter, phone: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                <label className="text-sm font-bold text-[#0F172A]">운영 시간 설정</label>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 font-medium">평일 운영시간</label>
                  <input
                    type="text"
                    value={customerCenter.hours.weekdays}
                    onChange={(e) => setCustomerCenter({ ...customerCenter, hours: { ...customerCenter.hours, weekdays: e.target.value } })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 font-medium">점심 시간</label>
                  <input
                    type="text"
                    value={customerCenter.hours.lunch}
                    onChange={(e) => setCustomerCenter({ ...customerCenter, hours: { ...customerCenter.hours, lunch: e.target.value } })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 font-medium">주말 및 공휴일</label>
                  <input
                    type="text"
                    value={customerCenter.hours.weekends}
                    onChange={(e) => setCustomerCenter({ ...customerCenter, hours: { ...customerCenter.hours, weekends: e.target.value } })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
