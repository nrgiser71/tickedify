// Toast Notification System
class ToastManager {
    constructor() {
        this.container = document.getElementById('toast-container');
        this.toasts = [];
    }

    show(message, type = 'info', duration = 4000) {
        const toast = this.createToast(message, type);
        this.container.appendChild(toast);
        this.toasts.push(toast);

        // Auto dismiss
        const timeoutId = setTimeout(() => {
            this.dismiss(toast);
        }, duration);

        // Click to dismiss
        toast.addEventListener('click', () => {
            clearTimeout(timeoutId);
            this.dismiss(toast);
        });

        return toast;
    }

    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <div class="toast-icon"></div>
            <div class="toast-message">${message}</div>
        `;

        return toast;
    }

    dismiss(toast) {
        toast.classList.add('toast-exit');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
        }, 300); // Match animation duration
    }

    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 6000) {
        return this.show(message, 'error', duration);
    }

    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }

    warning(message, duration = 5000) {
        return this.show(message, 'warning', duration);
    }
}

// Global toast instance
const toast = new ToastManager();

// Tip Toast System for centered, long-duration tips
class TipToast {
    constructor() {
        this.container = null;
        this.currentTip = null;
        this.timeoutId = null;
        this.pausedTime = null;
        this.remainingTime = null;
        this.createContainer();
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'tip-toast-container';
        document.body.appendChild(this.container);
    }
    
    show(message, duration = 20000) {
        // Remove any existing tip
        if (this.currentTip) {
            this.dismiss();
        }
        
        const tip = document.createElement('div');
        tip.className = 'tip-toast';
        tip.innerHTML = `
            <div class="tip-progress" style="animation-duration: ${duration}ms"></div>
            <div class="tip-content">
                <i class="fas fa-lightbulb"></i>
                <span class="tip-message">${message}</span>
                <button class="tip-close">×</button>
            </div>
        `;
        
        this.currentTip = tip;
        this.container.appendChild(tip);
        
        // Animate in
        setTimeout(() => tip.classList.add('tip-toast-show'), 10);
        
        // Auto dismiss after duration
        this.remainingTime = duration;
        this.timeoutId = setTimeout(() => this.dismiss(), duration);
        
        // Pause progress on hover
        tip.addEventListener('mouseenter', () => this.pauseProgress());
        tip.addEventListener('mouseleave', () => this.resumeProgress());
        
        // Close button
        tip.querySelector('.tip-close').addEventListener('click', () => this.dismiss());
    }
    
    pauseProgress() {
        if (!this.currentTip || !this.timeoutId) return;
        
        clearTimeout(this.timeoutId);
        this.pausedTime = Date.now();
        
        // Pause the CSS animation
        const progressBar = this.currentTip.querySelector('.tip-progress');
        if (progressBar) {
            progressBar.style.animationPlayState = 'paused';
        }
    }
    
    resumeProgress() {
        if (!this.currentTip || !this.pausedTime) return;
        
        // Calculate remaining time
        const elapsed = Date.now() - this.pausedTime;
        this.remainingTime = Math.max(0, this.remainingTime - elapsed);
        
        // Resume animation
        const progressBar = this.currentTip.querySelector('.tip-progress');
        if (progressBar) {
            progressBar.style.animationPlayState = 'running';
        }
        
        // Set new timeout for remaining time
        this.timeoutId = setTimeout(() => this.dismiss(), this.remainingTime);
        this.pausedTime = null;
    }
    
    dismiss() {
        if (!this.currentTip) return;
        
        this.currentTip.classList.remove('tip-toast-show');
        
        setTimeout(() => {
            if (this.currentTip && this.currentTip.parentNode) {
                this.currentTip.parentNode.removeChild(this.currentTip);
            }
            this.currentTip = null;
            this.timeoutId = null;
            this.pausedTime = null;
            this.remainingTime = null;
        }, 300);
    }
}

// Global tip toast instance
const tipToast = new TipToast();

// Custom Modal System
class InputModal {
    constructor() {
        this.modal = document.getElementById('inputModal');
        this.titleEl = document.getElementById('inputModalTitle');
        this.labelEl = document.getElementById('inputModalLabel');
        this.inputEl = document.getElementById('inputModalInput');
        this.cancelBtn = document.getElementById('inputModalCancel');
        this.okBtn = document.getElementById('inputModalOk');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.cancelBtn.addEventListener('click', () => this.hide(null));
        this.okBtn.addEventListener('click', () => this.handleOk());
        
        // Enter/Escape keyboard shortcuts
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleOk();
            if (e.key === 'Escape') this.hide(null);
        });
        
        // Click outside to cancel
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide(null);
        });
    }
    
    show(title, label, defaultValue = '') {
        return new Promise((resolve) => {
            this.resolve = resolve;
            this.titleEl.textContent = title;
            this.labelEl.textContent = label;
            this.inputEl.value = defaultValue;
            this.modal.style.display = 'flex';
            this.inputEl.focus();
            this.inputEl.select();
        });
    }
    
    hide(value) {
        this.modal.style.display = 'none';
        if (this.resolve) {
            this.resolve(value);
            this.resolve = null;
        }
    }
    
    handleOk() {
        const value = this.inputEl.value.trim();
        this.hide(value || null);
    }
}

class ConfirmModal {
    constructor() {
        this.modal = document.getElementById('confirmModal');
        this.titleEl = document.getElementById('confirmModalTitle');
        this.messageEl = document.getElementById('confirmModalMessage');
        this.cancelBtn = document.getElementById('confirmModalCancel');
        this.okBtn = document.getElementById('confirmModalOk');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.cancelBtn.addEventListener('click', () => this.hide(false));
        this.okBtn.addEventListener('click', () => this.hide(true));
        
        // Escape to cancel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'flex') {
                this.hide(false);
            }
        });
        
        // Click outside to cancel
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide(false);
        });
    }
    
    show(title, message) {
        return new Promise((resolve) => {
            this.resolve = resolve;
            this.titleEl.textContent = title;
            this.messageEl.textContent = message;
            this.modal.style.display = 'flex';
            this.cancelBtn.focus();
        });
    }
    
    hide(confirmed) {
        this.modal.style.display = 'none';
        if (this.resolve) {
            this.resolve(confirmed);
            this.resolve = null;
        }
    }
}

class ProjectModal {
    constructor() {
        this.modal = document.getElementById('projectModal');
        this.titleEl = document.getElementById('projectModalTitle');
        this.naamEl = document.getElementById('projectModalNaam');
        this.dueDateEl = document.getElementById('projectModalDueDate');
        this.opmerkingenEl = document.getElementById('projectModalOpmerkingen');
        this.cancelBtn = document.getElementById('projectModalCancel');
        this.okBtn = document.getElementById('projectModalOk');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.cancelBtn.addEventListener('click', () => this.hide(null));
        this.okBtn.addEventListener('click', () => this.handleOk());
        
        // Enter to submit when in naam field
        this.naamEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleOk();
        });
        
        // Escape to cancel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'flex') {
                this.hide(null);
            }
        });
        
        // Click outside to cancel
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide(null);
        });
    }
    
    show(title, defaultValues = {}) {
        return new Promise((resolve) => {
            this.resolve = resolve;
            this.titleEl.textContent = title;
            this.naamEl.value = defaultValues.naam || '';
            this.dueDateEl.value = defaultValues.dueDate || '';
            this.opmerkingenEl.value = defaultValues.opmerkingen || '';
            this.modal.style.display = 'flex';
            this.naamEl.focus();
            this.naamEl.select();
        });
    }
    
    hide(value) {
        this.modal.style.display = 'none';
        if (this.resolve) {
            this.resolve(value);
            this.resolve = null;
        }
    }
    
    handleOk() {
        const naam = this.naamEl.value.trim();
        if (!naam) {
            this.naamEl.focus();
            return;
        }
        
        const projectData = {
            naam: naam,
            dueDate: this.dueDateEl.value || null,
            opmerkingen: this.opmerkingenEl.value.trim() || null
        };
        
        this.hide(projectData);
    }
}

// Global modal instances
const inputModal = new InputModal();
const confirmModal = new ConfirmModal();
const projectModal = new ProjectModal();

// Loading Manager System
class LoadingManager {
    constructor() {
        this.overlay = document.getElementById('loadingOverlay');
        this.progressText = document.getElementById('loadingProgressText');
        this.activeOperations = new Set();
        this.loadingStates = new Map(); // Track loading state per component
        this.entertainmentInterval = null;
        this.entertainmentMessages = [];
        this.currentMessageIndex = 0;
        this.minLoadingStartTime = null;
    }

    // Global loading overlay
    show(message = 'Laden...') {
        this.overlay.classList.add('active');
        // Hide progress text when showing regular loading
        if (this.progressText) {
            this.progressText.textContent = '';
            this.progressText.classList.remove('active');
        }
    }

    hide() {
        this.overlay.classList.remove('active');
        // Clean up progress text
        if (this.progressText) {
            this.progressText.textContent = '';
            this.progressText.classList.remove('active');
        }
        // Stop entertainment rotation
        this.stopEntertainmentRotation();
    }

    // Show loading with progress tracking
    showWithProgress(baseMessage, current, total) {
        this.overlay.classList.add('active');
        if (this.progressText) {
            this.progressText.textContent = `${baseMessage} ${current} van ${total}...`;
            this.progressText.classList.add('active');
        }
    }

    // Update only the progress
    updateProgress(baseMessage, current, total) {
        if (this.progressText && this.overlay.classList.contains('active')) {
            this.progressText.textContent = `${baseMessage} ${current} van ${total}...`;
        }
    }

    // Entertainment loading with rotating messages
    showWithEntertainment(baseMessage, entertainmentMessages = [], minTime = 1500) {
        this.minLoadingStartTime = Date.now();
        this.entertainmentMessages = entertainmentMessages.length > 0 ? entertainmentMessages : [
            '🎯 Je planning wordt voorbereid...',
            '⚡ Productiviteit wordt geladen...',
            '🧠 Slimme suggesties worden berekend...',
            '🎨 Interface wordt geperfectioneerd...',
            '🚀 Bijna klaar voor een geweldige dag!',
            '✨ Magie gebeurt achter de schermen...',
            '🔮 De perfecte dag wordt gecreëerd...'
        ];
        
        this.overlay.classList.add('active');
        this.currentMessageIndex = 0;
        
        // Start with base message
        if (this.progressText) {
            this.progressText.textContent = baseMessage;
            this.progressText.classList.add('active');
        }
        
        // Start entertainment rotation after short delay
        setTimeout(() => this.startEntertainmentRotation(), 500);
    }

    startEntertainmentRotation() {
        if (this.entertainmentInterval) {
            clearInterval(this.entertainmentInterval);
        }
        
        this.entertainmentInterval = setInterval(() => {
            if (this.overlay.classList.contains('active') && this.progressText) {
                // Add entertainment animation class
                this.progressText.classList.add('entertainment');
                this.progressText.textContent = this.entertainmentMessages[this.currentMessageIndex];
                this.currentMessageIndex = (this.currentMessageIndex + 1) % this.entertainmentMessages.length;
                
                // Remove animation class after animation completes
                setTimeout(() => {
                    this.progressText.classList.remove('entertainment');
                }, 800);
            }
        }, 800); // Change message every 800ms
    }

    async hideWithMinTime() {
        // Ensure minimum loading time
        if (this.minLoadingStartTime) {
            const elapsed = Date.now() - this.minLoadingStartTime;
            const minTime = 1500; // 1.5 seconds minimum
            
            if (elapsed < minTime) {
                await new Promise(resolve => setTimeout(resolve, minTime - elapsed));
            }
        }
        
        this.hide();
        this.stopEntertainmentRotation();
        this.minLoadingStartTime = null;
    }

    stopEntertainmentRotation() {
        if (this.entertainmentInterval) {
            clearInterval(this.entertainmentInterval);
            this.entertainmentInterval = null;
        }
        this.currentMessageIndex = 0;
    }

    // Operation-based loading (multiple concurrent operations)
    startOperation(operationId, message = 'Laden...') {
        this.activeOperations.add(operationId);
        if (this.activeOperations.size === 1) {
            this.show(message);
        }
    }

    endOperation(operationId) {
        this.activeOperations.delete(operationId);
        if (this.activeOperations.size === 0) {
            this.hide();
        }
    }

    // Button loading state
    setButtonLoading(button, loading = true) {
        if (loading) {
            button.classList.add('btn-loading');
            button.disabled = true;
        } else {
            button.classList.remove('btn-loading');
            button.disabled = false;
        }
    }

    // Section loading state
    setSectionLoading(element, loading = true) {
        if (loading) {
            element.classList.add('loading');
            // Add inline spinner if not present
            if (!element.querySelector('.loading-inline')) {
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'loading-inline';
                loadingDiv.innerHTML = '<div class="loading-spinner-small"></div><span>Laden...</span>';
                element.appendChild(loadingDiv);
            }
        } else {
            element.classList.remove('loading');
            // Remove spinner
            const spinner = element.querySelector('.loading-inline');
            if (spinner) {
                spinner.remove();
            }
        }
    }

    // Skeleton loading for lists
    showSkeleton(container, itemCount = 3) {
        container.innerHTML = '';
        for (let i = 0; i < itemCount; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'loading-skeleton';
            skeleton.innerHTML = `
                <div class="loading-skeleton-icon loading-placeholder"></div>
                <div class="loading-skeleton-text loading-placeholder"></div>
                <div class="loading-skeleton-text-short loading-placeholder"></div>
            `;
            container.appendChild(skeleton);
        }
    }

    // Progress bar for longer operations
    showProgress(container, progress = 0) {
        let progressBar = container.querySelector('.loading-progress');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'loading-progress';
            progressBar.innerHTML = '<div class="loading-progress-bar"></div>';
            container.appendChild(progressBar);
        }
        
        const bar = progressBar.querySelector('.loading-progress-bar');
        bar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }

    // Indeterminate progress
    showIndeterminateProgress(container) {
        let progressBar = container.querySelector('.loading-progress-indeterminate');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'loading-progress loading-progress-indeterminate';
            container.appendChild(progressBar);
        }
    }

    hideProgress(container) {
        const progressBars = container.querySelectorAll('.loading-progress, .loading-progress-indeterminate');
        progressBars.forEach(bar => bar.remove());
    }

    // Async wrapper with automatic loading management
    async withLoading(asyncFunction, options = {}) {
        const {
            operationId = `op_${Date.now()}`,
            showGlobal = true,
            button = null,
            section = null,
            message = 'Laden...'
        } = options;

        try {
            if (showGlobal) {
                this.startOperation(operationId, message);
            }
            if (button) {
                this.setButtonLoading(button, true);
            }
            if (section) {
                this.setSectionLoading(section, true);
            }

            const result = await asyncFunction();
            return result;
        } catch (error) {
            console.error('Loading operation failed:', error);
            throw error;
        } finally {
            if (showGlobal) {
                this.endOperation(operationId);
            }
            if (button) {
                this.setButtonLoading(button, false);
            }
            if (section) {
                this.setSectionLoading(section, false);
            }
        }
    }
}

// Global loading instance
const loading = new LoadingManager();

class Taakbeheer {
    constructor() {
        // Restore last selected list from localStorage, default to inbox
        this.huidigeLijst = this.restoreCurrentList();
        this.taken = [];
        this.projecten = [];
        this.contexten = [];
        this.huidigeTaakId = null;
        this.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        this.touchedFields = new Set(); // Bijhouden welke velden al geïnteracteerd zijn
        this.sortDirection = {}; // Bijhouden van sorteer richting per kolom
        this.subtakenCache = new Map(); // Cache voor subtaken per parent task
        this.toonToekomstigeTaken = this.restoreToekomstToggle(); // Toggle voor toekomstige taken
        this.autoRefreshInterval = null; // Voor inbox auto-refresh
        // Feature flag voor highlighted context menu
        this.ENABLE_HIGHLIGHTED_CONTEXT_MENU = true;
        this.activeCompletions = new Set(); // Track active task completions to prevent race conditions
        this.saveTimeout = null; // Debounce lijst opslaan
        this.isSaving = false; // Prevent parallel saves
        this.bulkModus = false; // Bulk edit mode voor overtijd taken
        this.geselecteerdeTaken = new Set(); // Geselecteerde taken in bulk modus
        this.prevInboxCount = -1; // Track previous inbox count for celebration detection
        this.lastActionWasPlanning = false; // Track if last action was planning a task (for popup trigger)

        // Ctrl-toets tracking voor derde week toggle
        this.ctrlKeyPressed = false;
        this.keydownHandler = null;
        this.keyupHandler = null;

        // Fix: Reset eventsAlreadyBound to ensure bindEvents runs
        this.eventsAlreadyBound = false;

        this.init();
    }

    init() {
        console.log('🚀 Taakbeheer.init() called');
        this.bindEvents();
        this.zetVandaagDatum();
        // Add document click listener to close dropdowns
        document.addEventListener('click', (event) => this.handleDocumentClick(event));
        // Data loading happens after authentication check in AuthManager
    }

    // LocalStorage helpers for remembering current list
    restoreCurrentList() {
        try {
            const saved = localStorage.getItem('tickedify-current-list');
            if (saved) {
                // Validate that it's a known list
                const validLists = ['inbox', 'acties', 'afgewerkte-taken', 'uitgesteld-wekelijks', 
                                  'uitgesteld-maandelijks', 'uitgesteld-3maandelijks', 
                                  'uitgesteld-6maandelijks', 'uitgesteld-jaarlijks', 'opvolgen',
                                  'contextenbeheer', 'dagelijkse-planning'];
                if (validLists.includes(saved)) {
                    console.log(`<i class="fas fa-redo"></i> Restored last selected list: ${saved}`);
                    return saved;
                }
            }
        } catch (error) {
            console.warn('Could not restore current list from localStorage:', error);
        }
        return 'inbox'; // default fallback
    }

    saveCurrentList() {
        try {
            localStorage.setItem('tickedify-current-list', this.huidigeLijst);
        } catch (error) {
            console.warn('Could not save current list to localStorage:', error);
        }
    }

    restoreToekomstToggle() {
        try {
            const saved = localStorage.getItem('tickedify-toon-toekomst');
            return saved === 'true';
        } catch (error) {
            console.warn('Could not restore toekomst toggle from localStorage:', error);
            return false;
        }
    }

    saveToekomstToggle() {
        try {
            localStorage.setItem('tickedify-toon-toekomst', this.toonToekomstigeTaken.toString());
        } catch (error) {
            console.warn('Could not save toekomst toggle to localStorage:', error);
        }
    }

    // Helper functions for date comparisons
    getVandaagDatum() {
        const vandaag = new Date();
        return vandaag.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    getTaakDatumStatus(verschijndatum) {
        if (!verschijndatum) return 'geen-datum';
        
        const vandaag = this.getVandaagDatum();
        const taakDatum = verschijndatum.split('T')[0]; // Ensure YYYY-MM-DD format
        
        if (taakDatum < vandaag) return 'verleden';
        if (taakDatum > vandaag) return 'toekomst';
        return 'vandaag';
    }

    // Filter taken based on date and toggle
    filterTakenOpDatum(taken, forceDateFilter = false) {
        // Apply date filter to actions list or when explicitly requested (planning)
        if (this.huidigeLijst !== 'acties' && !forceDateFilter) {
            return taken; // Only apply date filter to actions list or planning
        }

        return taken.filter(taak => {
            const datumStatus = this.getTaakDatumStatus(taak.verschijndatum);
            
            // Always show tasks without date, today's tasks, and past tasks
            if (datumStatus === 'geen-datum' || datumStatus === 'vandaag' || datumStatus === 'verleden') {
                return true;
            }
            
            // Show future tasks only if toggle is enabled
            if (datumStatus === 'toekomst') {
                return this.toonToekomstigeTaken;
            }
            
            return true;
        });
    }

    getCurrentUserId() {
        return auth && auth.getCurrentUserId() ? auth.getCurrentUserId() : null;
    }

    isLoggedIn() {
        return auth && auth.isLoggedIn() ? true : false;
    }

    async loadUserData() {
        // Called by AuthManager after successful login
        // await this.laadTellingen(); // Disabled - tellers removed from sidebar
        
        // Restore the correct list without showing intermediate states
        const targetList = this.huidigeLijst;
        
        // Immediately set the correct sidebar state to prevent flashing
        this.updateSidebarState(targetList);
        
        // Navigate directly to the restored current list (includes sidebar update)
        await this.navigeerNaarLijst(targetList);
        
        await this.laadProjecten();
        await this.laadContexten();
        
        // Hide loading indicator after app is fully loaded
        if (window.loading) {
            loading.hideGlobal();
        }
    }
    
    async loadBasicMobileUI() {
        // Check if this is a mobile/tablet device
        const isMobile = this.isMobileDevice();
        console.log('📱 loadBasicMobileUI check:', {
            innerWidth: window.innerWidth,
            isMobile,
            userAgent: navigator.userAgent.substring(0, 100)
        });
        
        if (!isMobile) return;
        
        console.log('📱 Loading basic mobile UI for unauthenticated user');
        
        try {
            // Ensure main content structure exists
            this.ensureMainContentStructure();
            
            // Set current list to inbox
            this.huidigeLijst = 'inbox';
            this.saveCurrentList();
            
            // Update sidebar state
            this.updateSidebarState('inbox');
            
            // Update page title (empty for unauthenticated users)
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) {
                pageTitle.textContent = '';
            }
            
            // Clear tasks and render empty state
            this.taken = [];
            await this.renderTaken();
            
            // Initialize mobile sidebar (after HTML structure is created)
            setTimeout(() => {
                this.setupMobileInterface();
            }, 100);
            
            console.log('✅ Basic mobile UI loaded successfully');
        } catch (error) {
            console.error('❌ Error loading basic mobile UI:', error);
        }
    }
    
    ensureMainContentStructure() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.log('❌ Main content element not found - cannot create mobile UI');
            return;
        }
        
        // Check if basic structure exists
        const mainHeader = document.querySelector('.main-header');
        const contentArea = document.querySelector('.content-area');
        const takenContainer = document.querySelector('.taken-container');
        const takenLijst = document.getElementById('takenLijst');
        
        // If structure is missing, create it
        if (!mainHeader || !contentArea || !takenContainer || !takenLijst) {
            console.log('📱 Creating missing main content structure for mobile');
            
            mainContent.innerHTML = `
                <header class="main-header">
                    <button class="hamburger-menu" id="hamburger-menu" aria-label="Toggle menu">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                    <h1 id="page-title"></h1>
                </header>
                
                <div class="content-area">
                    <div class="taak-input-container" id="taak-input-container">
                        <input type="text" id="taakInput" placeholder="Log in om taken toe te voegen..." disabled>
                        <button id="toevoegBtn" disabled>Toevoegen</button>
                    </div>
                    
                    <div class="taken-container">
                        <div style="text-align: center; padding: 40px 20px; color: var(--macos-text-secondary);">
                            <h3>📱 Welkom bij Tickedify</h3>
                            <p>Gebruik het hamburger menu (☰) om te navigeren en in te loggen.</p>
                            <p style="margin-top: 20px; font-size: 14px;">Je kunt inloggen of een account aanmaken via de sidebar.</p>
                        </div>
                        <ul id="takenLijst" style="display: none;"></ul>
                    </div>
                </div>
            `;
            
            console.log('✅ Main content structure created for mobile');
        }
    }
    
    isMobileDevice() {
        // Multiple detection methods for better mobile/tablet detection
        const width = window.innerWidth;
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Check for mobile/tablet user agents
        const isMobileUA = /iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(userAgent);
        const isTabletUA = /ipad|android(?!.*mobile)|tablet|kindle|silk|playbook/i.test(userAgent);
        
        // iOS specific detection
        const isIOS = /ipad|iphone|ipod/i.test(userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 0);
        
        // Width-based detection (with lower threshold for safety)
        const isNarrowScreen = width <= 1400;
        
        const result = hasTouch && (isMobileUA || isTabletUA || isIOS || isNarrowScreen);
        
        console.log('🔍 Mobile device detection:', {
            width,
            hasTouch,
            isMobileUA,
            isTabletUA, 
            isIOS,
            isNarrowScreen,
            result
        });
        
        return result;
    }
    
    setupMobileInterface() {
        console.log('📱 Setting up mobile interface...');
        
        // Inject CSS to force hamburger menu visibility
        this.injectMobileCSS();
        
        // Force hamburger menu visible
        this.forceHamburgerMenuVisible();
        
        // Initialize mobile sidebar with aggressive setup
        this.initializeMobileSidebar();
        
        // Add direct event listeners with multiple event types
        this.bindMobileEvents();
        
        console.log('✅ Mobile interface setup completed');
    }
    
    injectMobileCSS() {
        const style = document.createElement('style');
        style.id = 'mobile-force-css';
        style.textContent = `
            .hamburger-menu {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: auto !important;
                z-index: 1001 !important;
            }
            
            @media (max-width: 1400px) {
                .sidebar {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 350px !important;
                    height: 100vh !important;
                    z-index: 1000 !important;
                    transform: translateX(-100%) !important;
                    transition: transform 0.3s ease !important;
                }
                
                .sidebar.sidebar-open {
                    transform: translateX(0) !important;
                }
                
                .sidebar-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background: rgba(0, 0, 0, 0.5) !important;
                    z-index: 999 !important;
                    display: none !important;
                }
                
                .sidebar-overlay.active {
                    display: block !important;
                }
            }
        `;
        
        // Remove existing mobile CSS if present
        const existing = document.getElementById('mobile-force-css');
        if (existing) existing.remove();
        
        document.head.appendChild(style);
        console.log('📱 Mobile CSS injected');
    }
    
    bindMobileEvents() {
        const hamburgerMenu = document.getElementById('hamburger-menu');
        if (!hamburgerMenu) {
            console.log('❌ No hamburger menu found for event binding');
            return;
        }
        
        // Remove existing listeners first
        hamburgerMenu.replaceWith(hamburgerMenu.cloneNode(true));
        const newHamburgerMenu = document.getElementById('hamburger-menu');
        
        const toggleSidebar = () => {
            console.log('📱 Hamburger menu clicked!');
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            
            if (!sidebar || !overlay) {
                console.log('❌ Sidebar or overlay not found');
                return;
            }
            
            const isOpen = sidebar.classList.contains('sidebar-open');
            
            if (isOpen) {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
                console.log('📱 Sidebar closed');
            } else {
                sidebar.classList.add('sidebar-open');
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
                console.log('📱 Sidebar opened');
            }
        };
        
        // Use only touchend for iOS, with fallback to click for other devices
        let hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        if (hasTouch) {
            // iOS/Touch devices: use touchend only
            newHamburgerMenu.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`📱 Touch event fired: touchend`);
                toggleSidebar();
            });
        } else {
            // Desktop/Non-touch devices: use click
            newHamburgerMenu.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`📱 Click event fired: click`);
                toggleSidebar();
            });
        }
        
        // Also add overlay close handler
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                e.preventDefault();
                toggleSidebar();
            });
        }
        
        console.log('📱 Mobile events bound to hamburger menu');
    }
    
    forceHamburgerMenuVisible() {
        // Force hamburger menu visible via JavaScript for mobile devices
        const hamburgerMenu = document.getElementById('hamburger-menu');
        if (hamburgerMenu) {
            hamburgerMenu.style.display = 'flex';
            console.log('📱 Forced hamburger menu visible via JavaScript');
        }
    }
    
    showDebugInfo(info) {
        // Remove existing debug info
        const existing = document.getElementById('debug-info');
        if (existing) existing.remove();
        
        // Create debug overlay
        const debugDiv = document.createElement('div');
        debugDiv.id = 'debug-info';
        debugDiv.style.cssText = `
            position: fixed;
            top: 60px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 8px;
            font-size: 12px;
            font-family: monospace;
            z-index: 10000;
            max-width: 300px;
            word-break: break-word;
        `;
        
        debugDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">📱 Mobile Detection Debug</div>
            <div>Width: ${info.width}px</div>
            <div>Has Touch: ${info.hasTouch}</div>
            <div>Mobile UA: ${info.isMobileUA}</div>
            <div>Tablet UA: ${info.isTabletUA}</div>
            <div>Is iOS: ${info.isIOS}</div>
            <div>Narrow Screen: ${info.isNarrowScreen}</div>
            <div style="margin-top: 8px; font-weight: bold; color: ${info.result ? '#00ff00' : '#ff0000'};">
                Result: ${info.result}
            </div>
            <div style="margin-top: 8px; font-size: 10px; opacity: 0.7;">
                UA: ${info.userAgent}
            </div>
            <div style="margin-top: 8px; text-align: center;">
                <button onclick="this.parentElement.parentElement.remove()" style="background: #333; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(debugDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (debugDiv.parentNode) {
                debugDiv.remove();
            }
        }, 10000);
    }
    
    updateSidebarState(lijst) {
        // Update actieve lijst in sidebar immediately
        document.querySelectorAll('.lijst-item').forEach(item => {
            item.classList.remove('actief');
        });
        document.querySelectorAll('[data-tool]').forEach(item => {
            item.classList.remove('actief');
        });
        
        const listItem = document.querySelector(`[data-lijst="${lijst}"]`);
        if (listItem) {
            listItem.classList.add('actief');
        }
    }

    bindInboxEvents() {
        const toevoegBtn = document.getElementById('toevoegBtn');
        const taakInput = document.getElementById('taakInput');
        
        if (toevoegBtn && !toevoegBtn.hasAttribute('data-listener-bound')) {
            toevoegBtn.addEventListener('click', () => {
                if (this.huidigeLijst === 'inbox') {
                    this.voegTaakToe();
                }
            });
            toevoegBtn.setAttribute('data-listener-bound', 'true');
        }
        
        if (taakInput && !taakInput.hasAttribute('data-listener-bound')) {
            taakInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && this.huidigeLijst === 'inbox') {
                    this.voegTaakToe();
                }
            });
            taakInput.setAttribute('data-listener-bound', 'true');
        }
    }

    bindEvents() {
        console.log('🔗 bindEvents called - eventsAlreadyBound:', this.eventsAlreadyBound);
        // Prevent multiple event listeners
        if (this.eventsAlreadyBound) {
            console.log('❌ bindEvents: Already bound, returning early');
            return;
        }
        console.log('✅ bindEvents: Setting up event listeners');
        this.eventsAlreadyBound = true;

        // Sidebar navigatie - use event delegation to avoid issues with dynamic content
        document.addEventListener('click', (e) => {
            const listItem = e.target.closest('.lijst-item[data-lijst]');
            if (listItem && !e.defaultPrevented) {
                e.preventDefault();
                const lijst = listItem.dataset.lijst;
                if (lijst) {
                    this.navigeerNaarLijst(lijst);
                }
            }
        });

        // Skip uitgesteld dropdown - now using direct button navigation

        // Tools dropdown removed - Feature 009: items now directly visible

        // Tools menu items - use event delegation
        document.addEventListener('click', (e) => {
            const toolItem = e.target.closest('[data-tool]');
            if (toolItem && !e.defaultPrevented) {
                e.preventDefault();
                const tool = toolItem.dataset.tool;
                this.openTool(tool);
            }
        });

        // Taak toevoegen (alleen voor inbox) - Use dedicated function
        this.bindInboxEvents();

        // Test taken toevoegen
        const testTakenBtn = document.getElementById('testTakenBtn');
        if (testTakenBtn) {
            testTakenBtn.addEventListener('click', () => {
                this.voegTestTakenToe();
            });
        }

        // Planning popup events
        document.getElementById('sluitPopupBtn').addEventListener('click', () => {
            this.sluitPopup();
        });

        // Herhaling popup events
        document.getElementById('sluitHerhalingPopupBtn').addEventListener('click', () => {
            this.sluitHerhalingPopup();
        });

        document.getElementById('herhalingOkBtn').addEventListener('click', () => {
            this.slaHerhalingOp();
        });

        // Event date popup events
        document.getElementById('eventDateOkBtn').addEventListener('click', () => {
            this.confirmEventDate();
        });

        document.getElementById('eventDateCancelBtn').addEventListener('click', () => {
            this.cancelEventDate();
        });

        document.getElementById('nieuwProjectBtn').addEventListener('click', () => {
            this.maakNieuwProject();
        });

        document.getElementById('nieuweContextBtn').addEventListener('click', () => {
            this.maakNieuweContext();
        });

        document.getElementById('maakActieBtn').addEventListener('click', () => {
            this.maakActie();
        });

        // Form validation
        const verplichteVelden = ['taakNaamInput', 'verschijndatum', 'contextSelect', 'duur'];
        verplichteVelden.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => {
                    this.touchedFields.add(fieldId);
                    field.setAttribute('data-touched', 'true');
                    this.updateButtonState();
                });
                field.addEventListener('change', () => {
                    this.touchedFields.add(fieldId);
                    field.setAttribute('data-touched', 'true');
                    this.updateButtonState();
                });
                field.addEventListener('blur', () => {
                    this.touchedFields.add(fieldId);
                    field.setAttribute('data-touched', 'true');
                    this.updateButtonState();
                });
            }
        });

        // Verplaats knoppen
        document.querySelectorAll('.verplaats-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.verplaatsTaak(e.target.dataset.lijst);
            });
        });

        // Popup navigation
        document.getElementById('planningPopup').addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.sluitPopup();
            }
            
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                // Check if subtaak input is active - let subtaak handler deal with it
                const subtaakInput = document.getElementById('subtaak-input');
                if (subtaakInput && document.activeElement === subtaakInput) {
                    return; // Let subtaak handler process this Enter
                }
                e.preventDefault();
                this.probeerOpslaan();
            }
        });
        
        // Initialize F-key shortcuts for planning popup
        this.initPlanningKeyboardShortcuts();

        // Bind herhaling popup events
        document.addEventListener('DOMContentLoaded', () => {
            this.bindHerhalingEvents();
            // Initialize laptop sidebar after DOM is ready
            this.initializeLaptopSidebar();
        });

        // Event date popup keyboard events
        document.getElementById('eventDatePopup').addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelEventDate();
            }
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                this.confirmEventDate();
            }
        });
    }

    bindHerhalingEvents() {
        // Herhaling radio button events  
        document.querySelectorAll('input[name="herhalingType"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateHerhalingFields();
            });
        });

        // Herhaling field change events
        const fieldIds = ['dailyInterval', 'weeklyInterval', 'monthlyDay', 'monthlyInterval', 
                         'monthlyWeekdayPosition', 'monthlyWeekdayDay', 'monthlyWeekdayInterval', 
                         'yearlyDay', 'yearlyMonth', 'yearlyInterval', 'yearlySpecialType', 'yearlySpecialInterval',
                         'eventDays', 'eventDirection', 'eventName'];
        
        fieldIds.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('change', () => {
                    this.updateHerhalingValue();
                });
            }
        });

        // Weekday checkboxes - only one can be selected at a time
        document.querySelectorAll('.weekdag-checkboxes input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    // Uncheck all other weekday checkboxes
                    document.querySelectorAll('.weekdag-checkboxes input[type="checkbox"]').forEach(otherBox => {
                        if (otherBox !== e.target) {
                            otherBox.checked = false;
                        }
                    });
                }
                this.updateHerhalingValue();
            });
        });
    }

    openHerhalingPopup() {
        this.bindHerhalingEvents();
        
        // Als er nog geen herhaling is ingesteld, reset naar 'none'
        const currentValue = document.getElementById('herhalingSelect').value;
        if (!currentValue) {
            document.getElementById('herhalingSelect').value = '';
            document.getElementById('herhalingDisplay').value = 'Geen herhaling';
        }
        
        this.loadHerhalingFromValue();
        document.getElementById('herhalingPopup').style.display = 'flex';
    }

    sluitHerhalingPopup() {
        document.getElementById('herhalingPopup').style.display = 'none';
    }

    slaHerhalingOp() {
        this.updateHerhalingValue();
        const herhalingValue = document.getElementById('herhalingSelect').value;
        const displayText = this.generateHerhalingDisplayText();
        document.getElementById('herhalingDisplay').value = displayText;
        this.sluitHerhalingPopup();
    }

    generateHerhalingDisplayText() {
        const selectedType = document.querySelector('input[name="herhalingType"]:checked')?.value;
        
        switch (selectedType) {
            case '':
                return 'Geen herhaling';
            case 'daily':
                const days = document.getElementById('dailyInterval').value;
                return days === '1' ? 'Elke dag' : `Elke ${days} dagen`;
            case 'workdays':
                return 'Elke werkdag';
            case 'weekly':
                const weeks = document.getElementById('weeklyInterval').value;
                const selectedDays = Array.from(document.querySelectorAll('.weekdag-checkboxes input:checked'))
                    .map(cb => this.getDayName(cb.value));
                const weekText = weeks === '1' ? 'Elke week' : `Elke ${weeks} weken`;
                return selectedDays.length > 0 ? `${weekText} op ${selectedDays.join(', ')}` : weekText;
            case 'monthly':
                const day = document.getElementById('monthlyDay').value;
                const months = document.getElementById('monthlyInterval').value;
                const monthText = months === '1' ? 'maand' : `${months} maanden`;
                return `Dag ${day} van elke ${monthText}`;
            case 'monthly-weekday':
                const position = document.getElementById('monthlyWeekdayPosition').value;
                const weekday = document.getElementById('monthlyWeekdayDay').value;
                const monthlyWeekdayInterval = document.getElementById('monthlyWeekdayInterval').value;
                const positionText = this.getPositionText(position);
                const weekdayText = weekday === 'workday' ? 'werkdag' : this.getDayName(weekday);
                const intervalText = monthlyWeekdayInterval === '1' ? 'maand' : `${monthlyWeekdayInterval} maanden`;
                return `${positionText} ${weekdayText} van elke ${intervalText}`;
            case 'yearly':
                const yearlyDay = document.getElementById('yearlyDay').value;
                const yearlyMonth = document.getElementById('yearlyMonth').value;
                const years = document.getElementById('yearlyInterval').value;
                const monthName = this.getMonthName(yearlyMonth);
                const yearText = years === '1' ? 'jaar' : `${years} jaar`;
                return `${yearlyDay} ${monthName} van elk ${yearText}`;
            case 'yearly-special':
                const yearlySpecialType = document.getElementById('yearlySpecialType').value;
                const yearlySpecialInterval = document.getElementById('yearlySpecialInterval').value;
                const yearlySpecialText = this.getYearlySpecialTypeText(yearlySpecialType);
                const yearlyIntervalText = yearlySpecialInterval === '1' ? 'jaar' : `${yearlySpecialInterval} jaar`;
                return `${yearlySpecialText} van elk ${yearlyIntervalText}`;
            case 'gebeurtenis-gebaseerd':
                const eventDays = document.getElementById('eventDays').value;
                const eventDirection = document.getElementById('eventDirection').value;
                const eventName = document.getElementById('eventName').value.trim();
                const directionText = eventDirection === 'voor' ? 'voor' : 'na';
                return eventName ? `${eventDays} dagen ${directionText} ${eventName}` : `${eventDays} dagen ${directionText} event`;
            default:
                return 'Geen herhaling';
        }
    }

    getDayName(dayNumber) {
        const days = { '1': 'maandag', '2': 'dinsdag', '3': 'woensdag', '4': 'donderdag', '5': 'vrijdag', '6': 'zaterdag', '0': 'zondag' };
        return days[dayNumber] || 'maandag';
    }

    getMonthName(monthNumber) {
        const months = { 
            '1': 'januari', '2': 'februari', '3': 'maart', '4': 'april',
            '5': 'mei', '6': 'juni', '7': 'juli', '8': 'augustus',
            '9': 'september', '10': 'oktober', '11': 'november', '12': 'december'
        };
        return months[monthNumber] || 'januari';
    }

    getPositionText(position) {
        const positions = { 'first': 'Eerste', 'second': 'Tweede', 'third': 'Derde', 'fourth': 'Vierde', 'last': 'Laatste' };
        return positions[position] || 'Eerste';
    }

    getYearlySpecialTypeText(type) {
        const types = { 
            'first-workday': 'Eerste werkdag', 
            'last-workday': 'Laatste werkdag' 
        };
        return types[type] || 'Eerste werkdag';
    }

    updateHerhalingFields() {
        const selectedType = document.querySelector('input[name="herhalingType"]:checked')?.value;
        
        // Disable all fields first
        document.getElementById('dailyInterval').disabled = true;
        document.getElementById('weeklyInterval').disabled = true;
        document.querySelectorAll('.weekdag-checkboxes input').forEach(cb => cb.disabled = true);
        document.getElementById('monthlyDay').disabled = true;
        document.getElementById('monthlyInterval').disabled = true;
        document.getElementById('monthlyWeekdayPosition').disabled = true;
        document.getElementById('monthlyWeekdayDay').disabled = true;
        document.getElementById('monthlyWeekdayInterval').disabled = true;
        document.getElementById('yearlyDay').disabled = true;
        document.getElementById('yearlyMonth').disabled = true;
        document.getElementById('yearlyInterval').disabled = true;
        document.getElementById('yearlySpecialType').disabled = true;
        document.getElementById('yearlySpecialInterval').disabled = true;
        document.getElementById('eventDays').disabled = true;
        document.getElementById('eventDirection').disabled = true;
        document.getElementById('eventName').disabled = true;
        
        // Enable relevant fields based on selection
        switch (selectedType) {
            case 'daily':
                document.getElementById('dailyInterval').disabled = false;
                break;
            case 'weekly':
                document.getElementById('weeklyInterval').disabled = false;
                document.querySelectorAll('.weekdag-checkboxes input').forEach(cb => cb.disabled = false);
                break;
            case 'monthly':
                document.getElementById('monthlyDay').disabled = false;
                document.getElementById('monthlyInterval').disabled = false;
                break;
            case 'monthly-weekday':
                document.getElementById('monthlyWeekdayPosition').disabled = false;
                document.getElementById('monthlyWeekdayDay').disabled = false;
                document.getElementById('monthlyWeekdayInterval').disabled = false;
                break;
            case 'yearly':
                document.getElementById('yearlyDay').disabled = false;
                document.getElementById('yearlyMonth').disabled = false;
                document.getElementById('yearlyInterval').disabled = false;
                break;
            case 'yearly-special':
                document.getElementById('yearlySpecialType').disabled = false;
                document.getElementById('yearlySpecialInterval').disabled = false;
                break;
            case 'gebeurtenis-gebaseerd':
                document.getElementById('eventDays').disabled = false;
                document.getElementById('eventDirection').disabled = false;
                document.getElementById('eventName').disabled = false;
                break;
        }
        
        this.updateHerhalingValue();
    }

    updateHerhalingValue() {
        const selectedType = document.querySelector('input[name="herhalingType"]:checked')?.value;
        let herhalingValue = '';
        
        switch (selectedType) {
            case '':
                herhalingValue = '';
                break;
            case 'daily':
                const dailyInterval = document.getElementById('dailyInterval').value;
                herhalingValue = dailyInterval === '1' ? 'dagelijks' : `daily-${dailyInterval}`;
                break;
            case 'workdays':
                herhalingValue = 'werkdagen';
                break;
            case 'weekly':
                const weeklyInterval = document.getElementById('weeklyInterval').value;
                const selectedDays = Array.from(document.querySelectorAll('.weekdag-checkboxes input:checked'))
                    .map(cb => cb.value).join(',');
                herhalingValue = `weekly-${weeklyInterval}-${selectedDays}`;
                break;
            case 'monthly':
                const monthlyDay = document.getElementById('monthlyDay').value;
                const monthlyInterval = document.getElementById('monthlyInterval').value;
                herhalingValue = `monthly-day-${monthlyDay}-${monthlyInterval}`;
                break;
            case 'monthly-weekday':
                const position = document.getElementById('monthlyWeekdayPosition').value;
                const weekday = document.getElementById('monthlyWeekdayDay').value;
                const monthlyWeekdayInterval = document.getElementById('monthlyWeekdayInterval').value;
                herhalingValue = `monthly-weekday-${position}-${weekday}-${monthlyWeekdayInterval}`;
                break;
            case 'yearly':
                const yearlyDay = document.getElementById('yearlyDay').value;
                const yearlyMonth = document.getElementById('yearlyMonth').value;
                const yearlyInterval = document.getElementById('yearlyInterval').value;
                herhalingValue = `yearly-${yearlyDay}-${yearlyMonth}-${yearlyInterval}`;
                break;
            case 'yearly-special':
                const yearlySpecialType = document.getElementById('yearlySpecialType').value;
                const yearlySpecialInterval = document.getElementById('yearlySpecialInterval').value;
                herhalingValue = `yearly-special-${yearlySpecialType}-${yearlySpecialInterval}`;
                break;
            case 'gebeurtenis-gebaseerd':
                const eventDays = document.getElementById('eventDays').value;
                const eventDirection = document.getElementById('eventDirection').value;
                const eventName = document.getElementById('eventName').value.trim();
                herhalingValue = `event-${eventDays}-${eventDirection}-${eventName}`;
                break;
        }
        
        document.getElementById('herhalingSelect').value = herhalingValue;
    }

    loadHerhalingFromValue() {
        const value = document.getElementById('herhalingSelect').value;
        this.parseHerhalingValue(value);
    }

    getWeekdayName(dayNumber) {
        const days = {
            '0': 'zondag',
            '1': 'maandag', 
            '2': 'dinsdag',
            '3': 'woensdag',
            '4': 'donderdag',
            '5': 'vrijdag',
            '6': 'zaterdag'
        };
        return days[dayNumber] || 'maandag';
    }

    parseHerhalingValue(value) {
        // Reset form first
        document.getElementById('herhalingNone').checked = true;
        document.getElementById('dailyInterval').value = '1';
        document.getElementById('weeklyInterval').value = '1';
        document.getElementById('monthlyDay').value = '1';
        document.getElementById('monthlyInterval').value = '1';
        document.getElementById('monthlyWeekdayPosition').value = 'first';
        document.getElementById('monthlyWeekdayDay').value = '1';
        document.getElementById('monthlyWeekdayInterval').value = '1';
        document.getElementById('yearlyDay').value = '1';
        document.getElementById('yearlyMonth').value = '1';
        document.getElementById('yearlyInterval').value = '1';
        document.getElementById('yearlySpecialType').value = 'first-workday';
        document.getElementById('yearlySpecialInterval').value = '1';
        document.getElementById('eventDays').value = '1';
        document.getElementById('eventDirection').value = 'voor';
        document.getElementById('eventName').value = '';
        document.querySelectorAll('.weekdag-checkboxes input').forEach(cb => cb.checked = false);
        
        if (!value || value === '') {
            document.getElementById('herhalingNone').checked = true;
        } else if (value === 'dagelijks') {
            document.getElementById('herhalingDaily').checked = true;
            document.getElementById('dailyInterval').value = '1';
        } else if (value === 'werkdagen') {
            document.getElementById('herhalingWorkdays').checked = true;
        } else if (value === 'jaarlijks') {
            document.getElementById('herhalingYearly').checked = true;
            document.getElementById('yearlyDay').value = '1';
            document.getElementById('yearlyMonth').value = '1';
            document.getElementById('yearlyInterval').value = '1';
        } else if (value.startsWith('daily-')) {
            document.getElementById('herhalingDaily').checked = true;
            const interval = value.split('-')[1];
            document.getElementById('dailyInterval').value = interval;
        } else if (value.startsWith('weekly-')) {
            document.getElementById('herhalingWeekly').checked = true;
            const parts = value.split('-');
            if (parts.length >= 3) {
                document.getElementById('weeklyInterval').value = parts[1];
                const days = parts[2].split(',');
                days.forEach(day => {
                    if (day) {
                        const checkbox = document.querySelector(`.weekdag-checkboxes input[value="${day}"]`);
                        if (checkbox) checkbox.checked = true;
                    }
                });
            }
        } else if (value.startsWith('monthly-day-')) {
            document.getElementById('herhalingMonthly').checked = true;
            const parts = value.split('-');
            if (parts.length >= 4) {
                document.getElementById('monthlyDay').value = parts[2];
                document.getElementById('monthlyInterval').value = parts[3];
            }
        } else if (value.startsWith('monthly-weekday-')) {
            document.getElementById('herhalingMonthlyWeekday').checked = true;
            const parts = value.split('-');
            if (parts.length >= 5) {
                document.getElementById('monthlyWeekdayPosition').value = parts[2];
                document.getElementById('monthlyWeekdayDay').value = parts[3];
                document.getElementById('monthlyWeekdayInterval').value = parts[4];
            }
        } else if (value.startsWith('yearly-') && !value.startsWith('yearly-special-')) {
            document.getElementById('herhalingYearly').checked = true;
            const parts = value.split('-');
            if (parts.length >= 4) {
                document.getElementById('yearlyDay').value = parts[1];
                document.getElementById('yearlyMonth').value = parts[2];
                document.getElementById('yearlyInterval').value = parts[3];
            }
        } else if (value.startsWith('yearly-special-')) {
            document.getElementById('herhalingYearlySpecial').checked = true;
            const parts = value.split('-');
            if (parts.length >= 4) {
                document.getElementById('yearlySpecialType').value = parts[2] + '-' + parts[3];
                document.getElementById('yearlySpecialInterval').value = parts[4] || '1';
            }
        } else if (value.startsWith('event-')) {
            document.getElementById('herhalingEvent').checked = true;
            const parts = value.split('-');
            if (parts.length >= 4) {
                document.getElementById('eventDays').value = parts[1];
                document.getElementById('eventDirection').value = parts[2];
                document.getElementById('eventName').value = parts.slice(3).join('-');
            }
        }
        
        this.updateHerhalingFields();
    }

    getWeekdayNumber(weekdayName) {
        const days = {
            'zondag': '0',
            'maandag': '1', 
            'dinsdag': '2',
            'woensdag': '3',
            'donderdag': '4',
            'vrijdag': '5',
            'zaterdag': '6'
        };
        return days[weekdayName] || '1';
    }

    getHerhalingDisplayText(value) {
        const herhalingTexts = {
            '': 'Geen herhaling',
            'dagelijks': 'Dagelijks',
            'wekelijks': 'Wekelijks',
            'maandelijks': 'Maandelijks',
            'jaarlijks': 'Jaarlijks',
            'maandag': 'Elke maandag',
            'dinsdag': 'Elke dinsdag',
            'woensdag': 'Elke woensdag',
            'donderdag': 'Elke donderdag',
            'vrijdag': 'Elke vrijdag',
            'zaterdag': 'Elke zaterdag',
            'zondag': 'Elke zondag',
            'eerste-dag-maand': 'Eerste dag van de maand',
            'laatste-dag-maand': 'Laatste dag van de maand',
            'eerste-werkdag-maand': 'Eerste werkdag van de maand',
            'laatste-werkdag-maand': 'Laatste werkdag van de maand',
            'eerste-maandag-maand': 'Eerste maandag',
            'eerste-dinsdag-maand': 'Eerste dinsdag',
            'eerste-woensdag-maand': 'Eerste woensdag',
            'eerste-donderdag-maand': 'Eerste donderdag',
            'eerste-vrijdag-maand': 'Eerste vrijdag',
            'eerste-zaterdag-maand': 'Eerste zaterdag',
            'eerste-zondag-maand': 'Eerste zondag',
            'laatste-maandag-maand': 'Laatste maandag',
            'laatste-dinsdag-maand': 'Laatste dinsdag',
            'laatste-woensdag-maand': 'Laatste woensdag',
            'laatste-donderdag-maand': 'Laatste donderdag',
            'laatste-vrijdag-maand': 'Laatste vrijdag',
            'laatste-zaterdag-maand': 'Laatste zaterdag',
            'laatste-zondag-maand': 'Laatste zondag',
            'eerste-dag-jaar': 'Eerste dag van het jaar',
            'laatste-dag-jaar': 'Laatste dag van het jaar',
            'eerste-werkdag-jaar': 'Eerste werkdag van het jaar',
            'laatste-werkdag-jaar': 'Laatste werkdag van het jaar',
            'om-de-dag': 'Om de dag',
            '2-weken': 'Elke 2 weken',
            '3-weken': 'Elke 3 weken',
            '2-maanden': 'Elke 2 maanden',
            '3-maanden': 'Elke 3 maanden',
            '6-maanden': 'Elke 6 maanden'
        };
        return herhalingTexts[value] || 'Geen herhaling';
    }

    async navigeerNaarLijst(lijst) {
        // If we're coming from contextenbeheer, dagelijkse-planning, or uitgesteld, restore normal structure
        let titleAlreadySet = false;
        if ((this.huidigeLijst === 'contextenbeheer' || 
             this.huidigeLijst === 'dagelijkse-planning' || 
             this.huidigeLijst === 'uitgesteld') && 
            lijst !== 'contextenbeheer' && 
            lijst !== 'dagelijkse-planning' && 
            lijst !== 'uitgesteld') {
            this.restoreNormalContainer(lijst);
            titleAlreadySet = true; // Title is set by restoreNormalContainer
        }

        // Update actieve lijst in sidebar - remove actief from both lijst items and tool items
        document.querySelectorAll('.lijst-item').forEach(item => {
            item.classList.remove('actief');
        });
        document.querySelectorAll('[data-tool]').forEach(item => {
            item.classList.remove('actief');
        });
        
        const listItem = document.querySelector(`[data-lijst="${lijst}"]`);
        if (listItem) {
            listItem.classList.add('actief');
        }

        // Update hoofdtitel
        const titles = {
            'inbox': 'Inbox',
            'acties': 'Acties',
            'projecten': 'Projecten',
            'opvolgen': 'Opvolgen',
            'afgewerkte-taken': 'Afgewerkt',
            'dagelijkse-planning': 'Dagelijkse Planning',
            'uitgesteld': 'Uitgesteld',
            'uitgesteld-wekelijks': 'Wekelijks',
            'uitgesteld-maandelijks': 'Maandelijks',
            'uitgesteld-3maandelijks': '3-maandelijks',
            'uitgesteld-6maandelijks': '6-maandelijks',
            'uitgesteld-jaarlijks': 'Jaarlijks'
        };
        // Only update title if it wasn't already set by restoreNormalContainer
        if (!titleAlreadySet) {
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) {
                pageTitle.textContent = titles[lijst] || lijst;
            }
        }

        // Update input visibility (alleen inbox heeft input)
        const inputContainer = document.getElementById('taak-input-container');
        if (inputContainer) {
            if (lijst === 'inbox') {
                inputContainer.style.display = 'flex';
                // Ensure inbox event listeners are bound after navigation
                this.bindInboxEvents();
            } else {
                inputContainer.style.display = 'none';
            }
        }

        // Laad lijst data
        console.log('📋 SETTING huidigeLijst to:', lijst);
        this.huidigeLijst = lijst;
        console.log('📋 huidigeLijst is now:', this.huidigeLijst);
        this.saveCurrentList(); // Remember the selected list
        await this.laadHuidigeLijst();
    }

    async laadTellingen() {
        // Only load counts if user is logged in
        if (!this.isLoggedIn()) {
            // Reset all counts to 0 for unauthenticated users
            ['inbox', 'acties', 'projecten', 'opvolgen', 'afgewerkte-taken', 
             'uitgesteld-wekelijks', 'uitgesteld-maandelijks', 'uitgesteld-3maandelijks', 
             'uitgesteld-6maandelijks', 'uitgesteld-jaarlijks'].forEach(lijst => {
                const element = document.getElementById(`telling-${lijst}`);
                if (element) {
                    element.textContent = '0';
                }
            });
            return;
        }

        try {
            const response = await fetch('/api/tellingen');
            if (response.ok) {
                const tellingen = await response.json();
                
                // Update tellingen in sidebar
                Object.keys(tellingen).forEach(lijst => {
                    const element = document.getElementById(`telling-${lijst}`);
                    if (element) {
                        element.textContent = tellingen[lijst] || 0;
                    }
                });
                
                // Speciale behandeling voor projecten (projecten-lijst -> projecten)
                if (tellingen['projecten-lijst']) {
                    const projectenElement = document.getElementById('telling-projecten');
                    if (projectenElement) {
                        projectenElement.textContent = tellingen['projecten-lijst'];
                    }
                }
            }
        } catch (error) {
            console.error('Fout bij laden tellingen:', error);
        }
    }

    async renderProjectenLijst(container) {
        if (!container) {
            console.error('renderProjectenLijst: container is null');
            return;
        }
        container.innerHTML = `
            <div class="projecten-container">
                <div class="projecten-header">
                    <button id="nieuwProjectBtnLijst" class="nieuw-btn">+ Nieuw Project</button>
                </div>
                <div class="projecten-lijst" id="projecten-lijst"></div>
            </div>
        `;
        
        await this.renderProjectenItems();
        this.bindProjectenEvents();
    }

    formatDueDateBadge(dueDate) {
        if (!dueDate) return '';
        
        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let badgeClass = 'due-date-badge';
        let text = '';
        
        if (diffDays < 0) {
            badgeClass += ' overdue';
            text = `${Math.abs(diffDays)} dagen te laat`;
        } else if (diffDays === 0) {
            badgeClass += ' today';
            text = 'Vandaag';
        } else if (diffDays === 1) {
            badgeClass += ' tomorrow';
            text = 'Morgen';
        } else if (diffDays <= 7) {
            badgeClass += ' soon';
            text = `Over ${diffDays} dagen`;
        } else {
            badgeClass += ' future';
            text = due.toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' });
        }
        
        return `<span class="${badgeClass}">${text}</span>`;
    }

    async renderProjectenItems() {
        const container = document.getElementById('projecten-lijst');
        if (!container) return;

        container.innerHTML = '';

        // Batch load all task data in parallel - much faster than per-project calls
        const taskCounts = await this.getAllProjectTaskCounts();

        // Render all projects synchronously for instant UI
        for (const project of this.projecten) {
            const div = document.createElement('div');
            div.className = 'project-wrapper';
            div.dataset.id = project.id;
            
            const actiesInfo = taskCounts[project.id] || { open: 0, afgewerkt: 0 };
            const dueDateBadge = this.formatDueDateBadge(project.dueDate);
            
            div.innerHTML = `
                <div class="project-item" onclick="app.toggleProject('${project.id}')">
                    <div class="project-content">
                        <div class="project-naam-row">
                            <span class="project-expand-arrow" id="arrow-${project.id}">▶</span>
                            <div class="project-naam" title="${this.escapeHtml(project.naam)}">${project.naam}</div>
                            ${dueDateBadge}
                        </div>
                        <div class="project-info">${actiesInfo.open} open, ${actiesInfo.afgewerkt} afgewerkt</div>
                    </div>
                    <div class="project-acties" onclick="event.stopPropagation()">
                        <button onclick="app.bewerkProject('${project.id}')" class="bewerk-project-btn" title="Bewerk project">✏️</button>
                        <button onclick="app.verwijderProject('${project.id}')" class="verwijder-btn" title="Verwijder project">×</button>
                    </div>
                </div>
                <div class="project-taken-container" id="taken-${project.id}" style="display: none;">
                    <div class="project-taken-loading">Laden...</div>
                </div>
            `;
            container.appendChild(div);
        }
    }

    async getAllProjectTaskCounts() {
        try {
            // Single batch call - much faster than individual calls per project
            const [actiesResponse, afgewerkteResponse] = await Promise.all([
                fetch('/api/lijst/acties'),
                fetch('/api/lijst/afgewerkte-taken')
            ]);
            
            const taskCounts = {};
            
            // Initialize counts for all projects
            this.projecten.forEach(project => {
                taskCounts[project.id] = { open: 0, afgewerkt: 0 };
            });
            
            // Count open tasks
            if (actiesResponse.ok) {
                const acties = await actiesResponse.json();
                acties.forEach(actie => {
                    if (actie.projectId && taskCounts[actie.projectId]) {
                        taskCounts[actie.projectId].open++;
                    }
                });
            }
            
            // Count completed tasks
            if (afgewerkteResponse.ok) {
                const afgewerkteTaken = await afgewerkteResponse.json();
                afgewerkteTaken.forEach(taak => {
                    if (taak.projectId && taak.type === 'actie' && taskCounts[taak.projectId]) {
                        taskCounts[taak.projectId].afgewerkt++;
                    }
                });
            }
            
            return taskCounts;
        } catch (error) {
            console.error('Fout bij batch laden project task counts:', error);
            return {};
        }
    }

    async telActiesPerProject(projectId) {
        // Legacy function for compatibility - use getAllProjectTaskCounts for batch operations
        const allCounts = await this.getAllProjectTaskCounts();
        return allCounts[projectId] || { open: 0, afgewerkt: 0 };
    }

    bindProjectenEvents() {
        const nieuwBtn = document.getElementById('nieuwProjectBtnLijst');
        if (nieuwBtn) {
            nieuwBtn.addEventListener('click', () => this.maakNieuwProjectViaLijst());
        }
    }

    async maakNieuwProjectViaLijst() {
        const projectData = await projectModal.show('Nieuw Project');
        if (projectData) {
            const nieuwProject = {
                id: this.generateId(),
                naam: projectData.naam,
                aangemaakt: new Date().toISOString(),
                dueDate: projectData.dueDate,
                opmerkingen: projectData.opmerkingen
            };
            
            this.projecten.push(nieuwProject);
            await this.slaProjectenOp();
            await this.renderProjectenItems();
            // await this.laadTellingen(); // Disabled - tellers removed from sidebar
        }
    }

    async bewerkProject(id) {
        const project = this.projecten.find(p => p.id === id);
        if (!project) return;
        
        const defaultValues = {
            naam: project.naam,
            dueDate: project.dueDate || '',
            opmerkingen: project.opmerkingen || ''
        };
        
        const projectData = await projectModal.show('Project Bewerken', defaultValues);
        if (projectData) {
            project.naam = projectData.naam;
            project.dueDate = projectData.dueDate;
            project.opmerkingen = projectData.opmerkingen;
            await this.slaProjectenOp();
            await this.renderProjectenItems();
        }
    }

    async verwijderProject(id) {
        const project = this.projecten.find(p => p.id === id);
        if (!project) return;
        
        const actiesInfo = await this.telActiesPerProject(id);
        const totaalActies = actiesInfo.open + actiesInfo.afgewerkt;
        let bevestigingsTekst = `Weet je zeker dat je project "${project.naam}" wilt verwijderen?`;
        
        if (totaalActies > 0) {
            bevestigingsTekst += `\n\nLet op: Er zijn nog ${totaalActies} ${totaalActies === 1 ? 'actie' : 'acties'} gekoppeld aan dit project (${actiesInfo.open} open, ${actiesInfo.afgewerkt} afgewerkt). Deze zullen hun projectkoppeling verliezen.`;
        }
        
        const bevestiging = await confirmModal.show('Project Verwijderen', bevestigingsTekst);
        if (!bevestiging) return;
        
        this.projecten = this.projecten.filter(p => p.id !== id);
        await this.slaProjectenOp();
        await this.renderProjectenItems();
        // await this.laadTellingen(); // Disabled - tellers removed from sidebar
    }

    async toggleProject(projectId) {
        const container = document.getElementById(`taken-${projectId}`);
        const arrow = document.getElementById(`arrow-${projectId}`);
        
        if (!container || !arrow) return;
        
        if (container.style.display === 'none') {
            // Open project - laad acties
            container.style.display = 'block';
            arrow.textContent = '▼';
            arrow.classList.add('expanded');
            
            await this.laadProjectActies(projectId);
        } else {
            // Sluit project
            container.style.display = 'none';
            arrow.textContent = '▶';
            arrow.classList.remove('expanded');
        }
    }

    async laadProjectActies(projectId) {
        const container = document.getElementById(`taken-${projectId}`);
        if (!container) return;
        
        try {
            // Haal alle acties en afgewerkte taken op voor dit project
            const [actiesResponse, afgewerkteResponse] = await Promise.all([
                fetch('/api/lijst/acties'),
                fetch('/api/lijst/afgewerkte-taken')
            ]);
            
            let openActies = [];
            let afgewerkteActies = [];
            
            if (actiesResponse.ok) {
                const alleActies = await actiesResponse.json();
                openActies = alleActies.filter(actie => actie.projectId === projectId);
            }
            
            if (afgewerkteResponse.ok) {
                const alleAfgewerkte = await afgewerkteResponse.json();
                afgewerkteActies = alleAfgewerkte.filter(taak => taak.projectId === projectId && taak.type === 'actie');
            }
            
            const project = this.projecten.find(p => p.id === projectId);
            this.renderProjectActies(container, openActies, afgewerkteActies, project);
            
        } catch (error) {
            console.error('Fout bij laden project acties:', error);
            container.innerHTML = '<div class="project-taken-error">Fout bij laden acties</div>';
        }
    }

    renderProjectActies(container, openActies, afgewerkteActies, project) {
        let html = '<div class="project-taken-lijst">';
        
        // Project details sectie
        if (project && (project.dueDate || project.opmerkingen)) {
            html += '<div class="project-details-sectie">';
            html += '<h4 class="project-details-header">Project details</h4>';
            html += '<div class="project-details-content">';
            
            if (project.dueDate) {
                const dueDateBadge = this.formatDueDateBadge(project.dueDate);
                html += `<div class="project-detail-item"><strong>Deadline:</strong> ${dueDateBadge}</div>`;
            }
            
            if (project.opmerkingen) {
                html += `<div class="project-detail-item"><strong>Opmerkingen:</strong></div>`;
                html += `<div class="project-opmerkingen">${this.escapeHtml(project.opmerkingen).replace(/\n/g, '<br>')}</div>`;
            }
            
            html += '</div>';
            html += '</div>';
        }
        
        // Open acties
        if (openActies.length > 0) {
            html += '<div class="project-taken-sectie">';
            html += '<h4 class="project-taken-header">Open acties</h4>';
            openActies.forEach(actie => {
                const contextNaam = this.getContextNaam(actie.contextId);
                const datum = new Date(actie.verschijndatum).toLocaleDateString('nl-NL');
                
                const recurringIndicator = actie.herhalingActief ? '<span class="recurring-indicator" title="Herhalende taak"><i class="fas fa-redo"></i></span>' : '';
                html += `
                    <div class="project-actie-item open">
                        <div class="actie-status">
                            <input type="checkbox" onchange="app.taakAfwerkenVanuitProject('${actie.id}', '${container.id}')">
                        </div>
                        <div class="actie-content">
                            <div class="actie-naam" onclick="app.bewerkActieVanuitProject('${actie.id}')" title="${this.escapeHtml(actie.tekst)}">${actie.tekst} ${recurringIndicator}</div>
                            <div class="actie-details">${contextNaam} • ${datum} • ${actie.duur} min</div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // Afgewerkte acties
        if (afgewerkteActies.length > 0) {
            html += '<div class="project-taken-sectie">';
            html += '<h4 class="project-taken-header">Afgewerkte acties</h4>';
            afgewerkteActies.forEach(actie => {
                const contextNaam = this.getContextNaam(actie.contextId);
                const afgewerkDatum = new Date(actie.afgewerkt).toLocaleDateString('nl-NL');
                
                html += `
                    <div class="project-actie-item afgewerkt">
                        <div class="actie-status">
                            <input type="checkbox" checked onchange="app.taakHeropenenVanuitProject('${actie.id}', '${container.id}')">
                        </div>
                        <div class="actie-content">
                            <div class="actie-naam afgewerkt" title="${this.escapeHtml(actie.tekst)}">${actie.tekst}</div>
                            <div class="actie-details">Afgewerkt op ${afgewerkDatum}</div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        if (openActies.length === 0 && afgewerkteActies.length === 0) {
            html += '<div class="project-geen-acties">Geen acties in dit project</div>';
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    async taakAfwerkenVanuitProject(actieId, containerId) {
        try {
            // Haal de actie op uit de acties lijst
            const actiesResponse = await fetch('/api/lijst/acties');
            if (!actiesResponse.ok) return;
            
            const acties = await actiesResponse.json();
            const actie = acties.find(a => a.id === actieId);
            if (!actie) return;
            
            // Markeer als afgewerkt
            actie.afgewerkt = new Date().toISOString();
            
            // Check if this is a recurring task and create next instance
            let nextRecurringTaskId = null;
            let calculatedNextDate = null;
            if (actie.herhalingActief && actie.herhalingType) {
                if (actie.herhalingType.startsWith('event-')) {
                    // Handle event-based recurrence - ask for next event date
                    const nextEventDate = await this.askForNextEventDate(actie);
                    if (nextEventDate) {
                        calculatedNextDate = this.calculateEventBasedDate(nextEventDate, actie.herhalingType);
                        if (calculatedNextDate) {
                            nextRecurringTaskId = await this.createNextRecurringTask(actie, calculatedNextDate);
                        }
                    }
                } else {
                    calculatedNextDate = this.calculateNextRecurringDate(actie.verschijndatum, actie.herhalingType);
                    if (calculatedNextDate) {
                        nextRecurringTaskId = await this.createNextRecurringTask(actie, calculatedNextDate);
                    }
                }
            }
            
            // Verplaats naar afgewerkte taken
            const success = await this.verplaatsTaakNaarAfgewerkt(actie);
            if (!success) {
                toast.error('Fout bij afwerken van taak. Probeer opnieuw.');
                return;
            }
            
            // Only update actions list if no recurring task was created (to avoid overwriting)
            if (!nextRecurringTaskId) {
                const nieuweActies = acties.filter(a => a.id !== actieId);
                await fetch('/api/lijst/acties', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nieuweActies)
                });
            }
            
            // Update tellingen in sidebar
            // await this.laadTellingen(); // Disabled - tellers removed from sidebar
            
            // Herlaad het project om de nieuwe status te tonen, maar behoud de open staat
            const projectId = containerId.replace('taken-', '');
            await this.laadProjectActies(projectId);
            
            // Update alleen de project tellingen, niet de hele lijst (om open staat te behouden)
            await this.updateProjectTellingen();
            
            // Show confirmation for recurring task and refresh lists
            if (nextRecurringTaskId) {
                const nextDateFormatted = new Date(calculatedNextDate).toLocaleDateString('nl-NL');
                
                // Refresh all lists to show the new recurring task
                console.log('<i class="fas fa-redo"></i> Refreshing lists after recurring task creation...');
                // await this.laadTellingen(); // Disabled - tellers removed from sidebar
                
                // Refresh the current view if needed with preserved filters
                if (this.huidigeLijst === 'acties') {
                    await this.preserveActionsFilters(() => this.laadHuidigeLijst());
                }
                
                setTimeout(() => {
                    toast.success(`Taak afgewerkt! Volgende herhaling gepland voor ${nextDateFormatted}`);
                }, 100);
            }
            
        } catch (error) {
            console.error('Fout bij afwerken taak vanuit project:', error);
        }
    }

    async taakHeropenenVanuitProject(actieId, containerId) {
        try {
            // Haal de afgewerkte taak op uit de afgewerkte-taken lijst
            const afgewerkteResponse = await fetch('/api/lijst/afgewerkte-taken');
            if (!afgewerkteResponse.ok) return;
            
            const afgewerkteActies = await afgewerkteResponse.json();
            const actie = afgewerkteActies.find(a => a.id === actieId);
            if (!actie) return;
            
            // Verwijder afwerkt timestamp
            delete actie.afgewerkt;
            
            // Verplaats terug naar acties lijst
            const actiesResponse = await fetch('/api/lijst/acties');
            let huidigeActies = [];
            if (actiesResponse.ok) {
                huidigeActies = await actiesResponse.json();
            }
            
            huidigeActies.push(actie);
            await fetch('/api/lijst/acties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(huidigeActies)
            });
            
            // Verwijder uit afgewerkte taken lijst
            const nieuweAfgewerkteActies = afgewerkteActies.filter(a => a.id !== actieId);
            await fetch('/api/lijst/afgewerkte-taken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nieuweAfgewerkteActies)
            });
            
            // Update tellingen in sidebar
            // await this.laadTellingen(); // Disabled - tellers removed from sidebar
            
            // Herlaad het project om de nieuwe status te tonen, maar behoud de open staat
            const projectId = containerId.replace('taken-', '');
            await this.laadProjectActies(projectId);
            
            // Update alleen de project tellingen, niet de hele lijst (om open staat te behouden)
            await this.updateProjectTellingen();
            
        } catch (error) {
            console.error('Fout bij heropenen taak vanuit project:', error);
        }
    }

    async updateProjectTellingen() {
        // Update alleen de tellingen van projecten zonder de hele lijst opnieuw te renderen
        for (const project of this.projecten) {
            const actiesInfo = await this.telActiesPerProject(project.id);
            const projectElement = document.querySelector(`[data-id="${project.id}"] .project-info`);
            if (projectElement) {
                projectElement.textContent = `${actiesInfo.open} open, ${actiesInfo.afgewerkt} afgewerkt`;
            }
        }
    }

    async bewerkActieVanuitProject(actieId) {
        // Stel de huidige lijst in op acties zodat de edit functie correct werkt
        const huidigeOriginaleLijst = this.huidigeLijst;
        this.huidigeLijst = 'acties';
        
        // Laad de acties
        const response = await fetch('/api/lijst/acties');
        if (response.ok) {
            this.taken = await response.json();
        }
        
        // Bewerk de actie
        await this.bewerkActie(actieId);
        
        // Herstel de originele lijst
        this.huidigeLijst = huidigeOriginaleLijst;
    }

    // Wrapper functie voor onclick handlers - zorg dat async werkt
    bewerkActieWrapper(id) {
        // Use setTimeout to avoid blocking UI and allow async to work
        setTimeout(async () => {
            await this.bewerkActie(id);
        }, 0);
    }

    // Wrapper functie voor planTaak async calls
    planTaakWrapper(id) {
        setTimeout(async () => {
            await this.planTaak(id);
        }, 0);
    }

    // Helper function to preserve scroll position during re-renders
    preserveScrollPosition(callback) {
        // Try multiple selectors to find the correct scroll container
        const scrollContainer = document.querySelector('.taken-container') ||
                               document.querySelector('#acties-lijst') || 
                               document.querySelector('.acties-lijst') || 
                               document.querySelector('.taak-lijst') ||
                               document.querySelector('.main-content');
        const scrollPosition = scrollContainer?.scrollTop || 0;
        const containerInfo = scrollContainer?.id || scrollContainer?.className || 'unknown';
        console.log(`💾 Saving scroll position: ${scrollPosition}px for container:`, containerInfo);
        
        const result = callback();
        
        if (result && typeof result.then === 'function') {
            // If callback returns a promise
            return result.then((value) => {
                if (scrollContainer) {
                    setTimeout(() => {
                        scrollContainer.scrollTop = scrollPosition;
                        const containerInfo = scrollContainer?.id || scrollContainer?.className || 'unknown';
                        console.log(`📍 Restored scroll position: ${scrollPosition}px for container:`, containerInfo);
                    }, 200);
                }
                return value;
            });
        } else {
            // If callback is synchronous
            if (scrollContainer) {
                setTimeout(() => {
                    scrollContainer.scrollTop = scrollPosition;
                    const containerInfo = scrollContainer?.id || scrollContainer?.className || 'unknown';
                    console.log(`📍 Restored scroll position: ${scrollPosition}px for container:`, containerInfo);
                }, 200);
            }
            return result;
        }
    }

    // Helper function to find the actual scroll container that has scrollable content
    findActualScrollContainer() {
        // Try all possible scroll containers in order of specificity
        const containers = [
            document.querySelector('#acties-lijst'),     // Primary: The actual actions list UL
            document.querySelector('.acties-lijst'),     // Secondary: Class-based selector
            document.querySelector('.taken-container'),  // Fallback: Original container
            document.querySelector('.taak-lijst'),       // Alternative: Generic task list
            document.querySelector('.main-content')      // Last resort: Main content area
        ];
        
        for (const container of containers) {
            if (container) {
                // Check if this container actually has scrollable content
                const hasOverflow = container.scrollHeight > container.clientHeight;
                const hasScrollStyle = getComputedStyle(container).overflowY === 'auto' || 
                                      getComputedStyle(container).overflowY === 'scroll';
                
                console.log(`🔍 Checking container:`, {
                    element: container.id || container.className || container.tagName,
                    scrollHeight: container.scrollHeight,
                    clientHeight: container.clientHeight,
                    hasOverflow,
                    hasScrollStyle,
                    scrollTop: container.scrollTop
                });
                
                if (hasOverflow && hasScrollStyle) {
                    return container;
                }
            }
        }
        
        // If no scrollable container found, return the first available one
        return containers.find(c => c) || null;
    }

    // Helper function to preserve actions filter state and scroll position during re-renders
    preserveActionsFilters(callback) {
        // Save current filter values for actions list
        const savedFilters = {
            taakFilter: document.getElementById('taakFilter')?.value || '',
            projectFilter: document.getElementById('projectFilter')?.value || '',
            contextFilter: document.getElementById('contextFilter')?.value || '',
            datumFilter: document.getElementById('datumFilter')?.value || '',
            toekomstToggle: document.getElementById('toonToekomstToggle')?.checked || false
        };
        
        // Find the actual scroll container before DOM changes
        const scrollContainer = this.findActualScrollContainer();
        const savedScrollPosition = scrollContainer?.scrollTop || 0;
        const containerInfo = scrollContainer?.id || scrollContainer?.className || 'unknown';
        console.log(`💾 preserveActionsFilters: Saving scroll position: ${savedScrollPosition}px for container:`, containerInfo);
        
        const result = callback();
        
        const restoreFilters = () => {
            // Restore filter values after re-render
            const taakFilter = document.getElementById('taakFilter');
            const projectFilter = document.getElementById('projectFilter');
            const contextFilter = document.getElementById('contextFilter');
            const datumFilter = document.getElementById('datumFilter');
            const toekomstToggle = document.getElementById('toonToekomstToggle');
            
            if (taakFilter) taakFilter.value = savedFilters.taakFilter;
            if (projectFilter) projectFilter.value = savedFilters.projectFilter;
            if (contextFilter) contextFilter.value = savedFilters.contextFilter;
            if (datumFilter) datumFilter.value = savedFilters.datumFilter;
            if (toekomstToggle) toekomstToggle.checked = savedFilters.toekomstToggle;
            
            // Re-apply filters after restoration
            if (this.huidigeLijst === 'acties') {
                this.renderActiesLijst();
                this.filterActies(); // Apply the restored filter values
            }
            
            // Find the scroll container again after DOM changes and restore scroll position
            setTimeout(() => {
                const newScrollContainer = this.findActualScrollContainer();
                if (newScrollContainer && savedScrollPosition > 0) {
                    newScrollContainer.scrollTop = savedScrollPosition;
                    const containerInfo = newScrollContainer?.id || newScrollContainer?.className || 'unknown';
                    console.log(`📍 preserveActionsFilters: Restored scroll position: ${savedScrollPosition}px for container:`, containerInfo);
                    
                    // Verify scroll was actually set
                    setTimeout(() => {
                        const actualScroll = newScrollContainer.scrollTop;
                        console.log(`✅ Scroll verification: expected ${savedScrollPosition}px, actual ${actualScroll}px`);
                        if (Math.abs(actualScroll - savedScrollPosition) > 5) {
                            console.warn(`⚠️ Scroll restoration failed! Trying alternative method...`);
                            // Try scrolling with behavior smooth as fallback
                            newScrollContainer.scrollTo({
                                top: savedScrollPosition,
                                behavior: 'instant'
                            });
                        }
                    }, 50);
                } else {
                    console.warn(`⚠️ Could not find scroll container for restoration. Container:`, newScrollContainer, 'Position:', savedScrollPosition);
                }
            }, 250); // Increased delay to ensure DOM is fully updated
        };
        
        // Restore filters after DOM updates
        if (result && typeof result.then === 'function') {
            return result.then(() => {
                setTimeout(restoreFilters, 10);
                return result;
            });
        } else {
            setTimeout(restoreFilters, 10);
            return result;
        }
    }

    // Helper function to preserve planning filter state during re-renders
    preservePlanningFilters(callback) {
        // Save current filter values
        const savedFilters = {
            taakFilter: document.getElementById('planningTaakFilter')?.value || '',
            projectFilter: document.getElementById('planningProjectFilter')?.value || '',
            contextFilter: document.getElementById('planningContextFilter')?.value || '',
            prioriteitFilter: document.getElementById('planningPrioriteitFilter')?.value || '',
            datumFilter: document.getElementById('planningDatumFilter')?.value || '',
            duurFilter: document.getElementById('planningDuurFilter')?.value || '',
            toekomstToggle: document.getElementById('planningToekomstToggle')?.checked || false
        };
        
        const result = callback();
        
        const restoreFilters = () => {
            // Restore filter values after re-render
            const taakFilter = document.getElementById('planningTaakFilter');
            const projectFilter = document.getElementById('planningProjectFilter');
            const contextFilter = document.getElementById('planningContextFilter');
            const prioriteitFilter = document.getElementById('planningPrioriteitFilter');
            const datumFilter = document.getElementById('planningDatumFilter');
            const duurFilter = document.getElementById('planningDuurFilter');
            const toekomstToggle = document.getElementById('planningToekomstToggle');
            
            if (taakFilter) taakFilter.value = savedFilters.taakFilter;
            if (projectFilter) projectFilter.value = savedFilters.projectFilter;
            if (contextFilter) contextFilter.value = savedFilters.contextFilter;
            if (prioriteitFilter) prioriteitFilter.value = savedFilters.prioriteitFilter;
            if (datumFilter) datumFilter.value = savedFilters.datumFilter;
            if (duurFilter) duurFilter.value = savedFilters.duurFilter;
            if (toekomstToggle) toekomstToggle.checked = savedFilters.toekomstToggle;
            
            // Re-apply filters
            this.filterPlanningActies();
        };
        
        if (result && typeof result.then === 'function') {
            // If callback returns a promise
            return result.then((value) => {
                setTimeout(restoreFilters, 50);
                return value;
            });
        } else {
            // If callback is synchronous
            setTimeout(restoreFilters, 50);
            return result;
        }
    }

    ensureSidebarVisible() {
        const sidebar = document.querySelector('.sidebar');
        const appLayout = document.querySelector('.app-layout');
        
        if (sidebar) {
            // Reset any inline styles that might hide the sidebar
            sidebar.style.display = '';
            sidebar.style.width = '';
            sidebar.style.visibility = '';
            console.log('ensureSidebarVisible: sidebar styles reset');
        }
        
        if (appLayout) {
            // Reset app layout to normal flex direction
            appLayout.style.flexDirection = '';
            console.log('ensureSidebarVisible: app layout restored');
        }
        
        // Force a quick reflow to ensure changes take effect
        if (sidebar) {
            sidebar.offsetHeight;
        }
    }

    // Mobile sidebar toggle functionality
    initializeMobileSidebar() {
        console.log('📱 initializeMobileSidebar called:', {
            isMobile: this.isMobileDevice(),
            innerWidth: window.innerWidth
        });
        const hamburgerMenu = document.getElementById('hamburger-menu');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        let overlay = document.getElementById('sidebar-overlay');

        // Create overlay if it doesn't exist
        if (!overlay && sidebar && mainContent) {
            overlay = document.createElement('div');
            overlay.id = 'sidebar-overlay';
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            console.log('📱 Created sidebar-overlay element for mobile');
        }

        if (!hamburgerMenu || !sidebar || !mainContent) {
            console.log('❌ Mobile sidebar: Missing required elements', {
                hamburgerMenu: !!hamburgerMenu,
                sidebar: !!sidebar,
                mainContent: !!mainContent
            });
            return;
        }
        
        console.log('✅ Mobile sidebar: All elements found, initializing...');

        const toggleSidebar = () => {
            const isOpen = sidebar.classList.contains('sidebar-open');
            
            if (isOpen) {
                // Close sidebar
                sidebar.classList.remove('sidebar-open');
                mainContent.classList.remove('sidebar-open');
                overlay.classList.remove('active');
                hamburgerMenu.classList.remove('active');
                document.body.style.overflow = '';
            } else {
                // Open sidebar
                sidebar.classList.add('sidebar-open');
                mainContent.classList.add('sidebar-open');
                overlay.classList.add('active');
                hamburgerMenu.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent background scroll
            }
        };

        // Hamburger menu click (both click and touch events for iOS)
        hamburgerMenu.addEventListener('click', toggleSidebar);
        hamburgerMenu.addEventListener('touchend', (e) => {
            e.preventDefault(); // Prevent double-firing with click
            toggleSidebar();
        });

        // Overlay click to close
        overlay.addEventListener('click', () => {
            if (sidebar.classList.contains('sidebar-open')) {
                toggleSidebar();
            }
        });

        // Close sidebar when clicking on sidebar items (for better UX)
        sidebar.addEventListener('click', (e) => {
            if (e.target.closest('.lijst-item') || e.target.closest('[data-tool]')) {
                // Small delay to allow navigation to complete
                setTimeout(() => {
                    if (sidebar.classList.contains('sidebar-open')) {
                        toggleSidebar();
                    }
                }, 100);
            }
        });

        // ESC key to close sidebar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('sidebar-open')) {
                toggleSidebar();
            }
        });

        console.log('Mobile sidebar initialized');
    }

    // F-key shortcuts for planning popup
    initPlanningKeyboardShortcuts() {
        const popup = document.getElementById('planningPopup');
        
        popup.addEventListener('keydown', (e) => {
            
            // Only handle F-keys when popup is visible
            if (popup.style.display === 'none') return;
            
            // Skip if in textarea (except F9 which should focus textarea, and allow other useful F-keys)
            if (e.target.tagName === 'TEXTAREA' && !e.key.match(/^F(2|3|4|6|7|8|9|10)$/)) return;
            
            // FIRST: Handle SHIFT + F combinations (to prevent normal F-key triggers)
            
            // SHIFT + F10 for subtaak toevoegen
            if (e.shiftKey && e.key === 'F10') {
                e.preventDefault();
                e.stopPropagation(); // Stop verder event handling
                // Show/focus subtaak input if subtaken section is visible
                if (subtakenManager && document.getElementById('subtaken-sectie').style.display !== 'none') {
                    subtakenManager.showAddInput();
                    setTimeout(() => {
                        const input = document.getElementById('subtaak-input');
                        if (input) input.focus();
                    }, 50);
                }
                return; // Exit completely
            }
            
            // SHIFT + F1-F4, F6-F7 for quick moves (F5 is reserved for browser refresh)
            if (e.shiftKey && e.key.match(/^F([1-4]|6|7)$/)) {
                e.preventDefault();
                e.stopPropagation(); // Stop verder event handling
                const keyNum = parseInt(e.key.substring(1));
                const lists = [
                    'opvolgen',                // SHIFT+F1
                    'uitgesteld-wekelijks',    // SHIFT+F2
                    'uitgesteld-maandelijks',  // SHIFT+F3
                    'uitgesteld-3maandelijks', // SHIFT+F4
                    'uitgesteld-6maandelijks', // SHIFT+F6 (skip F5)
                    'uitgesteld-jaarlijks'     // SHIFT+F7
                ];
                
                let index;
                if (keyNum <= 4) {
                    index = keyNum - 1;  // F1-F4 map to indices 0-3
                } else if (keyNum === 6) {
                    index = 4;  // F6 maps to index 4 (6-maandelijks)
                } else if (keyNum === 7) {
                    index = 5;  // F7 maps to index 5 (jaarlijks)
                }
                
                if (index !== undefined && lists[index]) {
                    app.quickMove(lists[index]);
                }
                return; // Exit completely
            }
            
            // SECOND: Handle normal F-keys (only when SHIFT is NOT pressed)
            if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
                switch(e.key) {
                    case 'F2':
                        e.preventDefault();
                        app.focusAndOpenDropdown('projectSelect');
                        break;
                        
                    case 'F3':
                        e.preventDefault();
                        app.setDateToday();
                        break;
                        
                    case 'F4':
                        e.preventDefault();
                        app.setDateTomorrow();
                        break;
                        
                    case 'F6':
                        e.preventDefault();
                        const dateField = document.getElementById('verschijndatum');
                        dateField.focus();
                        if (dateField.showPicker) {
                            dateField.showPicker();
                        }
                        break;
                        
                    case 'F7':
                        e.preventDefault();
                        app.focusAndOpenDropdown('contextSelect');
                        break;
                        
                    case 'F8':
                        e.preventDefault();
                        app.cycleDuration();
                        break;
                        
                    case 'F9':
                        e.preventDefault();
                        document.getElementById('opmerkingen').focus();
                        break;
                        
                    case 'F10':
                        e.preventDefault();
                        app.openHerhalingPopup();
                        break;
                }
            }
        });
    }
    
    // Helper function to focus and open dropdown
    focusAndOpenDropdown(selectId) {
        const select = document.getElementById(selectId);
        if (select) {
            select.focus();
            // Trigger mousedown to open dropdown
            const event = new MouseEvent('mousedown', { bubbles: true });
            select.dispatchEvent(event);
        }
    }
    
    // Set date to today
    setDateToday() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('verschijndatum').value = today;
    }
    
    // Set date to tomorrow
    setDateTomorrow() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('verschijndatum').value = tomorrow.toISOString().split('T')[0];
    }
    
    // Cycle through common durations
    cycleDuration() {
        const durations = [5, 10, 15, 20, 30, 45, 60, 90, 120];
        const duurField = document.getElementById('duur');
        const current = parseInt(duurField.value) || 0;
        const currentIndex = durations.indexOf(current);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % durations.length;
        const nextDuration = durations[nextIndex];
        
        duurField.value = nextDuration;
        
        // Show cycle indicator
        this.showDurationCycle(durations, nextIndex);
    }
    
    // Show duration cycle indicator
    showDurationCycle(durations, currentIndex) {
        const duurField = document.getElementById('duur');
        const rect = duurField.getBoundingClientRect();
        
        // Create or reuse indicator
        let indicator = document.getElementById('durationCycleIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'durationCycleIndicator';
            indicator.className = 'duration-cycle-indicator';
            document.body.appendChild(indicator);
        }
        
        // Create cycle display
        const cycleText = durations.map((d, i) => 
            i === currentIndex ? `<span class="current">${d}</span>` : d
        ).join(' → ');
        
        indicator.innerHTML = `F7: ${cycleText}`;
        
        // Position near duration field
        indicator.style.left = `${rect.right + 10}px`;
        indicator.style.top = `${rect.top + (rect.height / 2) - 15}px`;
        
        // Show and hide
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }
    
    // Quick move to list
    quickMove(lijst) {
        this.verplaatsTaak(lijst);
        const lijstNamen = {
            'opvolgen': 'Opvolgen',
            'uitgesteld-wekelijks': 'Wekelijks',
            'uitgesteld-maandelijks': 'Maandelijks',
            'uitgesteld-3maandelijks': '3-maandelijks',
            'uitgesteld-6maandelijks': '6-maandelijks',
            'uitgesteld-jaarlijks': 'Jaarlijks'
        };
        this.showQuickTip(`Verplaatst naar ${lijstNamen[lijst]}`);
    }
    
    // Quick feedback toasts (short, 2 sec)
    showQuickTip(message) {
        toast.info(message, 2000);
    }
    
    // Progressive learning tips (long, 20 sec)
    showLearningTip(message) {
        tipToast.show(message, 20000);
    }
    
    // Track usage for progressive tips
    trackPlanningUsage() {
        const usage = parseInt(localStorage.getItem('planningPopupUsage') || '0');
        const newUsage = usage + 1;
        localStorage.setItem('planningPopupUsage', newUsage);
        
        // Progressive tips
        if (newUsage === 4) {
            setTimeout(() => {
                tipToast.show(
                    "💡 Wist je dat? F-toetsen maken inbox verwerking 3x sneller. " +
                    "F3=vandaag, F4=morgen, F7=cyclische duur. Druk F1 voor volledig overzicht.",
                    20000
                );
            }, 2000);
        } else if (newUsage === 10) {
            setTimeout(() => {
                tipToast.show(
                    "🚀 Power tip: F7 cyclet door populaire duren (5→10→15→20→30→45→60→90→120). " +
                    "SHIFT+F1 t/m F6 voor snel verplaatsen!",
                    20000
                );
            }, 2000);
        } else if (newUsage === 20) {
            setTimeout(() => {
                tipToast.show(
                    "⚡ Master tip: Combineer F-toetsen voor super snelle verwerking. " +
                    "F2→Type→F4→F6→Type→F7→Enter. Geen muis nodig!",
                    20000
                );
            }, 2000);
        }
    }

    handleInboxAutoRefresh() {
        console.log('🔄 handleInboxAutoRefresh called - current list:', this.huidigeLijst);
        
        // Clear existing interval
        if (this.autoRefreshInterval) {
            console.log('🔄 Clearing existing autorefresh interval');
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }

        // Only set up auto-refresh for inbox
        if (this.huidigeLijst === 'inbox') {
            console.log('🔄 Setting up autorefresh for inbox (15 second interval)');
            // Initial load happens in laadHuidigeLijst, so start interval for subsequent refreshes
            this.autoRefreshInterval = setInterval(() => {
                console.log('<i class="fas fa-redo"></i> Auto-refreshing inbox...');
                this.refreshInbox();
            }, 15000); // 15 seconds
        } else {
            console.log('🔄 Not setting up autorefresh - not on inbox list');
        }
    }

    async refreshInbox() {
        // Only refresh if we're still on inbox and user is logged in
        if (this.huidigeLijst !== 'inbox' || !this.isLoggedIn()) {
            return;
        }

        try {
            const response = await fetch('/api/lijst/inbox');
            if (response.ok) {
                const newTaken = await response.json();
                
                // Check if data has changed to avoid unnecessary re-renders
                const hasChanged = JSON.stringify(this.taken) !== JSON.stringify(newTaken);
                
                if (hasChanged) {
                    this.taken = newTaken;
                    
                    // Preserve scroll position during refresh
                    this.preserveScrollPosition(async () => {
                        await this.renderTaken();
                    });
                    
                    // Update tellingen
                    // await this.laadTellingen(); // Disabled - tellers removed from sidebar
                    
                    console.log('<i class="fas fa-check"></i> Inbox refreshed - new data detected');
                } else {
                    console.log('ℹ️ Inbox refresh - no changes');
                }
            }
        } catch (error) {
            console.error('Error refreshing inbox:', error);
        }
    }

    async laadHuidigeLijst() {
        // Stop current hour tracking when leaving daily planning
        if (this.huidigeLijst !== 'dagelijkse-planning') {
            this.stopCurrentHourTracking();
        }
        
        // Clean up any leftover scroll indicators from previous views
        const scrollIndicators = document.querySelectorAll('.scroll-indicator-fixed');
        scrollIndicators.forEach(indicator => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        });
        
        // Ensure sidebar is always visible when loading any list
        this.ensureSidebarVisible();
        
        // Handle auto-refresh for inbox
        this.handleInboxAutoRefresh();
        
        // Only load data if user is logged in
        if (!this.isLoggedIn()) {
            this.taken = [];
            await this.renderTaken();
            return;
        }

        // Use entertainment loading for dagelijkse planning
        if (this.huidigeLijst === 'dagelijkse-planning') {
            const planningMessages = [
                '🎯 Je dagplanning wordt voorbereid...',
                '📅 Taken worden georganiseerd...',
                '⏰ Tijdslots worden berekend...',
                '🎨 De perfecte dag wordt ontworpen...',
                '✨ Prioriteiten worden gerangschikt...',
                '🚀 Productiviteitsmagie gebeurt...',
                '🔮 Je ideale schema wordt gecreëerd...'
            ];
            
            loading.showWithEntertainment('🎯 Dagelijkse planning laden...', planningMessages);
            
            try {
                const result = await this.loadPlanningData();
                await loading.hideWithMinTime();
                return result;
            } catch (error) {
                loading.hide();
                throw error;
            }
        }

        return await loading.withLoading(async () => {
            try {
                if (this.huidigeLijst === 'projecten') {
                    // Voor projecten laden we de projecten lijst
                    const response = await fetch('/api/lijst/projecten-lijst');
                    if (response.ok) {
                        this.projecten = await response.json();
                    }
                    this.taken = []; // Projecten hebben geen taken
                } else if (this.huidigeLijst === 'uitgesteld') {
                    // Voor uitgesteld laden we alle uitgesteld lijsten
                    this.taken = []; // Will be loaded per section in accordion
                    await this.renderUitgesteldConsolidated();
                    return; // Skip normal renderTaken
                } else {
                    const response = await fetch(`/api/lijst/${this.huidigeLijst}`);
                    if (response.ok) {
                        let taken = await response.json();
                        console.log(`🔍 DEBUG laadHuidigeLijst: Ontvangen ${taken.length} taken van API voor lijst "${this.huidigeLijst}"`);
                        const teamBuildingInAPI = taken.find(t => t.tekst && t.tekst.toLowerCase().includes('team building'));
                        console.log('🔍 DEBUG laadHuidigeLijst: Team building in API data:', teamBuildingInAPI ? teamBuildingInAPI.id : 'NIET GEVONDEN');
                        
                        // Apply date filter only for actions list
                        this.taken = this.filterTakenOpDatum(taken);
                        console.log(`🔍 DEBUG laadHuidigeLijst: Na filter: ${this.taken.length} taken behouden`);
                        const teamBuildingNaFilter = this.taken.find(t => t.tekst && t.tekst.toLowerCase().includes('team building'));
                        console.log('🔍 DEBUG laadHuidigeLijst: Team building na filter:', teamBuildingNaFilter ? teamBuildingNaFilter.id : 'WEGGEFILTER!');
                        
                        if (teamBuildingInAPI && !teamBuildingNaFilter) {
                            console.log('🔍 DEBUG: Team building taak is weggefilter! Mogelijke oorzaken:');
                            console.log('   - Verschijndatum:', teamBuildingInAPI.verschijndatum);
                            console.log('   - Datum status:', this.getTaakDatumStatus(teamBuildingInAPI.verschijndatum));
                            console.log('   - Toon toekomstige taken:', this.toonToekomstigeTaken);
                            console.log('💡 TIP: Vink "Toon toekomstige taken" aan om taken van morgen en later te zien!');
                        }
                    } else {
                        this.taken = [];
                    }
                }
                await this.renderTaken();
            } catch (error) {
                console.error('Fout bij laden lijst:', error);
                this.taken = [];
                await this.renderTaken();
            }
        }, {
            operationId: 'load-list',
            message: 'Lijst laden...'
        });
        
        // No need for button visibility updates - button is hardcoded in acties lijst
    }

    async loadPlanningData() {
        // Specialized loading function for dagelijkse planning
        // This directly renders the dagelijkse planning interface without loading tasks
        
        try {
            // Don't load tasks data - dagelijkse planning has its own data loading
            this.taken = [];
            
            // Render the dagelijkse planning interface (which handles its own data loading)
            await this.renderTaken();
            
        } catch (error) {
            console.error('Fout bij laden dagelijkse planning:', error);
            this.taken = [];
            await this.renderTaken();
        }
    }

    async voegTaakToe() {
        console.log('🔍 voegTaakToe called - huidigeLijst:', this.huidigeLijst);
        if (this.huidigeLijst !== 'inbox') {
            console.log('❌ Not in inbox, returning');
            return;
        }
        
        // Check if user is logged in
        const isLoggedIn = this.isLoggedIn();
        console.log('🔐 Login check - isLoggedIn:', isLoggedIn, 'auth exists:', !!auth, 'auth.isAuthenticated:', auth?.isAuthenticated);
        if (!isLoggedIn) {
            toast.warning('Log in om taken toe te voegen.');
            return;
        }
        
        const input = document.getElementById('taakInput');
        const tekst = input.value.trim();
        console.log('📝 Input tekst:', tekst);
        
        if (tekst) {
            await loading.withLoading(async () => {
                const nieuweTaak = {
                    id: this.generateId(),
                    tekst: tekst,
                    aangemaakt: new Date().toISOString(),
                    lijst: 'inbox'
                };
                
                // Create task on server
                console.log('🚀 Sending task to server:', nieuweTaak);
                const response = await fetch('/api/taak/add-to-inbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nieuweTaak)
                });
                
                console.log('📡 Server response status:', response.status, response.statusText);
                
                if (response.ok) {
                    const responseData = await response.json();
                    console.log('✅ Server response data:', responseData);
                    
                    // Refresh list from server to ensure consistency
                    await this.laadHuidigeLijst();
                    
                    input.value = '';
                    input.focus();
                    toast.success('Taak toegevoegd!');
                } else {
                    const errorText = await response.text();
                    console.error('❌ Server error:', response.status, errorText);
                    toast.error(`Fout bij toevoegen van taak (${response.status}): ${errorText}`);
                }
            }, {
                operationId: 'add-task',
                showGlobal: true,
                message: 'Taak toevoegen...'
            });
        }
    }

    async renderTaken() {
        // Skip rendering for unauthenticated users
        if (!auth || !auth.isAuthenticated) {
            const container = document.getElementById('takenLijst');
            if (container) {
                container.innerHTML = '';
            }
            return;
        }
        
        let container = document.getElementById('takenLijst');
        
        if (!container) {
            console.log('renderTaken: takenLijst not found, attempting to restore normal container...');
            // Restore normal structure if coming from daily planning or search
            this.restoreNormalContainer();
            container = document.getElementById('takenLijst');
            
            if (!container) {
                console.error('renderTaken: could not restore takenLijst container');
                console.log('DOM state after restore attempt:', {
                    contentArea: !!document.querySelector('.content-area'),
                    mainContent: !!document.querySelector('.main-content'),
                    dailyPlanning: !!document.querySelector('.dagelijkse-planning-layout'),
                    takenContainer: !!document.querySelector('.taken-container')
                });
                return;
            } else {
                console.log('renderTaken: successfully restored takenLijst container');
            }
        }
        
        if (this.huidigeLijst === 'acties') {
            this.renderActiesTable(container);
        } else if (this.huidigeLijst === 'dagelijkse-planning') {
            // Don't call renderDagelijksePlanning if already in daily planning view
            // This prevents UI flashing when deleting items
            if (!document.querySelector('.dagelijkse-planning-layout')) {
                // For daily planning, use the main content container instead of takenLijst
                // because renderDagelijksePlanning replaces the entire structure
                const mainContainer = document.querySelector('.main-content') || container;
                await this.renderDagelijksePlanning(mainContainer);
            }
            // If we're already in daily planning, do nothing (items are updated locally)
        } else if (this.huidigeLijst === 'projecten') {
            await this.renderProjectenLijst(container);
        } else if (this.isUitgesteldLijst(this.huidigeLijst)) {
            this.renderUitgesteldLijst(container);
        } else {
            this.renderStandaardLijst(container);
        }
    }

    isUitgesteldLijst(lijst) {
        return lijst && lijst.startsWith('uitgesteld-');
    }

    renderUitgesteldLijst(container) {
        if (!container) {
            console.error('renderUitgesteldLijst: container is null');
            return;
        }
        // Use same rich table format as actions list
        container.innerHTML = `
            <div class="acties-filters">
                <div class="filter-groep">
                    <label>Taak:</label>
                    <input type="text" id="taakFilter" placeholder="Zoek in taak tekst...">
                </div>
                <div class="filter-groep">
                    <label>Project:</label>
                    <select id="projectFilter">
                        <option value="">Alle projecten</option>
                    </select>
                </div>
                <div class="filter-groep">
                    <label>Context:</label>
                    <select id="contextFilter">
                        <option value="">Alle contexten</option>
                    </select>
                </div>
                <div class="filter-groep">
                    <label>Datum:</label>
                    <input type="date" id="datumFilter">
                </div>
            </div>
            <ul id="uitgesteld-lijst" class="taak-lijst"></ul>
        `;

        this.vulFilterDropdowns();
        this.renderUitgesteldItems();
        this.bindActiesEvents(); // Same events as actions table
    }

    renderUitgesteldItems() {
        const lijst = document.getElementById('uitgesteld-lijst');
        if (!lijst) return;

        lijst.innerHTML = '';

        // Oude forEach loop verwijderd - de echte forEach staat verderop met sortedTaken
    }
    
    renderUitgesteldRows() {
        const tbody = document.getElementById('uitgesteld-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.taken.forEach(taak => {
            const tr = document.createElement('tr');
            tr.className = 'actie-row';
            tr.dataset.id = taak.id;
            
            const projectNaam = this.getProjectNaam(taak.projectId);
            const contextNaam = this.getContextNaam(taak.contextId);
            const datum = taak.verschijndatum ? new Date(taak.verschijndatum).toLocaleDateString('nl-NL') : '';
            const recurringIndicator = taak.herhalingActief ? ' <span class="recurring-indicator" title="Herhalende taak"><i class="fas fa-redo"></i></span>' : '';
            const duurText = taak.duur ? `${taak.duur} min` : '';
            const tooltipContent = taak.opmerkingen ? taak.opmerkingen.replace(/'/g, '&apos;') : '';
            
            // Determine if checkbox should be checked (for completed tasks)
            const isCompleted = taak.afgewerkt;
            const checkboxChecked = isCompleted ? 'checked' : '';
            
            tr.innerHTML = `
                <td>
                    <input type="checkbox" ${checkboxChecked} onchange="app.taakAfwerken('${taak.id}')">
                </td>
                <td class="actie-tekst" onclick="app.bewerk('${taak.id}')" title="${tooltipContent}">
                    ${taak.tekst}${recurringIndicator}
                </td>
                <td class="actie-project">${projectNaam}</td>
                <td class="actie-context">${contextNaam}</td>
                <td class="actie-datum">${datum}</td>
                <td class="actie-duur">${duurText}</td>
                <td class="actie-buttons">
                    <!-- Drag & drop naar inbox/opvolgen via floating panel -->
                </td>
            `;

            tbody.appendChild(tr);
        });
    }

    getVerplaatsOpties(taakId) {
        const alleOpties = [
            { key: 'inbox', label: 'Inbox' },
            { key: 'uitgesteld-wekelijks', label: 'Wekelijks' },
            { key: 'uitgesteld-maandelijks', label: 'Maandelijks' },
            { key: 'uitgesteld-3maandelijks', label: '3-maandelijks' },
            { key: 'uitgesteld-6maandelijks', label: '6-maandelijks' },
            { key: 'uitgesteld-jaarlijks', label: 'Jaarlijks' }
        ];

        return alleOpties
            .filter(optie => optie.key !== this.huidigeLijst)
            .map(optie => `<button onclick="app.verplaatsUitgesteldeTaak('${taakId}', '${optie.key}')">${optie.label}</button>`)
            .join('');
    }


    bindUitgesteldDropdownEvents() {
        // Close verplaats dropdowns bij klik buiten
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.verplaats-dropdown')) {
                this.sluitAlleDropdowns();
            }
        });
    }

    sluitAlleDropdowns() {
        document.querySelectorAll('.verplaats-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }

    // Close dropdowns when clicking outside
    handleDocumentClick(event) {
        const isVerplaatsButton = event.target.closest('.verplaats-btn-small');
        const isVerplaatsMenu = event.target.closest('.verplaats-menu');
        
        if (!isVerplaatsButton && !isVerplaatsMenu) {
            this.sluitAlleDropdowns();
        }
    }

    // Toggle future tasks display
    async toggleToekomstigeTaken() {
        this.toonToekomstigeTaken = !this.toonToekomstigeTaken;
        this.saveToekomstToggle();
        // Reload the current list to apply the filter
        await this.laadHuidigeLijst();
    }

    // Toggle future tasks display for planning
    async togglePlanningToekomstigeTaken() {
        await loading.withLoading(async () => {
            this.toonToekomstigeTaken = !this.toonToekomstigeTaken;
            this.saveToekomstToggle();
            // Re-render daily planning to apply the filter
            const container = document.querySelector('.main-content');
            if (container) {
                await this.renderDagelijksePlanning(container);
            }
        }, {
            operationId: 'toggle-toekomstige-taken',
            showGlobal: true,
            message: this.toonToekomstigeTaken ? 'Toekomstige taken verbergen...' : 'Toekomstige taken tonen...'
        });
    }

    async renderActiesTable(container) {
        if (!container) {
            console.error('renderActiesTable: container is null');
            return;
        }
        
        // Add filters at the top
        container.innerHTML = `
            <div class="acties-filters">
                <div class="filter-groep">
                    <label>Taak:</label>
                    <input type="text" id="taakFilter" placeholder="Zoek in taak tekst...">
                </div>
                <div class="filter-groep">
                    <label>Project:</label>
                    <select id="projectFilter">
                        <option value="">Alle projecten</option>
                    </select>
                </div>
                <div class="filter-groep">
                    <label>Context:</label>
                    <select id="contextFilter">
                        <option value="">Alle contexten</option>
                    </select>
                </div>
                <div class="filter-groep">
                    <label>Datum:</label>
                    <input type="date" id="datumFilter">
                </div>
                <div class="filter-groep">
                    <label>Prioriteit:</label>
                    <select id="prioriteitFilter" class="prioriteit-filter">
                        <option value="">Alle prioriteiten</option>
                        <option value="hoog">🔴 Hoog</option>
                        <option value="gemiddeld">🟠 Gemiddeld</option>
                        <option value="laag">⚪ Laag</option>
                    </select>
                </div>
                <label class="simple-checkbox">
                    <input type="checkbox" id="toonToekomstToggle" ${this.toonToekomstigeTaken ? 'checked' : ''}>
                    Toon toekomstige taken
                </label>
                <div class="filter-groep" style="display: none;">
                    <button onclick="deleteAllTasks()" 
                            style="background: #ff3b30; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">
                        🗑️ Alles Wissen (Tijdelijk)
                    </button>
                </div>
            </div>
            <div class="bulk-controls-container">
                <button id="bulk-mode-toggle" class="bulk-mode-toggle" onclick="window.toggleBulkModus()">
                    Bulk bewerken
                </button>
            </div>
            <ul id="acties-lijst" class="taak-lijst"></ul>
            <div id="bulk-toolbar" class="bulk-toolbar" style="display: none;">
                <div class="bulk-toolbar-content">
                    <div class="bulk-selection-info">
                        <span id="bulk-selection-count">0 taken geselecteerd</span>
                    </div>
                    <div class="bulk-actions">
                        ${this.getBulkVerplaatsKnoppen()}
                    </div>
                    <button onclick="window.toggleBulkModus()" class="bulk-cancel-btn">Annuleren</button>
                </div>
            </div>
        `;

        await this.vulFilterDropdowns();
        this.renderActiesLijst();
        this.bindActiesEvents();
    }

    renderActiesLijst() {
        console.log('🚨 DEBUG: renderActiesLijst() wordt aangeroepen!');
        const lijst = document.getElementById('acties-lijst');
        if (!lijst) {
            console.error('🚨 DEBUG: acties-lijst element NIET GEVONDEN!');
            return;
        }
        console.log('🚨 DEBUG: acties-lijst element gevonden, gaat HTML genereren...');

        lijst.innerHTML = '';

        console.log('🔍 DEBUG renderActiesLijst: Total taken in this.taken:', this.taken.length);
        const teamBuildingTaak = this.taken.find(t => t.tekst && t.tekst.toLowerCase().includes('team building'));
        console.log('🔍 DEBUG renderActiesLijst: Team building taak gevonden:', teamBuildingTaak ? teamBuildingTaak.id : 'NIET GEVONDEN');
        if (teamBuildingTaak) {
            console.log('🔍 DEBUG renderActiesLijst: Team building taak details:', teamBuildingTaak);
        }

        // Sort actions by date (ascending) - tasks without date go to bottom
        const sortedTaken = [...this.taken].sort((a, b) => {
            if (!a.verschijndatum && !b.verschijndatum) return 0;
            if (!a.verschijndatum) return 1; // Tasks without date go to bottom
            if (!b.verschijndatum) return -1;
            return new Date(a.verschijndatum) - new Date(b.verschijndatum);
        });

        sortedTaken.forEach(taak => {
            const li = document.createElement('li');
            li.className = 'taak-item actie-item';
            li.dataset.id = taak.id;
            
            const projectNaam = this.getProjectNaam(taak.projectId);
            const contextNaam = this.getContextNaam(taak.contextId);
            const datum = taak.verschijndatum ? new Date(taak.verschijndatum).toLocaleDateString('nl-NL') : '';
            const recurringIndicator = taak.herhalingActief ? ' <span class="recurring-indicator" title="Herhalende taak"><i class="fas fa-redo"></i></span>' : '';
            
            // Datum status indicator
            const datumStatus = this.getTaakDatumStatus(taak.verschijndatum);
            let datumIndicator = '';
            let extraClass = '';
            
            if (datumStatus === 'verleden') {
                datumIndicator = '<i class="ti ti-alert-triangle"></i>';
                extraClass = ' overdue';
            } else if (datumStatus === 'vandaag') {
                datumIndicator = '<i class="ti ti-calendar"></i>';
                extraClass = ' today';
            } else if (datumStatus === 'toekomst') {
                datumIndicator = '🔮';
                extraClass = ' future';
            }
            
            li.className += extraClass;
            
            // Build extra info line
            let extraInfo = [];
            if (projectNaam) extraInfo.push(`<i class="ti ti-folder"></i> ${projectNaam}`);
            if (contextNaam) extraInfo.push(`🏷️ ${contextNaam}`);
            if (datum) extraInfo.push(`${datumIndicator} ${datum}`);
            if (taak.duur) extraInfo.push(`⏱️ ${taak.duur} min`);
            if (taak.bijlagenCount && taak.bijlagenCount > 0) {
                extraInfo.push(`<span class="bijlagen-indicator" title="${taak.bijlagenCount} bijlage${taak.bijlagenCount > 1 ? 'n' : ''}"><i class="fas fa-paperclip"></i> ${taak.bijlagenCount}</span>`);
            }
            
            const extraInfoHtml = extraInfo.length > 0 ? 
                `<div class="taak-extra-info">${extraInfo.join(' • ')}</div>` : '';
            
            // In bulk modus: toon selectie cirkels in plaats van checkboxes
            const checkboxHtml = this.bulkModus ?
                `<div class="selectie-circle ${this.geselecteerdeTaken.has(taak.id) ? 'geselecteerd' : ''}" onclick="window.toggleTaakSelectie('${taak.id}')"></div>` :
                `<input type="checkbox" id="taak-${taak.id}" onchange="app.taakAfwerken('${taak.id}')">`;

            li.innerHTML = `
                <div class="drag-handle" draggable="true" title="Sleep om te verplaatsen">
                    <div class="drag-dots">⋮⋮</div>
                </div>
                <div class="taak-checkbox">
                    ${checkboxHtml}
                </div>
                <div class="taak-content" data-taak-id="${taak.id}" onclick="app.bewerkActieWrapper('${taak.id}')" style="cursor: pointer;" title="${taak.opmerkingen ? this.escapeHtml(taak.opmerkingen) : 'Klik om te bewerken'}">
                    <div class="taak-titel">${this.getPrioriteitIndicator(taak.prioriteit)}${taak.tekst}${recurringIndicator}</div>
                    ${extraInfoHtml}
                </div>
                <div class="taak-acties">
                    <button onclick="app.toonActiesMenu('${taak.id}', 'acties', null, null, this)" class="acties-btn" title="Acties"><i class="fas fa-ellipsis-v"></i></button>
                    <button onclick="app.verwijderTaak('${taak.id}')" class="verwijder-btn" title="Verwijder taak">×</button>
                </div>
            `;
            
            // Add bulk-selected class if needed
            if (this.bulkModus && this.geselecteerdeTaken.has(taak.id)) {
                li.classList.add('bulk-selected');
            }
            
            lijst.appendChild(li);
        });

        // Voeg context menu functionaliteit toe aan alle taak items
        this.addContextMenuToTaskItems();
        
        // Setup drag & drop functionaliteit voor acties
        this.setupActiesDragFunctionality();
    }

    renderActiesRows() {
        const tbody = document.getElementById('acties-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.taken.forEach(taak => {
            const tr = document.createElement('tr');
            tr.className = 'actie-row';
            tr.dataset.id = taak.id;
            
            const projectNaam = this.getProjectNaam(taak.projectId);
            const contextNaam = this.getContextNaam(taak.contextId);
            const datum = taak.verschijndatum ? new Date(taak.verschijndatum).toLocaleDateString('nl-NL') : '';
            const recurringIndicator = taak.herhalingActief ? ' <span class="recurring-indicator" title="Herhalende taak"><i class="fas fa-redo"></i></span>' : '';
            
            // Datum status indicator
            const datumStatus = this.getTaakDatumStatus(taak.verschijndatum);
            let datumIndicator = '';
            let rowClass = 'actie-row';
            
            if (datumStatus === 'verleden') {
                datumIndicator = '<span class="datum-indicator overtijd" title="Overtijd - vervaldatum gepasseerd"><i class="ti ti-alert-triangle"></i></span>';
                rowClass += ' taak-overtijd';
            } else if (datumStatus === 'toekomst') {
                datumIndicator = '<span class="datum-indicator toekomst" title="Toekomstige taak">⏳</span>';
                rowClass += ' taak-toekomst';
            }
            
            tr.className = rowClass;
            
            tr.innerHTML = `
                <td title="Taak afwerken">
                    <input type="checkbox" onchange="app.taakAfwerken('${taak.id}')">
                </td>
                <td class="taak-naam-cell" onclick="app.bewerkActieWrapper('${taak.id}')" title="${this.escapeHtml(taak.tekst)}${taak.opmerkingen ? '\n\nOpmerkingen:\n' + this.escapeHtml(taak.opmerkingen) : ''}">${this.getPrioriteitIndicator(taak.prioriteit)}${datumIndicator}${taak.tekst}${recurringIndicator}</td>
                <td title="${this.escapeHtml(projectNaam)}">${projectNaam}</td>
                <td title="${this.escapeHtml(contextNaam)}">${contextNaam}</td>
                <td title="${datum}">${datum}</td>
                <td title="${taak.duur} minuten">${taak.duur} min</td>
                <td>
                    <div class="actie-buttons">
                        <div class="verplaats-dropdown">
                            <button class="verplaats-btn-small" onclick="app.toggleVerplaatsDropdown('${taak.id}')" title="Verplaats naar andere lijst">↗️</button>
                            <div class="verplaats-menu" id="verplaats-${taak.id}" style="display: none;">
                                <button onclick="app.verplaatsActie('${taak.id}', 'opvolgen')">Opvolgen</button>
                                <button onclick="app.verplaatsActie('${taak.id}', 'uitgesteld-wekelijks')">Wekelijks</button>
                                <button onclick="app.verplaatsActie('${taak.id}', 'uitgesteld-maandelijks')">Maandelijks</button>
                                <button onclick="app.verplaatsActie('${taak.id}', 'uitgesteld-3maandelijks')">3-maandelijks</button>
                                <button onclick="app.verplaatsActie('${taak.id}', 'uitgesteld-6maandelijks')">6-maandelijks</button>
                                <button onclick="app.verplaatsActie('${taak.id}', 'uitgesteld-jaarlijks')">Jaarlijks</button>
                            </div>
                        </div>
                        <button onclick="app.verwijderTaak('${taak.id}')" class="verwijder-btn" title="Verwijder taak">×</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderStandaardLijst(container) {
        if (!container) {
            console.error('renderStandaardLijst: container is null');
            return;
        }
        
        // Check for empty inbox and show motivational message
        if (this.huidigeLijst === 'inbox' && this.taken.length === 0) {
            // Check if inbox just got cleared by user action
            if (this.lastActionWasPlanning) {
                this.triggerInboxCelebration();
                this.lastActionWasPlanning = false; // Reset after popup
            }

            container.innerHTML = `
                <div class="inbox-empty-state">
                    <div class="inbox-empty-icon">✨</div>
                    <h3 class="inbox-empty-title">Perfect! Je inbox is leeg.</h3>
                    <p class="inbox-empty-subtitle">Tijd voor echte focus. Geweldig werk! 🎯</p>
                </div>
            `;
            this.prevInboxCount = 0;
            return;
        }
        
        // Track inbox count for celebration detection
        if (this.huidigeLijst === 'inbox') {
            this.prevInboxCount = this.taken.length;

            // Reset planning flag when inbox is not empty
            if (this.taken.length > 0) {
                this.lastActionWasPlanning = false;
            }
        }

        container.innerHTML = '';

        this.taken.forEach(taak => {
            const li = document.createElement('li');
            li.className = 'taak-item';
            
            const recurringIndicator = taak.herhalingActief ? ' <span class="recurring-indicator" title="Herhalende taak"><i class="fas fa-redo"></i></span>' : '';
            
            let acties = '';
            if (this.huidigeLijst === 'inbox') {
                acties = `
                    <div class="taak-acties">
                        <button onclick="app.verwijderTaak('${taak.id}')" class="verwijder-btn" title="Verwijder taak">×</button>
                    </div>
                `;
            } else if (this.huidigeLijst === 'afgewerkte-taken') {
                acties = `
                    <div class="taak-acties">
                        <button onclick="app.terugzettenNaarInbox('${taak.id}')" class="terugzet-btn" title="Terug naar inbox">↩️</button>
                        <button onclick="app.verwijderTaak('${taak.id}')" class="verwijder-btn" title="Verwijder taak">×</button>
                    </div>
                `;
            } else {
                acties = `
                    <div class="taak-acties">
                        <button onclick="app.verwijderTaak('${taak.id}')" class="verwijder-btn" title="Verwijder taak">×</button>
                    </div>
                `;
            }
            
            // Determine if checkbox should be checked (for completed tasks)
            const isCompleted = this.huidigeLijst === 'afgewerkte-taken' || taak.afgewerkt;
            const checkboxChecked = isCompleted ? 'checked' : '';
            
            li.innerHTML = `
                <div class="taak-checkbox">
                    <input type="checkbox" id="taak-${taak.id}" ${checkboxChecked} onchange="app.taakAfwerken('${taak.id}')">
                </div>
                <div class="taak-content">
                    <div class="taak-titel" onclick="app.bewerkActieWrapper('${taak.id}')" style="cursor: pointer;" title="${taak.opmerkingen ? this.escapeHtml(taak.opmerkingen) : 'Klik om te bewerken'}">${taak.tekst}${recurringIndicator}</div>
                </div>
                ${acties}
            `;
            container.appendChild(li);
        });
    }

    async taakAfwerken(id) {
        // Prevent race conditions from rapid clicking
        if (this.activeCompletions.has(id)) {
            console.log('Task completion already in progress:', id);
            return;
        }
        
        this.activeCompletions.add(id);
        
        const taak = this.taken.find(t => t.id === id);
        if (!taak) {
            this.activeCompletions.delete(id);
            return;
        }
        
        const isRecurring = taak.herhalingActief && taak.herhalingType;
        
        // Direct feedback - geen wachten op API
        const checkbox = document.querySelector(`input[onchange*="${id}"]`);
        if (checkbox) {
            checkbox.checked = true;
            checkbox.disabled = true;
        }
        
        // Instant toast voor directe feedback
        toast.info('Taak wordt afgewerkt...');
        
        // Entertainment messages voor task completion in acties scherm
        const completionMessages = [
            '✅ Taak wordt afgewerkt...',
            '🎯 Voortgang wordt opgeslagen...',
            '📊 Productiviteit wordt bijgewerkt...',
            '⚡ Database wordt gesynchroniseerd...',
            '🔄 Herhalende taken worden verwerkt...',
            '🚀 Bijna klaar...'
        ];
        
        // Start entertainment loading
        loading.showWithEntertainment('✅ Taak afwerken...', completionMessages, 1200);
        
        try {
            taak.afgewerkt = new Date().toISOString();
            
            // Handle recurring tasks
            let nextRecurringTaskId = null;
            let calculatedNextDate = null;
            if (isRecurring) {
                if (taak.herhalingType.startsWith('event-')) {
                    // Handle event-based recurrence - ask for next event date
                    const nextEventDate = await this.askForNextEventDate(taak);
                    if (nextEventDate) {
                        calculatedNextDate = this.calculateEventBasedDate(nextEventDate, taak.herhalingType);
                        if (calculatedNextDate) {
                            nextRecurringTaskId = await this.createNextRecurringTask(taak, calculatedNextDate);
                        }
                    }
                } else {
                    console.log('<i class="fas fa-redo"></i> Calculating next recurring date for task:', {
                        verschijndatum: taak.verschijndatum,
                        herhalingType: taak.herhalingType,
                        taskObject: taak
                    });
                    
                    calculatedNextDate = this.calculateNextRecurringDate(taak.verschijndatum, taak.herhalingType);
                    console.log('<i class="ti ti-calendar"></i> Calculated next date:', calculatedNextDate);
                    
                    if (calculatedNextDate) {
                        console.log('<i class="fas fa-check"></i> Next date exists, calling createNextRecurringTask...');
                        nextRecurringTaskId = await this.createNextRecurringTask(taak, calculatedNextDate);
                        console.log('🎯 createNextRecurringTask result:', nextRecurringTaskId);
                    } else {
                        console.error('<i class="ti ti-x"></i> calculatedNextDate is null/undefined - recurring task will not be created');
                    }
                }
            }
            
            const success = await this.verplaatsTaakNaarAfgewerkt(taak);
            if (success) {
                // Remove from local array immediately after successful server update
                this.taken = this.taken.filter(t => t.id !== id);
                
                // Remove DOM element immediately without full re-render
                const checkbox = document.querySelector(`input[onchange*="${id}"]`);
                const rowElement = checkbox?.closest('tr, li, .project-actie-item');
                if (rowElement) {
                    // Fade out and remove - NO SCROLL POSITION CHANGE
                    rowElement.style.transition = 'opacity 0.3s';
                    rowElement.style.opacity = '0';
                    setTimeout(() => {
                        if (rowElement.parentNode) {
                            rowElement.parentNode.removeChild(rowElement);
                        }
                    }, 300);
                }
                
                // Background updates (don't await these for faster response)
                // Note: We no longer use debouncedSave() to prevent data loss
                // Individual task updates are handled directly via API
                if (isRecurring && !nextRecurringTaskId) {
                    console.error('<i class="ti ti-alert-triangle"></i> Recurring task creation failed');
                    toast.error('Let op: De herhalende taak kon niet worden aangemaakt. Controleer de herhaling-instellingen.');
                }
                // this.laadTellingen().catch(console.error); // Disabled - tellers removed from sidebar
                
                // Show success message and refresh UI with scroll preservation
                if (isRecurring && nextRecurringTaskId) {
                    const nextDateFormatted = new Date(calculatedNextDate).toLocaleDateString('nl-NL');
                    toast.success(`Taak afgewerkt! Volgende herhaling gepland voor ${nextDateFormatted}`);
                    
                    // For recurring tasks, add new task to local arrays immediately
                    // this.laadTellingen(); // Disabled - tellers removed from sidebar
                    if (nextRecurringTaskId && this.huidigeLijst === 'acties') {
                        // Add the new recurring task to local arrays immediately for drag & drop
                        try {
                            const newTaskResponse = await fetch(`/api/taak/${nextRecurringTaskId}`);
                            if (newTaskResponse.ok) {
                                const newTask = await newTaskResponse.json();
                                console.log('<i class="fas fa-redo"></i> Adding new recurring task to local arrays:', newTask);
                                
                                // Add to both arrays used for drag & drop
                                this.taken.push(newTask);
                                if (this.planningActies) {
                                    this.planningActies.push(newTask);
                                }
                                
                                // Add new recurring task to DOM without full refresh
                                this.addNewTaskToDOM(newTask);
                            }
                        } catch (error) {
                            console.error('Error fetching new recurring task:', error);
                        }
                    }
                } else {
                    toast.success('Taak afgewerkt!');
                }
                
                // No need to re-render - DOM element already removed above
                // Local array is correct, server background sync handles persistence
            } else {
                // Rollback the afgewerkt timestamp and checkbox state
                delete taak.afgewerkt;
                if (checkbox) {
                    checkbox.checked = false;
                    checkbox.disabled = false;
                }
                toast.error('Fout bij afwerken van taak. Probeer opnieuw.');
            }
            
            // Always cleanup the completion tracking
            this.activeCompletions.delete(id);
        } catch (error) {
            console.error('Error in taakAfwerken:', error);
            // Rollback checkbox state on error
            if (checkbox) {
                checkbox.checked = false;
                checkbox.disabled = false;
            }
            this.activeCompletions.delete(id);
            throw error;
        } finally {
            // Hide loading with minimum time for smooth UX
            await loading.hideWithMinTime();
        }
    }

    async verplaatsTaakNaarAfgewerkt(taak) {
        return await loading.withLoading(async () => {
            // Use the new updateTask API to mark task as completed
            const response = await fetch(`/api/taak/${taak.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    afgewerkt: taak.afgewerkt
                })
            });
            
            if (!response.ok) {
                // 404 means task already completed/deleted - that's actually success
                if (response.status === 404) {
                    console.log(`Task ${taak.id} already completed/deleted on server - treating as success`);
                    return true;
                }
                throw new Error(`HTTP error ${response.status}`);
            }
            
            const result = await response.json();
            return result.success;
        }, {
            operationId: 'complete-task',
            showGlobal: true,
            message: 'Taak afwerken...'
        });
    }

    async terugzettenNaarInbox(taakId) {
        return await loading.withLoading(async () => {
            // Update task to move it back to inbox and clear completed status
            const response = await fetch(`/api/taak/${taakId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lijst: 'inbox',
                    afgewerkt: null  // Clear the completed timestamp
                })
            });
            
            if (response.ok) {
                // Remove from local array if we're on afgewerkte-taken page
                if (this.huidigeLijst === 'afgewerkte-taken') {
                    this.taken = this.taken.filter(t => t.id !== taakId);
                    this.renderTaken();
                }
                
                toast.success('Taak teruggezet naar inbox');
                return true;
            } else {
                toast.error('Fout bij terugzetten van taak');
                return false;
            }
        }, {
            operationId: 'restore-task',
            showGlobal: true,
            message: 'Taak terugzetten naar inbox...'
        });
    }

    triggerInboxCelebration() {
        // Create celebration container
        const celebrationContainer = document.createElement('div');
        celebrationContainer.className = 'inbox-celebration-container';
        celebrationContainer.innerHTML = `
            <div class="inbox-celebration">
                <div class="celebration-animation">🎉</div>
                <div class="celebration-text">
                    <h2>🏆 Inbox Zero bereikt!</h2>
                    <p>Fantastisch! Je hebt het voor elkaar! ⭐</p>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(celebrationContainer);
        
        // Trigger animation
        requestAnimationFrame(() => {
            celebrationContainer.classList.add('celebration-active');
        });
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            celebrationContainer.classList.add('celebration-exit');
            setTimeout(() => {
                if (celebrationContainer.parentNode) {
                    celebrationContainer.parentNode.removeChild(celebrationContainer);
                }
            }, 500);
        }, 4000);
        
        // Also show a toast for extra satisfaction
        setTimeout(() => {
            toast.success('🎊 Geweldig! Je inbox is nu volledig leeg!', 5000);
        }, 1000);
    }

    async verwijderTaak(id, categoryKey = null) {
        let taak;
        
        // For uitgesteld interface, we need to fetch task details from API
        if (categoryKey) {
            try {
                const response = await fetch(`/api/taak/${id}`);
                if (response.ok) {
                    taak = await response.json();
                }
            } catch (error) {
                console.error('Error fetching task for deletion:', error);
            }
        } else {
            taak = this.taken.find(t => t.id === id);
        }
        
        if (!taak) {
            toast.error('Taak niet gevonden');
            return;
        }
        
        const bevestiging = await confirmModal.show('Taak Verwijderen', `Weet je zeker dat je "${taak.tekst}" wilt verwijderen?`);
        if (!bevestiging) return;
        
        await loading.withLoading(async () => {
            try {
                // Use DELETE endpoint for single task deletion
                const response = await fetch(`/api/taak/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    const result = await response.json();
                    
                    // Check B2 cleanup status and provide user feedback
                    let successMessage = 'Taak verwijderd';
                    let hasB2Warning = false;
                    
                    if (result.b2Cleanup) {
                        const cleanup = result.b2Cleanup;
                        
                        if (cleanup.failed > 0) {
                            hasB2Warning = true;
                            if (cleanup.configError) {
                                console.warn(`⚠️ B2 configuratie probleem voor taak ${id}`);
                                toast.warning(`Taak verwijderd, maar bijlagen verwijdering is niet geconfigureerd. Cloud storage cleanup overgeslagen.`);
                            } else if (cleanup.timeout) {
                                console.warn(`⚠️ B2 bijlagen cleanup timeout voor taak ${id}`);
                                toast.warning(`Taak verwijderd, maar bijlagen verwijdering duurde te lang. Sommige bestanden zijn mogelijk niet verwijderd uit cloud storage.`);
                            } else if (cleanup.deleted > 0) {
                                console.warn(`⚠️ Gedeeltelijke B2 cleanup voor taak ${id}: ${cleanup.deleted} gelukt, ${cleanup.failed} gefaald`);
                                toast.warning(`Taak verwijderd. ${cleanup.deleted} van de ${cleanup.deleted + cleanup.failed} bijlagen verwijderd uit cloud storage.`);
                            } else {
                                console.error(`❌ Volledige B2 cleanup failure voor taak ${id}`);
                                toast.error(`Taak verwijderd, maar bijlagen konden niet verwijderd worden uit cloud storage. Controleer je internetverbinding.`);
                            }
                        } else if (cleanup.deleted > 0) {
                            console.log(`✅ B2 cleanup succesvol voor taak ${id}: ${cleanup.deleted} bestanden verwijderd`);
                            successMessage = `Taak en ${cleanup.deleted} bijlagen verwijderd`;
                        }
                    }
                    
                    if (categoryKey) {
                        // For uitgesteld interface: remove from DOM and update count
                        const taakElement = document.querySelector(`[data-id="${id}"]`);
                        if (taakElement) {
                            taakElement.remove();
                        }
                        
                        // Update count in header
                        const header = document.querySelector(`[data-category="${categoryKey}"] .taken-count`);
                        if (header) {
                            const currentCount = parseInt(header.textContent.match(/\d+/)[0]);
                            header.textContent = `(${currentCount - 1})`;
                        }
                        
                        if (!hasB2Warning) {
                            toast.success(successMessage);
                        }
                    } else {
                        // Normal list interface
                        this.taken = this.taken.filter(taak => taak.id !== id);
                        
                        // Re-render with preserved filters and scroll position for actions list
                        if (this.huidigeLijst === 'acties') {
                            await this.preserveActionsFilters(() => this.renderTaken());
                        } else {
                            this.renderTaken();
                        }
                        
                        if (!hasB2Warning) {
                            toast.success(successMessage);
                        }
                        console.log(`✅ Task ${id} deleted successfully with B2 cleanup:`, result.b2Cleanup);
                    }
                } else {
                    const error = await response.json();
                    toast.error(`Fout bij verwijderen: ${error.error || 'Onbekende fout'}`);
                }
            } catch (error) {
                console.error('Error deleting task:', error);
                toast.error('Fout bij verwijderen van taak');
            }
        }, {
            operationId: `delete-task-${id}`,
            showGlobal: true,
            message: 'Taak verwijderen...'
        });
    }

    async slaLijstOp() {
        // DISABLED: This function was causing data loss by overwriting the entire list on the server
        // Individual task updates should be used instead (PUT /api/taak/:id)
        // After updates, use laadHuidigeLijst() to refresh data from server
        console.warn('slaLijstOp() is disabled to prevent data loss. Use individual task updates instead.');
        return true;
    }

    // Debounced save to prevent race conditions from rapid task completions
    debouncedSave() {
        // DISABLED: This function called slaLijstOp() which was causing data loss
        // Individual task updates are now handled directly without bulk saves
        console.warn('debouncedSave() is disabled. Individual task updates are used instead.');
        return;
    }

    // Planning popup methods (aangepast van originele code)
    async laadProjecten() {
        if (!this.isLoggedIn()) {
            this.projecten = [];
            this.vulProjectSelect();
            return;
        }

        try {
            const response = await fetch('/api/lijst/projecten-lijst');
            if (response.ok) {
                this.projecten = await response.json();
            }
            this.vulProjectSelect();
        } catch (error) {
            console.error('Fout bij laden projecten:', error);
        }
    }

    async laadContexten() {
        if (!this.isLoggedIn()) {
            this.contexten = [];
            this.vulContextSelect();
            return;
        }

        try {
            const response = await fetch('/api/lijst/contexten');
            if (response.ok) {
                this.contexten = await response.json();
            }
            this.vulContextSelect();
        } catch (error) {
            console.error('Fout bij laden contexten:', error);
        }
    }

    vulProjectSelect() {
        const select = document.getElementById('projectSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Geen project</option>';
        this.projecten.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.naam;
            select.appendChild(option);
        });
    }

    vulContextSelect() {
        const select = document.getElementById('contextSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecteer context...</option>';
        this.contexten.forEach(context => {
            const option = document.createElement('option');
            option.value = context.id;
            option.textContent = context.naam;
            select.appendChild(option);
        });
    }

    updateContextSelects() {
        // Update all context dropdowns throughout the app
        const selects = document.querySelectorAll('select[id*="context"], select[name*="context"]');
        selects.forEach(select => {
            // Preserve current selection
            const currentValue = select.value;
            
            // Clear and repopulate
            select.innerHTML = '<option value="">Selecteer context...</option>';
            this.contexten.forEach(context => {
                const option = document.createElement('option');
                option.value = context.id;
                option.textContent = context.naam;
                select.appendChild(option);
            });
            
            // Restore selection if it still exists
            if (currentValue && this.contexten.find(c => c.id === currentValue)) {
                select.value = currentValue;
            }
        });
        
        // Also update the main context select specifically
        this.vulContextSelect();
    }

    zetVandaagDatum() {
        const datumField = document.getElementById('verschijndatum');
        if (datumField) {
            const vandaag = new Date().toISOString().split('T')[0];
            datumField.value = vandaag;
        }
    }

    // Helper function to set button text based on context
    setActionButtonText(isNewAction = true) {
        const button = document.getElementById('maakActieBtn');
        if (button) {
            button.textContent = isNewAction ? 'Actie maken' : 'Aanpassingen opslaan';
        }
    }

    async planTaak(id) {
        if (this.huidigeLijst !== 'inbox') return;
        
        if (!this.isLoggedIn()) {
            toast.warning('Log in om taken te plannen.');
            return;
        }
        
        const taak = this.taken.find(t => t.id === id);
        if (taak) {
            this.huidigeTaakId = id;
            this.touchedFields.clear(); // Reset touched fields bij nieuwe popup
            
            // Remove alle invalid classes en touched state
            ['taakNaamInput', 'projectSelect', 'verschijndatum', 'contextSelect', 'duur', 'opmerkingen'].forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.classList.remove('invalid');
                    field.removeAttribute('data-touched');
                }
            });
            
            // Zorg ervoor dat projecten en contexten geladen zijn
            await this.laadProjecten();
            await this.laadContexten();
            
            // Vul alle velden in met taak data
            document.getElementById('taakNaamInput').value = taak.tekst;
            document.getElementById('projectSelect').value = taak.projectId || '';
            document.getElementById('contextSelect').value = taak.contextId || '';
            document.getElementById('duur').value = taak.duur || '';
            document.getElementById('opmerkingen').value = taak.opmerkingen || '';
            
            // Set prioriteit veld (default to 'gemiddeld' if not set)
            document.getElementById('prioriteitSelect').value = taak.prioriteit || 'gemiddeld';
            
            // Format date correctly for date input (YYYY-MM-DD)
            let dateValue = '';
            if (taak.verschijndatum) {
                if (typeof taak.verschijndatum === 'string') {
                    // If it's already in YYYY-MM-DD format, use as-is
                    if (taak.verschijndatum.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        dateValue = taak.verschijndatum;
                    } else {
                        // Convert ISO string or other format to YYYY-MM-DD
                        const date = new Date(taak.verschijndatum);
                        if (!isNaN(date.getTime())) {
                            dateValue = date.toISOString().split('T')[0];
                        }
                    }
                }
            }
            document.getElementById('verschijndatum').value = dateValue;
            
            // Handle recurring task settings if present
            const herhalingType = taak.herhalingType || '';
            document.getElementById('herhalingSelect').value = herhalingType;
            this.parseHerhalingValue(herhalingType);
            const herhalingDisplay = this.generateHerhalingDisplayText();
            document.getElementById('herhalingDisplay').value = herhalingDisplay;
            
            // Set button text for new action (from inbox)
            this.setActionButtonText(true);
            
            this.updateButtonState();
            document.getElementById('planningPopup').style.display = 'flex';
            document.getElementById('taakNaamInput').focus();
            
            // Load subtaken for tasks
            console.log('DEBUG: planTaak - huidigeLijst:', this.huidigeLijst, 'subtakenManager exists:', !!subtakenManager);
            
            if (subtakenManager) {
                if (this.huidigeLijst === 'acties') {
                    console.log('DEBUG: Loading existing subtaken for acties lijst');
                    // Load existing subtaken for tasks from acties lijst
                    await subtakenManager.loadSubtaken(id);
                } else {
                    console.log('DEBUG: Showing empty subtaken sectie for inbox task');
                    // Show empty subtaken sectie for new tasks from inbox
                    subtakenManager.showSubtakenSectie();
                    subtakenManager.currentSubtaken = [];
                    subtakenManager.renderSubtaken();
                }
            } else {
                console.log('DEBUG: Fallback - subtakenManager not available, showing sectie directly');
                // Fallback: directly show subtaken sectie if manager not ready
                const subtakenSectie = document.getElementById('subtaken-sectie');
                console.log('DEBUG: subtaken-sectie element found:', !!subtakenSectie);
                if (subtakenSectie) {
                    subtakenSectie.style.display = 'block';
                    console.log('DEBUG: subtaken-sectie set to block');
                    // Show empty state
                    const emptyState = document.getElementById('subtaken-empty');
                    const lijst = document.getElementById('subtaken-lijst');
                    console.log('DEBUG: empty state found:', !!emptyState, 'lijst found:', !!lijst);
                    if (emptyState && lijst) {
                        emptyState.style.display = 'block';
                        lijst.innerHTML = '';
                        console.log('DEBUG: empty state shown');
                    }
                }
            }
            
            // Track usage for progressive F-key tips
            this.trackPlanningUsage();
        }
    }

    sluitPopup() {
        document.getElementById('planningPopup').style.display = 'none';
        this.huidigeTaakId = null;
        this.resetPopupForm();
    }

    async openVolgendeInboxTaak() {
        // Alleen in inbox lijst automatisch volgende taak openen
        if (this.huidigeLijst !== 'inbox') return false;

        // Zoek de eerste taak in de huidige inbox lijst
        const volgendeTaak = this.taken.find(taak => taak.id !== this.huidigeTaakId);

        if (volgendeTaak) {
            // Direct planTaak aanroepen (loading is al actief)
            await this.planTaak(volgendeTaak.id);
            toast.info(`Volgende taak: ${volgendeTaak.tekst.substring(0, 30)}...`);
            return true;
        }

        // Geen taken meer in inbox
        toast.success('<i class="fas fa-party-horn"></i> Inbox is leeg! Alle taken zijn verwerkt.');
        return false;
    }

    // Helper function voor weekdag knoppen generatie
    getWeekdagKnoppen(dagenOffset, onclickCallback, btnClass = 'menu-item') {
        const vandaag = new Date();
        const weekdag = vandaag.getDay(); // 0 = zondag, 1 = maandag, etc.
        const dagenVanDeWeek = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

        let weekdagenHTML = '';
        const dagenTotZondag = weekdag === 0 ? 0 : (7 - weekdag);

        for (let i = 2; i <= dagenTotZondag; i++) {
            const datum = new Date(vandaag);
            datum.setDate(datum.getDate() + i);
            const dagNaam = dagenVanDeWeek[datum.getDay()];
            weekdagenHTML += `<button ${onclickCallback(i)} class="${btnClass}">${dagNaam}</button>`;
        }

        return weekdagenHTML;
    }

    toonActiesMenu(taakId, menuType = 'acties', huidigeLijst = null, position = null, sourceElement = null) {
        const taak = this.taken.find(t => t.id === taakId);
        if (!taak) return;

        // Als sourceElement is gegeven (button click), vind het parent taak item
        if (sourceElement && !position) { // Button click, niet context menu
            const taakItem = sourceElement.closest('.taak-item');
            if (taakItem) {
                this.contextMenuTaakItem = taakItem;
            }
        }

        // Verwijder bestaande menu als die er is
        const bestaandMenu = document.querySelector('.acties-menu-overlay');
        if (bestaandMenu) {
            bestaandMenu.remove();
        }

        // Genereer verschillende menu content op basis van type
        let menuContentHTML = '';
        
        if (menuType === 'acties') {
            // Voor acties lijst: datum opties + uitgesteld + opvolgen
            const weekdagenHTML = this.getWeekdagKnoppen(0, (i) =>
                `onclick="app.stelDatumIn('${taakId}', ${i})"`
            );

            menuContentHTML = `
                <h3>Plan op</h3>
                <div class="menu-section">
                    <button onclick="app.stelDatumIn('${taakId}', 0)" class="menu-item">Vandaag</button>
                    <button onclick="app.stelDatumIn('${taakId}', 1)" class="menu-item">Morgen</button>
                    ${weekdagenHTML}
                </div>
                
                <h3>Verplaats naar uitgesteld</h3>
                <div class="menu-section">
                    <button onclick="app.verplaatsNaarUitgesteld('${taakId}', 'uitgesteld-wekelijks')" class="menu-item">Wekelijks</button>
                    <button onclick="app.verplaatsNaarUitgesteld('${taakId}', 'uitgesteld-maandelijks')" class="menu-item">Maandelijks</button>
                    <button onclick="app.verplaatsNaarUitgesteld('${taakId}', 'uitgesteld-3maandelijks')" class="menu-item">3-maandelijks</button>
                    <button onclick="app.verplaatsNaarUitgesteld('${taakId}', 'uitgesteld-6maandelijks')" class="menu-item">6-maandelijks</button>
                    <button onclick="app.verplaatsNaarUitgesteld('${taakId}', 'uitgesteld-jaarlijks')" class="menu-item">Jaarlijks</button>
                </div>
                
                <h3>Verplaats naar Opvolgen</h3>
                <div class="menu-section">
                    <button onclick="app.verplaatsNaarOpvolgen('${taakId}')" class="menu-item opvolgen">Opvolgen</button>
                </div>
                
                <h3>Acties</h3>
                <div class="menu-section">
                    <button onclick="app.verwijderTaak('${taakId}'); app.removeContextMenuHighlight(); document.querySelector('.acties-menu-overlay').remove();" class="menu-item menu-delete">Verwijder taak</button>
                </div>
            `;
        } else if (menuType === 'uitgesteld') {
            // Voor uitgesteld lijsten: inbox + andere uitgesteld lijsten (exclusief huidige) + opvolgen
            const uitgesteldOpties = [
                { id: 'uitgesteld-wekelijks', naam: 'Wekelijks' },
                { id: 'uitgesteld-maandelijks', naam: 'Maandelijks' },
                { id: 'uitgesteld-3maandelijks', naam: '3-maandelijks' },
                { id: 'uitgesteld-6maandelijks', naam: '6-maandelijks' },
                { id: 'uitgesteld-jaarlijks', naam: 'Jaarlijks' }
            ];
            
            // Filter uit de huidige lijst
            const beschikbareOpties = uitgesteldOpties.filter(optie => optie.id !== huidigeLijst);
            
            let uitgesteldButtonsHTML = '';
            beschikbareOpties.forEach(optie => {
                uitgesteldButtonsHTML += `<button onclick="app.verplaatsNaarUitgesteld('${taakId}', '${optie.id}')" class="menu-item">${optie.naam}</button>`;
            });
            
            menuContentHTML = `
                <h3>Verplaats naar</h3>
                <div class="menu-section">
                    <button onclick="app.verplaatsNaarInbox('${taakId}')" class="menu-item inbox-item"><i class="ti ti-inbox"></i> Inbox</button>
                </div>
                
                <h3>Verplaats naar uitgesteld</h3>
                <div class="menu-section">
                    ${uitgesteldButtonsHTML}
                </div>
                
                <h3>Verplaats naar Opvolgen</h3>
                <div class="menu-section">
                    <button onclick="app.verplaatsNaarOpvolgen('${taakId}')" class="menu-item opvolgen">Opvolgen</button>
                </div>
                
                <h3>Acties</h3>
                <div class="menu-section">
                    <button onclick="app.verwijderTaak('${taakId}'); app.removeContextMenuHighlight(); document.querySelector('.acties-menu-overlay').remove();" class="menu-item menu-delete">Verwijder taak</button>
                </div>
            `;
        }

        // Maak de menu overlay
        const menuOverlay = document.createElement('div');
        menuOverlay.className = 'acties-menu-overlay';
        
        
        menuOverlay.onclick = (e) => {
            if (e.target === menuOverlay) {
                this.removeContextMenuHighlight();
                menuOverlay.remove();
            }
        };

        const menuContent = document.createElement('div');
        menuContent.className = 'acties-menu-content';
        menuContent.innerHTML = `
            <div class="acties-menu">
                ${menuContentHTML}
                
                <button onclick="app.removeContextMenuHighlight(); document.querySelector('.acties-menu-overlay').remove()" class="menu-close">Sluiten</button>
            </div>
        `;

        menuOverlay.appendChild(menuContent);
        document.body.appendChild(menuOverlay);
        
        // Highlight taak als dit een context menu is (na overlay aanmaken)
        if (this.contextMenuTaakItem && this.ENABLE_HIGHLIGHTED_CONTEXT_MENU) {
            this.highlightTaskForContextMenu(this.contextMenuTaakItem, menuOverlay);
            this.contextMenuTaakItem = null; // Cleanup
        }
        
        // Als er een positie is gegeven (context menu), positioneer op die locatie
        if (position) {
            const menuElement = menuContent.querySelector('.acties-menu');
            const menuRect = menuElement.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Bereken optimale positie (voorkom buiten scherm vallen)
            let left = position.x;
            let top = position.y;
            
            if (left + menuRect.width > viewportWidth) {
                left = viewportWidth - menuRect.width - 10;
            }
            if (top + menuRect.height > viewportHeight) {
                top = viewportHeight - menuRect.height - 10;
            }
            
            // Verander van center naar absolute positionering
            menuOverlay.style.justifyContent = 'flex-start';
            menuOverlay.style.alignItems = 'flex-start';
            menuContent.style.position = 'absolute';
            menuContent.style.left = `${left}px`;
            menuContent.style.top = `${top}px`;
        }
    }

    // Context menu functionaliteit voor taak items
    addContextMenuToTaskItems() {
        // Voeg context menu listeners toe aan alle taak items
        const taakItems = document.querySelectorAll('.taak-item');
        
        taakItems.forEach(taakItem => {
            // Verwijder bestaande listeners om duplicaten te voorkomen
            taakItem.removeEventListener('contextmenu', this.handleTaskContextMenu);
            
            // Voeg nieuwe listener toe
            taakItem.addEventListener('contextmenu', (e) => this.handleTaskContextMenu(e, taakItem));
        });
    }
    
    handleTaskContextMenu(e, taakItem) {
        e.preventDefault(); // Voorkom standaard browser context menu
        
        // Haal taak ID op uit het element
        const taakId = taakItem.getAttribute('data-id');
        if (!taakId) return;
        
        // Store taakItem voor later gebruik in toonActiesMenu
        this.contextMenuTaakItem = taakItem;
        
        // Bepaal menu type op basis van huidige lijst
        let menuType = 'acties';
        let huidigeLijst = null;
        
        if (this.huidigeLijst && this.huidigeLijst.startsWith('uitgesteld-')) {
            menuType = 'uitgesteld';
            huidigeLijst = this.huidigeLijst;
        }
        
        // Toon menu op cursor positie
        const position = {
            x: e.clientX,
            y: e.clientY
        };
        
        this.toonActiesMenu(taakId, menuType, huidigeLijst, position);
    }

    // Highlight de geklikte taak door een clone boven de blur overlay te plaatsen
    highlightTaskForContextMenu(taakItem, menuOverlay = null) {
        // Cleanup eventuele vorige highlights
        this.removeContextMenuHighlight();
        
        // Clone het taak element
        const clone = taakItem.cloneNode(true);
        clone.className += ' context-menu-highlighted';
        clone.id = 'highlighted-task-clone';
        
        // Disable alle interactiviteit op de clone
        clone.style.pointerEvents = 'none';
        const buttons = clone.querySelectorAll('button');
        buttons.forEach(btn => btn.style.pointerEvents = 'none');
        const inputs = clone.querySelectorAll('input, select, textarea');
        inputs.forEach(input => input.style.pointerEvents = 'none');
        
        // Krijg exacte positie van originele element
        const rect = taakItem.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Positioneer clone exact op originele locatie
        clone.style.position = 'fixed';
        clone.style.top = rect.top + 'px';
        clone.style.left = rect.left + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        clone.style.margin = '0';
        clone.style.zIndex = '1'; // Binnen menu overlay, onder menu content
        
        // Maak originele taak transparent
        taakItem.style.opacity = '0.1';
        taakItem.dataset.originallyHighlighted = 'true';
        
        // Voeg clone toe aan menu overlay (of body als fallback)
        if (menuOverlay) {
            menuOverlay.appendChild(clone);
        } else {
            document.body.appendChild(clone);
        }
    }

    // Verwijder context menu highlight
    removeContextMenuHighlight() {
        // Verwijder clone
        const clone = document.getElementById('highlighted-task-clone');
        if (clone) {
            clone.remove();
        }
        
        // Herstel originele taak opacity
        const highlightedTask = document.querySelector('[data-originally-highlighted="true"]');
        if (highlightedTask) {
            highlightedTask.style.opacity = '';
            highlightedTask.removeAttribute('data-originally-highlighted');
        }
    }

    async verplaatsNaarInbox(taakId) {
        const taak = this.taken.find(t => t.id === taakId);
        if (!taak) return;

        await loading.withLoading(async () => {
            // Verplaats naar inbox
            const response = await fetch(`/api/taak/${taakId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lijst: 'inbox',
                    tekst: taak.tekst,
                    projectId: taak.projectId,
                    contextId: taak.contextId,
                    verschijndatum: taak.verschijndatum,
                    duur: taak.duur,
                    opmerkingen: taak.opmerkingen,
                    type: taak.type,
                    herhalingType: taak.herhalingType,
                    herhalingActief: taak.herhalingActief
                })
            });

            if (response.ok) {
                // Sluit menu
                const menuOverlay = document.querySelector('.acties-menu-overlay');
                if (menuOverlay) {
                    this.removeContextMenuHighlight();
                    menuOverlay.remove();
                }
                
                // Refresh huidige lijst en tellingen
                await this.laadHuidigeLijst();
                // await this.laadTellingen(); // Disabled - tellers removed from sidebar
                toast.success('Taak verplaatst naar Inbox');
            } else {
                toast.error('Fout bij verplaatsen naar Inbox');
            }
        }, {
            operationId: 'move-to-inbox',
            showGlobal: true,
            message: 'Verplaatsen naar Inbox...'
        });
    }

    async stelDatumIn(taakId, dagenVoorruit) {
        const taak = this.taken.find(t => t.id === taakId);
        if (!taak) return;

        const nieuweDatum = new Date();
        nieuweDatum.setDate(nieuweDatum.getDate() + dagenVoorruit);
        
        // Format datum naar YYYY-MM-DD
        const jaar = nieuweDatum.getFullYear();
        const maand = String(nieuweDatum.getMonth() + 1).padStart(2, '0');
        const dag = String(nieuweDatum.getDate()).padStart(2, '0');
        const datumString = `${jaar}-${maand}-${dag}`;

        await loading.withLoading(async () => {
            // Update de taak met nieuwe datum
            const updateData = {
                lijst: this.huidigeLijst,
                tekst: taak.tekst,
                projectId: taak.projectId,
                contextId: taak.contextId,
                verschijndatum: datumString,
                duur: taak.duur,
                opmerkingen: taak.opmerkingen,
                type: taak.type
            };

            // Voeg herhaling velden toe als ze bestaan
            if (taak.herhalingType !== undefined) {
                updateData.herhalingType = taak.herhalingType;
            }
            if (taak.herhalingActief !== undefined) {
                updateData.herhalingActief = taak.herhalingActief;
            }

            const response = await fetch(`/api/taak/${taakId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                // Update lokale taak
                taak.verschijndatum = datumString;
                
                // Herlaad de lijst met preserved scroll position
                await this.preserveActionsFilters(() => this.laadHuidigeLijst());
                // await this.laadTellingen(); // Disabled - tellers removed from sidebar
                
                const dagNaam = dagenVoorruit === 0 ? 'vandaag' : 
                               dagenVoorruit === 1 ? 'morgen' : 
                               `${nieuweDatum.toLocaleDateString('nl-NL', { weekday: 'long' })} ${nieuweDatum.toLocaleDateString('nl-NL')}`;
                
                toast.success(`Taak gepland voor ${dagNaam}`);
            } else {
                toast.error('Fout bij updaten van datum');
            }
        }, {
            operationId: 'update-datum',
            showGlobal: true,
            message: 'Datum wordt bijgewerkt...'
        });

        // Sluit menu
        this.removeContextMenuHighlight();
        document.querySelector('.acties-menu-overlay').remove();
    }

    async verplaatsNaarUitgesteld(taakId, lijstNaam) {
        const taak = this.taken.find(t => t.id === taakId);
        if (!taak) return;

        await loading.withLoading(async () => {
            await this.verplaatsTaakNaarLijst(taak, lijstNaam);
            
            // Sluit menu
            const menuOverlay = document.querySelector('.acties-menu-overlay');
            if (menuOverlay) {
                this.removeContextMenuHighlight();
                menuOverlay.remove();
            }
            
            // Refresh huidige lijst en tellingen
            await this.laadHuidigeLijst();
            // await this.laadTellingen(); // Disabled - tellers removed from sidebar
            
            const weergaveNaam = lijstNaam.replace('uitgesteld-', '')
                .replace('wekelijks', 'Wekelijks')
                .replace('maandelijks', 'Maandelijks')
                .replace('3maandelijks', '3-maandelijks')
                .replace('6maandelijks', '6-maandelijks')
                .replace('jaarlijks', 'Jaarlijks');
            toast.success(`Taak verplaatst naar ${weergaveNaam}`);
        }, {
            operationId: 'verplaats-uitgesteld',
            showGlobal: true,
            message: 'Taak wordt verplaatst...'
        });
    }

    async verplaatsNaarOpvolgen(taakId) {
        const taak = this.taken.find(t => t.id === taakId);
        if (!taak) return;

        await loading.withLoading(async () => {
            await this.verplaatsTaakNaarLijst(taak, 'opvolgen');
            
            // Sluit menu
            const menuOverlay = document.querySelector('.acties-menu-overlay');
            if (menuOverlay) {
                this.removeContextMenuHighlight();
                menuOverlay.remove();
            }
            
            // Refresh huidige lijst en tellingen
            await this.laadHuidigeLijst();
            // await this.laadTellingen(); // Disabled - tellers removed from sidebar
            
            toast.success('Taak verplaatst naar Opvolgen');
        }, {
            operationId: 'verplaats-opvolgen',
            showGlobal: true,
            message: 'Taak wordt verplaatst naar Opvolgen...'
        });
    }

    resetPopupForm() {
        document.getElementById('taakNaamInput').value = '';
        document.getElementById('projectSelect').value = '';
        document.getElementById('contextSelect').value = '';
        document.getElementById('duur').value = '';
        document.getElementById('opmerkingen').value = '';
        document.getElementById('herhalingSelect').value = '';
        document.getElementById('herhalingDisplay').value = 'Geen herhaling';
        
        this.zetVandaagDatum();
        
        // Reset touched fields en remove invalid classes
        this.touchedFields.clear();
        ['taakNaamInput', 'projectSelect', 'verschijndatum', 'contextSelect', 'duur', 'opmerkingen'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.classList.remove('invalid');
                field.removeAttribute('data-touched');
            }
        });
        
        this.updateButtonState();
    }

    probeerOpslaan() {
        const taakNaam = document.getElementById('taakNaamInput').value.trim();
        const projectId = document.getElementById('projectSelect').value;
        const verschijndatum = document.getElementById('verschijndatum').value;
        const contextId = document.getElementById('contextSelect').value;
        const duur = parseInt(document.getElementById('duur').value) || 0;

        if (taakNaam && verschijndatum && contextId && duur) {
            this.maakActie();
        }
    }

    async maakNieuwProject() {
        const projectData = await projectModal.show('Nieuw Project');
        if (projectData) {
            const nieuwProject = {
                id: this.generateId(),
                naam: projectData.naam,
                aangemaakt: new Date().toISOString(),
                dueDate: projectData.dueDate,
                opmerkingen: projectData.opmerkingen
            };
            
            this.projecten.push(nieuwProject);
            await this.slaProjectenOp();
            this.vulProjectSelect();
            document.getElementById('projectSelect').value = nieuwProject.id;
        }
    }

    async maakNieuweContext() {
        const naam = await inputModal.show('Nieuwe Context', 'Naam voor de nieuwe context:');
        if (naam && naam.trim()) {
            const nieuweContext = {
                id: this.generateId(),
                naam: naam.trim(),
                aangemaakt: new Date().toISOString()
            };
            
            this.contexten.push(nieuweContext);
            await this.slaContextenOp();
            this.vulContextSelect();
            document.getElementById('contextSelect').value = nieuweContext.id;
        }
    }

    async maakActie() {
        if (!this.huidigeTaakId) return;
        
        const taakNaam = document.getElementById('taakNaamInput').value.trim();
        const projectId = document.getElementById('projectSelect').value;
        const verschijndatum = document.getElementById('verschijndatum').value;
        const contextId = document.getElementById('contextSelect').value;
        const duur = parseInt(document.getElementById('duur').value) || 0;
        const opmerkingen = document.getElementById('opmerkingen').value.trim();
        const herhalingType = document.getElementById('herhalingSelect').value;
        
        // Prioriteit ophalen uit dropdown (altijd beschikbaar)
        const isInboxTaak = this.huidigeLijst !== 'acties';
        const prioriteit = document.getElementById('prioriteitSelect').value || 'gemiddeld';

        console.log('maakActie - herhalingType:', herhalingType);
        console.log('maakActie - herhalingActief:', !!herhalingType);
        console.log('maakActie - prioriteit:', prioriteit, 'isInboxTaak:', isInboxTaak);

        if (!taakNaam || !verschijndatum || !contextId || !duur) {
            toast.warning('Alle velden behalve project zijn verplicht!');
            return;
        }

        const maakActieBtn = document.getElementById('maakActieBtn');
        
        // Voor inbox taken: hou loading actief tot volgende taak geladen is
        // isInboxTaak al gedeclareerd op regel 4817
        
        return await loading.withLoading(async () => {
            if (this.huidigeLijst === 'acties') {
                // Bewerk bestaande actie
                const actie = this.taken.find(t => t.id === this.huidigeTaakId);
                if (actie) {
                    // Update task on server
                    const updateData = {
                        tekst: taakNaam,
                        projectId: projectId,
                        verschijndatum: verschijndatum,
                        contextId: contextId,
                        duur: duur,
                        opmerkingen: opmerkingen,
                        herhalingType: herhalingType,
                        herhalingActief: !!herhalingType,
                        prioriteit: prioriteit
                    };
                    
                    const response = await fetch(`/api/taak/${this.huidigeTaakId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData)
                    });
                    
                    if (response.ok) {
                        // Save subtaken changes if any
                        if (subtakenManager) {
                            await subtakenManager.saveAllSubtaken(this.huidigeTaakId);
                        }
                        
                        // Refresh list from server to ensure consistency
                        await this.preserveActionsFilters(() => this.laadHuidigeLijst());
                        this.sluitPopup();
                    } else {
                        toast.error('Fout bij bewerken van actie');
                    }
                }
            } else {
                // Maak nieuwe actie van inbox taak
                const taak = this.taken.find(t => t.id === this.huidigeTaakId);
                if (!taak) return;

                // Set flag: we are planning a task from inbox
                this.lastActionWasPlanning = true;

                const actie = {
                    id: taak.id,
                    tekst: taakNaam,
                    aangemaakt: taak.aangemaakt,
                    projectId: projectId,
                    verschijndatum: verschijndatum,
                    contextId: contextId,
                    duur: duur,
                    opmerkingen: opmerkingen,
                    type: 'actie',
                    herhalingType: herhalingType,
                    herhalingActief: !!herhalingType,
                    prioriteit: prioriteit
                };

                // Save the new action via direct single action API (bypasses list corruption issues)
                const response = await fetch('/api/debug/add-single-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(actie)
                });
                
                if (response.ok) {
                    console.log('<i class="fas fa-check"></i> Actie succesvol opgeslagen met herhaling:', herhalingType);
                    
                    // Save subtaken if any were created
                    if (subtakenManager) {
                        await subtakenManager.saveAllSubtaken(this.huidigeTaakId);
                    }
                    
                    // Only remove from inbox AFTER successful save
                    this.verwijderTaakUitHuidigeLijst(this.huidigeTaakId);
                    // await this.laadTellingen(); // Disabled - tellers removed from sidebar
                    
                    // If we're currently viewing acties, refresh the list with preserved filters
                    if (this.huidigeLijst === 'acties') {
                        await this.preserveActionsFilters(() => this.laadHuidigeLijst());
                    }
                    
                    // Probeer automatisch volgende inbox taak te openen
                    // Loading blijft actief totdat volgende taak geladen is
                    const volgendeGeopend = await this.openVolgendeInboxTaak();
                    if (!volgendeGeopend) {
                        this.sluitPopup();
                    }
                } else {
                    console.error('Fout bij opslaan actie:', response.status);
                    toast.error('Fout bij plannen van taak. Probeer opnieuw.');
                    return;
                }
            }
        }, {
            operationId: 'save-action',
            button: maakActieBtn,
            message: isInboxTaak ? 'Taak opslaan en volgende laden...' : 'Actie opslaan...'
        });
    }

    async verplaatsTaak(naarLijst) {
        if (!this.huidigeTaakId) return;

        const taak = this.taken.find(t => t.id === this.huidigeTaakId);
        if (!taak) return;

        // Set flag if moving task from inbox
        if (this.huidigeLijst === 'inbox') {
            this.lastActionWasPlanning = true;
        }

        await loading.withLoading(async () => {
            await this.verplaatsTaakNaarLijst(taak, naarLijst);
            // Remove from local list and re-render (verwijderTaakUitHuidigeLijst includes unnecessary slaLijstOp)
            this.taken = this.taken.filter(t => t.id !== this.huidigeTaakId);
            this.renderTaken();
        }, {
            operationId: 'verplaats-taak',
            showGlobal: true,
            message: `Taak wordt verplaatst naar ${naarLijst}...`
        });
        
        // Update counts in background (non-blocking)
        this.laadTellingen();
        
        // Probeer automatisch volgende inbox taak te openen (net als bij opslaan)
        const volgendeGeopend = await this.openVolgendeInboxTaak();
        if (!volgendeGeopend) {
            this.sluitPopup();
        }
    }

    async verplaatsTaakNaarLijst(taak, lijstNaam) {
        try {
            // Prepare update data
            const updateData = {
                lijst: lijstNaam,
                tekst: taak.tekst,
                projectId: taak.projectId,
                contextId: taak.contextId,
                verschijndatum: taak.verschijndatum,
                duur: taak.duur,
                opmerkingen: taak.opmerkingen,
                type: taak.type
            };
            
            // Only add herhaling fields if they exist
            if (taak.herhalingType !== undefined) {
                updateData.herhalingType = taak.herhalingType;
            }
            if (taak.herhalingActief !== undefined) {
                updateData.herhalingActief = taak.herhalingActief;
            }
            
            console.log(`Verplaatsen taak ${taak.id} naar ${lijstNaam}:`, updateData);
            
            // Use the new updateTask API for better database consistency
            const response = await fetch(`/api/taak/${taak.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.success;
            } else {
                console.error(`HTTP error ${response.status} bij verplaatsen naar ${lijstNaam}`);
                return false;
            }
        } catch (error) {
            console.error(`Fout bij verplaatsen naar ${lijstNaam}:`, error);
            return false;
        }
    }

    verwijderTaakUitHuidigeLijst(id) {
        // Remove from local array
        this.taken = this.taken.filter(t => t.id !== id);
        // Just re-render UI, don't save entire list to server
        this.renderTaken();
        // Background update tellingen if needed
        this.laadTellingen().catch(console.error);
    }

    async slaProjectenOp() {
        try {
            await fetch('/api/lijst/projecten-lijst', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.projecten)
            });
        } catch (error) {
            console.error('Fout bij opslaan projecten:', error);
        }
    }

    async slaContextenOp() {
        try {
            await fetch('/api/lijst/contexten', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.contexten)
            });
        } catch (error) {
            console.error('Fout bij opslaan contexten:', error);
        }
    }


    updateButtonState() {
        const taakNaam = document.getElementById('taakNaamInput').value.trim();
        const projectId = document.getElementById('projectSelect').value;
        const verschijndatum = document.getElementById('verschijndatum').value;
        const contextId = document.getElementById('contextSelect').value;
        const duur = parseInt(document.getElementById('duur').value) || 0;

        const alleVeldenIngevuld = taakNaam && verschijndatum && contextId && duur;
        
        const button = document.getElementById('maakActieBtn');
        if (button) {
            button.disabled = !alleVeldenIngevuld;
        }
        
        // Update field styles alleen voor velden die al geïnteracteerd zijn
        const fieldValues = {
            'taakNaamInput': taakNaam,
            'verschijndatum': verschijndatum,
            'contextSelect': contextId,
            'duur': duur
        };
        
        Object.keys(fieldValues).forEach(fieldId => {
            if (this.touchedFields.has(fieldId)) {
                this.updateFieldStyle(fieldId, fieldValues[fieldId]);
            }
        });
    }

    updateFieldStyle(fieldId, isValid) {
        const field = document.getElementById(fieldId);
        if (field) {
            if (isValid) {
                field.classList.remove('invalid');
            } else {
                field.classList.add('invalid');
            }
        }
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Convert URLs in text to clickable links
    linkifyUrls(text) {
        if (!text) return '';
        
        // First escape HTML to prevent XSS
        const escaped = this.escapeHtml(text);
        
        // Regex to match URLs (http://, https://, www.)
        const urlRegex = /(\b(https?:\/\/|www\.)[^\s<]+)/gi;
        
        return escaped.replace(urlRegex, (match) => {
            let href = match;
            // Add http:// if URL starts with www.
            if (match.startsWith('www.')) {
                href = 'http://' + match;
            }
            return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`;
        });
    }

    // Recurring task calculation logic
    calculateNextRecurringDate(baseDate, herhalingType) {
        let date = new Date(baseDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for date comparison
        
        console.log('<i class="fas fa-redo"></i> calculateNextRecurringDate:', { baseDate, herhalingType, today: today.toISOString().split('T')[0] });
        
        switch (herhalingType) {
            case 'dagelijks':
                date.setDate(date.getDate() + 1);
                break;
                
            case 'werkdagen':
                // Find next weekday (Monday to Friday)
                do {
                    date.setDate(date.getDate() + 1);
                } while (date.getDay() === 0 || date.getDay() === 6); // Skip weekends
                break;
                
            case 'wekelijks':
                date.setDate(date.getDate() + 7);
                break;
                
            case 'maandelijks':
                date.setMonth(date.getMonth() + 1);
                break;
                
            case 'jaarlijks':
                date.setFullYear(date.getFullYear() + 1);
                break;
                
            case 'om-de-dag':
                date.setDate(date.getDate() + 2);
                break;
                
            case '2-weken':
                date.setDate(date.getDate() + 14);
                break;
                
            case '3-weken':
                date.setDate(date.getDate() + 21);
                break;
                
            case '2-maanden':
                date.setMonth(date.getMonth() + 2);
                break;
                
            case '3-maanden':
                date.setMonth(date.getMonth() + 3);
                break;
                
            case '6-maanden':
                date.setMonth(date.getMonth() + 6);
                break;
                
            // Specific weekdays
            case 'maandag':
                return this.getNextWeekday(date, 1);
            case 'dinsdag':
                return this.getNextWeekday(date, 2);
            case 'woensdag':
                return this.getNextWeekday(date, 3);
            case 'donderdag':
                return this.getNextWeekday(date, 4);
            case 'vrijdag':
                return this.getNextWeekday(date, 5);
            case 'zaterdag':
                return this.getNextWeekday(date, 6);
            case 'zondag':
                return this.getNextWeekday(date, 0);
                
            // Monthly special cases
            case 'eerste-dag-maand':
                return this.getFirstDayOfNextMonth(date);
            case 'laatste-dag-maand':
                return this.getLastDayOfNextMonth(date);
            case 'eerste-werkdag-maand':
                return this.getFirstWorkdayOfNextMonth(date);
            case 'laatste-werkdag-maand':
                return this.getLastWorkdayOfNextMonth(date);
                
            // First weekday of month
            case 'eerste-maandag-maand':
                return this.getFirstWeekdayOfNextMonth(date, 1);
            case 'eerste-dinsdag-maand':
                return this.getFirstWeekdayOfNextMonth(date, 2);
            case 'eerste-woensdag-maand':
                return this.getFirstWeekdayOfNextMonth(date, 3);
            case 'eerste-donderdag-maand':
                return this.getFirstWeekdayOfNextMonth(date, 4);
            case 'eerste-vrijdag-maand':
                return this.getFirstWeekdayOfNextMonth(date, 5);
            case 'eerste-zaterdag-maand':
                return this.getFirstWeekdayOfNextMonth(date, 6);
            case 'eerste-zondag-maand':
                return this.getFirstWeekdayOfNextMonth(date, 0);
                
            // Last weekday of month
            case 'laatste-maandag-maand':
                return this.getLastWeekdayOfNextMonth(date, 1);
            case 'laatste-dinsdag-maand':
                return this.getLastWeekdayOfNextMonth(date, 2);
            case 'laatste-woensdag-maand':
                return this.getLastWeekdayOfNextMonth(date, 3);
            case 'laatste-donderdag-maand':
                return this.getLastWeekdayOfNextMonth(date, 4);
            case 'laatste-vrijdag-maand':
                return this.getLastWeekdayOfNextMonth(date, 5);
            case 'laatste-zaterdag-maand':
                return this.getLastWeekdayOfNextMonth(date, 6);
            case 'laatste-zondag-maand':
                return this.getLastWeekdayOfNextMonth(date, 0);
                
            // Yearly special cases
            case 'eerste-dag-jaar':
                return this.getFirstDayOfNextYear(date);
            case 'laatste-dag-jaar':
                return this.getLastDayOfNextYear(date);
            case 'eerste-werkdag-jaar':
                return this.getFirstWorkdayOfNextYear(date);
            case 'laatste-werkdag-jaar':
                return this.getLastWorkdayOfNextYear(date);
            
            default:
                // Handle complex recurring patterns
                if (herhalingType.startsWith('weekly-')) {
                    // Pattern: weekly-interval-day (e.g., weekly-1-4 = every week on Thursday)
                    const parts = herhalingType.split('-');
                    if (parts.length === 3) {
                        const interval = parseInt(parts[1]);
                        const targetDay = parseInt(parts[2]); // 1=Monday, 2=Tuesday, ..., 7=Sunday
                        
                        console.log('🐛 DEBUG: Parsing weekly pattern:', {interval, targetDay});
                        
                        if (!isNaN(interval) && !isNaN(targetDay) && targetDay >= 0 && targetDay <= 7) {
                            // Convert our day numbering (0-7) to JavaScript day numbering (0-6, Sunday=0)
                            // 0=Sunday, 1=Monday, ..., 6=Saturday, 7=Sunday (legacy)
                            const jsTargetDay = targetDay === 7 ? 0 : targetDay;
                            console.log('🐛 DEBUG: Day conversion:', {targetDay, jsTargetDay});
                            return this.getNextWeekdayWithInterval(date, jsTargetDay, interval);
                        }
                    }
                }
                
                if (herhalingType.startsWith('daily-')) {
                    // Pattern: daily-interval (e.g., daily-3 = every 3 days)
                    const parts = herhalingType.split('-');
                    if (parts.length === 2) {
                        const interval = parseInt(parts[1]);
                        if (!isNaN(interval) && interval > 0) {
                            const nextDate = new Date(date);
                            nextDate.setDate(date.getDate() + interval);
                            return nextDate.toISOString().split('T')[0];
                        }
                    }
                }
                
                if (herhalingType.startsWith('monthly-day-')) {
                    // Pattern: monthly-day-daynum-interval (e.g., monthly-day-15-2 = day 15 every 2 months)
                    const parts = herhalingType.split('-');
                    if (parts.length === 4) {
                        const dayNum = parseInt(parts[2]);
                        const interval = parseInt(parts[3]);
                        if (!isNaN(dayNum) && !isNaN(interval) && dayNum >= 1 && dayNum <= 31) {
                            return this.getNextMonthlyDay(date, dayNum, interval);
                        }
                    }
                }
                
                if (herhalingType.startsWith('yearly-')) {
                    // Pattern: yearly-day-month-interval (e.g., yearly-25-12-1 = Dec 25 every year)
                    const parts = herhalingType.split('-');
                    if (parts.length === 4) {
                        const day = parseInt(parts[1]);
                        const month = parseInt(parts[2]);
                        const interval = parseInt(parts[3]);
                        if (!isNaN(day) && !isNaN(month) && !isNaN(interval) && 
                            day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                            return this.getNextYearlyDate(date, day, month, interval);
                        }
                    }
                }
                
                if (herhalingType.startsWith('monthly-weekday-')) {
                    // Pattern: monthly-weekday-position-day-interval (e.g., monthly-weekday-second-3-1 = second Wednesday every month)
                    const parts = herhalingType.split('-');
                    if (parts.length === 5) {
                        const position = parts[2]; // 'first', 'second', 'third', 'fourth', 'last'
                        const targetDay = parseInt(parts[3]); // 1=Monday, ..., 7=Sunday
                        const interval = parseInt(parts[4]);
                        
                        const validPositions = ['first', 'second', 'third', 'fourth', 'last'];
                        // Allow 'workday' as special case for targetDay
                        const isValidTargetDay = parts[3] === 'workday' || (!isNaN(targetDay) && targetDay >= 1 && targetDay <= 7);
                        if (validPositions.includes(position) && 
                            isValidTargetDay && 
                            !isNaN(interval) && interval > 0) {
                            
                            const nextDateObj = new Date(date);
                            nextDateObj.setMonth(date.getMonth() + interval);
                            
                            // Special handling for workday patterns
                            if (parts[3] === 'workday') {
                                if (position === 'first') {
                                    // First workday of month
                                    nextDateObj.setDate(1);
                                    while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                        nextDateObj.setDate(nextDateObj.getDate() + 1);
                                    }
                                } else if (position === 'last') {
                                    // Last workday of month
                                    const targetMonth = nextDateObj.getMonth();
                                    nextDateObj.setMonth(targetMonth + 1);
                                    nextDateObj.setDate(0); // Last day of target month
                                    while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                        nextDateObj.setDate(nextDateObj.getDate() - 1);
                                    }
                                }
                            } else {
                                // Normal weekday patterns
                                const jsTargetDay = targetDay === 7 ? 0 : targetDay; // Convert to JS day numbering
                                
                                if (position === 'last') {
                                // Find last occurrence of weekday in month
                                const targetMonth = nextDateObj.getMonth();
                                nextDateObj.setMonth(targetMonth + 1);
                                nextDateObj.setDate(0); // Last day of target month
                                while (nextDateObj.getDay() !== jsTargetDay) {
                                    nextDateObj.setDate(nextDateObj.getDate() - 1);
                                }
                            } else {
                                // Find nth occurrence of weekday in month (first, second, third, fourth)
                                const positionNumbers = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 };
                                const occurrenceNumber = positionNumbers[position];
                                
                                nextDateObj.setDate(1); // Start at beginning of month
                                let occurrenceCount = 0;
                                
                                // Find the nth occurrence of the target weekday
                                while (occurrenceCount < occurrenceNumber) {
                                    if (nextDateObj.getDay() === jsTargetDay) {
                                        occurrenceCount++;
                                        if (occurrenceCount === occurrenceNumber) {
                                            break; // Found the nth occurrence
                                        }
                                    }
                                    nextDateObj.setDate(nextDateObj.getDate() + 1);
                                    
                                    // Safety check: if we've gone beyond the month, this occurrence doesn't exist
                                    if (nextDateObj.getMonth() !== (date.getMonth() + interval) % 12) {
                                        return null; // This occurrence doesn't exist in this month
                                    }
                                }
                            }
                            }
                            
                            return nextDateObj.toISOString().split('T')[0];
                        }
                    }
                }
                
                if (herhalingType.startsWith('yearly-special-')) {
                    // Pattern: yearly-special-type-interval (e.g., yearly-special-first-workday-1)
                    const parts = herhalingType.split('-');
                    if (parts.length >= 4) {
                        const specialType = parts.slice(2, -1).join('-'); // Everything except 'yearly', 'special' and interval
                        const interval = parseInt(parts[parts.length - 1]);
                        
                        if (!isNaN(interval) && interval > 0) {
                            const nextDateObj = new Date(date);
                            nextDateObj.setFullYear(date.getFullYear() + interval);
                            
                            if (specialType === 'first-workday') {
                                // First workday of the year
                                nextDateObj.setMonth(0); // January
                                nextDateObj.setDate(1);
                                while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                    nextDateObj.setDate(nextDateObj.getDate() + 1);
                                }
                            } else if (specialType === 'last-workday') {
                                // Last workday of the year
                                nextDateObj.setMonth(11); // December
                                nextDateObj.setDate(31);
                                while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                    nextDateObj.setDate(nextDateObj.getDate() - 1);
                                }
                            }
                            
                            return nextDateObj.toISOString().split('T')[0];
                        }
                    }
                }
                
                // Handle event-based recurrence
                if (herhalingType.startsWith('event-')) {
                    // For event-based recurrence, we need to ask the user for the next event date
                    // This will be handled specially in the task completion flow
                    return null;
                }
                return null;
        }
        
        // Ensure the calculated date is in the future
        // If the calculated date is still in the past, keep calculating until we get a future date
        let calculatedDate = date.toISOString().split('T')[0];
        let iterations = 0;
        const maxIterations = 100; // Prevent infinite loops
        
        while (new Date(calculatedDate) <= today && iterations < maxIterations) {
            console.log(`<i class="fas fa-redo"></i> Date ${calculatedDate} is in past, calculating next occurrence...`);
            iterations++;
            
            // Recalculate from the current calculated date
            const nextCalculation = this.calculateNextRecurringDate(calculatedDate, herhalingType);
            if (!nextCalculation || nextCalculation === calculatedDate) {
                // Prevent infinite recursion or no progress
                console.log('<i class="ti ti-alert-triangle"></i> Could not calculate future date, breaking loop');
                break;
            }
            calculatedDate = nextCalculation;
        }
        
        if (iterations >= maxIterations) {
            console.error('<i class="ti ti-x"></i> Max iterations reached in recurring date calculation');
            return null;
        }
        
        console.log(`<i class="fas fa-check"></i> Final calculated date: ${calculatedDate} (after ${iterations} iterations)`);
        return calculatedDate;
    }

    getNextWeekday(date, targetDay) {
        const currentDay = date.getDay();
        let daysToAdd = targetDay - currentDay;
        
        if (daysToAdd <= 0) {
            daysToAdd += 7;
        }
        
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + daysToAdd);
        return nextDate.toISOString().split('T')[0];
    }

    getNextWeekdayWithInterval(date, targetDay, interval) {
        // Find the next occurrence of targetDay, then add (interval-1) weeks
        const nextDate = this.getNextWeekday(date, targetDay);
        const finalDate = new Date(nextDate);
        
        // Add additional weeks based on interval (interval-1 because we already got next week)
        if (interval > 1) {
            finalDate.setDate(finalDate.getDate() + (interval - 1) * 7);
        }
        
        return finalDate.toISOString().split('T')[0];
    }

    getNextMonthlyDay(date, dayNum, interval) {
        const nextDate = new Date(date);
        nextDate.setMonth(date.getMonth() + interval);
        nextDate.setDate(dayNum);
        
        // Handle months with fewer days (e.g., day 31 in February)
        if (nextDate.getDate() !== dayNum) {
            // Set to last day of month if target day doesn't exist
            nextDate.setDate(0);
        }
        
        return nextDate.toISOString().split('T')[0];
    }

    getNextYearlyDate(date, day, month, interval) {
        const nextDate = new Date(date);
        nextDate.setFullYear(date.getFullYear() + interval);
        nextDate.setMonth(month - 1); // JavaScript months are 0-based
        nextDate.setDate(day);
        
        // Handle leap year issues (e.g., Feb 29 in non-leap year)
        if (nextDate.getDate() !== day) {
            nextDate.setDate(0); // Last day of previous month
        }
        
        return nextDate.toISOString().split('T')[0];
    }

    getFirstDayOfNextMonth(date) {
        const nextMonth = new Date(date);
        nextMonth.setMonth(date.getMonth() + 1);
        nextMonth.setDate(1);
        return nextMonth.toISOString().split('T')[0];
    }

    getLastDayOfNextMonth(date) {
        const nextMonth = new Date(date);
        nextMonth.setMonth(date.getMonth() + 2);
        nextMonth.setDate(0); // Last day of previous month
        return nextMonth.toISOString().split('T')[0];
    }

    getFirstWorkdayOfNextMonth(date) {
        const firstDay = this.getFirstDayOfNextMonth(date);
        const firstDate = new Date(firstDay);
        
        // Find first weekday (Monday = 1, Sunday = 0)
        while (firstDate.getDay() === 0 || firstDate.getDay() === 6) {
            firstDate.setDate(firstDate.getDate() + 1);
        }
        
        return firstDate.toISOString().split('T')[0];
    }

    getLastWorkdayOfNextMonth(date) {
        const lastDay = this.getLastDayOfNextMonth(date);
        const lastDate = new Date(lastDay);
        
        // Find last weekday (Monday = 1, Sunday = 0)
        while (lastDate.getDay() === 0 || lastDate.getDay() === 6) {
            lastDate.setDate(lastDate.getDate() - 1);
        }
        
        return lastDate.toISOString().split('T')[0];
    }

    getFirstWeekdayOfNextMonth(date, targetWeekday) {
        const nextMonth = new Date(date);
        nextMonth.setMonth(date.getMonth() + 1);
        nextMonth.setDate(1);
        
        // Find the first occurrence of the target weekday in the month
        while (nextMonth.getDay() !== targetWeekday) {
            nextMonth.setDate(nextMonth.getDate() + 1);
        }
        
        return nextMonth.toISOString().split('T')[0];
    }

    getLastWeekdayOfNextMonth(date, targetWeekday) {
        const nextMonth = new Date(date);
        nextMonth.setMonth(date.getMonth() + 2);
        nextMonth.setDate(0); // Last day of the next month
        
        // Go backwards to find the last occurrence of the target weekday
        while (nextMonth.getDay() !== targetWeekday) {
            nextMonth.setDate(nextMonth.getDate() - 1);
        }
        
        return nextMonth.toISOString().split('T')[0];
    }

    getFirstDayOfNextYear(date) {
        const nextYear = new Date(date);
        nextYear.setFullYear(date.getFullYear() + 1);
        nextYear.setMonth(0); // January
        nextYear.setDate(1);
        return nextYear.toISOString().split('T')[0];
    }

    getLastDayOfNextYear(date) {
        const nextYear = new Date(date);
        nextYear.setFullYear(date.getFullYear() + 1);
        nextYear.setMonth(11); // December
        nextYear.setDate(31);
        return nextYear.toISOString().split('T')[0];
    }

    getFirstWorkdayOfNextYear(date) {
        const firstDay = this.getFirstDayOfNextYear(date);
        const firstDate = new Date(firstDay);
        
        // Find first weekday (Monday = 1, Sunday = 0)
        while (firstDate.getDay() === 0 || firstDate.getDay() === 6) {
            firstDate.setDate(firstDate.getDate() + 1);
        }
        
        return firstDate.toISOString().split('T')[0];
    }

    getLastWorkdayOfNextYear(date) {
        const lastDay = this.getLastDayOfNextYear(date);
        const lastDate = new Date(lastDay);
        
        // Find last weekday (Monday = 1, Sunday = 0)
        while (lastDate.getDay() === 0 || lastDate.getDay() === 6) {
            lastDate.setDate(lastDate.getDate() - 1);
        }
        
        return lastDate.toISOString().split('T')[0];
    }

    // Utility function to get the correct next date for toast messages
    getCalculatedNextDate(task, calculatedEventDate = null) {
        if (task.herhalingType && task.herhalingType.startsWith('event-')) {
            // For event-based patterns, use the calculated event date
            return calculatedEventDate;
        } else {
            // For normal patterns, use the standard calculation
            return this.calculateNextRecurringDate(task.verschijndatum, task.herhalingType);
        }
    }

    async createNextRecurringTask(originalTask, nextDate) {
        try {
            console.log('<i class="fas fa-redo"></i> Creating next recurring task:', {
                originalTask: originalTask,
                nextDate: nextDate,
                targetList: originalTask.lijst
            });
            
            // Validate input parameters
            if (!originalTask || !nextDate) {
                console.error('❌ Invalid parameters for createNextRecurringTask:', { originalTask, nextDate });
                toast.error('Fout: Ongeldige parameters voor herhalende taak');
                return null;
            }
            
            // Validate date format
            if (!nextDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                console.error('❌ Invalid date format:', nextDate);
                toast.error('Fout: Ongeldige datum voor herhalende taak');
                return null;
            }
            
            // Debug: Log what we're sending to the server
            console.log('📤 Sending to recurring API:', {
                originalTask,
                nextDate,
                taskProperties: Object.keys(originalTask),
                herhalingInfo: {
                    herhalingType: originalTask.herhalingType,
                    herhaling_type: originalTask.herhaling_type,
                    herhalingActief: originalTask.herhalingActief,
                    herhaling_actief: originalTask.herhaling_actief
                }
            });
            
            const response = await fetch('/api/taak/recurring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalTask: originalTask,
                    nextDate: nextDate
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('<i class="fas fa-check"></i> New recurring task created with ID:', result.taskId);
                
                // Verify the task was actually created
                try {
                    const checkResponse = await fetch(`/api/taak/${result.taskId}`);
                    if (checkResponse.ok) {
                        const newTask = await checkResponse.json();
                        console.log('<i class="ti ti-search"></i> VERIFIED: New recurring task in database:', newTask);
                        return result.taskId;
                    } else {
                        console.error('<i class="ti ti-x"></i> Task creation verification failed, status:', checkResponse.status);
                        toast.error('Waarschuwing: Herhalende taak aangemaakt maar verificatie mislukt');
                        return null;
                    }
                } catch (verifyError) {
                    console.error('<i class="ti ti-x"></i> Task verification failed:', verifyError);
                    // Don't show error toast here - task might still be created successfully
                    return result.taskId; // Return the ID anyway
                }
            } else {
                const errorText = await response.text();
                console.error('<i class="ti ti-x"></i> Failed to create recurring task:', response.status, errorText);
                
                // Parse specific error messages
                if (response.status === 400) {
                    toast.error('Fout: Ongeldige gegevens voor herhalende taak');
                } else if (response.status === 500) {
                    toast.error('Server fout bij aanmaken herhalende taak. Probeer later opnieuw.');
                } else {
                    toast.error(`Fout bij aanmaken herhalende taak (${response.status})`);
                }
                return null;
            }
        } catch (error) {
            console.error('Error creating recurring task:', error);
            toast.error('Netwerk fout bij aanmaken herhalende taak');
            return null;
        }
    }

    getProjectNaam(projectId) {
        if (!projectId || projectId === '') return 'Geen project';
        const project = this.projecten.find(p => p.id === projectId);
        return project ? project.naam : 'Onbekend project';
    }

    getContextNaam(contextId) {
        if (!contextId || contextId === '') return 'Geen context';
        const context = this.contexten.find(c => c.id === contextId);
        return context ? context.naam : 'Onbekende context';
    }

    getPrioriteitIndicator(prioriteit) {
        if (!prioriteit) prioriteit = 'gemiddeld';
        
        const prioriteitConfig = {
            'hoog': { label: 'Hoog', color: '#FF4444', icon: 'fas fa-circle' },
            'gemiddeld': { label: 'Gemiddeld', color: '#FF9500', icon: 'fas fa-circle' },
            'laag': { label: 'Laag', color: '#8E8E93', icon: 'fas fa-circle' }
        };
        
        const config = prioriteitConfig[prioriteit];
        return `<i class="${config.icon} prioriteit-indicator prioriteit-${prioriteit}" style="color: ${config.color};" title="${config.label}"></i>`;
    }

    async toggleTopPriority(taakId, checkbox) {
        await loading.withLoading(async () => {
            const isChecked = checkbox.checked;
            const today = new Date().toISOString().split('T')[0];

            if (isChecked) {
                // Check current count of top priorities
                const response = await fetch(`/api/prioriteiten/${today}`);
                const currentPriorities = response.ok ? await response.json() : [];

                if (currentPriorities.length >= 3) {
                    // Maximum 3 priorities - show error and uncheck
                    checkbox.checked = false;
                    toast.error('Maximum 3 top prioriteiten - verwijder eerst een andere prioriteit');
                    return;
                }

                // Find next available position (1, 2, or 3)
                const usedPositions = currentPriorities.map(p => p.top_prioriteit);
                let nextPosition = 1;
                while (usedPositions.includes(nextPosition) && nextPosition <= 3) {
                    nextPosition++;
                }

                // Set priority on server
                const setPriorityResponse = await fetch(`/api/taak/${taakId}/prioriteit`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prioriteit: nextPosition,
                        datum: today
                    })
                });

                if (!setPriorityResponse.ok) {
                    const errorData = await setPriorityResponse.json();
                    checkbox.checked = false;
                    toast.error(errorData.error || 'Fout bij instellen prioriteit');
                    return;
                }

                // Reload planning view to show updated star states
                await this.toonDagelijksePlanning();
                toast.success('Top prioriteit ingesteld');
            } else {
                // Remove priority
                const removePriorityResponse = await fetch(`/api/taak/${taakId}/prioriteit`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prioriteit: null })
                });

                if (!removePriorityResponse.ok) {
                    const errorData = await removePriorityResponse.json();
                    checkbox.checked = true;
                    toast.error(errorData.error || 'Fout bij verwijderen prioriteit');
                    return;
                }

                // Reload planning view to show updated star states
                await this.toonDagelijksePlanning();
                toast.success('Top prioriteit verwijderd');
            }
        }, {
            operationId: 'toggle-priority',
            showGlobal: true,
            message: 'Prioriteit bijwerken...'
        });
    }

    async updatePlanningGridAfterPriorityChange() {
        // Only update if we're in the daily planning view
        const planningGrid = document.querySelector('.dagelijkse-planning-layout');
        if (!planningGrid) {
            return; // Not in daily planning view
        }
        
        // Update CSS classes on existing planning items in the day planner
        const planningItems = document.querySelectorAll('.planning-item[data-type="taak"]');
        
        planningItems.forEach(item => {
            // Find actie ID from the checkbox data attribute
            const checkbox = item.querySelector('.task-checkbox');
            if (checkbox) {
                const actieId = checkbox.dataset.actieId;
                
                if (actieId) {
                    // Check if this task is now a priority
                    const isPriority = this.topPrioriteiten?.some(p => p && p.id === actieId);
                    
                    if (isPriority) {
                        item.classList.add('priority-task');
                        // Add priority star if not already present
                        if (!item.querySelector('.priority-indicator')) {
                            const iconElement = item.querySelector('.planning-icon');
                            if (iconElement) {
                                iconElement.insertAdjacentHTML('afterend', '<span class="priority-indicator">⭐</span>');
                            }
                        }
                    } else {
                        item.classList.remove('priority-task');
                        // Remove priority star if present
                        const priorityIndicator = item.querySelector('.priority-indicator');
                        if (priorityIndicator) {
                            priorityIndicator.remove();
                        }
                    }
                }
            }
        });
    }

    initPlanningResizer() {
        const splitter = document.getElementById('planningSplitter');
        if (!splitter) {
            console.log('🔍 Splitter element not found');
            return;
        }

        const sidebar = document.querySelector('.planning-sidebar');
        const calendar = document.querySelector('.dag-kalender');
        const container = document.querySelector('.dagelijkse-planning-layout');
        
        if (!sidebar || !calendar || !container) {
            console.log('🔍 Required elements not found:', { sidebar: !!sidebar, calendar: !!calendar, container: !!container });
            return;
        }

        console.log('🔍 Initializing planning resizer...');

        let isResizing = false;
        let startX = 0;
        let startSidebarWidth = 0;

        // Load saved width from localStorage
        const savedWidth = localStorage.getItem('planning-sidebar-width');
        if (savedWidth) {
            const width = parseFloat(savedWidth);
            if (width >= 20 && width <= 80) { // Validate range (20% to 80%)
                console.log('🔍 Loading saved width:', width + '%');
                sidebar.style.setProperty('width', width + '%', 'important');
                calendar.style.setProperty('width', (100 - width) + '%', 'important');
            }
        }

        const startResize = (e) => {
            console.log('🔍 Start resize triggered', e.type);
            e.preventDefault();
            e.stopPropagation();
            
            isResizing = true;
            
            // Better touch/mouse coordinate handling
            if (e.type === 'touchstart' && e.touches && e.touches.length > 0) {
                startX = e.touches[0].clientX;
            } else if (e.type === 'mousedown') {
                startX = e.clientX;
            } else {
                console.warn('🚨 Could not determine start coordinates');
                return;
            }
            
            startSidebarWidth = (sidebar.offsetWidth / container.offsetWidth) * 100;
            
            console.log('🔍 Resize started:', { startX, startSidebarWidth, eventType: e.type });
            
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            document.body.style.pointerEvents = 'none'; // Prevent interference
            splitter.style.pointerEvents = 'auto'; // Keep splitter active
            
            // Add visual feedback
            splitter.classList.add('resizing');
            
            // Add haptic feedback on iOS
            if (e.type === 'touchstart' && 'vibrate' in navigator) {
                navigator.vibrate(50);
            }
        };

        const doResize = (e) => {
            if (!isResizing) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            // Better touch/mouse coordinate handling
            let currentX;
            if (e.type === 'touchmove' && e.touches && e.touches.length > 0) {
                currentX = e.touches[0].clientX;
            } else if (e.type === 'mousemove') {
                currentX = e.clientX;
            } else {
                console.warn('🚨 Could not determine current coordinates');
                return;
            }
            
            const deltaX = currentX - startX;
            const containerWidth = container.offsetWidth;
            const deltaPercent = (deltaX / containerWidth) * 100;
            
            let newSidebarWidth = startSidebarWidth + deltaPercent;
            
            // Constrain width between 20% and 80%
            newSidebarWidth = Math.max(20, Math.min(80, newSidebarWidth));
            
            const newCalendarWidth = 100 - newSidebarWidth;
            
            console.log('🔍 Resizing:', { currentX, deltaX, newSidebarWidth, eventType: e.type });
            
            sidebar.style.setProperty('width', newSidebarWidth + '%', 'important');
            calendar.style.setProperty('width', newCalendarWidth + '%', 'important');
        };

        const stopResize = (e) => {
            if (!isResizing) return;
            
            console.log('🔍 Stop resize triggered');
            
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.body.style.pointerEvents = '';
            splitter.style.pointerEvents = '';
            splitter.classList.remove('resizing');
            
            // Save width to localStorage
            const sidebarWidth = (sidebar.offsetWidth / container.offsetWidth) * 100;
            localStorage.setItem('planning-sidebar-width', sidebarWidth.toString());
            
            console.log('🔍 Resize stopped, saved width:', sidebarWidth);
        };

        // Remove any existing event listeners to prevent duplicates
        splitter.removeEventListener('mousedown', startResize);
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);

        // Mouse events
        splitter.addEventListener('mousedown', startResize);
        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);

        // Touch events for mobile
        splitter.addEventListener('touchstart', startResize, { passive: false });
        document.addEventListener('touchmove', doResize, { passive: false });
        document.addEventListener('touchend', stopResize);

        console.log('🔍 Planning resizer initialized successfully');
    }

    initCollapsibleSections() {
        // Load saved collapse states from localStorage
        const savedStates = JSON.parse(localStorage.getItem('planning-collapse-states') || '{}');

        // Determine default states based on screen size
        const isLaptop = window.innerWidth <= 1599;
        const defaults = {
            'tijd': !isLaptop, // Open on desktop, closed on laptop
            'templates': !isLaptop // Open on desktop, closed on laptop
        };

        // Apply saved states or defaults
        ['tijd', 'templates'].forEach(section => {
            const shouldBeOpen = savedStates[section] !== undefined ? savedStates[section] : defaults[section];
            const sectionEl = document.getElementById(`${section}-sectie`);

            if (sectionEl && !shouldBeOpen) {
                sectionEl.classList.add('collapsed');
                const chevron = sectionEl.querySelector('.chevron i');
                if (chevron) {
                    chevron.classList.remove('fa-chevron-down');
                    chevron.classList.add('fa-chevron-right');
                }
            }
        });

        console.log('🔍 Collapsible sections initialized');
    }

    toggleSection(sectionName) {
        const section = document.getElementById(`${sectionName}-sectie`);
        if (!section) return;
        
        const isCollapsed = section.classList.contains('collapsed');
        const chevron = section.querySelector('.chevron i');
        
        if (isCollapsed) {
            section.classList.remove('collapsed');
            if (chevron) {
                chevron.classList.remove('fa-chevron-right');
                chevron.classList.add('fa-chevron-down');
            }
        } else {
            section.classList.add('collapsed');
            if (chevron) {
                chevron.classList.remove('fa-chevron-down');
                chevron.classList.add('fa-chevron-right');
            }
        }
        
        // Save state to localStorage
        const savedStates = JSON.parse(localStorage.getItem('planning-collapse-states') || '{}');
        savedStates[sectionName] = !section.classList.contains('collapsed');
        localStorage.setItem('planning-collapse-states', JSON.stringify(savedStates));
        
        // Re-bind drag and drop events after DOM changes
        setTimeout(() => {
            this.bindDragAndDropEvents();
        }, 350); // After animation completes
    }

    async vulFilterDropdowns() {
        // Ensure projects and contexts are loaded first
        if (!this.projecten || this.projecten.length === 0) {
            await this.laadProjecten();
        }
        if (!this.contexten || this.contexten.length === 0) {
            await this.laadContexten();
        }
        
        // Project filter vullen
        const projectFilter = document.getElementById('projectFilter');
        if (projectFilter) {
            // Clear existing options except first ("Alle projecten")
            while (projectFilter.children.length > 1) {
                projectFilter.removeChild(projectFilter.lastChild);
            }
            
            // Add project options
            this.projecten.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.naam;
                projectFilter.appendChild(option);
            });
        }

        // Context filter vullen
        const contextFilter = document.getElementById('contextFilter');
        if (contextFilter) {
            // Clear existing options except first ("Alle contexten")
            while (contextFilter.children.length > 1) {
                contextFilter.removeChild(contextFilter.lastChild);
            }
            
            // Add context options
            this.contexten.forEach(context => {
                const option = document.createElement('option');
                option.value = context.id;
                option.textContent = context.naam;
                contextFilter.appendChild(option);
            });
        }
    }

    bindActiesEvents() {
        // Filter event listeners - remove old ones first to prevent duplicates
        const taakFilter = document.getElementById('taakFilter');
        const projectFilter = document.getElementById('projectFilter');
        const contextFilter = document.getElementById('contextFilter');
        const datumFilter = document.getElementById('datumFilter');
        const toekomstToggle = document.getElementById('toonToekomstToggle');

        // Remove existing listeners by cloning elements (clears all listeners)
        if (taakFilter && taakFilter.parentNode) {
            const newTaakFilter = taakFilter.cloneNode(true);
            taakFilter.parentNode.replaceChild(newTaakFilter, taakFilter);
            newTaakFilter.addEventListener('input', () => this.filterActies());
        }
        
        if (projectFilter && projectFilter.parentNode) {
            const newProjectFilter = projectFilter.cloneNode(true);
            projectFilter.parentNode.replaceChild(newProjectFilter, projectFilter);
            newProjectFilter.addEventListener('change', () => this.filterActies());
        }
        
        if (contextFilter && contextFilter.parentNode) {
            const newContextFilter = contextFilter.cloneNode(true);
            contextFilter.parentNode.replaceChild(newContextFilter, contextFilter);
            newContextFilter.addEventListener('change', () => this.filterActies());
        }
        
        if (datumFilter && datumFilter.parentNode) {
            const newDatumFilter = datumFilter.cloneNode(true);
            datumFilter.parentNode.replaceChild(newDatumFilter, datumFilter);
            newDatumFilter.addEventListener('change', () => this.filterActies());
        }
        
        // Prioriteit filter
        const prioriteitFilter = document.getElementById('prioriteitFilter');
        if (prioriteitFilter && prioriteitFilter.parentNode) {
            const newPrioriteitFilter = prioriteitFilter.cloneNode(true);
            prioriteitFilter.parentNode.replaceChild(newPrioriteitFilter, prioriteitFilter);
            newPrioriteitFilter.addEventListener('change', () => this.filterActies());
        }
        
        if (toekomstToggle && toekomstToggle.parentNode) {
            const newToekomstToggle = toekomstToggle.cloneNode(true);
            toekomstToggle.parentNode.replaceChild(newToekomstToggle, toekomstToggle);
            newToekomstToggle.addEventListener('change', () => this.toggleToekomstigeTaken());
        }


        // Sort event listeners
        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => this.sortActies(th.dataset.sort));
        });

        // Close verplaats dropdowns bij klik buiten
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.verplaats-dropdown')) {
                document.querySelectorAll('.verplaats-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
            }
        });

        // Setup drag & drop voor acties
        this.setupActiesDragAndDrop();
    }

    setupActiesDragAndDrop() {
        // Setup drag events voor alle drag-handles in acties lijst
        document.querySelectorAll('#acties-lijst .drag-handle').forEach(handle => {
            handle.addEventListener('dragstart', (e) => {
                const taakItem = handle.closest('.taak-item');
                const taakId = taakItem.dataset.id;
                const taak = this.taken.find(t => t.id === taakId);
                
                if (taak) {
                    const dragData = {
                        type: 'actie',
                        actieId: taakId,
                        duurMinuten: parseInt(taak.duur) || 30,
                        taakTekst: taak.tekst
                    };
                    
                    e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
                    e.dataTransfer.effectAllowed = 'move';
                    
                    // Store globally for access during dragover events
                    this.currentDragData = dragData;
                    
                    // Visual feedback
                    taakItem.style.opacity = '0.5';
                }
            });
            
            handle.addEventListener('dragend', (e) => {
                const taakItem = handle.closest('.taak-item');
                taakItem.style.opacity = '1';
                
                // Clear global drag data
                this.currentDragData = null;
            });
        });
    }

    async bewerkActie(id) {
        const actie = this.taken.find(t => t.id === id);
        if (actie) {
            this.huidigeTaakId = id;
            this.touchedFields.clear();
            
            // Remove alle invalid classes en touched state
            ['taakNaamInput', 'projectSelect', 'verschijndatum', 'contextSelect', 'duur', 'opmerkingen'].forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.classList.remove('invalid');
                    field.removeAttribute('data-touched');
                }
            });
            
            // Zorg ervoor dat projecten en contexten geladen zijn
            await this.laadProjecten();
            await this.laadContexten();
            
            console.log('🐛 DEBUG bewerkActie - Projecten geladen:', this.projecten.length);
            console.log('🐛 DEBUG bewerkActie - Contexten geladen:', this.contexten.length);
            console.log('🐛 DEBUG bewerkActie - Actie projectId:', actie.projectId);
            console.log('🐛 DEBUG bewerkActie - Actie contextId:', actie.contextId);
            
            // Vul form met actie data
            document.getElementById('taakNaamInput').value = actie.tekst;
            document.getElementById('projectSelect').value = actie.projectId || '';
            document.getElementById('opmerkingen').value = actie.opmerkingen || '';
            
            // Format date correctly for date input (YYYY-MM-DD)
            let dateValue = '';
            if (actie.verschijndatum) {
                if (typeof actie.verschijndatum === 'string') {
                    // If it's already in YYYY-MM-DD format, use as-is
                    if (actie.verschijndatum.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        dateValue = actie.verschijndatum;
                    } else {
                        // Convert ISO string or other format to YYYY-MM-DD
                        const date = new Date(actie.verschijndatum);
                        if (!isNaN(date.getTime())) {
                            dateValue = date.toISOString().split('T')[0];
                        }
                    }
                }
            }
            document.getElementById('verschijndatum').value = dateValue;
            console.log('bewerkActie - loaded date:', actie.verschijndatum, '-> formatted:', dateValue);
            
            document.getElementById('contextSelect').value = actie.contextId;
            document.getElementById('duur').value = actie.duur;
            
            // Prioriteit instellen (altijd zichtbaar)
            const prioriteitFormGroep = document.getElementById('prioriteitFormGroep');
            if (prioriteitFormGroep) {
                prioriteitFormGroep.style.display = 'block';
                document.getElementById('prioriteitSelect').value = actie.prioriteit || 'gemiddeld';
            }
            
            const herhalingType = actie.herhalingType || '';
            document.getElementById('herhalingSelect').value = herhalingType;
            console.log('bewerkActie - loaded herhalingType:', herhalingType, 'herhalingActief:', actie.herhalingActief);
            
            // Update display text - eerst de popup vorm laden, dan de tekst genereren
            this.parseHerhalingValue(herhalingType);
            const herhalingDisplay = this.generateHerhalingDisplayText();
            document.getElementById('herhalingDisplay').value = herhalingDisplay;
            console.log('bewerkActie - generated display text:', herhalingDisplay);
            
            // Set button text - if in inbox, this is making a new action, otherwise editing existing
            const isInboxAction = this.huidigeLijst === 'inbox';
            this.setActionButtonText(isInboxAction);
            
            this.updateButtonState();
            document.getElementById('planningPopup').style.display = 'flex';
            document.getElementById('taakNaamInput').focus();
            
            // Load subtaken for tasks - same logic as planTaak
            console.log('DEBUG: bewerkActie - huidigeLijst:', this.huidigeLijst, 'subtakenManager exists:', !!subtakenManager);
            
            if (subtakenManager) {
                if (this.huidigeLijst === 'acties') {
                    console.log('DEBUG: bewerkActie - Loading existing subtaken for acties lijst');
                    // Load existing subtaken for tasks from acties lijst
                    await subtakenManager.loadSubtaken(id);
                } else {
                    console.log('DEBUG: bewerkActie - Showing empty subtaken sectie for inbox task');
                    // Show empty subtaken sectie for new tasks from inbox
                    subtakenManager.showSubtakenSectie();
                    subtakenManager.currentSubtaken = [];
                    subtakenManager.renderSubtaken();
                }
            } else {
                console.log('DEBUG: bewerkActie - Fallback - subtakenManager not available, showing sectie directly');
                // Fallback: directly show subtaken sectie if manager not ready
                const subtakenSectie = document.getElementById('subtaken-sectie');
                console.log('DEBUG: bewerkActie - subtaken-sectie element found:', !!subtakenSectie);
                if (subtakenSectie) {
                    subtakenSectie.style.display = 'block';
                    console.log('DEBUG: bewerkActie - subtaken-sectie set to block');
                    // Show empty state
                    const emptyState = document.getElementById('subtaken-empty');
                    const lijst = document.getElementById('subtaken-lijst');
                    console.log('DEBUG: bewerkActie - empty state found:', !!emptyState, 'lijst found:', !!lijst);
                    if (emptyState && lijst) {
                        emptyState.style.display = 'block';
                        lijst.innerHTML = '';
                        console.log('DEBUG: bewerkActie - empty state shown');
                    }
                }
            }

            // Initialize bijlagen manager for this task
            console.log('DEBUG: bewerkActie - bijlagenManager exists:', !!bijlagenManager);
            if (bijlagenManager) {
                console.log('DEBUG: bewerkActie - Initializing bijlagen for task:', id);
                await bijlagenManager.initializeForTask(id);
            }
            
            // Track usage for progressive F-key tips
            this.trackPlanningUsage();
        }
    }

    toggleVerplaatsDropdown(id) {
        // Sluit alle andere dropdowns
        document.querySelectorAll('.verplaats-menu').forEach(menu => {
            if (menu.id !== `verplaats-${id}`) {
                menu.style.display = 'none';
            }
        });

        // Toggle de specifieke dropdown
        const menu = document.getElementById(`verplaats-${id}`);
        if (menu) {
            if (menu.style.display === 'none' || menu.style.display === '') {
                // Position the menu below the button using fixed positioning
                const button = menu.previousElementSibling;
                const rect = button.getBoundingClientRect();
                
                menu.style.position = 'fixed';
                menu.style.top = (rect.bottom + 2) + 'px';
                menu.style.left = (rect.right - 140) + 'px'; // Align right edge
                menu.style.display = 'block';
            } else {
                menu.style.display = 'none';
            }
        }
    }

    async verplaatsActie(id, naarLijst) {
        const actie = this.taken.find(t => t.id === id);
        if (!actie) return;

        await loading.withLoading(async () => {
            await this.verplaatsTaakNaarLijst(actie, naarLijst);
            // Remove from local list (no need to save - already done by server)
            this.taken = this.taken.filter(t => t.id !== id);
            await this.preserveActionsFilters(() => this.renderTaken());
        }, {
            operationId: 'verplaats-actie',
            showGlobal: true,
            message: `Actie wordt verplaatst naar ${naarLijst}...`
        });
        
        // Update counts in background (non-blocking)
        this.laadTellingen();
        
        // Sluit dropdown
        const menu = document.getElementById(`verplaats-${id}`);
        if (menu) menu.style.display = 'none';
    }

    filterActies() {
        const taakFilter = document.getElementById('taakFilter')?.value.toLowerCase() || '';
        const projectFilter = document.getElementById('projectFilter')?.value || '';
        const contextFilter = document.getElementById('contextFilter')?.value || '';
        const datumFilter = document.getElementById('datumFilter')?.value || '';
        const prioriteitFilter = document.getElementById('prioriteitFilter')?.value || '';

        // Support both .actie-row (table layout) and .taak-item (list layout)
        const elementsToFilter = document.querySelectorAll('.actie-row, .taak-item');
        elementsToFilter.forEach(row => {
            const actieId = row.dataset.id;
            const actie = this.taken.find(t => t.id === actieId);
            
            // Skip if task not found in taken array
            if (!actie) {
                row.style.display = 'none';
                return;
            }
            
            let tonen = true;
            
            // Taak tekst filter (contains search) - only filter if there's actual text
            if (taakFilter && taakFilter.trim() !== '') {
                if (!actie.tekst.toLowerCase().includes(taakFilter.trim())) {
                    tonen = false;
                }
            }
            
            // Bestaande filters - convert to strings for comparison
            if (projectFilter && String(actie.projectId) !== projectFilter) tonen = false;
            if (contextFilter && String(actie.contextId) !== contextFilter) tonen = false;
            
            // Datum filter - vergelijk correct geformatteerde datums
            if (datumFilter && actie.verschijndatum) {
                // Converteer database datum naar YYYY-MM-DD format voor vergelijking
                let taakDatum = actie.verschijndatum;
                
                // Als de datum al een Date object is, converteer naar ISO string
                if (actie.verschijndatum instanceof Date) {
                    taakDatum = actie.verschijndatum.toISOString().split('T')[0];
                } else if (typeof actie.verschijndatum === 'string') {
                    // Als het een string is, probeer het te parsen naar YYYY-MM-DD
                    const parsed = new Date(actie.verschijndatum);
                    if (!isNaN(parsed.getTime())) {
                        taakDatum = parsed.toISOString().split('T')[0];
                    }
                }
                
                if (taakDatum !== datumFilter) tonen = false;
            }
            
            // Prioriteit filter
            if (prioriteitFilter && actie.prioriteit !== prioriteitFilter) {
                tonen = false;
            }
            
            // Toekomstige taken filter - check of taak in de toekomst is
            if (!this.toonToekomstigeTaken && actie.verschijndatum) {
                const vandaag = new Date().toISOString().split('T')[0];
                let taakDatum = actie.verschijndatum;
                
                // Normaliseer datum voor vergelijking
                if (actie.verschijndatum instanceof Date) {
                    taakDatum = actie.verschijndatum.toISOString().split('T')[0];
                } else if (typeof actie.verschijndatum === 'string') {
                    const parsed = new Date(actie.verschijndatum);
                    if (!isNaN(parsed.getTime())) {
                        taakDatum = parsed.toISOString().split('T')[0];
                    }
                }
                
                // Verberg toekomstige taken als toggle uit staat
                if (taakDatum > vandaag) {
                    tonen = false;
                }
            }
            
            row.style.display = tonen ? '' : 'none';
        });
    }

    sortActies(sortBy) {
        // Toggle sort direction voor deze kolom
        this.sortDirection[sortBy] = this.sortDirection[sortBy] === 'asc' ? 'desc' : 'asc';
        const isAscending = this.sortDirection[sortBy] === 'asc';

        // Sorteer de taken array
        this.taken.sort((a, b) => {
            let valueA, valueB;

            switch (sortBy) {
                case 'tekst':
                    valueA = a.tekst.toLowerCase();
                    valueB = b.tekst.toLowerCase();
                    break;
                case 'project':
                    valueA = this.getProjectNaam(a.projectId).toLowerCase();
                    valueB = this.getProjectNaam(b.projectId).toLowerCase();
                    break;
                case 'context':
                    valueA = this.getContextNaam(a.contextId).toLowerCase();
                    valueB = this.getContextNaam(b.contextId).toLowerCase();
                    break;
                case 'verschijndatum':
                    valueA = new Date(a.verschijndatum);
                    valueB = new Date(b.verschijndatum);
                    break;
                case 'duur':
                    valueA = parseInt(a.duur) || 0;
                    valueB = parseInt(b.duur) || 0;
                    break;
                default:
                    return 0;
            }

            // Vergelijk waardes
            let comparison = 0;
            if (valueA > valueB) {
                comparison = 1;
            } else if (valueA < valueB) {
                comparison = -1;
            }

            // Return result based on sort direction
            return isAscending ? comparison : -comparison;
        });

        // Update UI
        this.updateSortIndicators(sortBy);
        this.renderActiesRows();
    }

    updateSortIndicators(sortBy) {
        // Remove all sort indicators
        document.querySelectorAll('.acties-table th.sortable').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
            // Remove existing sort arrows
            const existingArrow = th.querySelector('.sort-arrow');
            if (existingArrow) existingArrow.remove();
        });

        // Add sort indicator to current column
        const currentTh = document.querySelector(`[data-sort="${sortBy}"]`);
        if (currentTh) {
            const isAscending = this.sortDirection[sortBy] === 'asc';
            currentTh.classList.add(isAscending ? 'sorted-asc' : 'sorted-desc');
            
            // Add arrow indicator
            const arrow = document.createElement('span');
            arrow.className = 'sort-arrow';
            arrow.textContent = isAscending ? ' ↑' : ' ↓';
            currentTh.appendChild(arrow);
        }
    }

    toggleDropdown(type = 'uitgesteld') {
        const content = document.getElementById(`${type}-content`);
        const arrow = document.querySelector(`#${type}-dropdown .dropdown-arrow`);
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            arrow.classList.add('rotated');
        } else {
            content.style.display = 'none';
            arrow.classList.remove('rotated');
        }
    }

    openTool(tool) {
        // Handle tool navigation
        switch(tool) {
            case 'contextenbeheer':
                this.showContextenBeheer();
                break;
            case 'csv-import':
                window.open('/csv-mapper.html', '_blank');
                break;
            case 'notion-import':
                window.open('/notion-recurring-import.html', '_blank');
                break;
            case 'notion-import-old':
                window.open('/notion-import.html', '_blank');
                break;
            case 'wekelijkse-optimalisatie':
                this.showWekelijkseOptimalisatie();
                break;
            case 'zoeken':
                this.showZoekInterface();
                break;
            case 'test-herhalingen':
                window.open('/test-herhalingen.html', '_blank');
                break;
            default:
                console.log('Unknown tool:', tool);
        }
    }

















    showContextenBeheer() {
        // Update active list in sidebar - remove all actief classes
        document.querySelectorAll('.lijst-item').forEach(item => {
            item.classList.remove('actief');
        });

        // Highlight the contexten beheer tool item
        const contextenbeheerItem = document.querySelector('[data-tool="contextenbeheer"]');
        if (contextenbeheerItem) {
            contextenbeheerItem.classList.add('actief');
        }

        // Tools dropdown removed - Feature 009: no longer needed

        // Update page title
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = 'Contexten Beheer';
        }

        // Hide input container
        const inputContainer = document.getElementById('taak-input-container');
        if (inputContainer) {
            inputContainer.style.display = 'none';
        }

        // Set current list and save it
        this.huidigeLijst = 'contextenbeheer';
        this.saveCurrentList();

        // Show contexten beheer interface
        this.renderContextenBeheer();
    }

    restoreNormalContainer(targetLijst = null) {
        
        // Ensure sidebar is visible
        const sidebar = document.querySelector('.sidebar');
        const appLayout = document.querySelector('.app-layout');
        if (sidebar) {
            sidebar.style.display = '';
            sidebar.style.width = '';
        }
        if (appLayout) {
            appLayout.style.flexDirection = '';
        }
        
        // First check if we're coming from uitgesteld consolidated view
        const uitgesteldContainer = document.querySelector('.uitgesteld-accordion');
        if (uitgesteldContainer) {
            // Clean up any scroll indicators before removing container
            const scrollIndicators = document.querySelectorAll('.scroll-indicator-fixed');
            scrollIndicators.forEach(indicator => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            });
            
            // Remove the uitgesteld accordion container completely
            const contentArea = document.querySelector('.content-area');
            if (contentArea) {
                contentArea.innerHTML = '';
                
                // Update the title as well when cleaning up uitgesteld
                const titles = {
                    'inbox': 'Inbox',
                    'acties': 'Acties',
                    'projecten': 'Projecten',
                    'opvolgen': 'Opvolgen',
                    'afgewerkte-taken': 'Afgewerkt',
                    'dagelijkse-planning': 'Dagelijkse Planning',
                    'contextenbeheer': 'Contexten Beheer',
                    'uitgesteld-wekelijks': 'Wekelijks',
                    'uitgesteld-maandelijks': 'Maandelijks',
                    'uitgesteld-3maandelijks': '3-maandelijks',
                    'uitgesteld-6maandelijks': '6-maandelijks',
                    'uitgesteld-jaarlijks': 'Jaarlijks'
                };
                
                const pageTitle = document.getElementById('page-title');
                if (pageTitle) {
                    pageTitle.textContent = titles[targetLijst || this.huidigeLijst] || 'Inbox';
                }
                
                // Create proper structure based on target list
                const isInbox = (targetLijst || this.huidigeLijst) === 'inbox';
                if (isInbox) {
                    contentArea.innerHTML = `
                        <div class="taak-input-container" id="taak-input-container">
                            <input type="text" id="taakInput" placeholder="Nieuwe taak..." autofocus>
                            <button id="toevoegBtn">Toevoegen</button>
                        </div>
                        <div class="taken-container">
                            <ul id="takenLijst"></ul>
                        </div>
                    `;
                    // Bind event listeners for the newly created inbox elements
                    this.bindInboxEvents();
                } else {
                    contentArea.innerHTML = `
                        <div class="taken-container">
                            <ul id="takenLijst"></ul>
                        </div>
                    `;
                }
                return;
            }
        }
        
        // Restore the normal taken container structure
        const takenLijst = document.getElementById('takenLijst');
        if (!takenLijst) {
            // If takenLijst doesn't exist, find the content area and restore structure
            const contentArea = document.querySelector('.content-area');
            const mainContent = document.querySelector('.main-content');
            
            // Check if we're coming from daily planning FIRST (before checking contentArea)
            if (mainContent && mainContent.querySelector('.dagelijkse-planning-layout')) {
                // Get the correct title for the current list
                const titles = {
                    'inbox': 'Inbox',
                    'acties': 'Acties',
                    'projecten': 'Projecten',
                    'opvolgen': 'Opvolgen',
                    'afgewerkte-taken': 'Afgewerkt',
                    'dagelijkse-planning': 'Dagelijkse Planning',
                    'contextenbeheer': 'Contexten Beheer',
                    'uitgesteld-wekelijks': 'Wekelijks',
                    'uitgesteld-maandelijks': 'Maandelijks',
                    'uitgesteld-3maandelijks': '3-maandelijks',
                    'uitgesteld-6maandelijks': '6-maandelijks',
                    'uitgesteld-jaarlijks': 'Jaarlijks'
                };
                const currentTitle = titles[targetLijst || this.huidigeLijst] || 'Inbox';
                
                // Only show input container for inbox
                const inputContainerHTML = (targetLijst || this.huidigeLijst) === 'inbox' ? `
                    <div class="taak-input-container" id="taak-input-container">
                        <input type="text" id="taakInput" placeholder="Nieuwe taak..." autofocus>
                        <button id="toevoegBtn">Toevoegen</button>
                    </div>
                ` : '';
                
                mainContent.innerHTML = `
                    <header class="main-header">
                        <button class="hamburger-menu" id="hamburger-menu" aria-label="Toggle menu">
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>
                        <h1 id="page-title">${currentTitle}</h1>
                    </header>
                    <div class="content-area">
                        ${inputContainerHTML}
                        <div class="taken-container">
                            <ul id="takenLijst"></ul>
                        </div>
                    </div>
                `;
                
                // Bind event listeners for the newly created inbox elements if this is inbox
                if ((targetLijst || this.huidigeLijst) === 'inbox') {
                    this.bindInboxEvents();
                }
                
                return;
            }

            if (contentArea) {
                
                // Find any existing container that's not the input container
                const existingContainer = contentArea.querySelector('.taken-container, .contexten-beheer, .dagelijkse-planning-layout');
                if (existingContainer && !existingContainer.classList.contains('taak-input-container')) {
                    existingContainer.outerHTML = `
                        <div class="taken-container">
                            <ul id="takenLijst"></ul>
                        </div>
                    `;
                } else {
                    // Create new taken-container if none exists
                    const newContainer = document.createElement('div');
                    newContainer.className = 'taken-container';
                    newContainer.innerHTML = '<ul id="takenLijst"></ul>';
                    contentArea.appendChild(newContainer);
                }
            }
        }
        // If takenLijst already exists, don't modify anything
    }

    async renderContextenBeheer() {
        // Find the container for contexten beheer
        let container;
        const takenLijst = document.getElementById('takenLijst');
        if (takenLijst) {
            container = takenLijst.parentNode;
        } else {
            // If takenLijst doesn't exist, we might be in daily planning mode
            // First try to restore normal container structure
            this.restoreNormalContainer();
            
            // Try again to find takenLijst after restoration
            const restoredTakenLijst = document.getElementById('takenLijst');
            if (restoredTakenLijst) {
                container = restoredTakenLijst.parentNode;
            } else {
                // If still no luck, find the content area
                const contentArea = document.querySelector('.content-area');
                if (contentArea) {
                    container = contentArea.querySelector('.taken-container, .contexten-beheer, .dagelijkse-planning-layout');
                    if (!container) {
                        // Create a new container if none exists
                        container = document.createElement('div');
                        container.className = 'taken-container';
                        contentArea.appendChild(container);
                    }
                } else {
                    console.error('Could not find content area for contexten beheer');
                    return;
                }
            }
        }
        
        // Ensure we have the latest context data
        await this.laadContexten();
        
        container.innerHTML = `
            <div class="contexten-beheer">
                <div class="beheer-header">
                    <h3>🏷️ Contexten Beheer</h3>
                    <button onclick="app.voegContextToe()" class="primary-btn">
                        ➕ Nieuwe Context
                    </button>
                </div>
                
                <div class="contexten-lijst" id="contextenLijst">
                    ${this.contexten.length === 0 ? 
                        '<p class="geen-items">Nog geen contexten aangemaakt. Klik op "Nieuwe Context" om te beginnen.</p>' :
                        this.contexten.map(context => `
                            <div class="context-item" data-id="${context.id}">
                                <div class="context-content">
                                    <span class="context-naam">${context.naam}</span>
                                    <small class="context-info">Aangemaakt: ${new Date(context.aangemaakt).toLocaleDateString('nl-NL')}</small>
                                </div>
                                <div class="context-acties">
                                    <button onclick="app.bewerkeContext('${context.id}')" class="edit-btn" title="Bewerken"><i class="fas fa-edit"></i></button>
                                    <button onclick="app.verwijderContext('${context.id}')" class="delete-btn" title="Verwijderen">×</button>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }

    showWekelijkseOptimalisatie() {
        // Update active list in sidebar - remove all actief classes
        document.querySelectorAll('.lijst-item').forEach(item => {
            item.classList.remove('actief');
        });

        // Highlight the wekelijkse optimalisatie tool item
        const wekelijkseItem = document.querySelector('[data-tool="wekelijkse-optimalisatie"]');
        if (wekelijkseItem) {
            wekelijkseItem.classList.add('actief');
        }

        // Tools dropdown removed - Feature 009: no longer needed

        // Update page title
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = 'Wekelijkse Optimalisatie';
        }

        // Hide input container
        const inputContainer = document.getElementById('taak-input-container');
        if (inputContainer) {
            inputContainer.style.display = 'none';
        }

        // Set current list and save it
        this.huidigeLijst = 'wekelijkse-optimalisatie';
        this.saveCurrentList();

        // Show wekelijkse optimalisatie interface
        this.renderWekelijkseOptimalisatie();
    }

    async renderWekelijkseOptimalisatie() {
        // Find the container - similar to renderContextenBeheer
        let container;
        const takenLijst = document.getElementById('takenLijst');
        if (takenLijst) {
            container = takenLijst.parentNode;
        } else {
            // If takenLijst doesn't exist, we might be in daily planning mode
            // First try to restore normal container structure
            this.restoreNormalContainer();
            
            // Try again to find takenLijst after restoration
            const restoredTakenLijst = document.getElementById('takenLijst');
            if (restoredTakenLijst) {
                container = restoredTakenLijst.parentNode;
            } else {
                // If still no luck, find the content area
                const contentArea = document.querySelector('.content-area');
                if (contentArea) {
                    container = contentArea.querySelector('.taken-container');
                    if (!container) {
                        // Create container if it doesn't exist
                        container = document.createElement('div');
                        container.className = 'taken-container';
                        contentArea.appendChild(container);
                    }
                }
            }
        }

        if (!container) {
            console.error('Could not find container for wekelijkse optimalisatie');
            return;
        }
        
        container.innerHTML = `
            <div class="wekelijkse-optimalisatie-container">
                <!-- 1. OPRUIMEN -->
                <div class="optimalisatie-sectie">
                    <h2 class="sectie-titel">1. OPRUIMEN</h2>
                    <div class="sectie-content">
                        <div class="optimalisatie-item">
                            <input type="checkbox" id="verzamel-papieren" class="optimalisatie-checkbox">
                            <label for="verzamel-papieren">Verzamel losse papieren en materialen</label>
                        </div>
                        <div class="optimalisatie-item">
                            <input type="checkbox" id="verzamelplaatsen-leeg" class="optimalisatie-checkbox">
                            <label for="verzamelplaatsen-leeg">Maak al je verzamelplaatsen leeg</label>
                        </div>
                    </div>
                </div>

                <!-- 2. ACTUALISEREN -->
                <div class="optimalisatie-sectie">
                    <h2 class="sectie-titel">2. ACTUALISEREN</h2>
                    <div class="sectie-content">
                        <div class="optimalisatie-item">
                            <input type="checkbox" id="mind-dump" class="optimalisatie-checkbox">
                            <label for="mind-dump">Doe een mind dump</label>
                            <div class="mind-dump-buttons">
                                <button class="actie-knop" onclick="app.startMindDump()">Start</button>
                                <button class="actie-knop secondary" onclick="app.configureMindDump()">Config</button>
                            </div>
                        </div>
                        <div class="optimalisatie-item">
                            <input type="checkbox" id="bekijk-acties" class="optimalisatie-checkbox">
                            <label for="bekijk-acties">Bekijk je acties lijst</label>
                            <button class="actie-knop" onclick="app.navigateToList('acties')">Ga naar Acties</button>
                        </div>
                        <div class="optimalisatie-item">
                            <input type="checkbox" id="blader-agenda" class="optimalisatie-checkbox">
                            <label for="blader-agenda">Blader door je agenda</label>
                        </div>
                        <div class="optimalisatie-item">
                            <input type="checkbox" id="bekijk-opvolgen" class="optimalisatie-checkbox">
                            <label for="bekijk-opvolgen">Bekijk je opvolgen lijst</label>
                            <button class="actie-knop" onclick="app.navigateToList('opvolgen')">Ga naar Opvolgen</button>
                        </div>
                        <div class="optimalisatie-item">
                            <input type="checkbox" id="bekijk-projecten" class="optimalisatie-checkbox">
                            <label for="bekijk-projecten">Bekijk je projecten lijst</label>
                            <button class="actie-knop" onclick="app.navigateToList('projecten')">Ga naar Projecten</button>
                        </div>
                    </div>
                </div>

                <!-- 3. VERBETEREN -->
                <div class="optimalisatie-sectie">
                    <h2 class="sectie-titel">3. VERBETEREN</h2>
                    <div class="sectie-content">
                        <div class="optimalisatie-item">
                            <input type="checkbox" id="bekijk-uitgesteld" class="optimalisatie-checkbox">
                            <label for="bekijk-uitgesteld">Bekijk je uitgesteld lijst</label>
                            <button class="actie-knop dropdown-trigger" onclick="app.toggleUitgesteldDropdown()">Toon Uitgesteld Lijsten</button>
                        </div>
                    </div>
                </div>

                <!-- Voortgang sectie -->
                <div class="voortgang-sectie">
                    <div class="voortgang-info">
                        <span>Voortgang: </span>
                        <span id="voortgang-percentage">0%</span>
                        <span id="voortgang-items">(0 van 8 items voltooid)</span>
                    </div>
                    <div class="voortgang-balk">
                        <div id="voortgang-vulling" class="voortgang-vulling"></div>
                    </div>
                </div>
            </div>
        `;

        // Bind checkbox change events voor voortgang tracking
        this.bindWekelijkseOptimalisatieEvents();
    }

    bindWekelijkseOptimalisatieEvents() {
        // Track checkbox changes for progress
        const checkboxes = document.querySelectorAll('.optimalisatie-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateWekelijkseVoortgang());
        });

        // Initialize progress
        this.updateWekelijkseVoortgang();
    }

    updateWekelijkseVoortgang() {
        const checkboxes = document.querySelectorAll('.optimalisatie-checkbox');
        const total = checkboxes.length;
        const checked = document.querySelectorAll('.optimalisatie-checkbox:checked').length;
        const percentage = Math.round((checked / total) * 100);

        document.getElementById('voortgang-percentage').textContent = `${percentage}%`;
        document.getElementById('voortgang-items').textContent = `(${checked} van ${total} items voltooid)`;
        document.getElementById('voortgang-vulling').style.width = `${percentage}%`;
    }

    showZoekInterface() {
        // Update active list in sidebar - remove all actief classes
        document.querySelectorAll('.lijst-item').forEach(item => {
            item.classList.remove('actief');
        });

        // Highlight the zoeken tool item
        const zoekenItem = document.querySelector('[data-tool="zoeken"]');
        if (zoekenItem) {
            zoekenItem.classList.add('actief');
        }

        // Tools dropdown removed - Feature 009: no longer needed

        // Update page title
        document.getElementById('page-title').textContent = 'Zoeken';

        // Hide task input
        const taakInputContainer = document.getElementById('taak-input-container');
        if (taakInputContainer) {
            taakInputContainer.style.display = 'none';
        }

        // Restore normal container structure if needed
        this.restoreNormalContainer();

        // Get content container
        const container = document.getElementById('takenLijst');
        if (!container) return;

        // Show search interface
        container.innerHTML = `
            <div class="zoek-interface">
                <div class="zoek-container">
                    <h2><i class="ti ti-search"></i> Zoeken in Taken</h2>
                    <p>Zoek door al je taken in alle lijsten</p>
                    
                    <div class="zoek-form">
                        <div class="zoek-input-container">
                            <input type="text" 
                                   id="zoek-input" 
                                   placeholder="Zoek in taaknamen, opmerkingen, projecten..."
                                   class="zoek-input">
                            <button id="zoek-btn" class="zoek-btn">Zoeken</button>
                        </div>
                        
                        <div class="zoek-filters">
                            <div class="filter-group">
                                <label>Zoek in:</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="filter-inbox" checked>
                                        <span>Inbox</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="filter-acties" checked>
                                        <span>Acties</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="filter-opvolgen" checked>
                                        <span>Opvolgen</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="filter-uitgesteld" checked>
                                        <span>Uitgesteld</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="filter-afgewerkt">
                                        <span>Afgewerkt</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="zoek-resultaten" id="zoek-resultaten" style="display: none;">
                        <h3>Zoekresultaten</h3>
                        <div id="resultaten-lijst"></div>
                    </div>
                </div>
            </div>
        `;

        // Bind events
        this.bindZoekEvents();
    }

    bindZoekEvents() {
        const zoekInput = document.getElementById('zoek-input');
        const zoekBtn = document.getElementById('zoek-btn');

        if (!zoekInput || !zoekBtn) return;

        // Search on button click
        zoekBtn.addEventListener('click', () => this.performSearch());

        // Search on Enter key
        zoekInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Focus on search input
        zoekInput.focus();
    }

    async performSearch() {
        const zoekInput = document.getElementById('zoek-input');
        const resultatenContainer = document.getElementById('zoek-resultaten');
        const resultatenLijst = document.getElementById('resultaten-lijst');

        if (!zoekInput || !resultatenContainer || !resultatenLijst) return;

        const zoekTerm = zoekInput.value.trim().toLowerCase();
        if (!zoekTerm) {
            resultatenContainer.style.display = 'none';
            return;
        }

        // Get selected filters
        const filters = {
            inbox: document.getElementById('filter-inbox')?.checked,
            acties: document.getElementById('filter-acties')?.checked,
            opvolgen: document.getElementById('filter-opvolgen')?.checked,
            uitgesteld: document.getElementById('filter-uitgesteld')?.checked,
            afgewerkt: document.getElementById('filter-afgewerkt')?.checked
        };

        try {
            // Show loading
            resultatenLijst.innerHTML = '<div class="loading">Zoeken...</div>';
            resultatenContainer.style.display = 'block';

            // Get all tasks from selected lists
            const alleTaken = [];
            const lijstNamen = [];

            if (filters.inbox) lijstNamen.push('inbox');
            if (filters.acties) lijstNamen.push('acties');
            if (filters.opvolgen) lijstNamen.push('opvolgen');
            if (filters.afgewerkt) lijstNamen.push('afgewerkte-taken');
            
            if (filters.uitgesteld) {
                lijstNamen.push('uitgesteld-wekelijks', 'uitgesteld-maandelijks', 
                               'uitgesteld-3maandelijks', 'uitgesteld-6maandelijks', 
                               'uitgesteld-jaarlijks');
            }

            // Fetch tasks from all selected lists
            for (const lijstNaam of lijstNamen) {
                try {
                    const response = await fetch(`/api/lijst/${lijstNaam}`);
                    if (response.ok) {
                        const taken = await response.json();
                        taken.forEach(taak => {
                            taak.bron_lijst = lijstNaam; // Add source list info
                            alleTaken.push(taak);
                        });
                    }
                } catch (error) {
                    console.error(`Fout bij laden lijst ${lijstNaam}:`, error);
                }
            }

            // Filter tasks based on search term
            const gevondenTaken = alleTaken.filter(taak => {
                const zoekFields = [
                    taak.tekst,
                    taak.opmerkingen,
                    this.getProjectNaam(taak.projectId),
                    this.getContextNaam(taak.contextId)
                ].filter(field => field); // Remove empty/null fields

                return zoekFields.some(field => 
                    field.toLowerCase().includes(zoekTerm)
                );
            });

            // Display results
            this.displayZoekResultaten(gevondenTaken, zoekTerm);

        } catch (error) {
            console.error('Fout bij zoeken:', error);
            resultatenLijst.innerHTML = '<div class="error">Er is een fout opgetreden bij het zoeken.</div>';
        }
    }

    displayZoekResultaten(taken, zoekTerm) {
        const resultatenLijst = document.getElementById('resultaten-lijst');
        if (!resultatenLijst) return;

        if (taken.length === 0) {
            resultatenLijst.innerHTML = `
                <div class="geen-resultaten">
                    <p>Geen taken gevonden voor "${zoekTerm}"</p>
                    <p class="sub-text">Probeer een andere zoekterm of controleer je filters</p>
                </div>
            `;
            return;
        }

        // Group results by source list
        const groepen = {};
        taken.forEach(taak => {
            const lijstNaam = taak.bron_lijst;
            if (!groepen[lijstNaam]) {
                groepen[lijstNaam] = [];
            }
            groepen[lijstNaam].push(taak);
        });

        let html = `<div class="resultaten-summary">Gevonden: ${taken.length} taken</div>`;

        // Display results grouped by list
        Object.entries(groepen).forEach(([lijstNaam, taken]) => {
            const lijstLabel = this.getLijstLabel(lijstNaam);
            html += `
                <div class="resultaten-groep">
                    <h4 class="groep-header">${lijstLabel} (${taken.length})</h4>
                    <div class="groep-taken">
            `;

            taken.forEach(taak => {
                const projectNaam = this.getProjectNaam(taak.projectId);
                const contextNaam = this.getContextNaam(taak.contextId);
                const datum = taak.verschijndatum ? 
                    new Date(taak.verschijndatum).toLocaleDateString('nl-NL') : '';
                const recurringIndicator = taak.herhalingActief ? 
                    ' <span class="recurring-indicator"><i class="fas fa-redo"></i></span>' : '';

                // Highlight search term in task text
                const highlightedText = this.highlightSearchTerm(taak.tekst, zoekTerm);

                html += `
                    <div class="zoek-resultaat-item" onclick="app.navigateToTask('${taak.id}', '${lijstNaam}')">
                        <div class="resultaat-hoofdtekst">${this.getPrioriteitIndicator(taak.prioriteit)}${highlightedText}${recurringIndicator}</div>
                        <div class="resultaat-details">
                            ${projectNaam ? `<i class="ti ti-folder"></i> ${projectNaam}` : ''}
                            ${contextNaam ? `🏷️ ${contextNaam}` : ''}
                            ${datum ? `<i class="ti ti-calendar"></i> ${datum}` : ''}
                            ${taak.duur ? `⏱️ ${taak.duur} min` : ''}
                        </div>
                        ${taak.opmerkingen ? `<div class="resultaat-opmerkingen">${this.highlightSearchTerm(taak.opmerkingen, zoekTerm)}</div>` : ''}
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        resultatenLijst.innerHTML = html;
    }

    getLijstLabel(lijstNaam) {
        const labels = {
            'inbox': '<i class="ti ti-inbox"></i> Inbox',
            'acties': '<i class="fas fa-clipboard"></i> Acties',
            'opvolgen': '⏳ Opvolgen',
            'afgewerkte-taken': '<i class="fas fa-check"></i> Afgewerkt',
            'uitgesteld-wekelijks': '<i class="ti ti-calendar"></i> Wekelijks',
            'uitgesteld-maandelijks': '<i class="ti ti-calendar"></i> Maandelijks',
            'uitgesteld-3maandelijks': '<i class="ti ti-calendar"></i> 3-maandelijks',
            'uitgesteld-6maandelijks': '<i class="ti ti-calendar"></i> 6-maandelijks',
            'uitgesteld-jaarlijks': '<i class="ti ti-calendar"></i> Jaarlijks'
        };
        return labels[lijstNaam] || lijstNaam;
    }

    highlightSearchTerm(text, zoekTerm) {
        if (!text || !zoekTerm) return text;
        
        const regex = new RegExp(`(${zoekTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    navigateToTask(taakId, lijstNaam) {
        // Navigate to the list containing the task
        this.huidigeLijst = lijstNaam;
        this.saveCurrentList();
        this.laadHuidigeLijst();
    }

    navigateToList(lijst) {
        // Navigate to specified list
        this.huidigeLijst = lijst;
        this.saveCurrentList();
        this.laadHuidigeLijst();
    }

    toggleUitgesteldDropdown() {
        // Toggle the uitgesteld dropdown in the sidebar
        const uitgesteldContent = document.getElementById('uitgesteld-content');
        const uitgesteldDropdown = document.getElementById('uitgesteld-dropdown');
        
        if (uitgesteldContent && uitgesteldDropdown) {
            const isOpen = uitgesteldContent.style.display === 'block';
            uitgesteldContent.style.display = isOpen ? 'none' : 'block';
            const arrow = uitgesteldDropdown.querySelector('.dropdown-arrow');
            if (arrow) {
                arrow.textContent = isOpen ? '▶' : '▼';
            }
        }
    }

    startMindDump() {
        // Create and show mind dump modal
        this.showMindDumpModal();
    }

    showMindDumpModal() {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'mind-dump-modal';
        modal.innerHTML = `
            <div class="mind-dump-container">
                <button class="mind-dump-close" onclick="app.closeMindDump()">×</button>
                
                <div class="mind-dump-content">
                    <h1 id="mind-dump-word" class="mind-dump-word">Loading...</h1>
                    
                    <div class="mind-dump-input-section">
                        <input type="text" 
                               id="mind-dump-input" 
                               class="mind-dump-input" 
                               placeholder="Type hier je gedachte..."
                               autocomplete="off">
                        <button class="mind-dump-add-btn" onclick="app.addMindDumpItem()">
                            Toevoegen (Enter)
                        </button>
                    </div>
                    
                    <button class="mind-dump-next-btn" onclick="app.nextMindDumpWord()">
                        Volgende Woord →
                    </button>
                </div>
                
                <div class="mind-dump-progress">
                    <div class="progress-info">
                        <span id="current-word-index">1</span> / <span id="total-words">10</span>
                    </div>
                    <div class="progress-bar">
                        <div id="mind-dump-progress-fill" class="progress-fill"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Initialize mind dump
        this.initializeMindDump();
    }

    async initializeMindDump() {
        // Load user's word preferences
        await this.loadMindDumpWords();
        
        // Start with first word
        this.currentWordIndex = 0;
        this.showCurrentWord();
        
        // Focus on input
        document.getElementById('mind-dump-input').focus();
        
        // Add enter key listener
        document.getElementById('mind-dump-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addMindDumpItem();
            }
        });
    }

    async loadMindDumpWords() {
        // Complete trigger list from PDF
        this.mindDumpWords = [
            // Professioneel
            'Projecten: gestart maar niet afgerond', 'Projecten: nog te starten', 'Projecten: nog te beoordelen',
            'Baas', 'Partners', 'Adviseurs', 'Coaches', 'Collega\'s', 'Ondergeschikten', 'Klanten',
            'Telefoontjes', 'E-mails', 'Voicemails', 'Brieven', 'Tekstberichten', 'Sociale media',
            'Rapporten', 'Evaluaties', 'Voorstellen', 'Artikelen', 'Instructies', 'Notulen',
            'Boeken', 'Tijdschriften', 'Websites', 'Blogs', 'Podcasts',
            'Cash flow', 'Budgetten', 'Balansposten', 'Prognoses', 'Debiteuren', 'Crediteuren',
            'Doelstellingen', 'Bedrijfsplannen', 'Marketingplannen', 'Presentaties', 'Vergaderingen', 'Reizen',
            'Organisatieschema', 'Reorganisatie', 'Nieuwe systemen', 'Leiderschap', 'Cultuur',
            'Campagnes', 'Materialen', 'Public relations',
            'Juridische kwesties', 'Verzekeringen', 'Personeelszaken', 'Training',
            'Werving', 'Ontslag', 'Functioneringsgesprekken', 'Feedback',
            'Computers', 'Software', 'Databases', 'Kantooruitrusting', 'Archieven',
            'Potentiële klanten', 'Klantenrelaties', 'Klantenservice',
            'Komende vergaderingen', 'Te plannen vergaderingen',
            'Wachten op informatie', 'Gedelegeerde taken', 'Antwoorden', 'Bestellingen',
            'Workshops', 'Vaardigheden ontwikkelen', 'Carrièremogelijkheden', 'CV',
            
            // Persoonlijk  
            'Persoonlijke projecten gestart', 'Persoonlijke projecten te starten',
            'Dienstverlening', 'Gemeenschap', 'Vrijwilligerswerk', 'Spirituele organisaties',
            'Levenspartner', 'Kinderen', 'Ouders', 'Familie', 'Vrienden',
            'Persoonlijke communicatie', 'Kaarten', 'Bedankjes',
            'Verjaardagen', 'Vieringen', 'Huwelijken', 'Feestdagen', 'Vakanties', 'Etentjes',
            'Huishoudelijke apparatuur', 'Telefoons', 'Internet', 'Televisie', 'Archieven thuis',
            'Ontspanning', 'Muziek', 'Video', 'Plekken bezoeken', 'Fotografie', 'Hobbies', 'Koken',
            'Rekeningen', 'Banken', 'Investeringen', 'Belasting', 'Budget', 'Hypotheek',
            'Huisdieren', 'Dierbenodigdheden',
            'Testament', 'Onroerend goed', 'Juridische zaken persoonlijk',
            'Reparaties', 'Uitgeleende items', 'Vergoedingen',
            'Familie activiteiten', 'Kinderen projecten',
            'Huis reparaties', 'Verbouwing', 'Renovatie', 'Tuin', 'Garage', 'Decoratie', 'Meubels', 'Schoonmaken',
            'Artsen', 'Tandarts', 'Controles', 'Voeding', 'Beweging',
            'Cursussen', 'Coaching', 'Creatieve expressie',
            'Auto', 'Fietsen', 'Onderhoud voertuigen', 'Forens',
            'Werkkleding', 'Vrijetijdskleding', 'Sportkleding', 'Accessoires',
            'Winkelen', 'Huishoudelijke artikelen', 'Cadeautjes', 'Levensmiddelen',
            'Buurt', 'Buren', 'Scholen', 'Maatschappelijke betrokkenheid'
        ];
        
        // Load user preferences from database (per user)
        try {
            const response = await fetch('/api/mind-dump/preferences');
            if (response.ok) {
                const data = await response.json();
                this.mindDumpPreferences = data.preferences || {};
                
                // Add custom words from database
                if (data.customWords && data.customWords.length > 0) {
                    // Add custom words that aren't already in the default list
                    data.customWords.forEach(word => {
                        if (!this.mindDumpWords.includes(word)) {
                            this.mindDumpWords.push(word);
                        }
                    });
                }
                
                // Add any new default words that user doesn't have yet
                this.mindDumpWords.forEach(word => {
                    if (this.mindDumpPreferences[word] === undefined) {
                        this.mindDumpPreferences[word] = true;
                    }
                });
            } else {
                // Default: all enabled for new users
                this.mindDumpPreferences = {};
                this.mindDumpWords.forEach(word => {
                    this.mindDumpPreferences[word] = true;
                });
            }
        } catch (error) {
            console.error('Error loading mind dump preferences:', error);
            // Fallback to all enabled
            this.mindDumpPreferences = {};
            this.mindDumpWords.forEach(word => {
                this.mindDumpPreferences[word] = true;
            });
        }
        
        // Filter only enabled words
        this.activeMindDumpWords = this.mindDumpWords.filter(word => this.mindDumpPreferences[word]);
    }

    showCurrentWord() {
        if (this.currentWordIndex >= this.activeMindDumpWords.length) {
            this.completeMindDump();
            return;
        }
        
        const word = this.activeMindDumpWords[this.currentWordIndex];
        document.getElementById('mind-dump-word').textContent = word;
        
        // Update progress
        document.getElementById('current-word-index').textContent = this.currentWordIndex + 1;
        document.getElementById('total-words').textContent = this.activeMindDumpWords.length;
        
        const progressPercent = ((this.currentWordIndex + 1) / this.activeMindDumpWords.length) * 100;
        document.getElementById('mind-dump-progress-fill').style.width = `${progressPercent}%`;
        
        // Clear and focus input
        const input = document.getElementById('mind-dump-input');
        input.value = '';
        input.focus();
    }

    async addMindDumpItem() {
        const input = document.getElementById('mind-dump-input');
        const text = input.value.trim();
        
        if (text) {
            // Check if user is logged in
            if (!this.isLoggedIn()) {
                toast.warning('Log in om taken toe te voegen.');
                return;
            }
            
            // Add to inbox - just the text without extra info
            const taakText = text;
            
            await loading.withLoading(async () => {
                // Create task directly for inbox
                const nieuweTaak = {
                    id: this.generateId(),
                    tekst: taakText,
                    aangemaakt: new Date().toISOString()
                };
                
                // Save task directly to server
                nieuweTaak.lijst = 'inbox';
                const response = await fetch('/api/taak', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nieuweTaak)
                });
                
                if (!response.ok) {
                    throw new Error('Failed to save task to inbox');
                }
                
                // Update counts
                // await this.laadTellingen(); // Disabled - tellers removed from sidebar
                
            }, {
                operationId: 'add-mind-dump-item',
                message: 'Toevoegen aan inbox...'
            });
            
            // Clear input and refocus
            input.value = '';
            input.focus();
            
            toast.success('Toegevoegd aan inbox!');
        }
    }

    nextMindDumpWord() {
        this.currentWordIndex++;
        this.showCurrentWord();
    }

    completeMindDump() {
        toast.success('Mind dump voltooid!');
        this.closeMindDump();
    }

    closeMindDump() {
        const modal = document.querySelector('.mind-dump-modal');
        if (modal) {
            modal.remove();
        }
    }

    async configureMindDump() {
        // Ensure words are loaded first
        if (!this.mindDumpWords) {
            await this.loadMindDumpWords();
        }
        this.showMindDumpConfigModal();
    }

    showMindDumpConfigModal() {
        // Create config modal
        const modal = document.createElement('div');
        modal.className = 'mind-dump-config-modal';
        modal.innerHTML = `
            <div class="mind-dump-config-container">
                <button class="mind-dump-close" onclick="app.closeMindDumpConfig()">×</button>
                
                <h2>Mind Dump Configuratie</h2>
                <p>Selecteer welke woorden je wilt gebruiken in je mind dump sessies:</p>
                
                <div class="config-actions">
                    <button class="config-btn" onclick="app.selectAllWords()">Alles selecteren</button>
                    <button class="config-btn" onclick="app.deselectAllWords()">Alles deselecteren</button>
                    <button class="config-btn primary" onclick="app.saveMindDumpConfig()">Opslaan</button>
                </div>
                
                <div class="words-grid" id="words-config-grid">
                    ${this.renderWordsConfig()}
                </div>
                
                <div class="add-word-section">
                    <h3>Eigen woord toevoegen</h3>
                    <div class="add-word-form">
                        <input type="text" id="new-word-input" placeholder="Nieuw trigger woord..." maxlength="50">
                        <button class="config-btn" onclick="app.addCustomWord()">Toevoegen</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    renderWordsConfig() {
        return this.mindDumpWords.map(word => {
            const isEnabled = this.mindDumpPreferences[word];
            const wordId = word.replace(/[^a-zA-Z0-9]/g, '_');
            return `
                <label class="word-checkbox-item">
                    <input type="checkbox" 
                           id="word_${wordId}" 
                           ${isEnabled ? 'checked' : ''} 
                           onchange="app.toggleWord('${word.replace(/'/g, "\\'")}')">
                    <span class="word-label">${word}</span>
                </label>
            `;
        }).join('');
    }

    toggleWord(word) {
        this.mindDumpPreferences[word] = !this.mindDumpPreferences[word];
    }

    selectAllWords() {
        this.mindDumpWords.forEach(word => {
            this.mindDumpPreferences[word] = true;
        });
        this.refreshWordsConfig();
    }

    deselectAllWords() {
        this.mindDumpWords.forEach(word => {
            this.mindDumpPreferences[word] = false;
        });
        this.refreshWordsConfig();
    }

    refreshWordsConfig() {
        const grid = document.getElementById('words-config-grid');
        if (grid) {
            grid.innerHTML = this.renderWordsConfig();
        }
    }

    addCustomWord() {
        const input = document.getElementById('new-word-input');
        const newWord = input.value.trim();
        
        if (newWord && !this.mindDumpWords.includes(newWord)) {
            this.mindDumpWords.push(newWord);
            this.mindDumpPreferences[newWord] = true;
            input.value = '';
            this.refreshWordsConfig();
            toast.success(`"${newWord}" toegevoegd!`);
        } else if (this.mindDumpWords.includes(newWord)) {
            toast.warning('Dit woord bestaat al!');
        }
    }

    async saveMindDumpConfig() {
        try {
            // Save preferences to database per user
            const response = await fetch('/api/mind-dump/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    preferences: this.mindDumpPreferences,
                    customWords: this.mindDumpWords // Include custom words
                })
            });

            if (response.ok) {
                // Update active words
                this.activeMindDumpWords = this.mindDumpWords.filter(word => this.mindDumpPreferences[word]);
                
                const enabledCount = this.activeMindDumpWords.length;
                toast.success(`Configuratie opgeslagen! ${enabledCount} woorden geselecteerd.`);
                
                this.closeMindDumpConfig();
            } else {
                toast.error('Fout bij opslaan configuratie.');
            }
        } catch (error) {
            console.error('Error saving mind dump config:', error);
            toast.error('Fout bij opslaan configuratie.');
        }
    }

    closeMindDumpConfig() {
        const modal = document.querySelector('.mind-dump-config-modal');
        if (modal) {
            modal.remove();
        }
    }

    async voegContextToe() {
        const naam = await inputModal.show('Nieuwe Context', 'Contextnaam:', '');
        if (!naam || !naam.trim()) return;

        await loading.withLoading(async () => {
            const nieuweContext = {
                id: this.generateId(),
                naam: naam.trim(),
                aangemaakt: new Date().toISOString()
            };

            this.contexten.push(nieuweContext);
            await this.slaContextenOp();
            this.renderContextenBeheer();
            
            // Update all context dropdowns throughout the app
            this.updateContextSelects();
            
            toast.success(`Context "${naam}" toegevoegd`);
        }, {
            operationId: 'add-context',
            showGlobal: true,
            message: 'Context toevoegen...'
        });
    }

    async bewerkeContext(contextId) {
        const context = this.contexten.find(c => c.id === contextId);
        if (!context) return;

        const nieuweNaam = await inputModal.show('Context Bewerken', 'Nieuwe naam:', context.naam);
        if (!nieuweNaam || !nieuweNaam.trim() || nieuweNaam.trim() === context.naam) return;

        await loading.withLoading(async () => {
            const oudeNaam = context.naam;
            context.naam = nieuweNaam.trim();
            
            await this.slaContextenOp();
            this.renderContextenBeheer();
            
            // Update all context dropdowns throughout the app
            this.updateContextSelects();
            
            toast.success(`Context "${oudeNaam}" hernoemd naar "${nieuweNaam}"`);
        }, {
            operationId: 'edit-context',
            showGlobal: true,
            message: 'Context bewerken...'
        });
    }

    async verwijderContext(contextId) {
        const context = this.contexten.find(c => c.id === contextId);
        if (!context) return;

        const bevestiging = await confirmModal.show(
            'Context Verwijderen', 
            `Weet je zeker dat je context "${context.naam}" wilt verwijderen?\n\nDeze actie kan niet ongedaan worden gemaakt.`
        );
        if (!bevestiging) return;

        await loading.withLoading(async () => {
            this.contexten = this.contexten.filter(c => c.id !== contextId);
            await this.slaContextenOp();
            this.renderContextenBeheer();
            
            // Update all context dropdowns throughout the app
            this.updateContextSelects();
            
            toast.success(`Context "${context.naam}" verwijderd`);
        }, {
            operationId: 'delete-context',
            showGlobal: true,
            message: 'Context verwijderen...'
        });
    }

    // Event-based recurrence methods
    async askForNextEventDate(taak) {
        // Parse the event information from the task
        const herhalingParts = taak.herhalingType.split('-');
        const eventName = herhalingParts.slice(3).join('-');
        
        return new Promise((resolve) => {
            this.eventDateResolver = resolve;
            
            // Set the prompt text
            document.getElementById('eventPromptText').innerHTML = 
                `Je hebt zojuist een herhalende taak afgevinkt die gebaseerd is op een gebeurtenis (<strong>${eventName}</strong>).<br><br>Om de datum van de volgende taak te berekenen, hebben we de datum van de volgende ${eventName} nodig.`;
            
            // Set the label text
            document.getElementById('eventDateLabel').textContent = 
                `Datum van volgende ${eventName}:`;
            
            // Clear the date input
            document.getElementById('nextEventDate').value = '';
            
            // Show the popup
            document.getElementById('eventDatePopup').style.display = 'flex';
            document.getElementById('nextEventDate').focus();
        });
    }

    confirmEventDate() {
        const eventDate = document.getElementById('nextEventDate').value;
        if (eventDate && this.isValidDate(eventDate)) {
            document.getElementById('eventDatePopup').style.display = 'none';
            if (this.eventDateResolver) {
                this.eventDateResolver(eventDate);
                this.eventDateResolver = null;
            }
        } else {
            toast.warning('Voer een geldige datum in.');
        }
    }

    cancelEventDate() {
        document.getElementById('eventDatePopup').style.display = 'none';
        if (this.eventDateResolver) {
            this.eventDateResolver(null);
            this.eventDateResolver = null;
        }
    }

    calculateEventBasedDate(eventDate, herhalingType) {
        try {
            const parts = herhalingType.split('-');
            const days = parseInt(parts[1]);
            const direction = parts[2]; // 'voor' or 'na'
            
            const baseDate = new Date(eventDate);
            const taskDate = new Date(baseDate);
            
            if (direction === 'voor') {
                taskDate.setDate(baseDate.getDate() - days);
            } else { // 'na'
                taskDate.setDate(baseDate.getDate() + days);
            }
            
            return taskDate.toISOString().split('T')[0];
        } catch (error) {
            console.error('Error calculating event-based date:', error);
            return null;
        }
    }

    // Planning popup functions
    openPlanningPopup(taakId = '', mode = 'new') {
        console.log('🔍 Opening planning popup for task:', taakId, 'mode:', mode);
        
        // Reset form
        document.getElementById('taakNaamInput').value = '';
        document.getElementById('projectSelect').value = '';
        document.getElementById('verschijndatum').value = new Date().toISOString().split('T')[0];
        document.getElementById('contextSelect').value = '';
        document.getElementById('duur').value = '';
        document.getElementById('herhalingDisplay').value = 'Geen herhaling';
        document.getElementById('herhalingSelect').value = '';
        document.getElementById('opmerkingen').value = '';

        // Load existing task if editing
        if (taakId && mode === 'edit') {
            this.loadTaskIntoPopup(taakId);
        }

        // Initialize bijlagen manager for this task
        if (bijlagenManager) {
            bijlagenManager.initializeForTask(taakId || 'new');
        }

        // Load subtaken if task exists
        if (subtakenManager && taakId) {
            subtakenManager.loadSubtaken(taakId);
        }

        // Show popup
        document.getElementById('planningPopup').style.display = 'flex';
        document.getElementById('taakNaamInput').focus();
    }

    async loadTaskIntoPopup(taakId) {
        try {
            // Find task in current tasks array
            const taak = this.taken.find(t => t.id === taakId);
            if (!taak) {
                console.warn('Task not found in current list:', taakId);
                return;
            }

            // Populate form fields
            document.getElementById('taakNaamInput').value = taak.tekst || '';
            document.getElementById('projectSelect').value = taak.projectId || '';
            document.getElementById('verschijndatum').value = taak.verschijndatum || new Date().toISOString().split('T')[0];
            document.getElementById('contextSelect').value = taak.contextId || '';
            document.getElementById('duur').value = taak.duur || '';
            document.getElementById('opmerkingen').value = taak.opmerkingen || '';

            // Handle recurring task fields
            if (taak.herhalingType) {
                document.getElementById('herhalingSelect').value = taak.herhalingType;
                // Generate display text for recurring task
                const displayText = this.generateHerhalingDisplayTextFromType(taak.herhalingType);
                document.getElementById('herhalingDisplay').value = displayText;
            }

        } catch (error) {
            console.error('Error loading task into popup:', error);
        }
    }

    generateHerhalingDisplayTextFromType(herhalingType) {
        // Simplified version for existing tasks - you can expand this
        if (!herhalingType) return 'Geen herhaling';
        
        if (herhalingType === 'dagelijks') return 'Elke dag';
        if (herhalingType === 'werkdagen') return 'Elke werkdag';
        if (herhalingType.includes('weekly')) return 'Wekelijks';
        if (herhalingType.includes('monthly')) return 'Maandelijks';
        if (herhalingType.includes('yearly')) return 'Jaarlijks';
        
        return herhalingType; // fallback
    }

    sluitPlanningPopup() {
        document.getElementById('planningPopup').style.display = 'none';
    }

    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
    }

    async renderDagelijksePlanning(container) {
        if (!container) {
            console.error('renderDagelijksePlanning: container is null');
            return;
        }
        
        const today = new Date().toISOString().split('T')[0];
        
        // Laad acties lijst voor filtering en drag & drop
        const actiesResponse = await fetch('/api/lijst/acties');
        let acties = actiesResponse.ok ? await actiesResponse.json() : [];
        
        // Apply date filtering to planning actions (same as main actions list)
        acties = this.filterTakenOpDatum(acties, true);
        
        // Store actions for filtering (make available to filter functions)
        this.planningActies = acties;
        
        // Load projecten and contexten for correct display in planning
        await this.laadProjecten();
        await this.laadContexten();

        // Load top priorities for today to show stars in planning
        const prioriteitenResponse = await fetch(`/api/prioriteiten/${today}`);
        if (prioriteitenResponse.ok) {
            const prioriteiten = await prioriteitenResponse.json();
            this.topPrioriteiten = prioriteiten; // Store as array, not indexed by position
        } else {
            this.topPrioriteiten = [];
        }

        // Laad dagelijkse planning voor vandaag
        const planningResponse = await fetch(`/api/dagelijkse-planning/${today}`);
        const planning = planningResponse.ok ? await planningResponse.json() : [];
        
        // Store planning data locally for fast updates
        this.currentPlanningData = planning;
        
        // Laad ingeplande acties voor indicator
        const ingeplandeResponse = await fetch(`/api/ingeplande-acties/${today}`);
        const ingeplandeActies = ingeplandeResponse.ok ? await ingeplandeResponse.json() : [];
        
        // Load subtaken for all planned tasks
        const plannedTaskIds = planning
            .filter(p => p.type === 'taak' && p.actieId)
            .map(p => p.actieId);
        
        if (plannedTaskIds.length > 0) {
            await this.loadSubtakenForPlanning(plannedTaskIds);
        }
        
        // Get saved time range preference
        const startUur = parseInt(localStorage.getItem('dagplanning-start-uur') || '8');
        const eindUur = parseInt(localStorage.getItem('dagplanning-eind-uur') || '18');
        
        container.innerHTML = `
            <!-- Mobile header met hamburger menu -->
            <header class="main-header">
                <button class="hamburger-menu" id="hamburger-menu" aria-label="Toggle menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <h1>Dagelijkse Planning</h1>
            </header>
            
            <div class="dagelijkse-planning-layout">
                <!-- Left column: Simple sidebar with fixed sections -->
                <div class="planning-sidebar">
                    <!-- Time settings - collapsible section -->
                    <div class="tijd-sectie collapsible" id="tijd-sectie">
                        <div class="section-header" onclick="app.toggleSection('tijd')">
                            <h3>⏰ Tijd</h3>
                            <span class="chevron"><i class="fas fa-chevron-down"></i></span>
                        </div>
                        <div class="section-content">
                            <div class="tijd-inputs">
                                <label>Van: <input type="number" id="startUur" min="0" max="23" value="${startUur}"></label>
                                <label>Tot: <input type="number" id="eindUur" min="1" max="24" value="${eindUur}"></label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Templates - collapsible section -->
                    <div class="templates-sectie collapsible" id="templates-sectie">
                        <div class="section-header" onclick="app.toggleSection('templates')">
                            <h3>🔒 Geblokkeerd & Pauzes</h3>
                            <span class="chevron"><i class="fas fa-chevron-down"></i></span>
                        </div>
                        <div class="section-content">
                            <h4>🔒 Geblokkeerd</h4>
                            <div class="template-items">
                            <div class="template-item" draggable="true" data-type="geblokkeerd" data-duur="30">🔒 30min</div>
                            <div class="template-item" draggable="true" data-type="geblokkeerd" data-duur="60">🔒 60min</div>
                            <div class="template-item" draggable="true" data-type="geblokkeerd" data-duur="90">🔒 90min</div>
                            <div class="template-item" draggable="true" data-type="geblokkeerd" data-duur="120">🔒 120min</div>
                            </div>
                            
                            <h4>☕ Pauzes</h4>
                            <div class="template-items">
                                <div class="template-item" draggable="true" data-type="pauze" data-duur="5">☕ 5min</div>
                                <div class="template-item" draggable="true" data-type="pauze" data-duur="10">☕ 10min</div>
                                <div class="template-item" draggable="true" data-type="pauze" data-duur="15">☕ 15min</div>
                            </div>
                        </div>
                    </div>

                    <!-- Actions - flexible section that takes remaining space -->
                    <div class="acties-sectie">
                        <h3><i class="fas fa-clipboard"></i> Acties</h3>
                        <div class="planning-acties-filters">
                            <input type="text" id="planningTaakFilter" placeholder="Zoek taak..." class="filter-input">
                            <select id="planningProjectFilter" class="filter-select">
                                <option value="">Alle projecten</option>
                            </select>
                            <select id="planningContextFilter" class="filter-select">
                                <option value="">Alle contexten</option>
                            </select>
                            <select id="planningPrioriteitFilter" class="filter-select prioriteit-filter">
                                <option value="">Alle prioriteiten</option>
                                <option value="hoog">🔴 Hoog</option>
                                <option value="gemiddeld">🟠 Gemiddeld</option>
                                <option value="laag">⚪ Laag</option>
                            </select>
                            <input type="number" id="planningDuurFilter" placeholder="Max duur (min)" class="filter-input-number" min="0" step="5">
                            <div class="checkbox-wrapper">
                                <input type="checkbox" id="planningToekomstToggle" ${this.toonToekomstigeTaken ? 'checked' : ''}>
                                <label for="planningToekomstToggle">Toon toekomstige taken</label>
                            </div>
                        </div>
                        <div class="acties-container" id="planningActiesLijst">
                            ${this.renderActiesVoorPlanning(acties, ingeplandeActies)}
                        </div>
                    </div>
                </div>
                
                <!-- Resizable splitter -->
                <div class="planning-splitter" id="planningSplitter">
                    <div class="splitter-handle"></div>
                </div>
                
                <!-- Right column: Day calendar -->
                <div class="dag-kalender">
                    <div class="kalender-header">
                        <h2>${new Date().toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
                        <div class="header-actions">
                            <span id="totaalGeplandeTijd" class="totaal-tijd">Totaal: 0 min</span>
                            <button class="btn-focus-mode" id="btnFocusMode" onclick="app.toggleDagkalenderFocus()" title="Focus modus - alleen dagplanning tonen">
                                📺 Focus
                            </button>
                            <button class="btn-clear-planning" id="btnClearPlanning" title="Planning leegmaken">
                                🗑️ Leegmaken
                            </button>
                        </div>
                    </div>
                    <div class="kalender-grid" id="kalenderGrid">
                        ${this.renderKalenderGrid(startUur, eindUur, planning)}
                    </div>
                </div>
            </div>
        `;
        
        // Bind events for dagelijkse planning
        this.bindDagelijksePlanningEvents();
        this.bindDragAndDropEvents();
        this.initPlanningResizer();
        this.initCollapsibleSections();
        this.updateTotaalTijd();
        
        // Populate filter dropdowns
        this.populatePlanningFilters();
        
        // Start current hour tracking for this daily planning view
        this.startCurrentHourTracking();
        
        // Restore focus mode if it was previously enabled
        this.restoreFocusMode();
    }

    renderActiesVoorPlanning(acties, ingeplandeActies) {
        return acties.filter(actie => !ingeplandeActies.includes(actie.id)).map(actie => {
            const projectNaam = this.getProjectNaam(actie.projectId);
            const contextNaam = this.getContextNaam(actie.contextId);
            
            // Format date for display
            const datumString = actie.verschijndatum ? 
                new Date(actie.verschijndatum).toLocaleDateString('nl-NL') : 'Geen datum';
            
            // Datum status indicator
            const datumStatus = this.getTaakDatumStatus(actie.verschijndatum);
            let datumIndicator = '';
            let itemClass = 'planning-actie-item';
            
            if (datumStatus === 'verleden') {
                datumIndicator = '<span class="datum-indicator overtijd" title="Overtijd - vervaldatum gepasseerd"><i class="ti ti-alert-triangle"></i></span>';
                itemClass += ' taak-overtijd';
            } else if (datumStatus === 'toekomst') {
                datumIndicator = '<span class="datum-indicator toekomst" title="Toekomstige taak">⏳</span>';
                itemClass += ' taak-toekomst';
            }
            
            const prioriteitIndicator = this.getPrioriteitIndicator(actie.prioriteit);

            // Check if this task is a top priority
            const isTopPriority = actie.top_prioriteit !== null && actie.top_prioriteit !== undefined;

            return `
                <div class="${itemClass}" draggable="true" data-actie-id="${actie.id}" data-duur="${actie.duur || 60}">
                    <div class="actie-row">
                        <div class="actie-checkbox">
                            <input type="checkbox" onclick="app.completePlanningTask('${actie.id}', this)" title="Taak afwerken">
                        </div>
                        <div class="actie-star">
                            <input type="checkbox" class="star-checkbox" ${isTopPriority ? 'checked' : ''}
                                   onclick="app.toggleTopPriority('${actie.id}', this)"
                                   title="Top prioriteit">
                            <label class="star-label">⭐</label>
                        </div>
                        <div class="actie-tekst">${prioriteitIndicator}${datumIndicator}${actie.tekst}</div>
                        <div class="actie-meta">
                            ${projectNaam && projectNaam !== 'Geen project' ? `<span class="meta-project">${projectNaam}</span>` : ''}
                            ${contextNaam ? `<span class="meta-context">${contextNaam}</span>` : ''}
                            <span class="meta-datum">${datumString}</span>
                            <span class="meta-duur">${actie.duur || 60}min</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderKalenderGrid(startUur, eindUur, planning) {
        let html = '';
        
        for (let uur = startUur; uur < eindUur; uur++) {
            const uurPlanning = planning.filter(p => p.uur === uur);
            const totaalMinuten = uurPlanning.reduce((sum, p) => sum + p.duurMinuten, 0);
            const isOverboekt = totaalMinuten > 60;
            
            html += `
                <div class="kalender-uur ${isOverboekt ? 'overboekt' : ''}" data-uur="${uur}">
                    <div class="uur-label">
                        <div class="uur-tijd">${uur.toString().padStart(2, '0')}:00</div>
                        ${totaalMinuten > 0 ? `<div class="uur-totaal-tijd">(${totaalMinuten} min${isOverboekt ? ' <i class="ti ti-alert-circle"></i>' : ''})</div>` : ''}
                    </div>
                    <div class="uur-content" data-uur="${uur}">
                        <div class="uur-planning" data-uur="${uur}">
                            ${this.renderPlanningItems(uurPlanning, uur)}
                        </div>
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    renderPlanningItem(planningItem) {
        // Initialize variables at the top to avoid scoping issues - explicit defaults
        let taskDetails = null;
        let taskPrioriteit = null;
        
        const typeIcon = {
            'taak': '<i class="fas fa-ellipsis-v"></i>',
            'geblokkeerd': '🔒',
            'pauze': '☕'
        }[planningItem.type] || '<i class="fas fa-ellipsis-v"></i>';
        
        const basisNaam = planningItem.naam || planningItem.actieTekst || 'Onbekend';
        const naam = `${basisNaam} (${planningItem.duurMinuten} min)`;
        
        // Get task details and priority for all tasks (expandable or not)
        const isExpandable = planningItem.type === 'taak' && planningItem.actieId;
        
        // PRIORITY HANDLING: Set priority for ALL task items
        if (planningItem.type === 'taak' && planningItem.actieId) {
            // For optimistic items, use default priority to avoid scoping errors
            if (planningItem.isOptimistic) {
                taskPrioriteit = 'gemiddeld';
            } else {
                const actie = this.planningActies?.find(t => t.id === planningItem.actieId) || 
                             this.taken?.find(t => t.id === planningItem.actieId) ||
                             this.topPrioriteiten?.find(t => t && t.id === planningItem.actieId);
                if (actie) {
                    taskPrioriteit = actie.prioriteit || 'gemiddeld';
                    
                    // Only get detailed info for expandable tasks
                    if (isExpandable) {
                        taskDetails = {
                            project: this.getProjectNaam(actie.project_id || actie.projectId),
                            context: this.getContextNaam(actie.context_id || actie.contextId),
                            deadline: actie.verschijndatum ? new Date(actie.verschijndatum).toLocaleDateString('nl-NL') : null,
                            duur: actie.duur,
                            opmerkingen: actie.opmerkingen
                        };
                    }
                } else {
                    // Fallback if actie not found
                    taskPrioriteit = 'gemiddeld';
                }
            }
        }
        
        // Ensure taskPrioriteit is never undefined at this point
        if (planningItem.type === 'taak' && taskPrioriteit === null) {
            taskPrioriteit = 'gemiddeld';
        }
        
        // Check if this task is in top priorities
        const isPriority = planningItem.type === 'taak' && planningItem.actieId && 
                          this.topPrioriteiten?.some(p => p && p.id === planningItem.actieId);
        
        // Add priority styling and icon if it's a priority task
        const priorityClass = isPriority ? ' priority-task' : '';
        const priorityIcon = isPriority ? '<span class="priority-indicator">⭐</span>' : '';
        
        // Add normal priority indicator for tasks
        const normalPriorityIcon = taskPrioriteit ? 
            `<span class="planning-item-prioriteit">${this.getPrioriteitIndicator(taskPrioriteit)}</span>` : '';
        
        // Add checkbox for tasks (but not for blocked time or breaks)
        const checkbox = planningItem.type === 'taak' && planningItem.actieId ? 
            `<input type="checkbox" class="task-checkbox" data-actie-id="${planningItem.actieId}" onclick="app.completePlanningTask('${planningItem.actieId}', this)">` : '';
        
        // Make template items (geblokkeerd, pauze) editable
        const isTemplateItem = planningItem.type === 'geblokkeerd' || planningItem.type === 'pauze';
        
        const expandableClass = isExpandable ? ' expandable' : '';
        
        const expandChevron = isExpandable ? '<span class="expand-chevron">▶</span>' : '';
        
        // Build details section - show extra info and comments when expanded
        let detailsHtml = '';
        if (isExpandable && taskDetails) {
            detailsHtml = '<div class="planning-item-details">';
            
            // Line 1: Build extra info line (project/context/datum/duur)
            let extraInfo = [];
            if (taskDetails.project && taskDetails.project !== 'Geen project') {
                extraInfo.push(`<i class="ti ti-folder"></i> ${taskDetails.project}`);
            }
            if (taskDetails.context && taskDetails.context !== 'Geen context') {
                extraInfo.push(`🏷️ ${taskDetails.context}`);
            }
            if (taskDetails.deadline) {
                // Add date status indicator like in action list
                const datumStatus = this.getTaakDatumStatus(taskDetails.deadline);
                let datumIndicator = '';
                if (datumStatus === 'verleden') {
                    datumIndicator = '<i class="ti ti-alert-triangle"></i>';
                } else if (datumStatus === 'vandaag') {
                    datumIndicator = '<i class="ti ti-calendar"></i>';
                } else if (datumStatus === 'toekomst') {
                    datumIndicator = '🔮';
                }
                extraInfo.push(`${datumIndicator} ${taskDetails.deadline}`);
            }
            if (taskDetails.duur) {
                extraInfo.push(`⏱️ ${taskDetails.duur} min`);
            }
            
            // Add extra info line if there's any info
            if (extraInfo.length > 0) {
                detailsHtml += `<div class="planning-extra-info">${extraInfo.join(' • ')}</div>`;
            }
            
            // Line 2: Add opmerkingen as separate line if present
            if (taskDetails.opmerkingen) {
                detailsHtml += `<div class="planning-opmerkingen">${this.linkifyUrls(taskDetails.opmerkingen)}</div>`;
            }
            
            // Line 3: Add subtaken if present
            const subtakenHtml = this.renderPlanningSubtaken(planningItem.actieId);
            if (subtakenHtml) {
                detailsHtml += subtakenHtml;
            }
            
            detailsHtml += '</div>';
        }
        
        // Show name in header for all items
        const naamElement = isTemplateItem ? 
            `<span class="planning-naam editable-naam" onclick="app.editPlanningItemName('${planningItem.id}', this)" title="Klik om naam te bewerken">${naam}</span>` :
            `<span class="planning-naam">${naam}</span>`;
        
        const clickHandler = isExpandable ? `onclick="app.togglePlanningItemExpand('${planningItem.id}', event)"` : '';
        
        return `
            <div class="planning-item${priorityClass}${expandableClass}" 
                 data-planning-id="${planningItem.id}" 
                 data-type="${planningItem.type}"
                 data-uur="${planningItem.uur}"
                 data-duur="${planningItem.duurMinuten}"
                 draggable="true">
                <div class="planning-item-header" ${clickHandler}>
                    ${expandChevron}
                    ${checkbox}
                    <span class="planning-icon">${typeIcon}</span>
                    ${priorityIcon}
                    ${normalPriorityIcon}
                    ${naamElement}
                    <button class="delete-planning" onclick="app.deletePlanningItem('${planningItem.id}', event)">×</button>
                </div>
                ${detailsHtml}
            </div>
        `;
    }

    renderPlanningSubtaken(parentTaskId) {
        // Get subtaken from cache or load them
        const subtaken = this.subtakenCache?.get(parentTaskId) || [];
        
        if (subtaken.length === 0) {
            return null;
        }
        
        // Calculate progress
        const voltooid = subtaken.filter(s => s.voltooid).length;
        const totaal = subtaken.length;
        const progressPercentage = Math.round((voltooid / totaal) * 100);
        
        // Create subtaken list
        let subtakenHtml = '<div class="planning-subtaken">';
        subtakenHtml += `<div class="planning-subtaken-header">`;
        subtakenHtml += `<span class="subtaken-label">📋 Subtaken:</span>`;
        subtakenHtml += `<span class="subtaken-progress-small">${voltooid}/${totaal} (${progressPercentage}%)</span>`;
        subtakenHtml += `</div>`;
        
        subtakenHtml += '<div class="planning-subtaken-list">';
        subtaken.forEach(subtaak => {
            const checkedClass = subtaak.voltooid ? ' checked' : '';
            const checkedIcon = subtaak.voltooid ? '✓' : '○';
            subtakenHtml += `
                <div class="planning-subtaak${checkedClass}">
                    <span class="subtaak-checkbox" onclick="app.togglePlanningSubtaak('${subtaak.id}', '${parentTaskId}')">${checkedIcon}</span>
                    <span class="subtaak-text">${subtaak.titel}</span>
                </div>
            `;
        });
        subtakenHtml += '</div>';
        subtakenHtml += '</div>';
        
        return subtakenHtml;
    }

    async loadSubtakenForPlanning(parentTaskIds) {
        // Load subtaken for multiple parent tasks efficiently
        const loadPromises = parentTaskIds.map(async (parentId) => {
            if (!this.subtakenCache.has(parentId)) {
                try {
                    const response = await fetch(`/api/subtaken/${parentId}`);
                    if (response.ok) {
                        const subtaken = await response.json();
                        this.subtakenCache.set(parentId, subtaken);
                    } else {
                        this.subtakenCache.set(parentId, []);
                    }
                } catch (error) {
                    console.error('Error loading subtaken for planning:', error);
                    this.subtakenCache.set(parentId, []);
                }
            }
        });
        
        await Promise.all(loadPromises);
    }

    async togglePlanningSubtaak(subtaakId, parentTaskId) {
        try {
            // Find the subtaak in cache
            const subtaken = this.subtakenCache.get(parentTaskId) || [];
            const subtaak = subtaken.find(s => s.id === subtaakId);
            
            if (!subtaak) {
                console.error('Subtaak not found in cache');
                return;
            }
            
            // Toggle status
            const newStatus = !subtaak.voltooid;
            
            // Update on server
            const response = await fetch(`/api/subtaken/${subtaakId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    titel: subtaak.titel,
                    voltooid: newStatus,
                    volgorde: subtaak.volgorde
                })
            });
            
            if (response.ok) {
                // Update cache
                subtaak.voltooid = newStatus;
                this.subtakenCache.set(parentTaskId, subtaken);
                
                // Refresh the current planning display
                await this.renderDagelijksePlanning();
                
                toast.success(`Subtaak ${newStatus ? 'afgerond' : 'heropend'}`);
            } else {
                toast.error('Fout bij bijwerken subtaak');
            }
        } catch (error) {
            console.error('Error toggling planning subtaak:', error);
            toast.error('Fout bij bijwerken subtaak');
        }
    }

    renderPlanningItems(uurPlanning, uur) {
        if (uurPlanning.length === 0) {
            return '';
        }

        return uurPlanning.map(item => this.renderPlanningItem(item)).join('');
    }

    bindDagelijksePlanningEvents() {
        // Initialize mobile sidebar if needed  
        this.initializeMobileSidebar();
        
        // Time range change handlers
        const startUurInput = document.getElementById('startUur');
        const eindUurInput = document.getElementById('eindUur');
        
        if (startUurInput) {
            startUurInput.addEventListener('change', () => {
                localStorage.setItem('dagplanning-start-uur', startUurInput.value);
                this.renderTaken(); // Re-render with new time range
            });
        }
        
        if (eindUurInput) {
            eindUurInput.addEventListener('change', () => {
                localStorage.setItem('dagplanning-eind-uur', eindUurInput.value);
                this.renderTaken(); // Re-render with new time range
            });
        }
        
        // Filter handlers
        const taakFilter = document.getElementById('planningTaakFilter');
        const projectFilter = document.getElementById('planningProjectFilter');
        const contextFilter = document.getElementById('planningContextFilter');
        const prioriteitFilter = document.getElementById('planningPrioriteitFilter');
        const datumFilter = document.getElementById('planningDatumFilter');
        const duurFilter = document.getElementById('planningDuurFilter');
        const toekomstToggle = document.getElementById('planningToekomstToggle');
        
        if (taakFilter) taakFilter.addEventListener('input', () => this.filterPlanningActies());
        if (projectFilter) projectFilter.addEventListener('change', () => this.filterPlanningActies());
        if (contextFilter) contextFilter.addEventListener('change', () => this.filterPlanningActies());
        if (prioriteitFilter) prioriteitFilter.addEventListener('change', () => this.filterPlanningActies());
        if (datumFilter) datumFilter.addEventListener('change', () => this.filterPlanningActies());
        if (duurFilter) duurFilter.addEventListener('input', () => this.filterPlanningActies());
        if (toekomstToggle) toekomstToggle.addEventListener('change', () => this.togglePlanningToekomstigeTaken());
        
        // Populate filter dropdowns
        this.populatePlanningFilters();
        
        // Clear planning button
        const btnClearPlanning = document.getElementById('btnClearPlanning');
        if (btnClearPlanning) {
            btnClearPlanning.addEventListener('click', () => this.showClearPlanningModal());
        }
    }

    bindDragAndDropEvents() {
        // IMPORTANT: Track if events are being bound to prevent racing conditions
        if (this.bindingInProgress) {
            return;
        }
        
        this.bindingInProgress = true;
        
        // Remove existing drag/drop event listeners to prevent duplicates
        this.removeDragAndDropEvents();
        
        // Get the planning container for drag state tracking
        const planningContainer = document.querySelector('.dagelijkse-planning-layout');
        
        // Template drag start
        document.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                const dragData = {
                    type: 'template',
                    planningType: item.dataset.type,
                    duurMinuten: parseInt(item.dataset.duur)
                };
                
                // Store globally for access during dragover events
                this.currentDragData = dragData;
                
                e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
                
                // Create semi-transparent drag image
                const dragImage = document.createElement('div');
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                dragImage.style.width = '100px';
                dragImage.style.height = '40px';
                dragImage.style.background = 'rgba(0, 123, 255, 0.5)';
                dragImage.style.borderRadius = '6px';
                dragImage.style.border = '2px solid rgba(0, 123, 255, 0.8)';
                dragImage.innerHTML = '<div style="color: white; font-size: 12px; text-align: center; line-height: 36px; font-weight: 500;"><i class="fas fa-clipboard"></i></div>';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, 50, 20);
                
                // Clean up after drag
                setTimeout(() => {
                    if (dragImage.parentNode) {
                        document.body.removeChild(dragImage);
                    }
                }, 100);
                
                // Visual feedback
                item.classList.add('dragging');
                // Start dynamic drag tracking
                this.startDynamicDragTracking();
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                // Clear global drag data
                this.currentDragData = null;
                // Stop dynamic drag tracking
                this.stopDynamicDragTracking();
            });
        });
        
        // Action drag functionality (from actions list)
        document.querySelectorAll('.planning-actie-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                const dragData = {
                    type: 'actie',
                    actieId: item.dataset.actieId,
                    duurMinuten: parseInt(item.dataset.duur)
                };
                
                e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
                // Store globally for access during dragover events
                this.currentDragData = dragData;
                
                // Create semi-transparent drag image
                const dragImage = document.createElement('div');
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                dragImage.style.width = '100px';
                dragImage.style.height = '40px';
                dragImage.style.background = 'rgba(0, 123, 255, 0.5)';
                dragImage.style.borderRadius = '6px';
                dragImage.style.border = '2px solid rgba(0, 123, 255, 0.8)';
                dragImage.innerHTML = '<div style="color: white; font-size: 12px; text-align: center; line-height: 36px; font-weight: 500;"><i class="fas fa-clipboard"></i></div>';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, 50, 20);
                
                // Clean up after drag
                setTimeout(() => {
                    if (dragImage.parentNode) {
                        document.body.removeChild(dragImage);
                    }
                }, 100);
                
                // Visual feedback
                item.classList.add('dragging');
                // Start dynamic drag tracking
                this.startDynamicDragTracking();
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                // Clear global drag data
                this.currentDragData = null;
                // Stop dynamic drag tracking
                this.stopDynamicDragTracking();
            });
        });

        // Planning item drag start (internal reordering)
        document.querySelectorAll('.planning-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'planning-reorder',
                    planningId: item.dataset.planningId,
                    currentUur: parseInt(item.dataset.uur),
                    duurMinuten: parseInt(item.dataset.duur),
                    planningType: item.dataset.type
                }));
                
                // Create semi-transparent drag image
                const dragImage = document.createElement('div');
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                dragImage.style.width = '100px';
                dragImage.style.height = '40px';
                dragImage.style.background = 'rgba(0, 123, 255, 0.5)';
                dragImage.style.borderRadius = '6px';
                dragImage.style.border = '2px solid rgba(0, 123, 255, 0.8)';
                dragImage.innerHTML = '<div style="color: white; font-size: 12px; text-align: center; line-height: 36px; font-weight: 500;"><i class="fas fa-clipboard"></i></div>';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, 50, 20);
                
                // Clean up after drag
                setTimeout(() => {
                    if (dragImage.parentNode) {
                        document.body.removeChild(dragImage);
                    }
                }, 100);
                
                // Visual feedback
                item.classList.add('dragging');
                // Start dynamic drag tracking
                this.startDynamicDragTracking();
            });

            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                // Clear global drag data
                this.currentDragData = null;
                // Stop dynamic drag tracking
                this.stopDynamicDragTracking();
            });
        });
        
        // Reset binding flag
        this.bindingInProgress = false;
    }

    // Insertion Line System Methods
    startDynamicDragTracking() {
        const dagKalender = document.querySelector('.dag-kalender');
        
        if (!dagKalender) {
            console.warn('🚨 Dynamic drag tracking failed: missing dag-kalender');
            return;
        }
        
        console.log('✅ Starting dynamic drag tracking');
        
        // Clear any existing ghost or spacers
        this.clearDynamicElements();
        
        // Setup drop zone handling with dynamic spacing
        this.dynamicDropHandler = (e) => {
            e.preventDefault();
            console.log('🎯 Drop event triggered at Y:', e.clientY);
            
            const dropInfo = this.getDropInfoFromPosition(e.clientY);
            if (dropInfo) {
                console.log('✅ Drop info calculated:', dropInfo);
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                this.handleDynamicDrop(data, dropInfo);
            } else {
                console.warn('❌ No drop info found for Y position:', e.clientY);
            }
            this.stopDynamicDragTracking();
        };
        
        // Use dragover for tracking dynamic positioning with throttling
        let lastDragOverTime = 0;
        const DRAGOVER_THROTTLE_MS = 50; // Limit to ~20fps to prevent flickering
        
        this.dynamicDragOverHandler = (e) => {
            e.preventDefault();
            
            const now = Date.now();
            if (now - lastDragOverTime < DRAGOVER_THROTTLE_MS) {
                return; // Skip this event to prevent flickering
            }
            lastDragOverTime = now;
            
            // Update dynamic spacing and ghost preview
            this.updateDynamicSpacing(e);
        };
        
        dagKalender.addEventListener('dragover', this.dynamicDragOverHandler);
        dagKalender.addEventListener('drop', this.dynamicDropHandler);
        
        console.log('✅ Dynamic drag event listeners attached');
    }
    
    stopDynamicDragTracking() {
        const dagKalender = document.querySelector('.dag-kalender');
        
        console.log('🛑 Stopping dynamic drag tracking');
        
        // Clear all dynamic elements
        this.clearDynamicElements();
        
        if (dagKalender && this.dynamicDragOverHandler) {
            dagKalender.removeEventListener('dragover', this.dynamicDragOverHandler);
            dagKalender.removeEventListener('drop', this.dynamicDropHandler);
        }
        
        this.dynamicDropHandler = null;
        this.dynamicDragOverHandler = null;
        this.currentDropInfo = null;
    }
    
    clearDynamicElements() {
        // Remove any existing ghost previews
        const existingGhost = document.querySelector('.drag-ghost-preview');
        if (existingGhost) {
            existingGhost.remove();
        }
        
        // Remove any dynamic spacers
        const existingSpacers = document.querySelectorAll('.dynamic-spacer');
        existingSpacers.forEach(spacer => spacer.remove());
        
        // Reset all task positions (remove any transforms)
        const allPlanningItems = document.querySelectorAll('.planning-item');
        allPlanningItems.forEach(item => {
            item.style.transform = '';
            item.classList.remove('push-up', 'push-down');
        });
    }
    
    updateDynamicSpacing(e) {
        const dropInfo = this.getDropInfoFromPosition(e.clientY);
        
        // Only update if position changed significantly (add hysteresis to prevent flickering)
        if (!dropInfo || (this.currentDropInfo && 
            this.currentDropInfo.uur === dropInfo.uur && 
            this.currentDropInfo.position === dropInfo.position)) {
            return;
        }
        
        // Additional stability check - prevent rapid position switching
        if (this.lastPositionChangeTime && (Date.now() - this.lastPositionChangeTime) < 100) {
            return;
        }
        this.lastPositionChangeTime = Date.now();
        
        console.log('📍 Updating dynamic spacing:', dropInfo);
        
        // Clear previous dynamic elements
        this.clearDynamicElements();
        
        if (dropInfo) {
            // Add ghost preview and spacing
            this.addGhostPreview(dropInfo, e);
            this.addDynamicSpacing(dropInfo);
            this.currentDropInfo = dropInfo;
        }
    }
    
    addGhostPreview(dropInfo, event) {
        // Use global drag data instead of dataTransfer (which is empty during dragover)
        const data = this.currentDragData;
        
        if (!data) {
            console.warn('⚠️ No drag data available for ghost preview');
            return;
        }
        
        // Create ghost preview element
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost-preview planning-item';
        ghost.setAttribute('data-uur', dropInfo.uur);
        
        // Style ghost based on drag data
        if (data.type === 'template') {
            ghost.setAttribute('data-type', data.planningType);
            ghost.innerHTML = `
                <div class="planning-icon">${data.planningType === 'geblokkeerd' ? '🔒' : '☕'}</div>
                <div class="planning-tekst">${data.planningType === 'geblokkeerd' ? 'Geblokkeerd' : 'Pauze'}</div>
                <div class="planning-duur">${data.duurMinuten || 60}min</div>
            `;
        } else if (data.type === 'actie' || data.type === 'prioriteit') {
            ghost.setAttribute('data-type', 'taak');
            
            // Get task info from cache
            const actie = this.planningActies?.find(t => t.id === data.actieId) || 
                         this.taken?.find(t => t.id === data.actieId) ||
                         this.topPrioriteiten?.find(t => t && t.id === data.actieId);
            
            const taskName = actie ? actie.tekst : 'Taak wordt geladen...';
            ghost.innerHTML = `
                <div class="planning-icon"><i class="fas fa-ellipsis-v"></i></div>
                <div class="planning-tekst">${taskName}</div>
                <div class="planning-duur">${data.duurMinuten || 60}min</div>
            `;
        }
        
        // Find the hour container and insert ghost
        const uurElement = document.querySelector(`[data-uur="${dropInfo.uur}"]`);
        if (uurElement) {
            const uurPlanning = uurElement.querySelector('.uur-planning');
            if (uurPlanning) {
                const existingItems = uurPlanning.children;
                if (dropInfo.position >= existingItems.length) {
                    uurPlanning.appendChild(ghost);
                } else {
                    uurPlanning.insertBefore(ghost, existingItems[dropInfo.position]);
                }
            }
        }
    }
    
    addDynamicSpacing(dropInfo) {
        // Find all planning items in this hour
        const uurElement = document.querySelector(`[data-uur="${dropInfo.uur}"]`);
        if (!uurElement) return;
        
        const planningItems = uurElement.querySelectorAll('.planning-item:not(.drag-ghost-preview)');
        
        // Add push animations to items that need to move
        planningItems.forEach((item, index) => {
            if (index >= dropInfo.position) {
                // Items at or after drop position: push down
                item.classList.add('push-down');
                item.style.transform = 'translateY(50px)';
            }
        });
    }
    
    async handleDynamicDrop(data, dropInfo) {
        console.log('🚀 Starting dynamic drop handling', { data, dropInfo });
        
        // Clear dynamic elements but keep optimistic update
        this.clearDynamicElements();
        
        // Immediately update UI optimistically for better UX
        const optimisticItem = this.createOptimisticPlanningItem(data, dropInfo);
        this.addOptimisticPlanningItem(optimisticItem, dropInfo);
        
        try {
            // Remove optimistic item before server call to prevent duplicates
            console.log('🧹 Removing optimistic item before server update to prevent duplicates');
            this.removeOptimisticPlanningItem(optimisticItem);
            
            if (data.type === 'planning-reorder') {
                await this.handlePlanningReorder(data, dropInfo.uur, dropInfo.position);
            } else {
                await this.handleDropAtPosition(data, dropInfo.uur, dropInfo.position);
            }
            console.log('✅ Dynamic drop operation completed successfully');
        } catch (error) {
            console.error('❌ Dynamic drop operation failed, reverting to clean state:', error);
            // Full re-render to ensure consistency (optimistic item already removed above)
            await this.renderTaken(); 
        }
    }
    
    updateInsertionLinePosition(e) {
        const insertionLine = document.getElementById('insertion-line');
        if (!insertionLine) {
            console.warn('❌ Insertion line element not found');
            return;
        }
        
        const dropInfo = this.getDropInfoFromPosition(e.clientY);
        if (dropInfo) {
            console.log('📍 Updating insertion line position:', {
                clientY: e.clientY,
                calculatedY: dropInfo.y,
                uur: dropInfo.uur,
                position: dropInfo.position
            });
            
            insertionLine.style.top = dropInfo.y + 'px';
            insertionLine.classList.add('active');
        } else {
            insertionLine.classList.remove('active');
        }
    }
    
    getDropInfoFromPosition(clientY) {
        const kalenderUren = document.querySelectorAll('.kalender-uur');
        const dagKalender = document.querySelector('.dag-kalender');
        
        if (!dagKalender) return null;
        
        const kalenderRect = dagKalender.getBoundingClientRect();
        const relativeY = clientY - kalenderRect.top;
        
        for (const uurElement of kalenderUren) {
            const uurRect = uurElement.getBoundingClientRect();
            const uurRelativeTop = uurRect.top - kalenderRect.top;
            const uurRelativeBottom = uurRect.bottom - kalenderRect.top;
            
            if (relativeY >= uurRelativeTop && relativeY <= uurRelativeBottom) {
                const uur = parseInt(uurElement.dataset.uur);
                const uurPlanning = uurElement.querySelector('.uur-planning');
                const planningItems = uurPlanning.querySelectorAll('.planning-item');
                
                if (planningItems.length === 0) {
                    // Empty hour - drop at beginning
                    return {
                        uur: uur,
                        position: 0,
                        y: uurRelativeTop + 50 // Center of empty hour
                    };
                }
                
                // Find position between items
                const uurPlanningRect = uurPlanning.getBoundingClientRect();
                const planningRelativeY = clientY - uurPlanningRect.top;
                
                for (let i = 0; i < planningItems.length; i++) {
                    const itemRect = planningItems[i].getBoundingClientRect();
                    const itemRelativeTop = itemRect.top - uurPlanningRect.top;
                    const itemRelativeBottom = itemRect.bottom - uurPlanningRect.top;
                    
                    if (planningRelativeY <= itemRelativeTop + (itemRect.height / 2)) {
                        // Drop before this item
                        return {
                            uur: uur,
                            position: i,
                            y: uurRelativeTop + itemRelativeTop
                        };
                    }
                }
                
                // Drop after last item
                const lastItem = planningItems[planningItems.length - 1];
                const lastItemRect = lastItem.getBoundingClientRect();
                return {
                    uur: uur,
                    position: planningItems.length,
                    y: uurRelativeTop + (lastItemRect.bottom - uurPlanningRect.top)
                };
            }
        }
        
        return null;
    }
    
    async handleDynamicDropLegacy(data, dropInfo) {
        console.log('🚀 Starting insertion line drop handling', { data, dropInfo });
        
        // Immediately update UI optimistically for better UX
        const optimisticItem = this.createOptimisticPlanningItem(data, dropInfo);
        this.addOptimisticPlanningItem(optimisticItem, dropInfo);
        
        try {
            if (data.type === 'planning-reorder') {
                await this.handlePlanningReorder(data, dropInfo.uur, dropInfo.position);
            } else {
                await this.handleDropAtPosition(data, dropInfo.uur, dropInfo.position);
            }
            console.log('✅ Drop operation completed successfully');
        } catch (error) {
            console.error('❌ Drop operation failed, reverting optimistic update:', error);
            // Remove optimistic item and re-render
            this.removeOptimisticPlanningItem(optimisticItem);
            await this.renderTaken(); // Full re-render to ensure consistency
        }
    }
    
    createOptimisticPlanningItem(data, dropInfo) {
        const today = new Date().toISOString().split('T')[0];
        
        const planningItem = {
            id: 'optimistic-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            datum: today,
            uur: dropInfo.uur,
            positie: dropInfo.position,
            duurMinuten: data.duurMinuten || 60,
            type: data.type === 'template' ? data.planningType : 'taak',
            isOptimistic: true // Flag to identify optimistic items
        };
        
        if (data.type === 'template') {
            planningItem.naam = data.planningType === 'geblokkeerd' ? 'Geblokkeerd' : 'Pauze';
        } else if (data.type === 'actie' || data.type === 'prioriteit') {
            planningItem.actieId = data.actieId;
            
            // Use cached data for name display
            const actie = this.planningActies?.find(t => t.id === data.actieId) || 
                         this.taken?.find(t => t.id === data.actieId) ||
                         this.topPrioriteiten?.find(t => t && t.id === data.actieId);
            
            if (actie) {
                const projectId = actie.project_id || actie.projectId;
                const projectNaam = this.getProjectNaam(projectId);
                planningItem.naam = actie.tekst;
                planningItem.actieTekst = actie.tekst;
            } else {
                planningItem.naam = 'Taak wordt geladen...';
                planningItem.actieTekst = 'Laden...';
            }
        }
        
        return planningItem;
    }
    
    addOptimisticPlanningItem(planningItem, dropInfo) {
        console.log('⚡ Adding optimistic planning item:', planningItem);
        
        // Add to local planning data
        if (!this.currentPlanningData) {
            this.currentPlanningData = [];
        }
        this.currentPlanningData.push(planningItem);
        
        // Find the hour container and add the item to DOM
        const uurElement = document.querySelector(`[data-uur="${dropInfo.uur}"]`);
        if (uurElement) {
            const uurPlanning = uurElement.querySelector('.uur-planning');
            if (uurPlanning) {
                const itemHtml = this.renderPlanningItem(planningItem);
                
                // Insert at specific position
                const existingItems = uurPlanning.children;
                if (dropInfo.position >= existingItems.length) {
                    uurPlanning.insertAdjacentHTML('beforeend', itemHtml);
                } else {
                    existingItems[dropInfo.position].insertAdjacentHTML('beforebegin', itemHtml);
                }
                
                // Update hour totals
                this.updateUurTotals(dropInfo.uur);
            }
        }
    }
    
    removeOptimisticPlanningItem(planningItem) {
        console.log('🔄 Removing optimistic planning item:', planningItem.id);
        
        // Remove from local planning data
        if (this.currentPlanningData) {
            this.currentPlanningData = this.currentPlanningData.filter(item => item.id !== planningItem.id);
        }
        
        // Remove from DOM
        const domElement = document.querySelector(`[data-planning-id="${planningItem.id}"]`);
        if (domElement) {
            domElement.remove();
        }
    }
    
    updateUurTotals(uur) {
        // Update the hour total display
        const uurElement = document.querySelector(`[data-uur="${uur}"]`);
        if (uurElement) {
            const uurPlanning = this.currentPlanningData?.filter(p => p.uur === uur) || [];
            const totaalMinuten = uurPlanning.reduce((sum, p) => sum + p.duurMinuten, 0);
            const isOverboekt = totaalMinuten > 60;
            
            const totaalElement = uurElement.querySelector('.uur-totaal-tijd');
            if (totaalElement) {
                if (totaalMinuten > 0) {
                    totaalElement.innerHTML = `(${totaalMinuten} min${isOverboekt ? ' <i class="ti ti-alert-circle"></i>' : ''})`;
                    uurElement.classList.toggle('overboekt', isOverboekt);
                } else {
                    totaalElement.innerHTML = '';
                    uurElement.classList.remove('overboekt');
                }
            }
        }
    }

    // Current hour indicator functions
    getCurrentHour() {
        return new Date().getHours();
    }

    markCurrentHour() {
        // Only mark current hour if we're in daily planning view
        if (this.huidigeLijst !== 'dagelijkse-planning') {
            return;
        }

        // Remove existing current-hour classes
        document.querySelectorAll('.kalender-uur.current-hour').forEach(el => {
            el.classList.remove('current-hour');
        });

        // Get current hour
        const currentHour = this.getCurrentHour();
        
        // Find and mark the current hour block
        const currentHourBlock = document.querySelector(`[data-uur="${currentHour}"]`);
        if (currentHourBlock && currentHourBlock.classList.contains('kalender-uur')) {
            currentHourBlock.classList.add('current-hour');
        }
    }

    startCurrentHourTracking() {
        // Clear any existing timer
        if (this.currentHourTimer) {
            clearInterval(this.currentHourTimer);
        }

        // Mark current hour immediately
        this.markCurrentHour();

        // Set up timer to check every minute (60000ms)
        let lastHour = this.getCurrentHour();
        this.currentHourTimer = setInterval(() => {
            const currentHour = this.getCurrentHour();
            // Only update when hour actually changes
            if (currentHour !== lastHour) {
                this.markCurrentHour();
                lastHour = currentHour;
            }
        }, 60000);
    }

    stopCurrentHourTracking() {
        if (this.currentHourTimer) {
            clearInterval(this.currentHourTimer);
            this.currentHourTimer = null;
        }
        
        // Remove all current-hour indicators
        document.querySelectorAll('.kalender-uur.current-hour').forEach(el => {
            el.classList.remove('current-hour');
        });
    }

    // Laptop sidebar toggle functionality (separate from mobile)
    initializeLaptopSidebar() {
        const toggleButton = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (!toggleButton || !sidebar) {
            return;
        }
        
        // Only initialize on laptop screens (1201-1599px)
        if (window.innerWidth < 1201 || window.innerWidth >= 1600) {
            return;
        }
        
        // Restore saved state from localStorage
        const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            this.updateToggleIcon(true);
        }
        
        // Bind toggle event
        toggleButton.addEventListener('click', () => this.toggleLaptopSidebar());
        
        // Update toggle visibility based on screen size
        window.addEventListener('resize', () => this.handleLaptopSidebarResize());
    }
    
    toggleLaptopSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const isCollapsed = sidebar.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand
            sidebar.classList.remove('collapsed');
            localStorage.setItem('sidebar-collapsed', 'false');
            this.updateToggleIcon(false);
        } else {
            // Collapse
            sidebar.classList.add('collapsed');
            localStorage.setItem('sidebar-collapsed', 'true');
            this.updateToggleIcon(true);
        }
    }
    
    updateToggleIcon(isCollapsed) {
        const toggleButton = document.getElementById('sidebar-toggle');
        const icon = toggleButton?.querySelector('i');
        
        if (icon) {
            if (isCollapsed) {
                icon.className = 'fas fa-chevron-right';
            } else {
                icon.className = 'fas fa-chevron-left';
            }
        }
    }
    
    handleLaptopSidebarResize() {
        const sidebar = document.querySelector('.sidebar');
        const isLaptop = window.innerWidth >= 1201 && window.innerWidth < 1600;
        
        if (!isLaptop) {
            // Remove collapsed state when not on laptop
            sidebar?.classList.remove('collapsed');
        } else {
            // Reinitialize if entering laptop range
            this.initializeLaptopSidebar();
        }
    }

    removeDragAndDropEvents() {
        // Remove existing event listeners by cloning and replacing elements
        // This is more reliable than trying to track individual listeners
        
        // Clone template items to remove event listeners
        document.querySelectorAll('.template-item').forEach(item => {
            const newItem = item.cloneNode(true);
            if (item.parentNode) {
                item.parentNode.replaceChild(newItem, item);
            }
        });
        
        // Clone planning action items to remove event listeners
        document.querySelectorAll('.planning-actie-item').forEach(item => {
            const newItem = item.cloneNode(true);
            if (item.parentNode) {
                item.parentNode.replaceChild(newItem, item);
            }
        });
        
        // Stop any existing dynamic drag tracking
        this.stopDynamicDragTracking();
    }


    async handleDrop(data, uur) {
        return this.handleDropInternal(data, uur, null);
    }
    
    async handleDropInternal(data, uur, position) {
        const today = new Date().toISOString().split('T')[0];
        
        // Debug: Log the drop operation
        console.log('🎯 DROP OPERATION:', {
            type: data.type,
            actieId: data.actieId,
            uur,
            position,
            timestamp: new Date().toISOString()
        });
        
        // Prevent duplicate drops by checking if this operation is already in progress
        const operationKey = `drop-${data.type}-${data.actieId || data.planningType}-${uur}-${position}`;
        if (this.activeDropOperations && this.activeDropOperations.has(operationKey)) {
            console.log('🚫 Duplicate drop operation prevented:', operationKey);
            return;
        }
        
        // Track active operations
        if (!this.activeDropOperations) {
            this.activeDropOperations = new Set();
        }
        this.activeDropOperations.add(operationKey);
        
        // Use entertainment loading for drop operations
        const dropMessages = [
            '🎯 Taak wordt toegevoegd...',
            '📅 Planning wordt bijgewerkt...',
            '⚡ Synchronisatie loopt...',
            '✨ Interface wordt ververst...',
            '🚀 Bijna klaar...'
        ];
        
        loading.showWithEntertainment('🎯 Item toevoegen...', dropMessages, 1200);
        
        try {
            const result = await this.executeDropOperation(data, uur, position, operationKey);
            await loading.hideWithMinTime();
            return result;
        } catch (error) {
            loading.hide();
            throw error;
        } finally {
            // Always clean up the operation key
            if (this.activeDropOperations) {
                this.activeDropOperations.delete(operationKey);
            }
        }
    }

    async executeDropOperation(data, uur, position, operationKey) {
        const today = new Date().toISOString().split('T')[0];
        
        const planningItem = {
            datum: today,
            uur: uur,
            type: data.type === 'template' ? data.planningType : 'taak',
            duurMinuten: data.duurMinuten
        };
            
            // Add position if specified
            if (position !== null) {
                planningItem.positie = position;
            }
            
            if (data.type === 'template') {
                planningItem.naam = data.planningType === 'geblokkeerd' ? 'Geblokkeerd' : 'Pauze';
            } else if (data.type === 'actie' || data.type === 'prioriteit') {
                planningItem.actieId = data.actieId;
                
                // Use cached data first for speed (avoid API call)
                let actie = this.planningActies?.find(t => t.id === data.actieId) || 
                           this.taken?.find(t => t.id === data.actieId) ||
                           this.topPrioriteiten?.find(t => t && t.id === data.actieId);
                
                if (actie) {
                    // Handle both database format (project_id) and frontend format (projectId)
                    const projectId = actie.project_id || actie.projectId;
                    const projectNaam = this.getProjectNaam(projectId);
                    planningItem.naam = actie.tekst;
                } else {
                    // Only fetch from API if not found in cache
                    console.log('<i class="ti ti-search"></i> Task not in cache, fetching from API...');
                    const actiesResponse = await fetch('/api/lijst/acties');
                    if (actiesResponse.ok) {
                        const acties = await actiesResponse.json();
                        actie = acties.find(t => t.id === data.actieId);
                        if (actie) {
                            // Handle both database format (project_id) and frontend format (projectId)
                            const projectId = actie.project_id || actie.projectId;
                            const projectNaam = this.getProjectNaam(projectId);
                            planningItem.naam = actie.tekst;
                        } else {
                            planningItem.naam = 'Onbekende actie';
                        }
                    } else {
                        planningItem.naam = 'Onbekende actie';
                    }
                }
            }
            
            console.log('📤 Sending to server:', planningItem);
            console.log('🎯 Position details:', {
                requestedPosition: position,
                planningItemPosition: planningItem.positie,
                hour: uur,
                existingItemsInHour: this.currentPlanningData?.filter(p => p.uur === uur).length || 0
            });
            const response = await fetch('/api/dagelijkse-planning', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(planningItem)
            });
            
            if (response.ok) {
                const serverResponse = await response.json();
                console.log('<i class="ti ti-inbox"></i> Server response:', serverResponse);
                // Fast local update instead of full refresh
                await this.updatePlanningLocally(planningItem, serverResponse);
                
                // Remove task from actions list if it was an action
                if (data.type === 'actie') {
                    this.removeActionFromList(data.actieId);
                }
                
                this.updateTotaalTijd(); // Update total time
                toast.success('Planning item toegevoegd!');
            } else {
                toast.error('Fout bij toevoegen planning item');
            }
    }

    async handleDropAtPosition(data, uur, position) {
        return this.handleDropInternal(data, uur, position);
    }
    
    async updatePlanningLocally(planningItem, serverResponse) {
        console.log('<i class="fas fa-redo"></i> updatePlanningLocally called with:', { planningItem, serverResponse });
        
        try {
            // CRITICAL FIX: Refresh planning data from server to prevent missing existing items
            const today = new Date().toISOString().split('T')[0];
            const planningResponse = await fetch(`/api/dagelijkse-planning/${today}`);
            
            if (planningResponse.ok) {
                const freshPlanningData = await planningResponse.json();
                console.log('🔄 Refreshed planning data from server:', freshPlanningData.length, 'items');
                
                // Update our local cache with fresh server data
                this.currentPlanningData = freshPlanningData || [];
                
                // Verify the new item is in the fresh data (it should be, since server just added it)
                const newItemId = serverResponse.id || serverResponse.planningId;
                const newItemExists = this.currentPlanningData.some(item => 
                    item.id === newItemId || 
                    (item.actieId === planningItem.actieId && item.uur === planningItem.uur)
                );
                
                if (!newItemExists) {
                    console.warn('⚠️ New item not found in fresh server data, adding manually as fallback');
                    const newItem = {
                        ...planningItem,
                        id: newItemId || Math.random().toString(36),
                        ...serverResponse
                    };
                    this.currentPlanningData.push(newItem);
                }
                
                // Load subtaken for all planned tasks (including newly added ones)
                const plannedTaskIds = this.currentPlanningData
                    .filter(p => p.type === 'taak' && p.actieId)
                    .map(p => p.actieId);
                
                if (plannedTaskIds.length > 0) {
                    await this.loadSubtakenForPlanning(plannedTaskIds);
                }
                
                // Update only the affected hour in the calendar
                this.updateSingleHourDisplay(planningItem.uur);
                
                console.log('✅ Planning locally updated with server data');
            } else {
                throw new Error(`Server responded with ${planningResponse.status}`);
            }
            
        } catch (error) {
            console.error('❌ Error refreshing planning data from server:', error);
            
            // FALLBACK: Use the old local-only approach if server fetch fails
            console.log('🔄 Falling back to local-only update');
            
            if (!this.currentPlanningData) {
                this.currentPlanningData = [];
            }
            
            // Add the new item to local planning data
            const newItem = {
                ...planningItem,
                id: serverResponse.id || serverResponse.planningId || Math.random().toString(36),
                ...serverResponse
            };
            
            console.log('➕ Adding to currentPlanningData (fallback):', newItem);
            this.currentPlanningData.push(newItem);
            
            // Load subtaken for all planned tasks (including newly added ones)
            const plannedTaskIds = this.currentPlanningData
                .filter(p => p.type === 'taak' && p.actieId)
                .map(p => p.actieId);
            
            if (plannedTaskIds.length > 0) {
                await this.loadSubtakenForPlanning(plannedTaskIds);
            }
            
            // Update only the affected hour in the calendar
            this.updateSingleHourDisplay(planningItem.uur);
        }
    }
    
    updateSingleHourDisplay(uur) {
        const uurElement = document.querySelector(`[data-uur="${uur}"] .uur-planning`);
        if (!uurElement) return;
        
        // Get planning for this specific hour
        const uurPlanning = this.currentPlanningData?.filter(p => p.uur === uur) || [];
        
        // CONSISTENCY CHECK: Verify we have the expected number of items
        const existingDomItems = uurElement.querySelectorAll('.planning-item').length;
        if (existingDomItems > uurPlanning.length && uurPlanning.length === 1) {
            console.warn(`⚠️ Consistency issue detected in hour ${uur}:`, {
                domItems: existingDomItems,
                dataItems: uurPlanning.length,
                trigger: 'possible_missing_planning_data'
            });
            
            // Auto-recovery: Refresh planning data from server
            this.handlePlanningInconsistency(uur);
            return; // Early return, let the recovery handle the update
        }
        
        // Update the content
        uurElement.innerHTML = this.renderPlanningItems(uurPlanning, uur);
        
        // Update hour label with new totals
        const totaalMinuten = uurPlanning.reduce((sum, p) => sum + p.duurMinuten, 0);
        const isOverboekt = totaalMinuten > 60;
        
        const uurContainer = document.querySelector(`[data-uur="${uur}"]`);
        if (uurContainer) {
            uurContainer.className = `kalender-uur ${isOverboekt ? 'overboekt' : ''}`;
            
            const uurTotaalElement = uurContainer.querySelector('.uur-totaal-tijd');
            const uurLabelElement = uurContainer.querySelector('.uur-label');
            
            if (totaalMinuten > 0) {
                if (uurTotaalElement) {
                    uurTotaalElement.innerHTML = `(${totaalMinuten} min${isOverboekt ? ' <i class="ti ti-alert-circle"></i>' : ''})`;
                } else {
                    // Add totaal tijd element if it doesn't exist
                    const newTotaalElement = document.createElement('div');
                    newTotaalElement.className = 'uur-totaal-tijd';
                    newTotaalElement.innerHTML = `(${totaalMinuten} min${isOverboekt ? ' <i class="ti ti-alert-circle"></i>' : ''})`;
                    uurLabelElement.appendChild(newTotaalElement);
                }
            } else if (uurTotaalElement) {
                uurTotaalElement.remove();
            }
        }
        
        // Re-bind drag and drop events for new elements (with throttling)
        this.scheduleEventRebind();
    }
    
    async handlePlanningInconsistency(affectedUur) {
        console.log(`🔄 Auto-recovery triggered for hour ${affectedUur} due to inconsistency`);
        
        try {
            const today = new Date().toISOString().split('T')[0];
            const planningResponse = await fetch(`/api/dagelijkse-planning/${today}`);
            
            if (planningResponse.ok) {
                const freshPlanningData = await planningResponse.json();
                console.log('🔄 Recovered planning data from server:', freshPlanningData.length, 'items');
                
                // Update our local cache completely with fresh server data
                this.currentPlanningData = freshPlanningData || [];
                
                // Re-render the affected hour with correct data
                this.updateSingleHourDisplayForced(affectedUur);
                
                // Load subtaken for all tasks
                const plannedTaskIds = this.currentPlanningData
                    .filter(p => p.type === 'taak' && p.actieId)
                    .map(p => p.actieId);
                
                if (plannedTaskIds.length > 0) {
                    await this.loadSubtakenForPlanning(plannedTaskIds);
                }
                
                console.log(`✅ Auto-recovery completed for hour ${affectedUur}`);
            } else {
                console.error('❌ Auto-recovery failed - server error:', planningResponse.status);
            }
        } catch (error) {
            console.error('❌ Auto-recovery failed - network error:', error);
        }
    }
    
    updateSingleHourDisplayForced(uur) {
        // Forced update without consistency checks (for recovery scenarios)
        const uurElement = document.querySelector(`[data-uur="${uur}"] .uur-planning`);
        if (!uurElement) return;
        
        const uurPlanning = this.currentPlanningData?.filter(p => p.uur === uur) || [];
        uurElement.innerHTML = this.renderPlanningItems(uurPlanning, uur);
        
        // Update hour label with new totals
        const totaalMinuten = uurPlanning.reduce((sum, p) => sum + p.duurMinuten, 0);
        const isOverboekt = totaalMinuten > 60;
        
        const uurContainer = document.querySelector(`[data-uur="${uur}"]`);
        if (uurContainer) {
            uurContainer.className = `kalender-uur ${isOverboekt ? 'overboekt' : ''}`;
            
            const uurTotaalElement = uurContainer.querySelector('.uur-totaal-tijd');
            const uurLabelElement = uurContainer.querySelector('.uur-label');
            
            if (totaalMinuten > 0) {
                if (uurTotaalElement) {
                    uurTotaalElement.innerHTML = `(${totaalMinuten} min${isOverboekt ? ' <i class="ti ti-alert-circle"></i>' : ''})`;
                } else {
                    const newTotaalElement = document.createElement('div');
                    newTotaalElement.className = 'uur-totaal-tijd';
                    newTotaalElement.innerHTML = `(${totaalMinuten} min${isOverboekt ? ' <i class="ti ti-alert-circle"></i>' : ''})`;
                    uurLabelElement.appendChild(newTotaalElement);
                }
            } else if (uurTotaalElement) {
                uurTotaalElement.remove();
            }
        }
        
        // Re-bind drag and drop events for new elements
        this.scheduleEventRebind();
    }
    
    removeActionFromList(actieId) {
        console.log('🗑️ removeActionFromList called for actieId:', actieId);
        
        // Remove from local arrays
        if (this.planningActies) {
            this.planningActies = this.planningActies.filter(a => a.id !== actieId);
        }
        if (this.taken) {
            this.taken = this.taken.filter(a => a.id !== actieId);
        }
        
        // CRITICAL FIX: Also remove from planning data to prevent duplicates
        if (this.currentPlanningData) {
            const beforeLength = this.currentPlanningData.length;
            this.currentPlanningData = this.currentPlanningData.filter(p => p.actieId !== actieId);
            const afterLength = this.currentPlanningData.length;
            console.log(`🧹 Cleaned planning data: ${beforeLength} → ${afterLength} items`);
        }
        
        // Update the actions list UI
        const actiesContainer = document.getElementById('planningActiesLijst');
        if (actiesContainer) {
            // Get today's date for ingeplande acties
            const today = new Date().toISOString().split('T')[0];
            
            // Re-render actions list without the removed action
            fetch(`/api/ingeplande-acties/${today}`)
                .then(response => response.ok ? response.json() : [])
                .then(ingeplandeActies => {
                    actiesContainer.innerHTML = this.renderActiesVoorPlanning(this.planningActies || this.taken, ingeplandeActies);
                    // Bind events only for the new actions in the list
                    this.bindActionsListEvents();
                    // Re-apply filters to maintain filter state after drag & drop
                    this.filterPlanningActies();
                })
                .catch(error => {
                    console.error('Error updating actions list:', error);
                    // Fallback: simple filter without ingeplande check
                    actiesContainer.innerHTML = this.renderActiesVoorPlanning(this.planningActies || this.taken, []);
                    // Bind events only for the new actions in the list
                    this.bindActionsListEvents();
                    // Re-apply filters to maintain filter state after drag & drop
                    this.filterPlanningActies();
                });
        }
    }
    
    scheduleEventRebind() {
        // Throttle event rebinding to prevent duplicates
        // Clear any existing timeout first
        if (this.rebindTimeout) {
            clearTimeout(this.rebindTimeout);
        }
        
        // Schedule a single rebind after a short delay
        this.rebindTimeout = setTimeout(() => {
            this.rebindDragAndDropEventsClean();
            this.rebindTimeout = null;
        }, 50); // Small delay to batch multiple rapid calls
    }
    
    rebindDragAndDropEventsClean() {
        // Remove existing event listeners to prevent duplicates
        this.removeDragAndDropEventListeners();
        
        // Then bind fresh events
        this.bindDragAndDropEvents();
    }
    
    removeDragAndDropEventListeners() {
        // Clone and replace elements to remove all event listeners
        const templateItems = document.querySelectorAll('.template-item');
        templateItems.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
        });
        
        const actieItems = document.querySelectorAll('[data-actie-id]');
        actieItems.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
        });
        
        const dropZones = document.querySelectorAll('.uur-content, .drop-zone');
        dropZones.forEach(zone => {
            const newZone = zone.cloneNode(true);
            zone.parentNode.replaceChild(newZone, zone);
        });
    }
    
    bindActionsListEvents() {
        // Get the planning container for drag state tracking
        const planningContainer = document.querySelector('.dagelijkse-planning-layout');
        
        // Only bind drag events for action items in the planning actions list
        document.querySelectorAll('#planningActiesLijst [data-actie-id]').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                const dragData = {
                    type: 'actie',
                    actieId: item.dataset.actieId,
                    duurMinuten: parseInt(item.dataset.duur) || 30
                };
                
                e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
                // Store globally for access during dragover events
                this.currentDragData = dragData;
                
                // Make item transparent during drag
                item.style.opacity = '0.02';
                
                // Create semi-transparent drag image
                const dragImage = document.createElement('div');
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                dragImage.style.width = '100px';
                dragImage.style.height = '40px';
                dragImage.style.background = 'rgba(0, 123, 255, 0.5)';
                dragImage.style.borderRadius = '6px';
                dragImage.style.border = '2px solid rgba(0, 123, 255, 0.8)';
                dragImage.innerHTML = '<div style="color: white; font-size: 12px; text-align: center; line-height: 36px; font-weight: 500;"><i class="fas fa-clipboard"></i></div>';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, 50, 20);
                
                // Clean up after drag
                setTimeout(() => {
                    if (dragImage.parentNode) {
                        document.body.removeChild(dragImage);
                    }
                }, 100);
                
                // Start dynamic drag tracking
                this.startDynamicDragTracking();
            });
            
            item.addEventListener('dragend', (e) => {
                // Restore opacity
                item.style.opacity = '1';
                // Clear global drag data
                this.currentDragData = null;
                // Stop dynamic drag tracking
                this.stopDynamicDragTracking();
            });
        });
    }

    async handlePlanningReorder(data, targetUur, targetPosition) {
        const today = new Date().toISOString().split('T')[0];
        
        // If moving within same hour and no position change, do nothing
        if (data.currentUur === targetUur && targetPosition === null) {
            return;
        }
        
        // Use entertainment loading for reorder operations
        const moveMessages = [
            '🎯 Item wordt verplaatst...',
            '📅 Planning wordt herordend...',
            '⚡ Synchronisatie actief...',
            '✨ Interface wordt bijgewerkt...',
            '🚀 Laatste details...'
        ];
        
        loading.showWithEntertainment('🎯 Verplaatsen...', moveMessages, 1000);
        
        try {
            // Use the new reorder endpoint
            const reorderData = {
                targetUur: targetUur,
                targetPosition: targetPosition
            };
            
            const response = await fetch(`/api/dagelijkse-planning/${data.planningId}/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reorderData)
            });
            
            if (response.ok) {
                // Fast local update instead of full refresh
                await this.updateReorderLocally(data, targetUur, targetPosition);
                this.updateTotaalTijd(); // Update total time
                
                if (data.currentUur !== targetUur) {
                    toast.success(`Item verplaatst naar ${targetUur.toString().padStart(2, '0')}:00`);
                } else {
                    toast.success('Item herordend!');
                }
            } else {
                toast.error('Fout bij verplaatsen item');
            }
            
            await loading.hideWithMinTime();
        } catch (error) {
            loading.hide();
            throw error;
        }
    }
    
    async updateReorderLocally(data, targetUur, targetPosition) {
        // Fetch fresh data from server to get correct ordering
        const today = new Date().toISOString().split('T')[0];
        try {
            const planningResponse = await fetch(`/api/dagelijkse-planning/${today}`);
            if (planningResponse.ok) {
                this.currentPlanningData = await planningResponse.json();
                console.log('📊 Fetched reordered planning data:', this.currentPlanningData.length, 'items');
            }
        } catch (error) {
            console.error('Error fetching reordered planning data:', error);
        }
        
        // Update the affected hour displays
        const oldUur = data.currentUur;
        this.updateSingleHourDisplay(oldUur);
        if (oldUur !== targetUur) {
            this.updateSingleHourDisplay(targetUur);
        }
    }

    async deletePlanningItem(planningId, event) {
        // Stop event propagation to prevent expand/collapse from triggering
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        
        console.log('🗑️ deletePlanningItem called for:', planningId);
        
        // Get the planning item element
        const planningItem = document.querySelector(`[data-planning-id="${planningId}"]`);
        if (!planningItem) {
            console.error('❌ Planning item DOM element not found:', planningId);
            toast.error('Planning item niet gevonden');
            return;
        }
        
        // Collapse the item first if it's expanded
        if (planningItem.classList.contains('expanded')) {
            planningItem.classList.remove('expanded');
            const chevron = planningItem.querySelector('.expand-chevron');
            if (chevron) chevron.textContent = '▶';
        }
        
        // Provide immediate visual feedback - make item semi-transparent
        planningItem.style.transition = 'opacity 0.2s ease-out';
        planningItem.style.opacity = '0.5';
        planningItem.style.pointerEvents = 'none';
        
        await loading.withLoading(async () => {
            try {
                const response = await fetch(`/api/dagelijkse-planning/${planningId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    console.log('✅ Server delete successful');
                    // Remove from local data and update only the affected area
                    this.removePlanningItemLocally(planningId);
                    this.updateTotaalTijd(); // Update total time
                    toast.success('Planning item verwijderd!');
                } else {
                    console.error('❌ Server delete failed:', response.status);
                    // Restore the item visibility on error
                    planningItem.style.opacity = '1';
                    planningItem.style.pointerEvents = 'auto';
                    toast.error('Fout bij verwijderen planning item');
                }
            } catch (error) {
                console.error('Error deleting planning item:', error);
                // Restore the item visibility on error
                planningItem.style.opacity = '1';
                planningItem.style.pointerEvents = 'auto';
                toast.error('Fout bij verwijderen planning item');
            }
        }, {
            operationId: 'delete-planning-item',
            showGlobal: true,
            message: 'Planning item verwijderen...'
        });
    }
    
    togglePlanningItemExpand(planningId, event) {
        // Prevent drag from starting when clicking expand/collapse
        if (event) {
            event.stopPropagation();
        }
        
        const planningItem = document.querySelector(`[data-planning-id="${planningId}"]`);
        if (!planningItem) return;
        
        const detailsDiv = planningItem.querySelector('.planning-item-details');
        const chevronIcon = planningItem.querySelector('.expand-chevron');
        
        if (!detailsDiv || !chevronIcon) return;
        
        const isExpanded = planningItem.classList.contains('expanded');
        
        if (isExpanded) {
            // Collapse
            planningItem.classList.remove('expanded');
            chevronIcon.textContent = '▶';
        } else {
            // Expand
            planningItem.classList.add('expanded');
            chevronIcon.textContent = '▼';
        }
    }
    
    removePlanningItemLocally(planningId) {
        console.log('🗑️ removePlanningItemLocally called for:', planningId);
        
        // First try to find the DOM element to get the hour
        const domElement = document.querySelector(`[data-planning-id="${planningId}"]`);
        let affectedHour = null;
        
        if (domElement) {
            // Get the hour from the parent element
            const hourElement = domElement.closest('[data-uur]');
            if (hourElement) {
                affectedHour = parseInt(hourElement.dataset.uur);
                console.log('📍 Found hour from DOM:', affectedHour);
            }
            
            // Remove the DOM element immediately with fade effect
            console.log('🎯 Fading out DOM element');
            domElement.style.transition = 'opacity 0.2s ease-out';
            domElement.style.opacity = '0';
            
            setTimeout(() => {
                if (domElement.parentNode) {
                    domElement.remove();
                    console.log('✅ DOM element removed');
                }
            }, 200);
        }
        
        if (!this.currentPlanningData) {
            console.error('❌ No currentPlanningData available');
            return;
        }
        
        // Find the item in planning data
        const item = this.currentPlanningData.find(p => p.id === planningId);
        if (item) {
            affectedHour = item.uur;
            console.log('📍 Item found in data, hour:', affectedHour);
            console.log('📊 Before removal - items in hour:', this.currentPlanningData.filter(p => p.uur === affectedHour).length);
            
            // Remove from local data
            this.currentPlanningData = this.currentPlanningData.filter(p => p.id !== planningId);
            console.log('📊 After removal - items in hour:', this.currentPlanningData.filter(p => p.uur === affectedHour).length);
        } else {
            console.log('⚠️ Item not found in currentPlanningData (may have been removed already)');
        }
        
        // Update the hour display if we found the hour
        if (affectedHour !== null) {
            // Wait a bit to ensure DOM element is removed first
            setTimeout(() => {
                console.log('🔄 Updating hour display for:', affectedHour);
                this.updateSingleHourDisplay(affectedHour);
            }, 250);
        }
    }

    editPlanningItemName(planningId, spanElement) {
        // Prevent editing if already in edit mode
        if (spanElement.querySelector('input')) {
            return;
        }

        const currentName = spanElement.textContent;
        
        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'planning-naam-edit';
        input.style.cssText = `
            background: var(--macos-bg-primary);
            border: 1px solid var(--macos-blue);
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 11px;
            width: 100%;
            box-sizing: border-box;
            outline: none;
        `;

        // Replace span content with input
        spanElement.innerHTML = '';
        spanElement.appendChild(input);
        
        // Focus and select text
        input.focus();
        input.select();

        // Prevent double execution
        let isSaving = false;
        
        // Save function
        const saveEdit = async () => {
            if (isSaving) return;
            isSaving = true;
            
            const newName = input.value.trim();
            
            if (newName && newName !== currentName) {
                // Update via API
                await this.updatePlanningItemName(planningId, newName);
                spanElement.textContent = newName;
            } else {
                // Restore original name
                spanElement.textContent = currentName;
            }
        };

        // Cancel function  
        const cancelEdit = () => {
            if (isSaving) return;
            spanElement.textContent = currentName;
        };

        // Event listeners
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur(); // This will trigger saveEdit via blur event
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }

    async updatePlanningItemName(planningId, newName) {
        try {
            const response = await fetch(`/api/dagelijkse-planning/${planningId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ naam: newName })
            });

            if (response.ok) {
                // Update local data
                const item = this.currentPlanningData?.find(p => p.id === planningId);
                if (item) {
                    item.naam = newName;
                }
                toast.success('Naam bijgewerkt!');
            } else {
                toast.error('Fout bij bijwerken naam');
            }
        } catch (error) {
            console.error('Error updating planning item name:', error);
            toast.error('Fout bij bijwerken naam');
        }
    }

    async completePlanningTask(actieId, checkboxElement) {
        console.log('🎯 completePlanningTask called with actieId:', actieId);
        
        // Optimistische UI update: checkbox direct aanvinken
        checkboxElement.checked = true;
        checkboxElement.disabled = true; // Voorkom dubbele clicks
        
        // Entertainment messages voor task completion
        const completionMessages = [
            '✅ Taak wordt afgewerkt...',
            '🎯 Voortgang wordt opgeslagen...',
            '📊 Productiviteit wordt bijgewerkt...',
            '⚡ Database wordt gesynchroniseerd...',
            '🔄 Herhalende taken worden verwerkt...',
            '🚀 Bijna klaar...'
        ];
        
        // Start entertainment loading
        loading.showWithEntertainment('✅ Taak afwerken...', completionMessages, 1200);
        
        try {
            // Find the task in planning actions array first, then fall back to main tasks
            let taak = this.planningActies?.find(t => t.id === actieId) || this.taken.find(t => t.id === actieId);
            console.log('<i class="fas fa-clipboard"></i> Local task found:', taak ? 'Yes' : 'No');
            
            if (!taak) {
                console.log('<i class="ti ti-search"></i> Task not found locally, fetching from API...');
                // If not found locally, fetch from API
                try {
                    const actiesResponse = await fetch('/api/lijst/acties');
                    if (actiesResponse.ok) {
                        const acties = await actiesResponse.json();
                        taak = acties.find(t => t.id === actieId);
                        console.log('🌐 Task found via API:', taak ? 'Yes' : 'No');
                    }
                } catch (error) {
                    console.error('Error fetching task from API:', error);
                }
            }
            
            if (!taak) {
                console.error('<i class="ti ti-x"></i> Task not found anywhere:', actieId);
                toast.error('Taak niet gevonden');
                checkboxElement.checked = false;
                return;
            }
            
            console.log('📝 Found task:', { id: taak.id, tekst: taak.tekst, afgewerkt: taak.afgewerkt, herhalingActief: taak.herhalingActief, herhalingType: taak.herhalingType });
            
            // Check if this is a recurring task
            const isRecurring = taak.herhalingActief && taak.herhalingType;
            console.log('<i class="fas fa-redo"></i> Is recurring task:', isRecurring);
            
            // Mark task as completed with current timestamp
            taak.afgewerkt = new Date().toISOString();
            console.log('⏰ Marked task as completed at:', taak.afgewerkt);
            
            // Handle recurring tasks - create next instance BEFORE marking as completed
            let nextRecurringTaskId = null;
            let calculatedNextDate = null;
            if (isRecurring) {
                console.log('🔁 Creating next recurring task...');
                if (taak.herhalingType.startsWith('event-')) {
                    // Handle event-based recurrence - ask for next event date
                    const nextEventDate = await this.askForNextEventDate(taak);
                    if (nextEventDate) {
                        calculatedNextDate = this.calculateEventBasedDate(nextEventDate, taak.herhalingType);
                        if (calculatedNextDate) {
                            nextRecurringTaskId = await this.createNextRecurringTask(taak, calculatedNextDate);
                            console.log('✨ Event-based recurring task created:', nextRecurringTaskId);
                        }
                    }
                } else {
                    calculatedNextDate = this.calculateNextRecurringDate(taak.verschijndatum, taak.herhalingType);
                    if (calculatedNextDate) {
                        nextRecurringTaskId = await this.createNextRecurringTask(taak, calculatedNextDate);
                        console.log('✨ Recurring task created:', nextRecurringTaskId);
                    }
                }
            }
            
            // Mark task as completed using existing completion workflow
            console.log('🚀 Calling verplaatsTaakNaarAfgewerkt...');
            const success = await this.verplaatsTaakNaarAfgewerkt(taak);
            console.log('<i class="fas fa-check"></i> verplaatsTaakNaarAfgewerkt result:', success);
            if (success) {
                console.log('<i class="fas fa-party-horn"></i> Task successfully marked as completed in database');
                
                // Remove task from both arrays if present
                console.log('🗑️ Removing task from local arrays...');
                this.taken = this.taken.filter(t => t.id !== actieId);
                if (this.planningActies) {
                    this.planningActies = this.planningActies.filter(t => t.id !== actieId);
                }
                console.log('📊 Arrays updated, current list type:', this.huidigeLijst);
                
                // Chirurgische DOM update: verwijder het planning item direct uit de kalender
                const planningElement = document.querySelector(`[data-actie-id="${actieId}"]`);
                if (planningElement) {
                    // Fade out animatie voor smooth removal
                    planningElement.style.opacity = '0';
                    planningElement.style.transform = 'scale(0.9)';
                    planningElement.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                    
                    // Verwijder het element na animatie
                    setTimeout(() => {
                        planningElement.remove();
                        console.log('✨ Planning item removed from DOM');
                    }, 200);
                }
                
                // Refresh the daily planning view to update both actions list and calendar
                if (this.huidigeLijst === 'dagelijkse-planning') {
                    console.log('<i class="fas fa-redo"></i> Updating daily planning - both calendar and actions list...');
                    
                    // Add new recurring task to local arrays BEFORE updating UI
                    if (nextRecurringTaskId) {
                        try {
                            const newTaskResponse = await fetch(`/api/taak/${nextRecurringTaskId}`);
                            if (newTaskResponse.ok) {
                                const newTask = await newTaskResponse.json();
                                console.log('<i class="fas fa-redo"></i> Adding new recurring task to local arrays for daily planning:', newTask);
                                
                                // Add to both arrays used for drag & drop
                                this.taken.push(newTask);
                                if (this.planningActies) {
                                    this.planningActies.push(newTask);
                                }
                                
                                // Update the actions list UI to show the new task with recurring indicator
                                const actiesLijst = document.getElementById('planningActiesLijst');
                                if (actiesLijst) {
                                    this.renderPlanningActies();
                                }
                            }
                        } catch (error) {
                            console.error('Error fetching new recurring task for daily planning:', error);
                        }
                    }
                    
                    // Update actions list with local data (for immediate feedback)
                    const actiesContainer = document.getElementById('planningActiesLijst');
                    if (actiesContainer) {
                        const today = new Date().toISOString().split('T')[0];
                        const ingeplandeResponse = await fetch(`/api/ingeplande-acties/${today}`);
                        const ingeplandeActies = ingeplandeResponse.ok ? await ingeplandeResponse.json() : [];
                        
                        // Use local planningActies array which has been updated
                        actiesContainer.innerHTML = this.renderActiesVoorPlanning(this.planningActies || this.taken, ingeplandeActies);
                        this.bindDragAndDropEvents();
                        console.log('<i class="fas fa-check"></i> Actions list updated with local data');
                    }
                    
                    // Also refresh the calendar to remove completed tasks from planning items
                    console.log('🗓️ Refreshing calendar with updated planning data...');
                    const today = new Date().toISOString().split('T')[0];
                    console.log('<i class="ti ti-calendar"></i> Fetching planning data for date:', today);
                    
                    const planningResponse = await fetch(`/api/dagelijkse-planning/${today}`);
                    console.log('📡 Planning API response status:', planningResponse.status);
                    
                    if (planningResponse.ok) {
                        const updatedPlanning = await planningResponse.json();
                        console.log('<i class="fas fa-clipboard"></i> Updated planning data received:', updatedPlanning.length, 'items');
                        console.log('<i class="ti ti-search"></i> Planning items for completed task:', updatedPlanning.filter(p => p.actieId === actieId));
                        
                        // Re-render calendar section with filtered data
                        const kalenderContainer = document.getElementById('kalenderGrid');
                        console.log('🎯 Kalender container found:', !!kalenderContainer);
                        
                        if (kalenderContainer) {
                            // Get current time range preferences
                            const startUur = parseInt(localStorage.getItem('dagplanning-start-uur') || '8');
                            const eindUur = parseInt(localStorage.getItem('dagplanning-eind-uur') || '18');
                            console.log('⏰ Time range:', startUur, 'to', eindUur);
                            
                            const newHTML = this.renderKalenderGrid(startUur, eindUur, updatedPlanning);
                            console.log('🏗️ Generated new calendar HTML length:', newHTML.length);
                            
                            kalenderContainer.innerHTML = newHTML;
                            this.bindDragAndDropEvents(); // Re-bind events for calendar too
                            console.log('<i class="fas fa-check"></i> Calendar updated with filtered planning data');
                        } else {
                            console.error('<i class="ti ti-x"></i> Kalender container not found in DOM');
                        }
                    } else {
                        console.error('<i class="ti ti-x"></i> Failed to fetch updated planning data:', planningResponse.status);
                    }
                } else {
                    console.log('<i class="fas fa-redo"></i> Re-rendering normal view...');
                    // For other views, use normal renderTaken
                    await this.preservePlanningFilters(() => this.renderTaken());
                }
                this.updateTotaalTijd(); // Update total time
                // await this.laadTellingen(); // Disabled - tellers removed from sidebar
                console.log('📈 Tellingen updated');
                
                // Show success message with task name
                const projectNaam = this.getProjectNaam(taak.projectId);
                const taskDisplay = projectNaam !== 'Geen project' ? `${taak.tekst} (${projectNaam})` : taak.tekst;
                
                // Handle recurring tasks
                if (isRecurring && nextRecurringTaskId) {
                    const nextDateFormatted = new Date(calculatedNextDate).toLocaleDateString('nl-NL');
                    toast.success(`${taskDisplay} afgerond! Volgende herhaling gepland voor ${nextDateFormatted}`);
                    
                    // Refresh all data to show the new recurring task
                    console.log('<i class="fas fa-redo"></i> Refreshing all data after recurring task creation...');
                    // await this.laadTellingen(); // Disabled - tellers removed from sidebar
                    
                    // For daily planning, refresh the actions list to show the new task
                    if (this.huidigeLijst === 'dagelijkse-planning') {
                        console.log('<i class="fas fa-clipboard"></i> Refreshing actions list to show new recurring task...');
                        // Re-fetch actions from API to get the new recurring task
                        const actiesResponse = await fetch('/api/lijst/acties');
                        if (actiesResponse.ok) {
                            const refreshedActies = await actiesResponse.json();
                            this.planningActies = this.filterTakenOpDatum(refreshedActies, true);
                            console.log('<i class="fas fa-check"></i> Planning actions refreshed with new recurring task');
                            
                            // Update the actions list display
                            const actiesContainer = document.getElementById('planningActiesLijst');
                            if (actiesContainer) {
                                const today = new Date().toISOString().split('T')[0];
                                const ingeplandeResponse = await fetch(`/api/ingeplande-acties/${today}`);
                                const ingeplandeActies = ingeplandeResponse.ok ? await ingeplandeResponse.json() : [];
                                actiesContainer.innerHTML = this.renderActiesVoorPlanning(this.planningActies, ingeplandeActies);
                                this.bindDragAndDropEvents();
                            }
                        }
                    }
                } else if (taak.herhalingActief && taak.herhalingType) {
                    toast.success(`${taskDisplay} afgerond! Volgende herhaling wordt gepland.`);
                } else {
                    toast.success(`${taskDisplay} afgerond!`);
                }
            } else {
                // Revert checkbox if completion failed
                checkboxElement.checked = false;
                checkboxElement.disabled = false;
                toast.error('Fout bij afwerken van taak. Probeer opnieuw.');
            }
        } catch (error) {
            console.error('Error completing planning task:', error);
            checkboxElement.checked = false;
            checkboxElement.disabled = false;
            toast.error('Fout bij afwerken van taak. Probeer opnieuw.');
        } finally {
            // Hide loading with minimum time for smooth UX
            await loading.hideWithMinTime();
            
            // Re-enable checkbox after completion
            if (checkboxElement.disabled) {
                checkboxElement.disabled = false;
            }
        }
    }

    addNewTaskToDOM(newTask) {
        // Add new recurring task to DOM without full refresh
        if (this.huidigeLijst === 'acties') {
            // Check if we're in table view or list view
            const tableBody = document.querySelector('.taken-tabel tbody');
            const taskList = document.querySelector('.taken-lijst');
            
            if (tableBody) {
                // Table view - add as table row
                const tr = document.createElement('tr');
                tr.className = 'taak-row';
                tr.innerHTML = this.createTaskRowHTML(newTask);
                
                // Add with slide-in animation
                tr.style.opacity = '0';
                tr.style.transform = 'translateY(-20px)';
                tr.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                
                // Insert at top of table
                tableBody.insertBefore(tr, tableBody.firstChild);
                
                // Trigger animation
                setTimeout(() => {
                    tr.style.opacity = '1';
                    tr.style.transform = 'translateY(0)';
                }, 50);
            } else if (taskList) {
                // List view - add as list item
                const li = document.createElement('li');
                li.className = 'taak-item';
                li.innerHTML = this.createTaskListHTML(newTask);
                
                // Add with slide-in animation
                li.style.opacity = '0';
                li.style.transform = 'translateY(-20px)';
                li.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                
                // Insert at top of list
                taskList.insertBefore(li, taskList.firstChild);
                
                // Trigger animation
                setTimeout(() => {
                    li.style.opacity = '1';
                    li.style.transform = 'translateY(0)';
                }, 50);
            }
            
            console.log('✨ New recurring task added to DOM without full refresh');
        }
    }

    createTaskRowHTML(taak) {
        // Create HTML for table row (actions table view)
        const projectNaam = this.getProjectNaam(taak.projectId);
        const contextNaam = this.getContextNaam(taak.contextId);
        const herhalingIndicator = taak.herhalingActief ? ' 🔄' : '';
        const datum = taak.verschijndatum ? new Date(taak.verschijndatum).toLocaleDateString('nl-NL') : '';
        
        return `
            <td title="Taak afwerken">
                <input type="checkbox" onchange="app.taakAfwerken('${taak.id}')">
            </td>
            <td class="taak-naam-cell" onclick="app.bewerkActieWrapper('${taak.id}')" title="${this.escapeHtml(taak.tekst)}${taak.opmerkingen ? '\n\nOpmerkingen:\n' + this.escapeHtml(taak.opmerkingen) : ''}">${taak.tekst}${herhalingIndicator}</td>
            <td title="${this.escapeHtml(projectNaam)}">${projectNaam}</td>
            <td title="${this.escapeHtml(contextNaam)}">${contextNaam}</td>
            <td title="${datum}">${datum}</td>
            <td title="${taak.duur} minuten">${taak.duur} min</td>
            <td>
                <div class="actie-buttons">
                    <div class="verplaats-dropdown">
                        <button class="verplaats-btn-small" onclick="app.toggleVerplaatsDropdown('${taak.id}')" title="Verplaats naar andere lijst">↗️</button>
                        <div class="verplaats-menu" id="verplaats-${taak.id}" style="display: none;">
                            <button onclick="app.verplaatsActie('${taak.id}', 'opvolgen')">Opvolgen</button>
                            <button onclick="app.verplaatsActie('${taak.id}', 'uitgesteld-wekelijks')">Wekelijks</button>
                            <button onclick="app.verplaatsActie('${taak.id}', 'uitgesteld-maandelijks')">Maandelijks</button>
                            <button onclick="app.verplaatsActie('${taak.id}', 'uitgesteld-3maandelijks')">3-maandelijks</button>
                            <button onclick="app.verplaatsActie('${taak.id}', 'uitgesteld-6maandelijks')">6-maandelijks</button>
                            <button onclick="app.verplaatsActie('${taak.id}', 'uitgesteld-jaarlijks')">Jaarlijks</button>
                        </div>
                    </div>
                    <button onclick="app.verwijderTaak('${taak.id}')" class="verwijder-btn" title="Verwijder taak">×</button>
                </div>
            </td>
        `;
    }

    createTaskListHTML(taak) {
        // Create HTML for list item (actions list view)
        const projectNaam = this.getProjectNaam(taak.projectId);
        const contextNaam = this.getContextNaam(taak.contextId);
        const herhalingIndicator = taak.herhalingActief ? ' 🔄' : '';
        
        // Build extra info
        const extraInfo = [];
        if (projectNaam !== 'Geen project') extraInfo.push(projectNaam);
        if (contextNaam) extraInfo.push('@' + contextNaam);
        if (taak.verschijndatum) extraInfo.push(new Date(taak.verschijndatum).toLocaleDateString('nl-NL'));
        if (taak.duur) extraInfo.push(taak.duur + ' min');
        
        const extraInfoHtml = extraInfo.length > 0 ? 
            `<div class="taak-extra-info">${extraInfo.join(' • ')}</div>` : '';
        
        return `
            <div class="taak-checkbox">
                <input type="checkbox" id="taak-${taak.id}" onchange="app.taakAfwerken('${taak.id}')">
            </div>
            <div class="taak-content" onclick="app.bewerkActieWrapper('${taak.id}')" style="cursor: pointer;" title="${taak.opmerkingen ? this.escapeHtml(taak.opmerkingen) : 'Klik om te bewerken'}">
                <div class="taak-titel">${taak.tekst}${herhalingIndicator}</div>
                ${extraInfoHtml}
            </div>
            <div class="taak-acties">
                <button onclick="app.toonActiesMenu('${taak.id}', 'acties', null, null, this)" class="acties-btn" title="Acties"><i class="fas fa-ellipsis-v"></i></button>
                <button onclick="app.verwijderTaak('${taak.id}')" class="verwijder-btn" title="Verwijder taak">×</button>
            </div>
        `;
    }

    async voegTestTakenToe() {
        const testTaken = [
            { tekst: 'Test taak 1 - Normale taak', project: 'Test Project', context: 'test', duur: 30 },
            { tekst: 'Test taak 2 - Dagelijkse herhaling', project: 'Test Project', context: 'test', duur: 15, herhaling: 'dagelijks' },
            { tekst: 'Test taak 3 - Wekelijkse herhaling', project: 'Test Project', context: 'test', duur: 60, herhaling: 'weekly-1-1' },
            { tekst: 'Test taak 4 - Maandelijkse herhaling', project: 'Test Project', context: 'test', duur: 45, herhaling: 'monthly-day-1-1' },
            { tekst: 'Test taak 5 - Lange taak naam voor testen van layout en responsive design', project: 'Test Project', context: 'test', duur: 120 }
        ];

        toast.info(`${testTaken.length} test taken toevoegen...`);

        try {
            for (const taak of testTaken) {
                const taskData = {
                    id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    tekst: taak.tekst,
                    projectId: taak.project,
                    contextId: taak.context,
                    duur: taak.duur,
                    verschijndatum: new Date().toISOString().split('T')[0],
                    lijst: 'inbox',
                    herhalingType: taak.herhaling || null,
                    herhalingActief: !!taak.herhaling,
                    opmerkingen: 'Test taak - gegenereerd door test knop'
                };

                const response = await fetch('/api/debug/add-single-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(taskData)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }

                // Small delay to prevent overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            toast.success('Test taken succesvol toegevoegd!');
            
            // Refresh the current list if we're in inbox
            if (this.huidigeLijst === 'inbox') {
                await this.laadHuidigeLijst();
            }

        } catch (error) {
            console.error('Error adding test tasks:', error);
            toast.error('Fout bij toevoegen van test taken');
        }
    }

    async renderUitgesteldConsolidated() {
        const container = document.querySelector('.main-content');
        if (!container) return;

        // Define the uitgesteld categories
        const uitgesteldCategories = [
            { key: 'uitgesteld-wekelijks', name: 'Wekelijks', icon: 'fas fa-pause-circle' },
            { key: 'uitgesteld-maandelijks', name: 'Maandelijks', icon: 'fas fa-pause-circle' },
            { key: 'uitgesteld-3maandelijks', name: '3-maandelijks', icon: 'fas fa-pause-circle' },
            { key: 'uitgesteld-6maandelijks', name: '6-maandelijks', icon: 'fas fa-pause-circle' },
            { key: 'uitgesteld-jaarlijks', name: 'Jaarlijks', icon: 'fas fa-pause-circle' }
        ];

        // Load counts for each category
        const categoryCounts = {};
        for (const category of uitgesteldCategories) {
            try {
                const response = await fetch(`/api/lijst/${category.key}`);
                if (response.ok) {
                    const taken = await response.json();
                    categoryCounts[category.key] = taken.length;
                } else {
                    categoryCounts[category.key] = 0;
                }
            } catch (error) {
                console.error(`Error loading count for ${category.key}:`, error);
                categoryCounts[category.key] = 0;
            }
        }

        container.innerHTML = `
            <header class="main-header">
                <button class="hamburger-menu" id="hamburger-menu" aria-label="Toggle menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <h1 id="page-title">Uitgesteld</h1>
            </header>

            <div class="content-area">
                <div class="uitgesteld-accordion">
                    ${uitgesteldCategories.map(category => `
                        <div class="uitgesteld-sectie" data-category="${category.key}">
                            <div class="sectie-header" onclick="app.toggleUitgesteldSectie('${category.key}')">
                                <div class="sectie-titel">
                                    <i class="${category.icon}"></i>
                                    <span>${category.name}</span>
                                    <span class="taken-count">(${categoryCounts[category.key]})</span>
                                </div>
                                <div class="sectie-chevron">
                                    <i class="fas fa-chevron-right"></i>
                                </div>
                            </div>
                            <div class="sectie-content" id="content-${category.key}" style="display: none;">
                                <div class="loading-placeholder">
                                    Klik om taken te laden...
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Reinitialize mobile menu for the new header
        this.initializeMobileSidebar();
        
        // Setup drop zones for drag & drop between lists
        this.setupUitgesteldDropZones();
    }

    async toggleUitgesteldSectie(categoryKey) {
        const sectie = document.querySelector(`[data-category="${categoryKey}"]`);
        const content = document.getElementById(`content-${categoryKey}`);
        const chevron = sectie.querySelector('.sectie-chevron i');
        
        if (!sectie || !content) return;

        const isOpen = content.style.display !== 'none';
        
        if (isOpen) {
            // Close section
            content.style.display = 'none';
            chevron.classList.remove('fa-chevron-down');
            chevron.classList.add('fa-chevron-right');
        } else {
            // Open section and load data if needed
            content.style.display = 'block';
            chevron.classList.remove('fa-chevron-right');
            chevron.classList.add('fa-chevron-down');
            
            // Load data if not already loaded
            if (content.querySelector('.loading-placeholder')) {
                await this.loadUitgesteldSectieData(categoryKey);
            }
        }
    }

    async loadUitgesteldSectieData(categoryKey) {
        const content = document.getElementById(`content-${categoryKey}`);
        if (!content) return;

        try {
            // Show loading state
            content.innerHTML = '<div class="loading-state">Laden...</div>';
            
            // Load data from API
            const response = await fetch(`/api/lijst/${categoryKey}`);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            const taken = await response.json();
            
            if (taken.length === 0) {
                content.innerHTML = '<div class="empty-state">Geen taken in deze categorie</div>';
                return;
            }

            // Simple list - indicators will be added by JavaScript
            content.innerHTML = `
                <div class="uitgesteld-lijst-container">
                    <ul class="uitgesteld-taken-lijst" id="lijst-${categoryKey}">
                    </ul>
                </div>
            `;

            // Render the tasks in the table
            this.renderUitgesteldSectieRows(categoryKey, taken);
            
            // Setup intelligent scroll indicators
            this.setupIntelligentScrollIndicators(categoryKey);

        } catch (error) {
            console.error(`Error loading data for ${categoryKey}:`, error);
            content.innerHTML = '<div class="error-state">Fout bij laden van taken</div>';
        }
    }

    renderUitgesteldSectieRows(categoryKey, taken) {
        const lijst = document.getElementById(`lijst-${categoryKey}`);
        if (!lijst) return;

        lijst.innerHTML = '';

        taken.forEach(taak => {
            const li = document.createElement('li');
            li.className = 'uitgesteld-taak-item';
            li.dataset.id = taak.id;
            
            const recurringIndicator = taak.herhalingActief ? ' <span class="recurring-indicator" title="Herhalende taak"><i class="fas fa-redo"></i></span>' : '';
            const tooltipContent = taak.opmerkingen ? taak.opmerkingen.replace(/'/g, '&apos;') : '';
            
            li.draggable = true;
            li.innerHTML = `
                <div class="taak-content">
                    <span class="taak-tekst" title="${tooltipContent}">${taak.tekst}${recurringIndicator}</span>
                </div>
                <div class="taak-acties">
                    <button class="delete-btn-small" onclick="app.verwijderTaak('${taak.id}', '${categoryKey}')" title="Taak verwijderen">×</button>
                </div>
            `;
            
            // Add drag event listeners
            li.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'uitgesteld-taak',
                    taakId: taak.id,
                    bronLijst: categoryKey,
                    taakTekst: taak.tekst
                }));
                e.dataTransfer.effectAllowed = 'move';
                li.style.opacity = '0.5';
                
                // Show floating drop panel
                this.showFloatingDropPanel();
            });
            
            li.addEventListener('dragend', (e) => {
                li.style.opacity = '1';
                
                // Hide floating drop panel
                this.hideFloatingDropPanel();
            });

            lijst.appendChild(li);
        });
    }

    setupUitgesteldDropZones() {
        // Setup drop zones for all uitgesteld section headers
        const uitgesteldCategories = [
            'uitgesteld-wekelijks', 'uitgesteld-maandelijks', 'uitgesteld-3maandelijks', 
            'uitgesteld-6maandelijks', 'uitgesteld-jaarlijks'
        ];

        uitgesteldCategories.forEach(categoryKey => {
            // Drop zone for section header (closed sections)
            const header = document.querySelector(`[data-category="${categoryKey}"] .sectie-header`);
            if (header) {
                this.setupDropZone(header, categoryKey, 'header');
            }

            // Drop zone for content area (open sections)
            const content = document.getElementById(`content-${categoryKey}`);
            if (content) {
                this.setupDropZone(content, categoryKey, 'content');
            }
        });
    }

    setupDropZone(element, targetCategory, zoneType) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            // Add visual feedback
            if (zoneType === 'header') {
                element.classList.add('drop-target-header');
            } else {
                element.classList.add('drop-target-content');
            }
        });

        element.addEventListener('dragleave', (e) => {
            // Remove visual feedback
            element.classList.remove('drop-target-header', 'drop-target-content');
        });

        element.addEventListener('drop', async (e) => {
            e.preventDefault();
            
            // Remove visual feedback
            element.classList.remove('drop-target-header', 'drop-target-content');
            
            try {
                const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                
                if (dragData.type === 'uitgesteld-taak') {
                    const { taakId, bronLijst } = dragData;
                    
                    // Don't move to same list
                    if (bronLijst === targetCategory) {
                        return;
                    }
                    
                    // Perform the move
                    await this.handleUitgesteldDrop(taakId, bronLijst, targetCategory);
                }
            } catch (error) {
                console.error('Error processing drop:', error);
                toast.error('Fout bij verplaatsen van taak');
            }
        });
    }

    async handleUitgesteldDrop(taakId, bronLijst, doelLijst) {
        await loading.withLoading(async () => {
            try {
                // Use existing move function
                const response = await fetch(`/api/taak/${taakId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        lijst: doelLijst
                    })
                });

                if (response.ok) {
                    // Remove from source list DOM
                    const sourceItem = document.querySelector(`[data-id="${taakId}"]`);
                    if (sourceItem) {
                        sourceItem.remove();
                        
                        // Update source count
                        const sourceHeader = document.querySelector(`[data-category="${bronLijst}"] .taken-count`);
                        if (sourceHeader) {
                            const currentCount = parseInt(sourceHeader.textContent.match(/\d+/)[0]);
                            sourceHeader.textContent = `(${currentCount - 1})`;
                        }
                    }

                    // Update target count and reload if section is open
                    const targetHeader = document.querySelector(`[data-category="${doelLijst}"] .taken-count`);
                    if (targetHeader) {
                        const currentCount = parseInt(targetHeader.textContent.match(/\d+/)[0]);
                        targetHeader.textContent = `(${currentCount + 1})`;
                    }

                    // Reload target section if it's open
                    const targetContent = document.getElementById(`content-${doelLijst}`);
                    if (targetContent && targetContent.style.display !== 'none') {
                        await this.loadUitgesteldSectieData(doelLijst);
                    }

                    toast.success(`Taak verplaatst naar ${doelLijst.replace('uitgesteld-', '')}`);
                } else {
                    const error = await response.json();
                    toast.error(`Fout bij verplaatsen: ${error.error || 'Onbekende fout'}`);
                }
            } catch (error) {
                console.error('Error moving task:', error);
                toast.error('Fout bij verplaatsen van taak');
            }
        }, {
            operationId: 'drag-drop-move',
            showGlobal: true,
            message: 'Taak verplaatsen...'
        });
    }

    setupIntelligentScrollIndicators(categoryKey) {
        const scrollContainer = document.getElementById(`content-${categoryKey}`);
        if (!scrollContainer) return;

        // Create and insert fixed indicators
        const topIndicator = document.createElement('div');
        topIndicator.className = 'scroll-indicator-fixed scroll-indicator-top';
        topIndicator.innerHTML = '▲';
        topIndicator.style.cssText = `
            position: fixed;
            top: ${scrollContainer.getBoundingClientRect().top}px;
            left: ${scrollContainer.getBoundingClientRect().left}px;
            width: ${scrollContainer.offsetWidth}px;
            height: 20px;
            background: linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(0,0,0,0.6);
            font-size: 10px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        `;

        const bottomIndicator = document.createElement('div');
        bottomIndicator.className = 'scroll-indicator-fixed scroll-indicator-bottom';
        bottomIndicator.innerHTML = '▼';
        bottomIndicator.style.cssText = `
            position: fixed;
            top: ${scrollContainer.getBoundingClientRect().bottom - 20}px;
            left: ${scrollContainer.getBoundingClientRect().left}px;
            width: ${scrollContainer.offsetWidth}px;
            height: 20px;
            background: linear-gradient(to top, rgba(0,0,0,0.15) 0%, transparent 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(0,0,0,0.6);
            font-size: 10px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        `;

        document.body.appendChild(topIndicator);
        document.body.appendChild(bottomIndicator);

        const updateScrollIndicators = () => {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
            const isScrollable = scrollHeight > clientHeight;
            
            if (!isScrollable) {
                topIndicator.style.opacity = '0';
                bottomIndicator.style.opacity = '0';
                return;
            }
            
            const canScrollUp = scrollTop > 10;
            const canScrollDown = scrollTop < scrollHeight - clientHeight - 10;
            
            topIndicator.style.opacity = canScrollUp ? '1' : '0';
            bottomIndicator.style.opacity = canScrollDown ? '1' : '0';
        };

        scrollContainer.addEventListener('scroll', updateScrollIndicators, { passive: true });
        setTimeout(updateScrollIndicators, 100);

        // Cleanup function for later
        scrollContainer._cleanupIndicators = () => {
            if (topIndicator.parentNode) document.body.removeChild(topIndicator);
            if (bottomIndicator.parentNode) document.body.removeChild(bottomIndicator);
        };
    }

    showFloatingDropPanel() {
        const panel = document.getElementById('floatingDropPanel');
        if (panel) {
            panel.classList.add('active');
            panel.style.display = 'block';
            
            // Setup drop zones if not already done
            if (!this.floatingDropZonesSetup) {
                this.setupFloatingDropZones();
                this.floatingDropZonesSetup = true;
            }
        }
    }

    hideFloatingDropPanel() {
        const panel = document.getElementById('floatingDropPanel');
        if (panel) {
            panel.classList.remove('active');
            // Delay hiding to allow for smooth animation
            setTimeout(() => {
                if (!panel.classList.contains('active')) {
                    panel.style.display = 'none';
                }
            }, 300);
        }
    }

    setupFloatingDropZones() {
        const dropZones = document.querySelectorAll('#floatingDropPanel .drop-zone-item');
        
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                zone.classList.add('drag-over');
            });
            
            zone.addEventListener('dragleave', (e) => {
                zone.classList.remove('drag-over');
            });
            
            zone.addEventListener('drop', async (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                
                try {
                    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                    
                    if (dragData.type === 'uitgesteld-taak') {
                        const targetList = zone.dataset.target;
                        await this.handleFloatingDropZoneDrop(dragData, targetList);
                    }
                } catch (error) {
                    console.error('Error processing drop:', error);
                    toast.error('Fout bij verplaatsen van taak');
                }
            });
        });
    }

    async handleFloatingDropZoneDrop(dragData, targetList) {
        const { taakId, bronLijst } = dragData;
        
        await loading.withLoading(async () => {
            try {
                // Use existing API to move task
                const response = await fetch(`/api/taak/${taakId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        lijst: targetList
                    })
                });

                if (response.ok) {
                    // Remove from source list DOM
                    const sourceItem = document.querySelector(`[data-id="${taakId}"]`);
                    if (sourceItem) {
                        sourceItem.remove();
                        
                        // Update source count
                        const sourceHeader = document.querySelector(`[data-category="${bronLijst}"] .taken-count`);
                        if (sourceHeader) {
                            const currentCount = parseInt(sourceHeader.textContent.match(/\d+/)[0]);
                            sourceHeader.textContent = `(${currentCount - 1})`;
                        }
                    }

                    const targetName = targetList === 'inbox' ? 'Inbox' : 'Opvolgen';
                    toast.success(`Taak verplaatst naar ${targetName}`);
                } else {
                    const error = await response.json();
                    toast.error(`Fout bij verplaatsen: ${error.error || 'Onbekende fout'}`);
                }
            } catch (error) {
                console.error('Error moving task:', error);
                toast.error('Fout bij verplaatsen van taak');
            }
        }, {
            operationId: 'floating-drop-move',
            showGlobal: true,
            message: 'Taak verplaatsen...'
        });
    }

    // ===== ACTIES DRAG & DROP SYSTEEM ===== 
    
    // Clean slate: alle complexe acties drag functies verwijderd
    // Nu implementeren we exact dezelfde eenvoudige patterns als het werkende uitgesteld systeem

    setupActiesDragFunctionality() {
        const actiesLijst = document.getElementById('acties-lijst');
        if (!actiesLijst) return;

        // Gebruik hele li elementen als draggable (zoals uitgesteld scherm)
        const taakItems = actiesLijst.querySelectorAll('.taak-item');
        
        taakItems.forEach((li) => {
            // Maak hele li draggable (zoals uitgesteld)
            li.draggable = true;
            
            li.addEventListener('dragstart', (e) => {
                const taakId = li.dataset.id;
                const taakTekst = li.querySelector('.taak-titel').textContent;
                
                // Stel drag data in (exact zoals uitgesteld)
                const dragData = {
                    type: 'actie-taak',
                    taakId: taakId,
                    taakTekst: taakTekst,
                    bronLijst: 'acties'
                };
                e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
                e.dataTransfer.effectAllowed = 'move';

                // Store globally for keyboard handlers
                this.currentDragData = dragData;

                // Visual feedback (exact zoals uitgesteld)
                li.style.opacity = '0.5';
                
                // Toon floating panel (exact zoals uitgesteld)
                this.showActiesFloatingPanel();
            });
            
            li.addEventListener('dragend', (e) => {
                // Reset visual feedback (exact zoals uitgesteld)
                li.style.opacity = '1';

                // Clear global drag data
                this.currentDragData = null;

                // Verberg floating panel (exact zoals uitgesteld)
                this.hideActiesFloatingPanel();
            });
        });
    }

    showActiesFloatingPanel() {
        const panel = document.getElementById('actiesFloatingPanel');
        if (panel) {
            // Update datums dynamisch - dit moet EERST gebeuren om day zones te creëren
            this.updateActiesFloatingPanelDates();

            panel.classList.add('active');
            panel.style.display = 'block';

            // Setup drop zones NADAT day zones zijn gecreëerd - altijd opnieuw uitvoeren
            this.setupActiesFloatingDropZones();
            this.actiesFloatingDropZonesSetup = true;
        }
    }

    updateActiesFloatingPanelDates() {
        // Genereer week dagen voor beide week containers
        this.generateActiesWeekDays();
    }

    generateActiesWeekDays() {
        const huidigeWeekContainer = document.getElementById('actiesHuidigeWeek');
        const volgendeWeekContainer = document.getElementById('actiesVolgendeWeek');
        const derdeWeekContainer = document.getElementById('actiesDerdeWeek');

        if (!huidigeWeekContainer || !volgendeWeekContainer) return;

        // Reset setup flag zodat event listeners opnieuw worden toegevoegd na DOM wijzigingen
        this.actiesFloatingDropZonesSetup = false;

        // Nederlandse weekdag afkortingen
        const weekdagen = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

        // Bereken huidige week (maandag tot zondag)
        const vandaag = new Date();
        const vandaagISO = vandaag.toISOString().split('T')[0]; // Voor vergelijking
        const huidigeWeekStart = new Date(vandaag);
        huidigeWeekStart.setDate(vandaag.getDate() - vandaag.getDay() + 1); // Maandag van deze week

        // Bereken volgende week
        const volgendeWeekStart = new Date(huidigeWeekStart);
        volgendeWeekStart.setDate(huidigeWeekStart.getDate() + 7);

        // Bereken derde week
        const derdeWeekStart = new Date(volgendeWeekStart);
        derdeWeekStart.setDate(volgendeWeekStart.getDate() + 7);

        // Genereer huidige week zones
        huidigeWeekContainer.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const datum = new Date(huidigeWeekStart);
            datum.setDate(huidigeWeekStart.getDate() + i);

            const weekdagIndex = datum.getDay();
            const weekdagAfkorting = weekdagen[weekdagIndex];
            const dagNummer = datum.getDate();
            const isoString = datum.toISOString().split('T')[0];

            const dayZone = document.createElement('div');
            // Voeg current-day klasse toe als dit vandaag is
            const isVandaag = isoString === vandaagISO;
            dayZone.className = isVandaag ? 'week-day-zone drop-zone-item current-day' : 'week-day-zone drop-zone-item';
            dayZone.dataset.target = isoString;
            dayZone.dataset.type = 'planning';
            dayZone.innerHTML = `
                <div class="day-name">${weekdagAfkorting}</div>
                <div class="day-date">${dagNummer}</div>
            `;

            huidigeWeekContainer.appendChild(dayZone);
        }

        // Genereer volgende week zones
        volgendeWeekContainer.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const datum = new Date(volgendeWeekStart);
            datum.setDate(volgendeWeekStart.getDate() + i);

            const weekdagIndex = datum.getDay();
            const weekdagAfkorting = weekdagen[weekdagIndex];
            const dagNummer = datum.getDate();
            const isoString = datum.toISOString().split('T')[0];

            const dayZone = document.createElement('div');
            // Voeg current-day klasse toe als dit vandaag is
            const isVandaag = isoString === vandaagISO;
            dayZone.className = isVandaag ? 'week-day-zone drop-zone-item current-day' : 'week-day-zone drop-zone-item';
            dayZone.dataset.target = isoString;
            dayZone.dataset.type = 'planning';
            dayZone.innerHTML = `
                <div class="day-name">${weekdagAfkorting}</div>
                <div class="day-date">${dagNummer}</div>
            `;

            volgendeWeekContainer.appendChild(dayZone);
        }

        // Genereer derde week zones (Ctrl-toets activated)
        if (derdeWeekContainer) {
            derdeWeekContainer.innerHTML = '';
            for (let i = 0; i < 7; i++) {
                const datum = new Date(derdeWeekStart);
                datum.setDate(derdeWeekStart.getDate() + i);

                const weekdagIndex = datum.getDay();
                const weekdagAfkorting = weekdagen[weekdagIndex];
                const dagNummer = datum.getDate();
                const isoString = datum.toISOString().split('T')[0];

                const dayZone = document.createElement('div');
                // Voeg current-day klasse toe als dit vandaag is
                const isVandaag = isoString === vandaagISO;
                dayZone.className = isVandaag ? 'week-day-zone drop-zone-item current-day' : 'week-day-zone drop-zone-item';
                dayZone.dataset.target = isoString;
                dayZone.dataset.type = 'planning';
                dayZone.innerHTML = `
                    <div class="day-name">${weekdagAfkorting}</div>
                    <div class="day-date">${dagNummer}</div>
                `;

                derdeWeekContainer.appendChild(dayZone);
            }
        }
    }


    toggleDerdeWeek(show) {
        const derdeWeekSection = document.getElementById('actiesDerdeWeekSection');
        if (!derdeWeekSection) return;

        if (show) {
            derdeWeekSection.style.display = 'block';
            // Kleine delay voor smooth CSS transition
            setTimeout(() => {
                derdeWeekSection.classList.add('visible');
            }, 10);
        } else {
            derdeWeekSection.classList.remove('visible');
            // Wacht op transition voordat display: none
            setTimeout(() => {
                if (!derdeWeekSection.classList.contains('visible')) {
                    derdeWeekSection.style.display = 'none';
                }
            }, 200); // Match CSS transition duration
        }
    }


    hideActiesFloatingPanel() {
        const panel = document.getElementById('actiesFloatingPanel');
        if (panel) {
            // Reset Shift status
            this.shiftKeyPressed = false;

            // Verberg derde week sectie
            this.toggleDerdeWeek(false);

            // Fade-out animatie
            panel.classList.remove('active');
            // Wacht op fade-out voordat display: none
            setTimeout(() => {
                if (!panel.classList.contains('active')) {
                    panel.style.display = 'none';
                }
            }, 300); // Zelfde als CSS transition duration
        }
    }

    hideActiesFloatingPanelImmediately() {
        const panel = document.getElementById('actiesFloatingPanel');
        if (panel) {
            // Reset Shift status
            this.shiftKeyPressed = false;

            // Verberg derde week sectie
            const derdeWeekSection = document.getElementById('actiesDerdeWeekSection');
            if (derdeWeekSection) {
                derdeWeekSection.style.display = 'none';
                derdeWeekSection.classList.remove('visible');
            }

            // Onmiddellijk verbergen zonder animatie (voor drop events)
            panel.classList.remove('active');
            panel.style.display = 'none';
        }
    }

    setupActiesFloatingDropZones() {
        const dropZones = document.querySelectorAll('#actiesFloatingPanel .drop-zone-item');

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                zone.classList.add('drag-over');

                // Check Shift status en toggle derde week
                if (e.shiftKey && !this.shiftKeyPressed) {
                    this.shiftKeyPressed = true;
                    this.toggleDerdeWeek(true);
                } else if (!e.shiftKey && this.shiftKeyPressed) {
                    this.shiftKeyPressed = false;
                    this.toggleDerdeWeek(false);
                }
            });
            
            zone.addEventListener('dragleave', (e) => {
                zone.classList.remove('drag-over');
            });
            
            zone.addEventListener('drop', async (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                
                try {
                    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                    
                    if (dragData.type === 'actie-taak') {
                        const dropType = zone.dataset.type;
                        const target = zone.dataset.target;
                        
                        if (dropType === 'planning') {
                            // Week dag - plan voor dagelijkse planning
                            await this.handleActiesFloatingDrop(dragData, target);
                        } else if (dropType === 'list') {
                            // Lijst - verplaats naar lijst
                            await this.handleActiesFloatingListDrop(dragData, target);
                        }
                    }
                } catch (error) {
                    console.error('Error processing drop:', error);
                    toast.error('Fout bij verplaatsen van taak');
                }
            });
        });
    }

    async handleActiesFloatingListDrop(dragData, targetList) {
        const { taakId } = dragData;
        
        await loading.withLoading(async () => {
            try {
                // Verplaats de taak naar de gespecificeerde lijst
                const response = await fetch(`/api/taak/${taakId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        lijst: targetList
                    })
                });

                if (response.ok) {
                    // Remove from acties list DOM
                    const sourceItem = document.querySelector(`[data-id="${taakId}"]`);
                    if (sourceItem) {
                        sourceItem.remove();
                    }
                    
                    // Update local taken array
                    this.taken = this.taken.filter(t => t.id !== taakId);
                    
                    const targetName = this.getListDisplayName(targetList);
                    toast.success(`Taak verplaatst naar ${targetName}`);
                    
                    // Verberg overlay onmiddellijk zonder animatie
                    this.hideActiesFloatingPanelImmediately();
                } else {
                    toast.error('Fout bij verplaatsen naar lijst');
                    // Ook bij fout: verberg overlay onmiddellijk
                    this.hideActiesFloatingPanelImmediately();
                }
            } catch (error) {
                console.error('Error moving task to list:', error);
                toast.error('Fout bij verplaatsen naar lijst');
                // Ook bij exception: verberg overlay onmiddellijk
                this.hideActiesFloatingPanelImmediately();
            }
        });
    }

    async handleActiesListDrop(dragData, targetList) {
        const response = await fetch(`/api/taak/${dragData.taakId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lijst: targetList })
        });

        if (response.ok) {
            this.taken = this.taken.filter(t => t.id !== dragData.taakId);
            this.renderActiesLijst();
            
            const targetName = this.getListDisplayName(targetList);
            toast.success(`Taak verplaatst naar ${targetName}`);
        }
    }

    async handleActiesFloatingDrop(dragData, targetDate) {
        const { taakId } = dragData;
        const taak = this.taken.find(t => t.id === taakId);
        if (!taak) return;
        
        await loading.withLoading(async () => {
            try {
                // Update de taak met nieuwe verschijndatum (zoals stelDatumIn functie)
                const updateData = {
                    lijst: this.huidigeLijst,
                    tekst: taak.tekst,
                    projectId: taak.projectId,
                    contextId: taak.contextId,
                    verschijndatum: targetDate,
                    duur: taak.duur,
                    opmerkingen: taak.opmerkingen,
                    type: taak.type
                };

                // Voeg herhaling velden toe als ze bestaan
                if (taak.herhalingType !== undefined) {
                    updateData.herhalingType = taak.herhalingType;
                }
                if (taak.herhalingActief !== undefined) {
                    updateData.herhalingActief = taak.herhalingActief;
                }

                const response = await fetch(`/api/taak/${taakId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });

                if (response.ok) {
                    // Update lokale taak
                    taak.verschijndatum = targetDate;
                    
                    // Herlaad de lijst met preserved scroll position
                    await this.preserveActionsFilters(() => this.laadHuidigeLijst());
                    
                    // Format datum voor weergave
                    const datumObj = new Date(targetDate);
                    const dagNaam = datumObj.toLocaleDateString('nl-NL', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long' 
                    });
                    
                    toast.success(`Taak gepland voor ${dagNaam}`);
                    
                    // Verberg overlay onmiddellijk zonder animatie
                    this.hideActiesFloatingPanelImmediately();
                    
                    // Als we in dagelijkse planning zijn, refresh de view
                    if (this.huidigeLijst === 'dagelijkse-planning') {
                        await this.laadDagelijksePlanning();
                    }
                } else {
                    toast.error('Fout bij updaten van datum');
                    // Ook bij fout: verberg overlay onmiddellijk
                    this.hideActiesFloatingPanelImmediately();
                }
            } catch (error) {
                console.error('Error updating task date:', error);
                toast.error('Fout bij updaten van datum');
                // Ook bij exception: verberg overlay onmiddellijk
                this.hideActiesFloatingPanelImmediately();
            }
        }, {
            operationId: 'update-datum',
            showGlobal: true,
            message: 'Datum wordt bijgewerkt...'
        });
    }

    async handleActiesPlanningDrop(dragData, datum) {
        const response = await fetch('/api/dagelijkse-planning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                taakId: dragData.taakId,
                datum: datum,
                tijd: '09:00',
                duur: 30,
                type: 'taak'
            })
        });

        if (response.ok) {
            this.taken = this.taken.filter(t => t.id !== dragData.taakId);
            this.renderActiesLijst();
            
            const datumFormatted = new Date(datum).toLocaleDateString('nl-NL');
            toast.success(`Taak gepland voor ${datumFormatted}`);
        }
    }

    getListDisplayName(lijst) {
        const names = {
            'opvolgen': 'Opvolgen',
            'uitgesteld-wekelijks': 'Uitgesteld - Wekelijks',
            'uitgesteld-maandelijks': 'Uitgesteld - Maandelijks',
            'uitgesteld-3maandelijks': 'Uitgesteld - 3-maandelijks',
            'uitgesteld-6maandelijks': 'Uitgesteld - 6-maandelijks',
            'uitgesteld-jaarlijks': 'Uitgesteld - Jaarlijks'
        };
        return names[lijst] || lijst;
    }

    filterPlanningActies() {
        const taakFilter = document.getElementById('planningTaakFilter')?.value.toLowerCase() || '';
        const projectFilter = document.getElementById('planningProjectFilter')?.value || '';
        const contextFilter = document.getElementById('planningContextFilter')?.value || '';
        const prioriteitFilter = document.getElementById('planningPrioriteitFilter')?.value || '';
        const datumFilter = document.getElementById('planningDatumFilter')?.value || '';
        const duurFilter = document.getElementById('planningDuurFilter')?.value || '';

        document.querySelectorAll('.planning-actie-item').forEach(item => {
            const actieId = item.dataset.actieId;
            // Use planningActies instead of this.taken for daily planning context
            const actie = this.planningActies?.find(t => t.id === actieId);
            
            if (!actie) return;
            
            let tonen = true;
            
            if (taakFilter && !actie.tekst.toLowerCase().includes(taakFilter)) tonen = false;
            if (projectFilter && actie.projectId !== projectFilter) tonen = false;
            if (contextFilter && actie.contextId !== contextFilter) tonen = false;
            if (prioriteitFilter && (actie.prioriteit || 'gemiddeld') !== prioriteitFilter) tonen = false;
            
            // Duration filter - show only tasks with duration <= filter value
            if (duurFilter) {
                const maxDuur = parseInt(duurFilter);
                const actieDuur = parseInt(actie.duur) || 0;
                if (actieDuur > maxDuur) tonen = false;
            }
            
            // Date filter logic - same as in actions list
            if (datumFilter && actie.verschijndatum) {
                // Normalize task date to YYYY-MM-DD format for comparison
                let taakDatum = '';
                if (typeof actie.verschijndatum === 'string') {
                    if (actie.verschijndatum.includes('T')) {
                        // ISO format: "2025-06-17T00:00:00.000Z"
                        taakDatum = actie.verschijndatum.split('T')[0];
                    } else if (actie.verschijndatum.includes('/')) {
                        // Dutch format: "17/06/2025" -> "2025-06-17"
                        const parts = actie.verschijndatum.split('/');
                        if (parts.length === 3) {
                            taakDatum = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                        }
                    } else {
                        taakDatum = actie.verschijndatum;
                    }
                }
                
                if (taakDatum !== datumFilter) tonen = false;
            }
            
            item.style.display = tonen ? '' : 'none';
        });
    }

    populatePlanningFilters() {
        // Populate project filter
        const projectFilter = document.getElementById('planningProjectFilter');
        if (projectFilter) {
            // Reset to default option first
            projectFilter.innerHTML = '<option value="">Alle projecten</option>';
            this.projecten.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.naam;
                projectFilter.appendChild(option);
            });
        }
        
        // Populate context filter
        const contextFilter = document.getElementById('planningContextFilter');
        if (contextFilter) {
            // Reset to default option first
            contextFilter.innerHTML = '<option value="">Alle contexten</option>';
            this.contexten.forEach(context => {
                const option = document.createElement('option');
                option.value = context.id;
                option.textContent = context.naam;
                contextFilter.appendChild(option);
            });
        }
    }

    updateTotaalTijd() {
        const uurLabels = document.querySelectorAll('.uur-label');
        let totaalMinuten = 0;
        
        uurLabels.forEach(element => {
            // Extract minutes from labels like "10:00 (70 min <i class="ti ti-alert-triangle"></i>)"
            const match = element.textContent.match(/\((\d+)\s*min/);
            if (match) {
                totaalMinuten += parseInt(match[1]);
            }
        });
        
        const totaalElement = document.getElementById('totaalGeplandeTijd');
        if (totaalElement) {
            const uren = Math.floor(totaalMinuten / 60);
            const minuten = totaalMinuten % 60;
            
            if (uren > 0) {
                totaalElement.textContent = `Totaal: ${uren}u ${minuten}min`;
            } else {
                totaalElement.textContent = `Totaal: ${minuten}min`;
            }
        }
    }

    showClearPlanningModal() {
        const modal = document.getElementById('clearPlanningModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Reset checkboxes to checked
            document.getElementById('clearTaken').checked = true;
            document.getElementById('clearPauzes').checked = true;
            document.getElementById('clearGeblokkeerd').checked = true;
            
            // Bind events
            const cancelBtn = document.getElementById('clearPlanningCancel');
            const confirmBtn = document.getElementById('clearPlanningConfirm');
            
            const closeModal = () => {
                modal.style.display = 'none';
            };
            
            cancelBtn.onclick = closeModal;
            confirmBtn.onclick = () => {
                this.clearPlanning();
                closeModal();
            };
            
            // Close on overlay click
            modal.onclick = (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            };
        }
    }

    async clearPlanning() {
        const clearTaken = document.getElementById('clearTaken').checked;
        const clearPauzes = document.getElementById('clearPauzes').checked;
        const clearGeblokkeerd = document.getElementById('clearGeblokkeerd').checked;
        
        if (!clearTaken && !clearPauzes && !clearGeblokkeerd) {
            toast.warning('Selecteer minstens één optie om te verwijderen');
            return;
        }
        
        // Show loading
        loading.withLoading(async () => {
            const today = new Date().toISOString().split('T')[0];
            const planningResponse = await fetch(`/api/dagelijkse-planning/${today}`);
            const planning = planningResponse.ok ? await planningResponse.json() : [];
            
            // Filter items to delete based on user selection
            const itemsToDelete = planning.filter(item => {
                // Note: database uses 'taak' but we call them 'actie' in the UI
                if ((item.type === 'actie' || item.type === 'taak') && clearTaken) return true;
                if (item.type === 'pauze' && clearPauzes) return true;
                if (item.type === 'geblokkeerd' && clearGeblokkeerd) return true;
                return false;
            });
            
            // Delete each item with fade animation
            for (const item of itemsToDelete) {
                try {
                    const response = await fetch(`/api/dagelijkse-planning/${item.id}`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        // Animate item removal
                        const element = document.querySelector(`[data-planning-id="${item.id}"]`);
                        if (element) {
                            element.style.transition = 'opacity 0.3s ease';
                            element.style.opacity = '0';
                            setTimeout(() => element.remove(), 300);
                        }
                    }
                } catch (error) {
                    console.error('Error deleting planning item:', error);
                }
            }
            
            // Refresh the planning view
            await this.renderTaken();
            
            // Show success message
            const deletedCount = itemsToDelete.length;
            if (deletedCount > 0) {
                toast.success(`${deletedCount} item${deletedCount > 1 ? 's' : ''} verwijderd uit de planning`);
            } else {
                toast.info('Geen items gevonden om te verwijderen');
            }
        }, {
            operationId: 'clear-planning',
            showGlobal: true,
            message: 'Planning leegmaken...'
        });
    }

    // Dagkalender focus mode functionality
    toggleDagkalenderFocus() {
        const dagKalender = document.querySelector('.dag-kalender');
        const focusBtn = document.getElementById('btnFocusMode');
        
        if (!dagKalender || !focusBtn) {
            console.error('Dagkalender of focus button niet gevonden');
            return;
        }
        
        const isFullscreen = dagKalender.classList.contains('dag-kalender-fullscreen');
        
        if (isFullscreen) {
            // Exit focus mode
            this.exitFocusMode(dagKalender, focusBtn);
        } else {
            // Enter focus mode  
            this.enterFocusMode(dagKalender, focusBtn);
        }
    }
    
    enterFocusMode(dagKalender, focusBtn) {
        // Add fullscreen class
        dagKalender.classList.add('dag-kalender-fullscreen');
        
        // Prevent body scroll
        document.body.classList.add('dagkalender-focus-active');
        
        // Update button
        focusBtn.innerHTML = '↙️ Terug';
        focusBtn.className = 'btn-focus-mode btn-exit-focus';
        focusBtn.title = 'Terug naar normale weergave';
        
        // Save focus mode preference
        localStorage.setItem('dagkalender-focus-mode', 'true');
        
        // Show toast notification
        toast.success('Focus modus ingeschakeld - ESC om terug te gaan');
        
        console.log('🎯 Focus modus ingeschakeld');
    }
    
    exitFocusMode(dagKalender, focusBtn) {
        // Remove fullscreen class
        dagKalender.classList.remove('dag-kalender-fullscreen');
        
        // Restore body scroll
        document.body.classList.remove('dagkalender-focus-active');
        
        // Update button
        focusBtn.innerHTML = '📺 Focus';
        focusBtn.className = 'btn-focus-mode';
        focusBtn.title = 'Focus modus - alleen dagplanning tonen';
        
        // Save focus mode preference
        localStorage.setItem('dagkalender-focus-mode', 'false');
        
        console.log('🎯 Focus modus uitgeschakeld');
    }
    
    // Check and restore focus mode from localStorage on page load
    restoreFocusMode() {
        const savedFocusMode = localStorage.getItem('dagkalender-focus-mode');
        if (savedFocusMode === 'true') {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                this.toggleDagkalenderFocus();
            }, 100);
        }
    }

    addCSSDebugger() {
        // Only add once
        if (document.getElementById('css-debugger')) return;
        
        const debugPanel = document.createElement('div');
        debugPanel.id = 'css-debugger';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background: white;
            border: 2px solid #007AFF;
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            font-size: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        debugPanel.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #007AFF;">CSS Layout Debugger</h3>
            <button onclick="document.getElementById('css-debugger').remove()" style="float: right; margin-top: -25px;">×</button>
            
            <div style="margin-bottom: 10px;">
                <label>dagelijkse-planning-layout height:</label><br>
                <input type="range" min="400" max="1000" value="600" 
                       oninput="this.nextElementSibling.textContent=this.value+'px'; document.querySelector('.dagelijkse-planning-layout').style.height=this.value+'px'">
                <span>600px</span>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label>planning-sidebar height:</label><br>
                <input type="range" min="50" max="100" value="100" 
                       oninput="this.nextElementSibling.textContent=this.value+'%'; document.querySelector('.planning-sidebar').style.height=this.value+'%'">
                <span>100%</span>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label>acties-sectie max-height:</label><br>
                <input type="range" min="200" max="800" value="400" 
                       oninput="this.nextElementSibling.textContent=this.value+'px'; document.querySelector('.acties-sectie').style.maxHeight=this.value+'px'">
                <span>400px</span>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label>acties-lijst max-height:</label><br>
                <input type="range" min="100" max="600" value="300" 
                       oninput="this.nextElementSibling.textContent=this.value+'px'; document.querySelector('.acties-lijst').style.maxHeight=this.value+'px'">
                <span>300px</span>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label>tijd-instellingen height:</label><br>
                <input type="range" min="40" max="120" value="80" 
                       oninput="this.nextElementSibling.textContent=this.value+'px'; document.querySelector('.tijd-instellingen').style.height=this.value+'px'">
                <span>80px</span>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label>templates-sectie height:</label><br>
                <input type="range" min="100" max="300" value="200" 
                       oninput="this.nextElementSibling.textContent=this.value+'px'; document.querySelector('.templates-sectie').style.height=this.value+'px'">
                <span>200px</span>
            </div>
            
            <hr style="margin: 15px 0;">
            
            <button onclick="app.resetDebugger()" style="background: #FF3B30; color: white; border: none; padding: 5px 10px; border-radius: 4px; margin-right: 5px;">Reset</button>
            <button onclick="app.copyDebuggerValues()" style="background: #30D158; color: white; border: none; padding: 5px 10px; border-radius: 4px;">Copy Values</button>
            
            <div id="debug-output" style="margin-top: 10px; font-size: 11px; background: #f5f5f5; padding: 5px; border-radius: 4px; display: none;"></div>
        `;
        
        document.body.appendChild(debugPanel);
    }

    resetDebugger() {
        // Reset all sliders and styles
        const debugPanel = document.getElementById('css-debugger');
        const sliders = debugPanel.querySelectorAll('input[type="range"]');
        
        sliders.forEach(slider => {
            slider.value = slider.getAttribute('value'); // Reset to default
            slider.oninput({target: slider}); // Trigger change
        });
        
        // Remove any inline styles
        document.querySelector('.dagelijkse-planning-layout').style.height = '';
        document.querySelector('.planning-sidebar').style.height = '';
        document.querySelector('.acties-sectie').style.maxHeight = '';
        document.querySelector('.acties-lijst').style.maxHeight = '';
        document.querySelector('.tijd-instellingen').style.height = '';
        document.querySelector('.templates-sectie').style.height = '';
    }

    copyDebuggerValues() {
        const debugPanel = document.getElementById('css-debugger');
        const sliders = debugPanel.querySelectorAll('input[type="range"]');
        const output = document.getElementById('debug-output');
        
        let values = 'CSS Values:\n';
        sliders.forEach(slider => {
            const label = slider.previousElementSibling.textContent;
            const value = slider.nextElementSibling.textContent;
            values += `${label} ${value}\n`;
        });
        
        output.style.display = 'block';
        output.textContent = values;
        
        // Copy to clipboard
        navigator.clipboard.writeText(values).then(() => {
            output.textContent += '\n<i class="fas fa-check"></i> Copied to clipboard!';
        });
    }

    // Bulk mode functionality
    toggleBulkModus() {
        this.bulkModus = !this.bulkModus;
        this.geselecteerdeTaken.clear();
        
        const actiesContainer = document.querySelector('.main-content');
        const bulkToolbar = document.getElementById('bulk-toolbar');
        const toggleButton = document.getElementById('bulk-mode-toggle');
        
        if (this.bulkModus) {
            actiesContainer.classList.add('bulk-modus');
            bulkToolbar.style.display = 'block';
            toggleButton.textContent = 'Bulk modus actief (Annuleren)';
            toggleButton.classList.add('active');
        } else {
            actiesContainer.classList.remove('bulk-modus');
            bulkToolbar.style.display = 'none';
            toggleButton.textContent = 'Bulk bewerken';
            toggleButton.classList.remove('active');
        }
        
        this.renderActiesLijst();
    }

    toggleTaakSelectie(taakId) {
        if (this.geselecteerdeTaken.has(taakId)) {
            this.geselecteerdeTaken.delete(taakId);
        } else {
            this.geselecteerdeTaken.add(taakId);
        }
        
        // Update visual selection
        const taakElement = document.querySelector(`[data-id="${taakId}"]`);
        if (taakElement) {
            const selectieCircle = taakElement.querySelector('.selectie-circle');
            if (selectieCircle) {
                selectieCircle.classList.toggle('geselecteerd', this.geselecteerdeTaken.has(taakId));
            }
        }
        
        // Update bulk toolbar count
        this.updateBulkToolbar();
    }

    selecteerAlleTaken() {
        const alleTaken = document.querySelectorAll('.actie-item[data-id]');
        alleTaken.forEach(item => {
            const taakId = item.dataset.id;
            this.geselecteerdeTaken.add(taakId);
            const selectieCircle = item.querySelector('.selectie-circle');
            if (selectieCircle) {
                selectieCircle.classList.add('geselecteerd');
            }
        });
        this.updateBulkToolbar();
    }

    deselecteerAlleTaken() {
        this.geselecteerdeTaken.clear();
        document.querySelectorAll('.selectie-circle.geselecteerd').forEach(circle => {
            circle.classList.remove('geselecteerd');
        });
        this.updateBulkToolbar();
    }

    updateBulkToolbar() {
        const countElement = document.getElementById('bulk-selection-count');
        const actionButtons = document.querySelectorAll('#bulk-toolbar .bulk-action-button');
        
        if (countElement) {
            const count = this.geselecteerdeTaken.size;
            countElement.textContent = count;
            
            // Enable/disable action buttons based on selection
            actionButtons.forEach(button => {
                button.disabled = count === 0;
            });
        }
    }

    async bulkDateAction(action) {
        if (this.geselecteerdeTaken.size === 0) {
            toast.warning('Selecteer eerst een of meer taken.');
            return;
        }

        const selectedIds = Array.from(this.geselecteerdeTaken);
        const totalTasks = selectedIds.length;

        // Show loading indicator with progress
        loading.showWithProgress('Datum aanpassen taak', 0, totalTasks);

        try {
            let newDate;
            const today = new Date();

            // Handle numeric offset (0=vandaag, 1=morgen, 2+=weekdagen)
            if (typeof action === 'number') {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + action);
                newDate = targetDate.toISOString().split('T')[0];
            } else {
                // Handle legacy string actions
                switch (action) {
                    case 'vandaag':
                        newDate = today.toISOString().split('T')[0];
                        break;
                    case 'morgen':
                        const morgen = new Date(today);
                        morgen.setDate(today.getDate() + 1);
                        newDate = morgen.toISOString().split('T')[0];
                        break;
                    case 'plus3':
                        const plus3 = new Date(today);
                        plus3.setDate(today.getDate() + 3);
                        newDate = plus3.toISOString().split('T')[0];
                        break;
                    case 'week':
                        const week = new Date(today);
                        week.setDate(today.getDate() + 7);
                        newDate = week.toISOString().split('T')[0];
                        break;
                    default:
                        console.error('Onbekende bulk actie:', action);
                        return;
                }
            }

            // Process selected tasks
            let successCount = 0;
            let currentTask = 0;
            
            for (const taakId of selectedIds) {
                currentTask++;
                // Update progress before processing
                loading.updateProgress('Datum aanpassen taak', currentTask, totalTasks);
                
                try {
                    const response = await fetch(`/api/taak/${taakId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ verschijndatum: newDate })
                    });
                    
                    if (response.ok) {
                        successCount++;
                    }
                } catch (error) {
                    console.error('Fout bij bulk update:', error);
                }
            }
            
            // Show finishing message
            loading.show('Afronden...');
            
            toast.success(`${successCount} taken bijgewerkt naar ${newDate}`);

            // Set flag if bulk update cleared inbox
            if (this.huidigeLijst === 'inbox' && successCount > 0) {
                this.lastActionWasPlanning = true;
            }

            // Reset bulk mode and reload with preserved scroll position
            this.toggleBulkModus();
            await this.preserveActionsFilters(() => this.laadHuidigeLijst());
            
        } finally {
            loading.hide();
        }
    }

    getBulkVerplaatsKnoppen() {
        // Use the same logic as individual task dropdown menus
        if (this.huidigeLijst === 'acties') {
            // For actions list: show dagens datum opties + weekdagen + uitgesteld opties
            const weekdagenHTML = this.getWeekdagKnoppen(0, (i) =>
                `onclick="window.bulkDateAction(${i})"`, 'bulk-action-btn'
            );

            return `
                <button onclick="window.bulkDateAction(0)" class="bulk-action-btn">Vandaag</button>
                <button onclick="window.bulkDateAction(1)" class="bulk-action-btn">Morgen</button>
                ${weekdagenHTML}
                <button onclick="window.bulkVerplaatsNaar('opvolgen')" class="bulk-action-btn">Opvolgen</button>
                <button onclick="window.bulkVerplaatsNaar('uitgesteld-wekelijks')" class="bulk-action-btn">Wekelijks</button>
                <button onclick="window.bulkVerplaatsNaar('uitgesteld-maandelijks')" class="bulk-action-btn">Maandelijks</button>
                <button onclick="window.bulkVerplaatsNaar('uitgesteld-3maandelijks')" class="bulk-action-btn">3-maandelijks</button>
                <button onclick="window.bulkVerplaatsNaar('uitgesteld-6maandelijks')" class="bulk-action-btn">6-maandelijks</button>
                <button onclick="window.bulkVerplaatsNaar('uitgesteld-jaarlijks')" class="bulk-action-btn">Jaarlijks</button>
            `;
        } else if (this.isUitgesteldLijst(this.huidigeLijst)) {
            // For uitgesteld lists: show options to move back to main lists
            const alleOpties = [
                { key: 'inbox', label: 'Inbox' },
                { key: 'acties', label: 'Acties' },
                { key: 'opvolgen', label: 'Opvolgen' },
                { key: 'uitgesteld-wekelijks', label: 'Wekelijks' },
                { key: 'uitgesteld-maandelijks', label: 'Maandelijks' },
                { key: 'uitgesteld-3maandelijks', label: '3-maandelijks' },
                { key: 'uitgesteld-6maandelijks', label: '6-maandelijks' },
                { key: 'uitgesteld-jaarlijks', label: 'Jaarlijks' }
            ];

            return alleOpties
                .filter(optie => optie.key !== this.huidigeLijst)
                .map(optie => `<button onclick="window.bulkVerplaatsNaar('${optie.key}')" class="bulk-action-btn">${optie.label}</button>`)
                .join('');
        } else {
            // For other lists: show basic move options
            const alleOpties = [
                { key: 'acties', label: 'Acties' },
                { key: 'opvolgen', label: 'Opvolgen' },
                { key: 'uitgesteld-wekelijks', label: 'Wekelijks' },
                { key: 'uitgesteld-maandelijks', label: 'Maandelijks' },
                { key: 'uitgesteld-3maandelijks', label: '3-maandelijks' },
                { key: 'uitgesteld-6maandelijks', label: '6-maandelijks' },
                { key: 'uitgesteld-jaarlijks', label: 'Jaarlijks' }
            ];

            return alleOpties
                .filter(optie => optie.key !== this.huidigeLijst)
                .map(optie => `<button onclick="window.bulkVerplaatsNaar('${optie.key}')" class="bulk-action-btn">${optie.label}</button>`)
                .join('');
        }
    }


    async bulkVerplaatsNaar(lijstNaam) {
        if (this.geselecteerdeTaken.size === 0) {
            toast.warning('Selecteer eerst een of meer taken.');
            return;
        }

        // Close dropdown
        const dropdown = document.getElementById('bulk-uitgesteld-dropdown');
        if (dropdown) dropdown.remove();

        const selectedIds = Array.from(this.geselecteerdeTaken);
        const totalTasks = selectedIds.length;

        // Show loading indicator with progress
        loading.showWithProgress('Verplaatsen taak', 0, totalTasks);

        try {
            let successCount = 0;
            let currentTask = 0;
            
            for (const taakId of selectedIds) {
                currentTask++;
                // Update progress before processing
                loading.updateProgress('Verplaatsen taak', currentTask, totalTasks);
                
                try {
                    const response = await fetch(`/api/taak/${taakId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ lijst: lijstNaam })
                    });
                    
                    if (response.ok) {
                        successCount++;
                    }
                } catch (error) {
                    console.error('Fout bij bulk uitstellen:', error);
                }
            }
            
            const lijstLabels = {
                'inbox': 'Inbox',
                'acties': 'Acties',
                'opvolgen': 'Opvolgen',
                'uitgesteld-wekelijks': 'Wekelijks',
                'uitgesteld-maandelijks': 'Maandelijks',
                'uitgesteld-3maandelijks': '3-maandelijks',
                'uitgesteld-6maandelijks': '6-maandelijks',
                'uitgesteld-jaarlijks': 'Jaarlijks'
            };
            
            // Show finishing message
            loading.show('Afronden...');
            
            toast.success(`${successCount} taken verplaatst naar ${lijstLabels[lijstNaam]}`);
            
            // Reset bulk mode and reload with preserved scroll position
            this.toggleBulkModus();
            await this.preserveActionsFilters(() => this.laadHuidigeLijst());
            
        } finally {
            loading.hide();
        }
    }
}

// Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.betaCheckInterval = null;
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Login modal
        const loginBtn = document.getElementById('btn-login');
        const loginModal = document.getElementById('loginModal');
        const loginForm = document.getElementById('loginForm');
        const loginCancel = document.getElementById('loginCancel');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }
        if (loginCancel) {
            loginCancel.addEventListener('click', () => this.hideLoginModal());
        }
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register modal
        const registerBtn = document.getElementById('btn-register');
        const registerModal = document.getElementById('registerModal');
        const registerForm = document.getElementById('registerForm');
        const registerCancel = document.getElementById('registerCancel');

        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.showRegisterModal());
        }
        if (registerCancel) {
            registerCancel.addEventListener('click', () => this.hideRegisterModal());
        }
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Close modals on outside click
        [loginModal, registerModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.hideLoginModal();
                        this.hideRegisterModal();
                    }
                });
            }
        });
    }

    showLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'flex';
            // Focus op email veld, of wachtwoord veld als email al ingevuld is
            const emailField = document.getElementById('loginEmail');
            const passwordField = document.getElementById('loginPassword');
            
            if (emailField && passwordField) {
                if (emailField.value.trim()) {
                    passwordField.focus();
                } else {
                    emailField.focus();
                }
            }
        }
    }

    hideLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('loginForm').reset();
        }
    }

    showRegisterModal() {
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('registerName').focus();
        }
    }

    hideRegisterModal() {
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('registerForm').reset();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            toast.warning('Voer email en wachtwoord in.');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, wachtwoord: password })
            });

            const data = await response.json();

            if (response.ok) {
                // Check if upgrade is required (beta period ended)
                if (data.requiresUpgrade) {
                    // Redirect to beta expired page
                    window.location.href = '/beta-expired';
                    return;
                }

                this.currentUser = data.user;
                this.isAuthenticated = true;
                this.updateUI();
                this.hideLoginModal();

                toast.success(`Welkom terug, ${data.user.naam}!`);

                // Check auth status immediately after login (includes beta access check)
                await this.checkAuthStatus();

                // Load user-specific data (only if still authenticated after checkAuthStatus)
                if (this.isAuthenticated && app) {
                    await app.loadUserData();
                }
            } else {
                toast.error(data.error || 'Inloggen mislukt. Controleer je gegevens.');
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Er ging iets mis bij het inloggen. Probeer opnieuw.');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const naam = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

        if (!naam || !email || !password || !passwordConfirm) {
            toast.warning('Vul alle velden in.');
            return;
        }

        if (password !== passwordConfirm) {
            toast.warning('Wachtwoorden komen niet overeen.');
            return;
        }

        if (password.length < 6) {
            toast.warning('Wachtwoord moet minimaal 6 karakters lang zijn.');
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ naam, email, wachtwoord: password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                this.isAuthenticated = true;
                this.updateUI();
                this.hideRegisterModal();
                
                toast.success(`Account aangemaakt! Welkom ${data.user.naam}!`);
                
                // Load user-specific data
                if (app) {
                    await app.loadUserData();
                }
            } else {
                toast.error(data.error || 'Registratie mislukt. Probeer opnieuw.');
            }
        } catch (error) {
            console.error('Register error:', error);
            toast.error('Er ging iets mis bij het registreren. Probeer opnieuw.');
        }
    }

    async handleLogout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });

            if (response.ok) {
                this.currentUser = null;
                this.isAuthenticated = false;
                
                // Stop beta check interval to prevent memory leaks
                this.stopBetaCheckInterval();
                
                this.updateUI();
                
                toast.info('Je bent uitgelogd.');
                
                // Clear data and reload UI for guest mode
                if (app) {
                    app.taken = [];
                    app.projecten = [];
                    app.contexten = [];
                    await app.laadHuidigeLijst();
                    await app.laadTellingen();
                }
            } else {
                toast.error('Uitloggen mislukt. Probeer opnieuw.');
            }
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Er ging iets mis bij het uitloggen.');
        }
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/me');

            if (response.ok) {
                const data = await response.json();

                // Check if upgrade is required (beta period ended)
                if (data.requiresUpgrade) {
                    // Redirect to beta expired page
                    window.location.href = '/beta-expired';
                    return;
                }

                this.currentUser = data.user;
                this.isAuthenticated = true;

                // Check beta period access (legacy check, kept for safety)
                if (!data.hasAccess) {
                    this.showUpgradeMessage(data.accessMessage);
                    this.isAuthenticated = false; // Treat as not authenticated for UI purposes

                    // Clear data
                    if (app) {
                        app.taken = [];
                        app.renderTaken();
                    }

                    // Hide loading indicator
                    if (window.loading) {
                        loading.hideGlobal();
                    }

                    this.updateUI();
                    return;
                }
                
                // Load user-specific data
                if (app) {
                    await app.loadUserData();
                }
            } else {
                this.currentUser = null;
                this.isAuthenticated = false;
                
                // Clear data for unauthenticated state
                if (app) {
                    app.taken = [];
                    app.renderTaken();
                    
                    // Load basic UI for mobile devices without authentication
                    if (app.isMobileDevice()) {
                        app.loadBasicMobileUI();
                    }
                }
                
                // Hide loading indicator for unauthenticated users
                if (window.loading) {
                    loading.hideGlobal();
                }
            }
            
            this.updateUI();
        } catch (error) {
            console.error('Auth check error:', error);
            this.currentUser = null;
            this.isAuthenticated = false;
            
            // Hide loading indicator on error
            if (window.loading) {
                loading.hideGlobal();
            }
            
            this.updateUI();
        }
    }

    showUpgradeMessage(message) {
        // Show upgrade message in a prominent way
        if (window.toast) {
            toast.error(message);
        } else {
            alert(message);
        }

        // Redirect to subscription page with beta source parameter
        console.log('Redirecting to subscription page due to beta expiry');
        setTimeout(() => {
            window.location.href = '/subscription.html?source=beta';
        }, 2000); // 2 second delay to show the message first
    }

    startBetaCheckInterval() {
        // Clear any existing interval first
        this.stopBetaCheckInterval();
        
        // Check elke 60 minuten (3600000 ms)
        this.betaCheckInterval = setInterval(() => {
            if (this.isAuthenticated) {
                console.log('🕐 Periodieke beta controle uitgevoerd');
                this.checkAuthStatus();
            }
        }, 3600000); // 1 hour
        
        console.log('✅ Beta controle interval gestart (elk uur)');
    }

    stopBetaCheckInterval() {
        if (this.betaCheckInterval) {
            clearInterval(this.betaCheckInterval);
            this.betaCheckInterval = null;
            console.log('⏹️ Beta controle interval gestopt');
        }
    }

    async updateUI() {
        const authButtons = document.getElementById('auth-buttons');
        const userInfo = document.getElementById('user-info');
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        const userImportEmail = document.getElementById('user-import-email');
        const importEmailLink = document.getElementById('import-email-link');
        const btnCopyImport = document.getElementById('btn-copy-import');
        
        // Get app content elements
        const sidebarContent = document.querySelector('.sidebar-content');
        const mainContent = document.querySelector('.main-content');
        const sidebarSearch = document.querySelector('.sidebar-search');
        const welcomeMessage = document.getElementById('welcome-message');

        if (this.isAuthenticated && this.currentUser) {
            // Authenticated state - show full app
            this.startBetaCheckInterval();
            
            if (authButtons) authButtons.style.display = 'none';
            if (userInfo) userInfo.style.display = 'flex';
            if (userName) userName.textContent = this.currentUser.naam;
            if (userEmail) userEmail.textContent = this.currentUser.email;
            
            // Load full user info including import code
            await this.loadUserImportInfo();
            
            // Show app content, hide welcome
            if (sidebarContent) sidebarContent.style.display = 'block';
            if (mainContent) mainContent.style.display = 'block';
            if (sidebarSearch) sidebarSearch.style.display = 'block';
            if (welcomeMessage) welcomeMessage.style.display = 'none';
            
            // Show menu items for authenticated users
            const lijstSecties = document.querySelectorAll('.lijst-sectie');
            lijstSecties.forEach(sectie => {
                sectie.style.display = 'block';
            });
            
            // Enable task controls for authenticated users
            this.updateTaskControls(true);
            
        } else {
            // Unauthenticated state - show welcome message and login/register
            this.stopBetaCheckInterval();
            
            if (authButtons) authButtons.style.display = 'flex';
            if (userInfo) userInfo.style.display = 'none';
            if (userImportEmail) userImportEmail.style.display = 'none';
            
            // For mobile devices, keep main content visible for basic UI
            if (app && app.isMobileDevice()) {
                // Mobile: Show sidebar and main content for basic UI
                if (sidebarContent) sidebarContent.style.display = 'block';
                if (mainContent) mainContent.style.display = 'block';
                if (sidebarSearch) sidebarSearch.style.display = 'none';
                if (welcomeMessage) welcomeMessage.style.display = 'block';
                
                // Hide menu items for unauthenticated mobile users
                const lijstSecties = document.querySelectorAll('.lijst-sectie');
                lijstSecties.forEach(sectie => {
                    sectie.style.display = 'none';
                });
                
                // Disable task controls for unauthenticated users
                this.updateTaskControls(false);
                
                // Automatically open sidebar for unauthenticated mobile users
                setTimeout(() => {
                    const sidebar = document.querySelector('.sidebar');
                    const overlay = document.querySelector('.sidebar-overlay');
                    const hamburgerMenu = document.getElementById('hamburger-menu');
                    
                    if (sidebar && !sidebar.classList.contains('sidebar-open')) {
                        sidebar.classList.add('sidebar-open');
                        if (overlay) overlay.classList.add('active');
                        if (hamburgerMenu) hamburgerMenu.classList.add('active');
                        document.body.style.overflow = 'hidden';
                        console.log('📱 Sidebar automatically opened for unauthenticated user');
                    }
                }, 100); // Small delay to ensure DOM is ready
                
            } else {
                // Desktop: Hide app content, show welcome
                if (sidebarContent) sidebarContent.style.display = 'none';
                if (mainContent) mainContent.style.display = 'none';
                if (sidebarSearch) sidebarSearch.style.display = 'none';
                if (welcomeMessage) welcomeMessage.style.display = 'block';
            }
        }
    }

    updateTaskControls(isAuthenticated) {
        const taakInput = document.getElementById('taakInput');
        const toevoegBtn = document.getElementById('toevoegBtn');
        const taakInputContainer = document.getElementById('taak-input-container');
        const pageTitle = document.getElementById('page-title');
        
        if (isAuthenticated) {
            // Show task input container for authenticated users
            if (taakInputContainer) taakInputContainer.style.display = 'flex';
            
            // Show page title for authenticated users
            if (pageTitle) {
                pageTitle.style.display = 'block';
                // Set appropriate title based on current list
                if (!pageTitle.textContent || pageTitle.textContent === '') {
                    pageTitle.textContent = this.huidigeLijst || 'Inbox';
                }
            }
            
            if (taakInput) {
                taakInput.disabled = false;
                taakInput.placeholder = 'Nieuwe taak...';
            }
            
            if (toevoegBtn) {
                toevoegBtn.disabled = false;
            }
        } else {
            // Hide task input container for unauthenticated users
            if (taakInputContainer) taakInputContainer.style.display = 'none';
            
            // Hide page title for unauthenticated users
            if (pageTitle) {
                pageTitle.style.display = 'none';
            }
            
            if (taakInput) {
                taakInput.disabled = true;
                taakInput.placeholder = 'Log in om taken toe te voegen...';
            }
            
            if (toevoegBtn) {
                toevoegBtn.disabled = true;
            }
        }
    }

    async loadUserImportInfo() {
        try {
            const response = await fetch('/api/user/info', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                    // Update user info elements
                    const userImportEmail = document.getElementById('user-import-email');
                    const importEmailLink = document.getElementById('import-email-link');
                    const btnCopyImport = document.getElementById('btn-copy-import');

                    if (userImportEmail && importEmailLink && data.user.importEmail) {
                        userImportEmail.style.display = 'block';
                        importEmailLink.textContent = data.user.importEmail;
                        importEmailLink.href = `mailto:${data.user.importEmail}`;
                        
                        // Ensure mailto link works correctly
                        importEmailLink.onclick = (e) => {
                            // Don't prevent default - let the browser handle the mailto link
                            console.log('🔗 Import email link clicked:', importEmailLink.href);
                            console.log('📍 Autorefresh interval status BEFORE email click:', !!(app && app.autoRefreshInterval));
                            console.log('📍 Current list:', app ? app.huidigeLijst : 'no app instance');
                            console.log('📍 Logged in status:', app ? app.isLoggedIn() : 'no app instance');
                            
                            // Check interval status after a short delay
                            setTimeout(() => {
                                console.log('📍 Autorefresh interval status AFTER email click (1s delay):', !!(app && app.autoRefreshInterval));
                                
                                // Force restart autorefresh for inbox after email click (browser focus loss can break intervals)
                                if (app && app.huidigeLijst === 'inbox') {
                                    console.log('🔄 FIXING: Force restarting autorefresh after email click to prevent focus loss issues');
                                    app.handleInboxAutoRefresh();
                                }
                            }, 1000);
                        };
                        
                        // Add copy functionality
                        if (btnCopyImport) {
                            btnCopyImport.onclick = () => {
                                console.log('📋 Copy button clicked for import email');
                                console.log('📍 Autorefresh interval status BEFORE copy:', !!(app && app.autoRefreshInterval));
                                console.log('📍 Current list:', app ? app.huidigeLijst : 'no app instance');
                                console.log('📍 Logged in status:', app ? app.isLoggedIn() : 'no app instance');
                                
                                this.copyToClipboard(data.user.importEmail);
                                
                                // Check interval status after copy
                                setTimeout(() => {
                                    console.log('📍 Autorefresh interval status AFTER copy (1s delay):', !!(app && app.autoRefreshInterval));
                                    
                                    // Force restart autorefresh for inbox after copy click (clipboard operations can affect focus)
                                    if (app && app.huidigeLijst === 'inbox') {
                                        console.log('🔄 FIXING: Force restarting autorefresh after copy click to ensure reliability');
                                        app.handleInboxAutoRefresh();
                                    }
                                }, 1000);
                            };
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error loading user import info:', error);
        }
    }

    copyToClipboard(text) {
        // Use modern clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                toast.success('Import email gekopieerd naar clipboard!');
            }).catch(err => {
                console.error('Failed to copy to clipboard:', err);
                this.fallbackCopyToClipboard(text);
            });
        } else {
            this.fallbackCopyToClipboard(text);
        }
    }

    fallbackCopyToClipboard(text) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            toast.success('Import email gekopieerd naar clipboard!');
        } catch (err) {
            console.error('Fallback copy failed:', err);
            toast.error('Kopiëren naar clipboard mislukt');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    getCurrentUserId() {
        return this.isAuthenticated && this.currentUser ? this.currentUser.id : null;
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }

}

// Update Manager Class
class UpdateManager {
    constructor() {
        this.currentVersion = null;
        this.pollInterval = null;
        this.isPolling = false;
        this.hasUnsavedChanges = false;
        this.updateAvailable = false;
        this.newVersion = null;
        
        this.init();
    }
    
    async init() {
        // Load initial version
        await this.loadCurrentVersion();
        
        // Start polling after 30 seconds
        setTimeout(() => {
            this.startVersionPolling();
        }, 30000);
        
        // Track unsaved changes
        this.setupChangeTracking();
    }
    
    async loadCurrentVersion() {
        try {
            const response = await fetch('/api/version');
            const data = await response.json();
            this.currentVersion = data.version;
            
            // Update UI
            const versionElement = document.getElementById('version-number');
            if (versionElement && data.version) {
                versionElement.textContent = `v${data.version}`;
            }
            
            return data.version;
        } catch (error) {
            console.log('Could not load version number:', error);
            return null;
        }
    }
    
    startVersionPolling() {
        if (this.isPolling) return;
        
        this.isPolling = true;
        this.pollInterval = setInterval(async () => {
            await this.checkForUpdates();
        }, 30000); // Check every 30 seconds
        
        console.log('Update polling started');
    }
    
    stopVersionPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
            this.isPolling = false;
            console.log('Update polling stopped');
        }
    }
    
    async checkForUpdates() {
        try {
            const response = await fetch('/api/version');
            const data = await response.json();
            
            console.log('Update check:', {
                currentVersion: this.currentVersion,
                serverVersion: data.version,
                updateAvailable: data.version !== this.currentVersion
            });
            
            if (data.version && data.version !== this.currentVersion) {
                this.newVersion = data.version;
                this.updateAvailable = true;
                console.log('Update detected! Showing notification for version:', data.version);
                this.showUpdateNotification();
            }
        } catch (error) {
            console.log('Version check failed:', error);
        }
    }
    
    setupChangeTracking() {
        // Track form inputs and editable content
        let changeTimeout;
        
        const trackChanges = () => {
            this.hasUnsavedChanges = true;
            this.updateVersionIndicator();
            
            // Reset after 10 seconds of no activity
            clearTimeout(changeTimeout);
            changeTimeout = setTimeout(() => {
                this.hasUnsavedChanges = false;
                this.updateVersionIndicator();
            }, 10000);
        };
        
        // Monitor various input types
        document.addEventListener('input', trackChanges);
        document.addEventListener('change', trackChanges);
        
        // Reset on successful API calls (save operations)
        const originalFetch = window.fetch.bind(window);
        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            
            if (response.ok && args[0].includes('/api/') && 
                (args[1]?.method === 'POST' || args[1]?.method === 'PUT')) {
                this.hasUnsavedChanges = false;
                this.updateVersionIndicator();
            }
            
            return response;
        };
    }
    
    showUpdateNotification() {
        // Only show if no unsaved changes
        if (this.hasUnsavedChanges) {
            console.log('Update available but user has unsaved changes');
            this.updateVersionIndicator();
            return;
        }
        
        // Show toast notification
        this.showUpdateToast();
        this.updateVersionIndicator();
    }
    
    showUpdateToast() {
        // Remove existing update toast if any
        const existingToast = document.querySelector('.update-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'update-toast';
        toast.innerHTML = `
            <div class="update-toast-content">
                <div class="update-toast-icon">✨</div>
                <div class="update-toast-text">
                    <div class="update-toast-title">Nieuwe versie beschikbaar</div>
                    <div class="update-toast-subtitle">v${this.newVersion} is klaar om te laden</div>
                    <div class="update-toast-changelog">
                        <a href="/changelog.html" target="_blank" class="changelog-link"><i class="fas fa-clipboard"></i> Bekijk wat er nieuw is</a>
                    </div>
                </div>
                <div class="update-toast-actions">
                    <button class="update-btn-refresh" onclick="updateManager.refreshApp()">Nu verversen</button>
                    <button class="update-btn-later" onclick="updateManager.dismissUpdate()">Later</button>
                </div>
                <button class="update-toast-close" onclick="updateManager.dismissUpdate()">×</button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Auto-dismiss after 15 seconds
        setTimeout(() => {
            this.dismissUpdate();
        }, 15000);
    }
    
    updateVersionIndicator() {
        const versionElement = document.getElementById('version-number');
        if (!versionElement) return;
        
        if (this.updateAvailable && this.hasUnsavedChanges) {
            // Update available but user has unsaved changes
            versionElement.classList.add('update-pending');
            versionElement.title = 'Update beschikbaar - sla je werk eerst op';
        } else if (this.updateAvailable) {
            // Update available and safe to refresh
            versionElement.classList.add('update-available');
            versionElement.title = 'Klik om te vernieuwen naar v' + this.newVersion;
            versionElement.onclick = () => this.refreshApp();
        } else {
            // No update or normal state
            versionElement.classList.remove('update-available', 'update-pending');
            versionElement.title = '';
            versionElement.onclick = null;
        }
    }
    
    refreshApp() {
        // Final safety check
        if (this.hasUnsavedChanges) {
            if (!confirm('Je hebt mogelijk onopgeslagen wijzigingen. Weet je zeker dat je wilt vernieuwen?')) {
                return;
            }
        }
        
        // Show loading indicator
        if (window.loading) {
            loading.showGlobal('App wordt bijgewerkt...');
        }
        
        // Refresh the page
        window.location.reload();
    }
    
    dismissUpdate() {
        const toast = document.querySelector('.update-toast');
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }
}

// Load version number on page load (legacy function for compatibility)
async function loadVersionNumber() {
    // This is now handled by UpdateManager
    return;
}

// Show loading indicator immediately on app startup
if (window.loading) {
    loading.showGlobal('App wordt geladen...');
}

// Initialize authentication first, then app
const auth = new AuthManager();
const app = new Taakbeheer();
const updateManager = new UpdateManager();

// Make app available globally for onclick handlers
window.app = app;

// Expose bulk functions to window
window.toggleBulkModus = function() {
    if (app && app.toggleBulkModus) {
        app.toggleBulkModus();
    } else {
        console.error('App not initialized or toggleBulkModus not found');
    }
};

window.toggleTaakSelectie = function(taakId) {
    if (app && app.toggleTaakSelectie) {
        app.toggleTaakSelectie(taakId);
    }
};

window.selecteerAlleTaken = function() {
    if (app && app.selecteerAlleTaken) {
        app.selecteerAlleTaken();
    }
};

window.deselecteerAlleTaken = function() {
    if (app && app.deselecteerAlleTaken) {
        app.deselecteerAlleTaken();
    }
};

window.bulkDateAction = function(action) {
    if (app && app.bulkDateAction) {
        app.bulkDateAction(action);
    }
};


window.bulkVerplaatsNaar = function(lijstNaam) {
    if (app && app.bulkVerplaatsNaar) {
        app.bulkVerplaatsNaar(lijstNaam);
    }
};

// Initialize mobile sidebar after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app.initializeMobileSidebar();
    
    // Fallback for mobile devices without authentication
    if (app && app.isMobileDevice()) {
        setTimeout(() => {
            const mainHeader = document.querySelector('.main-header');
            const mainContent = document.querySelector('.main-content');
            
            // If no main header exists and main content is empty, load basic mobile UI
            if (!mainHeader && (!mainContent || mainContent.innerHTML.trim() === '')) {
                console.log('📱 Fallback: Loading basic mobile UI after timeout');
                app.loadBasicMobileUI();
            }
        }, 1000); // Wait 1 second for authentication to complete
    }
});

// Clean up intervals when page unloads
window.addEventListener('beforeunload', () => {
    if (app.autoRefreshInterval) {
        clearInterval(app.autoRefreshInterval);
    }
});

// Global CSS debugger function
window.showCSSDebugger = function() {
    if (app && app.addCSSDebugger) {
        app.addCSSDebugger();
    }
};

// Quick Add Modal System
class QuickAddModal {
    constructor() {
        this.modal = document.getElementById('quickAddModal');
        this.input = document.getElementById('quickAddInput');
        this.cancelBtn = document.getElementById('quickAddCancel');
        this.okBtn = document.getElementById('quickAddOk');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Button events
        this.cancelBtn.addEventListener('click', () => this.hide());
        this.okBtn.addEventListener('click', () => this.handleSubmit());
        
        // Keyboard events
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleSubmit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.hide();
            }
        });
        
        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }
    
    show() {
        this.modal.style.display = 'flex';
        this.input.value = '';
        
        // Use setTimeout to ensure modal is fully rendered before focusing
        setTimeout(() => {
            this.input.focus();
            this.input.select(); // Also select any existing text
        }, 10);
        
        // Add to body to handle keyboard events
        document.body.appendChild(this.modal);
    }
    
    hide() {
        this.modal.style.display = 'none';
        this.input.value = '';
    }
    
    async handleSubmit() {
        const taakNaam = this.input.value.trim();
        
        if (!taakNaam) {
            toast.warning('Voer een taaknaam in');
            this.input.focus();
            return;
        }
        
        try {
            // Check if user is logged in first
            if (app && !app.isLoggedIn()) {
                toast.warning('Log in om taken toe te voegen.');
                return;
            }
            
            console.log('<i class="ti ti-search"></i> DEBUG: Adding task via API:', taakNaam);
            
            // Check current user first
            const userResponse = await fetch('/api/debug/current-user');
            const userData = await userResponse.json();
            console.log('<i class="ti ti-search"></i> DEBUG: Current user:', userData);
            
            // Check inbox before adding
            const beforeResponse = await fetch('/api/lijst/inbox');
            const beforeTasks = await beforeResponse.json();
            console.log('<i class="ti ti-search"></i> DEBUG: Inbox BEFORE adding:', beforeTasks.length, 'tasks');
            
            // SAFE APPROACH: Use dedicated single task endpoint
            const requestBody = { tekst: taakNaam };
            console.log('<i class="ti ti-search"></i> DEBUG: Request body:', requestBody);
            
            const response = await fetch('/api/taak/add-to-inbox', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log('<i class="ti ti-search"></i> DEBUG: Response status:', response.status);
            console.log('<i class="ti ti-search"></i> DEBUG: Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (response.ok) {
                const responseData = await response.json();
                console.log('<i class="ti ti-search"></i> DEBUG: Response data:', responseData);
                
                // Check inbox after adding
                const afterResponse = await fetch('/api/lijst/inbox');
                const afterTasks = await afterResponse.json();
                console.log('<i class="ti ti-search"></i> DEBUG: Inbox AFTER adding:', afterTasks.length, 'tasks');
                
                toast.success('Taak toegevoegd aan inbox');
                this.hide();
                
                // Update counts and refresh if in inbox
                if (app) {
                    await app.laadTellingen();
                    if (app.huidigeLijst === 'inbox') {
                        await app.laadHuidigeLijst();
                    }
                }
            } else {
                let errorText;
                try {
                    errorText = await response.text();
                } catch (e) {
                    errorText = 'Could not read error response';
                }
                
                console.error('<i class="ti ti-alert-circle"></i> DEBUG: API Error details:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText: errorText,
                    url: response.url
                });
                
                // Check inbox after failed request
                const afterFailResponse = await fetch('/api/lijst/inbox');
                const afterFailTasks = await afterFailResponse.json();
                console.log('<i class="ti ti-search"></i> DEBUG: Inbox AFTER FAILED request:', afterFailTasks.length, 'tasks');
                
                toast.error('Fout bij toevoegen: ' + (response.status === 401 ? 'Log eerst in' : 'Server fout (500)'));
            }
        } catch (error) {
            console.error('Error adding task:', error);
            toast.error('Fout bij toevoegen van taak: ' + error.message);
        }
    }
}

// Keyboard Help Modal System
class KeyboardHelpModal {
    constructor() {
        this.modal = document.getElementById('keyboardHelpModal');
        this.closeBtn = document.getElementById('keyboardHelpClose');
        
        this.setupEventListeners();
        this.updateShortcutsForOS();
    }
    
    setupEventListeners() {
        this.closeBtn.addEventListener('click', () => this.hide());
        
        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        
        // Escape to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'flex') {
                this.hide();
            }
        });
    }
    
    show() {
        this.modal.style.display = 'flex';
    }
    
    hide() {
        this.modal.style.display = 'none';
    }
    
    updateShortcutsForOS() {
        // SHIFT+F12 is the same on all platforms - much simpler!
        const shortcutCombo = 'SHIFT+F12';
        
        // Update all shortcuts in help modal
        const shortcuts = this.modal.querySelectorAll('kbd');
        shortcuts.forEach(kbd => {
            if (kbd.textContent.includes('SHIFT+F12')) {
                kbd.textContent = shortcutCombo;
            }
        });
        
        // Update footer shortcuts as well
        const footerShortcuts = document.querySelectorAll('.shortcuts-footer kbd');
        footerShortcuts.forEach(kbd => {
            if (kbd.textContent.includes('Ctrl+Shift+N')) {
                kbd.textContent = shortcutCombo;
            }
        });
    }
}

// Global Keyboard Shortcuts System
class KeyboardShortcutManager {
    constructor() {
        this.quickAddModal = new QuickAddModal();
        this.keyboardHelpModal = new KeyboardHelpModal();
        
        this.setupGlobalShortcuts();
    }
    
    setupGlobalShortcuts() {
        document.addEventListener('keydown', (e) => {
            
            // SHIFT+F12 - Quick Add nieuwe taak (F11 opent Mission Control, F12 opent console)
            if (e.shiftKey && e.key === 'F12') {
                e.preventDefault();
                console.log('SHIFT+F12 detected - quick add modal');
                this.quickAddModal.show();
                return;
            }
            
            // F10 - Open herhaling popup (works globally)
            if (e.key === 'F10') {
                e.preventDefault();
                // First check if planning popup is open, if not open it first
                const planningPopup = document.getElementById('planningPopup');
                if (!planningPopup || planningPopup.style.display === 'none') {
                    // Open planning popup first with empty task
                    app.openPlanningPopup('', 'new');
                    // Small delay to ensure popup is ready
                    setTimeout(() => {
                        app.openHerhalingPopup();
                    }, 100);
                } else {
                    // Planning popup already open, directly open recurring popup
                    app.openHerhalingPopup();
                }
                app.showQuickTip("Herhaling popup geopend");
                return;
            }
            
            // For other shortcuts, ignore when typing in input fields (except our quick add modal)
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // Allow F2-F9 when planning popup is open (they're handled by the planning popup handler)
                const planningPopup = document.getElementById('planningPopup');
                if (planningPopup && planningPopup.style.display !== 'none' && e.key.match(/^F[2-9]$/)) {
                    // Let F2-F9 pass through to planning popup handler
                    return;
                }
                
                // Allow Escape to close modals, F1 for help, and Enter in quick add modal
                if (e.key === 'Escape') {
                    this.quickAddModal.hide();
                    this.keyboardHelpModal.hide();
                }
                // F1 should always work for help, even in text fields
                if (e.key === 'F1' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    this.keyboardHelpModal.show();
                    return;
                }
                return;
            }
            
            // Check for '?' key to show help
            // F1 for help (universal help key)
            if (e.key === 'F1' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                this.keyboardHelpModal.show();
                return;
            }
            
            // Keep ? for backward compatibility (when not in text field)
            if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && 
                e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.keyboardHelpModal.show();
                return;
            }
            
            // F11 - Toggle dagkalender focus mode (only when in daily planning)
            if (e.key === 'F11' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const dagKalender = document.querySelector('.dag-kalender');
                if (dagKalender) {
                    e.preventDefault();
                    app.toggleDagkalenderFocus();
                    return;
                }
            }
            
            // Escape key to close any open modals or exit focus mode
            if (e.key === 'Escape') {
                // Check if we're in focus mode first
                const dagKalender = document.querySelector('.dag-kalender');
                if (dagKalender && dagKalender.classList.contains('dag-kalender-fullscreen')) {
                    e.preventDefault();
                    app.toggleDagkalenderFocus();
                    return;
                }
                
                // Otherwise close modals as usual
                this.quickAddModal.hide();
                this.keyboardHelpModal.hide();
            }
        });
    }
}

// Feedback System Manager
class FeedbackManager {
    constructor() {
        this.modal = document.getElementById('feedbackModal');
        this.form = document.getElementById('feedbackForm');
        this.currentType = 'bug';
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Feedback sidebar items
        const feedbackItems = document.querySelectorAll('.feedback-item');
        feedbackItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const type = item.dataset.feedback;
                this.openFeedbackModal(type);
            });
        });
        
        // Form submission
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitFeedback();
            });
        }
        
        // Cancel button
        const cancelBtn = document.getElementById('feedbackCancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        // Close on overlay click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }
    }
    
    openFeedbackModal(type) {
        this.currentType = type;
        
        // Update modal title
        const title = document.getElementById('feedbackTitle');
        if (title) {
            title.textContent = type === 'bug' ? 'Bug Melden' : 'Feature Request';
        }
        
        // Show/hide bug-specific fields
        const bugDetails = document.getElementById('bugDetails');
        if (bugDetails) {
            bugDetails.style.display = type === 'bug' ? 'block' : 'none';
        }
        
        // Reset form
        this.form.reset();
        
        // Set modal type for styling
        this.modal.setAttribute('data-type', type);
        
        // Show modal
        this.modal.style.display = 'flex';
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = document.getElementById('feedbackTitel');
            if (firstInput) firstInput.focus();
        }, 100);
    }
    
    closeModal() {
        this.modal.style.display = 'none';
        this.form.reset();
    }
    
    collectContext() {
        const currentList = document.querySelector('.lijst-item.actief');
        const pageTitle = document.getElementById('page-title');
        const versionNumber = document.getElementById('version-number');
        
        return {
            currentPage: pageTitle ? pageTitle.textContent : 'Onbekend',
            activeList: currentList ? currentList.dataset.lijst : 'geen',
            appVersion: versionNumber ? versionNumber.textContent : 'Onbekend',
            browser: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            timestamp: new Date().toISOString(),
            url: window.location.pathname,
            userId: auth.currentUser ? auth.currentUser.id : null
        };
    }
    
    async submitFeedback() {
        const titel = document.getElementById('feedbackTitel').value.trim();
        const beschrijving = document.getElementById('feedbackBeschrijving').value.trim();
        const stappen = document.getElementById('feedbackStappen').value.trim();
        
        if (!titel || !beschrijving) {
            toast.warning('Vul alstublieft alle verplichte velden in');
            return;
        }
        
        // Show loading
        if (window.loading && window.loading.showGlobal) {
            window.loading.showGlobal('Feedback verzenden...');
        }
        
        try {
            const context = this.collectContext();
            const feedbackData = {
                type: this.currentType,
                titel,
                beschrijving,
                stappen: this.currentType === 'bug' ? stappen : null,
                context
            };
            
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedbackData)
            });
            
            if (response.ok) {
                toast.success('Bedankt voor je feedback! We gaan er mee aan de slag.');
                // Wacht even zodat gebruiker de success melding ziet
                setTimeout(() => {
                    this.closeModal();
                }, 1500);
            } else {
                const error = await response.text();
                toast.error('Er ging iets mis: ' + error);
            }
        } catch (error) {
            toast.error('Er ging iets mis bij het verzenden van je feedback');
            console.error('Feedback error:', error);
        } finally {
            if (window.loading && window.loading.hideGlobal) {
                window.loading.hideGlobal();
            }
        }
    }
}

// Initialize feedback system
let feedbackManager;
document.addEventListener('DOMContentLoaded', () => {
    feedbackManager = new FeedbackManager();
});

// Initialize keyboard shortcuts system
let keyboardManager;
document.addEventListener('DOMContentLoaded', () => {
    keyboardManager = new KeyboardShortcutManager();
});

// Load version number when page loads
document.addEventListener('DOMContentLoaded', loadVersionNumber);

// Tijdelijke functie om alle taken te wissen - ALLEEN VOOR AANGELOGDE GEBRUIKER
async function deleteAllTasks() {
    // Extra veiligheidscontroles - check multiple ways to ensure we're on acties
    const isActiesLijst = window.huidigeLijst === 'acties' || 
                         app.huidigeLijst === 'acties' || 
                         document.getElementById('acties-lijst') !== null;
    
    console.log('Debug deleteAllTasks:', {
        windowHuidigeLijst: window.huidigeLijst,
        appHuidigeLijst: app?.huidigeLijst,
        hasActiesLijst: !!document.getElementById('acties-lijst'),
        isActiesLijst
    });
    
    if (!isActiesLijst) {
        toast.error('Deze functie werkt alleen op de acties lijst');
        return;
    }
    
    // Vraag dubbele bevestiging
    const confirmation = confirm('⚠️ WAARSCHUWING: Dit zal ALLE taken in je acties lijst permanent verwijderen!\n\nWeet je dit 100% zeker?');
    if (!confirmation) return;
    
    const secondConfirmation = confirm('🚨 LAATSTE WAARSCHUWING: Deze actie kan NIET ongedaan gemaakt worden!\n\nTyp mentaal "IK BEGRIJP HET RISICO" en klik OK om door te gaan.');
    if (!secondConfirmation) return;
    
    try {
        // Check if loading manager exists
        if (window.loading && loading.showGlobal) {
            loading.showGlobal('Alle taken verwijderen...');
        }
        
        // Delete alle taken via API - werkt alleen voor aangelogde gebruiker
        const response = await fetch('/api/lijst/acties/delete-all', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            toast.success('Alle taken succesvol verwijderd');
            // Refresh de lijst
            if (app && app.laadHuidigeLijst) {
                await app.laadHuidigeLijst();
            } else {
                // Fallback: reload page
                window.location.reload();
            }
        } else {
            const error = await response.text();
            toast.error('Fout bij verwijderen: ' + error);
        }
    } catch (error) {
        toast.error('Fout bij verwijderen: ' + error.message);
    } finally {
        // Hide loading if it exists
        if (window.loading && loading.hideGlobal) {
            loading.hide();
        }
    }
}

// Delete all button is now hardcoded in renderActiesTable - no need for complex visibility management

// ============================
// SUBTAKEN MANAGEMENT
// ============================

class SubtakenManager {
    constructor() {
        console.log('DEBUG: SubtakenManager constructor called');
        this.currentSubtaken = [];
        this.editingSubtaak = null;
        this.initializeEventListeners();
        console.log('DEBUG: SubtakenManager constructor completed');
    }

    initializeEventListeners() {
        // Add button - safe initialization
        const addBtn = document.getElementById('subtaak-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showAddInput();
            });
        }

        // Save button
        const saveBtn = document.getElementById('subtaak-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSubtaak();
            });
        }

        // Cancel button
        const cancelBtn = document.getElementById('subtaak-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideAddInput();
            });
        }

        // Input field enter/escape
        const input = document.getElementById('subtaak-input');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.saveSubtaak();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.hideAddInput();
                }
            });
        }
    }

    async loadSubtaken(parentTaakId) {
        console.log('DEBUG loadSubtaken: called with parentTaakId:', parentTaakId);
        
        if (!parentTaakId) {
            console.log('DEBUG loadSubtaken: no parentTaakId, hiding sectie');
            this.hideSubtakenSectie();
            return;
        }

        try {
            console.log('DEBUG loadSubtaken: fetching from API...');
            const response = await fetch(`/api/subtaken/${parentTaakId}`);
            console.log('DEBUG loadSubtaken: API response status:', response.status);
            
            if (response.ok) {
                this.currentSubtaken = await response.json();
                console.log('DEBUG loadSubtaken: loaded subtaken:', this.currentSubtaken);
                this.showSubtakenSectie();
                this.renderSubtaken();
                console.log('DEBUG loadSubtaken: rendered subtaken, sectie should be visible');
            } else {
                console.error('Error loading subtaken:', response.statusText);
                this.hideSubtakenSectie();
            }
        } catch (error) {
            console.error('Error loading subtaken:', error);
            this.hideSubtakenSectie();
        }
    }

    showSubtakenSectie() {
        document.getElementById('subtaken-sectie').style.display = 'block';
    }

    hideSubtakenSectie() {
        document.getElementById('subtaken-sectie').style.display = 'none';
    }

    renderSubtaken() {
        const container = document.getElementById('subtaken-lijst');
        const emptyState = document.getElementById('subtaken-empty');
        
        if (this.currentSubtaken.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
            container.innerHTML = this.currentSubtaken.map(subtaak => this.renderSubtaakItem(subtaak)).join('');
        }

        this.updateProgressIndicator();
        this.attachSubtaakEventListeners();
    }

    renderSubtaakItem(subtaak) {
        // Use ID if exists, otherwise use titel as identifier for local subtaken
        const identifier = subtaak.id || subtaak.titel;
        
        return `
            <div class="subtaak-item" data-subtaak-id="${identifier}">
                <div class="subtaak-drag-handle">
                    <i class="fas fa-grip-lines"></i>
                </div>
                <input type="checkbox" class="subtaak-checkbox" ${subtaak.voltooid ? 'checked' : ''}>
                <div class="subtaak-text ${subtaak.voltooid ? 'completed' : ''}">${this.escapeHtml(subtaak.titel)}</div>
                <div class="subtaak-actions">
                    <button class="subtaak-edit-btn" title="Bewerken">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="subtaak-delete-btn" title="Verwijderen">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    attachSubtaakEventListeners() {
        // Checkbox changes
        document.querySelectorAll('.subtaak-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const subtaakId = parseInt(e.target.closest('.subtaak-item').dataset.subtaakId);
                this.toggleSubtaakVoltooid(subtaakId, e.target.checked);
            });
        });

        // Edit buttons
        document.querySelectorAll('.subtaak-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subtaakId = parseInt(e.target.closest('.subtaak-item').dataset.subtaakId);
                this.editSubtaak(subtaakId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.subtaak-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subtaakId = parseInt(e.target.closest('.subtaak-item').dataset.subtaakId);
                this.deleteSubtaak(subtaakId);
            });
        });
    }

    updateProgressIndicator() {
        const progressElement = document.getElementById('subtaken-progress');
        
        if (this.currentSubtaken.length === 0) {
            progressElement.style.display = 'none';
        } else {
            const completed = this.currentSubtaken.filter(s => s.voltooid).length;
            const total = this.currentSubtaken.length;
            progressElement.textContent = `(${completed}/${total} voltooid)`;
            progressElement.style.display = 'inline';
        }
    }

    showAddInput() {
        document.getElementById('subtaak-input-container').style.display = 'flex';
        document.getElementById('subtaak-input').focus();
    }

    hideAddInput() {
        document.getElementById('subtaak-input-container').style.display = 'none';
        document.getElementById('subtaak-input').value = '';
        this.editingSubtaak = null;
    }

    async saveSubtaak() {
        const input = document.getElementById('subtaak-input');
        const titel = input.value.trim();
        
        if (!titel) {
            toast.warning('Voer een titel in voor de subtaak');
            return;
        }

        const parentTaakId = app.huidigeTaakId;
        if (!parentTaakId) {
            toast.error('Geen hoofdtaak geselecteerd');
            return;
        }

        try {
            if (this.editingSubtaak) {
                // Update existing subtaak
                if (this.editingSubtaak.id) {
                    // Existing subtaak in database
                    await this.updateSubtaak(this.editingSubtaak.id, { titel });
                } else {
                    // Local subtaak being edited
                    this.editingSubtaak.titel = titel;
                }
            } else {
                // Create new subtaak
                if (app.huidigeLijst === 'acties') {
                    // For existing actions: save directly to database
                    await this.createSubtaak(parentTaakId, titel);
                } else {
                    // For inbox tasks: save locally until task becomes action
                    const newSubtaak = {
                        id: null, // No ID yet - will be created when task becomes action
                        titel: titel,
                        voltooid: false,
                        volgorde: this.currentSubtaken.length,
                        parent_taak_id: parentTaakId
                    };
                    this.currentSubtaken.push(newSubtaak);
                    console.log('Added local subtaak for inbox task:', newSubtaak);
                }
            }
            
            this.hideAddInput();
            
            if (app.huidigeLijst === 'acties') {
                // Reload from database for actions
                await this.loadSubtaken(parentTaakId);
            } else {
                // Re-render local subtaken for inbox tasks
                this.renderSubtaken();
            }
            
            toast.success(this.editingSubtaak ? 'Subtaak bijgewerkt' : 'Subtaak toegevoegd');
        } catch (error) {
            console.error('Error saving subtaak:', error);
            toast.error('Fout bij opslaan subtaak');
        }
    }

    async createSubtaak(parentTaakId, titel) {
        const response = await fetch('/api/subtaken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parentTaakId, titel })
        });

        if (!response.ok) {
            throw new Error('Failed to create subtaak');
        }

        return await response.json();
    }

    async updateSubtaak(subtaakId, updates) {
        const response = await fetch(`/api/subtaken/${subtaakId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            throw new Error('Failed to update subtaak');
        }

        return await response.json();
    }

    async toggleSubtaakVoltooid(subtaakId, voltooid) {
        try {
            // Find the subtaak
            const subtaak = this.currentSubtaken.find(s => s.id === subtaakId || s.id === null && s.titel === subtaakId);
            if (!subtaak) {
                console.error('Subtaak not found:', subtaakId);
                return;
            }
            
            if (subtaak.id && app.huidigeLijst === 'acties') {
                // Existing subtaak in database - update via API
                await this.updateSubtaak(subtaak.id, { voltooid });
            } else {
                // Local subtaak - just update locally
                console.log('Toggling local subtaak:', subtaak.titel, 'to', voltooid);
            }
            
            // Update local state
            subtaak.voltooid = voltooid;
            this.renderSubtaken();
        } catch (error) {
            console.error('Error toggling subtaak:', error);
            toast.error('Fout bij wijzigen subtaak status');
        }
    }

    editSubtaak(subtaakId) {
        const subtaak = this.currentSubtaken.find(s => s.id === subtaakId);
        if (!subtaak) return;

        this.editingSubtaak = subtaak;
        document.getElementById('subtaak-input').value = subtaak.titel;
        this.showAddInput();
    }

    async deleteSubtaak(subtaakId) {
        const subtaak = this.currentSubtaken.find(s => s.id === subtaakId);
        if (!subtaak) return;

        if (!confirm(`Subtaak "${subtaak.titel}" verwijderen?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/subtaken/${subtaakId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete subtaak');
            }

            await this.loadSubtaken(app.huidigeTaakId);
            toast.success('Subtaak verwijderd');
        } catch (error) {
            console.error('Error deleting subtaak:', error);
            toast.error('Fout bij verwijderen subtaak');
        }
    }

    async saveAllSubtaken(parentTaakId) {
        // Save all subtaken in currentSubtaken array to database
        if (!parentTaakId) {
            console.error('saveAllSubtaken: No parentTaakId provided');
            return;
        }

        if (!this.currentSubtaken || this.currentSubtaken.length === 0) {
            console.log('saveAllSubtaken: No subtaken to save');
            return;
        }

        console.log(`saveAllSubtaken: Saving ${this.currentSubtaken.length} subtaken for parent ${parentTaakId}`, this.currentSubtaken);

        try {
            for (const subtaak of this.currentSubtaken) {
                if (!subtaak.id) {
                    // New subtaak - create it
                    console.log('Creating new subtaak:', subtaak.titel);
                    await this.createSubtaak(parentTaakId, subtaak.titel);
                } else {
                    // Existing subtaak - update it if needed
                    console.log('Updating existing subtaak:', subtaak.titel);
                    await this.updateSubtaak(subtaak.id, {
                        titel: subtaak.titel,
                        voltooid: subtaak.voltooid || false,
                        volgorde: subtaak.volgorde || 0
                    });
                }
            }
            console.log('saveAllSubtaken: All subtaken saved successfully');
        } catch (error) {
            console.error('saveAllSubtaken: Error saving subtaken:', error);
            throw error;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Bijlagen (Attachments) Manager
class BijlagenManager {
    constructor() {
        this.currentTaakId = null;
        this.storageStats = null;
        this.currentPreview = null;
        this.initializeEventListeners();
        this.initPreviewModal();
    }

    initializeEventListeners() {
        const dropzone = document.getElementById('upload-dropzone');
        const fileInput = document.getElementById('file-input');
        const uploadLink = dropzone?.querySelector('.upload-link');

        if (dropzone && fileInput) {
            // Click to select file
            dropzone.addEventListener('click', () => {
                fileInput.click();
            });

            uploadLink?.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });

            // File input change
            fileInput.addEventListener('change', (e) => {
                console.log('🔍 DEBUG: File input changed', {
                    file: e.target.files[0]?.name,
                    currentTaakId: this.currentTaakId,
                    hasFile: !!e.target.files[0],
                    hasCurrentTaakId: !!this.currentTaakId
                });
                
                const file = e.target.files[0];
                if (file && this.currentTaakId) {
                    console.log('✅ DEBUG: Calling uploadFile from file input');
                    this.uploadFile(file);
                } else {
                    console.log('❌ DEBUG: Not calling uploadFile:', {
                        hasFile: !!file,
                        hasCurrentTaakId: !!this.currentTaakId
                    });
                }
            });

            // Drag and drop
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });

            dropzone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
            });

            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                
                console.log('🔍 DEBUG: File dropped', {
                    filesCount: e.dataTransfer.files.length,
                    firstFileName: e.dataTransfer.files[0]?.name,
                    currentTaakId: this.currentTaakId,
                    hasCurrentTaakId: !!this.currentTaakId
                });
                
                const files = e.dataTransfer.files;
                if (files.length > 0 && this.currentTaakId) {
                    console.log('✅ DEBUG: Calling uploadFile from drag & drop');
                    this.uploadFile(files[0]);
                } else {
                    console.log('❌ DEBUG: Not calling uploadFile from drop:', {
                        hasFiles: files.length > 0,
                        hasCurrentTaakId: !!this.currentTaakId
                    });
                }
            });
        }

        // Upgrade button
        const upgradeBtn = document.getElementById('upgrade-btn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                this.showUpgradeModal();
            });
        }
    }

    async initializeForTask(taakId) {
        console.log('🔍 DEBUG: initializeForTask called with taakId:', taakId);
        this.currentTaakId = taakId;
        console.log('✅ DEBUG: Set currentTaakId to:', this.currentTaakId);
        
        await this.loadStorageStats();
        await this.loadBijlagen();
        this.updateUI();
        
        console.log('🏁 DEBUG: initializeForTask completed');
    }

    async loadStorageStats() {
        try {
            const response = await fetch('/api/user/storage-stats', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                this.storageStats = data.stats;
                console.log('Storage stats loaded:', this.storageStats);
            }
        } catch (error) {
            console.error('Error loading storage stats:', error);
        }
    }

    async loadBijlagen() {
        if (!this.currentTaakId) return;

        try {
            const response = await fetch(`/api/taak/${this.currentTaakId}/bijlagen`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                this.renderBijlagen(data.bijlagen);
            }
        } catch (error) {
            console.error('Error loading bijlagen:', error);
        }
    }

    renderBijlagen(bijlagen) {
        const lijst = document.getElementById('bijlagen-lijst');
        if (!lijst) return;

        if (bijlagen.length === 0) {
            lijst.style.display = 'none';
            return;
        }

        lijst.style.display = 'block';
        lijst.innerHTML = bijlagen.map(bijlage => {
            const canPreview = this.canPreview(bijlage.mimetype);
            const previewClass = canPreview ? 'preview-supported' : '';
            
            return `
                <div class="bijlage-item ${previewClass}" data-id="${bijlage.id}">
                    <i class="bijlage-icon ${this.getFileIcon(bijlage.mimetype)} ${this.getFileClass(bijlage.bestandsnaam)}"></i>
                    <div class="bijlage-info">
                        <div class="bijlage-naam">${this.escapeHtml(bijlage.bestandsnaam)}</div>
                        <div class="bijlage-details">
                            ${this.formatBytes(bijlage.bestandsgrootte)} • ${this.formatDate(bijlage.geupload)}
                        </div>
                    </div>
                    <div class="bijlage-acties">
                        <button class="bijlage-btn download" onclick="event.stopPropagation(); bijlagenManager.downloadBijlage('${bijlage.id}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="bijlage-btn delete" onclick="event.stopPropagation(); bijlagenManager.deleteBijlage('${bijlage.id}')">
                            <i class="fas fa-trash"></i> Verwijder
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click event listeners for preview functionality
        const bijlageItems = lijst.querySelectorAll('.bijlage-item.preview-supported');
        bijlageItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger on button clicks
                if (e.target.closest('.bijlage-acties')) return;
                
                const bijlageId = item.dataset.id;
                if (bijlageId) {
                    this.previewBijlage(bijlageId, bijlagen);
                }
            });
        });
    }

    updateUI() {
        if (!this.storageStats) return;

        const storageUsage = document.getElementById('storage-usage');
        const uploadLimits = document.getElementById('upload-limits');
        const upgradePrompt = document.getElementById('upgrade-prompt');

        // Update storage usage display
        if (storageUsage) {
            storageUsage.textContent = `${this.storageStats.used_formatted} / ${this.storageStats.limits.total_formatted}`;
            storageUsage.style.display = 'block';
        }

        // Update upload limits text
        if (uploadLimits) {
            const planType = this.storageStats.plan_type || 'free';

            if (planType === 'premium_plus') {
                uploadLimits.textContent = 'Premium Plus: onbeperkte bijlagen en grootte';
            } else if (planType === 'premium_standard') {
                uploadLimits.textContent = `Standard: Max ${this.storageStats.limits.max_file_formatted}, ${this.storageStats.limits.max_attachments_per_task} bijlage per taak`;
            } else {
                uploadLimits.textContent = `Max ${this.storageStats.limits.max_file_formatted}, ${this.storageStats.limits.max_attachments_per_task} bijlage per taak (gratis)`;
            }
        }

        // Show/hide upgrade prompt
        if (upgradePrompt && !this.storageStats.is_premium) {
            const usagePercentage = this.storageStats.used_bytes / this.storageStats.limits.total_bytes;
            upgradePrompt.style.display = usagePercentage > 0.8 ? 'block' : 'none';
        }
    }

    async uploadFile(file) {
        console.log('🔍 DEBUG: uploadFile called with:', {
            fileName: file?.name,
            fileSize: file?.size,
            fileType: file?.type,
            currentTaakId: this.currentTaakId
        });

        if (!this.currentTaakId) {
            console.log('❌ DEBUG: No currentTaakId, showing error');
            toast.error('Geen taak geselecteerd voor bijlage upload');
            return;
        }

        // Show progress
        console.log('⏳ DEBUG: Showing progress indicator');
        const progress = this.showProgress('Uploaden...');

        try {
            console.log('📤 DEBUG: Creating FormData and making API request');
            const formData = new FormData();
            formData.append('file', file);

            const apiUrl = `/api/taak/${this.currentTaakId}/bijlagen`;
            console.log('🌐 DEBUG: Making POST request to:', apiUrl);

            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            console.log('📡 DEBUG: Response received:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            const data = await response.json();
            console.log('📋 DEBUG: Response data:', data);

            if (data.success) {
                console.log('✅ DEBUG: Upload successful, updating UI');
                toast.success(`Bijlage "${file.name}" succesvol geüpload`);
                await this.loadStorageStats();
                await this.loadBijlagen();
                this.updateUI();
                
                // Clear file input
                const fileInput = document.getElementById('file-input');
                if (fileInput) fileInput.value = '';
            } else {
                console.log('❌ DEBUG: Upload failed with data.error:', data.error);
                throw new Error(data.error || 'Upload gefaald');
            }

        } catch (error) {
            console.error('❌ DEBUG: Upload error caught:', {
                error: error,
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            if (error.message.includes('Maximum') || error.message.includes('Onvoldoende')) {
                toast.error(error.message);
            } else if (error.message.includes('niet toegestaan')) {
                toast.error('Bestandstype niet toegestaan');
            } else {
                toast.error('Upload gefaald. Probeer opnieuw.');
            }
        } finally {
            console.log('🏁 DEBUG: Upload process finished, hiding progress');
            this.hideProgress(progress);
        }
    }

    async downloadBijlage(bijlageId) {
        try {
            console.log('🟢 [FRONTEND] Download clicked at:', new Date().toISOString());
            
            const startTime = performance.now();
            const response = await fetch(`/api/bijlage/${bijlageId}/download`, {
                credentials: 'include'
            });
            const fetchTime = performance.now();
            
            console.log('🟢 [FRONTEND] Fetch completed in:', (fetchTime - startTime).toFixed(2), 'ms');
            
            if (!response.ok) {
                throw new Error('Download gefaald');
            }

            // Get filename from response headers or use default
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'bijlage';
            
            if (contentDisposition) {
                const matches = /filename="([^"]+)"/.exec(contentDisposition);
                if (matches) {
                    filename = matches[1];
                }
            }

            // Create blob and download
            const blob = await response.blob();
            const blobTime = performance.now();
            
            console.log('🟢 [FRONTEND] Blob created in:', (blobTime - fetchTime).toFixed(2), 'ms');
            console.log('🟢 [FRONTEND] Total time:', (blobTime - startTime).toFixed(2), 'ms');
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success('Download gestart');

        } catch (error) {
            console.error('Download error:', error);
            toast.error('Download gefaald. Probeer opnieuw.');
        }
    }

    async deleteBijlage(bijlageId) {
        if (!confirm('Weet je zeker dat je deze bijlage wilt verwijderen?')) {
            return;
        }

        try {
            const response = await fetch(`/api/bijlage/${bijlageId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Bijlage verwijderd');
                await this.loadStorageStats();
                await this.loadBijlagen();
                this.updateUI();
            } else {
                throw new Error(data.error || 'Verwijderen gefaald');
            }

        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Verwijderen gefaald. Probeer opnieuw.');
        }
    }

    showUpgradeModal() {
        toast.info('Premium upgrade functionaliteit komt binnenkort beschikbaar!');
    }

    showProgress(text) {
        const dropzone = document.getElementById('upload-dropzone');
        if (!dropzone) return;

        const progress = document.createElement('div');
        progress.className = 'upload-progress';
        progress.innerHTML = `
            <div class="progress-text">${text}</div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
        `;

        dropzone.appendChild(progress);
        return progress;
    }

    hideProgress(progress) {
        if (progress && progress.parentNode) {
            progress.parentNode.removeChild(progress);
        }
    }

    getFileIcon(mimetype) {
        if (mimetype.includes('pdf')) return 'fas fa-file-pdf';
        if (mimetype.includes('word') || mimetype.includes('document')) return 'fas fa-file-word';
        if (mimetype.includes('excel') || mimetype.includes('sheet')) return 'fas fa-file-excel';
        if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'fas fa-file-powerpoint';
        if (mimetype.includes('image')) return 'fas fa-file-image';
        if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('compressed')) return 'fas fa-file-archive';
        if (mimetype.includes('text')) return 'fas fa-file-alt';
        return 'fas fa-file';
    }

    getFileClass(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        return ext || 'default';
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('nl-NL', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Preview functionality
    canPreview(mimetype) {
        if (!mimetype) return false;
        return mimetype.startsWith('image/') || mimetype === 'application/pdf';
    }

    async previewBijlage(bijlageId, bijlagen = null) {
        try {
            // Find the current bijlage
            const allBijlagen = bijlagen || await this.getAllBijlagen();
            const currentIndex = allBijlagen.findIndex(b => b.id === bijlageId);
            
            if (currentIndex === -1) {
                toast.error('Bijlage niet gevonden');
                return;
            }

            const bijlage = allBijlagen[currentIndex];
            
            if (!this.canPreview(bijlage.mimetype)) {
                toast.error('Preview niet ondersteund voor dit bestandstype');
                return;
            }

            // Voor PDFs: open in nieuwe tab
            if (bijlage.mimetype === 'application/pdf') {
                window.open(`/api/bijlage/${bijlage.id}/preview`, '_blank');
                return;
            }

            // Voor afbeeldingen: show modal
            if (bijlage.mimetype.startsWith('image/')) {
                this.showPreviewModal(bijlage, allBijlagen, currentIndex);
            }
            
        } catch (error) {
            console.error('Preview error:', error);
            toast.error('Fout bij laden preview');
        }
    }

    async getAllBijlagen() {
        if (!this.currentTaakId) return [];

        try {
            const response = await fetch(`/api/taak/${this.currentTaakId}/bijlagen`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                return data.bijlagen.filter(b => this.canPreview(b.mimetype));
            }
            return [];
        } catch (error) {
            console.error('Error getting all bijlagen:', error);
            return [];
        }
    }

    showPreviewModal(bijlage, allBijlagen, currentIndex) {
        const modal = document.getElementById('previewModal');
        const filename = document.getElementById('previewFilename');
        const container = document.getElementById('previewContainer');
        const navigation = document.getElementById('previewNavigation');
        const counter = document.getElementById('previewCounter');
        
        if (!modal || !filename || !container) return;

        // Set filename
        filename.textContent = bijlage.bestandsnaam;

        // Create preview content
        container.innerHTML = '';
        
        // Alleen afbeeldingen worden in modal getoond (PDFs openen in nieuwe tab)
        if (bijlage.mimetype.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = `/api/bijlage/${bijlage.id}/preview`;
            img.alt = bijlage.bestandsnaam;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            container.appendChild(img);
        }

        // Setup navigation if multiple bijlagen
        const previewableBijlagen = allBijlagen.filter(b => this.canPreview(b.mimetype));
        if (previewableBijlagen.length > 1 && navigation && counter) {
            navigation.style.display = 'flex';
            counter.textContent = `${currentIndex + 1} van ${previewableBijlagen.length}`;
            
            const prevBtn = document.getElementById('previewPrevious');
            const nextBtn = document.getElementById('previewNext');
            
            if (prevBtn) {
                prevBtn.disabled = currentIndex === 0;
                prevBtn.onclick = () => {
                    if (currentIndex > 0) {
                        const prevBijlage = previewableBijlagen[currentIndex - 1];
                        this.showPreviewModal(prevBijlage, allBijlagen, currentIndex - 1);
                    }
                };
            }
            
            if (nextBtn) {
                nextBtn.disabled = currentIndex === previewableBijlagen.length - 1;
                nextBtn.onclick = () => {
                    if (currentIndex < previewableBijlagen.length - 1) {
                        const nextBijlage = previewableBijlagen[currentIndex + 1];
                        this.showPreviewModal(nextBijlage, allBijlagen, currentIndex + 1);
                    }
                };
            }
        } else if (navigation) {
            navigation.style.display = 'none';
        }

        // Show modal
        modal.style.display = 'flex';
        
        // Store current preview data for keyboard navigation
        this.currentPreview = {
            bijlagen: previewableBijlagen,
            currentIndex: currentIndex
        };
    }

    hidePreviewModal() {
        const modal = document.getElementById('previewModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentPreview = null;
    }

    initPreviewModal() {
        const modal = document.getElementById('previewModal');
        const closeBtn = document.getElementById('previewClose');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hidePreviewModal());
        }
        
        if (modal) {
            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hidePreviewModal();
                }
            });
            
            // ESC key to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.style.display === 'flex') {
                    this.hidePreviewModal();
                }
                
                // Arrow keys for navigation
                if (modal.style.display === 'flex' && this.currentPreview) {
                    if (e.key === 'ArrowLeft' && this.currentPreview.currentIndex > 0) {
                        const prevBijlage = this.currentPreview.bijlagen[this.currentPreview.currentIndex - 1];
                        this.showPreviewModal(prevBijlage, this.currentPreview.bijlagen, this.currentPreview.currentIndex - 1);
                    } else if (e.key === 'ArrowRight' && this.currentPreview.currentIndex < this.currentPreview.bijlagen.length - 1) {
                        const nextBijlage = this.currentPreview.bijlagen[this.currentPreview.currentIndex + 1];
                        this.showPreviewModal(nextBijlage, this.currentPreview.bijlagen, this.currentPreview.currentIndex + 1);
                    }
                }
            });
        }
    }
}

// Initialize subtaken manager
let subtakenManager;
let bijlagenManager;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DEBUG: Initializing SubtakenManager...');
    try {
        subtakenManager = new SubtakenManager();
        console.log('DEBUG: SubtakenManager initialized successfully');
    } catch (error) {
        console.error('DEBUG: Error initializing SubtakenManager:', error);
    }

    console.log('DEBUG: Initializing BijlagenManager...');
    try {
        bijlagenManager = new BijlagenManager();
        // Make bijlagenManager globally accessible for onclick handlers
        window.bijlagenManager = bijlagenManager;
        console.log('DEBUG: BijlagenManager initialized successfully');
    } catch (error) {
        console.error('DEBUG: Error initializing BijlagenManager:', error);
    }
});



