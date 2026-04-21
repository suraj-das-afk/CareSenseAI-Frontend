import { GEMINI_API_KEY } from "../../myenv/geminiKey";

export async function getSymptomAnalysis(symptomText) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a medical assistant. A user describes these symptoms: "${symptomText}". 
Please provide a simple, responsible analysis — possible causes and when they should see a doctor. 
Keep it under 150 words and use plain English.`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    } else {
      console.warn("Unexpected Gemini response:", data);
      return "Sorry, I couldn’t analyze that right now. Please try again.";
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Something went wrong connecting to the AI service.";
  }
}
