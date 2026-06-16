document.addEventListener('DOMContentLoaded', () => {
    const apiInput = document.getElementById('apiKey');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');

    // 1. Load the existing key when the popup opens
    chrome.storage.local.get(['gemmaApiKey'], (result) => {
        if (result.gemmaApiKey) {
            apiInput.value = result.gemmaApiKey;
        }
    });

    // 2. Save the key when the button is clicked
    saveBtn.addEventListener('click', () => {
        const key = apiInput.value.trim();
        
        chrome.storage.local.set({ gemmaApiKey: key }, () => {
            // Show a success message
            statusDiv.textContent = 'API Key saved successfully!';
            
            // Clear the success message after 3 seconds
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 3000);
        });
    });
});