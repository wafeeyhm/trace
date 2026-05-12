// Trace Pulse — Offline Order Queue (Phase Two)
const QUEUE_KEY = 'trace_offline_queue';

function getQueue() {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveQueue(q) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function queueOrder(cart, total, tax, paymentType) {
    const q = getQueue();
    q.push({
        id: `offline_${Date.now()}`,
        cart,
        total,
        tax,
        payment_type: paymentType,
        queued_at: new Date().toISOString()
    });
    saveQueue(q);
    updateQueueBadge();
}

function getQueueCount() {
    return getQueue().length;
}

function updateQueueBadge() {
    const badge = document.getElementById('sync-badge');
    const count = getQueueCount();
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

async function syncQueue() {
    const q = getQueue();
    if (q.length === 0) return;

    const indicator = document.getElementById('sync-indicator');
    if (indicator) {
        indicator.classList.remove('hidden');
        indicator.querySelector('span').textContent = `Syncing ${q.length} order(s)...`;
    }

    const failed = [];
    for (const order of q) {
        try {
            const res = await fetch('../api/?action=process_order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cart: order.cart,
                    total: order.total,
                    tax: order.tax,
                    payment_type: order.payment_type
                })
            });
            const d = await res.json();
            if (!d.success) {
                // Stock conflict or other error — keep in queue but flag it
                failed.push({ ...order, sync_error: d.error });
            }
        } catch {
            // Network still bad — stop trying
            failed.push(order);
            break;
        }
    }

    saveQueue(failed);
    updateQueueBadge();

    if (indicator) {
        if (failed.length > 0) {
            indicator.querySelector('span').textContent = `${failed.length} order(s) failed to sync`;
            setTimeout(() => indicator.classList.add('hidden'), 5000);
        } else {
            indicator.classList.add('hidden');
        }
    }

    // Refresh POS data after sync
    if (failed.length === 0 && typeof initPOS === 'function') {
        initPOS();
    }
}

// Initialize badge on load
document.addEventListener('DOMContentLoaded', updateQueueBadge);
