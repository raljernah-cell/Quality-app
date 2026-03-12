import { GoogleGenAI } from "@google/genai";
import { IndicatorData, INDICATOR_LABELS } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function analyzeIndicators(data: IndicatorData[]) {
  if (data.length === 0) return "لا توجد بيانات كافية للتحليل.";

  const prompt = `
    أنت خبير في إدارة المستشفيات وتحليل البيانات الصحية. 
    إليك بيانات مؤشرات الأداء الرئيسية للمستشفى لعدة أشهر:
    ${JSON.stringify(data, null, 2)}

    المسميات:
    ${JSON.stringify(INDICATOR_LABELS, null, 2)}

    يرجى تقديم تحليل مفصل باللغة العربية يتضمن:
    1. ملخص للأداء العام.
    2. تحديد الاتجاهات الإيجابية والسلبية.
    3. توصيات محددة لتحسين الأداء بناءً على الأرقام.
    4. تنبيهات لأي قيم خارجة عن المألوف أو مقلقة.

    اجعل التحليل مهنياً وموجزاً.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "فشل في توليد التحليل.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.";
  }
}
