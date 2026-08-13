let running = false;
let checkInterval = null;

const message = document.querySelector('.message');

// Extension চালু হওয়ার পর storage থেকে status check
chrome.storage.local.get("enabled", (result) => {
    if (result.enabled === true) {
        startMonitoring();
    }
});

// Popup থেকে message আসলে
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "START") {
        startMonitoring();
    }

    if (message.action === "STOP") {
        stopMonitoring();
    }
});

// Sleep function (অপেক্ষা করার জন্য)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function startMonitoring() {
    if (running) return; // ইতিমধ্যে চললে নতুন করে রান করবে না
    running = true;
    console.log('Monitoring Started!');

    // Automation প্রক্রিয়া শুরু
    await processCalendar();
}

function stopMonitoring() {
    running = false;
    console.log('Monitoring Disabled!');
}

async function processCalendar() {
    if (!running) return; // স্টপ করা হলে কাজ বন্ধ করবে

    console.log("Checking calendar...");

    // ১. ক্যালেন্ডার ডেটা লোড হওয়ার জন্য অপেক্ষা করা (loader hide হওয়া পর্যন্ত)
    let loader = document.getElementById('loader');
    while (loader && !loader.classList.contains('hide-loader')) {
        await sleep(500); // আধা সেকেন্ড পরপর চেক করবে
    }
    await sleep(500); // ডেটা রেন্ডার হওয়ার জন্য অতিরিক্ত ১ সেকেন্ড অপেক্ষা

    // ২. cal-active ডেটগুলো খুঁজে বের করা
    const activeDates = document.querySelectorAll('td.cal-active');

    if (activeDates.length > 0) {
        // যদি অ্যাক্টিভ ডেট থাকে, র‍্যান্ডমলি একটি নির্বাচন করে ক্লিক করা
        const randomIndex = Math.floor(Math.random() * activeDates.length);
        const randomDate = activeDates[randomIndex];
        console.log(`Clicked on date: ${randomDate.getAttribute('data-date')}`);
        localStorage.setItem('date', randomDate.getAttribute('data-date'));
        randomDate.click();

        // ৩. টাইম স্লট (Select Box) আসার জন্য অপেক্ষা করা
        let timeSelect = null;
        let options = [];

        // সর্বোচ্চ ১০ সেকেন্ড (২০ বার * ৫০০ms) অপেক্ষা করবে টাইম স্লট আসার জন্য
        for (let i = 0; i < 20; i++) {
            await sleep(500);
            timeSelect = document.querySelector('select.time');
            if (timeSelect && timeSelect.options.length > 0) {
                // ভ্যালিড অপশনগুলো ফিল্টার করা
                options = Array.from(timeSelect.options).filter(opt => opt.value !== "");
                if (options.length > 0) break;
            }
        }

        if (options.length > 0) {
            // র‍্যান্ডম টাইম সিলেক্ট করা
            const randomTimeIndex = Math.floor(Math.random() * options.length);
            const randomOption = options[randomTimeIndex];
            timeSelect.value = randomOption.value;

            // ওয়েবসাইটে চেঞ্জ ইভেন্ট ট্রিগার করা (যাতে ফ্রেমওয়ার্ক বুঝতে পারে)
            timeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Selected time: ${randomOption.value}`);
            localStorage.setItem('time', randomOption.value);
            await sleep(500); // সিলেক্ট হওয়ার পর একটু অপেক্ষা

            // ৪. Next step বাটনে ক্লিক করা
            const nextBtn = document.querySelector('.btn-next-step');
            if (nextBtn) {
                console.log("Clicking Next Step...");

                nextBtn.click();
            }
        } else {
            // যদি ক্লিক করার পরও টাইম না আসে, পেজ রিলোড
            console.log("Time slots didn't load. Reloading...");
            location.reload();
        }

    } else {
        // ৫. এই মাসে কোনো অ্যাক্টিভ ডেট নেই, Next Month চেক করা
        const nextMonthBtn = document.querySelector('.calendar-next');

        // বাটনটি ডিজেবল আছে কি না চেক করা (disabled প্রোপার্টি অথবা অ্যাট্রিবিউট দিয়ে)
        const isDisabled = nextMonthBtn.disabled || nextMonthBtn.hasAttribute('disabled');

        if (nextMonthBtn && !isDisabled) {
            console.log("No active dates found. Moving to next month...");
            nextMonthBtn.click();

            // নতুন মাসের ডেটা আসার জন্য একটু অপেক্ষা করে পুনরায় চেক করা
            await sleep(1000);
            await processCalendar(); // Recursive call

        } else {
            // ৬. Next Month বাটন ডিজেবল এবং কোনো ডেট নেই, তাই পেজ রিলোড
            console.log("No active dates and Next Month is disabled. Reloading page...");
            location.reload();
        }
    }
}

let selectedDate = localStorage.getItem('date');
let selectedTime = localStorage.getItem('time');

setInterval(() => {
    console.log('Selected Date:', selectedDate);
    console.log('Selected Time:', selectedTime);
}, 10000);





// Form e data bosano 
let savedData = {};
let isEnabled = false;
// ১. পেজ লোড হলে স্টোরেজ থেকে ডাটা নিয়ে আসা
chrome.storage.local.get(["enabled", "username", "surname", "useremail", "userphone"], function (result) {
    isEnabled = result.enabled || false;
    savedData = result;
});
chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let [key, { newValue }] of Object.entries(changes)) {
        if (key === 'enabled') {
            isEnabled = newValue;
        } else {
            savedData[key] = newValue;
        }
    }
});
setInterval(() => {
    // এক্সটেনশনের টগল OFF থাকলে ডাটা বসাবে না
    if (!isEnabled) return;

    // Name 
    if (savedData.username) {
        let nameField = document.getElementById('Persons[0][first_name]');
        // যদি ফিল্ড থাকে এবং ভ্যালু আগে থেকেই ঠিক না থাকে, তবেই বসাবে
        if (nameField && nameField.value !== savedData.username) {
            nameField.value = savedData.username;
            triggerEvent(nameField);
        }
    }

    // Surname
    if (savedData.surname) {
        let surnameField = document.getElementById('Persons[0][last_name]');
        if (surnameField && surnameField.value !== savedData.surname) {
            surnameField.value = savedData.surname;
            triggerEvent(surnameField);
        }
    }

    // Email
    if (savedData.useremail) {
        let emailField = document.getElementById('e_mail');
        if (emailField && emailField.value !== savedData.useremail) {
            emailField.value = savedData.useremail;
            triggerEvent(emailField);
        }

        // E-mail (repeat)
        let emailRepeatField = document.getElementById('e_mail_repeat');
        if (emailRepeatField && emailRepeatField.value !== savedData.useremail) {
            emailRepeatField.value = savedData.useremail;
            triggerEvent(emailRepeatField);
        }
    }

    // Phone number
    if (savedData.userphone) {
        let phoneField = document.getElementById('phone');
        if (phoneField && phoneField.value !== savedData.userphone) {
            phoneField.value = savedData.userphone;
            triggerEvent(phoneField);
        }
    }


    // Agree Checkbox
    // প্রথমে ইনপুট ফিল্ডটি সিলেক্ট করুন
    const checkboxInput = document.querySelector('#personal-data');

    // চেক করুন ইনপুটটি আছে কি না এবং এটি আনচেকড (checked === false) আছে কি না
    if (checkboxInput && !checkboxInput.checked) {
        const agreeLabel = document.querySelector('label[for^="personal-data"]');
        if (agreeLabel) {
            agreeLabel.click();
            console.log("Agreement checked successfully!");
        }
    } else {
        console.log("Agreement is already checked. Skipping click.");
    }



}, 1000);

// Helper Function: মডার্ন ওয়েবসাইট (React, Angular) এর জন্য ইভেন্ট ট্রিগার করা
// অনেক সাইটে শুধু .value দিয়ে ডাটা বসালে সাবমিট বাটনে কাজ করে না, তাই এই ফাংশনটি প্রয়োজন
function triggerEvent(element) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
}





// Auto Complete Step 2:
(async function autoFillService() {
    // শুধুমাত্র নির্দিষ্ট URL-এ স্ক্রিপ্ট রান করার শর্ত
    const targetUrl = "https://pieraksts.mfa.gov.lv/en/india/step2";
    
    // বর্তমান URL যদি টার্গেট URL-এর সাথে না মেলে, তবে স্ক্রিপ্ট এখানেই থেমে যাবে
    if (!window.location.href.includes(targetUrl)) {
        console.log("Script stopped: You are not on the correct URL.");
        return; 
    }

    // Helper function to create small delays for UI transitions
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    console.log("Step 1: Opening the dropdown...");
    const dropdownWrapper = document.querySelector('.dropdown--wrapper .js-services');
    if (dropdownWrapper) {
        dropdownWrapper.click();
        await sleep(500); // Wait for the dropdown to expand
    }

    console.log("Step 2: Selecting the Bangladesh D visa option...");
    const serviceLabel = document.querySelector('label[for="Persons-0-621"]');
    if (serviceLabel) {
        serviceLabel.click();
        await sleep(500); // Wait for the description section to become active
    }

    console.log("Step 3: Scrolling to the description section...");
    const addButton = document.querySelector('button[data-serviceid="Persons-0-621"]');
    if (addButton) {
        // Scroll the 'Add' button into the center of the view smoothly
        addButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(800); // Wait for smooth scrolling to finish
    }

    console.log("Step 4: Clicking the confirmation checkbox...");
    // Target the specific section that belongs to the clicked service to find its checkbox
    const targetSection = addButton ? addButton.closest('.description') : null;
    if (targetSection) {
        // Target the label inside the specific description section
        const confirmLabel = targetSection.querySelector('.js-popup-checkbox label');
        if (confirmLabel) {
            confirmLabel.click();
            await sleep(300);
        }
    }

    console.log("Step 5: Clicking the Add button...");
    if (addButton) {
        addButton.click();
        await sleep(500); // Wait for any processing after clicking Add
    }

    console.log("Step 6: Clicking Next step...");
    const nextButton = document.querySelector('.btn-next-step');
    if (nextButton) {
        nextButton.click();
    } else {
        console.log("Note: 'Next step' button not found on the current DOM.");
    }
})();