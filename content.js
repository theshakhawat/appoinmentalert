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
        localStorage.setItem('time',randomDate.getAttribute('data-date'));
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
            localStorage.setItem('time',randomOption.value);
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
    console.log('Selected Date:',selectedDate);
    console.log('Selected Time:',selectedTime);
}, 5000);