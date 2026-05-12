// Trace Pulse (POS) — Phase Two Logic
let cart = [];
let currentItem = null;
let currentCategory = null;
let searchQuery = '';
let orderType = 'dine_in'; // 'dine_in' | 'takeaway'

// Payment state
let selectedPaymentMethod = 'cash';
let tenderString = '';

// ============================================================
// INIT
// ============================================================
async function initPOS() {
    try {
        await refreshCoreData();
        renderCategories();
        renderGrid();
        renderCart();
        renderOrderType();
    } catch (e) {
        showErrorMessage(e.message);
    }
}

// ============================================================
// ORDER TYPE
// ============================================================
function setOrderType(type) {
    orderType = type;
    renderOrderType();
}

function renderOrderType() {
    ['dine_in', 'takeaway'].forEach(type => {
        const btn = document.getElementById(`ot-${type}`);
        if (!btn) return;
        if (type === orderType) {
            btn.classList.add('ot-active');
            btn.classList.remove('ot-inactive');
        } else {
            btn.classList.remove('ot-active');
            btn.classList.add('ot-inactive');
        }
    });
}

// ============================================================
// TAP-REVEAL SEARCH
// ============================================================
function toggleSearch() {
    const wrap = document.getElementById('search-wrap');
    const input = document.getElementById('search-input');
    if (!wrap) return;
    const isOpen = wrap.classList.contains('search-open');
    if (isOpen) {
        wrap.classList.remove('search-open');
        searchQuery = '';
        if (input) input.value = '';
        renderGrid();
    } else {
        wrap.classList.add('search-open');
        setTimeout(() => input && input.focus(), 150);
    }
}

function filterBySearch(q) {
    searchQuery = q.toLowerCase();
    currentCategory = null;
    renderCategories();
    renderGrid();
}

// ============================================================
// CATEGORY FILTER
// ============================================================
function renderCategories() {
    const bar = document.getElementById('category-bar');
    if (!bar) return;
    const cats = [{ id: null, name: 'All' }, ...menuCats];
    bar.innerHTML = cats.map(c => `
        <button onclick="setCategory(${c.id})" class="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${currentCategory === c.id ? 'bg-accent text-slate-950' : 'bg-white/5 text-slate-400 hover:bg-white/10'}">
            ${c.name}
        </button>
    `).join('');
}

function setCategory(id) {
    currentCategory = id;
    searchQuery = '';
    const si = document.getElementById('search-input');
    if (si) si.value = '';
    // Collapse search if open
    const wrap = document.getElementById('search-wrap');
    if (wrap) wrap.classList.remove('search-open');
    renderCategories();
    renderGrid();
}

// ============================================================
// PRODUCT GRID
// ============================================================
function renderGrid() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    let filtered = menu;
    if (searchQuery) {
        filtered = menu.filter(item => item.name.toLowerCase().includes(searchQuery));
    } else if (currentCategory) {
        filtered = menu.filter(item => item.category_id == currentCategory);
    }

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center py-20 text-slate-600 opacity-50"><i class="fas fa-search text-4xl mb-4"></i><p class="text-xs font-bold uppercase tracking-widest">No items found</p></div>`;
        return;
    }

    grid.innerHTML = filtered.map(item => {
        let isLow = false;
        if (item.variants) {
            item.variants.forEach(v => {
                if (v.recipes) {
                    v.recipes.forEach(r => {
                        const invItem = inventory.find(i => i.id == r.inventory_item_id);
                        if (invItem && parseFloat(invItem.stock_level) <= parseFloat(invItem.min_stock)) {
                            isLow = true;
                        }
                    });
                }
            });
        }

        const priceRange = (() => {
            if (!item.variants || item.variants.length === 0) return '';
            const prices = item.variants.map(v => parseFloat(v.price));
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            return min === max
                ? `BND $${min.toFixed(2)}`
                : `BND $${min.toFixed(2)} – $${max.toFixed(2)}`;
        })();

        return `
            <button onclick="handleItemClick(${item.id})" class="glass p-6 rounded-[32px] flex flex-col items-center justify-center text-center hover:scale-[1.02] active:scale-95 transition-all group h-52 relative ${isLow ? 'low-stock-warning' : ''}">
                ${isLow ? '<div class="absolute top-4 right-4 text-amber-500 animate-pulse text-sm"><i class="fas fa-exclamation-circle"></i></div>' : ''}
                <div class="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-all">
                    <i class="fas fa-mug-hot text-lg text-slate-500 group-hover:text-accent"></i>
                </div>
                <h3 class="font-black text-sm leading-tight mb-1">${item.name}</h3>
                <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">${item.category_name || 'General'}</p>
                <p class="text-[10px] font-bold text-accent/80">${priceRange}</p>
            </button>
        `;
    }).join('');
}

// ============================================================
// ITEM & VARIANT SELECTION
// ============================================================
function handleItemClick(itemId) {
    currentItem = menu.find(i => i.id === itemId);
    if (!currentItem) return;
    if (currentItem.variants && currentItem.variants.length > 1) {
        const list = document.getElementById('variant-list');
        document.getElementById('var-item-name').textContent = currentItem.name;
        list.innerHTML = currentItem.variants.map(v => `
            <button onclick="addToCartById(${v.id})" class="w-full p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-accent hover:text-slate-950 transition-all flex justify-between items-center font-bold">
                <span>${v.name}</span>
                <span class="font-mono">BND $${parseFloat(v.price).toFixed(2)}</span>
            </button>
        `).join('');
        openModal('variantModal');
    } else if (currentItem.variants && currentItem.variants[0]) {
        addToCart(currentItem.variants[0]);
    }
}

function addToCartById(vId) {
    const v = currentItem.variants.find(v => v.id === vId);
    if (v) addToCart(v);
    closeModal('variantModal');
}

function addToCart(v) {
    if (!v) return;
    const ex = cart.find(i => i.variant_id === v.id);
    if (ex) ex.quantity++;
    else cart.push({
        variant_id: v.id,
        name: `${currentItem.name} (${v.name})`,
        price: parseFloat(v.price),
        quantity: 1
    });
    renderCart();
}

// ============================================================
// CART WITH QUANTITY CONTROLS
// ============================================================
function adjustQuantity(variantId, delta) {
    const idx = cart.findIndex(i => i.variant_id === variantId);
    if (idx === -1) return;
    cart[idx].quantity += delta;
    if (cart[idx].quantity <= 0) cart.splice(idx, 1);
    renderCart();
}

function renderCart() {
    const c = document.getElementById('cart-items');
    const totEl = document.getElementById('cart-total');
    if (!c || !totEl) return;

    if (cart.length === 0) {
        c.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-slate-600 opacity-50"><i class="fas fa-shopping-basket text-4xl mb-4"></i><p class="text-xs font-bold uppercase tracking-widest">Empty Ticket</p></div>`;
        totEl.textContent = 'BND $0.00';
        return;
    }

    c.innerHTML = cart.map(i => `
        <div class="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-xs truncate">${i.name}</h4>
                <p class="text-[10px] text-slate-500 font-bold">BND $${i.price.toFixed(2)} each</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                <button onclick="adjustQuantity(${i.variant_id}, -1)" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-slate-400 font-black text-lg flex items-center justify-center transition-all">−</button>
                <span class="w-6 text-center font-black text-sm">${i.quantity}</span>
                <button onclick="adjustQuantity(${i.variant_id}, 1)" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-accent/20 hover:text-accent text-slate-400 font-black text-lg flex items-center justify-center transition-all">+</button>
            </div>
            <span class="font-black text-xs w-16 text-right flex-shrink-0">BND $${(i.price * i.quantity).toFixed(2)}</span>
        </div>
    `).join('');

    const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const activeTaxes = taxes.filter(t => t.is_active == 1).reduce((sum, t) => sum + parseFloat(t.rate), 0);
    const taxAmt = subtotal * (activeTaxes / 100);
    const tot = subtotal + taxAmt;

    if (taxAmt > 0) {
        totEl.innerHTML = `<div class="flex flex-col text-right"><span class="text-[10px] text-slate-500 font-normal">Tax: BND $${taxAmt.toFixed(2)}</span><span>BND $${tot.toFixed(2)}</span></div>`;
    } else {
        totEl.textContent = `BND $${tot.toFixed(2)}`;
    }

    window._currentTotal = tot;
    window._currentTax   = taxAmt;
}

// ============================================================
// PAYMENT FLOW — 3 STAGES
// ============================================================
function openPayment() {
    if (cart.length === 0) return;
    tenderString = '';
    selectedPaymentMethod = 'cash';
    document.getElementById('pay-total-display').textContent = `BND $${(window._currentTotal || 0).toFixed(2)}`;
    showPaymentStep(1);
    openModal('paymentModal');
}

function showPaymentStep(n) {
    [1, 2, 3].forEach(i => {
        const el = document.getElementById(`pay-stage-${i}`);
        if (el) el.classList.toggle('hidden', i !== n);
    });
    if (n === 3) buildConfirmSummary();
}

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    if (method === 'cash') {
        tenderString = '';
        updateNumpadDisplay();
        showPaymentStep(2);
    } else {
        showPaymentStep(3);
    }
}

function numpadPress(char) {
    if (char === 'back') {
        tenderString = tenderString.slice(0, -1);
    } else if (char === '.') {
        if (!tenderString.includes('.')) tenderString += char;
    } else {
        const parts = tenderString.split('.');
        if (parts[1] && parts[1].length >= 2) return;
        tenderString += char;
    }
    updateNumpadDisplay();
}

function updateNumpadDisplay() {
    const tenderVal = parseFloat(tenderString) || 0;
    const total = window._currentTotal || 0;
    const change = tenderVal - total;

    document.getElementById('tender-display').textContent = tenderString
        ? `BND $${tenderString}`
        : 'BND $0.00';

    const changeEl = document.getElementById('change-display');
    const confirmBtn = document.getElementById('proceed-to-confirm');

    changeEl.textContent = `BND $${Math.max(0, change).toFixed(2)}`;
    changeEl.className = change >= 0
        ? 'text-emerald-400 text-xl font-black'
        : 'text-red-400 text-xl font-black';

    if (confirmBtn) {
        confirmBtn.disabled = tenderVal < total;
        confirmBtn.classList.toggle('opacity-40', tenderVal < total);
    }
}

function buildConfirmSummary() {
    const summary = document.getElementById('confirm-summary');
    const payLine = document.getElementById('confirm-payment-line');
    const total    = window._currentTotal || 0;
    const tax      = window._currentTax   || 0;
    const subtotal = total - tax;
    const tender   = parseFloat(tenderString) || total;
    const change   = Math.max(0, tender - total);
    const typeLabel = orderType === 'dine_in' ? '🍽 Dine In' : '🥡 Takeaway';

    summary.innerHTML = `
        <div class="flex justify-between"><span class="text-slate-500">Type</span><span class="font-bold">${typeLabel}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Subtotal</span><span class="font-bold">BND $${subtotal.toFixed(2)}</span></div>
        ${tax > 0 ? `<div class="flex justify-between"><span class="text-slate-500">Tax</span><span class="font-bold text-emerald-400">BND $${tax.toFixed(2)}</span></div>` : ''}
        <div class="flex justify-between text-lg font-black border-t border-white/5 pt-2 mt-2"><span>Total</span><span class="text-accent">BND $${total.toFixed(2)}</span></div>
    `;

    let payInfo = `<span class="uppercase">${selectedPaymentMethod}</span>`;
    if (selectedPaymentMethod === 'cash') {
        payInfo += ` — Tendered: BND $${tender.toFixed(2)} | Change: BND $${change.toFixed(2)}`;
    }
    payLine.innerHTML = payInfo;
}

async function confirmAndSubmit() {
    const total  = window._currentTotal || 0;
    const tax    = window._currentTax   || 0;
    const tender = parseFloat(tenderString) || total;
    const change = Math.max(0, tender - total);

    if (!isOnline) {
        queueOrder(cart, total, tax, selectedPaymentMethod, orderType);
        closeModal('paymentModal');
        showQueuedReceipt(tender, change);
        clearCart();
        return;
    }

    try {
        const res = await fetch('../api/?action=process_order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cart,
                total,
                tax,
                payment_type: selectedPaymentMethod,
                order_type: orderType
            })
        });
        const d = await res.json();
        if (d.success) {
            closeModal('paymentModal');
            showReceipt(d.order_id, tender, change);
            clearCart();
            initPOS();
        } else {
            alert(d.error || 'Order failed');
        }
    } catch (e) {
        queueOrder(cart, total, tax, selectedPaymentMethod, orderType);
        closeModal('paymentModal');
        showQueuedReceipt(tender, change);
        clearCart();
    }
}

// ============================================================
// RECEIPT
// ============================================================
function showReceipt(orderId, tender, change) {
    populateReceipt(orderId, tender, change);
    openModal('receiptModal');
    setTimeout(printReceipt, 300); // slight delay so modal renders first
}

function showQueuedReceipt(tender, change) {
    populateReceipt('OFFLINE', tender, change);
    openModal('receiptModal');
    setTimeout(printReceipt, 300); // auto-print for offline orders too
}

function populateReceipt(orderId, tender, change) {
    document.getElementById('rec-date').textContent = new Date().toLocaleString();
    document.getElementById('rec-order-id').textContent = `Order #${orderId}`;

    const typeEl = document.getElementById('rec-order-type');
    if (typeEl) typeEl.textContent = orderType === 'dine_in' ? 'Dine In' : 'Takeaway';

    const total = window._currentTotal || 0;
    const tax   = window._currentTax   || 0;

    document.getElementById('rec-items').innerHTML = cart.map(i =>
        `<div class="receipt-row flex justify-between"><span>${i.name} ×${i.quantity}</span><span>BND $${(i.price * i.quantity).toFixed(2)}</span></div>`
    ).join('');

    const taxLine = document.getElementById('rec-tax-line');
    if (tax > 0) {
        taxLine.classList.remove('hidden');
        document.getElementById('rec-tax').textContent = `BND $${tax.toFixed(2)}`;
    } else {
        taxLine.classList.add('hidden');
    }

    document.getElementById('rec-total').textContent = `BND $${total.toFixed(2)}`;
    document.getElementById('rec-payment-method').textContent = `Payment: ${selectedPaymentMethod.toUpperCase()}`;

    const changeLine = document.getElementById('rec-change-line');
    if (selectedPaymentMethod === 'cash') {
        changeLine.classList.remove('hidden');
        changeLine.textContent = `Change: BND $${change.toFixed(2)}`;
    } else {
        changeLine.classList.add('hidden');
    }
}

function printReceipt() {
    window.print();
}

// ============================================================
// UTILITIES
// ============================================================
function clearCart() {
    cart = [];
    orderType = 'dine_in';
    renderCart();
    renderOrderType();
}

function showErrorMessage(msg) {
    const grid = document.getElementById('product-grid');
    if (grid) grid.innerHTML = `
        <div class="col-span-full p-20 text-center glass rounded-[40px] border-red-500/20 bg-red-500/5">
            <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4 block"></i>
            <h3 class="text-xl font-black mb-2">System Error</h3>
            <p class="text-slate-500 text-sm mb-6">${msg}</p>
            <a href="../api/scripts/setup.php" class="bg-red-500 text-white px-8 py-3 rounded-xl font-bold inline-block">Go to Setup</a>
        </div>`;
}

document.addEventListener('DOMContentLoaded', initPOS);
