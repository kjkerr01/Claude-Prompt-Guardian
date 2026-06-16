// content.js
const script = document.createElement('script');
script.src = chrome.runtime.getURL('interceptor.js');
script.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

window.addEventListener('gemma-check', (e) => {
    const { eventId, promptText } = e.detail;
    
    // Pass it safely to background.js
    chrome.runtime.sendMessage({ action: 'check_prompt', promptText }, (response) => {
        window.dispatchEvent(new CustomEvent('gemma-response', {
            detail: {
                eventId: eventId,
                isFlagged: response.isFlagged
            }
        }));
    });
});