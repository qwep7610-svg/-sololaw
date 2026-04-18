import { 
  collection, 
  addDoc, 
  setDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function seedDatabase() {
  console.log('Client-side seeding started...');
  
  // 1. Branding
  const brandingRef = doc(db, 'app_settings', 'branding');
  const brandingDoc = await getDoc(brandingRef);
  if (!brandingDoc.exists()) {
    await setDoc(brandingRef, {
      companyName: 'SoloLaw Inc.',
      appName: 'SoloLaw',
      appSubtext: 'AI Legal Assistant',
      heroTitle: '당신의 곁에 있는 가장 똑똑한 법률 비서',
      heroDescription: '일상어로 설명하면 소장 초안을 작성하고, 어려운 판결문은 쉽게 요약해 드립니다. SoloLaw와 함께 법률 문턱을 낮추세요.',
      aboutHeroTitle: '법률 서비스의 대중화를 꿈꿉니다',
      aboutHeroDescription: 'SoloLaw는 누구나 법의 보호를 받을 수 있도록 AI 기술로 법률 서비스의 심리적, 경제적 문턱을 낮추는 혁신적인 플랫폼입니다.',
      services: [
        { title: '소장 자동 생성', desc: '상황을 입력하면 법적 형식에 맞는 소장 초안을 단 몇 초 만에 생성합니다.', iconName: 'FileText' },
        { title: '판결문 요약', desc: '전문 용어로 가득한 판결문을 초등학생도 이해할 수 있을 만큼 쉽게 요약합니다.', iconName: 'Search' },
        { title: '보정명령 가이드', desc: '법원의 보정명령을 분석하여 구체적인 대응 방법과 보정서 초안을 제공합니다.', iconName: 'ShieldCheck' }
      ],
      updatedAt: serverTimestamp()
    });
  }

  // 2. Lawyers
  const lawyersSnapshot = await getDocs(query(collection(db, 'lawyers'), limit(1)));
  if (lawyersSnapshot.empty) {
    const lawyersData = [
      {
        uid: 'dummy_lawyer_1',
        name: '김철수 변호사',
        email: 'chulsoo.kim@lawyer.com',
        regNumber: '12345',
        licenseNumber: '2020-001',
        location: '서울 서초구',
        status: 'approved',
        isExpert: true,
        reviewCount: 154,
        averageResponseTime: '2시간 이내',
        reviewPrice: 50000,
        createdAt: serverTimestamp()
      },
      {
        uid: 'dummy_lawyer_3',
        name: '박대한 변호사',
        email: 'daehan.park@lawyer.com',
        regNumber: '24680',
        licenseNumber: '2015-112',
        location: '서울 강남구',
        status: 'approved',
        isExpert: true,
        reviewCount: 210,
        averageResponseTime: '1시간 이내',
        reviewPrice: 70000,
        createdAt: serverTimestamp()
      }
    ];

    const profilesData: Record<string, any> = {
      'dummy_lawyer_1': {
        experience: '경력 10년, 민사/가사 전문',
        specialty: '민사소송, 이혼, 상속',
        cases: '승소 사례 500건 이상',
        message: '의뢰인의 입장에서 가장 명쾌한 법률 해답을 찾아드립니다.'
      },
      'dummy_lawyer_3': {
        experience: '경력 15년, 형사 전문 (전직 검사)',
        specialty: '사기, 횡령, 성범죄, 교통사고',
        cases: '무죄/집행유예 판결 다수 확보',
        message: '치밀한 전략과 논리로 의뢰인의 권익을 최우선으로 보호합니다.'
      }
    };

    for (const l of lawyersData) {
      // Note: This might fail if the user is not 'dummy_lawyer_1' due to rules
      // BUT as an Admin (qwep7610@naver.com), the rules should allow it if we update them.
      // Wait, let's check rules. Admin has blanket write? 
      // "allow write: if isAdmin();" in app_settings, contents, policies...
      // but for lawyer_profiles: "allow create, update: if isOwner(userId)..."
      // I'll need to update rules to allow Admin to initialize lawyers.
      await setDoc(doc(db, 'lawyers', l.uid), l);
      if (profilesData[l.uid]) {
        await setDoc(doc(db, 'lawyer_profiles', l.uid), {
          userId: l.uid,
          name: l.name,
          ...profilesData[l.uid],
          updatedAt: serverTimestamp()
        });
      }
    }
  }

  // 3. Contents
  const contentSnapshot = await getDocs(query(collection(db, 'contents'), limit(1)));
  if (contentSnapshot.empty) {
    const contents = [
      {
        type: 'guide',
        title: '나홀로 소송: 소액사건 심판절차 가이드',
        category: '민사소송',
        body: '### 소액사건이란?\n청구금액이 3,000만 원 이하인 경우를 말합니다.\n\n### 절차적 특징\n1. 이행권고결정: 판사가 변론 없이 피고에게 이행을 권고합니다.\n2. 신속한 변론: 1회 변론으로 끝내는 것이 원칙입니다.',
        createdAt: serverTimestamp()
      },
      {
        type: 'faq',
        title: 'AI 소장 작성 서비스는 무료인가요?',
        body: '네, 현재 모든 사용자에게 무료로 제공되고 있습니다.',
        category: '결제/요금',
        createdAt: serverTimestamp()
      }
    ];
    for (const c of contents) {
      await addDoc(collection(db, 'contents'), c);
    }
  }
}
