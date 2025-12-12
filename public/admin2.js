/**
 * Admin Dashboard v2 - JavaScript
 * Tickedify Admin Interface
 */

// ============================================================================
// API Client
// ============================================================================

const API = {
    baseURL: '/api/admin2',

    /**
     * Generic fetch wrapper with error handling
     */
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(error.message || error.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    },

    // Statistics endpoints
    stats: {
        home: () => API.request('/stats/home'),
        growth: () => API.request('/stats/growth'),
        tasks: () => API.request('/stats/tasks'),
        emails: () => API.request('/stats/emails'),
        database: () => API.request('/stats/database'),
        revenue: () => API.request('/stats/revenue')
    },

    // User management endpoints
    users: {
        search: (query) => API.request(`/users/search?q=${encodeURIComponent(query)}`),
        get: (id) => API.request(`/users/${id}`),
        changeTier: (id, tier) => API.request(`/users/${id}/tier`, {
            method: 'PUT',
            body: JSON.stringify({ tier })
        }),
        extendTrial: (id, trialEndDate) => API.request(`/users/${id}/trial`, {
            method: 'PUT',
            body: JSON.stringify({ trial_end_date: trialEndDate })
        }),
        blockUser: (id, blocked) => API.request(`/users/${id}/block`, {
            method: 'PUT',
            body: JSON.stringify({ blocked })
        }),
        forceLogout: (id) => API.request(`/users/${id}/logout`, { method: 'POST' }),
        deleteUser: (id) => API.request(`/users/${id}`, { method: 'DELETE' }),
        resetPassword: (id) => API.request(`/users/${id}/reset-password`, { method: 'POST' }),
        getTaskActivity: (id, startDate, endDate) => API.request(
            `/users/${id}/task-activity?start_date=${startDate}&end_date=${endDate}`
        )
    },

    // System configuration endpoints
    system: {
        getSettings: () => API.request('/system/settings'),
        updateSetting: (key, value) => API.request(`/system/settings/${key}`, {
            method: 'PUT',
            body: JSON.stringify({ value })
        }),
        getPayments: () => API.request('/system/payments'),
        updateCheckoutURL: (id, checkoutUrl) => API.request(`/system/payments/${id}/checkout-url`, {
            method: 'PUT',
            body: JSON.stringify({ checkout_url: checkoutUrl })
        })
    },

    // Debug tools endpoints
    debug: {
        getUserData: (email) => API.request(`/debug/user-data-by-email?email=${encodeURIComponent(email)}`),
        sqlQuery: (query, confirmDestructive = false) => API.request('/debug/sql-query', {
            method: 'POST',
            body: JSON.stringify({ query, confirm_destructive: confirmDestructive })
        }),
        databaseBackup: () => API.request('/debug/database-backup', { method: 'POST' }),
        cleanupData: (preview = true) => API.request('/debug/cleanup-orphaned-data', {
            method: 'POST',
            body: JSON.stringify({ preview })
        })
    },

    // Feedback & Support endpoints (Note: uses /api/admin, not /api/admin2)
    feedback: {
        getAll: () => fetch('/api/admin/feedback').then(r => r.json()),
        getStats: () => fetch('/api/admin/feedback/stats').then(r => r.json()),
        updateStatus: (id, status) => fetch(`/api/admin/feedback/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        }).then(r => r.json())
    }
};

// ============================================================================
// Task Activity Chart (Feature 073)
// ============================================================================

let taskActivityChart = null;

/**
 * Calculate date range for a given period type
 */
function calculatePeriodDates(periodType) {
    const now = new Date();
    let startDate, endDate;

    switch (periodType) {
        case 'week':
            // This week (Monday to Sunday)
            const dayOfWeek = now.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            startDate = new Date(now);
            startDate.setDate(now.getDate() - daysToMonday);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            break;
        case 'month':
            // This month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'quarter':
            // This quarter
            const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
            startDate = new Date(now.getFullYear(), quarterMonth, 1);
            endDate = new Date(now.getFullYear(), quarterMonth + 3, 0);
            break;
        case 'year':
            // This year
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        default:
            // Default to this week
            return calculatePeriodDates('week');
    }

    // Format as YYYY-MM-DD
    const formatDate = (d) => d.toISOString().split('T')[0];
    return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
    };
}

/**
 * Load task activity data and render chart
 */
async function loadTaskActivity(userId, startDate, endDate) {
    const loadingEl = document.getElementById('activity-chart-loading');
    const chartCanvas = document.getElementById('task-activity-chart');

    try {
        // Show loading
        if (loadingEl) loadingEl.style.display = 'block';
        if (chartCanvas) chartCanvas.style.display = 'none';

        // Fetch data
        const data = await API.users.getTaskActivity(userId, startDate, endDate);

        // Render chart
        renderTaskActivityChart(data);

        // Render statistics
        renderActivityStatistics(data.statistics);

    } catch (error) {
        console.error('Failed to load task activity:', error);
        if (loadingEl) {
            loadingEl.textContent = 'Failed to load chart data';
            loadingEl.style.color = '#dc3545';
        }
    }
}

/**
 * Render the task activity bar chart
 */
function renderTaskActivityChart(data) {
    const loadingEl = document.getElementById('activity-chart-loading');
    const chartCanvas = document.getElementById('task-activity-chart');

    if (!chartCanvas) return;

    // Hide loading, show canvas
    if (loadingEl) loadingEl.style.display = 'none';
    chartCanvas.style.display = 'block';

    // Destroy existing chart
    if (taskActivityChart) {
        taskActivityChart.destroy();
        taskActivityChart = null;
    }

    // Prepare data
    const labels = data.activity.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const counts = data.activity.map(d => d.count);

    // Create chart
    const ctx = chartCanvas.getContext('2d');
    taskActivityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tasks Created',
                data: counts,
                backgroundColor: 'rgba(0, 122, 255, 0.7)',
                borderColor: 'rgba(0, 122, 255, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            if (items.length > 0) {
                                const idx = items[0].dataIndex;
                                return data.activity[idx].date;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    },
                    title: {
                        display: true,
                        text: 'Tasks'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

/**
 * Render activity statistics
 */
function renderActivityStatistics(statistics) {
    const totalEl = document.getElementById('activity-stat-total');
    const averageEl = document.getElementById('activity-stat-average');
    const peakEl = document.getElementById('activity-stat-peak');
    const trendEl = document.getElementById('activity-stat-trend');

    if (totalEl) totalEl.textContent = statistics.total.toLocaleString();
    if (averageEl) averageEl.textContent = statistics.average.toFixed(1);

    if (peakEl) {
        if (statistics.peak_date && statistics.peak_count > 0) {
            const peakDate = new Date(statistics.peak_date);
            const formatted = peakDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            peakEl.textContent = `${formatted} (${statistics.peak_count})`;
        } else {
            peakEl.textContent = 'N/A';
        }
    }

    if (trendEl) {
        const trendIcons = {
            up: '📈 Up',
            down: '📉 Down',
            stable: '➡️ Stable'
        };
        const trendColors = {
            up: '#28a745',
            down: '#dc3545',
            stable: '#6c757d'
        };
        trendEl.textContent = trendIcons[statistics.trend] || 'N/A';
        trendEl.style.color = trendColors[statistics.trend] || 'inherit';
    }
}

/**
 * Initialize task activity event handlers
 * This function is idempotent - safe to call multiple times
 */
function initTaskActivityHandlers() {
    let periodSelector = document.getElementById('activity-period-selector');
    const customDateRange = document.getElementById('custom-date-range');
    const startDateInput = document.getElementById('activity-start-date');
    const endDateInput = document.getElementById('activity-end-date');
    let applyBtn = document.getElementById('apply-custom-dates');
    const errorEl = document.getElementById('date-range-error');

    // Skip if elements don't exist yet (dynamically loaded HTML)
    if (!periodSelector) return;

    // Remove old event listeners by cloning the elements (idempotent approach)
    const newPeriodSelector = periodSelector.cloneNode(true);
    periodSelector.parentNode.replaceChild(newPeriodSelector, periodSelector);
    periodSelector = newPeriodSelector;

    if (applyBtn) {
        const newApplyBtn = applyBtn.cloneNode(true);
        applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
        applyBtn = newApplyBtn;
    }

    // Attach fresh event listener for period selector
    periodSelector.addEventListener('change', () => {
        const period = periodSelector.value;

        if (period === 'custom') {
            // Show custom date range inputs
            if (customDateRange) customDateRange.style.display = 'block';
        } else {
            // Hide custom date range
            if (customDateRange) customDateRange.style.display = 'none';
            if (errorEl) errorEl.style.display = 'none';

            // Calculate dates and load
            const { startDate, endDate } = calculatePeriodDates(period);
            if (window.currentUserId) {
                loadTaskActivity(window.currentUserId, startDate, endDate);
            }
        }
    });

    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            const startDate = startDateInput?.value;
            const endDate = endDateInput?.value;

            // Validate
            if (!startDate || !endDate) {
                if (errorEl) {
                    errorEl.textContent = 'Please select both start and end dates';
                    errorEl.style.display = 'block';
                }
                return;
            }

            if (endDate < startDate) {
                if (errorEl) {
                    errorEl.textContent = 'End date must be on or after start date';
                    errorEl.style.display = 'block';
                }
                return;
            }

            // Check date range not too large
            const start = new Date(startDate);
            const end = new Date(endDate);
            const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            if (daysDiff > 366) {
                if (errorEl) {
                    errorEl.textContent = 'Maximum date range is 366 days';
                    errorEl.style.display = 'block';
                }
                return;
            }

            // Hide error and load
            if (errorEl) errorEl.style.display = 'none';
            if (window.currentUserId) {
                loadTaskActivity(window.currentUserId, startDate, endDate);
            }
        });
    }
}

// Initialize handlers when DOM is ready
document.addEventListener('DOMContentLoaded', initTaskActivityHandlers);

// ============================================================================
// Screen Manager
// ============================================================================

const ScreenManager = {
    currentScreen: 'home',

    /**
     * Initialize screen manager and hash routing
     */
    init() {
        // Handle hash changes
        window.addEventListener('hashchange', () => this.navigate());

        // Handle nav link clicks
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const screen = link.getAttribute('data-screen');
                window.location.hash = screen;
            });
        });

        // Load initial screen
        this.navigate();
    },

    /**
     * Navigate to a screen based on hash
     */
    navigate() {
        const hash = window.location.hash.slice(1) || 'home';
        this.show(hash);
    },

    /**
     * Show a specific screen
     */
    show(screenName) {
        // Hide all screens
        document.querySelectorAll('.admin-screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Remove active from all nav links
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show requested screen
        const screen = document.getElementById(`screen-${screenName}`);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenName;

            // Set active nav link
            const navLink = document.querySelector(`.admin-nav-link[data-screen="${screenName}"]`);
            if (navLink) {
                navLink.classList.add('active');
            }

            // Update breadcrumb (T042)
            this.updateBreadcrumb(screenName);

            // Load screen content
            this.loadScreen(screenName);
        }
    },

    /**
     * Update breadcrumb navigation (T042)
     */
    updateBreadcrumb(screenName) {
        const breadcrumbMap = {
            'home': '🏠 Home Dashboard',
            'tasks': '📊 Task Analytics',
            'emails': '📧 Email Analytics',
            'database': '💾 Database Monitor',
            'revenue': '💰 Revenue Dashboard',
            'users': '👥 User Management',
            'feedback': '💬 Feedback & Support',
            'system': '⚙️ System Settings',
            'dbtools': '🔧 Database Tools',
            'debug': '🔍 Debug Tools',
            'security': '🔒 Security',
            'backups': '💾 Backups'
        };

        const breadcrumbText = document.getElementById('breadcrumb-text');
        if (breadcrumbText) {
            breadcrumbText.textContent = breadcrumbMap[screenName] || screenName;
        }
    },

    /**
     * Load content for a screen
     */
    async loadScreen(screenName) {
        const loadFunctions = {
            'home': Screens.loadHome,
            'tasks': Screens.loadTasks,
            'emails': Screens.loadEmails,
            'database': Screens.loadDatabase,
            'revenue': Screens.loadRevenue,
            'users': Screens.loadUsers,
            'feedback': Screens.loadFeedback,
            'system': Screens.loadSystem,
            'dbtools': Screens.loadDBTools,
            'debug': Screens.loadDebug,
            'security': Screens.loadSecurity
        };

        const loadFunction = loadFunctions[screenName];
        if (loadFunction) {
            try {
                await loadFunction.call(Screens);
            } catch (error) {
                console.error(`Error loading ${screenName} screen:`, error);
                this.showError(screenName, error.message);
            }
        }
    },

    /**
     * Show loading state (T043)
     */
    showLoading(containerId) {
        const container = document.getElementById(containerId.replace('#', ''));
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px;">
                    <div class="loading-spinner"></div>
                    <p style="margin-top: 20px; color: var(--macos-text-secondary);">Loading...</p>
                </div>
            `;
        }
    },

    /**
     * Hide loading state (T043)
     */
    hideLoading(containerId) {
        // Loading wordt verborgen door het renderen van echte content
    },

    /**
     * Show error message (T043)
     */
    showError(containerId, message, error) {
        const container = document.getElementById(containerId.replace('#', ''));
        if (container) {
            console.error(message, error);
            container.innerHTML = `
                <div class="error-message">
                    <strong>❌ Error:</strong> ${message}
                    ${error ? `<br><small>${error.message || error}</small>` : ''}
                    <br><br>
                    <button class="btn btn-primary" onclick="location.reload()">
                        🔄 Reload Page
                    </button>
                </div>
            `;
        }
    }
};

// ============================================================================
// Helper Functions
// ============================================================================

const Helpers = {
    /**
     * Format number with thousands separator
     */
    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return num.toLocaleString('nl-NL');
    },

    /**
     * Format percentage with decimal places
     */
    formatPercentage(num, decimals = 1) {
        if (num === null || num === undefined) return '0.0%';
        return `${num.toFixed(decimals)}%`;
    },

    /**
     * Format date to readable format
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('nl-NL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Format date as relative time
     */
    formatRelativeTime(dateString) {
        if (!dateString) return '-';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return this.formatDate(dateString);
    },

    /**
     * Get CSS class for tier badge
     */
    getTierBadgeClass(tier) {
        const classes = {
            'free': 'badge-secondary',
            'premium': 'badge-primary',
            'enterprise': 'badge-gold'
        };
        return classes[tier] || 'badge-secondary';
    },

    /**
     * Get tier display name
     */
    getTierDisplayName(tier) {
        const names = {
            'free': 'Free',
            'premium': 'Premium',
            'enterprise': 'Enterprise'
        };
        return names[tier] || tier;
    }
};

// ============================================================================
// System Actions (Settings & Payment Configs)
// ============================================================================

const SystemActions = {
    currentSettingKey: null,
    currentPaymentConfigId: null,

    async refreshSettings() {
        try {
            const tbody = document.getElementById('system-settings-table');
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';

            const data = await API.system.getSettings();

            if (data.settings.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No settings found</td></tr>';
                return;
            }

            tbody.innerHTML = data.settings.map(setting => `
                <tr>
                    <td><code>${setting.key}</code></td>
                    <td>${setting.value || '-'}</td>
                    <td>${setting.description || '-'}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="SystemActions.showEditSettingModal('${setting.key}', '${setting.value || ''}', '${setting.description || ''}')">
                            ✏️ Edit
                        </button>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Failed to load settings:', error);
            const tbody = document.getElementById('system-settings-table');
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: red;">Failed to load settings</td></tr>';
        }
    },

    async refreshPayments() {
        try {
            const tbody = document.getElementById('payment-configs-table');
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

            const data = await API.system.getPayments();

            if (data.payment_configs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No payment configs found</td></tr>';
                return;
            }

            tbody.innerHTML = data.payment_configs.map(config => `
                <tr>
                    <td><code>${config.plan_id}</code></td>
                    <td>${config.plan_name}</td>
                    <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
                        ${config.checkout_url || '-'}
                    </td>
                    <td>
                        <span class="${config.is_active ? 'status-active' : 'status-inactive'}">
                            ${config.is_active ? '✅ Active' : '❌ Inactive'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="SystemActions.showEditCheckoutURLModal(${config.id}, '${config.plan_name}', '${config.checkout_url || ''}')">
                            ✏️ Edit URL
                        </button>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Failed to load payment configs:', error);
            const tbody = document.getElementById('payment-configs-table');
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: red;">Failed to load payment configs</td></tr>';
        }
    },

    showEditSettingModal(key, value, description) {
        this.currentSettingKey = key;
        document.getElementById('edit-setting-key').textContent = key;
        document.getElementById('edit-setting-description').textContent = description;
        document.getElementById('edit-setting-value').value = value;

        // Show help text voor YouTube URL
        const helpDiv = document.getElementById('setting-value-help');
        if (key === 'onboarding_video_url') {
            helpDiv.textContent = 'Must be a valid YouTube or Vimeo URL (https://youtube.com/watch?v=... or https://vimeo.com/...)';
        } else {
            helpDiv.textContent = '';
        }

        document.getElementById('edit-setting-modal').style.display = 'flex';
    },

    async updateSetting() {
        try {
            const key = this.currentSettingKey;
            const value = document.getElementById('edit-setting-value').value.trim();

            if (!value) {
                alert('❌ Value cannot be empty');
                return;
            }

            const result = await API.system.updateSetting(key, value);

            alert(`✅ Setting updated: ${key}\n\nOld value: ${result.old_value}\nNew value: ${result.new_value}`);

            this.closeModal('edit-setting-modal');
            this.refreshSettings();

        } catch (error) {
            alert(`❌ Failed to update setting: ${error.message}`);
        }
    },

    showEditCheckoutURLModal(configId, planName, currentURL) {
        this.currentPaymentConfigId = configId;
        document.getElementById('edit-plan-name').textContent = planName;
        document.getElementById('edit-checkout-url').value = currentURL;
        document.getElementById('edit-checkout-url-modal').style.display = 'flex';
    },

    async updateCheckoutURL() {
        try {
            const configId = this.currentPaymentConfigId;
            const newURL = document.getElementById('edit-checkout-url').value.trim();

            if (!newURL) {
                alert('❌ URL cannot be empty');
                return;
            }

            // Basic URL validation
            if (!newURL.startsWith('https://')) {
                alert('❌ URL must start with https://');
                return;
            }

            const result = await API.system.updateCheckoutURL(configId, newURL);

            alert(`✅ Checkout URL updated for ${result.plan_name}\n\nOld URL: ${result.old_url}\nNew URL: ${result.new_url}`);

            this.closeModal('edit-checkout-url-modal');
            this.refreshPayments();

        } catch (error) {
            alert(`❌ Failed to update checkout URL: ${error.message}`);
        }
    },

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
};

// ============================================================================
// Screen Implementations
// ============================================================================

const Screens = {
    /**
     * Home Dashboard Screen
     */
    async loadHome() {
        try {
            ScreenManager.showLoading('home-content');

            // Parallel API calls voor performance
            const [homeData, growthData] = await Promise.all([
                API.stats.home(),
                API.stats.growth()
            ]);

            // Render complete dashboard
            const container = document.getElementById('home-content');
            container.innerHTML = `
                <h2>User Statistics</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Total Users</div>
                        <div class="stat-value">${Helpers.formatNumber(homeData.users.total)}</div>
                        <div class="stat-subtext">All time</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Active (7d)</div>
                        <div class="stat-value">${Helpers.formatNumber(homeData.users.active_7d)}</div>
                        <div class="stat-subtext">${Helpers.formatPercentage((homeData.users.active_7d / homeData.users.total) * 100)} of total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Active (30d)</div>
                        <div class="stat-value">${Helpers.formatNumber(homeData.users.active_30d)}</div>
                        <div class="stat-subtext">${Helpers.formatPercentage((homeData.users.active_30d / homeData.users.total) * 100)} of total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">New Today</div>
                        <div class="stat-value">${Helpers.formatNumber(homeData.users.new_today)}</div>
                        <div class="stat-subtext">Last 24 hours</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">New This Week</div>
                        <div class="stat-value">${Helpers.formatNumber(homeData.users.new_week)}</div>
                        <div class="stat-subtext">Last 7 days</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">New This Month</div>
                        <div class="stat-value">${Helpers.formatNumber(homeData.users.new_month)}</div>
                        <div class="stat-subtext">Last 30 days</div>
                    </div>
                </div>

                <h2>User Growth Trend</h2>
                <div class="chart-container">
                    <canvas id="growth-chart"></canvas>
                </div>

                <h2>Subscription Distribution</h2>
                <div class="stats-grid" style="margin-bottom: 30px;">
                    <div class="stat-card">
                        <div class="stat-label">Free</div>
                        <div class="stat-value">${Helpers.formatNumber(homeData.subscriptions.free)}</div>
                        <div class="stat-subtext">${Helpers.formatPercentage((homeData.subscriptions.free / homeData.users.total) * 100)} of total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Standard</div>
                        <div class="stat-value">${Helpers.formatNumber(homeData.subscriptions.standard)}</div>
                        <div class="stat-subtext">${Helpers.formatPercentage((homeData.subscriptions.standard / homeData.users.total) * 100)} of total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">No Limit</div>
                        <div class="stat-value">${Helpers.formatNumber(homeData.subscriptions.no_limit)}</div>
                        <div class="stat-subtext">${Helpers.formatPercentage((homeData.subscriptions.no_limit / homeData.users.total) * 100)} of total</div>
                    </div>
                </div>

                <h2>Trial Statistics</h2>
                <div class="stats-grid" style="margin-bottom: 30px;">
                    <div class="stat-card">
                        <div class="stat-label">Active Trials</div>
                        <div class="stat-value">${Helpers.formatNumber(homeData.trials.active)}</div>
                        <div class="stat-subtext">Currently in trial period</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Trial Conversion Rate</div>
                        <div class="stat-value">${Helpers.formatPercentage(homeData.trials.conversion_rate)}</div>
                        <div class="stat-subtext">Trials → Paid</div>
                    </div>
                </div>

                <h2>Recent Registrations</h2>
                ${this.renderRecentRegistrations(homeData.recent_registrations)}
            `;

            // Render growth chart met Chart.js
            this.renderGrowthChart(growthData);

        } catch (error) {
            ScreenManager.showError('home-content', 'Failed to load home dashboard', error);
        }
    },

    /**
     * Render recent registrations table
     */
    renderRecentRegistrations(registrations) {
        if (!registrations || registrations.length === 0) {
            return '<p>No recent registrations</p>';
        }

        return `
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Name</th>
                            <th>Tier</th>
                            <th>Registered</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${registrations.map(user => `
                            <tr>
                                <td>${user.email}</td>
                                <td>${user.naam || '-'}</td>
                                <td>
                                    <span class="badge ${Helpers.getTierBadgeClass(user.subscription_tier)}">
                                        ${Helpers.getTierDisplayName(user.subscription_tier)}
                                    </span>
                                </td>
                                <td title="${Helpers.formatDate(user.created_at)}">
                                    ${Helpers.formatRelativeTime(user.created_at)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Render user growth chart met Chart.js
     */
    renderGrowthChart(growthData) {
        const ctx = document.getElementById('growth-chart');
        if (!ctx) {
            console.warn('Growth chart canvas not found');
            return;
        }

        // Destroy bestaande chart instance indien aanwezig
        if (window.userGrowthChartInstance) {
            window.userGrowthChartInstance.destroy();
        }

        // Create nieuwe chart instance
        window.userGrowthChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: growthData.data.map(d => Helpers.formatDate(d.date)),
                datasets: [
                    {
                        label: 'Cumulative Users',
                        data: growthData.data.map(d => d.cumulative),
                        borderColor: '#007AFF',
                        backgroundColor: 'rgba(0, 122, 255, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2
                    },
                    {
                        label: 'New Users',
                        data: growthData.data.map(d => d.new_users),
                        borderColor: '#34C759',
                        backgroundColor: 'rgba(52, 199, 89, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#007AFF',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            precision: 0,
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    },

    /**
     * Task Analytics Screen
     */
    async loadTasks() {
        try {
            ScreenManager.showLoading('#tasks-content');

            const data = await API.stats.tasks();

            // Calculate percentages
            const completedPct = data.total_tasks > 0 ? (data.completed / data.total_tasks) * 100 : 0;
            const pendingPct = data.total_tasks > 0 ? (data.pending / data.total_tasks) * 100 : 0;

            // Render complete HTML (pattern from loadEmails)
            const container = document.getElementById('tasks-content');
            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">📊 Total Tasks</div>
                        <div class="stat-value">${Helpers.formatNumber(data.total_tasks)}</div>
                        <div class="stat-subtext">All time</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">✅ Completed</div>
                        <div class="stat-value">${Helpers.formatNumber(data.completed)}</div>
                        <div class="stat-subtext">${Helpers.formatPercentage(completedPct)} of total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">⏳ Pending</div>
                        <div class="stat-value">${Helpers.formatNumber(data.pending)}</div>
                        <div class="stat-subtext">${Helpers.formatPercentage(pendingPct)} of total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">🎯 Completion Rate</div>
                        <div class="stat-value">${Helpers.formatPercentage(data.completion_rate)}</div>
                        <div class="stat-subtext">Tasks completed</div>
                    </div>
                </div>

                <h3 style="margin-top: 32px; margin-bottom: 16px; color: var(--macos-text-primary);">Task Creation Trends</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">📅 Today</div>
                        <div class="stat-value">${Helpers.formatNumber(data.created_today)}</div>
                        <div class="stat-subtext">Tasks created today</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">📅 This Week</div>
                        <div class="stat-value">${Helpers.formatNumber(data.created_week)}</div>
                        <div class="stat-subtext">Last 7 days</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">📅 This Month</div>
                        <div class="stat-value">${Helpers.formatNumber(data.created_month)}</div>
                        <div class="stat-subtext">Last 30 days</div>
                    </div>
                </div>
            `;

        } catch (error) {
            ScreenManager.showError('#tasks-content', 'Failed to load task analytics', error);
        }
    },

    /**
     * Email Analytics Screen
     */
    async loadEmails() {
        try {
            ScreenManager.showLoading('emails-content');

            const data = await API.stats.emails();

            const container = document.getElementById('emails-content');
            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">📧 Total Imports</div>
                        <div class="stat-value">${Helpers.formatNumber(data.total_imports)}</div>
                        <div class="stat-subtext">All email imports</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">🆕 Recent Imports (30d)</div>
                        <div class="stat-value">${Helpers.formatNumber(data.imported?.month || 0)}</div>
                        <div class="stat-subtext">Last 30 days</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">👥 Users with Imports</div>
                        <div class="stat-value">${Helpers.formatNumber(data.users_with_import?.count || 0)}</div>
                        <div class="stat-subtext">${Helpers.formatNumber(data.total_imports)} total imports</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">📊 Adoption Rate</div>
                        <div class="stat-value">${Helpers.formatPercentage(data.users_with_import?.percentage || 0)}</div>
                        <div class="stat-subtext">Users using email import</div>
                    </div>
                </div>
            `;

        } catch (error) {
            ScreenManager.showError('emails-content', 'Failed to load email analytics', error);
        }
    },

    /**
     * Database Monitor Screen
     */
    async loadDatabase() {
        try {
            ScreenManager.showLoading('database-content');

            const data = await API.stats.database();

            // Render complete HTML (pattern from loadEmails)
            const container = document.getElementById('database-content');

            // Build tables list HTML
            let tablesHTML = '';
            if (data.tables && data.tables.length > 0) {
                tablesHTML = data.tables.map(table => `
                    <tr>
                        <td><strong>${table.name}</strong></td>
                        <td>${Helpers.formatNumber(table.row_count || 0)}</td>
                        <td>${table.size}</td>
                    </tr>
                `).join('');
            } else {
                tablesHTML = '<tr><td colspan="3" style="text-align:center;">No table data available</td></tr>';
            }

            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">💾 Database Size</div>
                        <div class="stat-value">${data.database_size_formatted}</div>
                        <div class="stat-subtext">Total storage used</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">📊 Tables</div>
                        <div class="stat-value">${data.table_count}</div>
                        <div class="stat-subtext">Database tables</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">🔢 Total Rows</div>
                        <div class="stat-value">${Helpers.formatNumber(data.total_rows || 0)}</div>
                        <div class="stat-subtext">Across all tables</div>
                    </div>
                </div>

                <h3 style="margin-top: 32px; margin-bottom: 16px; color: var(--macos-text-primary);">Tables by Size</h3>
                <div style="background: var(--macos-bg-secondary); border-radius: var(--macos-radius-medium); overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: var(--macos-bg-tertiary);">
                            <tr>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid var(--macos-gray-4);">Table Name</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid var(--macos-gray-4);">Rows</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid var(--macos-gray-4);">Size</th>
                            </tr>
                        </thead>
                        <tbody id="db-tables-list">
                            ${tablesHTML}
                        </tbody>
                    </table>
                </div>
            `;

        } catch (error) {
            ScreenManager.showError('database-content', 'Failed to load database monitor', error);
        }
    },

    /**
     * Revenue Dashboard Screen
     */
    async loadRevenue() {
        try {
            ScreenManager.showLoading('revenue-content');

            const data = await API.stats.revenue();

            // Format als EUR currency
            const formatEUR = (amount) => `€${Helpers.formatNumber(amount)}`;

            // Calculate totals from by_tier array
            const totalSubscriptions = data.by_tier.reduce((sum, tier) => sum + tier.user_count, 0);

            // Find specific tier data - separate monthly and yearly
            const standardMonthly = data.by_tier.find(t => t.tier === 'monthly_7') || {revenue: 0, user_count: 0, price_monthly: 7};
            const standardYearly = data.by_tier.find(t => t.tier === 'yearly_70') || {revenue: 0, user_count: 0, price_monthly: 70};
            const noLimitMonthly = data.by_tier.find(t => t.tier === 'monthly_8') || {revenue: 0, user_count: 0, price_monthly: 8};
            const noLimitYearly = data.by_tier.find(t => t.tier === 'yearly_80') || {revenue: 0, user_count: 0, price_monthly: 80};

            // Calculate percentages
            const stdMonthlyPct = data.mrr > 0 ? (standardMonthly.revenue / data.mrr) * 100 : 0;
            const stdYearlyPct = data.mrr > 0 ? (standardYearly.revenue / data.mrr) * 100 : 0;
            const noLimitMonthlyPct = data.mrr > 0 ? (noLimitMonthly.revenue / data.mrr) * 100 : 0;
            const noLimitYearlyPct = data.mrr > 0 ? (noLimitYearly.revenue / data.mrr) * 100 : 0;

            // Render complete HTML (pattern from loadEmails)
            const container = document.getElementById('revenue-content');
            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">💰 MRR</div>
                        <div class="stat-value" id="revenue-mrr">${formatEUR(data.mrr)}</div>
                        <div class="stat-subtext">Monthly Recurring Revenue</div>
                        <div class="sparkline-container">
                            <canvas id="sparkline-mrr"></canvas>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">📅 ARR</div>
                        <div class="stat-value" id="revenue-arr">${formatEUR(data.arr)}</div>
                        <div class="stat-subtext">Annual Recurring Revenue</div>
                        <div class="sparkline-container">
                            <canvas id="sparkline-arr"></canvas>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">👥 Active Subscriptions</div>
                        <div class="stat-value" id="revenue-active">${Helpers.formatNumber(totalSubscriptions)}</div>
                        <div class="stat-subtext">Paying customers</div>
                        <div class="sparkline-container">
                            <canvas id="sparkline-active"></canvas>
                        </div>
                    </div>
                </div>
            `;

            // Store revenue stats globally for MRR detail modal
            window.currentRevenueStats = data;

            // Attach click handlers to revenue cards (must be done after innerHTML update)
            if (typeof window.attachRevenueClickHandlers === 'function') {
                window.attachRevenueClickHandlers();
            }

            // Render sparkline charts after DOM update
            await window.renderRevenueSparklines();

        } catch (error) {
            ScreenManager.showError('revenue-content', 'Failed to load revenue dashboard', error);
        }
    },

    /**
     * User Management Screen
     */
    async loadUsers() {
        const container = document.getElementById('users-content');
        container.innerHTML = `
            <!-- Search Box -->
            <div class="search-box">
                <input
                    type="text"
                    id="user-search-input"
                    placeholder="Search users by email, name, or ID..."
                    autocomplete="off"
                />
                <div class="search-help">Min 2 characters</div>
            </div>

            <!-- Search Results -->
            <div id="user-search-results" style="display: none;">
                <h3>Search Results (<span id="search-result-count">0</span>)</h3>
                <div class="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Naam</th>
                                <th>Tier</th>
                                <th>Status</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody id="user-search-table">
                            <!-- Dynamic rows -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- User Details Panel (T034) -->
            <div id="user-details-panel" style="display: none;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>User Details</h3>
                    <button class="btn btn-secondary" onclick="Screens.closeUserDetails()">
                        ← Back to Search
                    </button>
                </div>

                <!-- User Info Grid -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">📧 Email</div>
                        <div class="stat-value" id="detail-email" style="font-size: 16px;">--</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">👤 Naam</div>
                        <div class="stat-value" id="detail-naam" style="font-size: 16px;">--</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">🎯 Account Type</div>
                        <div class="stat-value" id="detail-account-type" style="font-size: 16px;">--</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">⭐ Subscription Tier</div>
                        <div class="stat-value" id="detail-tier" style="font-size: 16px;">--</div>
                    </div>
                </div>

                <!-- Task Summary -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">📋 Total Tasks</div>
                        <div class="stat-value" id="detail-tasks-total">--</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">✅ Completed</div>
                        <div class="stat-value" id="detail-tasks-completed">--</div>
                        <div class="stat-subtext" id="detail-tasks-rate">--</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">⏳ Pending</div>
                        <div class="stat-value" id="detail-tasks-pending">--</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">🔄 Recurring</div>
                        <div class="stat-value" id="detail-tasks-recurring">--</div>
                    </div>
                </div>

                <!-- Task Activity Chart (Feature 073) -->
                <div class="task-activity-section" style="margin: 30px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0;">📊 Task Activity</h3>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <select id="activity-period-selector" class="form-select" style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--macos-border);">
                                <option value="week" selected>This Week</option>
                                <option value="month">This Month</option>
                                <option value="quarter">This Quarter</option>
                                <option value="year">This Year</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                    </div>

                    <!-- Custom Date Range (hidden by default) -->
                    <div id="custom-date-range" style="display: none; margin-bottom: 15px; padding: 15px; background: var(--macos-background); border-radius: 8px; border: 1px solid var(--macos-border);">
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-size: 12px; color: var(--macos-text-secondary);">Start Date</label>
                                <input type="date" id="activity-start-date" class="form-input" style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--macos-border);">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-size: 12px; color: var(--macos-text-secondary);">End Date</label>
                                <input type="date" id="activity-end-date" class="form-input" style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--macos-border);">
                            </div>
                            <button id="apply-custom-dates" class="btn btn-primary" style="align-self: flex-end;">Apply</button>
                        </div>
                        <div id="date-range-error" style="display: none; color: #dc3545; font-size: 12px; margin-top: 10px;"></div>
                    </div>

                    <!-- Chart Container -->
                    <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid var(--macos-border);">
                        <div id="activity-chart-loading" style="text-align: center; padding: 40px; color: var(--macos-text-secondary);">
                            Loading chart...
                        </div>
                        <canvas id="task-activity-chart" style="display: none; max-height: 300px;"></canvas>
                    </div>

                    <!-- Activity Statistics -->
                    <div class="stats-grid" style="margin-top: 20px;">
                        <div class="stat-card">
                            <div class="stat-label">📈 Total Tasks</div>
                            <div class="stat-value" id="activity-stat-total">--</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">📊 Average/Day</div>
                            <div class="stat-value" id="activity-stat-average">--</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">🏆 Peak Day</div>
                            <div class="stat-value" id="activity-stat-peak">--</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">📉 Trend</div>
                            <div class="stat-value" id="activity-stat-trend">--</div>
                        </div>
                    </div>
                </div>

                <!-- Email Summary -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">📧 Total Email Imports</div>
                        <div class="stat-value" id="detail-emails-total">--</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">🆕 Recent (30d)</div>
                        <div class="stat-value" id="detail-emails-recent">--</div>
                    </div>
                </div>

                <!-- Subscription Details -->
                <div class="admin-table" style="margin-bottom: 30px;">
                    <h3>Subscription Details</h3>
                    <table>
                        <tr>
                            <th>Status</th>
                            <td id="detail-sub-status">--</td>
                        </tr>
                        <tr>
                            <th>Trial End Date</th>
                            <td id="detail-trial-end">--</td>
                        </tr>
                        <tr>
                            <th>Created At</th>
                            <td id="detail-created">--</td>
                        </tr>
                        <tr>
                            <th>Last Login</th>
                            <td id="detail-last-login">--</td>
                        </tr>
                    </table>
                </div>

                <!-- User Actions (T035) -->
                <div id="user-actions" style="margin-top: 30px;">
                    <h3>User Actions</h3>

                    <div class="action-buttons-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                        <!-- Change Tier -->
                        <button class="btn btn-primary" onclick="UserActions.showChangeTierModal()">
                            ⭐ Change Subscription Tier
                        </button>

                        <!-- Extend Trial -->
                        <button class="btn btn-primary" onclick="UserActions.showExtendTrialModal()">
                            🎯 Extend Trial Date
                        </button>

                        <!-- Reset Password (T036) -->
                        <button class="btn btn-primary" onclick="UserActions.showResetPasswordModal()">
                            🔑 Reset Password
                        </button>

                        <!-- Block/Unblock -->
                        <button class="btn btn-danger" id="block-user-btn" onclick="UserActions.toggleBlockUser()">
                            🔒 Block User
                        </button>

                        <!-- Force Logout -->
                        <button class="btn btn-primary" onclick="UserActions.forceLogout()">
                            🚪 Force Logout
                        </button>

                        <!-- Delete User (T036) -->
                        <button class="btn btn-danger" onclick="UserActions.showDeleteUserModal()">
                            🗑️ Delete User Account
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Setup search with debounce (500ms)
        let searchTimeout = null;
        const input = document.getElementById('user-search-input');
        const resultsDiv = document.getElementById('user-search-results');
        const resultsTable = document.getElementById('user-search-table');
        const resultCount = document.getElementById('search-result-count');

        input.addEventListener('input', async (e) => {
            const query = e.target.value.trim();

            // Clear previous timeout
            clearTimeout(searchTimeout);

            // Hide results if query too short
            if (query.length < 2) {
                resultsDiv.style.display = 'none';
                return;
            }

            // Debounce search (500ms)
            searchTimeout = setTimeout(async () => {
                try {
                    // Show loading state
                    resultsTable.innerHTML = '<tr><td colspan="5" style="text-align:center;">Searching...</td></tr>';
                    resultsDiv.style.display = 'block';

                    // Execute search
                    const data = await API.users.search(query);

                    // Update result count
                    resultCount.textContent = data.count;

                    // Empty state
                    if (data.results.length === 0) {
                        resultsTable.innerHTML = '<tr><td colspan="5" style="text-align:center;">No users found</td></tr>';
                        return;
                    }

                    // Render results
                    resultsTable.innerHTML = data.results.map(user => `
                        <tr class="user-search-row" data-user-id="${user.id}">
                            <td>${user.email}</td>
                            <td>${user.naam || '-'}</td>
                            <td><span class="badge ${Helpers.getTierBadgeClass(user.subscription_tier)}">
                                ${Helpers.getTierDisplayName(user.subscription_tier)}
                            </span></td>
                            <td><span class="${user.actief ? 'status-active' : 'status-inactive'}">
                                ${user.actief ? 'Active' : 'Blocked'}
                            </span></td>
                            <td>${Helpers.formatDate(user.created_at)}</td>
                        </tr>
                    `).join('');

                    // Add click handlers voor user details (T034)
                    document.querySelectorAll('.user-search-row').forEach(row => {
                        row.addEventListener('click', () => {
                            const userId = row.dataset.userId;
                            Screens.loadUserDetails(userId);
                        });
                    });

                } catch (error) {
                    console.error('Search failed:', error);
                    resultsTable.innerHTML = '<tr><td colspan="5" style="text-align:center; color: red;">Search failed</td></tr>';
                }
            }, 500); // 500ms debounce
        });
    },

    /**
     * Load User Details (T034)
     */
    async loadUserDetails(userId) {
        try {
            document.getElementById('user-search-results').style.display = 'none';
            document.getElementById('user-details-panel').style.display = 'block';
            document.getElementById('detail-email').textContent = 'Loading...';
            const data = await API.users.get(userId);
            document.getElementById('detail-email').textContent = data.user.email;
            document.getElementById('detail-naam').textContent = data.user.naam || '-';
            document.getElementById('detail-account-type').textContent = data.user.account_type === 'admin' ? '👑 Admin' : '👤 User';
            document.getElementById('detail-tier').innerHTML = `<span class="badge ${Helpers.getTierBadgeClass(data.user.subscription_tier)}">${Helpers.getTierDisplayName(data.user.subscription_tier)}</span>`;
            document.getElementById('detail-tasks-total').textContent = Helpers.formatNumber(data.tasks.summary.total);
            document.getElementById('detail-tasks-completed').textContent = Helpers.formatNumber(data.tasks.summary.completed);
            document.getElementById('detail-tasks-rate').textContent = `${Helpers.formatPercentage(data.tasks.summary.completion_rate)} completion`;
            document.getElementById('detail-tasks-pending').textContent = Helpers.formatNumber(data.tasks.summary.pending);
            document.getElementById('detail-tasks-recurring').textContent = Helpers.formatNumber(data.tasks.summary.recurring || 0);
            document.getElementById('detail-emails-total').textContent = Helpers.formatNumber(data.emails.summary.total);
            document.getElementById('detail-emails-recent').textContent = Helpers.formatNumber(data.emails.summary.recent_30d);
            document.getElementById('detail-sub-status').textContent = data.subscription.status || 'N/A';
            document.getElementById('detail-trial-end').textContent = data.user.trial_end_date ? Helpers.formatDate(data.user.trial_end_date) : 'N/A';
            document.getElementById('detail-created').textContent = Helpers.formatDate(data.user.created_at);
            document.getElementById('detail-last-login').textContent = data.user.last_login ? Helpers.formatRelativeTime(data.user.last_login) : 'Never';

            // Update block button text based on user status (T035)
            const blockBtn = document.getElementById('block-user-btn');
            if (blockBtn) {
                blockBtn.textContent = data.user.actief ? '🔒 Block User' : '✅ Unblock User';
            }

            window.currentUserId = userId;
            window.currentUserData = data;

            // Load task activity chart with default period (this week)
            const periodSelector = document.getElementById('activity-period-selector');
            if (periodSelector) periodSelector.value = 'week';
            const customDateRange = document.getElementById('custom-date-range');
            if (customDateRange) customDateRange.style.display = 'none';
            const { startDate, endDate } = calculatePeriodDates('week');
            loadTaskActivity(userId, startDate, endDate);

            // Initialize event handlers now that the HTML elements exist
            initTaskActivityHandlers();
        } catch (error) {
            console.error('Failed to load user details:', error);

            // Non-destructive error handling: toon error overlay ZONDER innerHTML te overschrijven
            // Dit voorkomt dat alle detail-* elements permanent verdwijnen na eerste error
            const panel = document.getElementById('user-details-panel');

            // Verwijder eventuele oude error overlay
            const existingError = panel.querySelector('.error-overlay');
            if (existingError) {
                existingError.remove();
            }

            // Maak error overlay die BOVENOP de HTML wordt getoond
            const errorOverlay = document.createElement('div');
            errorOverlay.className = 'error-overlay';
            errorOverlay.style.cssText = 'background: #FEE; border: 2px solid #C00; border-radius: 8px; padding: 20px; margin-bottom: 20px;';
            errorOverlay.innerHTML = `
                <div class="error-message">
                    <strong style="color: #C00;">❌ Failed to load user details</strong>
                    <p style="margin: 10px 0; color: #666;">${error.message}</p>
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.remove(); Screens.closeUserDetails()">
                        ← Back to Search
                    </button>
                </div>
            `;

            // Voeg error toe AAN HET BEGIN van het panel (boven alle detail elements)
            panel.insertBefore(errorOverlay, panel.firstChild);
        }
    },

    /**
     * Close User Details and return to search
     */
    closeUserDetails() {
        document.getElementById('user-details-panel').style.display = 'none';
        document.getElementById('user-search-results').style.display = 'block';
    },

    /**
     * System Settings Screen
     */
    async loadSystem() {
        SystemActions.refreshSettings();
        SystemActions.refreshPayments();
    },

    /**
     * Database Tools Screen
     */
    async loadDBTools() {
        const container = document.getElementById('dbtools-content');
        container.innerHTML = `
            <!-- SQL Query Execution -->
            <div class="admin-table">
                <h3>💻 SQL Query Execution</h3>
                <div style="background: #FFF3CD; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <strong>⚠️ Warning:</strong> Be careful with UPDATE/DELETE queries. DROP/TRUNCATE/ALTER are blocked for safety.
                </div>

                <label>SQL Query:</label>
                <textarea
                    id="sql-query-input"
                    rows="6"
                    style="width: 100%; padding: 10px; font-family: monospace; border: 1px solid var(--macos-border); border-radius: 8px;"
                    placeholder="SELECT * FROM users LIMIT 10;"
                ></textarea>

                <div style="margin: 15px 0;">
                    <label>
                        <input type="checkbox" id="sql-confirm-destructive" />
                        I confirm this is a destructive query (required for UPDATE/DELETE)
                    </label>
                </div>

                <button class="btn btn-primary" onclick="DbTools.executeSQLQuery()">
                    ▶️ Execute Query
                </button>

                <!-- Results -->
                <div id="sql-results" style="margin-top: 20px; display: none;">
                    <h4>Query Results</h4>
                    <div id="sql-results-content"></div>
                </div>
            </div>

            <!-- Database Backup -->
            <div class="admin-table" style="margin-top: 30px;">
                <h3>💾 Database Backup</h3>
                <p>Generate backup metadata and get backup instructions for Neon PostgreSQL.</p>

                <button class="btn btn-primary" onclick="DbTools.generateBackup()">
                    💾 Generate Backup Metadata
                </button>

                <div id="backup-results" style="margin-top: 20px; display: none;">
                    <!-- Backup metadata will be displayed here -->
                </div>
            </div>

            <!-- Orphaned Data Cleanup -->
            <div class="admin-table" style="margin-top: 30px;">
                <h3>🧹 Database Cleanup</h3>
                <p>Preview or clean up orphaned data (tasks, emails, sessions without valid users).</p>

                <div style="margin: 15px 0;">
                    <label>
                        <input type="radio" name="cleanup-mode" value="preview" checked />
                        Preview Mode (safe, no deletions)
                    </label>
                    <br />
                    <label>
                        <input type="radio" name="cleanup-mode" value="execute" />
                        Execute Mode (permanent deletions)
                    </label>
                </div>

                <button class="btn btn-primary" onclick="DbTools.runCleanup()">
                    🧹 Run Cleanup
                </button>

                <div id="cleanup-results" style="margin-top: 20px; display: none;">
                    <!-- Cleanup results will be displayed here -->
                </div>
            </div>
        `;
    },

    /**
     * Debug Tools Screen
     */
    async loadDebug() {
        console.log('Debug tools loaded');
    },

    /**
     * Security Screen
     */
    async loadSecurity() {
        SecurityTools.updateSecurityStats();
        SecurityTools.refreshAuditLog();
        SecurityTools.refreshSessions();
    },

    /**
     * Feedback & Support Screen
     */
    async loadFeedback() {
        try {
            // Fetch data in parallel
            const [statsData, feedbackData] = await Promise.all([
                API.feedback.getStats(),
                API.feedback.getAll()
            ]);

            // Render stats cards
            if (statsData && statsData.stats) {
                const stats = statsData.stats;
                document.getElementById('feedbackTotal').textContent = stats.totaal || 0;
                document.getElementById('feedbackNieuw').textContent = stats.nieuw || 0;
                document.getElementById('feedbackBugs').textContent = stats.bugs || 0;
                document.getElementById('feedbackFeatures').textContent = stats.features || 0;
            }

            // Render feedback table
            const container = document.getElementById('feedbackTable');
            const feedback = feedbackData && feedbackData.feedback || [];

            if (!feedback || feedback.length === 0) {
                container.innerHTML = '<div class="loading">Geen feedback beschikbaar</div>';
                return;
            }

            let html = '<table class="data-table"><thead><tr>';
            html += '<th>Type</th><th>Titel</th><th>Gebruiker</th><th>Datum</th><th>Status</th>';
            html += '</tr></thead><tbody>';

            feedback.forEach(item => {
                const typeLabel = item.type === 'bug' ? '🐛 Bug' : '💡 Feature';
                const statusLabel = this.getStatusLabel(item.status);
                const relativeTime = this.formatRelativeTime(item.aangemaakt);

                html += `<tr class="feedback-row" onclick="showFeedbackDetail('${item.id}')" data-feedback='${JSON.stringify(item).replace(/'/g, '&#39;')}' style="cursor: pointer;">`;
                html += `<td>${typeLabel}</td>`;
                html += `<td>${this.escapeHtml(item.titel)}</td>`;
                html += `<td>${this.escapeHtml(item.gebruiker_naam || 'Onbekend')}</td>`;
                html += `<td>${relativeTime}</td>`;
                html += `<td><span class="status-badge status-${item.status}">${statusLabel}</span></td>`;
                html += '</tr>';
            });

            html += '</tbody></table>';
            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading feedback:', error);
            document.getElementById('feedbackTable').innerHTML = '<div class="error">❌ Error loading feedback</div>';
        }
    },

    // Helper functions for feedback
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    getStatusLabel(status) {
        const labels = {
            'nieuw': '🆕 Nieuw',
            'bekeken': '👁️ Bekeken',
            'in_behandeling': '🔄 In behandeling',
            'opgelost': '✅ Opgelost'
        };
        return labels[status] || status;
    },

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 7) {
            return date.toLocaleDateString('nl-NL');
        } else if (days > 0) {
            return `${days}d geleden`;
        } else if (hours > 0) {
            return `${hours}u geleden`;
        } else if (minutes > 0) {
            return `${minutes}m geleden`;
        } else {
            return 'Zojuist';
        }
    }
};

// ============================================================================
// Security Tools (T041)
// ============================================================================

const SecurityTools = {
    /**
     * Refresh audit log table
     */
    async refreshAuditLog() {
        try {
            const tbody = document.getElementById('audit-log-table');
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

            // Query admin_audit_log via SQL query endpoint
            const result = await API.debug.sqlQuery(
                'SELECT created_at, admin_user_id, action, target_type, target_id, details FROM admin_audit_log ORDER BY created_at DESC LIMIT 50',
                false
            );

            if (!result.rows || result.rows.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No audit log entries found</td></tr>';
                return;
            }

            // Get admin emails for display
            const adminIds = [...new Set(result.rows.map(r => r.admin_user_id))];
            const adminEmails = {};

            for (const adminId of adminIds) {
                try {
                    const userData = await API.users.get(adminId);
                    adminEmails[adminId] = userData.user.email;
                } catch {
                    adminEmails[adminId] = `User ${adminId}`;
                }
            }

            tbody.innerHTML = result.rows.map(row => {
                const details = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
                const detailsText = details ? Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(', ') : '-';

                return `
                    <tr>
                        <td>${Helpers.formatDate(row.created_at)}</td>
                        <td>${adminEmails[row.admin_user_id] || row.admin_user_id}</td>
                        <td><code>${row.action}</code></td>
                        <td>${row.target_type || '-'} ${row.target_id ? `#${row.target_id}` : ''}</td>
                        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;" title="${detailsText}">
                            ${detailsText.substring(0, 50)}${detailsText.length > 50 ? '...' : ''}
                        </td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.warn('Audit log not available (table may not exist yet):', error);
            // Graceful fallback - show informative message instead of error
            document.getElementById('audit-log-table').innerHTML =
                '<tr><td colspan="5" style="text-align:center; color: var(--macos-text-secondary);">📝 Audit logging feature not yet activated</td></tr>';
        }
    },

    /**
     * Refresh active sessions table
     */
    async refreshSessions() {
        try {
            const tbody = document.getElementById('sessions-table');
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';

            // Query active sessions
            const result = await API.debug.sqlQuery(
                `SELECT sid, sess, expire FROM session
                 WHERE expire > NOW()
                 ORDER BY expire DESC
                 LIMIT 100`,
                false
            );

            if (!result.rows || result.rows.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No active sessions</td></tr>';
                return;
            }

            // Parse sessions and get user info
            const sessionData = [];
            for (const row of result.rows) {
                try {
                    const sess = typeof row.sess === 'string' ? JSON.parse(row.sess) : row.sess;
                    const userId = sess?.passport?.user;

                    if (userId) {
                        let userEmail = 'Unknown';
                        try {
                            const userData = await API.users.get(userId);
                            userEmail = userData.user.email;
                        } catch {
                            userEmail = `User ${userId}`;
                        }

                        sessionData.push({
                            sid: row.sid,
                            userEmail,
                            userId,
                            created: sess.cookie?.originalMaxAge ? new Date(Date.now() - sess.cookie.originalMaxAge) : null,
                            expires: row.expire
                        });
                    }
                } catch (e) {
                    console.error('Failed to parse session:', e);
                }
            }

            if (sessionData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No parseable sessions</td></tr>';
                return;
            }

            tbody.innerHTML = sessionData.map(session => `
                <tr>
                    <td>${session.userEmail}</td>
                    <td>${session.created ? Helpers.formatRelativeTime(session.created) : 'Unknown'}</td>
                    <td>${Helpers.formatRelativeTime(session.expires)}</td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="SecurityTools.terminateSession(${session.userId}, '${session.userEmail}')">
                            🚪 Logout
                        </button>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Failed to load sessions:', error);
            document.getElementById('sessions-table').innerHTML =
                '<tr><td colspan="4" style="text-align:center; color: red;">Failed to load sessions</td></tr>';
        }
    },

    /**
     * Terminate user session (force logout)
     */
    async terminateSession(userId, userEmail) {
        if (!confirm(`Force logout ${userEmail}?`)) {
            return;
        }

        try {
            const result = await API.users.forceLogout(userId);
            alert(`✅ ${result.sessions_invalidated} session(s) terminated for ${userEmail}`);
            this.refreshSessions();
            this.updateSecurityStats();
        } catch (error) {
            alert(`❌ Failed to terminate session: ${error.message}`);
        }
    },

    /**
     * Update security statistics
     */
    async updateSecurityStats() {
        try {
            // Active sessions count
            const sessionsResult = await API.debug.sqlQuery(
                'SELECT COUNT(*) as count FROM session WHERE expire > NOW()',
                false
            );
            document.getElementById('security-active-sessions').textContent =
                Helpers.formatNumber(sessionsResult.rows[0].count);

            // Blocked users count
            const blockedResult = await API.debug.sqlQuery(
                'SELECT COUNT(*) as count FROM users WHERE actief = false',
                false
            );
            document.getElementById('security-blocked-users').textContent =
                Helpers.formatNumber(blockedResult.rows[0].count);

            // Total users count
            const totalResult = await API.debug.sqlQuery(
                'SELECT COUNT(*) as count FROM users',
                false
            );
            document.getElementById('security-total-users').textContent =
                Helpers.formatNumber(totalResult.rows[0].count);

        } catch (error) {
            console.error('Failed to update security stats:', error);
        }
    }
};

// ============================================================================
// User Actions (T035)
// ============================================================================

const UserActions = {
    /**
     * Show Change Tier Modal
     */
    showChangeTierModal() {
        if (!window.currentUserData) {
            alert('No user selected');
            return;
        }

        document.getElementById('tier-user-email').textContent = window.currentUserData.user.email;
        document.getElementById('tier-select').value = window.currentUserData.user.subscription_tier;
        document.getElementById('change-tier-modal').style.display = 'flex';
    },

    /**
     * Change user's subscription tier
     */
    async changeTier() {
        try {
            const newTier = document.getElementById('tier-select').value;
            const userId = window.currentUserId;

            if (!confirm(`Change tier to ${newTier}?`)) {
                return;
            }

            const result = await API.users.changeTier(userId, newTier);

            alert(`✅ Tier changed to ${newTier}`);
            this.closeModal('change-tier-modal');

            // Refresh user details
            Screens.loadUserDetails(userId);

        } catch (error) {
            alert(`❌ Failed to change tier: ${error.message}`);
        }
    },

    /**
     * Show Extend Trial Modal
     */
    showExtendTrialModal() {
        if (!window.currentUserData) {
            alert('No user selected');
            return;
        }

        document.getElementById('trial-user-email').textContent = window.currentUserData.user.email;

        // Set min date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('trial-date-input').min = tomorrow.toISOString().split('T')[0];

        // Set current value to trial end date or tomorrow
        const currentTrialEnd = window.currentUserData.user.trial_end_date;
        if (currentTrialEnd) {
            document.getElementById('trial-date-input').value = currentTrialEnd;
        } else {
            document.getElementById('trial-date-input').value = tomorrow.toISOString().split('T')[0];
        }

        document.getElementById('extend-trial-modal').style.display = 'flex';
    },

    /**
     * Extend user's trial period
     */
    async extendTrial() {
        try {
            const trialDate = document.getElementById('trial-date-input').value;
            const userId = window.currentUserId;

            if (!trialDate) {
                alert('Please select a date');
                return;
            }

            if (!confirm(`Extend trial to ${trialDate}?`)) {
                return;
            }

            const result = await API.users.extendTrial(userId, trialDate);

            alert(`✅ Trial extended to ${trialDate}`);
            this.closeModal('extend-trial-modal');

            // Refresh user details
            Screens.loadUserDetails(userId);

        } catch (error) {
            alert(`❌ Failed to extend trial: ${error.message}`);
        }
    },

    /**
     * Toggle block/unblock user
     */
    async toggleBlockUser() {
        if (!window.currentUserData) {
            alert('No user selected');
            return;
        }

        const isBlocked = !window.currentUserData.user.actief;
        const action = isBlocked ? 'unblock' : 'block';

        if (!confirm(`Are you sure you want to ${action} this user?`)) {
            return;
        }

        try {
            const userId = window.currentUserId;
            const result = await API.users.blockUser(userId, !isBlocked);

            alert(`✅ User ${action}ed successfully. ${result.sessions_invalidated} sessions invalidated.`);

            // Update button text
            document.getElementById('block-user-btn').textContent =
                isBlocked ? '🔒 Block User' : '✅ Unblock User';

            // Refresh user details
            Screens.loadUserDetails(userId);

        } catch (error) {
            alert(`❌ Failed to ${action} user: ${error.message}`);
        }
    },

    /**
     * Force logout user (invalidate all sessions)
     */
    async forceLogout() {
        if (!window.currentUserData) {
            alert('No user selected');
            return;
        }

        if (!confirm('Force logout this user? All active sessions will be terminated.')) {
            return;
        }

        try {
            const userId = window.currentUserId;
            const result = await API.users.forceLogout(userId);

            alert(`✅ User logged out. ${result.sessions_invalidated} sessions terminated.`);

        } catch (error) {
            alert(`❌ Failed to force logout: ${error.message}`);
        }
    },

    /**
     * Show Delete User Modal (T036)
     */
    showDeleteUserModal() {
        if (!window.currentUserData) {
            alert('No user selected');
            return;
        }

        document.getElementById('delete-user-email').textContent = window.currentUserData.user.email;
        document.getElementById('delete-confirm-checkbox').checked = false;
        document.getElementById('delete-confirm-btn').disabled = true;

        // Enable delete button only when checkbox is checked
        const checkbox = document.getElementById('delete-confirm-checkbox');
        const deleteBtn = document.getElementById('delete-confirm-btn');

        // Remove existing event listener by replacing element
        const newCheckbox = checkbox.cloneNode(true);
        checkbox.parentNode.replaceChild(newCheckbox, checkbox);

        newCheckbox.addEventListener('change', (e) => {
            deleteBtn.disabled = !e.target.checked;
        });

        document.getElementById('delete-user-modal').style.display = 'flex';
    },

    /**
     * Delete user account (T036)
     */
    async deleteUser() {
        try {
            const userId = window.currentUserId;
            const email = window.currentUserData.user.email;

            // Final confirmation
            if (!confirm(`FINAL CONFIRMATION: Delete ${email}?`)) {
                return;
            }

            const result = await API.users.deleteUser(userId);

            alert(`✅ User deleted successfully\n\nCascade deleted:\n- ${result.cascade_deleted.tasks} tasks\n- ${result.cascade_deleted.email_imports} email imports\n- ${result.cascade_deleted.sessions} sessions`);

            this.closeModal('delete-user-modal');

            // Go back to search
            Screens.closeUserDetails();

        } catch (error) {
            alert(`❌ Failed to delete user: ${error.message}`);
        }
    },

    /**
     * Show Reset Password Modal (T036)
     */
    showResetPasswordModal() {
        if (!window.currentUserData) {
            alert('No user selected');
            return;
        }

        document.getElementById('reset-user-email').textContent = window.currentUserData.user.email;
        document.getElementById('new-password-display').style.display = 'none';
        document.getElementById('reset-password-btn').disabled = false;
        document.getElementById('reset-password-btn').style.display = '';
        document.getElementById('reset-password-btn').textContent = 'Generate New Password';
        document.getElementById('reset-password-modal').style.display = 'flex';
    },

    /**
     * Reset user password (T036)
     */
    async resetPassword() {
        try {
            const userId = window.currentUserId;

            document.getElementById('reset-password-btn').disabled = true;
            document.getElementById('reset-password-btn').textContent = 'Generating...';

            const result = await API.users.resetPassword(userId);

            // Display new password
            document.getElementById('new-password-value').textContent = result.new_password;
            document.getElementById('new-password-display').style.display = 'block';
            document.getElementById('reset-password-btn').style.display = 'none';

            alert(`✅ Password reset successful\n\nNew password: ${result.new_password}\n\nPlease provide this password to the user securely.`);

        } catch (error) {
            alert(`❌ Failed to reset password: ${error.message}`);
            document.getElementById('reset-password-btn').disabled = false;
            document.getElementById('reset-password-btn').textContent = 'Generate New Password';
        }
    },

    /**
     * Copy password to clipboard (T036)
     */
    copyPassword() {
        const password = document.getElementById('new-password-value').textContent;
        navigator.clipboard.writeText(password).then(() => {
            alert('✅ Password copied to clipboard');
        }).catch(() => {
            alert('❌ Failed to copy password. Please copy manually.');
        });
    },

    /**
     * Close modal by ID
     */
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
};

// ============================================================================
// Debug Tools (T040)
// ============================================================================

const DebugTools = {
    /**
     * Inspect user data for debugging
     */
    async inspectUser() {
        try {
            const userEmail = document.getElementById('debug-user-email').value.trim();

            if (!userEmail) {
                alert('❌ Please enter an email address');
                return;
            }

            // Basic email format validation
            if (!userEmail.includes('@') || !userEmail.includes('.')) {
                alert('❌ Please enter a valid email address');
                return;
            }

            const resultsDiv = document.getElementById('debug-user-results');
            resultsDiv.style.display = 'block';
            resultsDiv.innerHTML = '<p>Loading user data...</p>';

            const data = await API.debug.getUserData(userEmail);

            resultsDiv.innerHTML = `
                <h4>👤 User Information</h4>
                <table>
                    <tr><th>ID</th><td>${data.user.id}</td></tr>
                    <tr><th>Email</th><td>${data.user.email}</td></tr>
                    <tr><th>Naam</th><td>${data.user.naam || '-'}</td></tr>
                    <tr><th>Account Type</th><td>${data.user.account_type}</td></tr>
                    <tr><th>Subscription Tier</th><td>${data.user.subscription_tier}</td></tr>
                    <tr><th>Status</th><td><span class="${data.user.actief ? 'status-active' : 'status-inactive'}">${data.user.actief ? 'Active' : 'Blocked'}</span></td></tr>
                    <tr><th>Created At</th><td>${Helpers.formatDate(data.user.created_at)}</td></tr>
                    <tr><th>Last Login</th><td>${data.user.last_login ? Helpers.formatRelativeTime(data.user.last_login) : 'Never'}</td></tr>
                </table>

                <h4 style="margin-top: 30px;">📋 Task Summary</h4>
                <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
                    <div class="stat-card">
                        <div class="stat-label">Total</div>
                        <div class="stat-value">${Helpers.formatNumber(data.tasks.summary.total)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Completed</div>
                        <div class="stat-value">${Helpers.formatNumber(data.tasks.summary.completed)}</div>
                        <div class="stat-subtext">${Helpers.formatPercentage(data.tasks.summary.completion_rate)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Pending</div>
                        <div class="stat-value">${Helpers.formatNumber(data.tasks.summary.pending)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Recurring</div>
                        <div class="stat-value">${Helpers.formatNumber(data.tasks.summary.recurring || 0)}</div>
                    </div>
                </div>

                <h4 style="margin-top: 30px;">📊 Tasks by Project</h4>
                <table>
                    <thead><tr><th>Project</th><th>Count</th></tr></thead>
                    <tbody>
                        ${data.tasks.by_project.map(p => `
                            <tr><td>${p.project || '(No project)'}</td><td>${p.count}</td></tr>
                        `).join('') || '<tr><td colspan="2">No projects</td></tr>'}
                    </tbody>
                </table>

                <h4 style="margin-top: 30px;">🏷️ Tasks by Context</h4>
                <table>
                    <thead><tr><th>Context</th><th>Count</th></tr></thead>
                    <tbody>
                        ${data.tasks.by_context.map(c => `
                            <tr><td>${c.context || '(No context)'}</td><td>${c.count}</td></tr>
                        `).join('') || '<tr><td colspan="2">No contexts</td></tr>'}
                    </tbody>
                </table>

                <h4 style="margin-top: 30px;">📧 Email Import Summary</h4>
                <table>
                    <tr><th>Total Imports</th><td>${Helpers.formatNumber(data.emails.summary.total)}</td></tr>
                    <tr><th>Recent (30d)</th><td>${Helpers.formatNumber(data.emails.summary.recent_30d)}</td></tr>
                    <tr><th>Oldest Import</th><td>${data.emails.summary.oldest_import ? Helpers.formatDate(data.emails.summary.oldest_import) : 'N/A'}</td></tr>
                    <tr><th>Newest Import</th><td>${data.emails.summary.newest_import ? Helpers.formatDate(data.emails.summary.newest_import) : 'N/A'}</td></tr>
                </table>

                <h4 style="margin-top: 30px;">💳 Subscription Details</h4>
                <table>
                    <tr><th>Status</th><td>${data.subscription.status || 'N/A'}</td></tr>
                    <tr><th>Trial End Date</th><td>${data.user.trial_end_date ? Helpers.formatDate(data.user.trial_end_date) : 'N/A'}</td></tr>
                    <tr><th>Subscription Tier</th><td>${data.subscription.tier || data.user.subscription_tier}</td></tr>
                </table>

                <h4 style="margin-top: 30px;">🔐 Session Information</h4>
                <table>
                    <tr><th>Active Sessions</th><td>${data.sessions.active_count}</td></tr>
                    <tr><th>Last Activity</th><td>${data.sessions.last_activity ? Helpers.formatDate(data.sessions.last_activity) : 'N/A'}</td></tr>
                </table>

                <h4 style="margin-top: 30px;">📅 Planning & Recurring</h4>
                <table>
                    <tr><th>Planning Entries</th><td>${Helpers.formatNumber(data.planning.total_entries)}</td></tr>
                    <tr><th>Active Recurring Tasks</th><td>${Helpers.formatNumber(data.recurring.total_active)}</td></tr>
                </table>

                <h4 style="margin-top: 30px;">🔧 Raw JSON Data</h4>
                <details>
                    <summary style="cursor: pointer; padding: 10px; background: var(--macos-bg-tertiary); border-radius: 8px;">
                        Click to view raw JSON
                    </summary>
                    <pre style="background: var(--macos-bg-tertiary); padding: 15px; border-radius: 8px; overflow-x: auto; margin-top: 10px;">
${JSON.stringify(data, null, 2)}
                    </pre>
                </details>
            `;

        } catch (error) {
            const resultsDiv = document.getElementById('debug-user-results');
            resultsDiv.innerHTML = `<p style="color: red;"><strong>❌ Error:</strong> ${error.message}</p>`;
        }
    }
};

// ============================================================================
// Database Tools
// ============================================================================

const DbTools = {
    /**
     * Execute SQL query via API
     */
    async executeSQLQuery() {
        try {
            const query = document.getElementById('sql-query-input').value.trim();
            const confirmDestructive = document.getElementById('sql-confirm-destructive').checked;

            if (!query) {
                alert('❌ Please enter a SQL query');
                return;
            }

            // Show loading
            const resultsDiv = document.getElementById('sql-results');
            const resultsContent = document.getElementById('sql-results-content');
            resultsDiv.style.display = 'block';
            resultsContent.innerHTML = '<p>Executing query...</p>';

            const result = await API.debug.sqlQuery(query, confirmDestructive);

            // Display results
            if (result.rows && result.rows.length > 0) {
                const table = this.renderTable(result.rows);
                resultsContent.innerHTML = `
                    <p><strong>✅ Success</strong> - ${result.row_count} rows returned in ${result.execution_time_ms}ms</p>
                    ${result.warnings ? `<p style="color: orange;">⚠️ ${result.warnings.join(', ')}</p>` : ''}
                    ${table}
                `;
            } else {
                resultsContent.innerHTML = `
                    <p><strong>✅ Success</strong> - Query executed in ${result.execution_time_ms}ms</p>
                    <p>${result.row_count} rows affected</p>
                `;
            }

        } catch (error) {
            const resultsContent = document.getElementById('sql-results-content');
            resultsContent.innerHTML = `<p style="color: red;"><strong>❌ Error:</strong> ${error.message}</p>`;
        }
    },

    /**
     * Generate database backup metadata
     */
    async generateBackup() {
        try {
            const resultsDiv = document.getElementById('backup-results');
            resultsDiv.style.display = 'block';
            resultsDiv.innerHTML = '<p>Generating backup metadata...</p>';

            const result = await API.debug.databaseBackup();

            // Display backup info
            resultsDiv.innerHTML = `
                <h4>Backup Information</h4>
                <table>
                    <tr><th>Database Size</th><td>${result.backup_info.database_size_mb} MB</td></tr>
                    <tr><th>Table Count</th><td>${result.backup_info.table_count}</td></tr>
                    <tr><th>Total Rows</th><td>${Helpers.formatNumber(result.backup_info.total_rows)}</td></tr>
                    <tr><th>Backup Timestamp</th><td>${Helpers.formatDate(result.backup_info.backup_timestamp)}</td></tr>
                </table>

                <h4 style="margin-top: 20px;">Tables</h4>
                <table>
                    <thead><tr><th>Table Name</th><th>Rows</th></tr></thead>
                    <tbody>
                        ${result.backup_info.tables.map(t => `
                            <tr><td>${t.name}</td><td>${Helpers.formatNumber(t.rows)}</td></tr>
                        `).join('')}
                    </tbody>
                </table>

                <h4 style="margin-top: 20px;">Backup Instructions</h4>
                <ul>
                    <li><strong>Automatic Backups:</strong> ${result.instructions.automatic_backups}</li>
                    <li><strong>Manual Backup:</strong> ${result.instructions.manual_backup_via_branch}</li>
                    <li><strong>SQL Export:</strong> <code>${result.instructions.sql_export}</code></li>
                </ul>

                <a href="${result.neon_dashboard_url}" target="_blank" class="btn btn-primary" style="margin-top: 15px;">
                    Open Neon Dashboard →
                </a>
            `;

        } catch (error) {
            document.getElementById('backup-results').innerHTML =
                `<p style="color: red;"><strong>❌ Error:</strong> ${error.message}</p>`;
        }
    },

    /**
     * Run orphaned data cleanup
     */
    async runCleanup() {
        try {
            const mode = document.querySelector('input[name="cleanup-mode"]:checked').value;
            const preview = mode === 'preview';

            if (!preview && !confirm('⚠️ Are you sure? This will permanently delete orphaned data.')) {
                return;
            }

            const resultsDiv = document.getElementById('cleanup-results');
            resultsDiv.style.display = 'block';
            resultsDiv.innerHTML = `<p>${preview ? 'Previewing' : 'Executing'} cleanup...</p>`;

            const result = await API.debug.cleanupData(preview);

            // Display cleanup results
            const totalDeleted = result.total_records_deleted || result.cleanup_results.reduce((sum, r) => sum + r.found, 0);

            resultsDiv.innerHTML = `
                <h4>${preview ? '👁️ Preview Results' : '✅ Cleanup Complete'}</h4>
                <p><strong>Total records ${preview ? 'found' : 'deleted'}:</strong> ${totalDeleted}</p>

                <table>
                    <thead>
                        <tr>
                            <th>Target</th>
                            <th>Description</th>
                            <th>Found</th>
                            <th>${preview ? 'Would Delete' : 'Deleted'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.cleanup_results.map(r => `
                            <tr>
                                <td><code>${r.target}</code></td>
                                <td>${r.description}</td>
                                <td>${r.found}</td>
                                <td>${r.deleted || r.found}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                ${preview ? '<p style="color: orange;">⚠️ This was a preview. Switch to Execute Mode to perform deletions.</p>' : ''}
            `;

        } catch (error) {
            document.getElementById('cleanup-results').innerHTML =
                `<p style="color: red;"><strong>❌ Error:</strong> ${error.message}</p>`;
        }
    },

    /**
     * Render table from query results
     */
    renderTable(rows) {
        if (!rows || rows.length === 0) return '<p>No data</p>';

        const columns = Object.keys(rows[0]);

        return `
            <table>
                <thead>
                    <tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>${columns.map(col => `<td>${row[col]}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
};

// ============================================================================
// Keyboard Shortcuts (T042)
// ============================================================================

document.addEventListener('keydown', (e) => {
    // Alt+1 through Alt+9 for screen shortcuts
    if (e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const screens = ['home', 'tasks', 'emails', 'database', 'revenue', 'users', 'system', 'dbtools', 'debug'];
        const index = parseInt(e.key) - 1;
        if (screens[index]) {
            window.location.hash = screens[index];
        }
    }

    // Escape to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal[style*="display: flex"]').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});

// ============================================================================
// Feedback Modal Functions (Global - called from onclick in HTML)
// ============================================================================

let currentFeedbackId = null;

function showFeedbackDetail(feedbackId) {
    const row = document.querySelector(`[onclick="showFeedbackDetail('${feedbackId}')"]`);
    if (!row) return;

    const feedback = JSON.parse(row.getAttribute('data-feedback'));
    currentFeedbackId = feedbackId;

    // Set modal content
    document.getElementById('feedbackModalTitle').textContent =
        `${feedback.type === 'bug' ? '🐛 Bug Report' : '💡 Feature Request'}`;

    document.getElementById('feedbackType').textContent =
        feedback.type === 'bug' ? '🐛 Bug' : '💡 Feature';

    document.getElementById('feedbackUser').textContent =
        `${feedback.gebruiker_naam || 'Onbekend'} (${feedback.gebruiker_email || '-'})`;

    document.getElementById('feedbackDate').textContent =
        new Date(feedback.aangemaakt).toLocaleString('nl-NL');

    document.getElementById('feedbackStatus').value = feedback.status;

    document.getElementById('feedbackTitel').textContent = feedback.titel;
    document.getElementById('feedbackBeschrijving').textContent = feedback.beschrijving;

    // Show/hide steps if available
    const stappenRow = document.getElementById('feedbackStappenRow');
    if (feedback.stappen) {
        document.getElementById('feedbackStappen').textContent = feedback.stappen;
        stappenRow.style.display = 'flex';
    } else {
        stappenRow.style.display = 'none';
    }

    // Format context
    if (feedback.context) {
        const contextDiv = document.getElementById('feedbackContext');
        let contextHtml = '';
        if (feedback.context.browser) contextHtml += `<div><strong>Browser:</strong> ${feedback.context.browser}</div>`;
        if (feedback.context.scherm) contextHtml += `<div><strong>Scherm:</strong> ${feedback.context.scherm}</div>`;
        if (feedback.context.huidigePagina) contextHtml += `<div><strong>Pagina:</strong> ${feedback.context.huidigePagina}</div>`;
        contextDiv.innerHTML = contextHtml || '<div>Geen context beschikbaar</div>';
    } else {
        document.getElementById('feedbackContext').innerHTML = '<div>Geen context beschikbaar</div>';
    }

    // Show modal
    document.getElementById('feedbackModal').style.display = 'flex';
}

function closeFeedbackModal() {
    document.getElementById('feedbackModal').style.display = 'none';
    currentFeedbackId = null;
}

async function updateFeedbackStatus() {
    if (!currentFeedbackId) return;

    const newStatus = document.getElementById('feedbackStatus').value;

    try {
        const response = await API.feedback.updateStatus(currentFeedbackId, newStatus);

        if (!response || response.error) {
            throw new Error(response?.error || 'Failed to update status');
        }

        // Reload feedback screen to show updated data
        await Screens.loadFeedback();

        // Update the modal row data if still open
        if (document.getElementById('feedbackModal').style.display === 'block') {
            showFeedbackDetail(currentFeedbackId);
        }

        // Show success notification
        console.log('✅ Feedback status updated successfully');

    } catch (error) {
        console.error('Error updating feedback status:', error);
        alert('❌ Fout bij updaten status: ' + error.message);
    }
}

function emailFeedbackUser() {
    if (!currentFeedbackId) return;

    // Get feedback data from the table row
    const row = document.querySelector(`[onclick="showFeedbackDetail('${currentFeedbackId}')"]`);
    if (!row) return;

    const feedback = JSON.parse(row.getAttribute('data-feedback'));

    // Check if email is available
    if (!feedback.gebruiker_email) {
        alert('❌ Geen emailadres beschikbaar voor deze gebruiker');
        return;
    }

    // Build email subject
    const typeLabel = feedback.type === 'bug' ? 'Bug Report' : 'Feature Request';
    const subject = `Re: ${typeLabel} - ${feedback.titel}`;

    // Build email body
    let body = `Hallo ${feedback.gebruiker_naam || 'gebruiker'},\n\n`;
    body += `--- SCHRIJF JE BERICHT HIER BOVEN DEZE LIJN ---\n\n`;
    body += `------------------------\n`;
    body += `Referentie:\n`;
    body += `Type: ${typeLabel}\n`;
    body += `Titel: ${feedback.titel}\n`;
    body += `Datum: ${new Date(feedback.aangemaakt).toLocaleString('nl-NL')}\n\n`;
    body += `Oorspronkelijke beschrijving:\n${feedback.beschrijving}\n`;

    if (feedback.stappen) {
        body += `\nStappen om te reproduceren:\n${feedback.stappen}\n`;
    }

    body += `------------------------\n\n`;
    body += `Met vriendelijke groet,\n`;
    body += `Jan Buskens\n`;
    body += `Tickedify Support`;

    // URL encode the subject and body
    const mailtoLink = `mailto:${encodeURIComponent(feedback.gebruiker_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Open mailto link
    window.location.href = mailtoLink;
}

// ============================================================================
// Revenue Chart Functions
// ============================================================================

// Render revenue sparkline charts (30 days)
window.renderRevenueSparklines = async function() {
    try {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded - sparklines cannot render');
            return;
        }

        const response = await fetch('/api/admin2/revenue/history?days=30&interval=daily');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const historyData = await response.json();
        const data = historyData.data || [];

        // Extract labels and datasets
        const labels = data.map(d => d.date);
        const mrrData = data.map(d => d.mrr);
        const arrData = data.map(d => d.arr);
        const activeData = data.map(d => d.active_subscriptions);

        // Common sparkline config
        const sparklineConfig = {
            type: 'line',
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: {
                        display: false,
                        beginAtZero: false
                    }
                },
                elements: {
                    point: { radius: 0 },
                    line: {
                        borderWidth: 2,
                        tension: 0.4
                    }
                }
            }
        };

        // MRR Sparkline
        const mrrCtx = document.getElementById('sparkline-mrr');
        if (mrrCtx) {
            new Chart(mrrCtx, {
                ...sparklineConfig,
                data: {
                    labels,
                    datasets: [{
                        data: mrrData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true
                    }]
                }
            });
        }

        // ARR Sparkline
        const arrCtx = document.getElementById('sparkline-arr');
        if (arrCtx) {
            new Chart(arrCtx, {
                ...sparklineConfig,
                data: {
                    labels,
                    datasets: [{
                        data: arrData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true
                    }]
                }
            });
        }

        // Active Subscriptions Sparkline
        const activeCtx = document.getElementById('sparkline-active');
        if (activeCtx) {
            new Chart(activeCtx, {
                ...sparklineConfig,
                data: {
                    labels,
                    datasets: [{
                        data: activeData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        fill: true
                    }]
                }
            });
        }

    } catch (error) {
        console.error('Failed to render sparklines:', error);
        // Show placeholder in sparkline containers
        ['sparkline-mrr', 'sparkline-arr', 'sparkline-active'].forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas && canvas.parentElement) {
                canvas.parentElement.innerHTML = '<div style="color: #9ca3af; font-size: 11px; text-align: center; padding-top: 12px;">Chart unavailable</div>';
            }
        });
    }
};

// Render year chart for detail modals (52 weeks)
window.renderYearChart = async function(metric) {
    try {
        const response = await fetch('/api/admin2/revenue/history?days=365&interval=weekly');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const historyData = await response.json();
        const data = historyData.data || [];

        // Extract labels and dataset based on metric
        const labels = data.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        let chartData, borderColor, backgroundColor, label;
        if (metric === 'mrr') {
            chartData = data.map(d => d.mrr);
            borderColor = '#3b82f6';
            backgroundColor = 'rgba(59, 130, 246, 0.1)';
            label = 'MRR (€)';
        } else if (metric === 'arr') {
            chartData = data.map(d => d.arr);
            borderColor = '#10b981';
            backgroundColor = 'rgba(16, 185, 129, 0.1)';
            label = 'ARR (€)';
        } else {
            chartData = data.map(d => d.active_subscriptions);
            borderColor = '#f59e0b';
            backgroundColor = 'rgba(245, 158, 11, 0.1)';
            label = 'Active Subscriptions';
        }

        const canvasId = `year-chart-${metric}`;
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label,
                    data: chartData,
                    borderColor,
                    backgroundColor,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: '#e5e7eb' },
                        ticks: {
                            callback: function(value) {
                                return metric === 'active' ? value : '€' + value;
                            }
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error(`Failed to render ${metric} year chart:`, error);
    }
};

// Attach click handlers to revenue cards
window.attachRevenueClickHandlers = function() {
    const cards = [
        { id: 'revenue-mrr', type: 'mrr' },
        { id: 'revenue-arr', type: 'arr' },
        { id: 'revenue-active', type: 'active' }
    ];

    cards.forEach(card => {
        const element = document.getElementById(card.id);
        if (element) {
            const cardContainer = element.closest('.stat-card');
            if (cardContainer) {
                cardContainer.style.cursor = 'pointer';
                // Remove existing listener to avoid duplicates
                cardContainer.onclick = function() {
                    // showRevenueDetails is defined in admin2.html as window function
                    // By the time user clicks, page is fully loaded and function exists
                    window.showRevenueDetails(card.type);
                };
            }
        }
    });
};

// ============================================================================
// Revenue Modal Functions
// ============================================================================

// Show loading spinner
function showRevenueLoading() {
    document.getElementById('revenue-modal-body').innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f4f6; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 20px; color: #6b7280;">Loading details...</p>
        </div>
    `;
}

// Show error message
function showRevenueError(message) {
    document.getElementById('revenue-modal-body').innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
            <h3 style="color: #ef4444; margin-bottom: 10px;">Error</h3>
            <p style="color: #6b7280;">${message}</p>
            <button onclick="window.closeRevenueModal()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
        </div>
    `;
}

// Show empty state
function showRevenueEmpty(message, icon = '🚫') {
    document.getElementById('revenue-modal-body').innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">${icon}</div>
            <p style="color: #6b7280; font-size: 16px;">${message}</p>
        </div>
    `;
}

// Main function to show revenue details based on card type
window.showRevenueDetails = async function(cardType) {
    const modal = document.getElementById('revenue-detail-modal');
    const titleEl = document.getElementById('revenue-modal-title');

    // Show modal
    modal.style.display = 'flex';

    // Set title based on card type
    const titles = {
        'mrr': 'Monthly Recurring Revenue Details',
        'arr': 'Annual Recurring Revenue Details',
        'active': 'Active Subscriptions Details'
    };
    titleEl.textContent = titles[cardType] || 'Revenue Details';

    // Show loading
    showRevenueLoading();

    try {
        if (cardType === 'mrr') {
            await renderMRRDetails();
        } else if (cardType === 'arr') {
            await renderARRDetails();
        } else if (cardType === 'active') {
            const response = await fetch('/api/admin2/revenue/active-subscriptions?sort=revenue');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            renderActiveSubscriptions(data);
        }
    } catch (error) {
        console.error('Error fetching revenue details:', error);
        showRevenueError('Failed to load revenue details. Please try again.');
    }
};

// Render MRR breakdown
async function renderMRRDetails() {
    try {
        const response = await fetch('/api/admin2/stats/revenue');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const byTier = data.by_tier || [];
        const totalMRR = data.mrr || 0;

        if (byTier.length === 0) {
            showRevenueEmpty('No active subscriptions yet.', '📊');
            return;
        }

        let html = `<table style="width: 100%; border-collapse: collapse;"><thead><tr style="border-bottom: 2px solid #e5e7eb; text-align: left;"><th style="padding: 12px; font-weight: 600;">Plan Type</th><th style="padding: 12px; font-weight: 600; text-align: right;">Users</th><th style="padding: 12px; font-weight: 600; text-align: right;">Price/Month</th><th style="padding: 12px; font-weight: 600; text-align: right;">Revenue</th></tr></thead><tbody>`;

        byTier.forEach(tier => {
            html += `<tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 12px;">${tier.tier}</td><td style="padding: 12px; text-align: right;">${tier.user_count}</td><td style="padding: 12px; text-align: right;">€${tier.price_monthly.toFixed(2)}</td><td style="padding: 12px; text-align: right; font-weight: 600;">€${tier.revenue.toFixed(2)}</td></tr>`;
        });

        html += `</tbody><tfoot><tr style="border-top: 2px solid #e5e7eb; font-weight: 600;"><td colspan="3" style="padding: 12px;">Total MRR</td><td style="padding: 12px; text-align: right; color: #10b981; font-size: 18px;">€${totalMRR.toFixed(2)}</td></tr></tfoot></table><div style="margin-top: 40px;"><h3 style="margin-bottom: 20px; color: #111827;">MRR Trend - Last 52 Weeks</h3><div style="position: relative; height: 300px;"><canvas id="year-chart-mrr"></canvas></div></div>`;

        document.getElementById('revenue-modal-body').innerHTML = html;
        await window.renderYearChart('mrr');
    } catch (error) {
        console.error('Error fetching MRR details:', error);
        showRevenueError('Failed to load MRR details.');
    }
}

// Render ARR breakdown
async function renderARRDetails() {
    try {
        const response = await fetch('/api/admin2/stats/revenue');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const byTier = data.by_tier || [];
        const totalARR = data.arr || 0;
        const yearlyPlans = byTier.filter(tier => tier.interval === 'yearly');

        if (yearlyPlans.length === 0) {
            showRevenueEmpty('No annual subscriptions yet.', '📅');
            return;
        }

        let html = `<table style="width: 100%; border-collapse: collapse;"><thead><tr style="border-bottom: 2px solid #e5e7eb; text-align: left;"><th style="padding: 12px; font-weight: 600;">Plan Type</th><th style="padding: 12px; font-weight: 600; text-align: right;">Users</th><th style="padding: 12px; font-weight: 600; text-align: right;">Price/Year</th><th style="padding: 12px; font-weight: 600; text-align: right;">Revenue</th></tr></thead><tbody>`;

        yearlyPlans.forEach(tier => {
            const yearlyRevenue = tier.user_count * tier.price;
            html += `<tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 12px;">${tier.tier}</td><td style="padding: 12px; text-align: right;">${tier.user_count}</td><td style="padding: 12px; text-align: right;">€${tier.price.toFixed(2)}</td><td style="padding: 12px; text-align: right; font-weight: 600;">€${yearlyRevenue.toFixed(2)}</td></tr>`;
        });

        html += `</tbody><tfoot><tr style="border-top: 2px solid #e5e7eb; font-weight: 600;"><td style="padding: 12px;">Total ARR</td><td style="padding: 12px;"></td><td style="padding: 12px;"></td><td style="padding: 12px; text-align: right;">€${totalARR.toFixed(2)}</td></tr></tfoot></table><div style="margin-top: 40px;"><h3 style="margin-bottom: 20px; color: #111827;">ARR Trend - Last 52 Weeks</h3><div style="position: relative; height: 300px;"><canvas id="year-chart-arr"></canvas></div></div>`;

        document.getElementById('revenue-modal-body').innerHTML = html;
        await window.renderYearChart('arr');
    } catch (error) {
        console.error('Error fetching ARR details:', error);
        showRevenueError('Failed to load ARR details.');
    }
}

// Render active subscriptions list
async function renderActiveSubscriptions(data) {
    if (data.subscriptions.length === 0) {
        showRevenueEmpty('No paying customers yet.', '👥');
        return;
    }

    let html = `<div style="margin-bottom: 20px;"><p style="color: #6b7280; margin: 0;">Total: ${data.total_count} active subscriptions</p></div><table style="width: 100%; border-collapse: collapse;"><thead><tr style="border-bottom: 2px solid #e5e7eb; text-align: left;"><th style="padding: 12px; font-weight: 600;">Email</th><th style="padding: 12px; font-weight: 600;">Name</th><th style="padding: 12px; font-weight: 600;">Plan</th><th style="padding: 12px; font-weight: 600; text-align: right;">Amount/Month</th><th style="padding: 12px; font-weight: 600;">Started</th></tr></thead><tbody>`;

    data.subscriptions.forEach(sub => {
        const createdDate = new Date(sub.created_at).toLocaleDateString('nl-NL');
        const naam = sub.naam || sub.email.split('@')[0];
        html += `<tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 12px;">${sub.email}</td><td style="padding: 12px;">${naam}</td><td style="padding: 12px;"><span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${sub.selected_plan}</span></td><td style="padding: 12px; text-align: right; font-weight: 600;">€${sub.monthly_amount.toFixed(2)}</td><td style="padding: 12px; color: #6b7280;">${createdDate}</td></tr>`;
    });

    html += `</tbody></table><div style="margin-top: 40px;"><h3 style="margin-bottom: 20px; color: #111827;">Active Subscriptions Trend - Last 52 Weeks</h3><div style="position: relative; height: 300px;"><canvas id="year-chart-active"></canvas></div></div>`;

    document.getElementById('revenue-modal-body').innerHTML = html;
    await window.renderYearChart('active');
}

// Close revenue modal
window.closeRevenueModal = function() {
    document.getElementById('revenue-detail-modal').style.display = 'none';
    document.getElementById('revenue-modal-body').innerHTML = '';
};

// Close modal on ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('revenue-detail-modal');
        if (modal && modal.style.display !== 'none') {
            window.closeRevenueModal();
        }
    }
});

// Close modal on backdrop click
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('revenue-detail-modal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            window.closeRevenueModal();
        }
    });
});

// ============================================================================
// Backup Manager
// ============================================================================

const BackupManager = {
    /**
     * Load backups and update stats
     */
    async loadBackups() {
        try {
            const response = await fetch('/api/admin/backups?limit=20');
            if (!response.ok) {
                throw new Error('Failed to load backups');
            }
            const data = await response.json();

            // Update stats
            document.getElementById('backupTotal').textContent = data.total || 0;

            if (data.backups && data.backups.length > 0) {
                const lastBackup = data.backups[0];
                const lastTime = new Date(lastBackup.created_at);
                document.getElementById('backupLastTime').textContent = lastTime.toLocaleString('nl-NL');
                document.getElementById('backupStatus').textContent = lastBackup.status === 'completed' ? '✅ OK' : '⚠️ ' + lastBackup.status;
            } else {
                document.getElementById('backupLastTime').textContent = 'No backups yet';
                document.getElementById('backupStatus').textContent = '⚠️ None';
            }

            // Render backups table
            this.renderBackupsTable(data.backups || []);
        } catch (error) {
            console.error('Error loading backups:', error);
            document.getElementById('backupsTable').innerHTML = `<div style="color: red;">Error: ${error.message}</div>`;
        }
    },

    /**
     * Render backups table
     */
    renderBackupsTable(backups) {
        if (!backups || backups.length === 0) {
            document.getElementById('backupsTable').innerHTML = '<div style="color: #666;">No backups available yet. Click "Create Manual Backup" to create your first backup.</div>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
                        <th style="padding: 12px;">ID</th>
                        <th style="padding: 12px;">Created</th>
                        <th style="padding: 12px;">Type</th>
                        <th style="padding: 12px;">Size</th>
                        <th style="padding: 12px;">Status</th>
                        <th style="padding: 12px;">Expires</th>
                        <th style="padding: 12px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        backups.forEach(backup => {
            const created = new Date(backup.created_at).toLocaleString('nl-NL');
            const expires = backup.expires_at ? new Date(backup.expires_at).toLocaleString('nl-NL') : '-';
            const sizeKB = backup.size_bytes ? (backup.size_bytes / 1024).toFixed(1) + ' KB' : '-';
            const statusBadge = backup.status === 'completed'
                ? '<span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px;">✓ Completed</span>'
                : backup.status === 'in_progress'
                    ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px;">⏳ In Progress</span>'
                    : '<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px;">✗ Failed</span>';

            html += `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 12px; font-family: monospace; font-size: 12px;">${backup.backup_id || backup.id}</td>
                    <td style="padding: 12px;">${created}</td>
                    <td style="padding: 12px;">${backup.backup_type || 'manual'}</td>
                    <td style="padding: 12px;">${sizeKB}</td>
                    <td style="padding: 12px;">${statusBadge}</td>
                    <td style="padding: 12px; color: #666;">${expires}</td>
                    <td style="padding: 12px;">
                        ${backup.status === 'completed' ? `
                            <button class="btn btn-sm" onclick="BackupManager.downloadBackup('${backup.id}')" title="Download">⬇️</button>
                            <button class="btn btn-sm btn-danger" onclick="BackupManager.restoreBackup('${backup.id}')" title="Restore">🔄</button>
                        ` : '-'}
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        document.getElementById('backupsTable').innerHTML = html;
    },

    /**
     * Load transaction log
     */
    async loadTransactionLog() {
        try {
            const tableFilter = document.getElementById('txLogTableFilter')?.value || '';
            const operationFilter = document.getElementById('txLogOperationFilter')?.value || '';

            const params = new URLSearchParams({ limit: 50 });
            if (tableFilter) params.append('tableName', tableFilter);
            if (operationFilter) params.append('operation', operationFilter);

            const response = await fetch(`/api/admin/transaction-log?${params}`);
            if (!response.ok) {
                throw new Error('Failed to load transaction log');
            }
            const data = await response.json();

            // Update stats
            document.getElementById('transactionTotal').textContent = data.total || 0;

            // Render transaction log table
            this.renderTransactionLogTable(data.entries || []);
        } catch (error) {
            console.error('Error loading transaction log:', error);
            document.getElementById('transactionLogTable').innerHTML = `<div style="color: red;">Error: ${error.message}</div>`;
        }
    },

    /**
     * Render transaction log table
     */
    renderTransactionLogTable(entries) {
        if (!entries || entries.length === 0) {
            document.getElementById('transactionLogTable').innerHTML = '<div style="color: #666;">No transactions logged in the last 3 days.</div>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
                        <th style="padding: 12px;">Time</th>
                        <th style="padding: 12px;">Operation</th>
                        <th style="padding: 12px;">Table</th>
                        <th style="padding: 12px;">Record ID</th>
                        <th style="padding: 12px;">User</th>
                        <th style="padding: 12px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        entries.forEach(entry => {
            const timestamp = new Date(entry.timestamp).toLocaleString('nl-NL');
            const opColor = entry.operation === 'INSERT' ? '#065f46'
                : entry.operation === 'UPDATE' ? '#1e40af'
                : '#991b1b';
            const opBg = entry.operation === 'INSERT' ? '#d1fae5'
                : entry.operation === 'UPDATE' ? '#dbeafe'
                : '#fee2e2';

            html += `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 12px; font-size: 12px;">${timestamp}</td>
                    <td style="padding: 12px;">
                        <span style="background: ${opBg}; color: ${opColor}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${entry.operation}</span>
                    </td>
                    <td style="padding: 12px;">${entry.table_name}</td>
                    <td style="padding: 12px; font-family: monospace; font-size: 11px;">${(entry.record_id || '-').substring(0, 16)}...</td>
                    <td style="padding: 12px; font-size: 12px;">${(entry.user_id || 'system').substring(0, 8)}...</td>
                    <td style="padding: 12px;">
                        <button class="btn btn-sm" onclick="BackupManager.showDetails(${entry.id})" title="Details">📋</button>
                        ${entry.operation !== 'INSERT' ? `
                            <button class="btn btn-sm btn-danger" onclick="BackupManager.undoOperation(${entry.id})" title="Undo">↩️</button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        document.getElementById('transactionLogTable').innerHTML = html;
    },

    /**
     * Create manual backup
     */
    async createBackup() {
        if (!confirm('Create a new manual backup now?')) return;

        const btn = document.getElementById('createBackupBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Creating...';
        btn.disabled = true;

        try {
            const response = await fetch('/api/admin/backups/create', { method: 'POST' });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create backup');
            }

            const backup = await response.json();
            alert(`Backup created successfully!\nID: ${backup.backup_id}`);
            this.loadBackups();
        } catch (error) {
            console.error('Error creating backup:', error);
            alert('Failed to create backup: ' + error.message);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    },

    /**
     * Download a backup
     */
    downloadBackup(id) {
        window.location.href = `/api/admin/backups/${id}`;
    },

    /**
     * Show/hide restore loading overlay
     */
    showRestoreOverlay(message) {
        // Remove existing overlay
        const existing = document.getElementById('restore-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'restore-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.8); z-index: 10000;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: white; font-size: 18px;
        `;
        overlay.innerHTML = `
            <div class="loading-spinner" style="width: 50px; height: 50px; border-width: 4px;"></div>
            <p style="margin-top: 20px;">${message}</p>
        `;
        document.body.appendChild(overlay);
    },

    hideRestoreOverlay() {
        const overlay = document.getElementById('restore-overlay');
        if (overlay) overlay.remove();
    },

    /**
     * Restore from backup
     */
    async restoreBackup(id) {
        // First: choose restore mode
        const restoreOnly = confirm(
            'RESTORE OPTIONS:\n\n' +
            '• Click OK for RESTORE ONLY (no transaction replay)\n' +
            '  → Database returns to exact backup state\n\n' +
            '• Click CANCEL for RESTORE + REPLAY transactions\n' +
            '  → Database restored, then recent changes re-applied\n\n' +
            'Which option do you want?'
        );

        const replayTransactions = !restoreOnly;
        const modeText = replayTransactions
            ? 'RESTORE + REPLAY (transactions will be re-applied)'
            : 'RESTORE ONLY (data after backup will be lost)';

        // Final confirmation
        if (!confirm(`FINAL CONFIRMATION\n\nMode: ${modeText}\n\nProceed with database restore?`)) {
            return;
        }

        // Show loading overlay
        this.showRestoreOverlay(replayTransactions
            ? '🔄 Restoring database and replaying transactions...'
            : '🔄 Restoring database...');

        try {
            const response = await fetch(`/api/admin/backups/${id}/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ replayTransactions })
            });

            this.hideRestoreOverlay();

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Restore failed');
            }

            const result = await response.json();
            alert(`✅ Restore completed!\n\nTables restored: ${result.tablesRestored}\nTransactions replayed: ${result.transactionsReplayed}`);
            this.loadBackups();
            this.loadTransactionLog();
        } catch (error) {
            this.hideRestoreOverlay();
            console.error('Error restoring backup:', error);
            alert('❌ Restore failed: ' + error.message);
        }
    },

    /**
     * Undo a transaction
     */
    async undoOperation(id) {
        if (!confirm('Undo this operation? This will revert the change.')) return;

        try {
            const response = await fetch(`/api/admin/transaction-log/${id}/undo`, { method: 'POST' });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Undo failed');
            }

            const result = await response.json();
            alert(`Operation undone!\n${result.message}`);
            this.loadTransactionLog();
        } catch (error) {
            console.error('Error undoing operation:', error);
            alert('Undo failed: ' + error.message);
        }
    },

    /**
     * Show transaction details
     */
    showDetails(id) {
        alert('Transaction details viewer coming soon.\n\nCheck the transaction_log table directly for now.');
    },

    /**
     * Initialize when backups screen is shown
     */
    init() {
        this.loadBackups();
        this.loadTransactionLog();
    }
};

// Hook into screen manager to load backups when screen is shown
const originalShow = ScreenManager.show;
ScreenManager.show = function(screenName) {
    originalShow.call(this, screenName);
    if (screenName === 'backups') {
        BackupManager.init();
    }
};

// ============================================================================
// Initialize Application
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    ScreenManager.init();
});
