import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Save, Image as ImageIcon, Camera, Loader2, Check, AlertCircle, Type, Info, Palette, Sparkles, Wrench, Plus, Trash2, Gem, Zap, Users, ShieldCheck, Scale, FileText, Gavel, Heart } from 'lucide-react';
import { db, doc, getDoc, setDoc, serverTimestamp, handleFirestoreError, OperationType } from '../lib/firebase';

interface ServiceItem {
  title: string;
  desc: string;
  iconName: string;
}

interface ValueItem {
  title: string;
  desc: string;
  icon: string;
}

interface BrandingConfig {
  appName: string;
  appSubtext: string;
  logoUrl: string | null;
  primaryColor: string;
  heroTitle?: string;
  heroDescription?: string;
  heroTitleSize?: number;
  heroTitleFont?: 'serif' | 'sans';
  heroDescriptionSize?: number;
  heroDescriptionFont?: 'serif' | 'sans';
  // About Us Settings
  aboutHeroTitle?: string;
  aboutHeroDescription?: string;
  aboutMissionTitle?: string;
  aboutMissionDescription?: string;
  aboutCtaText?: string;
  // New Sections
  services?: ServiceItem[];
  values?: ValueItem[];
}

export const BrandingSettings: React.FC = () => {
  const [config, setConfig] = useState<BrandingConfig>({
    appName: 'SoloLaw',
    appSubtext: 'SoloLaw Assistant',
    logoUrl: null,
    primaryColor: '#2563EB',
    heroTitle: '어렵고 복잡한 법률 절차,\n이제 SoloLaw AI가 해결해 드립니다.',
    heroDescription: '변호사 없이도 완벽하게. 일상어로 설명하면 전문가 수준의 법률 문서를 즉시 생성합니다.\n지금 바로 등록하고 당신만의 스마트한 법률 도우미를 만나보세요.',
    heroTitleSize: 60,
    heroTitleFont: 'serif',
    heroDescriptionSize: 18,
    heroDescriptionFont: 'sans',
    aboutHeroTitle: '법은 멀고 비용은 높지만,\nSoloLaw는 당신 곁에 있습니다.',
    aboutHeroDescription: "SoloLaw는 복잡한 법 절차와 높은 수임료 장벽 앞에서 망설이는 '나홀로 소송족'을 위한 AI 법률 서류 작성 보조 플랫폼입니다.\n우리는 누구나 법적 권리를 정당하게 보호받을 수 있도록, 기술을 통해 법률 서비스의 문턱을 낮춥니다.",
    aboutMissionTitle: '법률 서비스의 민주화와\n정보 비대칭 해소',
    aboutMissionDescription: '전문가의 도움 없이는 시작조차 어렵던 소송 절차를 AI 기술로 자동화하여, 누구나 합리적인 비용으로 완결성 있는 법률 문서를 작성할 수 있는 환경을 만듭니다.',
    aboutCtaText: '"혼자 하는 소송, 하지만 결코 혼자가 아닙니다.\n당신의 법적 여정에 SoloLaw가 함께하겠습니다."',
    services: [
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
    ],
    values: [
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
    ]
  });

  const handleAddService = () => {
    setConfig(prev => ({
      ...prev,
      services: [...(prev.services || []), { title: '', desc: '', iconName: 'Zap' }]
    }));
  };

  const handleRemoveService = (index: number) => {
    setConfig(prev => ({
      ...prev,
      services: (prev.services || []).filter((_, i) => i !== index)
    }));
  };

  const handleUpdateService = (index: number, field: keyof ServiceItem, value: string) => {
    setConfig(prev => {
      const newServices = [...(prev.services || [])];
      newServices[index] = { ...newServices[index], [field]: value };
      return { ...prev, services: newServices };
    });
  };

  const handleAddValue = () => {
    setConfig(prev => ({
      ...prev,
      values: [...(prev.values || []), { title: '', desc: '', icon: '✨' }]
    }));
  };

  const handleRemoveValue = (index: number) => {
    setConfig(prev => ({
      ...prev,
      values: (prev.values || []).filter((_, i) => i !== index)
    }));
  };

  const handleUpdateValue = (index: number, field: keyof ValueItem, value: string) => {
    setConfig(prev => {
      const newValues = [...(prev.values || [])];
      newValues[index] = { ...newValues[index], [field]: value };
      return { ...prev, values: newValues };
    });
  };
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadBranding() {
      try {
        const docRef = doc(db, 'app_settings', 'branding');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        console.error("Error loading branding config:", error);
        if (error instanceof Error && error.message.includes('permission')) {
          handleFirestoreError(error, OperationType.GET, 'app_settings/branding');
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadBranding();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) {
      alert('로고 크기가 너무 큽니다. 800KB 이하의 사진을 선택해 주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setConfig(prev => ({ ...prev, logoUrl: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'app_settings', 'branding');
      await setDoc(docRef, {
        ...config,
        updatedAt: serverTimestamp()
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      
      // Notify other parts of the app
      window.dispatchEvent(new CustomEvent('branding-updated'));
    } catch (error) {
      console.error("Error saving branding config:", error);
      if (error instanceof Error && error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.WRITE, 'app_settings/branding');
      } else {
        alert('저장 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
        <p className="text-slate-500 font-medium">브랜딩 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-600 rounded-2xl shadow-lg shadow-brand-100">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#0F172A] font-serif">앱 브랜딩 관리</h3>
              <p className="text-sm text-slate-500 mt-1">플랫폼 전체의 로고, 명칭, 테마 컬러를 설정합니다.</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Logo Upload */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative group">
              <div className="w-40 h-40 rounded-[2.5rem] bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-300 shadow-inner">
                {config.logoUrl ? (
                  <img src={config.logoUrl} alt="App Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-slate-300" />
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-4 bg-brand-600 text-white rounded-2xl shadow-xl hover:bg-brand-700 transition-all hover:scale-110"
              >
                <Camera className="w-6 h-6" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleLogoChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700">애플리케이션 로고</p>
              <p className="text-[11px] text-slate-400 mt-1">권장 사이즈: 512x512px (PNG, JPG)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Type className="w-4 h-4 text-brand-600" /> 애플리케이션 명칭
              </label>
              <input 
                type="text"
                value={config.appName}
                onChange={(e) => setConfig(prev => ({ ...prev, appName: e.target.value }))}
                placeholder="예: SoloLaw"
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-sm font-medium"
              />
              <p className="text-[11px] text-slate-400 flex items-center gap-1 ml-1">
                <Info className="w-3 h-3" /> 헤더와 푸터에 표시될 메인 브랜드 이름입니다.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Type className="w-4 h-4 text-brand-600" /> 서브텍스트 (슬로건)
              </label>
              <input 
                type="text"
                value={config.appSubtext}
                onChange={(e) => setConfig(prev => ({ ...prev, appSubtext: e.target.value }))}
                placeholder="예: 나홀로소송 도우미"
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-sm font-medium"
              />
              <p className="text-[11px] text-slate-400 flex items-center gap-1 ml-1">
                <Info className="w-3 h-3" /> 로고 하단에 표시될 보조 설명 문구입니다.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-900">주의사항</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                브랜딩 정보 변경 시 모든 사용자에게 즉시 반영됩니다. 로고 이미지는 800KB 이하의 고해상도 이미지를 권장합니다.
              </p>
            </div>
          </div>

          {/* Hero Section Settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-600" /> 메인 히어로 섹션 설정
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">메인 타이틀</label>
            <textarea 
              value={config.heroTitle || ''}
              onChange={(e) => setConfig({ ...config, heroTitle: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all h-24 resize-none"
              placeholder="메인 타이틀을 입력하세요 (줄바꿈 가능)"
            />
            <p className="text-xs text-slate-400 mt-1">'SoloLaw AI' 텍스트는 자동으로 강조 색상이 적용됩니다.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">타이틀 글자 크기 (px)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="32" 
                  max="120" 
                  value={config.heroTitleSize || 60}
                  onChange={(e) => setConfig({ ...config, heroTitleSize: parseInt(e.target.value) })}
                  className="flex-1 accent-brand-600"
                />
                <span className="text-sm font-bold text-slate-900 w-12">{config.heroTitleSize || 60}px</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">타이틀 글꼴</label>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setConfig({ ...config, heroTitleFont: 'serif' })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${config.heroTitleFont === 'serif' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  명조체 (Serif)
                </button>
                <button
                  onClick={() => setConfig({ ...config, heroTitleFont: 'sans' })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${config.heroTitleFont === 'sans' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  고딕체 (Sans)
                </button>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">상세 설명</label>
            <textarea 
              value={config.heroDescription || ''}
              onChange={(e) => setConfig({ ...config, heroDescription: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all h-32 resize-none"
              placeholder="상세 설명을 입력하세요 (줄바꿈 가능)"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">설명 글자 크기 (px)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="12" 
                  max="32" 
                  value={config.heroDescriptionSize || 18}
                  onChange={(e) => setConfig({ ...config, heroDescriptionSize: parseInt(e.target.value) })}
                  className="flex-1 accent-brand-600"
                />
                <span className="text-sm font-bold text-slate-900 w-12">{config.heroDescriptionSize || 18}px</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">설명 글꼴</label>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setConfig({ ...config, heroDescriptionFont: 'serif' })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${config.heroDescriptionFont === 'serif' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  명조체 (Serif)
                </button>
                <button
                  onClick={() => setConfig({ ...config, heroDescriptionFont: 'sans' })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${config.heroDescriptionFont === 'sans' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  고딕체 (Sans)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Us Section Settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Info className="w-5 h-5 text-brand-600" /> 회사 소개 (About Us) 설정
        </h3>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">회사 소개 히어로 타이틀</label>
              <textarea 
                value={config.aboutHeroTitle || ''}
                onChange={(e) => setConfig({ ...config, aboutHeroTitle: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all h-24 resize-none"
                placeholder="회사 소개 페이지의 메인 타이틀을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">회사 소개 히어로 설명</label>
              <textarea 
                value={config.aboutHeroDescription || ''}
                onChange={(e) => setConfig({ ...config, aboutHeroDescription: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all h-32 resize-none"
                placeholder="회사 소개 페이지의 메인 설명을 입력하세요"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">미션 타이틀</label>
              <textarea 
                value={config.aboutMissionTitle || ''}
                onChange={(e) => setConfig({ ...config, aboutMissionTitle: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all h-20 resize-none"
                placeholder="회사의 미션 타이틀을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">미션 상세 설명</label>
              <textarea 
                value={config.aboutMissionDescription || ''}
                onChange={(e) => setConfig({ ...config, aboutMissionDescription: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all h-24 resize-none"
                placeholder="회사의 미션에 대한 상세 설명을 입력하세요"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">하단 CTA 문구</label>
            <textarea 
              value={config.aboutCtaText || ''}
              onChange={(e) => setConfig({ ...config, aboutCtaText: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all h-24 resize-none"
              placeholder="페이지 하단에 표시될 강조 문구를 입력하세요"
            />
          </div>
        </div>
      </div>

      {/* Main Services Settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-brand-600" /> 주요 서비스 설정
          </h3>
          <button 
            onClick={handleAddService}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-lg text-xs font-bold hover:bg-brand-100 transition-all"
          >
            <Plus className="w-4 h-4" /> 서비스 추가
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(config.services || []).map((service, index) => (
            <div key={`service-${index}`} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3 relative group">
              <button 
                onClick={() => handleRemoveService(index)}
                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">아이콘</label>
                  <select 
                    value={service.iconName}
                    onChange={(e) => handleUpdateService(index, 'iconName', e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="Zap">Zap</option>
                    <option value="Users">Users</option>
                    <option value="ShieldCheck">Shield</option>
                    <option value="Scale">Scale</option>
                    <option value="FileText">File</option>
                    <option value="Gavel">Gavel</option>
                    <option value="Heart">Heart</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">서비스명</label>
                  <input 
                    type="text"
                    value={service.title}
                    onChange={(e) => handleUpdateService(index, 'title', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="서비스 제목"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">설명</label>
                <textarea 
                  value={service.desc}
                  onChange={(e) => handleUpdateService(index, 'desc', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 outline-none h-20 resize-none"
                  placeholder="서비스 상세 설명"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Core Values Settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Gem className="w-5 h-5 text-brand-600" /> 핵심 가치 설정
          </h3>
          <button 
            onClick={handleAddValue}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-lg text-xs font-bold hover:bg-brand-100 transition-all"
          >
            <Plus className="w-4 h-4" /> 가치 추가
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(config.values || []).map((value, index) => (
            <div key={`value-${index}`} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3 relative group">
              <button 
                onClick={() => handleRemoveValue(index)}
                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex gap-3">
                <div className="w-12">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">이모지</label>
                  <input 
                    type="text"
                    value={value.icon}
                    onChange={(e) => handleUpdateValue(index, 'icon', e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-center text-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="🤝"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">가치명</label>
                  <input 
                    type="text"
                    value={value.title}
                    onChange={(e) => handleUpdateValue(index, 'title', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="가치 제목"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">설명</label>
                <textarea 
                  value={value.desc}
                  onChange={(e) => handleUpdateValue(index, 'desc', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 outline-none h-20 resize-none"
                  placeholder="가치 상세 설명"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-10 py-4 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-all shadow-xl shadow-brand-100 flex items-center gap-3 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSaved ? (
                <Check className="w-5 h-5" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isSaving ? '저장 중...' : isSaved ? '저장 완료' : '브랜딩 설정 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingSettings;
