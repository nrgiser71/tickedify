class AdminCleanup {
    constructor() {
        this.authenticated = false;
        this.testUsers = [];
        this.selectedUsers = new Set();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthentication();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Control buttons
        document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAll());
        document.getElementById('selectNoneBtn').addEventListener('click', () => this.selectNone());
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadTestUsers());
        document.getElementById('deleteSelectedBtn').addEventListener('click', () => this.deleteSelected());
    }

    async checkAuthentication() {
        try {
            const response = await fetch('/api/admin/test-users');
            if (response.status === 401) {
                this.showLoginSection();
            } else if (response.ok) {
                this.authenticated = true;
                this.showCleanupSection();
                this.loadTestUsers();
            } else {
                throw new Error('Onbekende authenticatie fout');
            }
        } catch (error) {
            console.error('Auth check error:', error);
            this.showError('Fout bij controle authenticatie: ' + error.message);
        }
    }

    async login() {
        const password = document.getElementById('adminPassword').value;
        const loginError = document.getElementById('loginError');
        
        if (!password) {
            loginError.textContent = 'Wachtwoord is vereist';
            loginError.style.display = 'block';
            return;
        }

        try {
            const response = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            if (response.ok) {
                this.authenticated = true;
                loginError.style.display = 'none';
                this.showCleanupSection();
                this.loadTestUsers();
            } else {
                loginError.textContent = 'Incorrect wachtwoord';
                loginError.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = 'Inlog fout: ' + error.message;
            loginError.style.display = 'block';
        }
    }

    showLoginSection() {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('cleanupSection').style.display = 'none';
    }

    showCleanupSection() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('cleanupSection').style.display = 'block';
    }

    async loadTestUsers() {
        this.showLoading('Testgebruikers laden...');
        
        try {
            const response = await fetch('/api/admin/test-users');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.testUsers = data.users || [];
            
            this.hideLoading();
            this.renderUsers();
            this.updateStats();
            
        } catch (error) {
            console.error('Load users error:', error);
            this.hideLoading();
            this.showError('Fout bij laden testgebruikers: ' + error.message);
        }
    }

    renderUsers() {
        const grid = document.getElementById('usersGrid');
        
        if (this.testUsers.length === 0) {
            grid.innerHTML = '<div class="loading">Geen testgebruikers gevonden</div>';
            return;
        }

        grid.innerHTML = '';
        
        this.testUsers.forEach(user => {
            const card = document.createElement('div');
            card.className = `user-card ${this.selectedUsers.has(user.id) ? 'selected' : ''}`;
            
            const isTestUser = this.isTestUser(user.email);
            
            card.innerHTML = `
                <input 
                    type="checkbox" 
                    class="user-checkbox" 
                    data-user-id="${user.id}"
                    ${this.selectedUsers.has(user.id) ? 'checked' : ''}
                >
                <div class="user-info">
                    <div class="user-email">${this.escapeHtml(user.email)}</div>
                    <div class="user-details">
                        <span>Naam: ${this.escapeHtml(user.naam || 'Geen naam')}</span>
                        <span>Aangemaakt: ${this.formatDate(user.created_at)}</span>
                        ${isTestUser ? '<span class="test-indicator">TEST</span>' : ''}
                    </div>
                    <div class="data-preview">
                        <div class="data-item">${user.task_count || 0} taken</div>
                        <div class="data-item">${user.project_count || 0} projecten</div>
                        <div class="data-item">${user.context_count || 0} contexten</div>
                        <div class="data-item">GHL: ${user.ghl_contact_id ? '✅' : '❌'}</div>
                    </div>
                </div>
            `;
            
            // Checkbox change handler
            const checkbox = card.querySelector('.user-checkbox');
            checkbox.addEventListener('change', (e) => {
                this.toggleUserSelection(user.id, e.target.checked);
            });
            
            // Card click handler
            card.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    checkbox.checked = !checkbox.checked;
                    this.toggleUserSelection(user.id, checkbox.checked);
                }
            });
            
            grid.appendChild(card);
        });
        
        document.getElementById('statsSection').style.display = 'block';
    }

    toggleUserSelection(userId, selected) {
        if (selected) {
            this.selectedUsers.add(userId);
        } else {
            this.selectedUsers.delete(userId);
        }
        
        this.updateStats();
        this.updateCardStyles();
    }

    updateCardStyles() {
        const cards = document.querySelectorAll('.user-card');
        cards.forEach(card => {
            const checkbox = card.querySelector('.user-checkbox');
            const userId = checkbox.dataset.userId;
            
            if (this.selectedUsers.has(userId)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }

    selectAll() {
        this.testUsers.forEach(user => {
            this.selectedUsers.add(user.id);
        });
        
        // Update checkboxes
        document.querySelectorAll('.user-checkbox').forEach(checkbox => {
            checkbox.checked = true;
        });
        
        this.updateStats();
        this.updateCardStyles();
    }

    selectNone() {
        this.selectedUsers.clear();
        
        // Update checkboxes
        document.querySelectorAll('.user-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        this.updateStats();
        this.updateCardStyles();
    }

    updateStats() {
        const totalCount = this.testUsers.length;
        const selectedCount = this.selectedUsers.size;
        const selectedUsers = this.testUsers.filter(user => this.selectedUsers.has(user.id));
        const totalTasks = selectedUsers.reduce((sum, user) => sum + (user.task_count || 0), 0);
        
        document.getElementById('totalUsersCount').textContent = totalCount;
        document.getElementById('selectedUsersCount').textContent = selectedCount;
        document.getElementById('totalTasksCount').textContent = totalTasks;
        document.getElementById('deleteCount').textContent = selectedCount;
        
        const deleteBtn = document.getElementById('deleteSelectedBtn');
        deleteBtn.disabled = selectedCount === 0;
    }

    async deleteSelected() {
        if (this.selectedUsers.size === 0) return;
        
        const selectedCount = this.selectedUsers.size;
        const selectedUsers = this.testUsers.filter(user => this.selectedUsers.has(user.id));
        const totalTasks = selectedUsers.reduce((sum, user) => sum + (user.task_count || 0), 0);
        
        const confirmMessage = `
Ben je zeker dat je ${selectedCount} testgebruiker(s) wilt verwijderen?

Dit verwijdert permanent:
• ${selectedCount} gebruikers
• ${totalTasks} taken
• Alle gerelateerde projecten, contexten en data

Deze actie kan NIET ongedaan gemaakt worden!
        `.trim();
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // Second confirmation for safety
        if (!confirm('LAATSTE KANS: Dit verwijdert alles permanent. Doorgaan?')) {
            return;
        }
        
        try {
            this.showLoading('Testgebruikers verwijderen...');
            
            const userIds = Array.from(this.selectedUsers);
            
            const response = await fetch('/api/admin/delete-test-users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userIds }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            this.hideLoading();
            this.showSuccess(`✅ ${result.deleted} testgebruikers succesvol verwijderd`);
            
            // Clear selection and reload
            this.selectedUsers.clear();
            this.loadTestUsers();
            
        } catch (error) {
            console.error('Delete error:', error);
            this.hideLoading();
            this.showError('Fout bij verwijderen: ' + error.message);
        }
    }

    isTestUser(email) {
        if (!email) return false;
        
        const testPatterns = [
            /^test/i,
            /^demo/i,
            /@test\./i,
            /@example\./i,
            /@demo\./i,
            /foo@/i,
            /bar@/i,
            /^example/i
        ];
        
        return testPatterns.some(pattern => pattern.test(email));
    }

    formatDate(dateString) {
        if (!dateString) return 'Onbekend';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading(message) {
        const loadingEl = document.getElementById('loadingMessage');
        loadingEl.textContent = message;
        loadingEl.style.display = 'block';
        
        document.getElementById('statsSection').style.display = 'none';
        this.hideMessages();
    }

    hideLoading() {
        document.getElementById('loadingMessage').style.display = 'none';
    }

    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        this.hideSuccess();
    }

    showSuccess(message) {
        const successEl = document.getElementById('successMessage');
        successEl.textContent = message;
        successEl.style.display = 'block';
        
        this.hideError();
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            this.hideSuccess();
        }, 5000);
    }

    hideError() {
        document.getElementById('errorMessage').style.display = 'none';
    }

    hideSuccess() {
        document.getElementById('successMessage').style.display = 'none';
    }

    hideMessages() {
        this.hideError();
        this.hideSuccess();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new AdminCleanup();
});