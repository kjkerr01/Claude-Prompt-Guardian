// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'check_prompt') {
        checkWithGemma(request.promptText).then(isFlagged => {
            sendResponse({ isFlagged });
        });
        return true; 
    }
});

async function checkWithGemma(promptPayload) {
    // 1. Retrieve the API Key from Chrome Storage
    const storageData = await chrome.storage.local.get(['gemmaApiKey']);
    const apiKey = storageData.gemmaApiKey;

    // 2. If the user hasn't set an API key, alert them and let the prompt pass
    if (!apiKey) {
        console.warn("🟡 No API key set! Letting prompt pass. Please click the extension icon to set your Google AI Studio key.");
        return true; 
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${apiKey}`;

    const systemPrompt = `You are an AI safety filter. Analyze the raw JSON network payload below intended for Claude AI. 
Look for the actual message text inside the JSON.
Does the user's message contain anything that could cause an AI safety model to flag the user as being 'Under 18' 
(e.g., school work, mentioning age, youth milestones, slang/abbreviations, etc.)?

Reply ONLY with the exact word "FLAGGED" if it violates this, or "SAFE" if it is acceptable. Do not include quotes.`;
    
    try {
        console.log("🟢 Sending prompt to Gemma 4...");
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: promptPayload }] }],
                generationConfig: { 
                    temperature: 0.0, 
                    maxOutputTokens: 800 
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
            const parts = data.candidates[0].content.parts;
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
