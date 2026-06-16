// interceptor.js
const originalFetch = window.fetch;

function showNotification(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px;
        z-index: 999999; font-family: sans-serif; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

window.fetch = async function (...args) {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : resource?.url;

    if (url && url.includes('/api/organizations/') && config && config.method === 'POST') {
        const bodyText = config.body || "";
        
        // IGNORE background telemetry, FCM pings, and empty requests
        if (bodyText.includes('"channel_type":"FCM"') || !bodyText.includes('prompt')) {
            return originalFetch.apply(this, args);
        }

        try {
            return new Promise((resolve, reject) => {
                const eventId = Math.random().toString(36).substring(2);
                
                const listener = (event) => {
                    if (event.detail.eventId === eventId) {
                        window.removeEventListener('gemma-response', listener);
                        
                        if (event.detail.isFlagged) {
                            showNotification("🚨 Blocked: Gemma flagged this prompt as potentially triggering Claude's Under-18 filters. Please rewrite.");
                            reject(new Error("Prompt blocked by Guardian Extension."));
                        } else {
                            resolve(originalFetch.apply(this, args));
                        }
                    }
                };
                
                window.addEventListener('gemma-response', listener);
                
                window.dispatchEvent(new CustomEvent('gemma-check', {
                    detail: { eventId, promptText: bodyText }
                }));
            });

        } catch (e) {
            console.error("Interceptor Error:", e);
        }
    }
    
    return originalFetch.apply(this, args);
};