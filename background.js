// background.js
const API_KEY = 'AIzaSyDa7Y8MQVdDMTuCwj9D4t1nmQWZobIaxGY'; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${API_KEY}`;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'check_prompt') {
        checkWithGemma(request.promptText).then(isFlagged => {
            sendResponse({ isFlagged });
        });
        return true; 
    }
});

async function checkWithGemma(promptPayload) {
    // Updated prompt to tell Gemma it's reading raw JSON
    const systemPrompt = `You are an AI safety filter. Analyze the raw JSON network payload below intended for Claude AI. 
Look for the actual message text inside the JSON.
Does the user's message contain anything that could cause an AI safety model to flag the user as being 'Under 18' 
(e.g., school work, mentioning age, youth milestones, slang/abbreviations, etc.)?

Reply ONLY with the exact word "FLAGGED" if it violates this, or "SAFE" if it is acceptable. Do not include quotes.`;
    
    try {
        console.log("🟢 Sending prompt to Gemma 4...");
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: promptPayload }] }],
                generationConfig: { 
                    temperature: 0.0, 
                    maxOutputTokens: 800 // INCREASED! Gemma needs room to think
                }
            })
        });
        
        const textData = await response.text();
        console.log("🔍 RAW API RESPONSE TEXT:\n", textData);

        if (!response.ok) {
            console.error("🔴 Google AI API HTTP Error:", response.status);
            return false;
        }

        try {
            const data = JSON.parse(textData);
            
            // Extract the parts array from Gemma's response
            const parts = data.candidates[0].content.parts;
            
            // Filter out Gemma's inner "thoughts" to find the actual response
            const finalAnswerPart = parts.find(p => p.thought !== true) || parts[parts.length - 1];
            
            const reply = finalAnswerPart.text.trim().toUpperCase();
            
            console.log("🤖 GEMMA VERDICT:", reply);
            return reply.includes('FLAGGED');
            
        } catch (parseError) {
            console.error("🔴 Failed to parse valid JSON from Google:", parseError);
            return false;
        }
        
    } catch (error) {
        console.error("🔴 Extension Network Error querying Gemma 4:", error);
        return false; 
    }
}