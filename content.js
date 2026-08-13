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



//Step 1 Form Fill and Next Step
// শুধুমাত্র নির্দিষ্ট URL-এ কোড রান করবে
if (window.location.href.includes("https://pieraksts.mfa.gov.lv/en/india/index")) {

    // Form e data bosano 
    let savedData = {};
    let isEnabled = false;
    let filled = 0;

    // ১. পেজ লোড হলে স্টোরেজ থেকে ডাটা নিয়ে আসা
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

    let intervalId = setInterval(() => {
        // এক্সটেনশনের টগল OFF থাকলে ডাটা বসাবে না
        if (!isEnabled) return;

        // How many filed already fill
        filled = 0; //Reset

        // Name 
        if (savedData.username) {
            let nameField = document.getElementById('Persons[0][first_name]');
            if (nameField && nameField.value !== savedData.username) {
                nameField.value = savedData.username;
                triggerEvent(nameField);
            }
            filled++;
        }

        // Surname
        if (savedData.surname) {
            let surnameField = document.getElementById('Persons[0][last_name]');
            if (surnameField && surnameField.value !== savedData.surname) {
                surnameField.value = savedData.surname;
                triggerEvent(surnameField);
            }
            filled++;
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
            filled++;
        }

        // Phone number
        if (savedData.userphone) {
            let phoneField = document.getElementById('phone');
            if (phoneField && phoneField.value !== savedData.userphone) {
                phoneField.value = savedData.userphone;
                triggerEvent(phoneField);
            }
            filled++;
        }

        if (filled >= 4) {
            console.log("4 fields filled successfully. Stopping interval...");
            clearInterval(intervalId); // লুপ বন্ধ করে দিবে
            const nextButton = document.querySelector('.btn-next-step');
            if (nextButton && !nextButton.disabled) {
                console.log("All fields are filled. Clicking Next step...");
                filled = 0;
                nextButton.click();
            }
        }

    }, 1000);

    // Helper Function
    function triggerEvent(element) {
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }
}


// Step 4 
if (window.location.href.includes("https://pieraksts.mfa.gov.lv/en/india/step4")) {
    let selectedDate = localStorage.getItem('date');
    let selectedTime = localStorage.getItem('time');

    setInterval(() => {
        console.log('Selected Date:', selectedDate);
        console.log('Selected Time:', selectedTime);
    }, 10000);


    setInterval(() => {
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

    chrome.storage.local.get(["usercode"], function (result) {
        usercode = result.usercode;

        const invitationCode = usercode;

        // 1. টার্গেট র‍্যাপারটি সিলেক্ট করুন
        const wrapper = document.querySelector('.section-base--wrapper');

        // 2. র‍্যাপারটি পেজে আছে কিনা তা চেক করে নিন
        if (wrapper) {
            // 3. নতুন একটি <h1> এলিমেন্ট তৈরি করুন
            const h1Element = document.createElement('h1');
            h1Element.style.cssText = "color: #ff5722; text-align: center; font-size: 28px; margin-bottom: 15px;padding:25px;border:1px solid #ff5722;margin-bottom:25px";
            // 4. <h1> এর ভেতরে টেক্সট বা কোড বসান
            h1Element.textContent = `${invitationCode}`;

            // (ঐচ্ছিক) যদি <h1> এ কোনো ক্লাস দিতে চান
            // h1Element.classList.add('invitation-title');

            // 5. র‍্যাপারের একদম শুরুতে (top এ) <h1> টি ইনজেক্ট করুন
            wrapper.prepend(h1Element);
        }

    });

}

//Step 2 Auto Complete :
if (window.location.href.includes("https://pieraksts.mfa.gov.lv/en/india/step2")) {

    let isEnabled = false;
    let isProcessed = false; // কোড যেন একবারের বেশি রান না করে তার জন্য ফ্ল্যাগ

    // ১. পেজ লোড হলে স্টোরেজ থেকে enabled ডাটা নিয়ে আসা
    chrome.storage.local.get(["enabled"], function (result) {
        isEnabled = result.enabled || false;
    });

    // ২. স্টোরেজে কোনো পরিবর্তন (Toggle ON/OFF) হলে রিয়েল-টাইমে ডাটা আপডেট করা
    chrome.storage.onChanged.addListener(function (changes, namespace) {
        if (changes.enabled) {
            isEnabled = changes.enabled.newValue;
        }
    });

    // Helper function to create small delays for UI transitions
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ৩. প্রতি সেকেন্ডে চেক করা এক্সটেনশন চালু আছে কি না
    let intervalId = setInterval(async () => {
        // এক্সটেনশনের টগল OFF থাকলে বা ইতোমধ্যে কাজ হয়ে গেলে কোড রান করবে না
        if (!isEnabled || isProcessed) return;

        // কাজ শুরু হলে ফ্ল্যাগ true করে লুপ বন্ধ করে দেওয়া
        isProcessed = true;
        clearInterval(intervalId);

        console.log("Extension is ENABLED. Starting Step 2 auto-fill...");

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

    }, 1000); // প্রতি ১০০০ মিলিসেকেন্ড (১ সেকেন্ড) পরপর চেক করবে
}