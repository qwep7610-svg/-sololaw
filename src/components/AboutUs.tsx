import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Rocket, Wrench, Gem, Handshake, ShieldCheck, Users, Zap, Scale, Loader2, FileText, Gavel, Heart } from 'lucide-react';
import { Logo } from './Logo';
import { db, doc, getDoc } from '../lib/firebase';

export default function AboutUs({ onBack }: { onBack: () => void }) {
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBranding() {
      try {
        const docRef = doc(db, 'app_settings', 'branding');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data());
        }
      } catch (error) {
        console.error("Error loading branding config:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadBranding();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
        <p className="text-slate-500 font-medium">정보를 불러오는 중...</p>
      </div>
    );
  }

  const aboutHeroTitle = config?.aboutHeroTitle || '법은 멀고 비용은 높지만,\n솔로로는 당신 곁에 있습니다.';
  const aboutHeroDescription = config?.aboutHeroDescription || "주식회사 솔로로는 복잡한 법 절차와 높은 수임료 장벽 앞에서 망설이는 '나홀로 소송족'을 위한 AI 법률 서류 작성 보조 플랫폼입니다.\n우리는 누구나 법적 권리를 정당하게 보호받을 수 있도록, 기술을 통해 법률 서비스의 문턱을 낮춥니다.";
  const aboutMissionTitle = config?.aboutMissionTitle || '법률 서비스의 민주화와\n정보 비대칭 해소';
  const aboutMissionDescription = config?.aboutMissionDescription || '전문가의 도움 없이는 시작조차 어렵던 소송 절차를 AI 기술로 자동화하여, 누구나 합리적인 비용으로 완결성 있는 법률 문서를 작성할 수 있는 환경을 만듭니다.';
  const aboutCtaText = config?.aboutCtaText || '"혼자 하는 소송, 하지만 결코 혼자가 아닙니다.\n당신의 법적 여정에 솔로로가 함께하겠습니다."';

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return <Zap className="w-8 h-8" />;
      case 'Users': return <Users className="w-8 h-8" />;
      case 'ShieldCheck': return <ShieldCheck className="w-8 h-8" />;
      case 'Scale': return <Scale className="w-8 h-8" />;
      case 'FileText': return <FileText className="w-8 h-8" />;
      case 'Gavel': return <Gavel className="w-8 h-8" />;
      case 'Heart': return <Heart className="w-8 h-8" />;
      default: return <Zap className="w-8 h-8" />;
    }
  };

  const services = config?.services || [
    {
      title: "AI 나홀로 소송 가이드",
      desc: "사용자의 상황을 AI가 분석하여 내용증명, 소장, 답변서 등 맞춤형 초안을 실시간으로 생성합니다.",
      iconName: "Zap"
    },
    {
      title: "검증된 전문가 연결",
      desc: "변호사법을 엄격히 준수하며, 플랫폼 수수료 없이 정액제 광고를 통해 전문 변호사를 투명하게 안내합니다.",
      iconName: "Users"
    },
    {
      title: "법률 행정 프로세스 지원",
      desc: "법원 제출 규격에 맞는 서류 최적화 및 복잡한 행정 절차 안내를 통해 소송의 시작부터 끝까지 동행합니다.",
      iconName: "ShieldCheck"
    }
  ];

  const values = config?.values || [
    {
      title: "Trust (신뢰)",
      desc: "변호사법을 준수하며, 변호사와 의뢰인이 직접 소통하는 건강한 플랫폼을 지향합니다.",
      icon: "🤝"
    },
    {
      title: "Accessibility (접근성)",
      desc: "24시간 언제 어디서나 AI를 통해 자신의 법적 권리를 검토받을 수 있습니다.",
      icon: "🌍"
    },
    {
      title: "Efficiency (효율성)",
      desc: "변호사에게는 정리된 기초 데이터를 제공하여 상담 효율을 높이고, 의뢰인에게는 시간과 비용을 절감해 줍니다.",
      icon: "⚡"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-slate-50">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <Scale size={600} className="absolute -right-20 -top-20 rotate-12" />
        </div>
        
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors mb-12 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 뒤로 가기
          </button>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-3xl"
          >
            <Logo size="lg" text={config?.appName || "SoloLaw"} subtext={config?.appSubtext || "주식회사 솔로로"} />
            <h1 className="text-4xl md:text-6xl font-bold text-[#0F172A] font-serif leading-tight whitespace-pre-line">
              {aboutHeroTitle.split('\n').map((line: string, i: number) => (
                <span key={`hero-line-${i}`}>
                  {line.includes('솔로로') ? (
                    <>
                      {line.split('솔로로')[0]}
                      <span className="text-brand-600">솔로로</span>
                      {line.split('솔로로')[1]}
                    </>
                  ) : line}
                  {i < aboutHeroTitle.split('\n').length - 1 && <br />}
                </span>
              ))}
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium whitespace-pre-line">
              {aboutHeroDescription}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 max-w-5xl mx-auto px-4">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-16 items-center"
        >
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-full text-sm font-bold uppercase tracking-wider">
              <Rocket className="w-4 h-4" /> Our Mission
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] font-serif whitespace-pre-line">
              {aboutMissionTitle}
            </h2>
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
              {aboutMissionDescription}
            </p>
          </motion.div>
          <motion.div variants={itemVariants} className="relative">
            <div className="aspect-square bg-brand-600 rounded-[3rem] rotate-3 absolute inset-0 opacity-10" />
            <div className="aspect-square bg-white border-2 border-brand-100 rounded-[3rem] flex items-center justify-center overflow-hidden relative z-10 shadow-2xl shadow-brand-100/50">
              <img 
                src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=2070&auto=format&fit=crop" 
                alt="SoloLaw Mission" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-[#0F172A] text-white overflow-hidden relative">
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="text-center space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-brand-400 rounded-full text-sm font-bold uppercase tracking-wider">
              <Wrench className="w-4 h-4" /> Key Services
            </div>
            <h2 className="text-3xl md:text-5xl font-bold font-serif">주요 서비스</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service: any, i: number) => (
              <motion.div 
                key={`service-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-colors group"
              >
                <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {getIcon(service.iconName)}
                </div>
                <h3 className="text-xl font-bold mb-4">{service.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{service.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 max-w-5xl mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-full text-sm font-bold uppercase tracking-wider">
            <Gem className="w-4 h-4" /> Core Values
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0F172A] font-serif">솔로로의 핵심 가치</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {values.map((value: any, i: number) => (
            <motion.div 
              key={`value-${i}`}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-center space-y-4"
            >
              <div className="text-5xl mb-6">{value.icon}</div>
              <h3 className="text-xl font-bold text-[#0F172A]">{value.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{value.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Partnership Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-[3rem] p-8 md:p-16 border border-slate-200 shadow-xl flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold uppercase tracking-wider">
                <Handshake className="w-4 h-4" /> For Lawyers
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] font-serif">변호사님들의 훌륭한<br />마케팅 파트너</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-1">
                    <div className="w-2 h-2 bg-brand-600 rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F172A]">수수료 0원</h4>
                    <p className="text-sm text-slate-500">사건 알선 수수료를 절대 받지 않으며, 오직 정액제 광고 모델로만 운영됩니다.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-1">
                    <div className="w-2 h-2 bg-brand-600 rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F172A]">준비된 의뢰인</h4>
                    <p className="text-sm text-slate-500">AI로 사실관계를 1차 정리한 '준비된 의뢰인'을 매칭하여 업무 생산성을 극대화합니다.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full">
              <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-600/20 rounded-full blur-3xl" />
                <h3 className="text-2xl font-bold font-serif">지금 바로 파트너로<br />함께하세요</h3>
                <p className="text-slate-400 text-sm">솔로로는 변호사법을 준수하며 전문가와 상생하는 생태계를 만듭니다.</p>
                <button className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-900/20">
                  전문가 등록 문의하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 text-center space-y-8">
        <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] font-serif whitespace-pre-line px-4">
          {aboutCtaText}
        </h2>
        <button 
          onClick={onBack}
          className="px-12 py-5 bg-brand-600 text-white rounded-2xl font-bold text-lg hover:bg-brand-700 transition-all shadow-xl shadow-brand-100"
        >
          서비스 이용하기
        </button>
      </section>
    </div>
  );
}
