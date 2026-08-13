const toggle = document.getElementById("toggle");
const status = document.getElementById("status");

// Popup open হলে আগের ON/OFF status এবং সেভ করা ডাটা নিয়ে আসবে
document.addEventListener("DOMContentLoaded", async () => {
  // আগের ডাটাগুলো এবং toggle status একসাথে নিয়ে আসা
  const result = await chrome.storage.local.get([
    "enabled", "username", "surname", "useremail", "userphone", "usercode"
  ]);

  // Toggle সেট করা
  const enabled = result.enabled || false;
  toggle.checked = enabled;
  status.textContent = enabled ? "ON" : "OFF";

  // ইনপুট ফিল্ডগুলোতে আগের সেভ করা ডাটা বসানো
  if (result.username) document.getElementById("username").value = result.username;
  if (result.surname) document.getElementById("surname").value = result.surname;
  if (result.useremail) document.getElementById("useremail").value = result.useremail;
  if (result.userphone) document.getElementById("userphone").value = result.userphone;
  if (result.usercode) document.getElementById("usercode").value = result.usercode;
});

// Switch change
toggle.addEventListener("change", async () => {
  const enabled = toggle.checked;

  // Chrome storage এ save
  await chrome.storage.local.set({ enabled: enabled });
  status.textContent = enabled ? "ON" : "OFF";

  // Current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // Content script-কে জানানো
  chrome.tabs.sendMessage(tab.id, {
    action: enabled ? "START" : "STOP"
  }).catch(() => {
    console.log("Content script not available");
  });
});


// User Data Save Section
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const saveStatus = document.getElementById("Savestatus");

saveBtn.addEventListener('click', async function () {
  const userData = {
    username: document.getElementById("username").value,
    surname: document.getElementById("surname").value,
    useremail: document.getElementById("useremail").value,
    userphone: document.getElementById("userphone").value,
    usercode: document.getElementById("usercode").value
  };

  await chrome.storage.local.set(userData);

  saveStatus.innerHTML = "User Data Saved!";
  console.log('User Data Saved!', userData);

  setTimeout(() => {
    saveStatus.innerHTML = "";
  }, 1000);
});

resetBtn.addEventListener('click', async function () {
  // ১. Chrome Storage থেকে নির্দিষ্ট ডাটাগুলো মুছে ফেলা
  await chrome.storage.local.remove([
    "username",
    "surname",
    "useremail",
    "userphone",
    "usercode"
  ]);

  // ২. পপআপের ইনপুট ফিল্ডগুলো খালি (blank) করে দেওয়া
  document.getElementById("username").value = "";
  document.getElementById("surname").value = "";
  document.getElementById("useremail").value = "";
  document.getElementById("userphone").value = "";
  document.getElementById("usercode").value = "";

  // ৩. ইউজারকে মেসেজ দেখানো
  saveStatus.innerHTML = "User Data Reset!";
  console.log('User Data Cleared!');

  // ১ সেকেন্ড পর মেসেজটি সরিয়ে ফেলা
  setTimeout(() => {
    saveStatus.innerHTML = "";
  }, 1000);
});