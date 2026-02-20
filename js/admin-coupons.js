
import { fetchProfiles, fetchAllCoupons, createCouponsBatch, deleteCoupon, deleteCouponsBatch } from './api.js';
import { escapeHtml } from './utils.js';

export async function initAdminCoupons() {
    const tableBody = document.getElementById('coupons-table-body');
    const formContainer = document.getElementById('coupon-form-container');
    const userSelect = document.getElementById('coupon-user-selection');
    const btnShowForm = document.getElementById('btn-show-coupon-form');
    const btnCancel = document.getElementById('btn-cancel-coupon');
    const couponForm = document.getElementById('coupon-form');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const searchInput = document.getElementById('coupon-search');
    const batchActions = document.getElementById('coupons-batch-actions');
    const batchCountText = document.getElementById('batch-selection-count');
    const btnDeleteBatch = document.getElementById('btn-delete-batch-coupons');
    const selectAllCheckbox = document.getElementById('coupon-select-all');

    let currentFilter = 'all'; // all, manual, welcome, bulk
    let searchTerm = '';
    let allCoupons = [];
    let selectedCouponIds = new Set();
    let currentFilteredCoupons = [];

    // 1. Load Data
    await loadCouponsList();
    await loadUserOptions();

    // 2. Event Listeners
    btnShowForm.onclick = () => {
        formContainer.style.display = 'block';
        btnShowForm.style.display = 'none';
    };

    btnCancel.onclick = () => {
        formContainer.style.display = 'none';
        btnShowForm.style.display = 'block';
        couponForm.reset();
    };

    // Filter Logic
    filterTabs.forEach(tab => {
        tab.onclick = () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderCouponsTable();
        };
    });

    // Search Logic
    searchInput.oninput = () => {
        searchTerm = searchInput.value.trim().toLowerCase();
        renderCouponsTable();
    };

    // Batch Deletion Logic
    selectAllCheckbox.onchange = (e) => {
        const checked = e.target.checked;
        if (checked) {
            currentFilteredCoupons.forEach(c => selectedCouponIds.add(c.id));
        } else {
            currentFilteredCoupons.forEach(c => selectedCouponIds.delete(c.id));
        }
        renderCouponsTable();
    };

    btnDeleteBatch.onclick = async () => {
        const count = selectedCouponIds.size;
        if (count === 0) return;

        if (confirm(`¿Estás seguro de que quieres eliminar ${count} cupones seleccionados?`)) {
            const idsToDelete = Array.from(selectedCouponIds);
            const { error } = await deleteCouponsBatch(idsToDelete);

            if (error) {
                alert('Error al eliminar cupones: ' + error.message);
            } else {
                alert(`${count} cupones eliminados correctamente.`);
                selectedCouponIds.clear();
                updateSelectionUI();
                loadCouponsList();
            }
        }
    };

    couponForm.onsubmit = async (e) => {
        e.preventDefault();

        const code = document.getElementById('coupon-create-code').value.trim().toUpperCase();
        const discount = parseInt(document.getElementById('coupon-create-discount').value);
        const maxItems = parseInt(document.getElementById('coupon-create-max-items').value) || 0;
        const targetUserId = userSelect.value;

        if (!code || isNaN(discount)) return;

        let userIds = [];
        if (targetUserId === 'all') {
            const profiles = await fetchProfiles();
            userIds = profiles.map(p => p.id);
        } else {
            userIds = [targetUserId];
        }

        if (userIds.length === 0) {
            alert('No hay usuarios seleccionados.');
            return;
        }

        const baseCoupon = {
            code,
            discount_percent: discount,
            max_items: maxItems,
            type: 'admin_manual'
        };

        const { error } = await createCouponsBatch(baseCoupon, userIds);

        if (error) {
            alert('Error al crear cupones: ' + error.message);
        } else {
            alert(`${userIds.length} cupón(es) creado(s) correctamente.`);
            btnCancel.click(); // Hide form
            loadCouponsList();
        }
    };

    async function loadCouponsList() {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando cupones...</td></tr>';

        // Fetch data in parallel
        const [coupons, profiles] = await Promise.all([
            fetchAllCoupons(),
            fetchProfiles()
        ]);

        allCoupons = coupons;
        selectedCouponIds.clear();
        updateSelectionUI();

        // Create a map for quick name lookup
        const profileMap = {};
        profiles.forEach(p => profileMap[p.id] = p.full_name);
        window.couponProfileMap = profileMap; // Store globally for render

        renderCouponsTable();
    }

    function updateSelectionUI() {
        if (!batchActions) return;

        const count = selectedCouponIds.size;
        if (count > 0) {
            batchActions.style.display = 'flex';
            batchCountText.textContent = `${count} cupón(es) seleccionado(s)`;
        } else {
            batchActions.style.display = 'none';
        }

        // Update header checkbox state
        if (selectAllCheckbox) {
            if (currentFilteredCoupons.length > 0) {
                selectAllCheckbox.checked = currentFilteredCoupons.every(c => selectedCouponIds.has(c.id));
            } else {
                selectAllCheckbox.checked = false;
            }
        }
    }

    function renderCouponsTable() {
        const profileMap = window.couponProfileMap || {};

        let filtered = allCoupons;
        if (currentFilter === 'manual') {
            filtered = allCoupons.filter(c => c.type === 'admin_manual');
        } else if (currentFilter === 'welcome') {
            filtered = allCoupons.filter(c => c.type === 'welcome_20');
        } else if (currentFilter === 'bulk') {
            filtered = allCoupons.filter(c => c.type === 'bulk_50' || c.type === 'bulk_discount');
        }

        if (searchTerm) {
            filtered = filtered.filter(c => c.code.toLowerCase().includes(searchTerm));
        }

        currentFilteredCoupons = filtered;

        if (filtered.length === 0) {
            let emptyMsg = `No hay cupones ${currentFilter !== 'all' ? 'de este tipo' : 'registrados'}.`;
            if (searchTerm) {
                emptyMsg = `No se encontraron cupones que coincidan con "<strong>${escapeHtml(searchTerm)}</strong>".`;
            }
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${emptyMsg}</td></tr>`;
            return;
        }

        tableBody.innerHTML = filtered.map(c => {
            const userName = profileMap[c.user_id] || 'Desconocido';
            const isChecked = selectedCouponIds.has(c.id);
            return `
                <tr>
                    <td>
                        <input type="checkbox" class="coupon-row-checkbox" data-id="${c.id}" ${isChecked ? 'checked' : ''}>
                    </td>
                    <td><strong>${escapeHtml(c.code)}</strong></td>
                    <td>
                        <div>${escapeHtml(userName)}</div>
                        <small class="text-gray">${escapeHtml(String(c.user_id).slice(0, 8))}</small>
                    </td>
                    <td>${c.discount_percent}% ${c.type === 'bulk_discount' ? '(Bulk)' : ''}</td>
                    <td>
                        <span class="status-badge ${c.is_used ? 'status-cancelled' : 'status-paid'}">
                            ${c.is_used ? 'Usado' : 'Disponible'}
                        </span>
                    </td>
                    <td><small>${new Date(c.created_at).toLocaleDateString()}</small></td>
                    <td>
                        <button class="btn-icon" onclick="deleteCouponHandler('${c.id}')" title="Eliminar">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Selection listeners for rows
        document.querySelectorAll('.coupon-row-checkbox').forEach(cb => {
            cb.onchange = (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) {
                    selectedCouponIds.add(id);
                } else {
                    selectedCouponIds.delete(id);
                }
                updateSelectionUI();
            };
        });

        if (window.lucide) window.lucide.createIcons();
        updateSelectionUI();
    }

    async function loadUserOptions() {
        const profiles = await fetchProfiles();
        // Keep "All" as first option
        userSelect.innerHTML = '<option value="all">-- Todos los Usuarios --</option>' +
            profiles.map(p => `
                <option value="${p.id}">${escapeHtml(p.full_name || 'Sin nombre')} [${escapeHtml(String(p.id).slice(0, 8))}]</option>
            `).join('');
    }

    // Global handler for deletion
    window.deleteCouponHandler = async (id) => {
        if (confirm('¿Seguro que quieres eliminar este cupón?')) {
            const { error } = await deleteCoupon(id);
            if (error) {
                alert('Error al eliminar: ' + error.message);
            } else {
                loadCouponsList();
            }
        }
    };
}
