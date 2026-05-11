// Trace Pulse (POS) Specific Logic
let cart = [];
let currentItem = null;

async function initPOS() {
    try {
        await refreshCoreData();
        renderGrid();
        renderCart();
    } catch (e) {
        showErrorMessage(e.message);
    }
}

function renderGrid() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = menu.map(item => `
        <button onclick="handleItemClick(${item.id})" class="glass p-6 rounded-3xl flex flex-col items-center justify-center text-center hover:scale-[1.02] active:scale-95 transition-all group h-48">
            <div class="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-all"><i class="fas fa-mug-hot text-slate-500 group-hover:text-accent"></i></div>
            <h3 class="font-black text-sm text-slate-100 mb-1">${item.name}</h3>
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">${item.category_name || 'General'}</p>
        </button>
    `).join('');
}

function handleItemClick(itemId) {
    currentItem = menu.find(i => i.id === itemId);
    if (!currentItem) return;
    if (currentItem.variants && currentItem.variants.length > 1) {
        const list = document.getElementById('variant-list');
        document.getElementById('var-item-name').textContent = currentItem.name;
        list.innerHTML = currentItem.variants.map(v => `<button onclick="addToCartById(${v.id})" class="w-full p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-accent hover:text-slate-950 transition-all flex justify-between items-center font-bold"><span>${v.name}</span><span>$${parseFloat(v.price).toFixed(2)}</span></button>`).join('');
        openModal('variantModal');
    } else if (currentItem.variants && currentItem.variants[0]) { addToCart(currentItem.variants[0]); }
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
    else cart.push({ variant_id: v.id, name: `${currentItem.name} (${v.name})`, price: parseFloat(v.price), quantity: 1 });
    renderCart();
}

function renderCart() {
    const c = document.getElementById('cart-items');
    const totEl = document.getElementById('cart-total');
    if (!c || !totEl) return;
    if (cart.length === 0) { 
        c.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-slate-600 opacity-50"><i class="fas fa-shopping-basket text-4xl mb-4"></i><p class="text-xs font-bold uppercase tracking-widest">Empty Ticket</p></div>`; 
        totEl.textContent = '$0.00'; 
        return; 
    }
    
    c.innerHTML = cart.map(i => `<div class="flex justify-between items-center animate-in fade-in slide-in-from-right-4"><div><h4 class="font-bold text-sm text-slate-100">${i.name}</h4><p class="text-[10px] text-slate-500 font-bold uppercase">${i.quantity} x $${i.price.toFixed(2)}</p></div><span class="font-black text-sm text-slate-100">$${(i.price * i.quantity).toFixed(2)}</span></div>`).join('');
    
    const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const activeTaxes = taxes.filter(t => t.is_active == 1).reduce((sum, t) => sum + parseFloat(t.rate), 0);
    const taxAmt = subtotal * (activeTaxes / 100);
    const tot = subtotal + taxAmt;
    
    if (taxAmt > 0) {
        totEl.innerHTML = `<div class="flex flex-col text-right"><span class="text-[10px] text-slate-500 font-normal">Tax: $${taxAmt.toFixed(2)}</span><span>$${tot.toFixed(2)}</span></div>`;
    } else {
        totEl.textContent = `$${tot.toFixed(2)}`;
    }
    
    window._currentTotal = tot;
    window._currentTax = taxAmt;
}

async function openPayment() {
    if (cart.length === 0) return;
    try {
        const res = await fetch('../api/?action=process_order', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ cart, total: window._currentTotal || 0, tax: window._currentTax || 0 }) 
        });
        const d = await res.json();
        if (d.success) {
            document.getElementById('rec-date').textContent = new Date().toLocaleString();
            let recHTML = cart.map(i => `<div class="flex justify-between"><span>${i.name} x${i.quantity}</span><span>$${(i.price * i.quantity).toFixed(2)}</span></div>`).join('');
            if (window._currentTax > 0) recHTML += `<div class="flex justify-between mt-2 pt-2 border-t border-dashed border-slate-300 text-[9px] text-slate-500"><span>TAX</span><span>$${window._currentTax.toFixed(2)}</span></div>`;
            document.getElementById('rec-items').innerHTML = recHTML;
            document.getElementById('rec-total').textContent = `$${(window._currentTotal || 0).toFixed(2)}`;
            openModal('receiptModal'); 
            clearCart(); 
            initPOS(); // Refresh data to update stock levels
        } else { alert(d.error || 'Order failed'); }
    } catch (e) { alert('Connection error during checkout'); }
}

function clearCart() { 
    cart = []; 
    renderCart(); 
}

function showErrorMessage(msg) {
    const grid = document.getElementById('product-grid');
    if (grid) grid.innerHTML = `<div class="col-span-full p-20 text-center glass rounded-[40px] border-red-500/20 bg-red-500/5"><i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4 block"></i><h3 class="text-xl font-black mb-2">System Error</h3><p class="text-slate-500 text-sm mb-6">${msg}</p><a href="../setup.php" class="bg-red-500 text-white px-8 py-3 rounded-xl font-bold inline-block">Go to Setup</a></div>`;
}

document.addEventListener('DOMContentLoaded', initPOS);
