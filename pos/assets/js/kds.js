// Trace Kitchen Display System (KDS) — Phase Two
const API_BASE = '../api/';
const POLL_INTERVAL = 4000; // 4 seconds
const WARN_THRESHOLD = 3 * 60 * 1000;   // 3 min → amber
const URGENT_THRESHOLD = 5 * 60 * 1000; // 5 min → red

let knownOrderIds = new Set();
let pollTimer = null;

// ============================================================
// POLLING
// ============================================================
async function pollOrders() {
    try {
        const res = await fetch(`${API_BASE}?action=get_pending_orders`);
        const orders = await res.json();

        setConnectionStatus(true);
        renderKDS(Array.isArray(orders) ? orders : []);
    } catch (e) {
        setConnectionStatus(false);
    }
}

function startPolling() {
    pollOrders(); // immediate first fetch
    pollTimer = setInterval(pollOrders, POLL_INTERVAL);
}

// Pause when tab is hidden, resume on focus (battery friendly)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(pollTimer);
    } else {
        startPolling();
    }
});

// ============================================================
// RENDER
// ============================================================
function renderKDS(orders) {
    const grid = document.getElementById('kds-grid');
    const empty = document.getElementById('kds-empty');
    const countBadge = document.getElementById('count-badge');

    countBadge.textContent = `${orders.length} order${orders.length !== 1 ? 's' : ''}`;

    if (orders.length === 0) {
        empty.classList.remove('hidden');
        grid.classList.add('hidden');
        knownOrderIds.clear();
        return;
    }

    empty.classList.add('hidden');
    grid.classList.remove('hidden');

    const incomingIds = new Set(orders.map(o => o.id));

    // Remove cards for orders no longer in pending/preparing
    knownOrderIds.forEach(id => {
        if (!incomingIds.has(id)) {
            removeOrderCard(id);
        }
    });

    // Add new cards, update existing ones
    orders.forEach(order => {
        if (!knownOrderIds.has(order.id)) {
            addOrderCard(order, grid);
            knownOrderIds.add(order.id);
        } else {
            updateOrderCardStatus(order);
        }
    });
}

function addOrderCard(order, grid) {
    const card = document.createElement('div');
    card.id = `order-card-${order.id}`;
    card.className = `order-card glass rounded-[28px] p-6 flex flex-col gap-4 status-${order.kds_status}`;
    card.innerHTML = buildCardHTML(order);
    grid.appendChild(card);

    // Start elapsed timer for this card
    startTimer(card, order.created_at);
}

function buildCardHTML(order) {
    const itemsHTML = (order.items || []).map(item => `
        <div class="flex justify-between items-center py-2 border-b" style="border-color:rgba(255,255,255,0.06)">
            <span class="font-bold text-sm" style="color:rgb(var(--color-text))">${item.item_name}</span>
            <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold" style="color:rgb(var(--color-secondary))">${item.variant_name}</span>
                <span class="text-lg font-black px-3 py-1 rounded-xl" style="background:rgba(var(--color-accent),0.15);color:rgb(var(--color-accent))">×${item.quantity}</span>
            </div>
        </div>
    `).join('');

    const statusLabel = order.kds_status === 'pending'
        ? `<span class="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded" style="background:rgba(255,255,255,0.08)">Pending</span>`
        : `<span class="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded" style="background:rgba(251,191,36,0.15);color:rgb(251,191,36)">Preparing</span>`;

    const startBtn = order.kds_status === 'pending'
        ? `<button onclick="updateStatus(${order.id}, 'preparing')" class="kds-action-btn" style="background:rgba(251,191,36,0.15);border-color:rgba(251,191,36,0.3);color:rgb(251,191,36)">
               <i class="fas fa-fire mr-2"></i>START
           </button>`
        : '';

    return `
        <div class="flex justify-between items-start">
            <div>
                <p class="text-[10px] font-black uppercase tracking-widest" style="color:rgb(var(--color-secondary))">Order</p>
                <h2 class="text-3xl font-black">#${order.id}</h2>
            </div>
            <div class="text-right">
                ${statusLabel}
                <p id="timer-${order.id}" class="text-xl font-black mt-1 timer-ok tabular-nums">00:00</p>
            </div>
        </div>
        <div class="flex-1 space-y-0">${itemsHTML}</div>
        <div class="flex flex-col gap-3 mt-2">
            ${startBtn}
            <button onclick="updateStatus(${order.id}, 'done')" class="kds-action-btn" style="background:rgba(var(--color-success),0.15);border-color:rgba(var(--color-success),0.3);color:rgb(var(--color-success))">
                <i class="fas fa-check mr-2"></i>DONE
            </button>
        </div>
    `;
}

function updateOrderCardStatus(order) {
    const card = document.getElementById(`order-card-${order.id}`);
    if (!card) return;
    // Update status class
    card.className = card.className.replace(/status-\w+/, `status-${order.kds_status}`);
    // Re-render action buttons only (preserve timer)
    const actionsDiv = card.querySelector('.grid.grid-cols-2');
    if (actionsDiv) {
        actionsDiv.outerHTML = buildCardHTML(order).match(/<div class="grid grid-cols-2[^>]*>[\s\S]*?<\/div>\s*<\/div>/)?.[0] || '';
    }
}

function removeOrderCard(orderId) {
    const card = document.getElementById(`order-card-${orderId}`);
    if (!card) return;
    card.classList.add('removing');
    setTimeout(() => card.remove(), 400);
    knownOrderIds.delete(orderId);
}

// ============================================================
// TIMER
// ============================================================
function startTimer(card, createdAt) {
    const start = new Date(createdAt).getTime();
    const orderId = card.id.replace('order-card-', '');

    const tick = () => {
        const timerEl = document.getElementById(`timer-${orderId}`);
        if (!timerEl) return; // card was removed

        const elapsed = Date.now() - start;
        const mins = Math.floor(elapsed / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);
        timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        timerEl.className = timerEl.className.replace(/timer-\w+/, '');
        if (elapsed >= URGENT_THRESHOLD) {
            timerEl.classList.add('timer-urgent');
        } else if (elapsed >= WARN_THRESHOLD) {
            timerEl.classList.add('timer-warn');
        } else {
            timerEl.classList.add('timer-ok');
        }
    };

    tick();
    const interval = setInterval(() => {
        if (!document.getElementById(`timer-${orderId}`)) {
            clearInterval(interval);
        } else {
            tick();
        }
    }, 1000);
}

// ============================================================
// STATUS UPDATE
// ============================================================
async function updateStatus(orderId, status) {
    try {
        const res = await fetch(`${API_BASE}?action=update_kds_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, status })
        });
        const d = await res.json();
        if (d.success) {
            if (status === 'done') {
                removeOrderCard(orderId);
            } else {
                // Re-poll immediately to reflect preparing state
                pollOrders();
            }
        } else {
            alert(d.error || 'Failed to update status');
        }
    } catch (e) {
        alert('Connection error');
    }
}

// ============================================================
// CONNECTION STATUS
// ============================================================
function setConnectionStatus(online) {
    const indicator = document.getElementById('connection-indicator');
    if (!indicator) return;
    const dot = indicator.querySelector('span:first-child');
    const label = indicator.querySelector('span:last-child');
    if (online) {
        dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
        label.textContent = 'Live';
    } else {
        dot.className = 'w-2 h-2 rounded-full bg-red-400';
        label.textContent = 'Offline';
    }
}

// ============================================================
// LIVE CLOCK
// ============================================================
function updateClock() {
    const el = document.getElementById('kds-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
updateClock();
setInterval(updateClock, 1000);

// ============================================================
// GLOBAL STYLES (injected for KDS-specific elements)
// ============================================================
const style = document.createElement('style');
style.textContent = `
    .kds-action-btn {
        padding: 14px;
        border-radius: 14px;
        border: 1px solid;
        font-weight: 900;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        cursor: pointer;
        transition: all 0.15s ease;
    }
    .kds-action-btn:hover { transform: scale(1.03); filter: brightness(1.2); }
    .kds-action-btn:active { transform: scale(0.97); }
`;
document.head.appendChild(style);

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', startPolling);
