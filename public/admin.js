// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.isAuthenticated = false;
        this.data = {};
        this.refreshInterval = null;

        this.initializeEventListeners();

        // Check for existing session on page load (FR-001, FR-002, FR-003)
        this.checkExistingSession();
    }

    async checkExistingSession() {
        try {
            const response = await fetch('/api/admin/session', {
                credentials: 'include'  // Required for cookies
            });

            if (response.ok) {
                const session = await response.json();
                console.log('✅ Valid session found:', session.loginTime);

                // Session is valid - skip login form
                this.isAuthenticated = true;
                document.getElementById('loginContainer').style.display = 'none';
                document.getElementById('adminDashboard').style.display = 'block';

                await this.loadDashboard();
                this.startAutoRefresh();

                return true;
            } else {
                // No valid session - show login form
                console.log('❌ No valid session - showing login form');
                this.isAuthenticated = false;
                return false;
            }
        } catch (error) {
            console.error('Session check failed:', error);
            // On error, default to showing login form (safe fallback)
            this.isAuthenticated = false;
            return false;
        }
    }

    initializeEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isAuthenticated) {
                this.logout();
            }
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
                if (this.isAuthenticated) this.refreshData();
            }
        });
    }

    async handleLogin() {
        const password = document.getElementById('adminPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        try {
            // Try server-side authentication first
            const response = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });
            
            if (response.ok) {
                // Server-side authentication succeeded
                this.isAuthenticated = true;
                document.getElementById('loginContainer').style.display = 'none';
                document.getElementById('adminDashboard').style.display = 'block';
                errorDiv.style.display = 'none';
                
                await this.loadDashboard();
                this.startAutoRefresh();
                return;
            }
        } catch (error) {
            console.error('Server-side auth failed:', error);
            errorDiv.textContent = 'Login service niet beschikbaar. Probeer later opnieuw.';
            errorDiv.style.display = 'block';
            document.getElementById('adminPassword').value = '';
            document.getElementById('adminPassword').focus();
        }
    }

    async logout() {
        try {
            // Try server-side logout
            await fetch('/api/admin/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.warn('Server-side logout failed:', error);
        }
        
        // Always perform client-side logout
        this.isAuthenticated = false;
        document.getElementById('loginContainer').style.display = 'block';
        document.getElementById('adminDashboard').style.display = 'none';
        document.getElementById('adminPassword').value = '';
        
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    async loadDashboard() {
        try {
            await this.fetchAllData();
            this.updateUI();
            this.updateLastUpdate();
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Fout bij laden van dashboard data');
        }
    }

    async fetchAllData() {
        const endpoints = [
            '/api/admin/users',
            '/api/admin/tasks',
            '/api/admin/system',
            '/api/admin/insights',
            '/api/admin/monitoring',
            '/api/admin/projects',
            '/api/admin/contexts',
            '/api/admin/errors',
            '/api/admin/api-usage',
            '/api/admin/email-stats',
            '/api/admin/feedback/stats',
            '/api/admin/feedback',
            '/api/admin/beta/status',
            '/api/admin/beta/users',
            '/api/admin/all-users',
            '/api/admin/payment-configurations'
        ];

        const results = await Promise.allSettled(
            endpoints.map(endpoint =>
                fetch(endpoint, {
                    credentials: 'include'  // Ensure cookies are sent
                }).then(r => r.json())
            )
        );

        // Debug logging for failed endpoints
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`❌ Failed to fetch ${endpoints[index]}:`, result.reason);
            } else if (endpoints[index] === '/api/admin/payment-configurations') {
                console.log('💳 Payment configs response:', result.value);
            }
        });

        this.data = {
            users: results[0].status === 'fulfilled' ? results[0].value : {},
            tasks: results[1].status === 'fulfilled' ? results[1].value : {},
            system: results[2].status === 'fulfilled' ? results[2].value : {},
            insights: results[3].status === 'fulfilled' ? results[3].value : {},
            monitoring: results[4].status === 'fulfilled' ? results[4].value : {},
            projects: results[5].status === 'fulfilled' ? results[5].value : {},
            contexts: results[6].status === 'fulfilled' ? results[6].value : {},
            errors: results[7].status === 'fulfilled' ? results[7].value : {},
            apiUsage: results[8].status === 'fulfilled' ? results[8].value : {},
            emailStats: results[9].status === 'fulfilled' ? results[9].value : {},
            feedbackStats: results[10].status === 'fulfilled' ? results[10].value : {},
            feedback: results[11].status === 'fulfilled' ? results[11].value : {},
            betaStatus: results[12].status === 'fulfilled' ? results[12].value : {},
            betaUsers: results[13].status === 'fulfilled' ? results[13].value : {},
            allUsers: results[14].status === 'fulfilled' ? results[14].value : {},
            paymentConfigurations: results[15].status === 'fulfilled' ? results[15].value : {}
        };
    }

    updateUI() {
        this.updateStats();
        this.updateTables();
    }

    updateStats() {
        // Gebruikers statistieken
        document.getElementById('totalUsers').textContent = this.data.users.total || 0;
        document.getElementById('activeUsers').textContent = this.data.users.active || 0;
        document.getElementById('newToday').textContent = this.data.users.newToday || 0;

        // Taken statistieken
        document.getElementById('totalTasks').textContent = this.data.tasks.total || 0;
        document.getElementById('completedTasks').textContent = this.data.tasks.completed || 0;
        document.getElementById('recurringTasks').textContent = this.data.tasks.recurring || 0;

        // Productiviteit
        document.getElementById('productivityScore').textContent = this.data.insights.productivityScore || '-';
        document.getElementById('tasksPerDay').textContent = this.data.insights.tasksPerDay || 0;
        document.getElementById('completionRate').textContent = this.data.insights.completionRate || 0;

        // Systeem status
        document.getElementById('systemStatus').textContent = this.data.monitoring.status || 'Unknown';
        document.getElementById('uptime').textContent = this.data.monitoring.uptime || '-';
        document.getElementById('errors24h').textContent = this.data.monitoring.errors24h || 0;

        // Email import
        document.getElementById('emailImports').textContent = this.data.emailStats.total || 0;
        document.getElementById('emailsThisWeek').textContent = this.data.emailStats.thisWeek || 0;
        document.getElementById('emailSuccessRate').textContent = this.data.emailStats.successRate || 100;

        // Database
        document.getElementById('dbSize').textContent = this.formatBytes(this.data.system.dbSize) || '-';
        document.getElementById('totalRecords').textContent = this.data.system.totalRecords || 0;
        document.getElementById('dbGrowth').textContent = this.data.system.dailyGrowth || 0;

        // Feedback
        if (this.data.feedbackStats && this.data.feedbackStats.stats) {
            const stats = this.data.feedbackStats.stats;
            document.getElementById('feedbackTotal').textContent = stats.totaal || 0;
            document.getElementById('feedbackNieuw').textContent = stats.nieuw || 0;
            document.getElementById('feedbackBugs').textContent = stats.bugs || 0;
            document.getElementById('feedbackFeatures').textContent = stats.features || 0;
        }

        // Beta statistics
        if (this.data.betaStatus && this.data.betaStatus.betaConfig) {
            const config = this.data.betaStatus.betaConfig;
            const stats = this.data.betaStatus.statistics;
            
            document.getElementById('betaStatus').textContent = config.beta_period_active ? 'Actief' : 'Beëindigd';
            document.getElementById('betaUsers').textContent = stats?.totalBetaUsers || 0;
            document.getElementById('betaNewThisWeek').textContent = stats?.newThisWeek || 0;
            
            // Update toggle button
            const toggleBtn = document.getElementById('betaToggleBtn');
            if (config.beta_period_active) {
                toggleBtn.textContent = '🧪 Beta Beëindigen';
                toggleBtn.className = 'admin-btn danger';
            } else {
                toggleBtn.textContent = '🧪 Beta Activeren';
                toggleBtn.className = 'admin-btn success';
            }
        }
    }

    updateTables() {
        // Gebruikers tabel
        this.renderTable('usersTable', this.data.users.recent || [], [
            'Naam', 'Email', 'Registratie', 'Laatste Login', 'Taken'
        ], (user) => [
            user.name || user.naam,
            user.email,
            this.formatDate(user.created_at || user.aangemaakt),
            user.last_login || user.laatste_login ? this.formatDate(user.last_login || user.laatste_login) : 'Nooit',
            user.task_count || 0
        ]);

        // Taken per lijst
        this.renderTable('tasksTable', this.data.tasks.byList || [], [
            'Lijst', 'Aantal', 'Percentage'
        ], (item) => [
            item.list_name,
            item.count,
            `${Math.round((item.count / this.data.tasks.total) * 100)}%`
        ]);

        // Populaire projecten
        this.renderTable('projectsTable', this.data.projects.popular || [], [
            'Project', 'Taken', 'Gebruikers', 'Completion Rate'
        ], (project) => [
            project.name,
            project.task_count,
            project.user_count,
            `${project.completion_rate}%`
        ]);

        // Populaire contexten
        this.renderTable('contextsTable', this.data.contexts.popular || [], [
            'Context', 'Taken', 'Gebruikers', 'Gemiddelde Duur'
        ], (context) => [
            context.name,
            context.task_count,
            context.user_count,
            `${context.avg_duration} min`
        ]);

        // Error logs
        this.renderTable('errorsTable', this.data.errors.recent || [], [
            'Tijd', 'Endpoint', 'Error', 'Gebruiker'
        ], (error) => [
            this.formatDateTime(error.timestamp),
            error.endpoint,
            error.message,
            error.user_email || 'Systeem'
        ]);

        // API Usage
        this.renderTable('apiTable', this.data.apiUsage.endpoints || [], [
            'Endpoint', 'Calls', 'Avg Response', 'Errors', 'Laatste'
        ], (api) => [
            api.endpoint,
            api.calls_24h,
            `${api.avg_response_time}ms`,
            api.error_count,
            api.last_called ? this.formatDateTime(api.last_called) : '-'
        ]);

        // Beta users tabel
        this.renderBetaUsersTable();

        // All users tabel
        this.renderAllUsersTable();

        // Feedback tabel
        this.renderFeedbackTable();

        // Payment Configurations
        this.renderPaymentConfigurations();
    }

    renderBetaUsersTable() {
        const container = document.getElementById('betaUsersTable');
        const betaUsers = this.data.betaUsers && this.data.betaUsers.users || [];
        
        if (!betaUsers || betaUsers.length === 0) {
            container.innerHTML = '<div class="loading">Geen beta gebruikers beschikbaar</div>';
            return;
        }

        let html = '<div class="table-row" style="font-weight: 600; background: var(--macos-gray-6);">';
        html += '<div>Email</div><div>Naam</div><div>Status</div><div>GHL</div><div>Registratie</div>';
        html += '</div>';

        betaUsers.forEach(user => {
            html += '<div class="table-row">';
            html += `<div>${this.escapeHtml(user.email)}</div>`;
            html += `<div>${this.escapeHtml(user.naam || 'Geen naam')}</div>`;
            html += `<div><span class="status-badge ${user.subscription_status === 'beta_active' ? 'status-opgelost' : 'status-nieuw'}">${user.subscription_status === 'beta_active' ? '✅ Actief' : '❌ Verlopen'}</span></div>`;
            html += `<div>${user.ghl_contact_id ? '✅ Gesynchroniseerd' : '❌ Niet gesynd'}</div>`;
            html += `<div>${this.formatRelativeTime(user.created_at)}</div>`;
            html += '</div>';
        });

        container.innerHTML = html;
    }

    renderAllUsersTable() {
        const container = document.getElementById('allUsersTable');
        const allUsers = this.data.allUsers && this.data.allUsers.users || [];
        
        if (!allUsers || allUsers.length === 0) {
            container.innerHTML = '<div class="loading">Geen gebruikers beschikbaar</div>';
            return;
        }

        let html = '<div class="table-row" style="font-weight: 600; background: var(--macos-gray-6);">';
        html += '<div>Email</div><div>Naam</div><div>Account Type</div><div>Status</div><div>Abonnement</div><div>Taken</div><div>Laatste Login</div><div>Acties</div>';
        html += '</div>';

        allUsers.forEach(user => {
            const accountTypeText = user.account_type === 'beta' ? 'Beta' : 'Regular';
            const accountTypeBadge = user.account_type === 'beta' ? 'status-nieuw' : 'status-opgelost';
            const statusText = user.subscription_status === 'active' || user.subscription_status === 'beta_active' ? '✅ Actief' : '❌ Verlopen';
            const statusBadge = user.subscription_status === 'active' || user.subscription_status === 'beta_active' ? 'status-opgelost' : 'status-nieuw';

            // Format subscription plan
            const subscriptionInfo = this.formatSubscriptionPlan(user.selected_plan);

            html += '<div class="table-row">';
            html += `<div>${this.escapeHtml(user.email)}</div>`;
            html += `<div>${this.escapeHtml(user.naam || 'Geen naam')}</div>`;
            html += `<div><span class="status-badge ${accountTypeBadge}">${accountTypeText}</span></div>`;
            html += `<div><span class="status-badge ${statusBadge}">${statusText}</span></div>`;
            html += `<div>${subscriptionInfo.html}</div>`;
            html += `<div>${user.task_count || 0}</div>`;
            html += `<div>${user.last_activity ? this.formatRelativeTime(user.last_activity) : 'Nooit'}</div>`;
            html += `<div>
                <select id="accountType-${user.id}" data-current="${user.account_type}" style="margin-right: 8px; padding: 4px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="beta" ${user.account_type === 'beta' ? 'selected' : ''}>Beta</option>
                    <option value="regular" ${user.account_type === 'regular' ? 'selected' : ''}>Regular</option>
                </select>
                <button onclick="changeUserAccountType('${user.id}', '${user.email}')" class="admin-btn" style="padding: 4px 8px; font-size: 12px;">Wijzig</button>
            </div>`;
            html += '</div>';
        });

        container.innerHTML = html;
    }

    renderFeedbackTable() {
        const container = document.getElementById('feedbackTable');
        const feedbackData = this.data.feedback && this.data.feedback.feedback || [];
        
        if (!feedbackData || feedbackData.length === 0) {
            container.innerHTML = '<div class="loading">Geen feedback beschikbaar</div>';
            return;
        }

        let html = '<div class="table-row" style="font-weight: 600; background: var(--macos-gray-6);">';
        html += '<div>Type</div><div>Titel</div><div>Gebruiker</div><div>Datum</div><div>Status</div>';
        html += '</div>';

        feedbackData.forEach(item => {
            html += `<div class="table-row feedback-row" onclick="showFeedbackDetail('${item.id}')" data-feedback='${JSON.stringify(item).replace(/'/g, '&#39;')}'>`;
            html += `<div>${item.type === 'bug' ? '🐛 Bug' : '💡 Feature'}</div>`;
            html += `<div>${this.escapeHtml(item.titel)}</div>`;
            html += `<div>${this.escapeHtml(item.gebruiker_naam || 'Onbekend')}</div>`;
            html += `<div>${this.formatRelativeTime(item.aangemaakt)}</div>`;
            html += `<div><span class="status-badge status-${item.status}">${this.getStatusLabel(item.status)}</span></div>`;
            html += '</div>';
        });

        container.innerHTML = html;
    }

    getStatusLabel(status) {
        const labels = {
            'nieuw': '🆕 Nieuw',
            'bekeken': '👁️ Bekeken',
            'in_behandeling': '🔄 In behandeling',
            'opgelost': '✅ Opgelost'
        };
        return labels[status] || status;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatRelativeTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Zojuist';
        if (minutes < 60) return `${minutes}m geleden`;
        if (hours < 24) return `${hours}u geleden`;
        if (days < 7) return `${days}d geleden`;
        return this.formatDate(dateString);
    }

    renderTable(containerId, data, headers, rowMapper) {
        const container = document.getElementById(containerId);
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="loading">Geen data beschikbaar</div>';
            return;
        }

        let html = '<div class="table-row" style="font-weight: 600; background: var(--macos-gray-6);">';
        headers.forEach(header => {
            html += `<div>${header}</div>`;
        });
        html += '</div>';

        data.forEach(item => {
            html += '<div class="table-row">';
            const values = rowMapper(item);
            values.forEach(value => {
                html += `<div>${value}</div>`;
            });
            html += '</div>';
        });

        container.innerHTML = html;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('nl-NL');
    }

    formatDateTime(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('nl-NL');
    }

    formatBytes(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateLastUpdate() {
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString('nl-NL');
    }

    async refreshData() {
        try {
            await this.fetchAllData();
            this.updateUI();
            this.updateLastUpdate();
            this.showSuccess('Data ververst');
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showError('Fout bij verversen van data');
        }
    }

    async exportData() {
        try {
            const response = await fetch('/api/admin/export');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tickedify-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            this.showSuccess('Export gedownload');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showError('Fout bij exporteren van data');
        }
    }

    async runMaintenance() {
        if (!confirm('Weet je zeker dat je database onderhoud wilt uitvoeren?')) {
            return;
        }

        try {
            const response = await fetch('/api/admin/maintenance', { method: 'POST' });
            const result = await response.json();
            this.showSuccess(`Onderhoud voltooid: ${result.message}`);
            await this.refreshData();
        } catch (error) {
            console.error('Error running maintenance:', error);
            this.showError('Fout bij database onderhoud');
        }
    }

    startAutoRefresh() {
        // Refresh elke 5 minuten
        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, 5 * 60 * 1000);
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = type;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.padding = '15px 20px';
        notification.style.borderRadius = '8px';
        notification.style.fontWeight = '500';

        document.body.appendChild(notification);

        setTimeout(() => {
            document.body.removeChild(notification);
        }, 5000);
    }

    formatSubscriptionPlan(selectedPlan) {
        if (!selectedPlan) {
            return {
                text: 'Geen',
                html: '<span class="status-badge" style="background-color: #f1f5f9; color: #475569;">Geen</span>'
            };
        }

        let text, badge, color;
        switch (selectedPlan) {
            case 'trial_14_days':
                text = '14 dagen gratis';
                badge = 'trial';
                color = '#f59e0b'; // Orange
                break;
            case 'monthly_7':
                text = '€7/maand';
                badge = 'monthly';
                color = '#3b82f6'; // Blue
                break;
            case 'yearly_70':
                text = '€70/jaar';
                badge = 'yearly';
                color = '#10b981'; // Green
                break;
            default:
                text = selectedPlan;
                badge = 'unknown';
                color = '#6b7280'; // Gray
        }

        return {
            text: text,
            html: `<span class="status-badge" style="background-color: ${color}20; color: ${color}; border: 1px solid ${color}40;">${text}</span>`
        };
    }

    renderPaymentConfigurations() {
        const loadingDiv = document.getElementById('paymentConfigsLoading');
        const errorDiv = document.getElementById('paymentConfigsError');
        const container = document.getElementById('paymentConfigsTable');

        console.log('🔍 DEBUG paymentConfigurations full data:', this.data.paymentConfigurations);
        const configs = this.data.paymentConfigurations?.configurations || [];
        console.log('🔍 DEBUG configs array:', configs, 'length:', configs.length);

        // Check if API call had an error
        if (this.data.paymentConfigurations?.error) {
            if (loadingDiv) loadingDiv.style.display = 'none';
            errorDiv.textContent = `API Error: ${this.data.paymentConfigurations.error}`;
            errorDiv.style.display = 'block';
            console.error('❌ Payment configs API error:', this.data.paymentConfigurations.error);
            return;
        }

        if (configs.length === 0) {
            if (loadingDiv) loadingDiv.style.display = 'none';
            container.innerHTML = '<p style="color: var(--macos-text-secondary);">Geen payment configuraties beschikbaar (configs.length = 0)</p>';
            console.warn('⚠️ No payment configs found');
            return;
        }

        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';
        console.log('✅ Rendering', configs.length, 'payment configurations');

        // Find Standard and No Limit configs
        const standardConfig = configs.find(c => c.plan_id === 'monthly_7') || configs.find(c => c.plan_id === 'yearly_70') || {};
        const noLimitConfig = configs.find(c => c.plan_id === 'monthly_8') || configs.find(c => c.plan_id === 'yearly_80') || {};

        const standardUrl = standardConfig.checkout_url || '';
        const noLimitUrl = noLimitConfig.checkout_url || '';

        let html = `
            <div class="payment-config-item">
                <div class="payment-config-header">
                    <span class="payment-config-title">💳 Checkout URLs (2 tiers)</span>
                </div>
                <form class="payment-config-form" onsubmit="updateTierCheckoutUrls(event)">
                    <div class="form-group">
                        <label for="standard-checkout-url">🔵 Standard Abonnement (€7/€70)</label>
                        <input
                            type="url"
                            id="standard-checkout-url"
                            name="standard_url"
                            value="${this.escapeHtml(standardUrl)}"
                            placeholder="https://..."
                            required>
                        <small style="color: var(--macos-text-secondary); font-size: 12px;">
                            Voor monthly_7 en yearly_70 plans
                        </small>
                    </div>
                    <div class="form-group">
                        <label for="nolimit-checkout-url">⭐ No Limit Abonnement (€8/€80)</label>
                        <input
                            type="url"
                            id="nolimit-checkout-url"
                            name="nolimit_url"
                            value="${this.escapeHtml(noLimitUrl)}"
                            placeholder="https://..."
                            required>
                        <small style="color: var(--macos-text-secondary); font-size: 12px;">
                            Voor monthly_8 en yearly_80 plans
                        </small>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="admin-btn success">
                            💾 Opslaan
                        </button>
                    </div>
                </form>
            </div>
        `;

        container.innerHTML = html;
    }
}

// Global functions for button clicks
function refreshData() {
    adminDashboard.refreshData();
}

function exportData() {
    adminDashboard.exportData();
}

function runMaintenance() {
    adminDashboard.runMaintenance();
}

function logout() {
    adminDashboard.logout();
}

async function toggleBetaPeriod() {
    const config = adminDashboard.data.betaStatus?.betaConfig;
    if (!config) {
        alert('Beta configuratie niet beschikbaar');
        return;
    }

    const currentStatus = config.beta_period_active;
    const action = currentStatus ? 'beëindigen' : 'activeren';
    
    if (!confirm(`Weet je zeker dat je de beta periode wilt ${action}?`)) {
        return;
    }

    const toggleBtn = document.getElementById('betaToggleBtn');
    const originalText = toggleBtn.textContent;
    toggleBtn.textContent = '🔄 Bezig...';
    toggleBtn.disabled = true;

    try {
        const response = await fetch('/api/admin/beta/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                active: !currentStatus
            })
        });

        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            // Refresh dashboard data
            await adminDashboard.refreshData();
        } else {
            alert('Fout bij wijzigen beta periode: ' + result.error);
        }
    } catch (error) {
        console.error('Error toggling beta period:', error);
        alert('Fout bij wijzigen beta periode: ' + error.message);
    } finally {
        toggleBtn.disabled = false;
        toggleBtn.textContent = originalText;
    }
}

// Initialize dashboard when page loads
const adminDashboard = new AdminDashboard();

// Handle page refresh
window.addEventListener('beforeunload', () => {
    if (adminDashboard.refreshInterval) {
        clearInterval(adminDashboard.refreshInterval);
    }
});

// Feedback modal functions
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
    document.getElementById('feedbackModal').style.display = 'block';
}

function closeFeedbackModal() {
    document.getElementById('feedbackModal').style.display = 'none';
    currentFeedbackId = null;
}

async function updateFeedbackStatus() {
    if (!currentFeedbackId) return;
    
    const newStatus = document.getElementById('feedbackStatus').value;
    
    try {
        const response = await fetch(`/api/admin/feedback/${currentFeedbackId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update status');
        }
        
        // Refresh data to show updated status
        await adminDashboard.refreshData();
        
        // Update the modal if still open
        if (document.getElementById('feedbackModal').style.display === 'block') {
            showFeedbackDetail(currentFeedbackId);
        }
        
        adminDashboard.showSuccess('Status bijgewerkt');
    } catch (error) {
        console.error('Error updating feedback status:', error);
        adminDashboard.showError('Fout bij updaten status');
    }
}

// Change user account type function
async function changeUserAccountType(userId, userEmail) {
    const selectElement = document.getElementById(`accountType-${userId}`);
    if (!selectElement) {
        alert('Kan account type selector niet vinden');
        return;
    }
    
    const newAccountType = selectElement.value;
    const currentAccountType = selectElement.getAttribute('data-current');
    
    if (newAccountType === currentAccountType) {
        alert('Geen wijziging - account type is al ' + newAccountType);
        return;
    }
    
    const confirmMessage = `Weet je zeker dat je het account type van ${userEmail} wilt wijzigen van ${currentAccountType} naar ${newAccountType}?`;
    if (!confirm(confirmMessage)) {
        // Reset selectie als geannuleerd
        selectElement.value = currentAccountType;
        return;
    }
    
    // Button disable
    const button = selectElement.nextElementSibling;
    const originalText = button.textContent;
    button.textContent = '🔄 Bezig...';
    button.disabled = true;
    
    try {
        const response = await fetch(`/api/admin/user/${userId}/account-type`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ account_type: newAccountType })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Success message
            if (window.dashboard) {
                window.dashboard.showSuccess(`✅ ${userEmail} account type gewijzigd naar ${newAccountType}`);
                
                // Refresh data
                await window.dashboard.refreshData();
            } else {
                alert(`✅ Account type succesvol gewijzigd naar ${newAccountType}`);
                window.location.reload();
            }
        } else {
            throw new Error(result.error || 'Onbekende fout');
        }
        
    } catch (error) {
        console.error('Error changing account type:', error);
        if (window.dashboard) {
            window.dashboard.showError('❌ Fout bij wijzigen account type: ' + error.message);
        } else {
            alert('❌ Fout bij wijzigen account type: ' + error.message);
        }
        
        // Reset selectie bij fout
        selectElement.value = currentAccountType;
    } finally {
        // Button restore
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('feedbackModal');
    if (event.target === modal) {
        closeFeedbackModal();
    }
}

// Payment Configuration Functions
async function updateCheckoutUrl(event, planId) {
    event.preventDefault();

    const form = event.target;
    const urlInput = form.querySelector('input[name="checkout_url"]');
    const submitBtn = form.querySelector('button[type="submit"]');
    const checkoutUrl = urlInput.value.trim();

    if (!checkoutUrl) {
        alert('Voer een checkout URL in');
        return;
    }

    // Disable button during save
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '🔄 Bezig met opslaan...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/admin/payment-configurations', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                plan_id: planId,
                checkout_url: checkoutUrl
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            adminDashboard.showSuccess(`✅ Checkout URL bijgewerkt voor ${planId}`);
            // Refresh data to show updated timestamp
            await adminDashboard.refreshData();
        } else {
            throw new Error(result.error || 'Onbekende fout');
        }
    } catch (error) {
        console.error('Error updating checkout URL:', error);
        adminDashboard.showError('❌ Fout bij opslaan: ' + error.message);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function togglePlanActive(planId, isActive) {
    try {
        const response = await fetch('/api/admin/payment-configurations', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                plan_id: planId,
                is_active: isActive
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            adminDashboard.showSuccess(`✅ ${planId} is nu ${isActive ? 'actief' : 'inactief'}`);
            await adminDashboard.refreshData();
        } else {
            throw new Error(result.error || 'Onbekende fout');
        }
    } catch (error) {
        console.error('Error toggling plan active:', error);
        adminDashboard.showError('❌ Fout bij wijzigen status: ' + error.message);
        // Reset checkbox on error
        document.getElementById(`active-${planId}`).checked = !isActive;
    }
}

function testCheckoutUrl(planId) {
    const urlInput = document.getElementById(`url-${planId}`);
    const url = urlInput.value.trim();

    if (!url) {
        alert('Geen checkout URL ingesteld');
        return;
    }

    // Open URL in new tab
    window.open(url, '_blank');
    adminDashboard.showSuccess(`🔗 Checkout URL geopend in nieuw tabblad`);
}

// Shared checkout URL functions (for single URL used by both plans)
async function updateSharedCheckoutUrl(event) {
    event.preventDefault();

    const form = event.target;
    const urlInput = form.querySelector('input[name="checkout_url"]');
    const submitBtn = form.querySelector('button[type="submit"]');
    const checkoutUrl = urlInput.value.trim();

    if (!checkoutUrl) {
        alert('Voer een checkout URL in');
        return;
    }

    // Disable button during save
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '🔄 Bezig met opslaan...';
    submitBtn.disabled = true;

    try {
        // Update BOTH plans with the same URL
        const planIds = ['monthly_7', 'yearly_70'];
        const updatePromises = planIds.map(planId =>
            fetch('/api/admin/payment-configurations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan_id: planId,
                    checkout_url: checkoutUrl
                })
            }).then(r => r.json())
        );

        const results = await Promise.all(updatePromises);

        // Check if all updates succeeded
        const allSuccess = results.every(result => result.success);

        if (allSuccess) {
            adminDashboard.showSuccess(`✅ Checkout URL bijgewerkt voor beide abonnementen`);
            // Refresh data to show updated timestamp
            await adminDashboard.refreshData();
        } else {
            throw new Error('Een of meer updates zijn mislukt');
        }
    } catch (error) {
        console.error('Error updating shared checkout URL:', error);
        adminDashboard.showError('❌ Fout bij opslaan: ' + error.message);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function testSharedCheckoutUrl() {
    const urlInput = document.getElementById('shared-checkout-url');
    const url = urlInput.value.trim();

    if (!url) {
        alert('Geen checkout URL ingesteld');
        return;
    }

    // Open URL in new tab
    window.open(url, '_blank');
    adminDashboard.showSuccess(`🔗 Checkout URL geopend in nieuw tabblad`);
}

// Update tier checkout URLs (2 URLs for 4 plans: Standard and No Limit)
async function updateTierCheckoutUrls(event) {
    event.preventDefault();

    const form = event.target;
    const standardUrl = form.querySelector('#standard-checkout-url').value.trim();
    const noLimitUrl = form.querySelector('#nolimit-checkout-url').value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!standardUrl || !noLimitUrl) {
        alert('Voer beide checkout URLs in');
        return;
    }

    // Disable button during save
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '🔄 Bezig met opslaan...';
    submitBtn.disabled = true;

    try {
        // Update all 4 plans: Standard (monthly_7, yearly_70) and No Limit (monthly_8, yearly_80)
        const updates = [
            { plan_id: 'monthly_7', checkout_url: standardUrl },
            { plan_id: 'yearly_70', checkout_url: standardUrl },
            { plan_id: 'monthly_8', checkout_url: noLimitUrl },
            { plan_id: 'yearly_80', checkout_url: noLimitUrl }
        ];

        const updatePromises = updates.map(update =>
            fetch('/api/admin/payment-configurations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(update)
            }).then(r => r.json())
        );

        const results = await Promise.all(updatePromises);

        // Check if all updates succeeded
        const allSuccess = results.every(result => result.success);

        if (allSuccess) {
            adminDashboard.showSuccess(`✅ Checkout URLs bijgewerkt voor beide tiers (4 plans)`);
            // Refresh data to show updated timestamps
            await adminDashboard.refreshData();
        } else {
            const failedUpdates = results.filter(r => !r.success);
            throw new Error(`${failedUpdates.length} update(s) mislukt`);
        }
    } catch (error) {
        console.error('Error updating tier checkout URLs:', error);
        adminDashboard.showError('❌ Fout bij opslaan: ' + error.message);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Feature 014: Onboarding Video Settings Functions
async function loadOnboardingSettings() {
    try {
        const response = await fetch('/api/settings/onboarding-video');
        if (!response.ok) {
            throw new Error('Fout bij ophalen video instellingen');
        }

        const data = await response.json();
        const urlInput = document.getElementById('onboardingVideoUrl');

        if (urlInput && data.url) {
            urlInput.value = data.url;
        }
    } catch (error) {
        console.error('Error loading onboarding settings:', error);
        showVideoStatus('Fout bij laden van instellingen', 'error');
    }
}

async function saveOnboardingVideo() {
    const urlInput = document.getElementById('onboardingVideoUrl');
    const url = urlInput.value.trim();

    // Validate URL
    if (url && !isValidYouTubeUrl(url)) {
        showVideoStatus('Ongeldige YouTube URL. Ondersteunde formaten: youtube.com, youtu.be, youtube-nocookie.com', 'error');
        return;
    }

    // Show loading state
    const saveBtn = document.getElementById('saveVideoUrl');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '🔄 Bezig met opslaan...';
    saveBtn.disabled = true;

    try {
        const response = await fetch('/api/settings/onboarding-video', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: url || null })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showVideoStatus('✅ Onboarding video URL succesvol opgeslagen', 'success');
        } else {
            throw new Error(result.error || 'Onbekende fout');
        }
    } catch (error) {
        console.error('Error saving onboarding video:', error);
        showVideoStatus('❌ Fout bij opslaan: ' + error.message, 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

function isValidYouTubeUrl(url) {
    // Validate YouTube URL patterns
    const youtubePatterns = [
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
        /^https?:\/\/youtu\.be\/[\w-]+/,
        /^https?:\/\/(www\.)?youtube-nocookie\.com\/embed\/[\w-]+/
    ];

    return youtubePatterns.some(pattern => pattern.test(url));
}

function extractYouTubeId(url) {
    if (!url) return null;

    // Pattern 1: youtube.com/watch?v=VIDEO_ID
    let match = url.match(/[?&]v=([^&]+)/);
    if (match) return match[1];

    // Pattern 2: youtu.be/VIDEO_ID
    match = url.match(/youtu\.be\/([^?]+)/);
    if (match) return match[1];

    // Pattern 3: youtube-nocookie.com/embed/VIDEO_ID
    match = url.match(/youtube-nocookie\.com\/embed\/([^?]+)/);
    if (match) return match[1];

    // Pattern 4: youtube.com/embed/VIDEO_ID
    match = url.match(/youtube\.com\/embed\/([^?]+)/);
    if (match) return match[1];

    return null;
}

function showVideoPreview() {
    const urlInput = document.getElementById('onboardingVideoUrl');
    const url = urlInput.value.trim();

    if (!url) {
        showVideoStatus('Voer eerst een YouTube URL in', 'error');
        return;
    }

    if (!isValidYouTubeUrl(url)) {
        showVideoStatus('Ongeldige YouTube URL', 'error');
        return;
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
        showVideoStatus('Kan video ID niet extraheren uit URL', 'error');
        return;
    }

    // Show preview section
    const previewSection = document.getElementById('videoPreview');
    const previewIframe = document.getElementById('previewIframe');

    previewIframe.src = `https://www.youtube-nocookie.com/embed/${videoId}`;
    previewSection.style.display = 'block';

    showVideoStatus('Preview geladen', 'success');
}

async function clearOnboardingVideo() {
    if (!confirm('Weet je zeker dat je de onboarding video wilt verwijderen?')) {
        return;
    }

    const clearBtn = document.getElementById('clearVideoUrl');
    const originalText = clearBtn.innerHTML;
    clearBtn.innerHTML = '🔄 Bezig...';
    clearBtn.disabled = true;

    try {
        const response = await fetch('/api/settings/onboarding-video', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: null })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            document.getElementById('onboardingVideoUrl').value = '';
            document.getElementById('videoPreview').style.display = 'none';
            document.getElementById('previewIframe').src = '';
            showVideoStatus('✅ Onboarding video verwijderd', 'success');
        } else {
            throw new Error(result.error || 'Onbekende fout');
        }
    } catch (error) {
        console.error('Error clearing onboarding video:', error);
        showVideoStatus('❌ Fout bij verwijderen: ' + error.message, 'error');
    } finally {
        clearBtn.innerHTML = originalText;
        clearBtn.disabled = false;
    }
}

function showVideoStatus(message, type) {
    const statusDiv = document.getElementById('videoUrlStatus');
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';

    if (type === 'success') {
        statusDiv.style.backgroundColor = 'var(--toast-success-bg)';
        statusDiv.style.color = 'var(--toast-success)';
        statusDiv.style.borderLeft = '4px solid var(--toast-success)';
    } else {
        statusDiv.style.backgroundColor = 'var(--toast-error-bg)';
        statusDiv.style.color = 'var(--toast-error)';
        statusDiv.style.borderLeft = '4px solid var(--toast-error)';
    }

    // Hide after 5 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Load onboarding settings when dashboard loads
// Add this call to the AdminDashboard.loadDashboard() method
if (window.addEventListener) {
    window.addEventListener('load', () => {
        // Wait for dashboard to authenticate before loading settings
        setTimeout(() => {
            if (adminDashboard && adminDashboard.isAuthenticated) {
                loadOnboardingSettings();
            }
        }, 1000);
    });
}