const toggle = document.getElementById("toggle");
const status = document.getElementById("status");


// Popup open হলে আগের ON/OFF status নিয়ে আসবে
document.addEventListener("DOMContentLoaded", async () => {

    const result = await chrome.storage.local.get("enabled");

    const enabled = result.enabled || false;

    toggle.checked = enabled;
    status.textContent = enabled ? "ON" : "OFF";
});


// Switch change
toggle.addEventListener("change", async () => {

    const enabled = toggle.checked;

    // Chrome storage এ save
    await chrome.storage.local.set({
        enabled: enabled
    });

    status.textContent = enabled ? "ON" : "OFF";


    // Current tab
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tab?.id) return;


    // Content script-কে জানানো
    chrome.tabs.sendMessage(tab.id, {
        action: enabled ? "START" : "STOP"
    }).catch(() => {
        console.log("Content script not available");
    });

});