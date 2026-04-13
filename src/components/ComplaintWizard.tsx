import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, Loader2, Download, Copy, Check, RefreshCw, Edit2, Sparkles, Save, History, Trash2, Info, HelpCircle, AlertTriangle, ChevronRight, Gavel, X, AlertCircle, Lock, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateComplaint, analyzeUserCase, extractComplaintInfo } from '../services/gemini';
import { useAuth } from '../lib/AuthContext';
import { saveToHistory } from '../services/historyService';
import StepIndicator from './StepIndicator';
import AIAssistantBubble from './AIAssistantBubble';
import LawyerMatching from './LawyerMatching';

const DRAFT_KEY = 'SOLO_LAW_WIZARD_DRAFT';

interface Step {
  id: string;
  question: string;
  field: keyof typeof initialData;
  placeholder: string;
  description: string;
}

const initialData = {
  type: '' as LitigationType | '',
  relationship: '',
  summary: '',
  amount: '',
  evidence: '',
};

type LitigationType = 'loan' | 'damages' | 'lease' | 'family' | 'administrative' | 'criminal' | 'application' | 'other';

const LITIGATION_CONFIGS: Record<LitigationType, {
  title: string;
  steps: Step[];
  faqs: { q: string; a: string }[];
  precautions: string[];
}> = {
  loan: {
    title: '대여금 반환',
    steps: [
      { id: 'relationship', question: '돈을 빌려준 사람과 빌린 사람은 어떤 관계인가요?', field: 'relationship', placeholder: '예: 친구, 직장 동료, 지인 등', description: '원고와 피고의 관계를 명확히 해주세요. 관계에 따라 입증 책임의 정도가 달라질 수 있습니다.' },
      { id: 'summary', question: '언제, 얼마를, 어떤 조건으로 빌려주었나요?', field: 'summary', placeholder: '예: 2023년 5월 10일에 현금으로 500만원을 빌려주었고, 이자는 월 1%, 변제기는 2023년 12월 31일로 정했습니다.', description: '대여일, 금액, 이자 약정, 변제기(갚기로 한 날)를 포함해 주세요. 특히 변제기가 지났음을 증명하는 것이 중요합니다.' },
      { id: 'amount', question: '현재 청구하려는 원금과 이자는 얼마인가요?', field: 'amount', placeholder: '예: 원금 500만원 및 이에 대한 연 5%의 지연손해금', description: '청구 금액을 정확히 기재해 주세요. 소송 촉진 등에 관한 특례법에 따른 법정 이율(연 12%) 적용 여부도 검토 대상입니다.' },
      { id: 'evidence', question: '대여 사실을 증명할 수 있는 자료는 무엇인가요?', field: 'evidence', placeholder: '예: 차용증, 계좌이체 내역서, 돈을 갚겠다는 카톡 메시지', description: '입증 가능한 자료 목록을 적어주세요. 차용증이 없다면 이체 내역과 독촉 메시지가 핵심 증거가 됩니다.' },
    ],
    faqs: [
      { q: '차용증이 없어도 소송이 가능한가요?', a: '네, 계좌이체 내역이나 문자 메시지, 통화 녹음 등으로 대여 사실을 입증할 수 있다면 가능합니다.' },
      { q: '이자를 정하지 않았는데 청구할 수 있나요?', a: '약정한 이자가 없더라도 변제기 이후에는 법정이율(민사 연 5%)에 따른 지연손해금을 청구할 수 있습니다.' },
      { q: '상대방 주소를 모르면 어떻게 하나요?', a: '성명과 전화번호, 또는 계좌번호를 안다면 법원을 통해 사실조회 신청을 하여 주소를 파악할 수 있습니다.' }
    ],
    precautions: [
      '소멸시효(일반 민사채권 10년, 상사채권 5년)가 지나지 않았는지 확인하세요.',
      '상대방의 인적사항(주소, 주민등록번호 등)을 알고 있는지 확인하세요.',
      '가압류 등 보전처분을 함께 고려하여 승소 후 집행 가능성을 높이세요.'
    ]
  },
  damages: {
    title: '손해배상 (불법행위)',
    steps: [
      { id: 'relationship', question: '피해자와 가해자는 어떤 관계인가요?', field: 'relationship', placeholder: '예: 교통사고 당사자, 층간소음 이웃, 폭행 가해자와 피해자 등', description: '당사자 간의 관계를 적어주세요. 고의 또는 과실 여부를 판단하는 기초가 됩니다.' },
      { id: 'summary', question: '어떤 사고나 행위로 인해 어떤 피해를 입었나요?', field: 'summary', placeholder: '예: 2024년 2월 1일 상대방의 부주의로 인한 교통사고로 전치 4주의 부상을 입고 차량이 파손되었습니다.', description: '사건의 경위와 구체적인 피해 내용을 적어주세요. 가해 행위와 손해 사이의 인과관계가 중요합니다.' },
      { id: 'amount', question: '청구하려는 배상액의 세부 항목은 무엇인가요?', field: 'amount', placeholder: '예: 치료비 200만원, 수리비 300만원, 위자료 500만원 등 총 1,000만원', description: '적극적 손해(치료비 등), 소극적 손해(일실수입), 위자료를 구분하여 적으면 좋습니다.' },
      { id: 'evidence', question: '피해 사실과 가해자의 과실을 입증할 자료는 무엇인가요?', field: 'evidence', placeholder: '예: 진단서, 수리비 견적서, 사고 현장 사진, 블랙박스 영상, 경찰 조사 결과', description: '객관적인 증거 자료를 나열해 주세요. 가해자의 과실을 입증할 수 있는 자료가 핵심입니다.' },
    ],
    faqs: [
      { q: '정신적 피해(위자료)도 청구할 수 있나요?', a: '네, 불법행위로 인한 정신적 고통에 대해 위자료를 청구할 수 있으나, 금액은 법원의 재량에 따라 결정됩니다.' },
      { q: '과실 비율이 중요한가요?', a: '네, 본인에게도 과실이 있다면 손해배상액이 감액될 수 있습니다(과실상계).' },
      { q: '치료가 끝나지 않았는데 소송이 가능한가요?', a: '가능하지만, 향후 치료비 추정서 등을 통해 예상되는 손해액을 미리 청구하거나 추후 확정해야 합니다.' }
    ],
    precautions: [
      '손해 및 가해자를 안 날로부터 3년, 불법행위가 있은 날로부터 10년 내에 청구해야 합니다.',
      '인과관계(가해 행위로 인해 손해가 발생했다는 점) 입증이 핵심입니다.',
      '신체 감정이나 시가 감정이 필요한 경우 소송 비용이 추가될 수 있습니다.'
    ]
  },
  lease: {
    title: '임대차 보증금 반환',
    steps: [
      { id: 'relationship', question: '임대인과 임차인 중 본인은 누구인가요?', field: 'relationship', placeholder: '예: 임차인(세입자)', description: '본인의 지위를 적어주세요.' },
      { id: 'summary', question: '임대차 계약 내용과 종료 경위는 어떻게 되나요?', field: 'summary', placeholder: '예: 2022년 3월부터 2년간 보증금 1억 원에 계약했으나, 계약 종료 3개월 전 해지 통보를 했음에도 보증금을 돌려받지 못하고 있습니다.', description: '계약 기간, 보증금액, 해지 통보 날짜를 포함해 주세요.' },
      { id: 'amount', question: '돌려받아야 할 보증금과 지연이자는 얼마인가요?', field: 'amount', placeholder: '예: 보증금 1억 원 및 임차목적물 인도 다음날부터의 지연손해금', description: '청구 금액을 명확히 하세요.' },
      { id: 'evidence', question: '임대차 계약 및 종료를 입증할 자료는 무엇인가요?', field: 'evidence', placeholder: '예: 임대차계약서, 확정일자, 내용증명, 문자/카톡 해지 통보 내역', description: '계약 사실과 해지 통보 증거가 중요합니다.' },
    ],
    faqs: [
      { q: '이사를 가야 하는데 어떻게 하죠?', a: '보증금을 받지 못한 상태에서 이사를 가야 한다면 반드시 임차권등기명령을 신청하여 대항력과 우선변제권을 유지해야 합니다.' },
      { q: '묵시적 갱신 상태인데 해지가 가능한가요?', a: '네, 임차인은 언제든지 해지 통보를 할 수 있으며, 통보 후 3개월이 지나면 효력이 발생합니다.' }
    ],
    precautions: [
      '계약 종료 전 6개월~2개월 전까지 반드시 갱신 거절의 의사를 표시해야 합니다.',
      '전입신고와 확정일자를 갖추고 있었는지 확인하세요.'
    ]
  },
  family: {
    title: '가사 소송 (이혼/상속 등)',
    steps: [
      { id: 'relationship', question: '당사자 간의 가족 관계는 어떻게 되나요?', field: 'relationship', placeholder: '예: 부부, 부모와 자녀, 형제 등', description: '가족 관계를 명확히 기술해 주세요.' },
      { id: 'summary', question: '분쟁의 핵심 내용과 경위는 무엇인가요?', field: 'summary', placeholder: '예: 성격 차이로 인한 이혼 및 재산분할 청구, 또는 부모님 사후 상속 재산 분쟁 등', description: '사건의 배경과 갈등의 원인을 적어주세요.' },
      { id: 'amount', question: '청구하려는 위자료, 재산분할액 또는 양육비는 얼마인가요?', field: 'amount', placeholder: '예: 위자료 3,000만원 및 재산분할 50% 청구', description: '금전적 요구 사항을 구체적으로 적어주세요.' },
      { id: 'evidence', question: '주장을 입증할 수 있는 자료는 무엇인가요?', field: 'evidence', placeholder: '예: 가족관계증명서, 혼인관계증명서, 부정행위 증거, 재산 내역서 등', description: '가사 소송은 신분 관계와 재산 내역 입증이 핵심입니다.' },
    ],
    faqs: [
      { q: '협의이혼이 안 되면 어떻게 하나요?', a: '재판상 이혼을 청구해야 하며, 민법 제840조에서 정한 이혼 사유가 있어야 합니다.' }
    ],
    precautions: [
      '가족 간의 감정적 대립이 심할 수 있으므로 객관적인 증거 확보에 유의하세요.',
      '자녀가 있는 경우 양육권 및 양육비 문제가 가장 중요하게 다뤄집니다.'
    ]
  },
  administrative: {
    title: '행정 소송 (처분 취소 등)',
    steps: [
      { id: 'relationship', question: '처분을 내린 행정청은 어디인가요?', field: 'relationship', placeholder: '예: OO구청장, OO세무서장 등', description: '피고가 될 행정청을 명시해 주세요.' },
      { id: 'summary', question: '어떤 행정 처분을 받았으며, 왜 부당하다고 생각하시나요?', field: 'summary', placeholder: '예: 유통기한 경과 제품 보관으로 영업정지 2개월 처분을 받았으나, 고의가 아니었고 처분이 너무 가혹합니다.', description: '처분 내용과 위법 또는 부당한 사유를 적어주세요.' },
      { id: 'amount', question: '청구 취지는 무엇인가요?', field: 'amount', placeholder: '예: 영업정지 처분 취소 청구', description: '행정청의 처분을 어떻게 변경하거나 취소하고 싶은지 적어주세요.' },
      { id: 'evidence', question: '처분 통지서 및 부당함을 증명할 자료는 무엇인가요?', field: 'evidence', placeholder: '예: 행정처분 통지서, 의견제출서, 주변인 탄원서, 매출 자료 등', description: '처분 문서와 감경 사유를 입증할 자료가 필요합니다.' },
    ],
    faqs: [
      { q: '행정심판을 먼저 거쳐야 하나요?', a: '사안에 따라 행정심판을 반드시 거쳐야 하는 경우(필요적 전치주의)가 있으니 확인이 필요합니다.' }
    ],
    precautions: [
      '제소 기간(처분이 있음을 안 날로부터 90일 이내)을 엄격히 준수해야 합니다.',
      '집행정지 신청을 함께 검토하여 처분의 효력을 일시적으로 멈춰야 할 수 있습니다.'
    ]
  },
  criminal: {
    title: '형사 절차 (고소장 등)',
    steps: [
      { id: 'relationship', question: '고소인과 피고소인은 어떤 관계인가요?', field: 'relationship', placeholder: '예: 사기 피해자와 가해자, 폭행 당사자 등', description: '당사자 관계를 적어주세요.' },
      { id: 'summary', question: '범죄 사실의 경위는 어떻게 되나요?', field: 'summary', placeholder: '예: 2023년 12월 상대방이 투자를 제안하며 1억 원을 가져간 뒤 연락이 두절되었습니다.', description: '범죄의 구성 요건에 맞춰 사실 관계를 적어주세요.' },
      { id: 'amount', question: '피해 금액이나 처벌 희망 수위는 어떻게 되나요?', field: 'amount', placeholder: '예: 피해액 1억 원, 엄벌 희망', description: '피해 규모를 명시해 주세요.' },
      { id: 'evidence', question: '범죄를 입증할 증거 자료는 무엇인가요?', field: 'evidence', placeholder: '예: 이체 내역, 계약서, 녹취록, 목격자 진술 등', description: '수사 기관이 범죄 혐의를 입증할 수 있는 자료가 중요합니다.' },
    ],
    faqs: [
      { q: '고소와 고발의 차이가 무엇인가요?', a: '고소는 피해자가 직접 하는 것이고, 고발은 제3자가 하는 것입니다.' }
    ],
    precautions: [
      '무고죄의 위험이 있으므로 허위 사실을 기재하지 않도록 주의하세요.',
      '증거 인멸의 우려가 있다면 신속한 고소가 필요합니다.'
    ]
  },
  application: {
    title: '민사신청 (가압류/가처분)',
    steps: [
      { id: 'relationship', question: '채권자와 채무자의 관계는 무엇인가요?', field: 'relationship', placeholder: '예: 대여금 채권자와 채무자', description: '신청인과 피신청인의 관계를 적어주세요.' },
      { id: 'summary', question: '신청의 이유와 긴급한 필요성은 무엇인가요?', field: 'summary', placeholder: '예: 판결 전 상대방이 재산을 은닉할 우려가 있어 부동산 가압류를 신청합니다.', description: '피보전권리와 보전의 필요성을 기술해 주세요.' },
      { id: 'amount', question: '신청 금액 또는 대상은 무엇인가요?', field: 'amount', placeholder: '예: 가압류할 채권 금액 5,000만원', description: '보전하려는 금액이나 대상을 명시하세요.' },
      { id: 'evidence', question: '채권의 존재를 입증할 자료는 무엇인가요?', field: 'evidence', placeholder: '예: 차용증, 공정증서, 계약서 등', description: '본안 소송에서 승소 가능성을 보여줄 자료가 필요합니다.' },
    ],
    faqs: [
      { q: '담보 제공(공탁)이 필요한가요?', a: '네, 법원은 신청인의 주장이 허위일 경우 채무자의 손해를 담보하기 위해 공탁을 명령할 수 있습니다.' }
    ],
    precautions: [
      '보전처분은 신속성이 생명입니다.',
      '본안 소송을 제기하지 않은 상태라면 제소명령을 받을 수 있음에 유의하세요.'
    ]
  },
  other: {
    title: '기타 민사 소송',
    steps: [
      { id: 'relationship', question: '원고와 피고는 어떤 관계인가요?', field: 'relationship', placeholder: '예: 계약 당사자, 이웃, 동업자 등', description: '당사자 간의 법적 관계를 적어주세요.' },
      { id: 'summary', question: '어떤 분쟁이 발생했는지 자세히 설명해 주세요.', field: 'summary', placeholder: '예: 동업 계약에 따른 수익금을 배분받지 못하고 있습니다.', description: '사건의 경위를 육하원칙에 따라 적어주세요.' },
      { id: 'amount', question: '상대방에게 요구하는 바는 무엇인가요?', field: 'amount', placeholder: '예: 미지급 수익금 2,000만원 지급', description: '청구 취지를 명확히 하세요.' },
      { id: 'evidence', question: '주장을 뒷받침할 증거는 무엇인가요?', field: 'evidence', placeholder: '예: 동업계약서, 정산 내역서, 대화 녹취', description: '입증 자료 목록을 적어주세요.' },
    ],
    faqs: [
      { q: '소송 비용은 누가 부담하나요?', a: '원칙적으로 패소한 당사자가 부담하지만, 법원이 판결로 비율을 정합니다.' }
    ],
    precautions: [
      '민사소송은 증거 싸움입니다. 객관적인 자료 확보가 최우선입니다.'
    ]
  }
};

export default function ComplaintWizard({ onBack, initialData: propInitialData }: { onBack: () => void; initialData?: Partial<typeof initialData> }) {
  const { user } = useAuth();
  const [litigationType, setLitigationType] = useState<LitigationType | null>(propInitialData?.type as LitigationType || null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [data, setData] = useState({ ...initialData, ...propInitialData });
  const [inputValue, setInputValue] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [quickStory, setQuickStory] = useState('');
  const [showQuickInput, setShowQuickInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ primary_category: string; keywords: string[] } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const steps = (litigationType && LITIGATION_CONFIGS[litigationType]) ? LITIGATION_CONFIGS[litigationType].steps : [];

  // Load draft on mount
  useEffect(() => {
    const savedDraft = sessionStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const { data: draftData, stepIndex, type } = JSON.parse(savedDraft);
        if (type && LITIGATION_CONFIGS[type as LitigationType]) {
          setLitigationType(type as LitigationType);
          setData(draftData);
          setCurrentStepIndex(stepIndex);
          // If we were at the end, show review
          if (stepIndex === LITIGATION_CONFIGS[type as LitigationType].steps.length) {
            setIsReviewing(true);
          }
        }
      } catch (e) {
        console.error('Failed to load draft', e);
      }
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (!result && litigationType && LITIGATION_CONFIGS[litigationType]) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        data,
        stepIndex: isReviewing ? LITIGATION_CONFIGS[litigationType].steps.length : currentStepIndex,
        type: litigationType
      }));
    }
  }, [data, currentStepIndex, isReviewing, result, litigationType]);

  const handleQuickExtract = async () => {
    if (!quickStory.trim()) return;
    setIsExtracting(true);
    try {
      const extracted = await extractComplaintInfo(quickStory);
      if (extracted) {
        // Map extracted type to our LitigationType if possible, else default to 'other'
        let mappedType: LitigationType = 'other';
        const typeStr = extracted.type.toLowerCase();
        if (typeStr.includes('대여') || typeStr.includes('돈')) mappedType = 'loan';
        else if (typeStr.includes('손해')) mappedType = 'damages';
        else if (typeStr.includes('임대') || typeStr.includes('보증금')) mappedType = 'lease';
        else if (typeStr.includes('가사') || typeStr.includes('이혼')) mappedType = 'family';
        else if (typeStr.includes('행정')) mappedType = 'administrative';
        else if (typeStr.includes('형사')) mappedType = 'criminal';
        else if (typeStr.includes('신청') || typeStr.includes('가압류')) mappedType = 'application';

        setData({
          type: mappedType,
          relationship: extracted.relationship,
          summary: extracted.summary,
          amount: extracted.amount,
          evidence: extracted.evidence,
        });
        setLitigationType(mappedType);
        setIsReviewing(true);
        setShowQuickInput(false);
      }
    } catch (error) {
      console.error("Extraction failed:", error);
      alert("정보 추출에 실패했습니다. 직접 입력해 주세요.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleTypeSelect = (type: LitigationType) => {
    setLitigationType(type);
    setData({ ...initialData, type });
    setCurrentStepIndex(0);
  };

  const handleNext = () => {
    if (!inputValue.trim()) return;

    const currentStep = steps[currentStepIndex];
    if (!currentStep) return;

    const newData = { ...data, [currentStep.field]: inputValue };
    setData(newData);
    setInputValue('');

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      setIsReviewing(true);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setIsReviewing(false);
    try {
      const [complaint, analysis] = await Promise.all([
        generateComplaint(data),
        analyzeUserCase(data.summary)
      ]);
      setResult(complaint || '소장 생성에 실패했습니다.');
      setAnalysisResult(analysis);
      // Clear draft after successful generation
      sessionStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem('SOLOLAW_COMPLAINT_INITIAL');
    } catch (error) {
      console.error(error);
      setResult(error instanceof Error ? error.message : '오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (!result || !user) return;

    try {
      await saveToHistory(user.uid, 'complaint', {
        title: `${data.relationship} 관련 소장`,
        content: result,
        data: { ...data }
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save to history:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `소장_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEdit = (index: number) => {
    setCurrentStepIndex(index);
    setInputValue(data[steps[index].field]);
    setIsReviewing(false);
    setResult(null);
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setLitigationType(null);
    setCurrentStepIndex(0);
    setData(initialData);
    setResult(null);
    setIsReviewing(false);
    setInputValue('');
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem('SOLOLAW_COMPLAINT_INITIAL');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => {
            if (result) {
              setResult(null);
            } else if (isReviewing) {
              setIsReviewing(false);
              if (steps.length > 0) setCurrentStepIndex(steps.length - 1);
            } else if (litigationType && currentStepIndex > 0) {
              setCurrentStepIndex(currentStepIndex - 1);
              setInputValue(data[steps[currentStepIndex - 1].field]);
            } else if (litigationType) {
              setLitigationType(null);
            } else {
              onBack();
            }
          }}
          className="flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors group"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 뒤로 가기
        </button>
        {litigationType && !result && (
          <div className="flex-1">
            <StepIndicator 
              steps={[
                ...steps.map(s => ({ id: s.id, label: s.id === 'relationship' ? '관계' : s.id === 'summary' ? '사건 개요' : s.id === 'amount' ? '청구 금액' : '증거' })),
                { id: 'review', label: '최종 검토' }
              ]}
              currentStepIndex={isReviewing ? steps.length : currentStepIndex}
              isComplete={!!result}
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-6 md:p-8 border-b border-[#E2E8F0] bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">소장 초안 작성 마법사</h2>
            <p className="text-sm text-[#64748B]">
              {litigationType && LITIGATION_CONFIGS[litigationType] ? `${LITIGATION_CONFIGS[litigationType].title} 소송을 준비합니다.` : '질문에 답변하시면 전문적인 소장 초안을 만들어 드립니다.'}
            </p>
          </div>
          {litigationType && LITIGATION_CONFIGS[litigationType] && (
            <button 
              onClick={() => setShowFaq(!showFaq)}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" /> 도움말
            </button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-6 relative">
          <AnimatePresence mode="popLayout">
            {litigationType && !result && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-4 p-3 bg-slate-900 rounded-xl shadow-lg border border-slate-800 mb-2"
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
            )}

            {showFaq && litigationType && LITIGATION_CONFIGS[litigationType] && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-72 bg-white border-l border-[#E2E8F0] shadow-xl z-20 p-6 space-y-6 overflow-y-auto custom-scrollbar"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#0F172A] flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" /> 자주 묻는 질문
                  </h3>
                  <button onClick={() => setShowFaq(false)} className="text-[#64748B] hover:text-[#0F172A] p-2">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {LITIGATION_CONFIGS[litigationType].faqs.map((faq, i) => (
                    <div key={`faq-${i}`} className="space-y-1.5">
                      <p className="text-xs font-bold text-[#1E293B]">Q. {faq.q}</p>
                      <p className="text-[11px] text-[#64748B] leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
                  <h3 className="font-bold text-[#0F172A] flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> 주의사항
                  </h3>
                  <ul className="space-y-2">
                    {LITIGATION_CONFIGS[litigationType].precautions.map((p, i) => (
                      <li key={`precaution-${i}`} className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-100 leading-relaxed">
                        • {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {!litigationType && !showQuickInput && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2 py-4">
                  <h3 className="text-xl font-bold text-[#0F172A]">소송 유형을 선택해 주세요</h3>
                  <p className="text-sm text-[#64748B]">유형에 맞는 최적화된 질문으로 안내해 드립니다.</p>
                </div>

                <div className="bg-brand-50 border border-brand-100 p-6 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-200">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#0F172A]">일상어로 한 번에 입력하기</h4>
                      <p className="text-xs text-slate-500">사연을 길게 적어주시면 AI가 핵심 정보를 추출합니다.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowQuickInput(true)}
                    className="w-full py-3 bg-white border border-brand-200 text-brand-600 rounded-xl text-sm font-bold hover:bg-brand-50 transition-all shadow-sm"
                  >
                    스마트 입력 시작하기
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(Object.keys(LITIGATION_CONFIGS) as LitigationType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleTypeSelect(type)}
                      className="flex items-center justify-between p-5 rounded-3xl border border-[#E2E8F0] hover:border-brand-600 hover:bg-brand-50/30 transition-all group text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-2xl group-hover:bg-brand-100 transition-colors">
                          {type === 'loan' ? '💸' : type === 'damages' ? '💥' : type === 'lease' ? '🏠' : '⚖️'}
                        </div>
                        <div>
                          <p className="font-bold text-[#0F172A] font-serif">{LITIGATION_CONFIGS[type].title}</p>
                          <p className="text-xs text-[#64748B] mt-0.5 font-sans">맞춤형 소장 작성</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#CBD5E1] group-hover:text-brand-600 transition-colors" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {showQuickInput && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#0F172A]">사연을 자유롭게 적어주세요</h3>
                  <p className="text-sm text-[#64748B]">육하원칙에 따라 자세히 적어주실수록 정확한 소장이 작성됩니다.</p>
                </div>
                <textarea
                  value={quickStory}
                  onChange={(e) => setQuickStory(e.target.value)}
                  placeholder="예: 2023년 5월에 친구 김철수에게 500만원을 빌려줬습니다. 차용증은 없지만 카톡으로 갚겠다는 약속을 여러 번 받았습니다. 그런데 지금까지 한 푼도 갚지 않고 연락도 피하고 있습니다."
                  className="w-full h-64 p-6 rounded-3xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-500/20 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none text-sm leading-relaxed"
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowQuickInput(false)}
                    className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                  >
                    취소
                  </button>
                  <button 
                    onClick={handleQuickExtract}
                    disabled={isExtracting || !quickStory.trim()}
                    className="flex-[2] py-4 bg-brand-600 text-white rounded-2xl font-bold text-sm hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    정보 추출 및 검토하기
                  </button>
                </div>
              </motion.div>
            )}

            {litigationType && !isReviewing && !result && !showQuickInput && steps.slice(0, currentStepIndex + 1).map((step, idx) => (
              <motion.div 
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    Q
                  </div>
                  <div className="space-y-4 max-w-[85%]">
                    <div className="bg-[#F1F5F9] p-4 rounded-2xl rounded-tl-none text-[#1E293B] relative group">
                      {step.question}
                      {step.id === 'relationship' && (
                        <div className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-amber-100/50 rounded-lg border border-amber-200/50">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span className="text-[9px] font-bold text-amber-800">상대방 정보는 법적 절차를 위해서만 사용되며 마케팅에 활용되지 않습니다.</span>
                        </div>
                      )}
                    </div>
                    
                    {idx === currentStepIndex && !isReviewing && !result && (
                      <AIAssistantBubble 
                        isVisible={true}
                        message={step.description}
                        tip={step.placeholder}
                      />
                    )}
                  </div>
                </div>
                
                {idx < currentStepIndex && (
                  <div className="flex justify-end gap-3">
                    <div className="bg-[#2563EB] p-4 rounded-2xl rounded-tr-none text-white max-w-[85%] shadow-sm">
                      {data[step.field]}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                      A
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {isReviewing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-800 font-medium">입력하신 내용을 확인해 주세요. 수정이 필요하면 수정 버튼을 눌러주세요.</p>
                </div>

                <div className="space-y-4">
                  {steps.map((step, idx) => (
                    <div key={step.id} className="group bg-white border border-[#E2E8F0] p-4 rounded-xl hover:border-[#2563EB] transition-colors relative">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider">{idx + 1}. {step.id === 'relationship' ? '관계' : step.id === 'summary' ? '사건 개요' : step.id === 'amount' ? '청구 금액' : '증거'}</span>
                        <button 
                          onClick={() => handleEdit(idx)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#2563EB] transition-colors"
                          title="수정하기"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[#1E293B] text-sm leading-relaxed whitespace-pre-wrap">
                        {data[step.field]}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button 
                    onClick={() => {
                      setIsReviewing(false);
                      if (steps.length > 0) {
                        setCurrentStepIndex(steps.length - 1);
                        setInputValue(data[steps[steps.length - 1].field]);
                      }
                    }}
                    className="flex-1 py-3 md:py-4 rounded-xl font-bold border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 transition-all text-sm"
                  >
                    질문으로 돌아가기
                  </button>
                  <button 
                    onClick={handleGenerate}
                    className="flex-[2] bg-[#2563EB] text-white py-3 md:py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1D4ED8] transition-all shadow-lg shadow-blue-100 text-sm"
                  >
                    <Sparkles className="w-5 h-5" />
                    이 내용으로 소장 생성하기
                  </button>
                </div>
              </motion.div>
            )}

            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  AI
                </div>
                <div className="bg-[#F1F5F9] p-4 rounded-2xl rounded-tl-none text-[#64748B] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  소장을 작성하고 있습니다. 잠시만 기다려 주세요...
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    AI
                  </div>
                  <div className="bg-white border border-[#E2E8F0] p-4 md:p-6 rounded-2xl rounded-tl-none shadow-sm w-full prose prose-slate max-w-none break-words">
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
                </div>
                <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 md:gap-3">
                  <button 
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-xs md:text-sm font-medium text-[#64748B] hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" /> 다시 작성
                  </button>
                  <button 
                    onClick={handleSaveToHistory}
                    className={`flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 rounded-xl border transition-all text-xs md:text-sm font-medium ${
                      isSaved 
                        ? 'bg-green-50 border-green-200 text-green-600' 
                        : 'border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                    }`}
                  >
                    {isSaved ? <Check className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                    {isSaved ? '저장됨' : '보관함 저장'}
                  </button>
                  <button 
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-xs md:text-sm font-medium text-[#64748B] hover:bg-slate-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 md:w-4 md:h-4" /> 다운로드
                  </button>
                  <button 
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 rounded-xl bg-[#0F172A] text-xs md:text-sm font-medium text-white hover:bg-black transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Copy className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                    {copied ? '복사됨' : '전체 복사'}
                  </button>
                </div>

                {/* Lawyer Matching Section */}
                {analysisResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 pt-12 border-t border-slate-100 space-y-6"
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-bold text-[#0F172A]">전문가 검토 추천</h3>
                      <p className="text-sm text-[#64748B]">작성된 초안을 바탕으로 가장 적합한 변호사를 추천해 드립니다.</p>
                    </div>
                    
                    <LawyerMatching 
                      primaryCategory={analysisResult.primary_category}
                      keywords={analysisResult.keywords}
                      userCaseSummary={data.summary}
                      onSelectLawyer={(lawyer) => {
                        console.log("Selected lawyer:", lawyer);
                        // In a real app, this would open a contact modal or go to booking
                        alert(`${lawyer.name} 변호사님께 검토 요청 페이지로 이동합니다.`);
                      }}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!result && !isLoading && !isReviewing && litigationType && (
          <div className="p-4 border-t border-[#E2E8F0] bg-white">
            <div className="flex gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleNext();
                  }
                }}
                placeholder={steps[currentStepIndex]?.placeholder || '내용을 입력해 주세요.'}
                className="flex-1 min-h-[80px] p-4 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB] focus:border-transparent outline-none resize-none text-sm"
              />
              <button 
                onClick={handleNext}
                disabled={!inputValue.trim()}
                className="bg-[#2563EB] text-white p-4 rounded-xl self-end hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
