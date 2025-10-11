/**
 * Admin Subscription Configuration
 * Feature: 011-in-de-app
 * Manages Plug&Pay checkout URLs per plan
 */

let configurations = [];

/**
 * Initialize the config page
 */
async function initializeConfigPage() {
    console.log('Initializing subscription config page...');
    showLoading();

    try {
        await loadConfigurations();
        renderConfigurations();
        hideLoading();
    } catch (error) {
        console.error('Error initializing config page:', error);
        hideLoading();
        showAlert('Fout bij laden van configuraties: ' + error.message, 'error');
    }
}

/**
 * Load configurations from API
 */
async function loadConfigurations() {
    const response = await fetch('/api/admin/payment-configurations', {
        credentials: 'include'
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load configurations');
    }

    const data = await response.json();
    configurations = data.configurations;
    console.log('Loaded configurations:', configurations);
}

/**
 * Render configurations UI
 */
function renderConfigurations() {
    const grid = document.getElementById('config-grid');
    grid.innerHTML = '';

    configurations.forEach(config => {
        const card = createConfigCard(config);
        grid.appendChild(card);
    });
}

/**
 * Create a configuration card
 */
function createConfigCard(config) {
    const card = document.createElement('div');
    card.className = 'config-card';
    card.setAttribute('data-plan-id', config.plan_id);

    const statusClass = config.is_active ? 'status-active' : 'status-inactive';
    const statusText = config.is_active ? 'Actief' : 'Inactief';

    card.innerHTML = `
        <h3>
            ${config.plan_name}
            <span class="status-badge ${statusClass}">${statusText}</span>
        </h3>

        <div class="form-group">
            <label for="url-${config.plan_id}">
                <i class="fas fa-link"></i>
                Plug&Pay Checkout URL
            </label>
            <input
                type="url"
                id="url-${config.plan_id}"
                value="${config.checkout_url || ''}"
                placeholder="https://..."
                class="checkout-url"
            />
        </div>

        <div class="form-group">
            <div class="checkbox-group">
                <input
                    type="checkbox"
                    id="active-${config.plan_id}"
                    ${config.is_active ? 'checked' : ''}
                    class="is-active"
                />
                <label for="active-${config.plan_id}">Plan is actief en beschikbaar voor gebruikers</label>
            </div>
        </div>

        <div style="display: flex; gap: 8px;">
            <button
                class="button button-primary"
                onclick="saveConfiguration('${config.plan_id}')"
            >
                <i class="fas fa-save"></i>
                Opslaan
            </button>
            <button
                class="button button-secondary"
                onclick="testURL('${config.plan_id}')"
            >
                <i class="fas fa-external-link-alt"></i>
                Test URL
            </button>
        </div>

        <div style="margin-top: 12px; font-size: 12px; color: #6b7280;">
            <i class="fas fa-info-circle"></i>
            Laatst bijgewerkt: ${formatDate(config.updated_at)}
        </div>
    `;

    return card;
}

/**
 * Save configuration
 */
async function saveConfiguration(planId) {
    console.log('Saving configuration for plan:', planId);

    const card = document.querySelector(`[data-plan-id="${planId}"]`);
    const checkoutUrl = card.querySelector('.checkout-url').value.trim();
    const isActive = card.querySelector('.is-active').checked;

    // Validation
    if (checkoutUrl && !checkoutUrl.startsWith('https://')) {
        showAlert('Checkout URL moet beginnen met https://', 'error');
        return;
    }

    if (isActive && !checkoutUrl) {
        showAlert('Een actief plan vereist een checkout URL', 'error');
        return;
    }

    showLoading();

    try {
        const response = await fetch(`/api/admin/payment-configurations/${planId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                checkout_url: checkoutUrl,
                is_active: isActive
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save configuration');
        }

        const result = await response.json();
        console.log('Configuration saved:', result);

        // Update local data
        const index = configurations.findIndex(c => c.plan_id === planId);
        if (index !== -1) {
            configurations[index] = result.configuration;
        }

        showAlert(`Configuratie voor ${planId} succesvol opgeslagen!`, 'success');

        // Re-render to show updated data
        renderConfigurations();

    } catch (error) {
        console.error('Error saving configuration:', error);
        showAlert('Fout bij opslaan: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Test checkout URL
 */
function testURL(planId) {
    const card = document.querySelector(`[data-plan-id="${planId}"]`);
    const checkoutUrl = card.querySelector('.checkout-url').value.trim();

    if (!checkoutUrl) {
        showAlert('Voer eerst een checkout URL in', 'error');
        return;
    }

    if (!checkoutUrl.startsWith('https://')) {
        showAlert('Checkout URL moet beginnen met https://', 'error');
        return;
    }

    console.log('Opening checkout URL:', checkoutUrl);
    window.open(checkoutUrl, '_blank');
}

/**
 * Show loading overlay
 */
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

/**
 * Show alert message
 */
function showAlert(message, type = 'success') {
    const container = document.getElementById('alerts-container');

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(alert);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transition = 'opacity 0.3s';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'Nooit';

    const date = new Date(dateString);
    return date.toLocaleString('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Export functions for global access
window.initializeConfigPage = initializeConfigPage;
window.saveConfiguration = saveConfiguration;
window.testURL = testURL;
