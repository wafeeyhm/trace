// Core State & Utilities
let menu = []; let inventory = []; let invCats = []; let menuCats = []; let vendors = []; let taxes = []; let expenses = [];
let isOnline = navigator.onLine;

async function fetchJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (j && j.error) throw new Error(j.error);
    return j;
}

async function refreshCoreData() {
    try {
        const [m, inv, ic, mc, v, t, e] = await Promise.all([
            fetchJSON('../api/?action=get_menu'),
            fetchJSON('../api/?action=get_inventory'),
            fetchJSON('../api/?action=get_inventory_categories'),
            fetchJSON('../api/?action=get_menu_categories'),
            fetchJSON('../api/?action=get_vendors'),
            fetchJSON('../api/?action=get_taxes'),
            fetchJSON('../api/?action=get_expenses')
        ]);

        menu = Array.isArray(m) ? m : [];
        inventory = Array.isArray(inv) ? inv : [];
        invCats = Array.isArray(ic) ? ic : [];
        menuCats = Array.isArray(mc) ? mc : [];
        vendors = Array.isArray(v) ? v : [];
        taxes = Array.isArray(t) ? t : [];
        expenses = Array.isArray(e) ? e : [];
        
        return true;
    } catch (e) {
        console.error("Trace Core Data Error:", e);
        throw e;
    }
}

// --- Online/Offline Handling ---
function handleOnline() {
    isOnline = true;
    const banner = document.getElementById('offline-banner');
    if (banner) banner.classList.add('hidden');
    // Attempt to sync any queued orders
    if (typeof syncQueue === 'function') syncQueue();
}

function handleOffline() {
    isOnline = false;
    const banner = document.getElementById('offline-banner');
    if (banner) banner.classList.remove('hidden');
}

window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);

// Apply initial state
if (!isOnline) handleOffline();

// --- Modal Helpers ---
function openModal(id) { 
    const el = document.getElementById(id); 
    if (el) { 
        el.classList.remove('hidden'); 
        el.classList.add('flex'); 
    } 
}

function closeModal(id) { 
    const el = document.getElementById(id); 
    if (el) { 
        el.classList.add('hidden'); 
        el.classList.remove('flex'); 
    } 
}
