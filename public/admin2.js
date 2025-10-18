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
        updateTier: (id, tier) => API.request(`/users/${id}/tier`, {
            method: 'PUT',
            body: JSON.stringify({ tier })
        }),
        extendTrial: (id, trialEndDate) => API.request(`/users/${id}/trial`, {
            method: 'PUT',
            body: JSON.stringify({ trial_end_date: trialEndDate })
        }),
        block: (id, blocked) => API.request(`/users/${id}/block`, {
            method: 'PUT',
            body: JSON.stringify({ blocked })
        }),
        delete: (id) => API.request(`/users/${id}`, { method: 'DELETE' }),
        resetPassword: (id) => API.request(`/users/${id}/reset-password`, { method: 'POST' }),
        logout: (id) => API.request(`/users/${id}/logout`, { method: 'POST' })
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

            // Load screen content
            this.loadScreen(screenName);
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
                await loadFunction();
            } catch (error) {
                console.error(`Error loading ${screenName} screen:`, error);
                this.showError(screenName, error.message);
            }
        }
    },

    /**
     * Show loading state
     */
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="loading-spinner"></div> <span>Loading...</span>';
        }
    },

    /**
     * Show error message
     */
    showError(screenName, message) {
        const container = document.getElementById(`${screenName}-content`);
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <strong>Error:</strong> ${message}
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
// Screen Implementations
// ============================================================================

const Screens = {
    /**
     * Home Dashboard Screen
     */
    async loadHome() {
        const container = document.getElementById('home-content');
        ScreenManager.showLoading('home-content');

        try {
            // Parallel API calls voor performance
            const [homeData, growthData] = await Promise.all([
                API.stats.home(),
                API.stats.growth()
            ]);

            // Render complete dashboard
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
            console.error('Error loading home dashboard:', error);
            container.innerHTML = `
                <div class="error-message">
                    <strong>Failed to load home dashboard</strong>
                    <p>${error.message}</p>
                </div>
            `;
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
            ScreenManager.showLoading('#emails-content');

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

            ScreenManager.hideLoading('#emails-content');

        } catch (error) {
            ScreenManager.showError('#emails-content', 'Failed to load email analytics', error);
        }
    },

    /**
     * Database Monitor Screen
     */
    async loadDatabase() {
        try {
            ScreenManager.showLoading('#database-content');

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

            ScreenManager.hideLoading('#database-content');

        } catch (error) {
            ScreenManager.showError('#database-content', 'Failed to load database monitor', error);
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
     * Load User Details (T034 - placeholder for now)
     */
    async loadUserDetails(userId) {
        const container = document.getElementById('user-details-panel');
        container.style.display = 'block';
        container.innerHTML = '<div class="loading-spinner"></div> Loading user details...';

        try {
            const user = await API.users.get(userId);
            container.innerHTML = `
                <h3>User Details: ${user.user.email}</h3>
                <p>Full user details will be implemented in T034</p>
                <pre>${JSON.stringify(user, null, 2)}</pre>
            `;
        } catch (error) {
            container.innerHTML = `<div class="error-message">Failed to load user: ${error.message}</div>`;
        }
    },

    /**
     * System Settings Screen
     */
    async loadSystem() {
        const container = document.getElementById('system-content');
        container.innerHTML = '<p>System settings will be loaded here</p>';
    },

    /**
     * Database Tools Screen
     */
    async loadDBTools() {
        const container = document.getElementById('dbtools-content');
        container.innerHTML = '<p>Database tools will be loaded here</p>';
    },

    /**
     * Debug Tools Screen
     */
    async loadDebug() {
        const container = document.getElementById('debug-content');
        container.innerHTML = '<p>Debug tools will be loaded here</p>';
    },

    /**
     * Security Screen
     */
    async loadSecurity() {
        const container = document.getElementById('security-content');
        container.innerHTML = '<p>Security controls will be loaded here</p>';
    }
};

// ============================================================================
// Initialize Application
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    ScreenManager.init();
});
