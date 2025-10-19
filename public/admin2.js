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
        resetPassword: (id) => API.request(`/users/${id}/reset-password`, { method: 'POST' })
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
        getUserData: (id) => API.request(`/debug/user-data/${id}`),
        sqlQuery: (query, confirmDestructive = false) => API.request('/debug/sql-query', {
            method: 'POST',
            body: JSON.stringify({ query, confirm_destructive: confirmDestructive })
        }),
        databaseBackup: () => API.request('/debug/database-backup', { method: 'POST' }),
        cleanupData: (preview = true) => API.request('/debug/cleanup-orphaned-data', {
            method: 'POST',
            body: JSON.stringify({ preview })
        })
    }
};

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
            'system': '⚙️ System Settings',
            'dbtools': '🔧 Database Tools',
            'debug': '🔍 Debug Tools',
            'security': '🔒 Security'
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
                        <div class="stat-label">Premium</div>
                        <div class="stat-value">${Helpers.formatNumber(homeData.subscriptions.premium)}</div>
                        <div class="stat-subtext">${Helpers.formatPercentage((homeData.subscriptions.premium / homeData.users.total) * 100)} of total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Enterprise</div>
                        <div class="stat-value">${Helpers.formatNumber(homeData.subscriptions.enterprise)}</div>
                        <div class="stat-subtext">${Helpers.formatPercentage((homeData.subscriptions.enterprise / homeData.users.total) * 100)} of total</div>
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

            // Populate stat cards
            document.getElementById('tasks-total').textContent = Helpers.formatNumber(data.total_tasks);
            document.getElementById('tasks-completed').textContent = Helpers.formatNumber(data.completed);
            document.getElementById('tasks-completed-subtext').textContent =
                `${Helpers.formatPercentage((data.completed / data.total_tasks) * 100)} of total`;

            document.getElementById('tasks-pending').textContent = Helpers.formatNumber(data.pending);
            document.getElementById('tasks-pending-subtext').textContent =
                `${Helpers.formatPercentage((data.pending / data.total_tasks) * 100)} of total`;

            document.getElementById('tasks-completion-rate').textContent =
                Helpers.formatPercentage(data.completion_rate);

            document.getElementById('tasks-today').textContent = Helpers.formatNumber(data.created_today);
            document.getElementById('tasks-week').textContent = Helpers.formatNumber(data.created_week);
            document.getElementById('tasks-month').textContent = Helpers.formatNumber(data.created_month);

            ScreenManager.hideLoading('#tasks-content');

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
                        <div class="stat-value">${Helpers.formatNumber(data.recent_30d)}</div>
                        <div class="stat-subtext">Last 30 days</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">👥 Users with Imports</div>
                        <div class="stat-value">${Helpers.formatNumber(data.users_with_imports)}</div>
                        <div class="stat-subtext">${Helpers.formatNumber(data.total_imports)} total imports</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">📊 Adoption Rate</div>
                        <div class="stat-value">${Helpers.formatPercentage(data.percentage_with_imports)}</div>
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

            document.getElementById('db-size').textContent = data.database_size_formatted;
            document.getElementById('db-tables').textContent = data.table_count;

            // Render tables list
            const tbody = document.getElementById('db-tables-list');
            if (data.tables && data.tables.length > 0) {
                tbody.innerHTML = data.tables.map(table => `
                    <tr>
                        <td><strong>${table.name}</strong></td>
                        <td>${Helpers.formatNumber(table.row_count)}</td>
                        <td>${table.size_mb.toFixed(2)} MB</td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No table data available</td></tr>';
            }

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

            document.getElementById('revenue-mrr').textContent = formatEUR(data.mrr_total);
            document.getElementById('revenue-active').textContent =
                Helpers.formatNumber(data.active_subscriptions);

            // Revenue by tier
            document.getElementById('revenue-premium').textContent =
                formatEUR(data.revenue_by_tier.premium);
            document.getElementById('revenue-premium-subtext').textContent =
                `${Helpers.formatPercentage((data.revenue_by_tier.premium / data.mrr_total) * 100)} of MRR`;

            document.getElementById('revenue-enterprise').textContent =
                formatEUR(data.revenue_by_tier.enterprise);
            document.getElementById('revenue-enterprise-subtext').textContent =
                `${Helpers.formatPercentage((data.revenue_by_tier.enterprise / data.mrr_total) * 100)} of MRR`;

            ScreenManager.hideLoading('revenue-content');

        } catch (error) {
            ScreenManager.showError('revenue', 'Failed to load revenue dashboard', error);
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

            <!-- User Details (initially hidden, populated by T034) -->
            <div id="user-details-panel" style="display: none;">
                <!-- Details content hier (T034) -->
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
        } catch (error) {
            console.error('Failed to load user details:', error);
            const panel = document.getElementById('user-details-panel');
            panel.innerHTML = `<div class="error-message"><strong>Failed to load user details</strong><p>${error.message}</p></div><button class="btn btn-secondary" onclick="Screens.closeUserDetails()">← Back to Search</button>`;
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
            const userId = document.getElementById('debug-user-id').value.trim();

            if (!userId) {
                alert('❌ Please enter a user ID');
                return;
            }

            const resultsDiv = document.getElementById('debug-user-results');
            resultsDiv.style.display = 'block';
            resultsDiv.innerHTML = '<p>Loading user data...</p>';

            const data = await API.debug.getUserData(userId);

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
// Initialize Application
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    ScreenManager.init();
});
