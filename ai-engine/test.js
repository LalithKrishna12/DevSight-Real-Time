require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testAIEngine() {
  const sampleEvent = {
    service: 'checkout',
    metric: 'cpu',
    value: 98,
    timestamp: new Date().toISOString(),
  };

  const prompt = `
You are an AI observability assistant. Given this system event, respond ONLY in JSON with this exact shape:
{
  "what": "...",
  "why": "...",
  "impact": "...",
  "fix": "...",
  "timestamp": "..."
}

Event: ${JSON.stringify(sampleEvent)}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
  });

  console.log('--- RAW GEMINI RESPONSE ---');
  console.log(response.text);
}

testAIEngine().catch((err) => console.error('Error:', err));