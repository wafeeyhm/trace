// Trace Lens (Back Office) Specific Logic
let activeBackOfficeTab = 'ingredients';
let activePerformanceTab = 'sales';
let analyticsData = {};
let mainChart = null;
let activeVariantId = null;

async function initLens() {
    try {
        await refreshCoreData();
        renderBackOffice();
        renderPerformance();
    } catch (e) {
        console.error("Lens Init Error:", e);
    }
}

// Navigation
function switchTab(p) {
    document.getElementById('backoffice-page').classList.toggle('hidden', p !== 'backoffice');
    document.getElementById('analytics-page').classList.toggle('hidden', p !== 'analytics');
    document.getElementById('settings-page').classList.toggle('hidden', p !== 'settings');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const isTarget = (p === 'backoffice' && btn.title === 'Management') || 
                         (p === 'analytics' && btn.title === 'Analytics') ||
                         (p === 'settings' && btn.title === 'Settings');
        btn.classList.toggle('text-accent', isTarget);
        btn.classList.toggle('text-slate-500', !isTarget);
    });
    
    if (p === 'backoffice') renderBackOffice();
    if (p === 'analytics') renderPerformance();
}

function switchBackOffice(tab) {
    activeBackOfficeTab = tab;
    document.querySelectorAll('.backoffice-tab').forEach(t => t.classList.remove('active-tab'));
    const targetTab = document.getElementById(`tab-${tab}`);
    if (targetTab) targetTab.classList.add('active-tab');
    
    ['ingredients', 'menu', 'analysis', 'logs', 'categories', 'vendors'].forEach(t => {
        const el = document.getElementById(`bo-${t}`);
        if (el) el.classList.toggle('hidden', t !== tab);
    });
    renderBackOffice();
}

function switchPerformance(tab) {
    activePerformanceTab = tab;
    document.querySelectorAll('.perf-tab').forEach(t => t.classList.remove('active-tab'));
    const targetTab = document.getElementById(`tab-perf-${tab}`);
    if (targetTab) targetTab.classList.add('active-tab');
    
    ['sales', 'taxes', 'expenses', 'forecast'].forEach(t => {
        const el = document.getElementById(`perf-${t}`);
        if (el) el.classList.toggle('hidden', t !== tab);
    });
    
    const addBtn = document.getElementById('add-perf-btn');
    if (addBtn) addBtn.classList.toggle('hidden', tab === 'sales' || tab === 'forecast');
    
    renderPerformance();
}

// Rendering
async function renderBackOffice() {
    const invTable = document.getElementById('bo-inv-table');
    const menuTable = document.getElementById('bo-menu-table');
    const analysisTable = document.getElementById('bo-analysis-table');
    const logTable = document.getElementById('bo-logs-table');
    const invCatList = document.getElementById('bo-inv-cats');
    const menuCatList = document.getElementById('bo-menu-cats');
    const vendorsTable = document.getElementById('bo-vendors-table');

    if (activeBackOfficeTab === 'ingredients' && invTable) {
        invTable.innerHTML = inventory.map(item => {
            const isLow = parseFloat(item.stock_level) <= parseFloat(item.min_stock);
            const purchaseEquiv = (parseFloat(item.stock_level) / parseFloat(item.conversion_factor)).toFixed(2);
            return `<tr class="hover:bg-white/5 transition-colors">
                <td class="px-8 py-5">
                    <div class="font-bold text-slate-100">${item.name}</div>
                    <div class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">${item.usage_unit} (Used) | ${item.purchase_unit} (Bought)</div>
                </td>
                <td class="px-8 py-5 text-xs text-slate-400 font-bold uppercase">${item.category_name || 'None'}</td>
                <td class="px-8 py-5">
                    <div class="flex items-center gap-3">
                        <div class="flex flex-col">
                            <span class="font-black text-sm ${isLow ? 'text-red-400' : 'text-slate-100'}">${parseFloat(item.stock_level).toFixed(1)} ${item.usage_unit}</span>
                            <span class="text-[9px] text-slate-500 font-bold">≈ ${purchaseEquiv} ${item.purchase_unit}</span>
                        </div>
                        ${isLow ? '<span class="bg-red-500/10 text-red-500 text-[8px] font-black uppercase px-2 py-1 rounded border border-red-500/20">Low Stock</span>' : ''}
                    </div>
                </td>
                <td class="px-8 py-5 text-right space-x-2">
                    <button onclick="openRestockModal(${item.id})" class="text-emerald-400 p-2 hover:scale-110 transition-transform" title="Restock"><i class="fas fa-plus-circle"></i></button>
                    <button onclick="editIngredient(${item.id})" class="text-accent p-2 hover:scale-110 transition-transform" title="Edit"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteIngredient(${item.id})" class="text-red-500 p-2 hover:scale-110 transition-transform" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    } else if (activeBackOfficeTab === 'menu' && menuTable) {
        menuTable.innerHTML = menu.map(item => `<tr class="hover:bg-white/5 transition-colors">
            <td class="px-8 py-5 font-bold text-slate-100">${item.name}</td>
            <td class="px-8 py-5 text-xs text-slate-400 font-bold uppercase whitespace-nowrap">${item.category_name || 'General'}</td>
            <td class="px-8 py-5 text-xs text-slate-400 font-bold uppercase whitespace-nowrap">${item.vendor_name || 'In-House'}</td>
            <td class="px-8 py-5 w-1/3"><div class="space-y-2">${(item.variants || []).map(v => `<div class="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5"><span class="text-[10px] font-black uppercase text-slate-500">${v.name}</span><span class="text-slate-100 font-mono text-[10px]">BND $${parseFloat(v.price).toFixed(2)}</span></div>`).join('')}</div></td>
            <td class="px-8 py-5 text-right whitespace-nowrap space-x-2">
                <button onclick="editMenuItem(${item.id})" class="text-accent p-2 hover:scale-110 transition-transform" title="Edit Product"><i class="fas fa-edit"></i></button>
                <button onclick="editRecipe(${item.id})" class="text-sky-400 p-2 hover:scale-110 transition-transform" title="Recipe Builder"><i class="fas fa-mortar-pestle"></i></button>
                <button onclick="deleteMenuItem(${item.id})" class="text-red-500 p-2 hover:scale-110 transition-transform" title="Delete Product"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`).join('');
    } else if (activeBackOfficeTab === 'analysis' && analysisTable) {
        let rows = [];
        menu.forEach(item => {
            (item.variants || []).forEach(v => {
                const cogs = parseFloat(v.cogs || 0);
                const profit = parseFloat(v.price) - cogs;
                const margin = v.price > 0 ? (profit / v.price) * 100 : 0;
                rows.push(`<tr class="hover:bg-white/5 transition-colors">
                    <td class="px-8 py-5"><div class="font-bold text-slate-100">${item.name}</div><div class="text-[10px] font-black uppercase text-slate-500">${v.name}</div></td>
                    <td class="px-8 py-5 text-right font-mono font-bold">BND $${parseFloat(v.price).toFixed(2)}</td>
                    <td class="px-8 py-5 text-right font-mono text-slate-400">BND $${cogs.toFixed(2)}</td>
                    <td class="px-8 py-5 text-right font-mono text-emerald-400 font-bold">BND $${profit.toFixed(2)}</td>
                    <td class="px-8 py-5 text-right font-black ${margin > 50 ? 'text-emerald-400' : 'text-yellow-400'}">${margin.toFixed(1)}%</td>
                </tr>`);
            });
        });
        analysisTable.innerHTML = rows.join('');
    } else if (activeBackOfficeTab === 'logs' && logTable) {
        const logs = await fetchJSON('../api/?action=get_inventory_logs');
        logTable.innerHTML = logs.map(log => `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="px-8 py-4 text-[10px] text-slate-500 font-bold uppercase">${new Date(log.created_at).toLocaleString()}</td>
                <td class="px-8 py-4 font-bold text-slate-100">${log.item_name}</td>
                <td class="px-8 py-4 text-right font-black ${parseFloat(log.change_amount) > 0 ? 'text-emerald-400' : 'text-red-400'}">${log.change_amount}</td>
                <td class="px-8 py-4 text-slate-500 text-xs">${log.reason}</td>
            </tr>
        `).join('');
    } else if (activeBackOfficeTab === 'categories' && invCatList) {
        invCatList.innerHTML = invCats.map(c => `<div class="p-4 rounded-2xl bg-white/5 flex justify-between items-center text-xs font-bold"><span>${c.name}</span><button onclick="deleteCategory('inv', ${c.id})" class="text-red-500"><i class="fas fa-trash"></i></button></div>`).join('');
        menuCatList.innerHTML = menuCats.map(c => `<div class="p-4 rounded-2xl bg-white/5 flex justify-between items-center text-xs font-bold"><span>${c.name}</span><button onclick="deleteCategory('menu', ${c.id})" class="text-red-500"><i class="fas fa-trash"></i></button></div>`).join('');
    } else if (activeBackOfficeTab === 'vendors' && vendorsTable) {
        vendorsTable.innerHTML = vendors.map(v => `<tr class="hover:bg-white/5 transition-colors"><td class="px-8 py-5 font-bold text-slate-100">${v.name}</td><td class="px-8 py-5 text-xs text-slate-400">${v.contact_info || 'N/A'}</td><td class="px-8 py-5 text-xs text-slate-500 font-mono">${v.created_at}</td></tr>`).join('');
    }
}

function renderPerformance() {
    if (activePerformanceTab === 'sales') {
        loadAnalytics('month');
    } else if (activePerformanceTab === 'taxes') {
        const tBody = document.getElementById('perf-taxes-table');
        if (tBody) {
            tBody.innerHTML = taxes.map(t => `<tr class="hover:bg-white/5">
                <td class="px-8 py-5 font-bold text-slate-100">${t.name}</td>
                <td class="px-8 py-5 text-xs text-slate-400 font-bold">${t.rate}%</td>
                <td class="px-8 py-5 text-xs"><span class="px-2 py-1 rounded ${t.is_active == 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'} uppercase font-black text-[8px]">${t.is_active == 1 ? 'Active' : 'Inactive'}</span></td>
                <td class="px-8 py-5 text-right"><button onclick="toggleTax(${t.id})" class="text-sky-400 p-2"><i class="fas fa-toggle-${t.is_active == 1 ? 'on' : 'off'}"></i></button></td>
            </tr>`).join('');
        }
    } else if (activePerformanceTab === 'expenses') {
        const eBody = document.getElementById('perf-expenses-table');
        if (eBody) {
            eBody.innerHTML = expenses.map(e => `<tr><td class="px-8 py-5 text-xs text-slate-400 font-mono">${e.expense_date}</td><td class="px-8 py-5 font-bold text-slate-100">${e.description}</td><td class="px-8 py-5 text-xs text-red-400 font-bold">BND $${e.amount}</td></tr>`).join('');
        }
    } else if (activePerformanceTab === 'forecast') {
        loadAnalytics('month').then(() => updateForecast());
    }
}

async function loadAnalytics(range) {
    try {
        const d = await fetchJSON(`../api/?action=get_analytics&range=${range}`);
        analyticsData = d;
        document.getElementById('ana-rev').textContent = `BND $${d.revenue.toFixed(2)}`;
        document.getElementById('ana-tax').textContent = `BND $${d.tax_collected.toFixed(2)}`;
        document.getElementById('ana-expenses').textContent = `BND $${d.expenses.toFixed(2)}`;
        document.getElementById('ana-net').textContent = `BND $${d.net_profit.toFixed(2)}`;

        const canvas = document.getElementById('mainChart');
        if (!canvas) return;
        if (mainChart) mainChart.destroy();
        
        const accent = getComputedStyle(document.body).getPropertyValue('--color-accent').trim();
        mainChart = new Chart(canvas.getContext('2d'), { 
            type: 'line', 
            data: { 
                labels: (d.trend || []).map(x => x.day), 
                datasets: [{ label: 'Revenue', data: (d.trend || []).map(x => x.rev), borderColor: `rgb(${accent})`, backgroundColor: `rgba(${accent.split(' ').join(',')}, 0.1)`, fill: true, tension: 0.4 }] 
            }, 
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } }, x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)' } } } } 
        });
    } catch (e) { console.error("Analytics error", e); }
}

function updateForecast() {
    const volume = parseInt(document.getElementById('forecast-volume').value);
    document.getElementById('forecast-volume-val').textContent = volume;
    // ... simplified forecast logic ...
}

// Unit Conversion Preview Logic
['ing-purchase-unit', 'ing-usage-unit', 'ing-factor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = updateUnitPreview;
});

function updateUnitPreview() {
    const pUnit = document.getElementById('ing-purchase-unit').value || '[purchase]';
    const uUnit = document.getElementById('ing-usage-unit').value || '[usage]';
    const factor = document.getElementById('ing-factor').value || '[factor]';
    document.getElementById('unit-preview').textContent = `1 ${pUnit} = ${factor} ${uUnit}`;
}

// Add New Button Logic
document.getElementById('add-btn').onclick = () => {
    if (activeBackOfficeTab === 'ingredients') {
        document.getElementById('ing-modal-title').textContent = 'Add Ingredient';
        document.getElementById('ingredientForm').reset();
        document.getElementById('ing-id').value = '';
        document.getElementById('ing-category').innerHTML = invCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        updateUnitPreview();
        openModal('ingredientModal');
    } else if (activeBackOfficeTab === 'menu') {
        document.getElementById('productForm').reset();
        document.getElementById('prod-category').innerHTML = menuCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        document.getElementById('prod-vendor').innerHTML = `<option value="">In-House</option>` + vendors.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
        openModal('productModal');
    }
};

// Ingredient CRUD
async function editIngredient(id) {
    const item = inventory.find(i => i.id == id);
    if (!item) return;
    
    document.getElementById('ing-modal-title').textContent = 'Edit Ingredient';
    document.getElementById('ing-id').value = item.id;
    document.getElementById('ing-name').value = item.name;
    document.getElementById('ing-category').innerHTML = invCats.map(c => `<option value="${c.id}" ${c.id == item.category_id ? 'selected' : ''}>${c.name}</option>`).join('');
    document.getElementById('ing-min-stock').value = item.min_stock;
    document.getElementById('ing-purchase-unit').value = item.purchase_unit;
    document.getElementById('ing-usage-unit').value = item.usage_unit;
    document.getElementById('ing-factor').value = item.conversion_factor;
    // Calculate purchase cost: cost_per_usage * conversion_factor
    document.getElementById('ing-purchase-cost').value = (parseFloat(item.cost_per_unit) * parseFloat(item.conversion_factor)).toFixed(4);
    
    updateUnitPreview();
    openModal('ingredientModal');
}

document.getElementById('ingredientForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('ing-id').value;
    const factor = parseFloat(document.getElementById('ing-factor').value);
    const pCost = parseFloat(document.getElementById('ing-purchase-cost').value);
    
    const data = {
        name: document.getElementById('ing-name').value,
        category_id: document.getElementById('ing-category').value,
        min_stock: document.getElementById('ing-min-stock').value,
        purchase_unit: document.getElementById('ing-purchase-unit').value,
        usage_unit: document.getElementById('ing-usage-unit').value,
        conversion_factor: factor,
        cost_per_unit: (pCost / factor).toFixed(6) // Store cost per usage unit
    };

    const action = id ? 'update_inventory_item' : 'add_inventory_item';
    if (id) data.id = id;

    try {
        const res = await fetch(`../api/?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const d = await res.json();
        if (d.success) {
            closeModal('ingredientModal');
            initLens();
        } else { alert(d.error || 'Save failed'); }
    } catch (e) { alert('Connection error'); }
};

async function deleteIngredient(id) {
    if (!confirm('Are you sure? This will permanently remove the ingredient.')) return;
    try {
        const res = await fetch('../api/?action=delete_inventory_item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const d = await res.json();
        if (d.success) initLens();
        else alert(d.error || 'Delete failed');
    } catch (e) { alert('Connection error'); }
}

// Restock Logic
function openRestockModal(id) {
    const item = inventory.find(i => i.id == id);
    if (!item) return;
    document.getElementById('restock-id').value = id;
    document.getElementById('restock-label').textContent = `How many ${item.purchase_unit} of ${item.name} received?`;
    document.getElementById('restock-amount').value = '';
    document.getElementById('restock-preview').textContent = '';
    
    document.getElementById('restock-amount').oninput = (e) => {
        const val = parseFloat(e.target.value) || 0;
        const usage = (val * item.conversion_factor).toFixed(1);
        document.getElementById('restock-preview').textContent = `+ ${usage} ${item.usage_unit} will be added to stock`;
    };
    
    openModal('restockModal');
}

document.getElementById('restockForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('restock-id').value;
    const amount = document.getElementById('restock-amount').value;
    
    try {
        const res = await fetch('../api/?action=restock_item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, purchase_amount: amount })
        });
        const d = await res.json();
        if (d.success) {
            closeModal('restockModal');
            initLens();
        } else { alert(d.error || 'Restock failed'); }
    } catch (e) { alert('Connection error'); }
};

window.addEventListener('themeChanged', () => {
    if (!document.getElementById('analytics-page').classList.contains('hidden')) {
        renderPerformance();
    }
});

document.addEventListener('DOMContentLoaded', initLens);
