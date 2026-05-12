// Trace Pulse — Core State & Utilities
// POS only needs menu, inventory, categories, and taxes.
// Vendors / expenses / inventory-categories are back-office data and are NOT fetched here.
let menu = [];
let inventory = [];
let menuCats = [];
let taxes = [];
let isOnline = navigator.onLine;

async function fetchJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (j && j.error) throw new Error(j.error);
    return j;
}

async function refreshCoreData() {
    const [m, inv, mc, t] = await Promise.all([
        fetchJSON('../api/?action=get_menu'),
        fetchJSON('../api/?action=get_inventory'),
        fetchJSON('../api/?action=get_menu_categories'),
        fetchJSON('../api/?action=get_taxes'),
    ]);

    menu      = Array.isArray(m)   ? m   : [];
    inventory = Array.isArray(inv) ? inv : [];
    menuCats  = Array.isArray(mc)  ? mc  : [];
    taxes     = Array.isArray(t)   ? t   : [];
}

// --- Online / Offline Handling ---
function handleOnline() {
    isOnline = true;
    const banner = document.getElementById('offline-banner');
    if (banner) banner.classList.add('hidden');
    if (typeof syncQueue === 'function') syncQueue();
}

function handleOffline() {
    isOnline = false;
    const banner = document.getElementById('offline-banner');
    if (banner) banner.classList.remove('hidden');
}

window.addEventListener('online',  handleOnline);
window.addEventListener('offline', handleOffline);
if (!isOnline) handleOffline();

// --- Modal Helpers ---
function openModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('hidden'); el.classList.add('flex'); }
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
}
