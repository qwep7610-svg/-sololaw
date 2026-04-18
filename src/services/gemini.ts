import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Simple in-memory cache to reduce redundant API calls
const apiCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function withRetry<T>(
  modelName: string,
  params: any,
  cacheKey?: string,
  maxRetries = 12,
  userId?: string
): Promise<any> {
  // 1. Enforce App-level User Quota if userId is provided
  if (userId) {
    try {
      const quotaRes = await fetch("/api/usage/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      
      if (quotaRes.status === 429) {
        const errorData = await quotaRes.json();
        throw new Error(errorData.message || "일일 AI 사용량을 초과했습니다.");
      }
      
      if (!quotaRes.ok) {
        console.warn("Usage tracking failed, but allowing request to proceed.");
      }
    } catch (e: any) {
      if (e.message.includes("사용량")) throw e;
      console.error("Quota check side-error:", e);
    }
  }

  if (cacheKey) {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result;
    }
  }

  let lastError: any;
  let currentModel = modelName;
  
  // Map to standard model aliases supported by the platform
  if (currentModel.includes("pro")) {
    currentModel = "gemini-3.1-pro-preview";
  } else {
    currentModel = "gemini-3-flash-preview";
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Fallback logic to bypass potential rate limits
      if (i >= 4) {
        if (currentModel === "gemini-3.1-pro-preview") {
          currentModel = "gemini-3-flash-preview";
          console.warn(`Switching to fallback model: ${currentModel} (from Pro) due to persistent rate limits.`);
        }
      }

      // Normalize params for the official SDK @google/genai
      let contents = params;
      if (typeof params === 'object' && params.contents) {
        contents = params.contents;
      }

      const result = await ai.models.generateContent({
        model: currentModel,
        contents: contents
      });

      const text = result.text || "";

      const finalResult = {
        ...result,
        text: text,
      };

      if (cacheKey) {
        apiCache.set(cacheKey, { result: finalResult, timestamp: Date.now() });
      }
      return finalResult;
    } catch (error: any) {
      lastError = error;
      const errorStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
      const isRateLimit = error.status === 429 || 
                          error.message?.includes("429") || 
                          error.message?.includes("RESOURCE_EXHAUSTED") ||
                          errorStr.includes("429") ||
                          errorStr.includes("RESOURCE_EXHAUSTED");
      
      const isQuota = error.message?.toLowerCase().includes("quota") || errorStr.toLowerCase().includes("quota");
      const isDailyQuota = isQuota && (error.message?.toLowerCase().includes("daily") || errorStr.toLowerCase().includes("daily"));
      
      if (isRateLimit && !isDailyQuota && i < maxRetries - 1) {
        // Exponential backoff: 2s, 4s, 8s, 16s, 32s...
        const delay = Math.pow(2, i) * 2000 + Math.random() * 1000;
        console.warn(`Gemini API rate limit hit (${currentModel}). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (isRateLimit) {
        if (isDailyQuota) {
          throw new Error("오늘 사용 가능한 AI 서비스 할당량이 모두 소진되었습니다. 내일 다시 이용해 주세요. (Daily Quota Exceeded)");
        }
        throw new Error("현재 접속자가 많아 AI 응답이 지연되고 있습니다. 약 1~2분 후 다시 시도해 주시면 정상적으로 이용 가능합니다. (Rate Limit Exceeded)");
      }
      
      throw error;
    }
  }
  throw lastError;
}

async function safeGenerate(model: string, params: any, cacheKey?: string, userId?: string) {
  return withRetry(model, params, cacheKey, 12, userId);
}

export async function generateComplaint(data: {
  type?: string;
  relationship: string;
  summary: string;
  amount: string;
  evidence: string;
}, userId?: string) {
  const prompt = `
[Role]
당신은 대한민국 민사소송 전문 법률 비서입니다. 사용자의 일상적인 언어를 법률적인 용어로 재구성하여 법원에 제출 가능한 수준의 소장 초안을 작성합니다.

[Input Data]
원고/피고 관계: ${data.relationship}
사건 개요: ${data.summary}
청구 금액: ${data.amount}
핵심 증거: ${data.evidence}

[Task Instructions]
청구취지: 법적 형식에 맞춰 정확히 작성하십시오. (예: 피고는 원고에게 금 000원을 지급하라. 지연손해금 포함)
청구원인: 다음의 소송 구조에 맞춰 논리적으로 서술하십시오.
1. 당사자들의 관계
2. 사건의 경위 (시간 순서)
3. 피고의 책임 및 의무 (법적 근거 언급)
4. 결론 (재판부에 요청하는 바)

입증방법: 사용자가 제시한 증거를 '갑 제1호증' 등으로 번호를 매겨 정리하십시오.

주의사항: 법률 용어(예: 최고, 변제, 부당이득 등)를 적절히 사용하되, 문장은 명확하고 간결해야 합니다.

[Output Format]
소장 양식에 맞춰 제목, 당사자, 청구취지, 청구원인 순으로 출력하세요. 마크다운 형식을 사용하세요.
마지막에 '### 💡 SoloLaw 소송 팁' 섹션을 추가하여 해당 소송에서 유의할 점을 조언하세요.
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  }, undefined, userId);

  return response.text;
}

export async function extractComplaintInfo(story: string) {
  const prompt = `
당신은 법률 상담 보조 AI입니다. 사용자가 일상어로 작성한 사연에서 소장 작성에 필요한 핵심 정보를 추출하세요.

[User Story]
${story}

[Output Format (JSON)]
{
  "type": "소송 유형 (민사, 가사, 행정 등)",
  "relationship": "당사자 관계",
  "summary": "사건 개요 (법률적 쟁점 중심)",
  "amount": "청구 금액 (숫자와 단위 명시)",
  "evidence": "보유 증거 목록"
}
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  try {
    const text = response.text.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse extracted info:", e);
    return null;
  }
}

export async function summarizeDocument(input: { text?: string; file?: { data: string; mimeType: string } }, userId?: string) {
  const prompt = `
[Role]
당신은 복잡한 법률 문서를 초등학생도 이해할 수 있게 설명해주는 '법률 문해력 도우미'입니다.

[Task]
입력된 법률 문서(판결문, 답변서, 공문 등)를 분석하여 아래 3가지 항목으로 요약하십시오.

[Format]
핵심 요약: 이 문서의 결론이 무엇인가? (한 문장)
사용자의 유불리: 이 문서가 사용자에게 유리한가, 불리한가? 그 이유는?
다음 행동 가이드: 사용자가 지금 당장 해야 할 일은 무엇인가? (예: 2주 내로 항소장 제출, 증거 보완 등)

[Tone]
권위적인 태도를 버리고 친절하고 차분하게 설명하세요.
어려운 한자어 법률 용어는 괄호를 치고 쉬운 우리말로 풀이하세요.
`;

  const contents: any[] = [{ text: prompt }];
  
  if (input.text) {
    contents.push({ text: `[Document Text]\n${input.text}` });
  }
  
  if (input.file) {
    contents.push({
      inlineData: {
        data: input.file.data,
        mimeType: input.file.mimeType,
      },
    });
  }

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: { parts: contents },
  }, undefined, userId);

  return response.text;
}

export async function analyzeCorrectionOrder(input: { text?: string; file?: { data: string; mimeType: string } }, userId?: string) {
  const prompt = `
[Role]
당신은 대한민국 법원의 '보정명령'을 정밀 분석하고 실질적인 대응 방안을 제시하는 법률 실무 전문가이자 AI 법률 조력자입니다.
사용자는 법원으로부터 서류 보완 지시(보정명령)를 받고 당황한 상태입니다. 

[Context]
사용자가 업로드한 보정명령서(이미지, PDF) 또는 직접 입력한 텍스트를 분석하여, 법원이 요구하는 정확한 '조치'와 '기한 내 대응 방법'을 안내해야 합니다.

[Task Instructions]
1. 보정 이유 정밀 분석: 법원이 무엇을 문제삼고 있는지 전문 용어를 사용하여 명확히 설명하되, 사용자가 이해하기 쉽게 풀어서 설명하세요. (예: 당사자 특정 불충분, 소가 산정 오류, 주소 송달 불능 등)
2. 필요한 조치 및 대응 방안: 사용자가 즉시 준비해야 할 서류(주민등록 초본, 사실조회 신청서 등)와 수행해야 할 구체적인 행동 단계를 제시하세요. 보정 기한(7일 등)을 반드시 확인하고 강조하세요.
3. 법적 리스크 경고: 보정 명령을 이행하지 않을 경우 발생할 수 있는 불익(소장 각하, 재판 지연 등)을 안내하세요.
4. 보정서 초안 자동 완성: 법원에 바로 제출할 수 있을 수준의 '보정서' 초안을 작성하여 마크다운 코드 블록으로 제공하세요.

[Output Format]
반드시 아래 형식을 유지하십시오.

## 🔍 보정 명령 분석 결과
- **법원의 지적 사항**: [법원이 지적한 핵심 내용]
- **명령이 나온 원인**: [왜 이런 명령이 나왔는지 실제 법률 실무 관점에서의 설명]
- **보정 기한**: [명령서에 명시된 기한, 없으면 '명령을 받은 날로부터 7일 이내'로 안내]

## 🛠️ 해결 방법 (Step-by-Step)
1. **[1단계 조치]**: [구체적인 설명]
2. **[2단계 조치]**: [구체적인 설명]
3. **[대응 소요 시간]**: [예상되는 준비 시간]

## 📝 보정서 초안
\`\`\`
[사건번호, 당사자 정보, 보정 내용 등을 포함한 법적 형식의 보정서 초안]
\`\`\`

## 💡 전문가 팁
[실무상 주의사항이나 더 빠른 해결을 위한 노하우 한 줄]

[Tone]
침착하고 든든한 조력자처럼 느껴지도록 상냥하면서도 단호하게 안내하세요.
`;

  const contents: any[] = [{ text: prompt }];
  
  if (input.text) {
    contents.push({ text: `[Correction Order Text]\n${input.text}` });
  }
  
  if (input.file) {
    contents.push({
      inlineData: {
        data: input.file.data,
        mimeType: input.file.mimeType,
      },
    });
  }

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: { parts: contents },
  }, undefined, userId);

  return response.text;
}

export async function analyzeExhibits(files: { data: string; mimeType: string; name: string }[]) {
  const prompt = `
[Role]
당신은 대한민국 법원 전자소송의 '증거 정리' 및 '증거설명서' 작성을 돕는 법률 실무 전문가입니다.

[Context]
사용자가 여러 개의 입증 자료(이미지, PDF 등)를 업로드했습니다. 
당신은 이 자료들을 분석하여 사건의 흐름에 맞게 순서를 정하고, '갑 제N호증'의 번호를 부여한 뒤 '증거설명서' 초안을 작성해야 합니다.

[Task Instructions]
1. 자료 분석: 각 파일의 내용을 분석하여 날짜, 금액, 핵심 내용(예: 계약 조건, 입금 내역, 대화 요지 등)을 추출하세요.
2. 순서 및 번호 부여: 시간 순서 또는 논리적 흐름에 따라 '갑 제1호증', '갑 제2호증' 순으로 번호를 부여하세요. (원고 기준)
3. 증거설명서 작성: 각 증거별로 '증거명', '입증취지(이 증거가 무엇을 증명하는지)'를 포함한 표 형식의 초안을 작성하세요.

[Output Format]
## 📂 증거 목록 및 번호 부여
1. **갑 제1호증**: [증거명] (날짜: YYYY-MM-DD)
2. **갑 제2호증**: [증거명] (날짜: YYYY-MM-DD)
...

## 📝 증거설명서 초안
| 증거번호 | 증거명 | 입증취지 |
| :--- | :--- | :--- |
| 갑 제1호증 | [증거명] | [이 증거를 통해 증명하고자 하는 사실을 구체적으로 기술] |
| 갑 제2호증 | [증거명] | [이 증거를 통해 증명하고자 하는 사실을 구체적으로 기술] |

[Tone]
정확하고 신뢰감 있는 법률 전문가의 어조를 유지하세요.
`;

  const contents: any[] = [{ text: prompt }];
  
  files.forEach(file => {
    contents.push({
      inlineData: {
        data: file.data,
        mimeType: file.mimeType,
      },
    });
    contents.push({ text: `[File Name: ${file.name}]` });
  });

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: { parts: contents },
  });

  return response.text;
}

export async function predictOutcome(data: {
  claims: string;
  evidence: string;
  amount: string;
  file?: { data: string; mimeType: string };
}) {
  const prompt = `
[Role]
당신은 대한민국 민사소송 판례 5만 건을 학습한 AI 법률 분석가입니다. 
사용자의 주장과 증거를 바탕으로 승소 확률, 예상 인용 금액, 그리고 전략적 조언을 제공합니다.

[Input Data]
- 사용자의 주장: ${data.claims}
- 보유한 증거: ${data.evidence}
- 청구 금액: ${data.amount}
${data.file ? "- 첨부된 문서 내용: (업로드된 파일 분석 결과 포함)" : ""}

[Task Instructions]
1. 승소 확률 분석: 유사 판례를 바탕으로 승소 가능성을 0~100% 사이의 숫자로 추정하세요.
2. 예상 인용 금액: 청구 금액 대비 실제로 법원에서 인정될 가능성이 높은 금액 범위를 제시하세요.
3. 전략적 조언: 현재 부족한 부분이나 보완해야 할 증거, 신청해야 할 절차(사실조회, 감정 등)를 매우 구체적이고 실행 가능하게(Actionable) 제언하세요. 예를 들어, 단순히 "증거가 부족합니다"라고 하지 말고 "상대방과의 계좌 이체 내역이나 당시 상황이 담긴 카카오톡 대화 캡처본을 확보하여 제출하십시오"와 같이 구체적인 문서 종류나 행동을 지시하십시오.

[Output Format]
JSON 형식으로 출력하세요. (마크다운 코드 블록 없이 순수 JSON만 출력)
{
  "probability": number,
  "expectedAmount": "string (예: 500만원 ~ 700만원)",
  "analysis": "string (상세 분석 내용)",
  "strategy": ["string", "string", ...],
  "references": [
    { "title": "string", "url": "string", "description": "string" }
  ]
}

[Tone]
객관적이고 냉철하면서도, 사용자가 실질적인 도움을 얻을 수 있도록 구체적으로 작성하세요.
`;

  const contents: any[] = [{ text: prompt }];
  
  if (data.file) {
    contents.push({
      inlineData: {
        data: data.file.data,
        mimeType: data.file.mimeType,
      },
    });
  }

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: { parts: contents },
  });

  try {
    // Attempt to parse JSON from the response
    const text = response.text.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", e);
    return {
      probability: 50,
      expectedAmount: "분석 불가",
      analysis: response.text,
      strategy: ["증거를 더 구체적으로 입력해 주세요."]
    };
  }
}

export async function generateAdminAppeal(data: {
  appellant: string;
  respondent: string;
  disposition: string;
  noticeDate: string;
  purpose: string;
  reason: string;
}) {
  const cacheKey = `admin_${data.disposition}_${data.reason}`;
  const prompt = `
[Role]
당신은 행정심판 사건을 전문으로 다루는 법률 조력자입니다. 사용자가 받은 행정처분의 부당함을 논리적으로 소명하여 '행정심판청구서' 및 '집행정지 신청서' 초안을 작성합니다.

[Input Data]
- 청구인 정보: ${data.appellant}
- 피청구인: ${data.respondent}
- 처분 내용: ${data.disposition}
- 처분이 있음을 안 날: ${data.noticeDate}
- 청구 취지: ${data.purpose}
- 청구 원인(억울한 사정): ${data.reason}

[Task Instructions]
1. 행정심판청구서 작성:
   - 사건의 경위: 처분이 발생하게 된 배경을 객관적으로 서술하세요.
   - 위법·부당성 소명: '비례의 원칙(가혹함)', '신뢰보호의 원칙', '사실오인' 등의 법적 용어를 사용하여 세분화하세요.
   - 생계형 위반이거나 고의성이 없음을 강조하는 문구를 포함하세요.
   - 결론: 청구인의 간절함과 처분의 가혹함을 다시 한번 언급하며 청구의 인용을 요청하세요.
2. 집행정지 신청서 작성:
   - 처분의 집행으로 인하여 생길 '회복하기 어려운 손해'를 예방하기 위한 긴급한 필요가 있음을 강조하세요.
   - 공공복리에 중대한 영향을 미칠 우려가 없음을 명시하세요.

[Output Format]
마크다운 형식을 사용하여 '행정심판청구서'와 '집행정지 신청서'를 구분하여 출력하십시오.
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  }, cacheKey);

  return response.text;
}

export async function analyzeAdminNotice(file: { data: string; mimeType: string }) {
  const prompt = `
[Role]
당신은 행정처분 통지서를 분석하여 청구 기한을 계산하고 핵심 내용을 요약하는 법률 비서입니다.

[Task Instructions]
1. 처분일/통지일 추출: 문서에서 처분이 있었던 날짜 또는 통지서를 받은 날짜를 찾으세요.
2. 청구 기한 계산: 처분이 있음을 안 날로부터 90일 이내에 행정심판을 청구해야 함을 알리고, 정확한 마감 날짜를 계산해 주세요.
3. 처분 내용 요약: 어떤 처분이 내려졌는지 핵심만 요약하세요.
4. 감경 가능성 제언: 유사한 사례에서 감경된 판례나 논리를 간단히 언급하세요.

[Output Format]
JSON 형식으로 출력하세요.
{
  "noticeDate": "YYYY-MM-DD",
  "deadlineDate": "YYYY-MM-DD",
  "dispositionSummary": "string",
  "reductionAdvice": "string"
}
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: file.data, mimeType: file.mimeType } }
      ]
    },
  });

  try {
    const text = response.text.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", e);
    return null;
  }
}

export async function generateDemandLetter(data: {
  sender: string;
  receiver: string;
  title: string;
  context: string;
  requirement: string;
  consequence: string;
}) {
  const cacheKey = `demand_${data.title}_${data.context}`;
  const prompt = `
[Role]
당신은 분쟁 해결 전문 법률 비서입니다. 사용자의 요구사항을 법적으로 정제하여, 상대방에게 심리적 압박과 법적 경고를 동시에 전달하는 '내용증명서'를 작성합니다.

[Input Data]
- 발신인: ${data.sender}
- 수신인: ${data.receiver}
- 사건 제목: ${data.title}
- 사건 경위: ${data.context}
- 요구 사항: ${data.requirement}
- 미이행 시 조치: ${data.consequence}

[Task Instructions]
1. 사실관계 정리: 육하원칙에 따라 명확하고 객관적으로 서술하십시오.
2. 법적 근거 제시: 상대방의 행위가 어떤 계약 위반이나 법적 책임이 있는지 언급하십시오.
3. 최후통첩: 요구사항 이행 기한을 명시하고, 기한 내 미이행 시 발생할 불이익(변호사 비용 청구, 소송 비용 부담 등)을 강력히 경고하십시오.
4. 톤앤매너: 정중하지만 단호하고, 감정적인 호소보다는 논리적인 압박에 집중하십시오.

[Output Format]
표준 내용증명 양식(제목, 수신/발신인, 본문, 날짜, 발신인 성함)으로 출력하십시오. 마크다운 형식을 사용하세요.
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  }, cacheKey);

  return response.text;
}

export async function generateDivorceDocument(data: {
  type: 'property' | 'alimony';
  marriageDuration?: string;
  children?: string;
  plaintiffRole?: string;
  defendantRole?: string;
  supportAmount?: string;
  infidelityDuration?: string;
  evidence?: string;
  medicalRecord?: string;
  customContext?: string;
  faultType?: string;
  faultDetails?: string;
  impactDetails?: string;
  financialContribution?: string[];
  nonFinancialContribution?: string[];
}) {
  let prompt = '';

  if (data.type === 'property') {
    prompt = `
[Role]
당신은 이혼 전문 변호사로서 원고(또는 피고)의 재산 형성에 대한 기여도를 법리적으로 주장하는 소명서를 작성합니다.

[Input Data]
- 혼인 기간: ${data.marriageDuration}
- 자녀: ${data.children}
- 경제적 기여 항목: ${data.financialContribution?.join(', ') || '미입력'}
- 비경제적 기여 항목: ${data.nonFinancialContribution?.join(', ') || '미입력'}
- 원고 역할: ${data.plaintiffRole}
- 피고 역할: ${data.defendantRole}
- 부모님 지원금 등 특이사항: ${data.supportAmount}
- 추가 맥락: ${data.customContext}

[Task Instructions]
1. 원고가 가사와 육아를 전담하며 피고의 경제 활동을 내조한 점을 강조하십시오. 특히 선택된 비경제적 기여 항목들을 구체적으로 언급하세요.
2. 경제적 기여 항목(근로소득, 상속, 투자 등)이 재산 형성에 결정적인 역할을 했음을 법리적으로 서술하십시오.
3. 원고 부모님의 지원금이 있다면 이를 '특유재산의 유지 및 증식' 관점에서 서술하십시오.
4. 최근 판례를 인용하여 전업주부의 기여도가 50%에 달해야 함을 논리적으로 구성하십시오.
5. 차분하고 공감하면서도 법리적으로는 단호한 어조를 유지하십시오.

[Output Format]
'재산분할 기여도 소명서' 형식으로 출력하십시오. 마크다운을 사용하세요.
`;
  } else {
    const faultTypeMap: any = {
      infidelity: '부정행위 (외도)',
      violence: '부당한 대우 (폭행/폭언)',
      desertion: '악의적 유기',
      other: '기타 중대한 사유'
    };
    
    prompt = `
[Role]
당신은 위자료 청구 소송 전문가입니다. 상대방의 유책 사유로 인한 정신적 고통을 극대화하여 서술하는 위자료 청구서를 작성합니다.

[Input Data]
- 유책 사유 유형: ${faultTypeMap[data.faultType || ''] || '기타'}
- 유책 내용 상세: ${data.faultDetails}
- 피해 상황 상세: ${data.impactDetails}
- 유책 기간: ${data.infidelityDuration}
- 보유 증거: ${data.evidence}
- 정신과 치료 기록: ${data.medicalRecord}
- 추가 맥락: ${data.customContext}

[Task Instructions]
1. 상대방의 ${faultTypeMap[data.faultType || ''] || '유책 행위'}가 혼인 파탄의 주된 원인임을 명확히 하십시오.
2. 유책 행위의 기간, 정도, 발각 후의 태도 등을 구체적으로 서술하여 악의성을 강조하십시오.
3. 원고가 겪은 극심한 정신적/신체적 고통(${data.impactDetails})과 가정 파탄으로 인한 피해를 호소력 있게 작성하십시오.
4. 관련 판례를 인용하여 청구하는 위자료 금액(통상 2,000만원 ~ 5,000만원 범위)의 정당성을 뒷받침하십시오.

[Output Format]
'위자료 청구 소장' 형식으로 출력하십시오. 마크다운을 사용하세요.
`;
  }

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  return response.text;
}

export async function analyzeAssetSplit(data: {
  marriageDuration: string;
  isDoubleIncome: boolean;
  houseworkValue: string;
  houseworkDetails?: {
    careerInterruption: boolean;
    careerInterruptionDuration: string;
    childCareYears: string;
    houseworkRatio: string;
    elderlyCare: boolean;
    majorAssetManagement: boolean;
  };
  preMarriageAssets: string;
  currentAssets: string;
  contributionDetails: string;
  financialContribution?: string[];
  nonFinancialContribution?: string[];
}) {
  const prompt = `
[Role]
당신은 대한민국 이혼 전문 변호사 및 재산분할 분석가입니다. 사용자의 정보를 바탕으로 최근 판례 경향을 반영한 예상 재산분할 비율과 논거를 제시합니다.

[Input Data]
- 혼인 기간: ${data.marriageDuration}
- 맞벌이 여부: ${data.isDoubleIncome ? "맞벌이" : "외벌이"}
- 경제적 기여 항목: ${data.financialContribution?.join(', ') || '미입력'}
- 비경제적 기여 항목: ${data.nonFinancialContribution?.join(', ') || '미입력'}
- 가사 노동 및 육아 상황: ${data.houseworkValue}
${data.houseworkDetails ? `
- 가사 상세 데이터:
  * 경력 단절 여부: ${data.houseworkDetails.careerInterruption ? "예" : "아니오"}
  * 경력 단절 기간: ${data.houseworkDetails.careerInterruptionDuration}
  * 전담 육아 기간: ${data.houseworkDetails.childCareYears}
  * 가사 분담 비율: ${data.houseworkDetails.houseworkRatio}
  * 노부모 부양 여부: ${data.houseworkDetails.elderlyCare ? "예" : "아니오"}
  * 주요 자산 관리(재테크 등) 주도 여부: ${data.houseworkDetails.majorAssetManagement ? "예" : "아니오"}
` : ""}
- 혼인 전 특유재산: ${data.preMarriageAssets}
- 현재 공동 재산 규모: ${data.currentAssets}
- 기타 기여도 상세: ${data.contributionDetails}

[Task Instructions]
1. 예상 분할 비율 산출: 0~100% 사이의 예상 범위를 제시하십시오.
2. 가사 노동 가치 평가: 경력 단절로 인한 기회비용, 장기간의 육아 및 가사 전담이 재산의 유지 및 감소 방지에 기여한 바를 구체적으로 언급하십시오. 특히 선택된 비경제적 기여 항목들을 논거로 활용하세요.
3. 경제적 기여 분석: ${data.financialContribution?.join(', ')} 등 경제적 활동이 공동재산 형성에 미친 영향을 분석하십시오.
4. 특유재산 처리: 혼인 전 재산이 공동재산에 편입되거나 유지/증식에 기여한 바를 분석하십시오.
5. 논거 정리: 법원에서 인정받을 수 있는 핵심 논거 3가지를 정리하십시오.

[Output Format]
JSON 형식으로 출력하세요.
{
  "ratio": "string (예: 45% ~ 55%)",
  "analysis": "string (상세 분석 내용)",
  "precedents": ["string", "string", ...],
  "arguments": ["string", "string", ...],
  "references": [
    { "title": "string", "url": "string", "description": "string" }
  ]
}
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  try {
    const text = response.text.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return null;
  }
}

export async function designParentingPlan(data: {
  combinedIncome: string;
  childAge: string;
  custodyPreference: string;
  visitationPreference: string;
  extraExpenses?: string[];
  extraExpensesAmount?: string;
}) {
  const prompt = `
[Role]
당신은 양육비 산정 및 면접교섭 설계 전문가입니다. 2021년 양육비 산정 기준표를 바탕으로 표준 양육비를 계산하고, 부모와 자녀를 위한 최적의 면접교섭 일정을 설계합니다.

[Input Data]
- 부모 합산 소득: ${data.combinedIncome}
- 자녀 연령: ${data.childAge}
- 추가 비용 항목: ${data.extraExpenses?.join(', ') || '없음'}
- 추가 비용 금액: ${data.extraExpensesAmount || '0원'}
- 양육권 희망 사항: ${data.custodyPreference}
- 면접교섭 희망 사항: ${data.visitationPreference}

[Task Instructions]
1. 표준 양육비 계산: 산정 기준표에 따른 구간별 표준 양육비를 제시하십시오.
2. 가산/감산 요소 반영: 사용자가 입력한 추가 비용(${data.extraExpenses?.join(', ')})을 고려하여 최종 양육비를 조정하십시오. (예: 고액 교육비나 의료비는 가산 요소임)
3. 공동 양육 캘린더 설계: 방학, 명절, 생일 등 구체적인 면접교섭 일정을 포함한 캘린더 초안을 텍스트 형식으로 작성하십시오.
4. 양육비 분담 비율: 부모 각자의 소득 비율에 따른 분담액을 계산하십시오.

[Output Format]
JSON 형식으로 출력하세요.
{
  "standardFee": "string (예: 월 120만원)",
  "myShare": "string (예: 월 60만원)",
  "calendarDraft": "string (Markdown format)",
  "advice": "string (추가 비용 반영에 대한 법적 조언 포함)",
  "references": [
    { "title": "string", "url": "string", "description": "string" }
  ]
}
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  try {
    const text = response.text.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return null;
  }
}

export async function analyzeFaultEvidence(input: { text?: string; file?: { data: string; mimeType: string } }) {
  const prompt = `
[Role]
당신은 대한민국 민법 제840조(재판상 이혼사유) 전문 분석가입니다. 사용자가 제시한 증거(카톡, 사진, 녹취록 등)를 분석하여 법적 이혼 사유에 해당하는지 판단합니다.

[Task Instructions]
1. 이혼 사유 매칭: 민법 제840조 각 호(1호 부정행위, 3호 부당한 대우, 6호 기타 중대한 사유 등) 중 어디에 해당하는지 명시하십시오.
2. 증거 가치 평가: 해당 증거가 법정에서 어느 정도의 효력을 가질지 분석하십시오.
3. 법적 가이드: "이 대화 내용은 민법 제840조 제6호(기타 혼인을 계속하기 어려운 중대한 사유)에 해당할 가능성이 높습니다"와 같이 구체적으로 짚어주십시오.
4. 주의사항: 불법 증거 수집(도청 등)의 위험성을 반드시 경고하십시오.

[Output Format]
마크다운 형식을 사용하여 분석 보고서 형태로 출력하십시오.
`;

  const contents: any[] = [{ text: prompt }];
  if (input.text) contents.push({ text: `[Evidence Text]\n${input.text}` });
  if (input.file) contents.push({ inlineData: { data: input.file.data, mimeType: input.file.mimeType } });

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: { parts: contents },
  });

  return response.text;
}

export async function generateMediationAgreement(data: {
  propertyAgreement: string;
  custodyAgreement: string;
  alimonyAgreement: string;
  specialTerms: string;
}) {
  const prompt = `
[Role]
당신은 감정 케어 기반의 이혼 조정 전문 위원입니다. 격한 소송 대신 원만한 합의를 원하는 부부를 위해 '이혼 조정 합의서' 초안을 작성합니다.

[Input Data]
- 재산분할 합의 내용: ${data.propertyAgreement}
- 양육권 및 양육비 합의: ${data.custodyAgreement}
- 위자료 합의: ${data.alimonyAgreement}
- 기타 특약 사항: ${data.specialTerms}

[Task Instructions]
1. 법적 효력 확보: 합의 내용이 추후 집행력을 가질 수 있도록 법률적 용어로 정제하십시오.
2. 감정적 배려: 문구 선택에 있어 서로의 감정을 자극하지 않고 미래지향적인 관계(특히 자녀를 위한 부모로서의 관계)를 유지할 수 있도록 배려하십시오.
3. 포괄적 해결: 향후 발생할 수 있는 분쟁을 예방하기 위한 부제소 합의 조항 등을 포함하십시오.

[Output Format]
표준 '조정 합의서' 양식에 맞춰 마크다운으로 출력하십시오.
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  return response.text;
}

export async function generateMentalCareMessage(data: {
  progress: number;
  deadlines: { title: string; date: string; type: string }[];
}) {
  const prompt = `
[Role]
당신은 나홀로 소송을 진행하며 지치고 불안한 사용자를 위로하고 격려하는 따뜻한 법률 심리 상담가입니다.

[Input Data]
- 소송 진행률: ${data.progress}%
- 다가오는 일정: ${JSON.stringify(data.deadlines)}

[Task Instructions]
1. 현재 소송 진행률과 다가오는 일정을 바탕으로 사용자에게 필요한 위로와 격려의 메시지를 1~2문장으로 짧게 작성하세요.
2. 법률적인 조언보다는 심리적인 안정감을 주는 데 집중하세요.
3. "오늘의 안심 메시지"에 어울리는 따뜻하고 희망적인 어조를 사용하세요.

[Output Format]
메시지 텍스트만 출력하세요. (따옴표나 기타 기호 없이)
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  return response.text.trim();
}

export async function generateLitigationGuide(data: {
  currentStep: string;
  lawsuitType: string;
  progress: number;
}) {
  const prompt = `
[Role]
당신은 대한민국 법률 서비스 'SoloLaw'의 친절한 AI 법률 비서 'SoloLaw 봇'입니다. 
사용자가 현재 소송 관리 대시보드에서 어떤 기능을 사용해야 할지, 그리고 현재 단계에서 무엇을 주의해야 할지 가이드해 줍니다.

[Input Data]
- 현재 단계: ${data.currentStep}
- 소송 유형: ${data.lawsuitType}
- 진행률: ${data.progress}%

[Task Instructions]
1. 현재 단계(${data.currentStep})에서 사용자가 가장 먼저 해야 할 행동을 추천하세요.
2. '소장 작성', '변호사 검토', '서류 요약' 등 SoloLaw의 주요 기능을 어떻게 활용하면 좋을지 설명하세요.
3. 사용자가 당황하지 않도록 차분하고 명확하게 안내하세요.
4. 답변은 3~4개의 불렛 포인트로 간결하게 작성하세요.

[Tone]
친절하고, 전문적이며, 사용자의 편에서 조언하는 따뜻한 비서의 어조를 사용하세요.
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  return response.text;
}

export async function classifyLitigationType(userSituation: string) {
  const prompt = `
## 역할 (Role)
당신은 대한민국 법률 서비스 'SoloLaw'의 지능형 분류 도우미입니다. 사용자가 겪고 있는 억울한 상황이나 분쟁 내용을 분석하여 가장 적합한 소송 유형을 분류하고, 절차의 핵심을 안내합니다.

## 소송 분류 기준 (Classification Rules)
사용자의 입력을 다음 5가지 카테고리 중 하나로 분류하세요.

1. 민사 소송 (Civil): 돈, 부동산, 계약 등 개인 간의 재산권 분쟁
   - 세부: 대여금, 손해배상(교통사고/폭행/명예훼손), 임대차(보증금/명도), 부당이득 등
   - 추천: 3,000만 원 이하일 경우 '소액사건' 안내 / 다툼이 적으면 '지급명령' 안내

2. 가사 소송 (Family): 가족, 친족 간의 법률 관계
   - 세부: 이혼, 재산분할, 위자료, 양육비, 상속(포기/한정승인), 성본 변경 등

3. 민사신청/보전처분 (Application): 판결 전 긴급 조치
   - 세부: 가압류(재산 동결), 가처분(행위 금지/임시 지위 인정) 등

4. 행정 소송 (Administrative): 국가/지방자치단체의 처분에 대한 불복
   - 세부: 영업정지 취소, 조세 불복, 징계 처분 취소 등

5. 형사 절차 (Criminal): 범죄 피해에 대한 처벌 요청
   - 세부: 고소장 작성, 반성문/탄원서 제출 등

## 응답 가이드라인 (Response Guidelines)
1. 분류: 사용자의 상황이 어떤 유형에 해당하는지 명확히 밝힙니다.
2. 핵심 전략: 해당 소송에서 가장 중요한 '입증 자료(증거)'가 무엇인지 조언합니다.
3. 주의사항: "이 답변은 법적 효력이 없으며, 정확한 판단을 위해 변호사와 상담하거나 법률구조공단의 도움을 받으라"는 문구를 반드시 포함합니다.
4. 어조: 법률 용어는 쉽고 친절하게 풀어서 설명하되, 신뢰감 있는 어조를 유지합니다.

## 응답 형식 (Format)
### ⚖️ 추천 소송 유형: [유형명]
- **핵심 요약:** [상황에 대한 법률적 정의]
- **준비할 증거:** [예: 차용증, 계좌이체 내역, 카톡 대화 등]
- **나홀로 팁:** [예: 지급명령을 이용하면 비용과 시간을 아낄 수 있습니다.]

[User Situation]
${userSituation}
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  return response.text;
}

export async function analyzeUserCase(userCaseInput: string) {
  const prompt = `
[Role]
당신은 법률 플랫폼 'SoloLaw'의 지능형 분류 시스템입니다. 사용자의 사건 요약을 바탕으로 가장 적합한 변호사 전문 분야를 결정합니다.

[Context]
사용자 입력 내용: "${userCaseInput}"

[Instructions]
1. 입력된 텍스트에서 법적 쟁점 키워드를 추출하세요.
2. 다음 표준 카테고리 중 가장 일치하는 상위 2개 분야를 선정하세요.
   - [민사] 임대차/보증금, 대여금, 손해배상(교통사고), 부동산, 금전채권
   - [가사] 이혼, 상속, 재산분할, 양육비
   - [형사] 성범죄, 경제범죄(사기/공갈), 교통사고, 명예훼손
   - [기타] 행정처분, 학교폭력, 노동/산재

[Output Format (JSON)]
{
  "primary_category": "분야명",
  "secondary_category": "분야명",
  "keywords": ["키워드1", "키워드2"],
  "reason": "해당 분야를 추천한 이유 요약"
}
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  try {
    const text = response.text.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", e);
    return null;
  }
}

export async function generateMatchingRecommendation(data: {
  userNickname: string;
  primaryCategory: string;
  keywords: string[];
  userLocation?: string;
}) {
  const prompt = `
[Role]
당신은 사용자의 위치 기반으로 적절한 법률 전문가 정보를 제공하는 가이드입니다.

[Task]
사용자가 언급한 지역(${data.userLocation || '전국'})과 추출된 분야(${data.primaryCategory})의 전문가 정보를 안내하는 문구를 작성하세요.

[알선 금지 준수]
1. 특정 변호사를 "강력 추천"하거나 "이분에게 가세요"라고 말하지 마세요.
2. 대신 "해당 지역에서 활동 중인 변호사 정보입니다"라고 객관적으로 소개하세요.

[Output Format]
"선택하신 ${data.userLocation || '전국'} 지역의 [${data.primaryCategory}] 분야 변호사 안내입니다.
특히 **${data.keywords.join(', ')}**와 관련된 이력이 풍부한 아래 파트너 변호사들의 정보를 객관적으로 확인해 보시기 바랍니다."
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  return response.text.trim();
}

export async function generateSettlementReport(data: {
  lawyerName: string;
  count: number;
  totalAmount: number;
  pgFee: number;
  platformFee: number;
  finalSettlement: number;
}) {
  const prompt = `
[Role]
당신은 'SoloLaw' 플랫폼의 재무 관리자입니다. 파트너 변호사에게 한 달간의 솔루션 이용 내역과 정산액을 보고합니다.

[Input]
변호사 성명: ${data.lawyerName}
당월 총 검토 건수: ${data.count}건
총 결제 금액: ${data.totalAmount.toLocaleString()}원

[Output Format]
서비스 요약: 총 ${data.count}건의 법률 문서 검토 솔루션을 이용하셨습니다.
세부 내역:
총 매출: ${data.totalAmount.toLocaleString()}원
전자결제 수수료(원가): ${data.pgFee.toLocaleString()}원
솔루션 시스템 이용료: ${data.platformFee.toLocaleString()}원
최종 정산 금액: ${data.finalSettlement.toLocaleString()}원

안내사항: 본 정산액은 귀하가 사용한 'SoloLaw' IT 솔루션 비용을 공제한 금액입니다. 수임료 중개 수수료를 포함하고 있지 않습니다.
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  return response.text;
}

export async function calculateLitigationCost(data: {
  type: string;
  content: string;
  others: string;
  parties: number;
  isElectronic: boolean;
  instance: string;
}) {
  const prompt = `
[Role]
당신은 법원의 '민사접수공무원'이자 '법률 계산 전문가'입니다. 사용자의 상황을 분석하여 법정 소가(소송물가액)를 산정하고, 인지대와 송달료를 정확히 산출합니다.

[Input Data]
- 소송 유형: ${data.type}
- 심급: ${data.instance}
- 청구 내용: ${data.content}
- 기타 청구: ${data.others}
- 당사자 수: ${data.parties}명 (원고 1명 포함)
- 제출 방식: ${data.isElectronic ? "전자소송" : "종이소송"}

[Task Instructions]
1. 소가 산정:
   - 금전 지급 청구의 경우: 원금 합계액 (이자는 불산입)
   - 건물 인도/명도의 경우: 건물가액(시가표준액) x 1/2 등을 고려한 공식 적용
   - 법적 근거: 민사소송등의 소송비용법 및 관련 규칙에 따른 근거 제시
2. 인지대 계산:
   - 1심 기준:
     - 1천만 원 미만: 소가 x 0.005
     - 1천만 원 이상 ~ 1억 미만: (소가 x 0.0045) + 5,000원
     - 1억 이상 ~ 10억 미만: (소가 x 0.004) + 55,000원
   - 항소심(2심): 1심 인지액의 1.5배
   - 상고심(3심): 1심 인지액의 2배
   - 전자소송 할인(10%) 적용 여부 확인
3. 송달료 계산: 
   - 1심 단독: 당사자 수 x 1회 송달료(5,200원) x 15회분
   - 항소심(2심): 당사자 수 x 1회 송달료(5,200원) x 12회분
   - 상고심(3심): 당사자 수 x 1회 송달료(5,200원) x 8회분
4. 비용 전략 제언:
   - 소가가 3,000만 원 이하인 경우 '소액사건심판법' 적용 안내
   - 승소 시 소송비용 확정결정 신청을 통한 비용 회수 안내
   - 승소 시 상대방으로부터 회수할 수 있는 '법정 변호사 보수' 한도액 계산

[Output Format]
JSON 형식으로 출력하세요. (마크다운 코드 블록 없이 순수 JSON만 출력)
{
  "soga": {
    "amount": number,
    "formula": "string",
    "basis": "string"
  },
  "fees": {
    "stampDuty": {
      "original": number,
      "discounted": number,
      "isElectronic": boolean
    },
    "serviceFee": number,
    "total": number
  },
  "strategy": {
    "isSmallClaim": boolean,
    "advice": "string",
    "recoverableAttorneyFee": "string"
  }
}
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  try {
    const text = response.text.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", e);
    return null;
  }
}

export async function matchLawyersByKeywords(data: {
  caseSummary: string;
  lawyers: {
    id: string;
    name: string;
    specialties: string[];
    location: string;
    experience: string;
    cases: string;
    bidPrice: number;
    rating: number;
    consultationFee: string;
    hasActiveSubscription?: boolean;
    adPlan?: string;
    priority?: number;
  }[];
  userLocation?: string;
}) {
  const cacheKey = `match_${data.caseSummary}_${data.userLocation || 'none'}`;
  const prompt = `
[Role]
당신은 법률 플랫폼의 '객관적 정보 매칭 시스템'입니다. 사용자의 사건 내용과 지역 정보를 분석하여 가장 관련성이 높은 법률 카테고리를 분류하고 지역 매칭을 수행합니다.

[Input Data]
사용자 사건 요약: ${data.caseSummary}
사용자 희망 지역: ${data.userLocation || '미지정'}

[Task Instructions]
1. 핵심 키워드 추출: 사건 내용에서 법률 카테고리를 추출하세요. (예: 부동산 > 임대차 > 보증금)
2. 지역 분석: 사용자가 언급한 지역({{user_location}})이 있다면 해당 지역명을 정규화하세요. (예: "서초동" -> "서울 서초구")
3. 매칭 로직: 사용자의 사건과 가장 잘 맞는 전문 분야 키워드 3개를 선정하세요.

[Output Format]
JSON 형식으로 출력하세요. (마크다운 코드 블록 없이 순수 JSON만 출력)
{
  "category": "string (예: 부동산 > 임대차)",
  "keywords": ["string", "string", "string"],
  "normalizedLocation": "string | null"
}
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  }, cacheKey);

  try {
    const text = response.text.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(text);
    
    // Client-side filtering and sorting
    let matchedLawyers = data.lawyers
      .filter(lawyer => 
        lawyer.specialties.some(spec => 
          analysis.keywords.some((kw: string) => spec.includes(kw) || kw.includes(spec))
        )
      );

    // Location filtering if provided
    if (analysis.normalizedLocation || data.userLocation) {
      const targetLoc = analysis.normalizedLocation || data.userLocation;
      matchedLawyers = matchedLawyers.sort((a, b) => {
        const aMatch = a.location.includes(targetLoc) ? 1 : 0;
        const bMatch = b.location.includes(targetLoc) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        return 0;
      });
    }

    // Final sorting: Subscription -> Bid Price -> Rating
    matchedLawyers.sort((a, b) => {
      // 1. Subscription Priority (Partner)
      const aSub = a.hasActiveSubscription ? 1 : 0;
      const bSub = b.hasActiveSubscription ? 1 : 0;
      if (aSub !== bSub) return bSub - aSub;

      // 2. Bid Price
      if (b.bidPrice !== a.bidPrice) return b.bidPrice - a.bidPrice;
      
      // 3. Rating
      if (b.rating !== a.rating) return b.rating - a.rating;
      
      return 0;
    });

    return {
      category: analysis.category,
      keywords: analysis.keywords,
      lawyers: matchedLawyers.length > 0 ? matchedLawyers : data.lawyers.slice(0, 3),
      disclaimer: "본 정보는 지역별로 등록된 변호사 회원들의 유료 광고 정보를 포함하고 있습니다. 'SoloLaw'는 사건의 수임이나 알선에 관여하지 않으며, 사용자가 직접 변호사의 경력과 정보를 확인하여 상담 여부를 결정해야 합니다. 모든 상담 및 계약은 변호사와 사용자 간의 직거래로 이루어집니다."
    };
  } catch (e) {
    console.error("Failed to match lawyers:", e);
    return null;
  }
}

export async function generateLawyerAdCard(data: {
  lawyerInfo: {
    name: string;
    experience: string;
    cases: string;
    specialty: string;
  };
  caseType: string;
  lawyerMessage: string;
}) {
  const cacheKey = `ad_${data.lawyerInfo.name}_${data.caseType}`;
  const prompt = `
[Role]
당신은 법률 플랫폼 전문 카피라이터입니다. 변호사의 경력 사항을 바탕으로 사용자에게 신뢰감을 줄 수 있는 '전문가 프로필 카드' 문구를 작성합니다.

[Input Data]
변호사 정보: (이름: ${data.lawyerInfo.name}, 기수/경력: ${data.lawyerInfo.experience}, 주요 승소 사례: ${data.lawyerInfo.cases}, 전문 분야: ${data.lawyerInfo.specialty})
사용자 사건 유형: ${data.caseType}
변호사 한마디: ${data.lawyerMessage}

[Task Instructions]
헤드라인: 사용자의 사건 유형과 변호사의 전문성을 연결하는 강력한 문구를 작성하세요. (예: "15년 차 부동산 전문, 보증금 회수율 98%의 노하우")
전문성 강조: 해당 사건과 유사한 실제 승소 사례나 경력을 구체적인 수치와 함께 배치하세요.
톤앤매너: 과도한 확신(예: "무조건 승소")은 피하되, 냉철하고 전문적인 느낌을 주도록 작성하세요.
법적 준수: "변호사법을 준수하는 광고 모델입니다"라는 인상을 주도록 객관적 사실 위주로 구성하세요.

[Output Format]
JSON 형식으로 출력하세요. (마크다운 코드 블록 없이 순수 JSON만 출력)
{
  "headline": "string",
  "experienceSummary": "string",
  "winningCases": "string",
  "commitment": "string"
}
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  }, cacheKey);

  try {
    const text = response.text.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", e);
    return null;
  }
}

export async function verifyLawyerCredentials(data: {
  name: string;
  regNumber: string;
  location: string;
  file?: { data: string; mimeType: string };
}) {
  const prompt = `
[Role]
당신은 플랫폼 신뢰도를 책임지는 '전문가 검증 시스템'입니다. 신청한 변호사의 정보가 실제 법조인 데이터와 일치하는지 확인하고 승인 프로세스를 진행합니다.

[Input Data]
신청자 정보: (이름: ${data.name}, 변호사 등록번호: ${data.regNumber}, 소속 등록지: ${data.location})
첨부 서류: ${data.file ? "변호사 신분증 또는 자격 증명서 이미지 포함" : "서류 없음"}

[Task Instructions]
1. 데이터 대조: 입력된 등록번호가 대한변호사협회DB와 일치하는지 확인 절차를 가이드하세요.
2. 결격 사유 체크: 징계 이력이나 허위 정보 기재 여부를 판단합니다.
3. 승인/거절 알림 생성:
   - 승인 시: "자격 검증이 완료되었습니다. 이제 전문가 프로필 노출 및 광고 설정이 가능합니다."
   - 거절 시: "첨부된 서류가 불분명하거나 등록번호 정보가 일치하지 않습니다. [사유]를 확인 후 재신청 바랍니다."

[Output Format]
JSON 형식으로 출력하세요.
{
  "status": "approved" | "rejected" | "pending",
  "reason": "string",
  "message": "string",
  "verificationGuide": "string"
}

[Tone]
공적이고 엄격하며 정중한 어조.
`;

  const contents: any[] = [{ text: prompt }];
  if (data.file) {
    contents.push({
      inlineData: {
        data: data.file.data,
        mimeType: data.file.mimeType,
      },
    });
  }

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: { parts: contents },
  });

  try {
    const text = response.text.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return null;
  }
}

export async function generateSecurityGuideline() {
  const prompt = `
[Role]
당신은 데이터 보안 책임자(CISO)입니다. 관리자 대시보드에서 일반 사용자의 '사건 내용'에 접근할 때 적용할 엄격한 보안 프로토콜을 설정합니다.

[Task]
1. 마스킹 처리: 관리자 화면에서 사용자의 성함, 주민번호, 사건의 핵심 고유 명사는 기본적으로 별표(*) 처리하여 노출합니다.
2. 접근 로그 기록: "어떤 관리자가, 언제, 어떤 목적으로 특정 사용자의 데이터를 열람했는지"에 대한 실시간 로그 생성 로직을 설계하세요.
3. 사유 입력 강제: 데이터 열람 시 "고객 문의 해결", "시스템 오류 점검" 등 구체적인 사유를 입력해야만 잠금이 해제되도록 구성합니다.

[Output Format]
관리자 보안 가이드라인 / 시스템 로그 기록 양식 / 데이터 마스킹 규칙표 순으로 정리. 마크다운 형식을 사용하세요.
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  return response.text;
}

export async function manageAdInventory(data: {
  category: string;
  lawyers: any[];
}) {
  const prompt = `
[Role]
당신은 수익 최적화 매니저입니다. 특정 키워드(예: 전세사기, 음주운전)별로 입점한 변호사의 광고 노출 우선순위를 관리합니다.

[Task Instructions]
1. 인벤토리 관리: 현재 '${data.category}' 카테고리의 상단 광고 슬롯 점유율을 분석합니다.
2. 입찰 경쟁 최적화: 광고료를 높게 책정했거나 신규 입점한 변호사의 노출 빈도를 조절합니다.
3. 광고 성과 리포트: 변호사 회원에게 제공할 "내 프로필 노출 수, 클릭 수, 상담 연결 수" 통계 데이터를 요약 생성합니다.

[Constraint]
변호사법 위반 소지를 피하기 위해 '추천'이라는 단어 대신 '광고 노출'이라는 용어만 사용하도록 시스템을 제한하세요.

[Output Format]
분석 보고서 및 최적화 제안을 마크다운으로 작성하세요.
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  return response.text;
}

export async function generateLawyerReviewReport(data: {
  userDraft: string;
  lawyerNotes: string;
}) {
  const prompt = `
[Role]
당신은 변호사의 검토 업무를 보조하는 '법률 리뷰 에디터'입니다. 사용자가 AI로 작성한 초고를 바탕으로 변호사가 전문적인 수정을 가할 수 있도록 검토 항목을 분류합니다.

[Input Data]
사용자 작성 초안: ${data.userDraft}
변호사 메모: ${data.lawyerNotes}

[Task Instructions]
변호사의 입력 내용을 바탕으로 사용자에게 전달될 '전문가 검토 결과서'를 다음 구조로 정리하세요.

1. 청구취지 및 원인 보완: 법률적으로 누락된 요건 사실이 있다면 수정 제안.
2. 증거 자료 평가: 현재 제출된 증거의 효력과 추가로 필요한 증거 목록 제안.
3. 법리적 조언: 해당 사건에서 승소를 위해 보완해야 할 논리 구조.
4. 최종 의견: 변호사의 종합 의견.

[Constraint]
모든 수정 제안은 "본 변호사의 개인적인 법률 견해이며, 플랫폼인 '나홀로소송 도우미 (SoloLaw)'의 의견이 아님"을 하단에 명시하세요.

[Output Format]
마크다운 형식을 사용하세요.
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  return response.text;
}

export async function generateReviewServiceCopy() {
  const prompt = `
[Role]
당신은 '나홀로소송 도우미 (SoloLaw)'의 서비스 기획자입니다. AI가 쓴 서류에 불안함을 느끼는 사용자에게 '변호사 유료 검토'의 필요성을 설명하고 신청을 유도합니다.

[Task]
1. 불안 해소: "AI가 잘 썼는지 걱정되시나요? 전문 변호사의 눈으로 한 번 더 확인하면 서류 반려 확률이 낮아집니다."
2. 서비스 범위 명시: "이 서비스는 변호사가 직접 귀하의 서류 초안을 읽고, 법적 논리와 증거 보완점을 리포트로 제공하는 서비스입니다."
3. 비용 및 소요 시간: "검토 비용 50,000원 / 평균 24시간 이내 결과 도착"
4. 버튼 문구: [전문가에게 내 서류 검토 받기]

[Tone]
신뢰감 있고, 정중하며, 강요하지 않는 부드러운 톤.

[Output Format]
제목, 본문, 강조 문구, 버튼 텍스트 순으로 마크다운으로 작성하세요.
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  return response.text;
}

export async function generateLawyerMarketingCopy(data: {
  name: string;
  specialty: string;
  experience: string;
  service_style: string;
}) {
  const prompt = `
[Role]
당신은 법률 플랫폼 'SoloLaw'의 변호사 홍보 전문 카피라이터입니다.

[Input Data]
성함: ${data.name}
주요 전문분야: ${data.specialty}
핵심 경력: ${data.experience}
서비스 특징: ${data.service_style}

[Task Instructions]
위 정보를 바탕으로 변호사 홍보용 광고 카피를 작성하세요.
주의사항:
1. 변호사법 준수를 위해 "사건 해결 보장", "최고/유일" 등 승소를 장담하는 표현은 절대 사용하지 않습니다.
2. "알선" 느낌을 피하기 위해, 변호사의 '이력'과 '상담 가능한 분야'를 객관적으로 전달하는 데 집중합니다.

[Output Format]
JSON 형식으로 출력하세요. (마크다운 코드 블록 없이 순수 JSON만 출력)
{
  "headline": "사용자의 고민을 관통하는 짧은 문구",
  "subtext": "변호사의 전문성을 설명하는 2줄 문장",
  "tags": ["태그1", "태그2"],
  "cta_text": "상담 및 검토 안내"
}
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  try {
    const rawText = response.text;
    const jsonStart = rawText.indexOf('{');
    const jsonEnd = rawText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonText = rawText.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonText);
    }
    throw new Error("No JSON found");
  } catch (e) {
    console.error("Failed to parse ad card JSON:", e);
    return null;
  }
}

export async function checkLawyerAdCompliance(adText: string) {
  const prompt = `
[Role]
당신은 대한민국 변호사법 및 변호사 광고 규정 준수 여부를 심사하는 법률 컴플라이언스 전문가입니다.

[Task]
다음 변호사 광고 문구를 분석하여 '변호사법' 및 '변호사 광고에 관한 규정' 위반 소지가 있는지 체크리스트를 작성하십시오.

[검토 대상 문구]
"${adText}"

[Instruction]
아래 4가지 핵심 항목에 대해 위반 여부를 분석하고, 개선 권고안을 제시하십시오.
1. 특정 사건의 수임을 직접적으로 유도하거나 알선하는 표현이 있는가?
2. '최고', '유일', '가장 저렴한' 등 객관적 근거 없는 비교 표현이 있는가?
3. 수임료 분할 청구나 수수료 배분을 암시하는 내용이 있는가?
4. 변호사의 인격이나 직업적 품위를 훼손할 우려가 있는 표현이 있는가?

[Output Format]
JSON 형식으로 출력하세요.
{
  "isCompliant": boolean,
  "violations": ["위반 항목 1", "위반 항목 2"],
  "analysis": "상세 분석 내용",
  "recommendation": "개선 권고 문구"
}
`;

  const response = await safeGenerate("gemini-3-flash-preview", {
    contents: prompt,
  });

  try {
    const rawText = response.text;
    const jsonStart = rawText.indexOf('{');
    const jsonEnd = rawText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonText = rawText.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonText);
    }
    return null;
  } catch (e) {
    return null;
  }
}
