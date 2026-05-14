// Trace Lens (Back Office) Specific Logic
let activeBackOfficeTab = 'ingredients';
let activePerformanceTab = 'dashboard';
let analyticsData = {};
let revenueChart = null;
let peakHoursChart = null;
let currentRange = 'month';
let activeVariantId = null;

async function initLens() {
    try {
        await refreshCoreData();
        renderBackOffice();
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
    if (p === 'analytics') loadDashboard(currentRange);
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
    const el = document.getElementById(`tab-perf-${tab}`);
    if (el) el.classList.add('active-tab');
    ['dashboard','cogs','taxes','expenses'].forEach(t => {
        const p = document.getElementById(`perf-${t}`);
        if (p) p.classList.toggle('hidden', t !== tab);
    });
    const addBtn = document.getElementById('add-perf-btn');
    if (addBtn) addBtn.classList.toggle('hidden', tab !== 'taxes' && tab !== 'expenses');
    if (tab === 'dashboard') loadDashboard(currentRange);
    else if (tab === 'cogs') loadCogsReport(currentRange);
    else if (tab === 'taxes') renderTaxes();
    else if (tab === 'expenses') renderExpenses();
}

function setRange(range) {
    currentRange = range;
    ['day','month','year'].forEach(r => {
        const b = document.getElementById(`range-${r}`);
        if (b) b.classList.toggle('active-range', r === range);
    });
    if (activePerformanceTab === 'dashboard') loadDashboard(range);
    else if (activePerformanceTab === 'cogs') loadCogsReport(range);
}

function renderTaxes() {
    const tb = document.getElementById('perf-taxes-table');
    if (!tb) return;
    tb.innerHTML = taxes.map(t => `<tr class="hover:bg-white/5">
        <td class="px-8 py-5 font-bold">${t.name}</td>
        <td class="px-8 py-5 text-xs font-bold" style="color:rgb(var(--color-text)/0.5)">${t.rate}%</td>
        <td class="px-8 py-5 text-xs"><span class="px-2 py-1 rounded uppercase font-black text-[8px] ${t.is_active==1?'bg-emerald-500/10 text-emerald-400':'bg-red-500/10 text-red-400'}">${t.is_active==1?'Active':'Inactive'}</span></td>
        <td class="px-8 py-5 text-right"><button onclick="toggleTax(${t.id})" class="text-sky-400 p-2"><i class="fas fa-toggle-${t.is_active==1?'on':'off'}"></i></button></td>
    </tr>`).join('');
}

function renderExpenses() {
    const tb = document.getElementById('perf-expenses-table');
    if (!tb) return;
    tb.innerHTML = expenses.map(e => `<tr><td class="px-8 py-5 text-xs font-mono" style="color:rgb(var(--color-text)/0.5)">${e.expense_date}</td><td class="px-8 py-5 font-bold">${e.description}</td><td class="px-8 py-5 text-xs font-bold" style="color:rgb(var(--color-danger))">BND $${parseFloat(e.amount).toFixed(2)}</td></tr>`).join('');
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

async function loadDashboard(range) {
    try {
        const [analytics, peakHours, cogsData] = await Promise.all([
            fetchJSON(`../api/?action=get_analytics&range=${range}`),
            fetchJSON(`../api/?action=get_peak_hours&range=${range}`),
            fetchJSON(`../api/?action=get_cogs_report&range=${range}`)
        ]);
        analyticsData = analytics;
        renderKPIs(analytics);
        renderRevenueChart(analytics);
        renderPeakHoursChart(peakHours);
        renderCogsRows(cogsData, 'dash-cogs-table', 6);
    } catch(e) { console.error('Dashboard error', e); }
}

async function loadCogsReport(range) {
    try {
        const data = await fetchJSON(`../api/?action=get_cogs_report&range=${range}`);
        renderCogsRows(data, 'full-cogs-table', null);
    } catch(e) { console.error('COGS report error', e); }
}

function renderKPIs(d) {
    const fmt = v => `BND $${parseFloat(v).toFixed(2)}`;
    const gross = d.revenue - d.cogs;
    const margin = d.revenue > 0 ? (gross / d.revenue * 100) : 0;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('kpi-rev',    fmt(d.revenue));
    set('kpi-cogs',   fmt(d.cogs));
    set('kpi-gross',  fmt(gross));
    set('kpi-margin', margin.toFixed(1) + '%');
    set('kpi-exp',    fmt(d.expenses));
    set('kpi-net',    fmt(d.net_profit));
}

function renderRevenueChart(d) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    if (revenueChart) revenueChart.destroy();
    const cs = getComputedStyle(document.body);
    const accent = cs.getPropertyValue('--color-accent').trim().split(' ');
    const amber  = cs.getPropertyValue('--color-amber').trim().split(' ');
    const danger = cs.getPropertyValue('--color-danger').trim().split(' ');
    const toRgb  = (c, a) => `rgba(${c.join(',')},${a})`;
    const labels = (d.trend||[]).map(x => x.day);
    revenueChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Revenue',  data: (d.trend||[]).map(x=>x.rev), backgroundColor: toRgb(accent, 0.7), borderRadius: 4 },
                { label: 'Expenses', data: (d.trend||[]).map(x=>x.exp), backgroundColor: toRgb(danger, 0.55), borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: `rgba(${getComputedStyle(document.body).getPropertyValue('--color-text').trim().split(' ').join(',')},0.5)`, boxWidth: 10, font: { size: 10, weight: '800' } } } },
            scales: {
                y: { grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { color: 'rgba(128,128,128,0.6)', font: { size: 10 } } },
                x: { grid: { display: false }, ticks: { color: 'rgba(128,128,128,0.6)', font: { size: 9 }, maxRotation: 45 } }
            }
        }
    });
}

function renderPeakHoursChart(data) {
    const canvas = document.getElementById('peakHoursChart');
    if (!canvas) return;
    if (peakHoursChart) peakHoursChart.destroy();
    const fmtHour = h => { const s = h % 12 || 12; return `${s}${h<12?'am':'pm'}`; };
    const maxOrders = Math.max(...data.map(r => +r.orders), 1);
    const colors = data.map(r => {
        const ratio = +r.orders / maxOrders;
        const r1 = Math.round(0 + ratio * 251),
              g1 = Math.round(245 - ratio * 54),
              b1 = Math.round(255 - ratio * 219);
        return `rgba(${r1},${g1},${b1},0.75)`;
    });
    // Find peak hour
    if (data.length > 0) {
        const peak = data.reduce((a,b) => +b.orders > +a.orders ? b : a);
        const badge = document.getElementById('peak-badge');
        const lbl   = document.getElementById('peak-hour-label');
        if (badge && lbl) { lbl.textContent = fmtHour(+peak.hour) + ' peak'; badge.classList.remove('hidden'); }
    }
    peakHoursChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: data.map(r => fmtHour(+r.hour)),
            datasets: [{ label: 'Orders', data: data.map(r => r.orders), backgroundColor: colors, borderRadius: 6 }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: (ctx) => {
                const rev = data[ctx.dataIndex]?.revenue;
                return rev ? `Revenue: BND $${parseFloat(rev).toFixed(2)}` : '';
            }}}},
            scales: {
                x: { grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { color: 'rgba(128,128,128,0.6)', font: { size: 9 } } },
                y: { grid: { display: false }, ticks: { color: 'rgba(128,128,128,0.6)', font: { size: 9, weight: '700' } } }
            }
        }
    });
}

function renderCogsRows(data, tableId, limit) {
    const tb = document.getElementById(tableId);
    if (!tb) return;
    const rows = limit ? data.slice(0, limit) : data;
    const isCompact = (tableId === 'dash-cogs-table');
    tb.innerHTML = rows.map(r => {
        const rev    = parseFloat(r.revenue);
        const cogs   = parseFloat(r.cogs);
        const profit = parseFloat(r.gross_profit);
        const margin = rev > 0 ? (profit / rev * 100) : 0;
        const mColor = margin >= 60 ? 'var(--color-success)' : margin >= 35 ? 'var(--color-amber)' : 'var(--color-danger)';
        const barFill = `<div class="margin-bar-track"><div class="margin-bar-fill" style="width:${Math.min(margin,100).toFixed(1)}%;background:rgb(${mColor})"></div></div>`;
        if (isCompact) {
            return `<tr class="hover:bg-white/5 transition-colors">
                <td class="px-6 py-3"><div class="font-bold text-sm">${r.item_name}</div><div class="text-[9px] font-black uppercase" style="color:rgb(var(--color-text)/0.35)">${r.variant_name}</div></td>
                <td class="px-6 py-3 text-right text-xs font-mono font-bold">${r.units_sold}</td>
                <td class="px-6 py-3 text-right text-xs font-mono">$${rev.toFixed(2)}</td>
                <td class="px-6 py-3 text-right text-xs font-mono" style="color:rgb(var(--color-amber))">$${cogs.toFixed(2)}</td>
                <td class="px-6 py-3 text-right text-xs font-mono font-bold" style="color:rgb(var(--color-success))">$${profit.toFixed(2)}</td>
                <td class="px-6 py-3" style="min-width:100px"><div class="text-xs font-black" style="color:rgb(${mColor})">${margin.toFixed(1)}%</div>${barFill}</td>
            </tr>`;
        }
        return `<tr class="hover:bg-white/5 transition-colors">
            <td class="px-6 py-4"><div class="font-bold">${r.item_name}</div><div class="text-[9px] font-black uppercase" style="color:rgb(var(--color-text)/0.35)">${r.variant_name}</div></td>
            <td class="px-6 py-4 text-right text-xs font-mono font-bold">${r.units_sold}</td>
            <td class="px-6 py-4 text-right text-xs font-mono">$${parseFloat(r.selling_price).toFixed(2)}</td>
            <td class="px-6 py-4 text-right text-xs font-mono">$${rev.toFixed(2)}</td>
            <td class="px-6 py-4 text-right text-xs font-mono" style="color:rgb(var(--color-amber))">$${cogs.toFixed(2)}</td>
            <td class="px-6 py-4 text-right text-xs font-mono font-bold" style="color:rgb(var(--color-success))">$${profit.toFixed(2)}</td>
            <td class="px-6 py-4" style="min-width:120px"><div class="text-xs font-black" style="color:rgb(${mColor})">${margin.toFixed(1)}%</div>${barFill}</td>
        </tr>`;
    }).join('');
    if (rows.length === 0) tb.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-xs font-bold" style="color:rgb(var(--color-text)/0.3)">No sales data for this period.</td></tr>`;
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
        loadDashboard(currentRange);
    }
});

document.addEventListener('DOMContentLoaded', initLens);
