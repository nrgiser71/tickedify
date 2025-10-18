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
// Initialize Application
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    ScreenManager.init();
});
