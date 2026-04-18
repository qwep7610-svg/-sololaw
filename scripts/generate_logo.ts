import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    console.log("Generating logo...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ text: "A professional and modern logo for 'SoloLaw', an AI legal assistant. The design should combine a stylized gavel or scales of justice with a digital element like a glowing node. Minimalist, bold lines, professional color palette (deep slate, brand blue). High resolution, centered, white background." }]
    });

    if (!response.candidates || response.candidates.length === 0) {
      console.error("No candidates returned");
      return;
    }

    const firstCandidate = response.candidates[0];
    if (!firstCandidate.content || !firstCandidate.content.parts) {
      console.error("No content in first candidate");
      return;
    }

    for (const part of firstCandidate.content.parts) {
      if (part.inlineData) {
        const data = Buffer.from(part.inlineData.data, 'base64');
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir);
        }
        fs.writeFileSync(path.join(publicDir, 'logo.png'), data);
        console.log('Logo successfully generated and saved to public/logo.png');
        return;
      }
    }
    console.error("No image data found in response");
  } catch (error) {
    console.error("Error generating logo:", error);
  }
}

run();
