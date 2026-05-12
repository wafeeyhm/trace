// Trace Kitchen Display System (KDS) — Phase Two
const API_BASE      = '../api/';
const POLL_INTERVAL = 4000;                   // 4 seconds
const WARN_THRESHOLD   = 3 * 60 * 1000;      // 3 min → amber
const URGENT_THRESHOLD = 5 * 60 * 1000;      // 5 min → red

let knownOrderIds = new Set();
let pollTimer     = null;
let audioCtx      = null; // Web Audio context (lazy-init on first user tap)

// ============================================================
// AUDIO — Web Audio API chime (no file dependency)
// ============================================================
function initAudio() {
    if (audioCtx) return;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
}

function playNewOrderChime() {
    if (!audioCtx) return;
    try {
        // Two-tone ascending chime
        [[880, 0], [1046, 0.12]].forEach(([freq, delay]) => {
            const osc  = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            const t = audioCtx.currentTime + delay;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.4, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc.start(t);
            osc.stop(t + 0.5);
        });
    } catch {}
}

// ============================================================
// POLLING
// ============================================================
async function pollOrders() {
    try {
        const res    = await fetch(`${API_BASE}?action=get_pending_orders`);
        const orders = await res.json();
        setConnectionStatus(true);
        renderKDS(Array.isArray(orders) ? orders : []);
    } catch {
        setConnectionStatus(false);
    }
}

function startPolling() {
    pollOrders();
    pollTimer = setInterval(pollOrders, POLL_INTERVAL);
}

// Pause when tab hidden, resume on focus (battery-friendly)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearInterval(pollTimer); }
    else                 { startPolling(); }
});

// ============================================================
// RENDER
// ============================================================
function renderKDS(orders) {
    const grid       = document.getElementById('kds-grid');
    const empty      = document.getElementById('kds-empty');
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

    // Remove cards that are no longer pending/preparing
    knownOrderIds.forEach(id => {
        if (!incomingIds.has(id)) removeOrderCard(id);
    });

    // Add new cards; update existing ones
    orders.forEach(order => {
        if (!knownOrderIds.has(order.id)) {
            addOrderCard(order, grid);
            knownOrderIds.add(order.id);
            playNewOrderChime();           // 🔔 chime on every new ticket
        } else {
            updateOrderCardStatus(order);
        }
    });
}

// ============================================================
// CARD BUILD / UPDATE
// ============================================================
function addOrderCard(order, grid) {
    const card = document.createElement('div');
    card.id        = `order-card-${order.id}`;
    card.className = `order-card glass rounded-[28px] p-6 flex flex-col gap-4 status-${order.kds_status}`;
    card.innerHTML = buildCardHTML(order);
    grid.appendChild(card);
    startTimer(card, order.created_at);
}

function buildCardHTML(order) {
    const typeLabel = order.order_type === 'takeaway'
        ? `<span class="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded" style="background:rgba(var(--color-accent),0.15);color:rgb(var(--color-accent))">🥡 Takeaway</span>`
        : `<span class="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded" style="background:rgba(255,255,255,0.08)">🍽 Dine In</span>`;

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
                <div class="mt-1">${typeLabel}</div>
            </div>
            <div class="text-right">
                ${statusLabel}
                <p id="timer-${order.id}" class="text-xl font-black mt-1 timer-ok tabular-nums">00:00</p>
            </div>
        </div>
        <div class="flex-1 space-y-0">${itemsHTML}</div>
        <div class="kds-actions flex flex-col gap-3 mt-2" data-order-id="${order.id}" data-status="${order.kds_status}">
            ${startBtn}
            <button onclick="updateStatus(${order.id}, 'done')" class="kds-action-btn" style="background:rgba(var(--color-success),0.15);border-color:rgba(var(--color-success),0.3);color:rgb(var(--color-success))">
                <i class="fas fa-check mr-2"></i>DONE
            </button>
        </div>
    `;
}

// FIX: use the data-attribute selector (was previously broken `.grid.grid-cols-2`)
function updateOrderCardStatus(order) {
    const card = document.getElementById(`order-card-${order.id}`);
    if (!card) return;

    // Update status border class
    card.className = card.className.replace(/status-\w+/, `status-${order.kds_status}`);

    // Re-render only the action buttons block using the reliable data-attribute
    const actionsDiv = card.querySelector(`.kds-actions[data-order-id="${order.id}"]`);
    if (!actionsDiv) return;

    const startBtn = order.kds_status === 'pending'
        ? `<button onclick="updateStatus(${order.id}, 'preparing')" class="kds-action-btn" style="background:rgba(251,191,36,0.15);border-color:rgba(251,191,36,0.3);color:rgb(251,191,36)">
               <i class="fas fa-fire mr-2"></i>START
           </button>`
        : '';

    actionsDiv.innerHTML = `
        ${startBtn}
        <button onclick="updateStatus(${order.id}, 'done')" class="kds-action-btn" style="background:rgba(var(--color-success),0.15);border-color:rgba(var(--color-success),0.3);color:rgb(var(--color-success))">
            <i class="fas fa-check mr-2"></i>DONE
        </button>
    `;
    actionsDiv.setAttribute('data-status', order.kds_status);
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
    const start   = new Date(createdAt).getTime();
    const orderId = card.id.replace('order-card-', '');

    const tick = () => {
        const timerEl = document.getElementById(`timer-${orderId}`);
        if (!timerEl) return;
        const elapsed = Date.now() - start;
        const mins = Math.floor(elapsed / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);
        timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        timerEl.className = timerEl.className.replace(/timer-\w+/, '');
        if      (elapsed >= URGENT_THRESHOLD) timerEl.classList.add('timer-urgent');
        else if (elapsed >= WARN_THRESHOLD)   timerEl.classList.add('timer-warn');
        else                                  timerEl.classList.add('timer-ok');
    };

    tick();
    const interval = setInterval(() => {
        if (!document.getElementById(`timer-${orderId}`)) clearInterval(interval);
        else tick();
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
            if (status === 'done') removeOrderCard(orderId);
            else pollOrders(); // re-poll to reflect 'preparing' state
        } else {
            alert(d.error || 'Failed to update status');
        }
    } catch {
        alert('Connection error');
    }
}

// ============================================================
// CONNECTION STATUS
// ============================================================
function setConnectionStatus(online) {
    const indicator = document.getElementById('connection-indicator');
    if (!indicator) return;
    const dot   = indicator.querySelector('span:first-child');
    const label = indicator.querySelector('span:last-child');
    if (online) {
        dot.className   = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
        label.textContent = 'Live';
    } else {
        dot.className   = 'w-2 h-2 rounded-full bg-red-400';
        label.textContent = 'Offline';
    }
}

// ============================================================
// THEME TOGGLE (mirrors POS register)
// ============================================================
function toggleKDSTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === 'highcontrast' ? '' : 'highcontrast';
    document.documentElement.setAttribute('data-theme', next);
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('pos_theme', next);
}

// Restore saved theme on load
(function () {
    const saved = localStorage.getItem('pos_theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
        document.body.setAttribute('data-theme', saved);
    }
})();

// ============================================================
// LIVE CLOCK
// ============================================================
function updateClock() {
    const el = document.getElementById('kds-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}
updateClock();
setInterval(updateClock, 1000);

// ============================================================
// COMPONENT STYLES (injected so kds.html stays lean)
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
        width: 100%;
    }
    .kds-action-btn:hover  { transform: scale(1.03); filter: brightness(1.2); }
    .kds-action-btn:active { transform: scale(0.97); }
`;
document.head.appendChild(style);

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Init audio context on first tap (browser policy requires user gesture)
    document.addEventListener('pointerdown', initAudio, { once: true });
    startPolling();
});
