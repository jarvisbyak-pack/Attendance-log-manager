// Attendance Log Manager - Frontend Logic (app.js)

// --- State Management ---
let settings = {
    gasUrl: '',
    expiryDays: 5,
    telegramToken: '',
    telegramChatId: '',
    adminPin: 'admin'
};

let currentInput = '';
let selectedMember = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updateClock();
    setInterval(updateClock, 1000);
    refreshData();
    // Auto-refresh every minute
    setInterval(refreshData, 60000);
});

// --- UI Helpers ---
function updateClock() {
    const clockEl = document.getElementById('clock');
    if (clockEl) {
        clockEl.textContent = new Date().toLocaleTimeString();
    }
}

function showSection(id, el) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const targetSection = document.getElementById(id);
    if (targetSection) targetSection.classList.add('active');
    
    if (el) {
        el.classList.add('active');
    } else {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(n => {
            if (n.textContent.trim().toLowerCase() === id.toLowerCase()) n.classList.add('active');
        });
    }
}

function toggleNotif() {
    const panel = document.getElementById('notifPanel');
    if (panel) panel.classList.toggle('open');
}

function showNotification(message, type = 'warning') {
    const notifList = document.getElementById('notifList');
    if (!notifList) return;
    
    const item = document.createElement('div');
    item.className = 'notif-item';
    const colorMap = {
        'success': '#00ff88',
        'warning': '#ffaa00',
        'danger': '#ff4444',
        'info': '#00d4ff'
    };
    item.style.borderLeftColor = colorMap[type] || colorMap['warning'];
    item.innerHTML = `<strong>${type.toUpperCase()}:</strong> ${message}`;
    
    notifList.prepend(item);
    
    const panel = document.getElementById('notifPanel');
    if (panel) {
        panel.classList.add('open');
        setTimeout(() => panel.classList.remove('open'), 4000);
    }
}

// --- Keypad & Search ---
function keypadInput(val) {
    currentInput += val;
    const searchInput = document.getElementById('receptionSearch');
    if (searchInput) searchInput.value = currentInput;
}

function clearSearch() {
    currentInput = '';
    const searchInput = document.getElementById('receptionSearch');
    if (searchInput) searchInput.value = '';
    updateMemberDisplay(null);
}

async function searchMember() {
    const query = document.getElementById('receptionSearch').value;
    if (!query) return;

    showNotification('Searching...', 'info');
    try {
        const response = await callGAS('lookup', { query });
        if (response && response.success) {
            selectedMember = response.member;
            updateMemberDisplay(selectedMember);
        } else {
            showNotification('Member not found', 'danger');
            updateMemberDisplay(null);
        }
    } catch (error) {
        showNotification('Search error', 'danger');
    }
}

function updateMemberDisplay(member) {
    const name = document.getElementById('memberName');
    const id = document.getElementById('memberId');
    const dept = document.getElementById('memberDept');
    const status = document.getElementById('memberStatus');

    if (member) {
        name.textContent = member.name || 'Unknown';
        id.textContent = `Member ID: ${member.id || '-'}`;
        dept.textContent = `Department: ${member.department || '-'}`;
        status.textContent = `Status: ${member.status || '-'}`;
        selectedMember = member;
    } else {
        name.textContent = 'No Member Selected';
        id.textContent = 'Member ID: -';
        dept.textContent = 'Department: -';
        status.textContent = 'Status: -';
        selectedMember = null;
    }
}

// --- Attendance Actions ---
async function recordEntry() {
    if (!selectedMember) return showNotification('No member selected', 'warning');
    await handleAttendance('ENTRY');
}

async function recordExit() {
    if (!selectedMember) return showNotification('No member selected', 'warning');
    await handleAttendance('EXIT');
}

async function handleAttendance(type) {
    showNotification(`Recording ${type}...`, 'info');
    try {
        const result = await callGAS('attendance', {
            memberId: selectedMember.id,
            type: type
        });
        
        if (result && result.success) {
            showNotification(`${type} success for ${selectedMember.name}`, 'success');
            
            if (settings.telegramToken && settings.telegramChatId) {
                sendTelegram(`${type}: ${selectedMember.name} at ${new Date().toLocaleTimeString()}`);
            }
            
            setTimeout(() => {
                clearSearch();
                showSection('reception');
                refreshData();
            }, 2500);
        } else {
            showNotification(result.message || 'Action failed', 'danger');
        }
    } catch (error) {
        showNotification('API Error', 'danger');
    }
}

// --- API Logic ---
async function callGAS(action, data) {
    if (!settings.gasUrl) {
        showNotification('GAS URL is missing in Settings', 'danger');
        return null;
    }
    
    try {
        const response = await fetch(settings.gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action, ...data })
        });
        return await response.json();
    } catch (e) {
        console.error('GAS Call Failed:', e);
        throw e;
    }
}

// --- Data Rendering ---
async function refreshData() {
    try {
        const data = await callGAS('refresh', { expiryDays: settings.expiryDays });
        if (!data) return;
        
        renderTable('liveTable', data.live, (item) => `
            <tr>
                <td>${item.name}</td>
                <td>${item.timeIn}</td>
                <td>${item.timeOut || '-'}</td>
                <td class="${item.timeOut ? 'status-out' : 'status-in'}">${item.timeOut ? 'OUT' : 'IN'}</td>
            </tr>
        `, 'No active attendance');
        
        renderTable('historyTable', data.history, (item) => `
            <tr>
                <td>${item.name}</td>
                <td>${item.date}</td>
                <td>${item.timeIn}</td>
                <td>${item.timeOut}</td>
            </tr>
        `, 'No records found');

        renderList('expiringList', data.expiring, (item) => `
            <div class="notif-item" style="border-left-color: var(--warning)">
                <strong>${item.name}</strong><br>${item.docName}: Expires ${item.expiryDate}
            </div>
        `, 'No expiring documents');

        renderList('expiredList', data.expired, (item) => `
            <div class="notif-item" style="border-left-color: var(--danger)">
                <strong>${item.name}</strong><br>${item.docName}: Expired ${item.expiryDate}
            </div>
        `, 'No expired documents');

        renderList('clientsList', data.clients, (item) => `
            <div class="member-card">
                <div class="member-name">${item.name}</div>
                <div class="member-info">ID: ${item.id} | Dept: ${item.department}</div>
            </div>
        `, 'No clients added');

    } catch (e) {
        console.warn('Refresh failed', e);
    }
}

function renderTable(id, list, mapper, emptyMsg) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!list || list.length === 0) {
        el.innerHTML = \`<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">\${emptyMsg}</td></tr>\`;
        return;
    }
    el.innerHTML = list.map(mapper).join('');
}

function renderList(id, list, mapper, emptyMsg) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!list || list.length === 0) {
        el.innerHTML = \`<p style="color:var(--text-secondary)">\${emptyMsg}</p>\`;
        return;
    }
    el.innerHTML = list.map(mapper).join('');
}

// --- Admin & Settings ---
function openAdminModal() {
    document.getElementById('adminPin').value = '';
    document.getElementById('adminModal').classList.add('open');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

function verifyAdmin() {
    const pin = document.getElementById('adminPin').value;
    if (pin === settings.adminPin) {
        closeModal('adminModal');
        openSettings();
    } else {
        showNotification('Incorrect PIN', 'danger');
    }
}

function openSettings() {
    document.getElementById('gasUrl').value = settings.gasUrl;
    document.getElementById('expiryDays').value = settings.expiryDays;
    document.getElementById('telegramToken').value = settings.telegramToken;
    document.getElementById('telegramChatId').value = settings.telegramChatId;
    document.getElementById('settingsModal').classList.add('open');
}

function saveSettings() {
    settings.gasUrl = document.getElementById('gasUrl').value;
    settings.expiryDays = parseInt(document.getElementById('expiryDays').value) || 5;
    settings.telegramToken = document.getElementById('telegramToken').value;
    settings.telegramChatId = document.getElementById('telegramChatId').value;
    
    localStorage.setItem('attendanceSettings', JSON.stringify(settings));
    showNotification('Settings saved successfully', 'success');
    closeModal('settingsModal');
    refreshData();
}

function loadSettings() {
    const saved = localStorage.getItem('attendanceSettings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            settings = { ...settings, ...parsed };
        } catch (e) { console.error('Settings load error', e); }
    }
}

// --- Telegram ---
async function sendTelegram(text) {
    if (!settings.telegramToken || !settings.telegramChatId) return;
    try {
        await fetch(\`https://api.telegram.org/bot\${settings.telegramToken}/sendMessage\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: settings.telegramChatId, text: text })
        });
    } catch (e) { console.error('Telegram error', e); }
}

async function testTelegram() {
    showNotification('Sending test...', 'info');
    await sendTelegram('Attendance System Test Message');
}
