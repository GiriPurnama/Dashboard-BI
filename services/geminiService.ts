import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const generateSqlFromNaturalLanguage = async (prompt: string, schemaContext: string): Promise<string> => {
  if (!ai) {
    return "-- API Key not configured. Returning mock SQL.\nSELECT * FROM sales_data WHERE region = 'US' LIMIT 10;";
  }

  try {
    const fullPrompt = `
      You are an expert SQL Data Analyst.
      Context: The user wants to query a database with the following schema/context: ${schemaContext}
      
      Task: Write a valid SQL query based on this request: "${prompt}".
      
      Rules:
      - Return ONLY the SQL query. No markdown formatting, no explanation.
      - If the request is vague, make a reasonable assumption based on standard analytics patterns.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });

    const text = response.text || '';
    return text.replace(/```sql/g, '').replace(/```/g, '').trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "-- Error communicating with AI. \nSELECT * FROM fallback_table;";
  }
};

export const analyzeDataInsight = async (data: any[]): Promise<string> => {
   if (!ai) {
    return "AI Insight: Revenue appears to trend upwards in Q2 based on mock analysis.";
  }

  try {
    const dataStr = JSON.stringify(data.slice(0, 20)); // Send sample
    const prompt = `
      Analyze the following JSON data (first 20 rows provided): ${dataStr}.
      Provide a brief, one-sentence executive summary of the most interesting trend or anomaly.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    
    return response.text || "No insights available.";
  } catch (error) {
      return "Could not generate insights at this time.";
  }
}