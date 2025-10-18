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
            const [homeData, growthData] = await Promise.all([
                API.stats.home(),
                API.stats.growth()
            ]);

            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Total Users</div>
                        <div class="stat-value">${homeData.users.total}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Active (7d)</div>
                        <div class="stat-value">${homeData.users.active_7d}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Active (30d)</div>
                        <div class="stat-value">${homeData.users.active_30d}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">New Today</div>
                        <div class="stat-value">${homeData.users.new_today}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">New This Week</div>
                        <div class="stat-value">${homeData.users.new_week}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">New This Month</div>
                        <div class="stat-value">${homeData.users.new_month}</div>
                    </div>
                </div>

                <div class="chart-container">
                    <h3>User Growth (Last 30 Days)</h3>
                    <canvas id="growth-chart"></canvas>
                </div>

                <h3>Subscription Distribution</h3>
                <div class="stats-grid" style="margin-bottom: 30px;">
                    <div class="stat-card">
                        <div class="stat-label">Free</div>
                        <div class="stat-value">${homeData.subscriptions.free}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Premium</div>
                        <div class="stat-value">${homeData.subscriptions.premium}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Enterprise</div>
                        <div class="stat-value">${homeData.subscriptions.enterprise}</div>
                    </div>
                </div>

                <h3>Recent Registrations</h3>
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
                            ${homeData.recent_registrations.map(user => `
                                <tr>
                                    <td>${user.email}</td>
                                    <td>${user.naam || '-'}</td>
                                    <td>${user.subscription_tier}</td>
                                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            // Render growth chart
            this.renderGrowthChart(growthData);

        } catch (error) {
            throw error;
        }
    },

    /**
     * Render user growth chart
     */
    renderGrowthChart(growthData) {
        const ctx = document.getElementById('growth-chart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: growthData.data.map(d => new Date(d.date).toLocaleDateString()),
                datasets: [{
                    label: 'New Users',
                    data: growthData.data.map(d => d.new_users),
                    borderColor: '#007AFF',
                    backgroundColor: 'rgba(0, 122, 255, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    },

    /**
     * Task Analytics Screen
     */
    async loadTasks() {
        const container = document.getElementById('tasks-content');
        ScreenManager.showLoading('tasks-content');

        const data = await API.stats.tasks();

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Tasks</div>
                    <div class="stat-value">${data.total}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Completion Rate</div>
                    <div class="stat-value">${data.completion_rate}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Created Today</div>
                    <div class="stat-value">${data.created.today}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Created This Week</div>
                    <div class="stat-value">${data.created.week}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Created This Month</div>
                    <div class="stat-value">${data.created.month}</div>
                </div>
            </div>
        `;
    },

    /**
     * Email Analytics Screen
     */
    async loadEmails() {
        const container = document.getElementById('emails-content');
        ScreenManager.showLoading('emails-content');

        const data = await API.stats.emails();

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Imports</div>
                    <div class="stat-value">${data.total_imports}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Imported Today</div>
                    <div class="stat-value">${data.imported.today}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Imported This Week</div>
                    <div class="stat-value">${data.imported.week}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Imported This Month</div>
                    <div class="stat-value">${data.imported.month}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Users with Import</div>
                    <div class="stat-value">${data.users_with_import.count}</div>
                    <div class="stat-subtext">${data.users_with_import.percentage}% of all users</div>
                </div>
            </div>
        `;
    },

    /**
     * Database Monitor Screen
     */
    async loadDatabase() {
        const container = document.getElementById('database-content');
        ScreenManager.showLoading('database-content');

        const data = await API.stats.database();

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Database Size</div>
                    <div class="stat-value">${data.database_size}</div>
                </div>
            </div>

            <h3>Table Statistics</h3>
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Table Name</th>
                            <th>Size</th>
                            <th>Row Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.tables.map(table => `
                            <tr>
                                <td>${table.name}</td>
                                <td>${table.size}</td>
                                <td>${table.row_count.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Revenue Dashboard Screen
     */
    async loadRevenue() {
        const container = document.getElementById('revenue-content');
        ScreenManager.showLoading('revenue-content');

        const data = await API.stats.revenue();

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Monthly Recurring Revenue</div>
                    <div class="stat-value">€${data.mrr.toFixed(2)}</div>
                </div>
            </div>

            <h3>Revenue by Tier</h3>
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Tier</th>
                            <th>Users</th>
                            <th>Price/Month</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.by_tier.map(tier => `
                            <tr>
                                <td>${tier.tier}</td>
                                <td>${tier.user_count}</td>
                                <td>€${tier.price_monthly?.toFixed(2) || '0.00'}</td>
                                <td>€${tier.revenue?.toFixed(2) || '0.00'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * User Management Screen
     */
    async loadUsers() {
        const container = document.getElementById('users-content');
        container.innerHTML = `
            <div class="search-box">
                <input type="text" id="user-search" placeholder="Search users by email, name, or ID..." />
            </div>
            <div id="user-results"></div>
            <div id="user-details"></div>
        `;

        // Setup search with debounce
        let searchTimeout;
        document.getElementById('user-search').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length < 2) {
                document.getElementById('user-results').innerHTML = '';
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const results = await API.users.search(query);
                    this.displayUserResults(results);
                } catch (error) {
                    document.getElementById('user-results').innerHTML = `
                        <div class="error-message">Search failed: ${error.message}</div>
                    `;
                }
            }, 300);
        });
    },

    displayUserResults(results) {
        const container = document.getElementById('user-results');
        if (results.count === 0) {
            container.innerHTML = '<p>No users found</p>';
            return;
        }

        container.innerHTML = `
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Name</th>
                            <th>Tier</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.results.map(user => `
                            <tr>
                                <td>${user.email}</td>
                                <td>${user.naam || '-'}</td>
                                <td>${user.subscription_tier}</td>
                                <td>${user.actief ? 'Active' : 'Blocked'}</td>
                                <td>
                                    <button class="btn btn-primary" onclick="Screens.viewUserDetails(${user.id})">View</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async viewUserDetails(userId) {
        const container = document.getElementById('user-details');
        container.innerHTML = '<div class="loading-spinner"></div> Loading user details...';

        try {
            const user = await API.users.get(userId);
            container.innerHTML = `
                <h3>User Details: ${user.user.email}</h3>
                <p>Full user details will be implemented in next phase</p>
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
