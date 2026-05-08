// State
let menu = []; let inventory = []; let cart = []; 
let invCats = []; let menuCats = [];
let currentItem = null; let mainChart = null;
let activeBackOfficeTab = 'ingredients';

// Initial Load
document.addEventListener('DOMContentLoaded', () => { refreshAll(); });

async function refreshAll() {
    try {
        const fetchJSON = async (url) => {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const j = await r.json();
            if (j && j.error) throw new Error(j.error);
            return j;
        };

        const [m, inv, ic, mc] = await Promise.all([
            fetchJSON('api.php?action=get_menu'),
            fetchJSON('api.php?action=get_inventory'),
            fetchJSON('api.php?action=get_inventory_categories'),
            fetchJSON('api.php?action=get_menu_categories')
        ]);

        menu = Array.isArray(m) ? m : [];
        inventory = Array.isArray(inv) ? inv : [];
        invCats = Array.isArray(ic) ? ic : [];
        menuCats = Array.isArray(mc) ? mc : [];

        renderAll();
    } catch (e) {
        console.error("Trace Pro Init Error:", e);
        const grid = document.getElementById('product-grid');
        if (grid) grid.innerHTML = `<div class="col-span-full p-20 text-center glass rounded-[40px] border-red-500/20 bg-red-500/5"><i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4 block"></i><h3 class="text-xl font-black mb-2">System Error</h3><p class="text-slate-500 text-sm mb-6">${e.message}</p><a href="setup.php" class="bg-red-500 text-white px-8 py-3 rounded-xl font-bold inline-block">Go to Setup</a></div>`;
    }
}

function renderAll() {
    const isPOS = !document.getElementById('pos-page').classList.contains('hidden');
    const isBO = !document.getElementById('backoffice-page').classList.contains('hidden');
    const isAna = !document.getElementById('analytics-page').classList.contains('hidden');

    if (isPOS) { renderGrid(); renderCart(); }
    if (isBO) renderBackOffice();
    if (isAna) updateAnalytics('month');
}

// POS Grid
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

// Back Office
async function renderBackOffice() {
    try {
        const invTable = document.getElementById('bo-inv-table');
        const menuTable = document.getElementById('bo-menu-table');
        const analysisTable = document.getElementById('bo-analysis-table');
        const logTable = document.getElementById('bo-logs-table');
        const invCatList = document.getElementById('bo-inv-cats');
        const menuCatList = document.getElementById('bo-menu-cats');

        if (activeBackOfficeTab === 'ingredients' && invTable) {
            invTable.innerHTML = inventory.map(item => {
                const isLow = parseFloat(item.stock_level) <= parseFloat(item.min_stock);
                return `<tr class="hover:bg-white/5 transition-colors">
                    <td class="px-8 py-5"><div class="font-bold text-slate-100">${item.name}</div><div class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">${item.unit}</div></td>
                    <td class="px-8 py-5 text-xs text-slate-400 font-bold uppercase">${item.category_name || 'None'}</td>
                    <td class="px-8 py-5"><div class="flex items-center gap-3"><span class="font-black text-sm ${isLow ? 'text-red-400' : 'text-slate-100'}">${parseFloat(item.stock_level).toFixed(2)}</span>${isLow ? '<span class="bg-red-500/10 text-red-500 text-[8px] font-black uppercase px-2 py-1 rounded border border-red-500/20">Low Stock</span>' : ''}</div></td>
                    <td class="px-8 py-5 text-right space-x-2">
                        <button onclick="openRestockModal(${item.id})" class="text-emerald-400 p-2 hover:scale-110 transition-transform" title="Restock"><i class="fas fa-plus-circle"></i></button>
                        <button onclick="editIngredient(${item.id})" class="text-accent p-2"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteIngredient(${item.id})" class="text-red-500 p-2"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
            }).join('');
        } 
        
        else if (activeBackOfficeTab === 'menu' && menuTable) {
            menuTable.innerHTML = menu.map(item => `<tr class="hover:bg-white/5 transition-colors">
                <td class="px-8 py-5 font-bold text-slate-100">${item.name}</td>
                <td class="px-8 py-5 text-xs text-slate-400 font-bold uppercase">${item.category_name || 'General'}</td>
                <td class="px-8 py-5"><div class="space-y-2">${(item.variants || []).map(v => `<div class="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5"><span class="text-[10px] font-black uppercase text-slate-500">${v.name}</span><span class="text-slate-100 font-mono text-[10px]">$${parseFloat(v.price).toFixed(2)}</span></div>`).join('')}</div></td>
                <td class="px-8 py-5 text-right space-x-2">
                    <button onclick="editMenuItem(${item.id})" class="text-accent p-2" title="Edit Product"><i class="fas fa-edit"></i></button>
                    <button onclick="editRecipe(${item.id})" class="text-sky-400 p-2" title="Recipe Builder"><i class="fas fa-mortar-pestle"></i></button>
                    <button onclick="deleteMenuItem(${item.id})" class="text-red-500 p-2" title="Delete Product"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`).join('');
        }

        else if (activeBackOfficeTab === 'analysis' && analysisTable) {
            let rows = [];
            menu.forEach(item => {
                (item.variants || []).forEach(v => {
                    const cogs = parseFloat(v.cogs || 0);
                    const profit = parseFloat(v.price) - cogs;
                    const margin = v.price > 0 ? (profit / v.price) * 100 : 0;
                    const marginColor = margin > 50 ? 'text-emerald-400' : (margin > 20 ? 'text-yellow-400' : 'text-red-400');
                    rows.push(`<tr class="hover:bg-white/5 transition-colors">
                        <td class="px-8 py-5"><div class="font-bold text-slate-100">${item.name}</div><div class="text-[10px] font-black uppercase text-slate-500">${v.name}</div></td>
                        <td class="px-8 py-5 text-right font-mono font-bold">$${parseFloat(v.price).toFixed(2)}</td>
                        <td class="px-8 py-5 text-right font-mono text-slate-400">$${cogs.toFixed(2)}</td>
                        <td class="px-8 py-5 text-right font-mono text-emerald-400 font-bold">$${profit.toFixed(2)}</td>
                        <td class="px-8 py-5 text-right font-black ${marginColor}">${margin.toFixed(1)}%</td>
                    </tr>`);
                });
            });
            analysisTable.innerHTML = rows.length > 0 ? rows.join('') : '<tr><td colspan="5" class="p-20 text-center text-slate-600 italic">No variants found.</td></tr>';
        }

        else if (activeBackOfficeTab === 'logs' && logTable) {
            const res = await fetch('api.php?action=get_inventory_logs');
            const logs = await res.json();
            
            if (Array.isArray(logs) && logs.length > 0) {
                logTable.innerHTML = logs.map(log => `
                    <tr class="hover:bg-white/5 transition-colors">
                        <td class="px-8 py-4 text-[10px] text-slate-500 font-bold uppercase">${new Date(log.created_at).toLocaleString()}</td>
                        <td class="px-8 py-4 font-bold text-slate-100">${log.item_name}</td>
                        <td class="px-8 py-4 text-right font-black ${parseFloat(log.change_amount) > 0 ? 'text-emerald-400' : 'text-red-400'}">
                            ${parseFloat(log.change_amount) > 0 ? '+' : ''}${parseFloat(log.change_amount).toFixed(4)}
                        </td>
                        <td class="px-8 py-4 text-slate-500 text-xs">${log.reason}</td>
                    </tr>
                `).join('');
            } else {
                logTable.innerHTML = `<tr><td colspan="4" class="p-20 text-center text-slate-600 italic">No stock movements recorded yet.</td></tr>`;
            }
        }

        else if (activeBackOfficeTab === 'categories' && invCatList && menuCatList) {
            invCatList.innerHTML = invCats.map(c => `<div class="p-4 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center text-xs font-bold"><span>${c.name}</span><i class="fas fa-layer-group text-sky-400 opacity-30"></i></div>`).join('');
            menuCatList.innerHTML = menuCats.map(c => `<div class="p-4 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center text-xs font-bold"><span>${c.name}</span><i class="fas fa-tag text-emerald-400 opacity-30"></i></div>`).join('');
        }
    } catch (err) { console.error("BO Render error", err); }
}

// Navigation
function showPage(p) {
    document.getElementById('pos-page').classList.toggle('hidden', p !== 'pos');
    document.getElementById('backoffice-page').classList.toggle('hidden', p !== 'backoffice');
    document.getElementById('analytics-page').classList.toggle('hidden', p !== 'analytics');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const isTarget = (p === 'pos' && btn.title === 'Register') || 
                         (p === 'backoffice' && btn.title === 'Management') || 
                         (p === 'analytics' && btn.title === 'Analytics');
        btn.classList.toggle('text-accent', isTarget);
        btn.classList.toggle('text-slate-500', !isTarget);
    });
    
    renderAll();
}

function switchBackOffice(tab) {
    activeBackOfficeTab = tab;
    document.querySelectorAll('.backoffice-tab').forEach(t => t.classList.remove('active-tab'));
    const targetTab = document.getElementById(`tab-${tab}`);
    if (targetTab) targetTab.classList.add('active-tab');
    
    ['ingredients', 'menu', 'analysis', 'logs', 'categories'].forEach(t => {
        const el = document.getElementById(`bo-${t}`);
        if (el) el.classList.toggle('hidden', t !== tab);
    });
    renderBackOffice();
}

// Modal Logic
const addBtn = document.getElementById('add-btn');
if (addBtn) {
    addBtn.onclick = () => {
        if (activeBackOfficeTab === 'ingredients') {
            document.getElementById('ing-id').value = '';
            document.getElementById('ing-purchase-price').value = '';
            document.getElementById('ing-purchase-qty').value = '';
            document.getElementById('ing-cost').value = '0.0000';
            document.getElementById('ingredientForm').reset();
            const catSelect = document.getElementById('ing-category');
            if (catSelect) catSelect.innerHTML = invCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            openModal('ingredientModal');
        } else if (activeBackOfficeTab === 'menu') {
            document.getElementById('prod-id').value = '';
            document.getElementById('productForm').reset();
            document.getElementById('variant-rows').innerHTML = '';
            const catSelect = document.getElementById('prod-category');
            if (catSelect) catSelect.innerHTML = menuCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            addVariantRow();
            openModal('productModal');
        } else { alert('Please switch to Ingredients or Menu Setup tab first.'); }
    };
}

function calcIngCost() {
    const price = parseFloat(document.getElementById('ing-purchase-price').value || 0);
    const qty = parseFloat(document.getElementById('ing-purchase-qty').value || 0);
    const cost = qty > 0 ? (price / qty) : 0;
    document.getElementById('ing-cost').value = cost.toFixed(4);
}

// Menu CRUD Logic
async function editMenuItem(id) {
    const item = menu.find(i => i.id === id);
    if (!item) return;
    document.getElementById('prod-id').value = item.id;
    document.getElementById('prod-name').value = item.name;
    const catSelect = document.getElementById('prod-category');
    if (catSelect) catSelect.innerHTML = menuCats.map(c => `<option value="${c.id}" ${c.id == item.category_id ? 'selected' : ''}>${c.name}</option>`).join('');
    
    const varContainer = document.getElementById('variant-rows');
    varContainer.innerHTML = '';
    (item.variants || []).forEach(v => addVariantRow(v));
    openModal('productModal');
}

async function deleteMenuItem(id) {
    if (!confirm('Are you sure? This will delete all variants and recipes for this product!')) return;
    await fetch('api.php?action=delete_menu_item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    refreshAll();
}

function addVariantRow(data = null) {
    const container = document.getElementById('variant-rows');
    const div = document.createElement('div');
    div.className = 'variant-row flex gap-3 items-center animate-in fade-in slide-in-from-top-2';
    div.innerHTML = `<input type="text" placeholder="Size/Name" value="${data ? data.name : 'Standard'}" class="var-name flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-accent"><input type="number" step="0.01" placeholder="Price" value="${data ? data.price : ''}" class="var-price w-24 bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-accent"><button type="button" onclick="this.parentElement.remove()" class="text-red-500 p-2"><i class="fas fa-times"></i></button>`;
    container.appendChild(div);
}

const productForm = document.getElementById('productForm');
if (productForm) {
    productForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('prod-id').value;
        const variants = [];
        document.querySelectorAll('.variant-row').forEach(row => {
            const name = row.querySelector('.var-name').value;
            const price = row.querySelector('.var-price').value;
            if (name && price) variants.push({ name, price });
        });
        const data = { id, name: document.getElementById('prod-name').value, category_id: document.getElementById('prod-category').value, variants };
        await fetch(`api.php?action=${id ? 'update_menu_item' : 'add_menu_item'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        closeModal('productModal'); refreshAll();
    };
}

function openModal(id) { const el = document.getElementById(id); if (el) { el.classList.remove('hidden'); el.classList.add('flex'); } }
function closeModal(id) { const el = document.getElementById(id); if (el) { el.classList.add('hidden'); el.classList.remove('flex'); } }

// POS Logic
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
function addToCartById(vId) { const v = currentItem.variants.find(v => v.id === vId); if (v) addToCart(v); closeModal('variantModal'); }
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
    if (cart.length === 0) { c.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-slate-600 opacity-50"><i class="fas fa-shopping-basket text-4xl mb-4"></i><p class="text-xs font-bold uppercase tracking-widest">Empty Ticket</p></div>`; totEl.textContent = '$0.00'; return; }
    c.innerHTML = cart.map(i => `<div class="flex justify-between items-center animate-in fade-in slide-in-from-right-4"><div><h4 class="font-bold text-sm text-slate-100">${i.name}</h4><p class="text-[10px] text-slate-500 font-bold uppercase">${i.quantity} x $${i.price.toFixed(2)}</p></div><span class="font-black text-sm text-slate-100">$${(i.price * i.quantity).toFixed(2)}</span></div>`).join('');
    const tot = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    totEl.textContent = `$${tot.toFixed(2)}`;
}

async function openPayment() {
    if (cart.length === 0) return;
    try {
        const res = await fetch('api.php?action=process_order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cart, total: cart.reduce((acc, i) => acc + (i.price * i.quantity), 0) }) });
        const d = await res.json();
        if (d.success) {
            document.getElementById('rec-date').textContent = new Date().toLocaleString();
            document.getElementById('rec-items').innerHTML = cart.map(i => `<div class="flex justify-between"><span>${i.name} x${i.quantity}</span><span>$${(i.price * i.quantity).toFixed(2)}</span></div>`).join('');
            document.getElementById('rec-total').textContent = document.getElementById('cart-total').textContent;
            openModal('receiptModal'); clearCart(); refreshAll();
        } else { alert(d.error || 'Order failed'); }
    } catch (e) { alert('Connection error during checkout'); }
}
function clearCart() { cart = []; renderCart(); }

// Analytics
async function updateAnalytics(range) {
    try {
        const d = await fetch(`api.php?action=get_analytics&range=${range}`).then(r => r.json());
        const revEl = document.getElementById('ana-rev');
        if (revEl) revEl.textContent = `$${(d.revenue || 0).toLocaleString()}`;
        const canvas = document.getElementById('mainChart');
        if (!canvas) return;
        if (mainChart) mainChart.destroy();
        mainChart = new Chart(canvas.getContext('2d'), { type: 'line', data: { labels: (d.trend || []).map(x => x.day), datasets: [{ label: 'Revenue', data: (d.trend || []).map(x => x.rev), borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', fill: true, tension: 0.4 }] }, options: { responsive: true, plugins: { legend: { display: false } } } });
    } catch (e) { console.error("Analytics error", e); }
}

// Recipe Builder
let activeVariantId = null;
async function editRecipe(itemId) {
    const item = menu.find(i => i.id === itemId);
    if (!item) return;
    if (item.variants && item.variants.length > 1) {
        const list = document.getElementById('variant-list');
        document.getElementById('var-item-name').textContent = `Recipe: ${item.name}`;
        list.innerHTML = item.variants.map(v => `<button onclick="openRecipeEditor(${v.id}, '${item.name} - ${v.name}')" class="w-full p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-sky-500 hover:text-slate-950 transition-all flex justify-between"><span>${v.name}</span><i class="fas fa-arrow-right"></i></button>`).join('');
        openModal('variantModal');
    } else if (item.variants && item.variants[0]) { openRecipeEditor(item.variants[0].id, item.name); }
}
async function openRecipeEditor(vId, name) {
    closeModal('variantModal'); activeVariantId = vId;
    document.getElementById('recipe-variant-name').textContent = name;
    document.getElementById('recipe-rows').innerHTML = '';
    const recipe = await fetch(`api.php?action=get_recipe&variant_id=${vId}`).then(r => r.json());
    if (Array.isArray(recipe) && recipe.length > 0) recipe.forEach(ing => addRecipeRow(ing));
    else addRecipeRow();
    openModal('recipeModal');
}
function addRecipeRow(data = null) {
    const container = document.getElementById('recipe-rows');
    const div = document.createElement('div');
    div.className = 'recipe-row flex gap-3 items-center';
    div.innerHTML = `<select class="ing-id flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none">${inventory.map(i => `<option value="${i.id}" ${data && i.id == data.inventory_item_id ? 'selected' : ''}>${i.name} (${i.unit})</option>`).join('')}</select><input type="number" step="0.0001" placeholder="Qty" value="${data ? data.quantity : ''}" class="ing-qty w-24 bg-white/5 border border-white/10 rounded-xl p-3 text-xs"><button onclick="this.parentElement.remove()" class="text-red-500 p-2"><i class="fas fa-trash"></i></button>`;
    container.appendChild(div);
}
async function saveRecipe() {
    const rows = document.querySelectorAll('.recipe-row');
    const ingredients = [];
    rows.forEach(row => {
        const id = row.querySelector('.ing-id').value;
        const qty = row.querySelector('.ing-qty').value;
        if (id && qty) ingredients.push({ inventory_item_id: id, quantity: qty });
    });
    await fetch('api.php?action=save_recipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variant_id: activeVariantId, ingredients }) });
    closeModal('recipeModal'); refreshAll();
}

function toggleTheme() { document.body.classList.toggle('light-mode'); }

// Restock Logic
function openRestockModal(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    document.getElementById('restock-id').value = id;
    document.getElementById('restock-item-name').textContent = item.name;
    document.getElementById('restock-packs').value = 1;
    document.getElementById('restock-qty-per').value = 1;
    document.getElementById('restock-unit-preview').textContent = item.unit;
    calcRestock();
    openModal('restockModal');
}
function calcRestock() {
    const packs = parseFloat(document.getElementById('restock-packs').value || 0);
    const qtyPer = parseFloat(document.getElementById('restock-qty-per').value || 0);
    const total = packs * qtyPer;
    document.getElementById('restock-total-preview').textContent = total.toFixed(2);
}
const restockForm = document.getElementById('restockForm');
if (restockForm) {
    restockForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('restock-id').value;
        const packs = document.getElementById('restock-packs').value;
        const qtyPer = document.getElementById('restock-qty-per').value;
        const total = parseFloat(packs) * parseFloat(qtyPer);
        await fetch('api.php?action=restock_item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, amount: total, reason: `Restock: ${packs} packs x ${qtyPer}` }) });
        closeModal('restockModal'); refreshAll();
    };
}

// Ingredient Form
async function editIngredient(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    document.getElementById('ing-id').value = item.id;
    document.getElementById('ing-name').value = item.name;
    document.getElementById('ing-cost').value = item.cost_per_unit;
    document.getElementById('ing-unit').value = item.unit;
    const catSelect = document.getElementById('ing-category');
    if (catSelect) {
        catSelect.innerHTML = invCats.map(c => `<option value="${c.id}" ${c.id == item.category_id ? 'selected' : ''}>${c.name}</option>`).join('');
    }
    openModal('ingredientModal');
}

async function deleteIngredient(id) {
    if (!confirm('Are you sure you want to delete this ingredient? This may affect recipes!')) return;
    try {
        await fetch('api.php?action=delete_inventory_item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        refreshAll();
    } catch (e) { alert('Delete failed'); }
}

const ingForm = document.getElementById('ingredientForm');
if (ingForm) {
    ingForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('ing-id').value;
        const data = { id, name: document.getElementById('ing-name').value, category_id: document.getElementById('ing-category').value, cost_per_unit: document.getElementById('ing-cost').value, unit: document.getElementById('ing-unit').value, stock_level: 0, min_stock: 5 };
        await fetch(`api.php?action=${id ? 'update_inventory_item' : 'add_inventory_item'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        closeModal('ingredientModal'); refreshAll();
    };
}
