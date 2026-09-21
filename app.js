/**
 * 👥 ระบบสมาชิกบริษัท, ที่อยู่จัดส่ง และระบบบันทึก/ค้นหาข้อมูลลูกค้า (รวมระบบ Cloud Sync, EmailJS และระบบปักหมุดแผนที่)
 * 🛠️ [FIXED]: เพิ่มระบบป้องกัน Path ซ้อนกัน (/Tipwong2/Tipwong2/)
 * 💬 [UPDATED]: เปลี่ยนระบบส่งที่อยู่เข้า LINE OA อัตโนมัติ (Background Push ไม่ต้องเข้ากลุ่ม)
 */

// ==========================================
// ⚙️ การตั้งค่า LINE OA System (Google Apps Script URL)
// ==========================================
// 🎯 นำ URL ที่ได้จาก Google Apps Script (Deploy as Web App) มาวางในนี้
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/XXXXX/exec"; 

// 🛡️ ป้องกันการ Redirect ไปยัง URL ที่พาธซ้อนกันโดยอัตโนมัติ
(function fixPathDuplicates() {
    if (window.location.pathname.includes('/Tipwong2/Tipwong2/')) {
        const cleanPath = window.location.pathname.replace('/Tipwong2/Tipwong2/', '/Tipwong2/');
        window.history.replaceState(null, '', cleanPath);
    }
})();

// โหลดข้อมูลสมาชิกจากเครื่อง
let currentUser = JSON.parse(localStorage.getItem('tipwong_current_user')) || null;

// ตัวแปรเก็บสถานะประเภทลูกค้าปัจจุบัน ('personal' หรือ 'company')
let currentCustomerType = 'personal';

// ข้อมูลตัวอย่างที่มีอยู่จริง (สำหรับใส่เตรียมไว้ใน Modal)
const defaultShippingData = {
    name: "ร้านฮาร์ดแวร์สุขสวัสดิ์ 25",
    phone: "081-234-5678",
    address: "123/45 ซอยสุขสวัสดิ์ 25 แขวงบางปะกอก เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140"
};

// 📄 ฟังก์ชันสำหรับสลับหน้า (Home / Terms)
function switchPage(pageName) {
    navigateTo(pageName);
}

// ฟังก์ชันสำหรับสลับประเภทลูกค้า (บุคคลทั่วไป / บริษัท)
function setCustomerType(type) {
    currentCustomerType = type;
    const btnPersonal = document.getElementById('type-personal');
    const btnCompany = document.getElementById('type-company');
    const companyContainer = document.getElementById('company-field-container');
    const taxContainer = document.getElementById('tax-field-container');

    if (type === 'personal') {
        if (btnPersonal) btnPersonal.className = "py-3 px-4 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all border-red-600 bg-red-50 text-red-600";
        if (btnCompany) btnCompany.className = "py-3 px-4 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all border-slate-200 bg-slate-50 text-slate-500";

        if (companyContainer) companyContainer.classList.add('hidden');
        if (taxContainer) taxContainer.classList.add('hidden');

        const compInput = document.getElementById('register-company');
        const taxInput = document.getElementById('register-tax-id');
        if (compInput) compInput.value = '';
        if (taxInput) taxInput.value = '';
    } else {
        if (btnCompany) btnCompany.className = "py-3 px-4 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all border-red-600 bg-red-50 text-red-600";
        if (btnPersonal) btnPersonal.className = "py-3 px-4 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all border-slate-200 bg-slate-50 text-slate-500";

        if (companyContainer) companyContainer.classList.remove('hidden');
        if (taxContainer) taxContainer.classList.remove('hidden');
    }
}

// ==========================================
// 🛒 ระบบส่งข้อมูลคำสั่งซื้อเข้า LINE
// ==========================================
function sendOrderToLine(productName, priceType, details) {
    let message = `🛒 มีคำสั่งซื้อใหม่!\n`;
    message += `📦 สินค้า: ${productName}\n`;
    message += `💰 ประเภท: ${priceType}\n`;
    message += `------------------\n`;
    message += `รายการ:\n${Array.isArray(details) ? details.join('\n') : details}\n`;
    message += `⏰ เวลา: ${new Date().toLocaleString('th-TH')}`;

    let encodeMessage = encodeURIComponent(message);
    window.open(`https://line.me/R/msg/text/?${encodeMessage}`, '_blank');
}

// 🚀 ฟังก์ชันส่งข้อมูลที่อยู่เข้า LINE OA อัตโนมัติ (ไม่ต้องสลับหน้า / ไม่ต้องเข้ากลุ่มไลน์)
function sendCheckoutToLine() {
    const name = document.getElementById('register-name') ? document.getElementById('register-name').value : '';
    const phone = document.getElementById('register-phone') ? document.getElementById('register-phone').value : '';
    const address = document.getElementById('register-address') ? document.getElementById('register-address').value : '';
    const district = document.getElementById('register-district') ? document.getElementById('register-district').value : '';
    const province = document.getElementById('register-province') ? document.getElementById('register-province').value : '';
    const postcode = document.getElementById('register-postcode') ? document.getElementById('register-postcode').value : '';

    const company = document.getElementById('register-company') ? document.getElementById('register-company').value : '';
    const taxId = document.getElementById('register-tax-id') ? document.getElementById('register-tax-id').value : '';

    if (!name || !phone || !address) {
        showNotification("แจ้งเตือน", "กรุณากรอกข้อมูลที่อยู่จัดส่งให้ครบถ้วนก่อนส่งข้อมูล", "error");
        return;
    }

    const payload = {
        customerType: currentCustomerType,
        companyName: company,
        taxId: taxId,
        name: name,
        phone: phone,
        address: address,
        district: district,
        province: province,
        postcode: postcode,
        timestamp: new Date().toLocaleString('th-TH')
    };

    showNotification("กำลังส่งข้อมูล", "กำลังส่งข้อมูลที่อยู่ไปยังระบบ LINE...", "info");

    // ส่งแบบ Background Request ผ่าน Google Apps Script เข้า LINE OA แอดมิน
    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(() => {
        showNotification("สำเร็จ!", "ส่งข้อมูลที่อยู่เข้า LINE อัตโนมัติเรียบร้อยแล้ว", "success");
        closeShippingModal();
    })
    .catch((error) => {
        console.error("Error sending to LINE:", error);
        showNotification("แจ้งเตือน", "บันทึกข้อมูลสำเร็จ แต่ไม่สามารถส่งแจ้งเตือนเข้า LINE ได้", "error");
    });
}

// ==========================================
// 🎨 ระบบ Toast Notification (Tailwind CSS)
// ==========================================
function showNotification(title, message, type = 'success') {
    let container = document.getElementById('notification-container');

    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3';
        document.body.appendChild(container);
    }

    const notif = document.createElement('div');

    let borderColor = 'border-emerald-500/20';
    let iconBg = 'bg-emerald-500/10 text-emerald-500';
    let iconClass = 'fa-solid fa-circle-check';

    if (type === 'error') {
        borderColor = 'border-red-500/20';
        iconBg = 'bg-red-500/10 text-red-500';
        iconClass = 'fa-solid fa-circle-exclamation';
    } else if (type === 'info') {
        borderColor = 'border-blue-500/20';
        iconBg = 'bg-blue-500/10 text-blue-500';
        iconClass = 'fa-solid fa-circle-info';
    }

    notif.className = `flex items-center gap-3 min-w-[300px] max-w-[400px] p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border ${borderColor} transition-all duration-300 translate-x-10 opacity-0`;

    notif.innerHTML = `
        <div class="w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center text-lg shrink-0">
            <i class="${iconClass}"></i>
        </div>
        <div class="flex-1">
            <div class="font-bold text-sm text-white">${title}</div>
            <div class="text-xs text-slate-400 mt-0.5">${message}</div>
        </div>
        <button onclick="this.parentElement.remove()" class="text-slate-500 hover:text-white p-1 text-lg cursor-pointer">&times;</button>
    `;

    container.appendChild(notif);

    setTimeout(() => {
        notif.classList.remove('translate-x-10', 'opacity-0');
    }, 10);

    setTimeout(() => {
        notif.classList.add('translate-x-10', 'opacity-0');
        setTimeout(() => notif.remove(), 300);
    }, 4000);
}

// ==========================================
// 🔐 ระบบเข้าสู่ระบบ / ออกจากระบบ
// ==========================================
function handleLoginSubmit(event) {
    if (event) event.preventDefault();

    const emailInput = document.getElementById('auth-email').value.trim();
    const passwordInput = document.getElementById('auth-password').value.trim();

    const isAuthorized = emailInput.endsWith('@tipwong.com') || passwordInput === 'tipwong2026';

    if (isAuthorized) {
        currentUser = {
            name: emailInput ? emailInput.split('@')[0] : 'Admin',
            email: emailInput || 'tipwong@admin.com',
            role: "พนักงานบริษัท (Authorized Staff)",
            profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
        };

        localStorage.setItem('tipwong_current_user', JSON.stringify(currentUser));

        showNotification("สำเร็จ!", "เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับสมาชิกบริษัท", "success");
        closeAuthModal();
        updateAuthUI();
    } else {
        showNotification("แจ้งเตือน", "ขออภัย! ระบบนี้สำหรับพนักงานของบริษัท Tipwong เท่านั้น", "error");
    }
}

function updateAuthUI() {
    const authStatusContainer = document.getElementById('auth-status-container');
    const loginBanner = document.getElementById('login-required-banner');

    if (currentUser) {
        if (loginBanner) loginBanner.style.display = 'none';

        if (authStatusContainer) {
            authStatusContainer.innerHTML = `
                <div class="flex items-center space-x-3 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                    <img src="${currentUser.profileImage}" alt="Profile" class="w-9 h-9 rounded-full object-cover border-2 border-red-500">
                    <div class="text-left">
                        <p class="text-xs font-bold text-white">${currentUser.name}</p>
                        <p class="text-[10px] text-red-400">${currentUser.role}</p>
                    </div>
                    <button onclick="handleLogout()" class="ml-2 text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded cursor-pointer">ออก</button>
                </div>
            `;
        }
    }
}

function handleLogout() {
    localStorage.removeItem('tipwong_current_user');
    currentUser = null;
    showNotification("ข้อมูลระบบ", "ออกจากระบบเรียบร้อยแล้ว", "info");
    setTimeout(() => location.reload(), 1000);
}

function openAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.classList.remove("hidden");
}

function closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.classList.add("hidden");
}

// 📜 ฟังก์ชันเปิดหน้าต่าง Popup เงื่อนไขการเป็นสมาชิกและบริการ
function openTermsModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    let modal = document.getElementById('terms-popup-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'terms-popup-modal';
        modal.className = 'fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
                <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                    <h3 class="font-bold text-sm">เงื่อนไขการเป็นสมาชิกและบริการ</h3>
                    <button onclick="document.getElementById('terms-popup-modal').remove()" class="text-slate-400 hover:text-white text-xl font-bold cursor-pointer border-none bg-transparent">&times;</button>
                </div>
                <div class="p-6 overflow-y-auto text-xs text-slate-600 space-y-3 leading-relaxed">
                    <p><strong>1. การยอมรับเงื่อนไข:</strong> การสมัครสมาชิกและการใช้บริการ ถือว่าท่านได้อ่าน ทำความเข้าใจ และตกลงยินยอมปฏิบัติตามข้อกำหนดและเงื่อนไขฉบับนี้ทุกประการ</p>
                    <p><strong>2. ข้อมูลส่วนบุคคล:</strong> ทางบริษัทจะเก็บรักษาข้อมูลส่วนบุคคลของท่านตามนโยบายความเป็นส่วนตัว โดยข้อมูลที่อยู่จัดส่งและเบอร์โทรศัพท์จะนำไปใช้ในการจัดส่งสินค้าเท่านั้น</p>
                    <p><strong>3. ความถูกต้องของข้อมูล:</strong> ผู้ใช้งานต้องกรอกข้อมูลที่เป็นจริง หากเกิดข้อผิดพลาดจากข้อมูลที่ไม่ถูกต้อง ทางบริษัทขอสงวนสิทธิ์ในการรับผิดชอบความเสียหายที่เกิดขึ้น</p>
                </div>
                <div class="px-6 py-4 bg-slate-100 flex justify-end gap-2 border-t">
                    <button onclick="document.getElementById('accept-terms').checked = true; document.getElementById('terms-popup-modal').remove(); showNotification('สำเร็จ', 'คุณได้กดยอมรับเงื่อนไขเรียบร้อยแล้ว', 'success');" class="px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 cursor-pointer border-none">ยอมรับเงื่อนไขนี้</button>
                    <button onclick="document.getElementById('terms-popup-modal').remove()" class="px-4 py-2 bg-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-400 cursor-pointer border-none">ปิดหน้าต่าง</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.classList.remove('hidden');
    }
}

// 🎯 โหลดหน้าเว็บพร้อมเช็คว่า Modal เคยเด้งขึ้นมาหรือยัง (แสดงแค่ครั้งเดียว)
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    initRealtimeCustomerSync();

    // ตรวจสอบการเปิด Modal อัตโนมัติครั้งแรก
    const hasShownModal = localStorage.getItem("tipwong_shipping_shown");
    if (!hasShownModal) {
        openShippingModal();
    } else {
        closeShippingModal();
    }
});

function toggleAuthMode() {
    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');
    const title = document.getElementById('auth-modal-title');
    const description = document.getElementById('auth-modal-description');

    if (loginForm && registerForm) {
        loginForm.classList.toggle('hidden');
        registerForm.classList.toggle('hidden');

        if (loginForm.classList.contains('hidden')) {
            if (title) title.innerText = 'ยืนยันที่อยู่การจัดส่ง';
            if (description) description.innerText = 'กรอกข้อมูลรายละเอียดและที่อยู่จัดส่งสินค้าของคุณ';
        } else {
            if (title) title.innerText = 'เข้าสู่ระบบ';
            if (description) description.innerText = 'เข้าสู่ระบบ TIPWONG เพื่อจัดการข้อมูลลูกค้าและที่อยู่จัดส่ง';
        }
    }
}

function toggleAuthPassword() {
    const passwordInput = document.getElementById('auth-password');
    const passwordIcon = document.getElementById('auth-password-icon');

    if (passwordInput && passwordIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passwordIcon.classList.remove('fa-eye');
            passwordIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            passwordIcon.classList.remove('fa-eye-slash');
            passwordIcon.classList.add('fa-eye');
        }
    }
}

// ฟังก์ชันกลางรองรับการกดส่งฟอร์ม (แยกโหมด Login / Register)
function handleAuthSubmit(mode, event) {
    if (event) event.preventDefault();

    const loginForm = document.getElementById('auth-login-form');

    if (loginForm && !loginForm.classList.contains('hidden') && mode !== 'register') {
        const email = document.getElementById('auth-email') ? document.getElementById('auth-email').value : '';
        const password = document.getElementById('auth-password') ? document.getElementById('auth-password').value : '';

        if (!email || !password) {
            showNotification("แจ้งเตือน", "กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน", "error");
            return;
        }

        handleLoginSubmit(event);
    } else {
        const acceptTerms = document.getElementById('accept-terms');
        if (!acceptTerms || !acceptTerms.checked) {
            showNotification("แจ้งเตือน", "กรุณากดยอมรับ 'เงื่อนไขการเป็นสมาชิกและบริการ' ก่อนดำเนินการต่อ", "error");
            if (acceptTerms) acceptTerms.focus();
            return;
        }

        const name = document.getElementById('register-name') ? document.getElementById('register-name').value : '';
        const phone = document.getElementById('register-phone') ? document.getElementById('register-phone').value : '';
        const address = document.getElementById('register-address') ? document.getElementById('register-address').value : '';

        if (!name || !phone || !address) {
            showNotification("แจ้งเตือน", "กรุณากรอกข้อมูลที่อยู่จัดส่งให้ครบถ้วน", "error");
            return;
        }

        saveCustomerData(event);
    }
}

function resetAuthPassword() {
    showNotification("ข้อมูลระบบ", "กรุณาติดต่อเจ้าหน้าที่เพื่อรีเซ็ตรหัสผ่าน", "info");
}

// ==========================================
// 📦 ระบบบันทึกข้อมูลลูกค้า + Cloud Sync + EmailJS + พิกัดแผนที่ + LINE Push
// ==========================================
function saveCustomerData(event) {
    if (event) event.preventDefault();

    const acceptTerms = document.getElementById('accept-terms');
    if (acceptTerms && !acceptTerms.checked) {
        showNotification("แจ้งเตือน", "กรุณาอ่านและกดยอมรับเงื่อนไขการเป็นสมาชิกและบริการก่อนดำเนินการต่อ", "error");
        acceptTerms.focus();
        return;
    }

    const customerData = {
        customerType: currentCustomerType,
        companyName: currentCustomerType === 'company' ? document.getElementById('register-company').value : '-',
        taxId: currentCustomerType === 'company' ? document.getElementById('register-tax-id').value : '-',
        name: document.getElementById('register-name').value,
        phone: document.getElementById('register-phone').value,
        email: document.getElementById('register-email') ? document.getElementById('register-email').value : '',
        address: document.getElementById('register-address').value,
        latitude: document.getElementById('customer-lat') ? document.getElementById('customer-lat').value : null,
        longitude: document.getElementById('customer-lng') ? document.getElementById('customer-lng').value : null,
        savedBy: currentUser ? currentUser.name : 'Customer (Online)',
        timestamp: new Date().toLocaleString('th-TH')
    };

    if (!customerData.name || !customerData.phone || !customerData.address) {
        showNotification("แจ้งเตือน", "กรุณากรอกชื่อ เบอร์โทร และที่อยู่ให้ครบถ้วน", "error");
        return;
    }

    const submitBtn = document.getElementById('auth-register-btn');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึกข้อมูลและส่งข้อมูล...';
        submitBtn.disabled = true;
    }

    if (typeof db !== 'undefined') {
        db.collection("tipwong_customers").add(customerData).catch((error) => {
            console.error("Cloud Sync Error: ", error);
        });
    }

    // บันทึกลง LocalStorage ของคนที่กรอกจริง
    let customerList = JSON.parse(localStorage.getItem('tipwong_customers')) || [];
    customerList.push(customerData);
    localStorage.setItem('tipwong_customers', JSON.stringify(customerList));

    // บันทึกสถานะว่าได้ยืนยันแล้วจะไม่เด้งซ้ำ
    localStorage.setItem("tipwong_shipping_shown", "true");

    const emailParams = {
        customer_type: customerData.customerType === 'company' ? 'ในนามบริษัท/ร้านค้า' : 'บุคคลทั่วไป',
        company_name: customerData.companyName,
        tax_id: customerData.taxId,
        customer_name: customerData.name,
        phone: customerData.phone,
        email: customerData.email,
        address: customerData.address,
        saved_by: customerData.savedBy,
        timestamp: customerData.timestamp
    };

    if (typeof emailjs !== 'undefined') {
        emailjs.send(
            'service_2rk0h9s',
            'template_xyz9876',
            emailParams,
            'gJk-s8a9df7654321'
        )
            .then((response) => {
                showNotification("สำเร็จ!", "ยืนยันที่อยู่เรียบร้อยแล้ว!", "success");
                sendCheckoutToLine();
            })
            .catch((error) => {
                console.error('FAILED...', error);
                showNotification("แจ้งเตือน", "บันทึกข้อมูลสำเร็จ แต่การส่งอีเมลขัดข้อง", "error");
                sendCheckoutToLine();
            })
            .finally(() => {
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
    } else {
        showNotification("สำเร็จ!", "ยืนยันที่อยู่การจัดส่งเรียบร้อยแล้ว!", "success");
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
        sendCheckoutToLine();
    }
}

function initRealtimeCustomerSync() {
    if (typeof db !== 'undefined') {
        db.collection("tipwong_customers").onSnapshot((snapshot) => {
            let cloudCustomers = [];
            snapshot.forEach((doc) => {
                cloudCustomers.push(doc.data());
            });
            localStorage.setItem('tipwong_customers', JSON.stringify(cloudCustomers));
        });
    }
}

// ==========================================
// 🗺️ ระบบปักหมุดแผนที่ (Leaflet.js Integration)
// ==========================================
let customerMap = null;
let customerMarker = null;

function initCustomerMap(defaultLat = 13.7563, defaultLng = 100.5018) {
    const mapContainer = document.getElementById('customer-map');

    if (mapContainer && !customerMap) {
        customerMap = L.map('customer-map').setView([defaultLat, defaultLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(customerMap);

        customerMarker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(customerMap);

        updateLatLonInputs(defaultLat, defaultLng);

        customerMap.on('click', function (e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            customerMarker.setLatLng([lat, lng]);
            updateLatLonInputs(lat, lng);
        });

        customerMarker.on('dragend', function (e) {
            const lat = customerMarker.getLatLng().lat;
            const lng = customerMarker.getLatLng().lng;
            updateLatLonInputs(lat, lng);
        });
    }
}

function updateLatLonInputs(lat, lng) {
    const latInput = document.getElementById('customer-lat');
    const lngInput = document.getElementById('customer-lng');

    if (latInput) latInput.value = lat;
    if (lngInput) lngInput.value = lng;
}

// ==========================================
// 📄 ระบบสลับหน้าเว็บ (อัปเดตให้กด "สินค้าของเรา" แล้วเลื่อนมากลางหน้าเว็บทันที)
// ==========================================

function navigateTo(pageId) {
    const homeSection = document.getElementById('home-section');
    const termsSection = document.getElementById('terms-section');

    if (pageId === 'home' || pageId === 'index.html' || pageId === 'index') {
        if (termsSection) termsSection.classList.add('hidden');
        if (homeSection) homeSection.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (pageId === 'shop') {
        // เมื่อกด "สินค้าของเรา" ให้คำนวณตำแหน่งกึ่งกลางหน้าจอแล้วเลื่อนมาโชว์พอดี
        if (termsSection) termsSection.classList.add('hidden');
        if (homeSection) homeSection.classList.remove('hidden');
        
        const middleHeight = (document.documentElement.scrollHeight - window.innerHeight) / 2;
        window.scrollTo({ top: middleHeight, behavior: 'smooth' });
    } else if (pageId === 'terms') {
        if (homeSection) homeSection.classList.add('hidden');
        if (termsSection) termsSection.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        showNotification("ข้อมูลระบบ", `กำลังเปลี่ยนไปยังหน้า: ${pageId}`, "info");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        btn.classList.remove('text-red-500', 'border-b-2', 'border-red-500');
        btn.classList.add('text-gray-400');
    });

    const activeBtn = document.getElementById('btn-' + pageId);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-400');
        activeBtn.classList.add('text-red-500', 'border-b-2', 'border-red-500');
    }
}

// ฟังก์ชันปิด Modal และบันทึกสถานะไม่ให้แสดงซ้ำ
function closeShippingModal() {
    const modal = document.getElementById('shipping-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    localStorage.setItem("tipwong_shipping_shown", "true");
}

// ฟังก์ชันเปิด Modal พร้อมโหลดข้อมูลตัวอย่างจริงใส่ไว้ให้
function openShippingModal() {
    const modal = document.getElementById('shipping-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        const nameInput = document.getElementById('register-name');
        const phoneInput = document.getElementById('register-phone');
        const addressInput = document.getElementById('register-address');

        if (nameInput) nameInput.value = defaultShippingData.name;
        if (phoneInput) phoneInput.value = defaultShippingData.phone;
        if (addressInput) addressInput.value = defaultShippingData.address;
    }
}

// ==========================================
// 🔍 ระบบค้นหาสินค้า (Search System Integration)
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");

    if (!searchInput || !searchButton) return;

    function searchProducts() {
        const keyword = searchInput.value.trim().toLowerCase();
        const products = document.querySelectorAll(".product-item");
        let found = 0;

        products.forEach(product => {
            const productText = product.innerText.toLowerCase();

            if (keyword === "" || productText.includes(keyword)) {
                product.style.display = "flex";
                found++;
            } else {
                product.style.display = "none";
            }
        });

        if (typeof navigateTo === "function") {
            navigateTo("shop");
        }

        let noSearchResult = document.getElementById("no-search-result");

        if (!noSearchResult) {
            noSearchResult = document.createElement("div");
            noSearchResult.id = "no-search-result";
            noSearchResult.className = "text-center py-12 text-gray-400 font-bold text-base w-full";
            noSearchResult.innerHTML = "🔍 ไม่พบสินค้าที่ค้นหา";

            const shopPage = document.getElementById("page-shop");
            if (shopPage) {
                shopPage.appendChild(noSearchResult);
            }
        }

        if (keyword !== "" && found === 0) {
            noSearchResult.classList.remove("hidden");
        } else {
            noSearchResult.classList.add("hidden");
        }
    }

    searchButton.addEventListener("click", searchProducts);

    searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            searchProducts();
        }
    });
});