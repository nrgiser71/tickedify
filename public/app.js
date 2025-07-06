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

// Debug functie voor titel check
window.debugTitle = function() {
    const pageTitle = document.getElementById('page-title');
    const h1Elements = document.querySelectorAll('h1');
    console.log('DEBUG TITLE CHECK:', {
        pageTitleElement: pageTitle,
        pageTitleText: pageTitle ? pageTitle.textContent : 'NOT FOUND',
        allH1Elements: Array.from(h1Elements).map(h1 => ({ 
            id: h1.id, 
            text: h1.textContent, 
            parent: h1.parentElement?.className 
        })),
        currentList: window.app?.huidigeLijst,
        documentTitle: document.title
    });
};

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

// Global modal instances
const inputModal = new InputModal();
const confirmModal = new ConfirmModal();

// Loading Manager System
class LoadingManager {
    constructor() {
        this.overlay = document.getElementById('loadingOverlay');
        this.activeOperations = new Set();
        this.loadingStates = new Map(); // Track loading state per component
    }

    // Global loading overlay
    show(message = 'Laden...') {
        this.overlay.classList.add('active');
    }

    hide() {
        this.overlay.classList.remove('active');
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
        this.toonToekomstigeTaken = this.restoreToekomstToggle(); // Toggle voor toekomstige taken
        this.autoRefreshInterval = null; // Voor inbox auto-refresh
        this.activeCompletions = new Set(); // Track active task completions to prevent race conditions
        this.saveTimeout = null; // Debounce lijst opslaan
        this.isSaving = false; // Prevent parallel saves
        this.bulkModus = false; // Bulk edit mode voor overtijd taken
        this.geselecteerdeTaken = new Set(); // Geselecteerde taken in bulk modus
        this.init();
    }

    init() {
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
                                  'contextenbeheer'];
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
        
        // Navigate to the restored current list (includes sidebar update)
        await this.navigeerNaarLijst(this.huidigeLijst);
        
        await this.laadProjecten();
        await this.laadContexten();
    }

    bindEvents() {
        // Prevent multiple event listeners
        if (this.eventsAlreadyBound) return;
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

        // Dropdown functionaliteit
        document.getElementById('uitgesteld-dropdown').addEventListener('click', () => {
            this.toggleDropdown('uitgesteld');
        });

        // Tools dropdown functionaliteit
        document.getElementById('tools-dropdown').addEventListener('click', () => {
            this.toggleDropdown('tools');
        });

        // Tools menu items - use event delegation
        document.addEventListener('click', (e) => {
            const toolItem = e.target.closest('[data-tool]');
            if (toolItem && !e.defaultPrevented) {
                e.preventDefault();
                const tool = toolItem.dataset.tool;
                this.openTool(tool);
            }
        });

        // Taak toevoegen (alleen voor inbox)
        document.getElementById('toevoegBtn').addEventListener('click', () => {
            if (this.huidigeLijst === 'inbox') {
                this.voegTaakToe();
            }
        });

        document.getElementById('taakInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.huidigeLijst === 'inbox') {
                this.voegTaakToe();
            }
        });

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
        console.log('navigeerNaarLijst called:', { from: this.huidigeLijst, to: lijst });
        
        // If we're coming from contextenbeheer or dagelijkse-planning, restore normal structure
        let titleAlreadySet = false;
        if ((this.huidigeLijst === 'contextenbeheer' || this.huidigeLijst === 'dagelijkse-planning') && lijst !== 'contextenbeheer' && lijst !== 'dagelijkse-planning') {
            console.log('Calling restoreNormalContainer with target:', lijst);
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
                console.log('navigeerNaarLijst: updating page title to:', titles[lijst] || lijst);
                pageTitle.textContent = titles[lijst] || lijst;
            } else {
                console.warn('navigeerNaarLijst: page-title element not found!');
            }
        } else {
            console.log('navigeerNaarLijst: title already set by restoreNormalContainer, skipping update');
        }

        // Update input visibility (alleen inbox heeft input)
        const inputContainer = document.getElementById('taak-input-container');
        if (inputContainer) {
            if (lijst === 'inbox') {
                inputContainer.style.display = 'flex';
            } else {
                inputContainer.style.display = 'none';
            }
        }

        // Laad lijst data
        this.huidigeLijst = lijst;
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
            
            div.innerHTML = `
                <div class="project-item" onclick="app.toggleProject('${project.id}')">
                    <div class="project-content">
                        <div class="project-naam-row">
                            <span class="project-expand-arrow" id="arrow-${project.id}">▶</span>
                            <div class="project-naam" title="${this.escapeHtml(project.naam)}">${project.naam}</div>
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
        const naam = await inputModal.show('Nieuw Project', 'Naam voor het nieuwe project:');
        if (naam && naam.trim()) {
            const nieuwProject = {
                id: this.generateId(),
                naam: naam.trim(),
                aangemaakt: new Date().toISOString()
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
        
        const nieuweNaam = await inputModal.show('Project Bewerken', 'Nieuwe naam voor het project:', project.naam);
        if (nieuweNaam && nieuweNaam.trim() && nieuweNaam.trim() !== project.naam) {
            project.naam = nieuweNaam.trim();
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
            
            this.renderProjectActies(container, openActies, afgewerkteActies);
            
        } catch (error) {
            console.error('Fout bij laden project acties:', error);
            container.innerHTML = '<div class="project-taken-error">Fout bij laden acties</div>';
        }
    }

    renderProjectActies(container, openActies, afgewerkteActies) {
        let html = '<div class="project-taken-lijst">';
        
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
            if (actie.herhalingActief && actie.herhalingType) {
                if (actie.herhalingType.startsWith('event-')) {
                    // Handle event-based recurrence - ask for next event date
                    const nextEventDate = await this.askForNextEventDate(actie);
                    if (nextEventDate) {
                        const nextTaskDate = this.calculateEventBasedDate(nextEventDate, actie.herhalingType);
                        if (nextTaskDate) {
                            nextRecurringTaskId = await this.createNextRecurringTask(actie, nextTaskDate);
                        }
                    }
                } else {
                    const nextDate = this.calculateNextRecurringDate(actie.verschijndatum, actie.herhalingType);
                    if (nextDate) {
                        nextRecurringTaskId = await this.createNextRecurringTask(actie, nextDate);
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
                const nextDateFormatted = new Date(this.calculateNextRecurringDate(actie.verschijndatum, actie.herhalingType)).toLocaleDateString('nl-NL');
                
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
        const scrollContainer = document.querySelector('#acties-lijst') || 
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
        
        // Save scroll position - check different possible scroll containers
        const savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        const mainContent = document.querySelector('.main-content');
        const savedMainContentScroll = mainContent ? mainContent.scrollTop : 0;
        
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
            
            // Restore scroll position
            setTimeout(() => {
                if (savedScrollPosition > 0) {
                    window.scrollTo(0, savedScrollPosition);
                }
                if (savedMainContentScroll > 0 && mainContent) {
                    mainContent.scrollTop = savedMainContentScroll;
                }
            }, 50); // Slightly longer delay for scroll restoration
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
            const datumFilter = document.getElementById('planningDatumFilter');
            const duurFilter = document.getElementById('planningDuurFilter');
            const toekomstToggle = document.getElementById('planningToekomstToggle');
            
            if (taakFilter) taakFilter.value = savedFilters.taakFilter;
            if (projectFilter) projectFilter.value = savedFilters.projectFilter;
            if (contextFilter) contextFilter.value = savedFilters.contextFilter;
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
        const hamburgerMenu = document.getElementById('hamburger-menu');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const overlay = document.getElementById('sidebar-overlay');

        if (!hamburgerMenu || !sidebar || !mainContent || !overlay) {
            console.log('Mobile sidebar elements not found, skipping initialization');
            return;
        }

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

        // Hamburger menu click
        hamburgerMenu.addEventListener('click', toggleSidebar);

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
            if (!popup.style.display || popup.style.display === 'none') return;
            
            // Skip if in textarea (except F8 which should focus textarea)
            if (e.target.tagName === 'TEXTAREA' && e.key !== 'F8') return;
            
            // F2-F9 shortcuts (F1 is reserved for global help)
            if (!e.ctrlKey && !e.altKey && !e.metaKey) {
                switch(e.key) {
                    case 'F2':
                        e.preventDefault();
                        app.focusAndOpenDropdown('projectSelect');
                        app.showQuickTip("Project dropdown geopend");
                        break;
                        
                    case 'F3':
                        e.preventDefault();
                        app.setDateToday();
                        app.showQuickTip("Datum ingesteld op vandaag");
                        break;
                        
                    case 'F4':
                        e.preventDefault();
                        app.setDateTomorrow();
                        app.showQuickTip("Datum ingesteld op morgen");
                        break;
                        
                    case 'F6':
                        e.preventDefault();
                        const dateField = document.getElementById('verschijndatum');
                        dateField.focus();
                        if (dateField.showPicker) {
                            dateField.showPicker();
                        }
                        app.showQuickTip("Datum picker geopend");
                        break;
                        
                    case 'F7':
                        e.preventDefault();
                        app.focusAndOpenDropdown('contextSelect');
                        app.showQuickTip("Context dropdown geopend");
                        break;
                        
                    case 'F8':
                        e.preventDefault();
                        app.cycleDuration();
                        app.showQuickTip("Duur cyclisch bijgewerkt");
                        break;
                        
                    case 'F9':
                        e.preventDefault();
                        document.getElementById('opmerkingen').focus();
                        app.showQuickTip("Focus op opmerkingen");
                        break;
                        
                    case 'F10':
                        e.preventDefault();
                        app.openHerhalingPopup();
                        app.showQuickTip("Herhaling popup geopend");
                        break;
                }
            }
            
            // SHIFT + F1-F4, F6-F7 for quick moves (F5 is reserved for browser refresh)
            if (e.shiftKey && e.key.match(/^F([1-4]|6|7)$/)) {
                e.preventDefault();
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
        this.showQuickTip(`Duur: ${nextDuration} minuten`);
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
        // Clear existing interval
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }

        // Only set up auto-refresh for inbox
        if (this.huidigeLijst === 'inbox') {
            // Initial load happens in laadHuidigeLijst, so start interval for subsequent refreshes
            this.autoRefreshInterval = setInterval(() => {
                console.log('<i class="fas fa-redo"></i> Auto-refreshing inbox...');
                this.refreshInbox();
            }, 15000); // 15 seconds
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

        return await loading.withLoading(async () => {
            try {
                if (this.huidigeLijst === 'projecten') {
                    // Voor projecten laden we de projecten lijst
                    const response = await fetch('/api/lijst/projecten-lijst');
                    if (response.ok) {
                        this.projecten = await response.json();
                    }
                    this.taken = []; // Projecten hebben geen taken
                } else {
                    const response = await fetch(`/api/lijst/${this.huidigeLijst}`);
                    if (response.ok) {
                        let taken = await response.json();
                        // Apply date filter only for actions list
                        this.taken = this.filterTakenOpDatum(taken);
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

    async voegTaakToe() {
        if (this.huidigeLijst !== 'inbox') return;
        
        // Check if user is logged in
        if (!this.isLoggedIn()) {
            toast.warning('Log in om taken toe te voegen.');
            return;
        }
        
        const input = document.getElementById('taakInput');
        const tekst = input.value.trim();
        
        if (tekst) {
            await loading.withLoading(async () => {
                const nieuweTaak = {
                    id: this.generateId(),
                    tekst: tekst,
                    aangemaakt: new Date().toISOString(),
                    lijst: 'inbox'
                };
                
                // Create task on server
                const response = await fetch('/api/taak', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nieuweTaak)
                });
                
                if (response.ok) {
                    // Refresh list from server to ensure consistency
                    await this.laadHuidigeLijst();
                    
                    input.value = '';
                    input.focus();
                } else {
                    toast.error('Fout bij toevoegen van taak');
                }
            }, {
                operationId: 'add-task',
                showGlobal: true,
                message: 'Taak toevoegen...'
            });
        }
    }

    async renderTaken() {
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

        this.taken.forEach(taak => {
            const li = document.createElement('li');
            li.className = 'taak-item actie-item';
            
            const projectNaam = this.getProjectNaam(taak.projectId);
            const contextNaam = this.getContextNaam(taak.contextId);
            const datum = taak.verschijndatum ? new Date(taak.verschijndatum).toLocaleDateString('nl-NL') : '';
            const recurringIndicator = taak.herhalingActief ? ' <span class="recurring-indicator" title="Herhalende taak"><i class="fas fa-redo"></i></span>' : '';
            
            // Build extra info line
            let extraInfo = [];
            if (projectNaam) extraInfo.push(`<i class="ti ti-folder"></i> ${projectNaam}`);
            if (contextNaam) extraInfo.push(`🏷️ ${contextNaam}`);
            if (datum) extraInfo.push(`<i class="ti ti-calendar"></i> ${datum}`);
            if (taak.duur) extraInfo.push(`⏱️ ${taak.duur} min`);
            
            const extraInfoHtml = extraInfo.length > 0 ? 
                `<div class="taak-extra-info">${extraInfo.join(' • ')}</div>` : '';
            
            // Determine if checkbox should be checked (for completed tasks)
            const isCompleted = taak.afgewerkt;
            const checkboxChecked = isCompleted ? 'checked' : '';
            
            li.innerHTML = `
                <div class="taak-checkbox">
                    <input type="checkbox" id="taak-${taak.id}" ${checkboxChecked} onchange="app.taakAfwerken('${taak.id}')">
                </div>
                <div class="taak-content">
                    <div class="taak-titel" onclick="app.bewerkActieWrapper('${taak.id}')" style="cursor: pointer;" title="${taak.opmerkingen ? this.escapeHtml(taak.opmerkingen) : 'Klik om te bewerken'}">${taak.tekst}${recurringIndicator}</div>
                    ${extraInfoHtml}
                </div>
                <div class="taak-acties">
                    <button onclick="app.toonActiesMenu('${taak.id}', 'uitgesteld', '${this.huidigeLijst}')" class="acties-btn" title="Acties"><i class="fas fa-ellipsis-v"></i></button>
                    <button onclick="app.verwijderTaak('${taak.id}')" class="verwijder-btn" title="Verwijder taak">×</button>
                </div>
            `;
            
            lijst.appendChild(li);
        });
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
                    <div class="verplaats-dropdown">
                        <button class="verplaats-btn-small" onclick="app.toggleVerplaatsDropdownUitgesteld('${taak.id}')" title="Verplaats naar andere lijst">↗️</button>
                        <div class="verplaats-menu" id="verplaats-uitgesteld-${taak.id}" style="display: none;">
                            ${this.getVerplaatsOptiesUitgesteld(taak.id)}
                        </div>
                    </div>
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

    getVerplaatsOptiesUitgesteld(taakId) {
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
            .map(optie => `<button onclick="app.verplaatsUitgesteldeTaak('${taakId}', '${optie.key}')">${optie.label}</button>`)
            .join('');
    }

    toggleVerplaatsDropdownUitgesteld(id) {
        // Sluit alle andere dropdowns
        document.querySelectorAll('.verplaats-menu').forEach(menu => {
            if (menu.id !== `verplaats-uitgesteld-${id}`) {
                menu.style.display = 'none';
            }
        });

        // Toggle de specifieke dropdown
        const menu = document.getElementById(`verplaats-uitgesteld-${id}`);
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

    async verplaatsUitgesteldeTaak(id, naarLijst) {
        const taak = this.taken.find(t => t.id === id);
        if (!taak) return;

        // Als het naar dezelfde lijst gaat, doe niets
        if (naarLijst === this.huidigeLijst) {
            this.sluitAlleDropdowns();
            return;
        }

        await loading.withLoading(async () => {
            await this.verplaatsTaakNaarLijst(taak, naarLijst);
            // Remove from local list (no need to save - already done by server)
            this.taken = this.taken.filter(t => t.id !== id);
            await this.renderTaken();
            // Update counts 
            // await this.laadTellingen(); // Disabled - tellers removed from sidebar
        }, {
            operationId: 'verplaats-uitgestelde-taak',
            showGlobal: true,
            message: `Taak wordt verplaatst naar ${naarLijst}...`
        });
        
        // Sluit dropdown
        this.sluitAlleDropdowns();
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
                <div class="filter-groep filter-checkbox">
                    <label>
                        <input type="checkbox" id="toonToekomstToggle" ${this.toonToekomstigeTaken ? 'checked' : ''}>
                        Toon toekomstige taken
                    </label>
                </div>
                <div class="filter-groep" id="bulk-mode-toggle-container">
                    <button id="bulk-mode-toggle" class="bulk-mode-toggle" onclick="window.toggleBulkModus()">
                        Bulk bewerken
                    </button>
                </div>
                <div class="filter-groep" style="display: none;">
                    <button onclick="deleteAllTasks()" 
                            style="background: #ff3b30; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">
                        🗑️ Alles Wissen (Tijdelijk)
                    </button>
                </div>
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
        const lijst = document.getElementById('acties-lijst');
        if (!lijst) return;

        lijst.innerHTML = '';

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
            
            const extraInfoHtml = extraInfo.length > 0 ? 
                `<div class="taak-extra-info">${extraInfo.join(' • ')}</div>` : '';
            
            // In bulk modus: toon selectie cirkels in plaats van checkboxes
            const checkboxHtml = this.bulkModus ?
                `<div class="selectie-circle ${this.geselecteerdeTaken.has(taak.id) ? 'geselecteerd' : ''}" onclick="window.toggleTaakSelectie('${taak.id}')"></div>` :
                `<input type="checkbox" id="taak-${taak.id}" onchange="app.taakAfwerken('${taak.id}')">`;

            li.innerHTML = `
                <div class="taak-checkbox">
                    ${checkboxHtml}
                </div>
                <div class="taak-content" onclick="app.bewerkActieWrapper('${taak.id}')" style="cursor: pointer;" title="${taak.opmerkingen ? this.escapeHtml(taak.opmerkingen) : 'Klik om te bewerken'}">
                    <div class="taak-titel">${taak.tekst}${recurringIndicator}</div>
                    ${extraInfoHtml}
                </div>
                <div class="taak-acties">
                    <button onclick="app.toonActiesMenu('${taak.id}')" class="acties-btn" title="Acties"><i class="fas fa-ellipsis-v"></i></button>
                    <button onclick="app.verwijderTaak('${taak.id}')" class="verwijder-btn" title="Verwijder taak">×</button>
                </div>
            `;
            
            // Add bulk-selected class if needed
            if (this.bulkModus && this.geselecteerdeTaken.has(taak.id)) {
                li.classList.add('bulk-selected');
            }
            
            lijst.appendChild(li);
        });

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
                <td class="taak-naam-cell" onclick="app.bewerkActieWrapper('${taak.id}')" title="${this.escapeHtml(taak.tekst)}${taak.opmerkingen ? '\n\nOpmerkingen:\n' + this.escapeHtml(taak.opmerkingen) : ''}">${datumIndicator}${taak.tekst}${recurringIndicator}</td>
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
        
        try {
            return await loading.withLoading(async () => {
            taak.afgewerkt = new Date().toISOString();
            
            // Handle recurring tasks
            let nextRecurringTaskId = null;
            if (isRecurring) {
                if (taak.herhalingType.startsWith('event-')) {
                    // Handle event-based recurrence - ask for next event date
                    const nextEventDate = await this.askForNextEventDate(taak);
                    if (nextEventDate) {
                        const nextTaskDate = this.calculateEventBasedDate(nextEventDate, taak.herhalingType);
                        if (nextTaskDate) {
                            nextRecurringTaskId = await this.createNextRecurringTask(taak, nextTaskDate);
                        }
                    }
                } else {
                    console.log('<i class="fas fa-redo"></i> Calculating next recurring date for task:', {
                        verschijndatum: taak.verschijndatum,
                        herhalingType: taak.herhalingType,
                        taskObject: taak
                    });
                    
                    const nextDate = this.calculateNextRecurringDate(taak.verschijndatum, taak.herhalingType);
                    console.log('<i class="ti ti-calendar"></i> Calculated next date:', nextDate);
                    
                    if (nextDate) {
                        console.log('<i class="fas fa-check"></i> Next date exists, calling createNextRecurringTask...');
                        nextRecurringTaskId = await this.createNextRecurringTask(taak, nextDate);
                        console.log('🎯 createNextRecurringTask result:', nextRecurringTaskId);
                    } else {
                        console.error('<i class="ti ti-x"></i> nextDate is null/undefined - recurring task will not be created');
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
                    const nextDateFormatted = new Date(this.calculateNextRecurringDate(taak.verschijndatum, taak.herhalingType)).toLocaleDateString('nl-NL');
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
                                
                                // Re-render taken to show the new recurring task
                                this.preserveScrollPosition(() => this.renderTaken());
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
                // Rollback the afgewerkt timestamp
                delete taak.afgewerkt;
                toast.error('Fout bij afwerken van taak. Probeer opnieuw.');
            }
            
            // Always cleanup the completion tracking
            this.activeCompletions.delete(id);
        }, {
            operationId: `complete-task-${id}`,
            showGlobal: true,
            message: 'Taak afwerken...'
        });
        } catch (error) {
            console.error('Error in taakAfwerken:', error);
            this.activeCompletions.delete(id);
            throw error;
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
            showGlobal: false,
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

    async verwijderTaak(id) {
        const taak = this.taken.find(t => t.id === id);
        if (!taak) return;
        
        const bevestiging = await confirmModal.show('Taak Verwijderen', `Weet je zeker dat je "${taak.tekst}" wilt verwijderen?`);
        if (!bevestiging) return;
        
        await loading.withLoading(async () => {
            try {
                // Use DELETE endpoint for single task deletion
                const response = await fetch(`/api/taak/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    // Remove from local array
                    this.taken = this.taken.filter(taak => taak.id !== id);
                    
                    // Re-render with preserved filters and scroll position for actions list
                    if (this.huidigeLijst === 'acties') {
                        await this.preserveActionsFilters(() => this.renderTaken());
                    } else {
                        this.renderTaken();
                    }
                    // await this.laadTellingen(); // Disabled - tellers removed from sidebar
                    
                    console.log(`<i class="fas fa-check"></i> Task ${id} deleted successfully`);
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

    toonActiesMenu(taakId, menuType = 'acties', huidigeLijst = null) {
        const taak = this.taken.find(t => t.id === taakId);
        if (!taak) return;

        // Verwijder bestaande menu als die er is
        const bestaandMenu = document.querySelector('.acties-menu-overlay');
        if (bestaandMenu) {
            bestaandMenu.remove();
        }

        // Genereer verschillende menu content op basis van type
        let menuContentHTML = '';
        
        if (menuType === 'acties') {
            // Voor acties lijst: datum opties + uitgesteld + opvolgen
            const vandaag = new Date();
            const weekdag = vandaag.getDay(); // 0 = zondag, 1 = maandag, etc.
            const dagenVanDeWeek = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
            
            // Genereer de rest van de week dagen
            let weekdagenHTML = '';
            const dagenTotZondag = weekdag === 0 ? 0 : (7 - weekdag);
            
            for (let i = 2; i <= dagenTotZondag; i++) {
                const datum = new Date(vandaag);
                datum.setDate(datum.getDate() + i);
                const dagNaam = dagenVanDeWeek[datum.getDay()];
                weekdagenHTML += `<button onclick="app.stelDatumIn('${taakId}', ${i})" class="menu-item">${dagNaam}</button>`;
            }
            
            menuContentHTML = `
                <h3>Plan op</h3>
                <div class="menu-section">
                    <button onclick="app.stelDatumIn('${taakId}', 0)" class="menu-item">Vandaag</button>
                    <button onclick="app.stelDatumIn('${taakId}', 1)" class="menu-item">Morgen</button>
                    ${weekdagenHTML}
                </div>
                
                <h3>Uitgesteld</h3>
                <div class="menu-section">
                    <button onclick="app.verplaatsNaarUitgesteld('${taakId}', 'uitgesteld-wekelijks')" class="menu-item">Wekelijks</button>
                    <button onclick="app.verplaatsNaarUitgesteld('${taakId}', 'uitgesteld-maandelijks')" class="menu-item">Maandelijks</button>
                    <button onclick="app.verplaatsNaarUitgesteld('${taakId}', 'uitgesteld-3maandelijks')" class="menu-item">3-maandelijks</button>
                    <button onclick="app.verplaatsNaarUitgesteld('${taakId}', 'uitgesteld-6maandelijks')" class="menu-item">6-maandelijks</button>
                    <button onclick="app.verplaatsNaarUitgesteld('${taakId}', 'uitgesteld-jaarlijks')" class="menu-item">Jaarlijks</button>
                </div>
                
                <div class="menu-section">
                    <button onclick="app.verplaatsNaarOpvolgen('${taakId}')" class="menu-item opvolgen">Opvolgen</button>
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
                
                <h3>Andere uitgesteld lijsten</h3>
                <div class="menu-section">
                    ${uitgesteldButtonsHTML}
                </div>
                
                <div class="menu-section">
                    <button onclick="app.verplaatsNaarOpvolgen('${taakId}')" class="menu-item opvolgen">Opvolgen</button>
                </div>
            `;
        }

        // Maak de menu overlay
        const menuOverlay = document.createElement('div');
        menuOverlay.className = 'acties-menu-overlay';
        menuOverlay.onclick = (e) => {
            if (e.target === menuOverlay) {
                menuOverlay.remove();
            }
        };

        const menuContent = document.createElement('div');
        menuContent.className = 'acties-menu-content';
        menuContent.innerHTML = `
            <div class="acties-menu">
                ${menuContentHTML}
                
                <button onclick="document.querySelector('.acties-menu-overlay').remove()" class="menu-close">Sluiten</button>
            </div>
        `;

        menuOverlay.appendChild(menuContent);
        document.body.appendChild(menuOverlay);
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
                if (menuOverlay) menuOverlay.remove();
                
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
                
                // Herlaad de lijst en tellingen om de update te tonen
                await this.laadHuidigeLijst();
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
        document.querySelector('.acties-menu-overlay').remove();
    }

    async verplaatsNaarUitgesteld(taakId, lijstNaam) {
        const taak = this.taken.find(t => t.id === taakId);
        if (!taak) return;

        await loading.withLoading(async () => {
            await this.verplaatsTaakNaarLijst(taak, lijstNaam);
            
            // Sluit menu
            const menuOverlay = document.querySelector('.acties-menu-overlay');
            if (menuOverlay) menuOverlay.remove();
            
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
            if (menuOverlay) menuOverlay.remove();
            
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
        const naam = await inputModal.show('Nieuw Project', 'Naam voor het nieuwe project:');
        if (naam && naam.trim()) {
            const nieuwProject = {
                id: this.generateId(),
                naam: naam.trim(),
                aangemaakt: new Date().toISOString()
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

        console.log('maakActie - herhalingType:', herhalingType);
        console.log('maakActie - herhalingActief:', !!herhalingType);

        if (!taakNaam || !verschijndatum || !contextId || !duur) {
            toast.warning('Alle velden behalve project zijn verplicht!');
            return;
        }

        const maakActieBtn = document.getElementById('maakActieBtn');
        
        // Voor inbox taken: hou loading actief tot volgende taak geladen is
        const isInboxTaak = this.huidigeLijst !== 'acties';
        
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
                        herhalingActief: !!herhalingType
                    };
                    
                    const response = await fetch(`/api/taak/${this.huidigeTaakId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData)
                    });
                    
                    if (response.ok) {
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
                    herhalingActief: !!herhalingType
                };

                // Save the new action via direct single action API (bypasses list corruption issues)
                const response = await fetch('/api/debug/add-single-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(actie)
                });
                
                if (response.ok) {
                    console.log('<i class="fas fa-check"></i> Actie succesvol opgeslagen met herhaling:', herhalingType);
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
        
        this.sluitPopup();
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
        if (!projectId) return 'Geen project';
        const project = this.projecten.find(p => p.id === projectId);
        return project ? project.naam : 'Onbekend project';
    }

    getContextNaam(contextId) {
        if (!contextId) return 'Geen context';
        const context = this.contexten.find(c => c.id === contextId);
        return context ? context.naam : 'Onbekende context';
    }

    async removePrioriteit(position) {
        const index = position - 1;
        const taak = this.topPrioriteiten[index];
        
        if (taak) {
            await loading.withLoading(async () => {
                // Remove priority from server
                await fetch(`/api/taak/${taak.id}/prioriteit`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prioriteit: null })
                });
                
                // Update local state
                this.topPrioriteiten[index] = null;
                
                // Re-render slots
                const prioriteitSlots = document.getElementById('prioriteitSlots');
                if (prioriteitSlots) {
                    prioriteitSlots.innerHTML = this.renderPrioriteitSlots();
                    this.bindPrioriteitEvents();
                }
                
                // Update planning grid to remove golden styling
                await this.updatePlanningGridAfterPriorityChange();
                
                toast.success(`Taak verwijderd uit prioriteit ${position}`);
            }, {
                operationId: 'remove-priority',
                showGlobal: true,
                message: 'Prioriteit verwijderen...'
            });
        }
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

    bindPrioriteitEvents() {
        // Enable drag and drop for priority slots
        const prioriteitSlots = document.querySelectorAll('.prioriteit-slot');
        prioriteitSlots.forEach(slot => {
            // Enable drop events
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                const position = parseInt(slot.dataset.position);
                const currentTaskCount = this.topPrioriteiten.filter(t => t !== null).length;
                const targetSlot = this.topPrioriteiten[position - 1];
                
                // Parse drag data to check if it's from our own priorities (reordering)
                let isReordering = false;
                try {
                    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                    isReordering = dragData.type === 'prioriteit';
                } catch (error) {
                    // Not JSON or error parsing, assume external drag
                    isReordering = false;
                }
                
                // Allow drop if:
                // 1. Slot is empty and we have space (< 3 total)
                // 2. It's internal reordering (moving within priorities)
                if ((!targetSlot && currentTaskCount < 3) || isReordering) {
                    slot.classList.add('drag-over');
                } else {
                    slot.classList.add('drag-rejected');
                }
            });
            
            slot.addEventListener('dragleave', (e) => {
                slot.classList.remove('drag-over', 'drag-rejected');
            });
            
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over', 'drag-rejected');
                
                const position = parseInt(slot.dataset.position);
                
                // Parse drag data - should be JSON now
                let taakId;
                try {
                    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                    if (dragData.type === 'actie' || dragData.type === 'prioriteit') {
                        taakId = dragData.actieId;
                    } else {
                        console.log('🔍 Unknown drag type:', dragData.type);
                        return;
                    }
                } catch (error) {
                    console.error('🔍 Failed to parse drag data:', error);
                    toast.error('Fout bij verwerken drag data');
                    return;
                }
                
                console.log('🔍 Extracted task ID:', taakId);
                this.handlePriorityDrop(taakId, position);
            });
        });
        
        // Enable drag for existing priority tasks
        const prioriteitTaken = document.querySelectorAll('.prioriteit-taak');
        prioriteitTaken.forEach(taak => {
            taak.addEventListener('dragstart', (e) => {
                const slot = taak.closest('.prioriteit-slot');
                const taakId = slot.dataset.taakId;
                
                // Find the task to get duration
                const taskData = this.topPrioriteiten.find(t => t && t.id === taakId);
                const duurMinuten = taskData?.duur || 60;
                
                // Send JSON data like other draggable items
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'prioriteit',
                    actieId: taakId,
                    duurMinuten: duurMinuten
                }));
                e.dataTransfer.effectAllowed = 'move';
            });
        });
    }

    async handlePriorityDrop(taakId, position) {
        await loading.withLoading(async () => {
            // Check if this task is already in priorities (prevent duplicates)
            const isAlreadyInPriorities = this.topPrioriteiten.some(p => p && p.id === taakId);
            if (isAlreadyInPriorities) {
                toast.warning('Deze taak staat al in je Top 3 prioriteiten!');
                return;
            }
            
            // Debug logging
            console.log('🔍 Looking for task with ID:', taakId);
            console.log('🔍 planningActies array:', this.planningActies?.length || 0, 'items');
            console.log('🔍 taken array:', this.taken?.length || 0, 'items');
            
            // Find task in actions list
            const taak = this.planningActies?.find(t => t.id === taakId) || 
                        this.taken?.find(t => t.id === taakId);
            
            console.log('🔍 Found task:', taak);
            
            if (!taak) {
                console.error('❌ Task not found! Available IDs in planningActies:', this.planningActies?.map(t => t.id));
                console.error('❌ Available IDs in taken:', this.taken?.map(t => t.id));
                toast.error('Taak niet gevonden');
                return;
            }
            
            // Set priority on server
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`/api/taak/${taakId}/prioriteit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prioriteit: position, 
                    datum: today 
                })
            });
            
            // Check for server-side validation errors
            if (!response.ok) {
                const errorData = await response.json();
                toast.error(errorData.error || 'Fout bij instellen prioriteit');
                return;
            }
            
            // Update local state
            this.topPrioriteiten[position - 1] = taak;
            
            // Remove from planning actions list (so it doesn't show in sidebar anymore)
            if (this.planningActies) {
                this.planningActies = this.planningActies.filter(t => t.id !== taakId);
            }
            
            // Re-render slots
            const prioriteitSlots = document.getElementById('prioriteitSlots');
            if (prioriteitSlots) {
                prioriteitSlots.innerHTML = this.renderPrioriteitSlots();
                this.bindPrioriteitEvents();
            }
            
            // Re-render actions list to remove the task
            const actiesContainer = document.getElementById('planningActiesLijst');
            if (actiesContainer) {
                const today = new Date().toISOString().split('T')[0];
                const ingeplandeResponse = await fetch(`/api/ingeplande-acties/${today}`);
                const ingeplandeActies = ingeplandeResponse.ok ? await ingeplandeResponse.json() : [];
                actiesContainer.innerHTML = this.renderActiesVoorPlanning(this.planningActies, ingeplandeActies);
                this.bindDragAndDropEvents();
            }
            
            // Update planning grid to show golden styling for new priority
            await this.updatePlanningGridAfterPriorityChange();
            
            toast.success(`"${taak.tekst}" toegevoegd als prioriteit ${position}`);
        }, {
            operationId: 'add-priority',
            showGlobal: true,
            message: 'Prioriteit instellen...'
        });
    }

    async loadTopPrioriteiten() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`/api/prioriteiten/${today}`);
            
            if (response.ok) {
                const prioriteiten = await response.json();
                
                // Initialize empty array
                this.topPrioriteiten = [null, null, null];
                
                // Fill in priorities based on their position
                prioriteiten.forEach(taak => {
                    if (taak.top_prioriteit >= 1 && taak.top_prioriteit <= 3) {
                        this.topPrioriteiten[taak.top_prioriteit - 1] = taak;
                    }
                });
                
                console.log('Loaded top priorities:', this.topPrioriteiten);
            } else {
                console.log('No priorities found for today');
                this.topPrioriteiten = [null, null, null];
            }
        } catch (error) {
            console.error('Error loading priorities:', error);
            this.topPrioriteiten = [null, null, null];
        }
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
            console.log('🔍 Start resize triggered');
            e.preventDefault();
            e.stopPropagation();
            
            isResizing = true;
            startX = e.clientX || (e.touches && e.touches[0].clientX);
            startSidebarWidth = (sidebar.offsetWidth / container.offsetWidth) * 100;
            
            console.log('🔍 Resize started:', { startX, startSidebarWidth });
            
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            document.body.style.pointerEvents = 'none'; // Prevent interference
            splitter.style.pointerEvents = 'auto'; // Keep splitter active
            
            // Add visual feedback
            splitter.classList.add('resizing');
        };

        const doResize = (e) => {
            if (!isResizing) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const currentX = e.clientX || (e.touches && e.touches[0].clientX);
            const deltaX = currentX - startX;
            const containerWidth = container.offsetWidth;
            const deltaPercent = (deltaX / containerWidth) * 100;
            
            let newSidebarWidth = startSidebarWidth + deltaPercent;
            
            // Constrain width between 20% and 80%
            newSidebarWidth = Math.max(20, Math.min(80, newSidebarWidth));
            
            const newCalendarWidth = 100 - newSidebarWidth;
            
            console.log('🔍 Resizing:', { currentX, deltaX, newSidebarWidth });
            
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
            'templates': !isLaptop, // Open on desktop, closed on laptop
            'prioriteiten': true // Always open by default
        };
        
        // Apply saved states or defaults
        ['tijd', 'templates', 'prioriteiten'].forEach(section => {
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
            this.renderTaken();
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

        // Ensure tools dropdown is open
        const toolsContent = document.getElementById('tools-content');
        const toolsDropdown = document.getElementById('tools-dropdown');
        if (toolsContent && toolsDropdown) {
            toolsContent.style.display = 'block';
            const arrow = toolsDropdown.querySelector('.dropdown-arrow');
            if (arrow) {
                arrow.textContent = '▼';
            }
        }

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
        console.log('restoreNormalContainer: starting restoration...', { 
            targetLijst, 
            currentLijst: this.huidigeLijst 
        });
        
        // Ensure sidebar is visible
        const sidebar = document.querySelector('.sidebar');
        const appLayout = document.querySelector('.app-layout');
        if (sidebar) {
            sidebar.style.display = '';
            sidebar.style.width = '';
            console.log('restoreNormalContainer: sidebar visibility restored');
        }
        if (appLayout) {
            appLayout.style.flexDirection = '';
            console.log('restoreNormalContainer: app layout restored');
        }
        
        // Restore the normal taken container structure
        const takenLijst = document.getElementById('takenLijst');
        if (!takenLijst) {
            console.log('restoreNormalContainer: takenLijst not found, checking DOM state...');
            // If takenLijst doesn't exist, find the content area and restore structure
            const contentArea = document.querySelector('.content-area');
            const mainContent = document.querySelector('.main-content');
            const dailyPlanning = document.querySelector('.dagelijkse-planning-layout');
            
            console.log('restoreNormalContainer: DOM check:', {
                contentArea: !!contentArea,
                mainContent: !!mainContent,
                dailyPlanning: !!dailyPlanning,
                dailyPlanningInMain: !!(mainContent && mainContent.querySelector('.dagelijkse-planning-layout'))
            });
            
            // Check if we're coming from daily planning FIRST (before checking contentArea)
            if (mainContent && mainContent.querySelector('.dagelijkse-planning-layout')) {
                console.log('restoreNormalContainer: detected daily planning layout, completely replacing...');
                
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
                console.log('restoreNormalContainer: setting title to:', currentTitle, { targetLijst, currentLijst: this.huidigeLijst });
                
                // Only show input container for inbox
                const inputContainerHTML = (targetLijst || this.huidigeLijst) === 'inbox' ? `
                    <div class="taak-input-container" id="taak-input-container">
                        <input type="text" id="taakInput" placeholder="Nieuwe taak..." autofocus>
                        <button id="toevoegBtn">Toevoegen</button>
                    </div>
                ` : '';
                
                const newHTML = `
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
                
                console.log('restoreNormalContainer: about to replace mainContent.innerHTML');
                console.log('restoreNormalContainer: newHTML preview:', newHTML.substring(0, 200) + '...');
                
                mainContent.innerHTML = newHTML;
                
                console.log('restoreNormalContainer: main-content innerHTML replaced');
                
                // Verify immediately
                const verifyTitle = document.getElementById('page-title');
                console.log('restoreNormalContainer: immediate verification:', {
                    found: !!verifyTitle,
                    text: verifyTitle ? verifyTitle.textContent : 'NOT FOUND',
                    mainContentHTML: mainContent.innerHTML.substring(0, 200) + '...'
                });
                
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

        // Ensure tools dropdown is open
        const toolsContent = document.getElementById('tools-content');
        const toolsDropdown = document.getElementById('tools-dropdown');
        if (toolsContent && toolsDropdown) {
            toolsContent.style.display = 'block';
            const arrow = toolsDropdown.querySelector('.dropdown-arrow');
            if (arrow) {
                arrow.textContent = '▼';
            }
        }

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

        // Ensure tools dropdown is open
        const toolsContent = document.getElementById('tools-content');
        const toolsDropdown = document.getElementById('tools-dropdown');
        if (toolsContent && toolsDropdown) {
            toolsContent.style.display = 'block';
            const arrow = toolsDropdown.querySelector('.dropdown-arrow');
            if (arrow) {
                arrow.textContent = '▼';
            }
        }

        // Update page title
        document.getElementById('page-title').textContent = 'Zoeken';

        // Hide task input
        const taakInputContainer = document.getElementById('taak-input-container');
        if (taakInputContainer) {
            taakInputContainer.style.display = 'none';
        }

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
                                        <span><i class="ti ti-inbox"></i> Inbox</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="filter-acties" checked>
                                        <span><i class="fas fa-clipboard"></i> Acties</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="filter-opvolgen" checked>
                                        <span>⏳ Opvolgen</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="filter-uitgesteld" checked>
                                        <span><i class="ti ti-calendar"></i> Uitgesteld</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="filter-afgewerkt">
                                        <span><i class="fas fa-check"></i> Afgewerkt</span>
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
                        <div class="resultaat-hoofdtekst">${highlightedText}${recurringIndicator}</div>
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
        
        // Load top priorities for today
        await this.loadTopPrioriteiten();
        
        // Laad dagelijkse planning voor vandaag
        const planningResponse = await fetch(`/api/dagelijkse-planning/${today}`);
        const planning = planningResponse.ok ? await planningResponse.json() : [];
        
        // Store planning data locally for fast updates
        this.currentPlanningData = planning;
        
        // Laad ingeplande acties voor indicator
        const ingeplandeResponse = await fetch(`/api/ingeplande-acties/${today}`);
        const ingeplandeActies = ingeplandeResponse.ok ? await ingeplandeResponse.json() : [];
        
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
                    
                    <!-- Top 3 Priorities - collapsible section -->
                    <div class="top-prioriteiten-sectie collapsible" id="prioriteiten-sectie">
                        <div class="section-header" onclick="app.toggleSection('prioriteiten')">
                            <h3>⭐ Top 3 Prioriteiten</h3>
                            <span class="chevron"><i class="fas fa-chevron-down"></i></span>
                        </div>
                        <div class="section-content">
                            <div class="prioriteit-slots" id="prioriteitSlots">
                                ${this.renderPrioriteitSlots()}
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
        this.bindPrioriteitEvents();
        this.initPlanningResizer();
        this.initCollapsibleSections();
        this.updateTotaalTijd();
        
        // Populate filter dropdowns
        this.populatePlanningFilters();
        
        // Start current hour tracking for this daily planning view
        this.startCurrentHourTracking();
    }

    renderPrioriteitSlots() {
        // Initialize priorities array if not exists
        if (!this.topPrioriteiten) {
            this.topPrioriteiten = [null, null, null]; // 3 slots: positions 0, 1, 2
        }
        
        return [1, 2, 3].map(position => {
            const index = position - 1;
            const taak = this.topPrioriteiten[index];
            
            if (taak) {
                // Handle both database format (project_id) and frontend format (projectId)
                const projectId = taak.project_id || taak.projectId;
                const contextId = taak.context_id || taak.contextId;
                
                const projectNaam = this.getProjectNaam(projectId);
                const contextNaam = this.getContextNaam(contextId);
                const duurText = taak.duur ? `${taak.duur}min` : '';
                
                return `
                    <div class="prioriteit-slot filled" data-position="${position}" data-taak-id="${taak.id}">
                        <div class="slot-nummer">${position}</div>
                        <div class="slot-content">
                            <div class="prioriteit-taak" draggable="true">
                                <div class="prioriteit-titel">${taak.tekst}</div>
                                <div class="prioriteit-details">${projectNaam} • ${contextNaam} • ${duurText}</div>
                            </div>
                        </div>
                        <button class="remove-prioriteit" onclick="app.removePrioriteit(${position})" title="Verwijder uit prioriteiten">×</button>
                    </div>
                `;
            } else {
                return `
                    <div class="prioriteit-slot empty" data-position="${position}">
                        <div class="slot-nummer">${position}</div>
                        <div class="slot-content">
                            <div class="slot-placeholder">Sleep hier je belangrijkste taak</div>
                        </div>
                    </div>
                `;
            }
        }).join('');
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
            
            return `
                <div class="${itemClass}" draggable="true" data-actie-id="${actie.id}" data-duur="${actie.duur || 60}">
                    <div class="actie-row">
                        <div class="actie-tekst">${datumIndicator}${actie.tekst}</div>
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
                            ${this.renderPlanningItemsWithDropZones(uurPlanning, uur)}
                        </div>
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    renderPlanningItem(planningItem) {
        const typeIcon = {
            'taak': '<i class="fas fa-ellipsis-v"></i>',
            'geblokkeerd': '🔒',
            'pauze': '☕'
        }[planningItem.type] || '<i class="fas fa-ellipsis-v"></i>';
        
        const naam = planningItem.naam || planningItem.actieTekst || 'Onbekend';
        
        // Check if this task is in top priorities
        const isPriority = planningItem.type === 'taak' && planningItem.actieId && 
                          this.topPrioriteiten?.some(p => p && p.id === planningItem.actieId);
        
        // Add priority styling and icon if it's a priority task
        const priorityClass = isPriority ? ' priority-task' : '';
        const priorityIcon = isPriority ? '<span class="priority-indicator">⭐</span>' : '';
        
        // Add checkbox for tasks (but not for blocked time or breaks)
        const checkbox = planningItem.type === 'taak' && planningItem.actieId ? 
            `<input type="checkbox" class="task-checkbox" data-actie-id="${planningItem.actieId}" onclick="app.completePlanningTask('${planningItem.actieId}', this)">` : '';
        
        // Make template items (geblokkeerd, pauze) editable
        const isTemplateItem = planningItem.type === 'geblokkeerd' || planningItem.type === 'pauze';
        
        // Only tasks are expandable
        const isExpandable = planningItem.type === 'taak' && planningItem.actieId;
        const expandableClass = isExpandable ? ' expandable' : '';
        
        // Get task details if it's a task
        let taskDetails = null;
        if (isExpandable) {
            const actie = this.planningActies?.find(t => t.id === planningItem.actieId) || 
                         this.taken?.find(t => t.id === planningItem.actieId) ||
                         this.topPrioriteiten?.find(t => t && t.id === planningItem.actieId);
            if (actie) {
                taskDetails = {
                    project: this.getProjectNaam(actie.project_id || actie.projectId),
                    context: this.getContextNaam(actie.context_id || actie.contextId),
                    deadline: actie.verschijndatum ? new Date(actie.verschijndatum).toLocaleDateString('nl-NL') : null,
                    duur: actie.duur,
                    opmerkingen: actie.opmerkingen
                };
            }
        }
        
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
                    ${naamElement}
                    <span class="planning-duur">${planningItem.duurMinuten}min</span>
                    <button class="delete-planning" onclick="app.deletePlanningItem('${planningItem.id}')">×</button>
                </div>
                ${detailsHtml}
            </div>
        `;
    }

    renderPlanningItemsWithDropZones(uurPlanning, uur) {
        if (uurPlanning.length === 0) {
            // Empty hour - just return a drop zone
            return `<div class="drop-zone" data-uur="${uur}" data-position="0"></div>`;
        }

        let html = `<div class="drop-zone" data-uur="${uur}" data-position="0"></div>`;
        
        uurPlanning.forEach((item, index) => {
            html += this.renderPlanningItem(item);
            html += `<div class="drop-zone" data-uur="${uur}" data-position="${index + 1}"></div>`;
        });
        
        return html;
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
        const datumFilter = document.getElementById('planningDatumFilter');
        const duurFilter = document.getElementById('planningDuurFilter');
        const toekomstToggle = document.getElementById('planningToekomstToggle');
        
        if (taakFilter) taakFilter.addEventListener('input', () => this.filterPlanningActies());
        if (projectFilter) projectFilter.addEventListener('change', () => this.filterPlanningActies());
        if (contextFilter) contextFilter.addEventListener('change', () => this.filterPlanningActies());
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
        
        // Template drag start
        document.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'template',
                    planningType: item.dataset.type,
                    duurMinuten: parseInt(item.dataset.duur)
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
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
            });
        });
        
        // Action drag functionality (from actions list)
        document.querySelectorAll('.planning-actie-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'actie',
                    actieId: item.dataset.actieId,
                    duurMinuten: parseInt(item.dataset.duur)
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
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
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
            });

            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
            });
        });
        
        // Drop zone handlers for hour content
        document.querySelectorAll('.uur-content').forEach(dropZone => {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            
            dropZone.addEventListener('dragleave', (e) => {
                if (!dropZone.contains(e.relatedTarget)) {
                    dropZone.classList.remove('drag-over');
                }
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                const uur = parseInt(dropZone.dataset.uur);
                
                if (data.type === 'planning-reorder') {
                    this.handlePlanningReorder(data, uur, null); // null = append to end
                } else {
                    this.handleDrop(data, uur);
                }
            });
        });

        // Drop zone handlers for precise positioning
        document.querySelectorAll('.drop-zone').forEach(dropZone => {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drop-zone-active');
            });
            
            dropZone.addEventListener('dragleave', (e) => {
                dropZone.classList.remove('drop-zone-active');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Stop event bubbling to prevent double handling
                dropZone.classList.remove('drop-zone-active');
                
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                const uur = parseInt(dropZone.dataset.uur);
                const position = parseInt(dropZone.dataset.position);
                
                if (data.type === 'planning-reorder') {
                    this.handlePlanningReorder(data, uur, position);
                } else {
                    this.handleDropAtPosition(data, uur, position);
                }
            });
        });
        
        // Reset binding flag
        this.bindingInProgress = false;
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
        
        // Clone drop zones to remove event listeners
        document.querySelectorAll('.uur-content, .drop-zone').forEach(zone => {
            const newZone = zone.cloneNode(true);
            if (zone.parentNode) {
                zone.parentNode.replaceChild(newZone, zone);
            }
        });
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
        
        return await loading.withLoading(async () => {
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
                    planningItem.naam = projectNaam !== 'Geen project' ? `${actie.tekst} (${projectNaam})` : actie.tekst;
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
                            planningItem.naam = projectNaam !== 'Geen project' ? `${actie.tekst} (${projectNaam})` : actie.tekst;
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
            
            // Always clean up the operation key
            if (this.activeDropOperations) {
                this.activeDropOperations.delete(operationKey);
            }
        }, {
            operationId: position !== null ? 'add-planning-position' : 'add-planning',
            showGlobal: true, // Show loading indicator
            message: 'Item toevoegen...'
        }).finally(() => {
            // Ensure cleanup even if withLoading fails
            if (this.activeDropOperations) {
                this.activeDropOperations.delete(operationKey);
            }
        });
    }

    async handleDropAtPosition(data, uur, position) {
        return this.handleDropInternal(data, uur, position);
    }
    
    async updatePlanningLocally(planningItem, serverResponse) {
        console.log('<i class="fas fa-redo"></i> updatePlanningLocally called with:', { planningItem, serverResponse });
        
        // First, fetch the current planning data from server to ensure we have all items
        const today = new Date().toISOString().split('T')[0];
        try {
            const planningResponse = await fetch(`/api/dagelijkse-planning/${today}`);
            if (planningResponse.ok) {
                this.currentPlanningData = await planningResponse.json();
                console.log('📊 Fetched current planning data:', this.currentPlanningData.length, 'items');
                
                // The server response already includes the new item, so we don't need to add it again
                // Just update the display with the current data from server
            } else {
                // Fallback: if fetch fails, manually add the item
                if (!this.currentPlanningData) {
                    this.currentPlanningData = [];
                }
                
                // Only add if server fetch failed
                const newItem = {
                    ...planningItem,
                    id: serverResponse.id || Math.random().toString(36),
                    ...serverResponse
                };
                
                console.log('➕ Adding to currentPlanningData (fallback):', newItem);
                this.currentPlanningData.push(newItem);
            }
        } catch (error) {
            console.error('Error fetching planning data:', error);
            // Fallback: if fetch fails, manually add the item
            if (!this.currentPlanningData) {
                this.currentPlanningData = [];
            }
            
            const newItem = {
                ...planningItem,
                id: serverResponse.id || Math.random().toString(36),
                ...serverResponse
            };
            
            console.log('➕ Adding to currentPlanningData (error fallback):', newItem);
            this.currentPlanningData.push(newItem);
        }
        
        // Update only the affected hour in the calendar
        this.updateSingleHourDisplay(planningItem.uur);
    }
    
    updateSingleHourDisplay(uur) {
        const uurElement = document.querySelector(`[data-uur="${uur}"] .uur-planning`);
        if (!uurElement) return;
        
        // Get planning for this specific hour
        const uurPlanning = this.currentPlanningData?.filter(p => p.uur === uur) || [];
        
        // Update the content
        uurElement.innerHTML = this.renderPlanningItemsWithDropZones(uurPlanning, uur);
        
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
                    uurTotaalElement.textContent = `(${totaalMinuten} min${isOverboekt ? ' <i class="ti ti-alert-circle"></i>' : ''})`;
                } else {
                    // Add totaal tijd element if it doesn't exist
                    const newTotaalElement = document.createElement('div');
                    newTotaalElement.className = 'uur-totaal-tijd';
                    newTotaalElement.textContent = `(${totaalMinuten} min${isOverboekt ? ' <i class="ti ti-alert-circle"></i>' : ''})`;
                    uurLabelElement.appendChild(newTotaalElement);
                }
            } else if (uurTotaalElement) {
                uurTotaalElement.remove();
            }
        }
        
        // Re-bind drag and drop events for new elements (with throttling)
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
                })
                .catch(error => {
                    console.error('Error updating actions list:', error);
                    // Fallback: simple filter without ingeplande check
                    actiesContainer.innerHTML = this.renderActiesVoorPlanning(this.planningActies || this.taken, []);
                    // Bind events only for the new actions in the list
                    this.bindActionsListEvents();
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
        // Only bind drag events for action items in the planning actions list
        document.querySelectorAll('#planningActiesLijst [data-actie-id]').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'actie',
                    actieId: item.dataset.actieId,
                    duurMinuten: parseInt(item.dataset.duur) || 30
                }));
                
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
            });
            
            item.addEventListener('dragend', (e) => {
                // Restore opacity
                item.style.opacity = '1';
            });
        });
    }

    async handlePlanningReorder(data, targetUur, targetPosition) {
        const today = new Date().toISOString().split('T')[0];
        
        // If moving within same hour and no position change, do nothing
        if (data.currentUur === targetUur && targetPosition === null) {
            return;
        }
        
        return await loading.withLoading(async () => {
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
        }, {
            operationId: 'reorder-planning',
            showGlobal: true, // Show loading indicator
            message: 'Verplaatsen...'
        });
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

    async deletePlanningItem(planningId) {
        await loading.withLoading(async () => {
            try {
                const response = await fetch(`/api/dagelijkse-planning/${planningId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    // Remove from local data and update only the affected area
                    this.removePlanningItemLocally(planningId);
                    this.updateTotaalTijd(); // Update total time
                    toast.success('Planning item verwijderd!');
                } else {
                    toast.error('Fout bij verwijderen planning item');
                }
            } catch (error) {
                console.error('Error deleting planning item:', error);
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
        if (!this.currentPlanningData) return;
        
        // Find the item to get its hour before removing
        const item = this.currentPlanningData.find(p => p.id === planningId);
        if (!item) return;
        
        const affectedHour = item.uur;
        
        // Remove from local data
        this.currentPlanningData = this.currentPlanningData.filter(p => p.id !== planningId);
        
        // Update only the affected hour display
        this.updateSingleHourDisplay(affectedHour);
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
        
        return await loading.withLoading(async () => {
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
            if (isRecurring) {
                console.log('🔁 Creating next recurring task...');
                if (taak.herhalingType.startsWith('event-')) {
                    // Handle event-based recurrence - ask for next event date
                    const nextEventDate = await this.askForNextEventDate(taak);
                    if (nextEventDate) {
                        const nextTaskDate = this.calculateEventBasedDate(nextEventDate, taak.herhalingType);
                        if (nextTaskDate) {
                            nextRecurringTaskId = await this.createNextRecurringTask(taak, nextTaskDate);
                            console.log('✨ Event-based recurring task created:', nextRecurringTaskId);
                        }
                    }
                } else {
                    const nextDate = this.calculateNextRecurringDate(taak.verschijndatum, taak.herhalingType);
                    if (nextDate) {
                        nextRecurringTaskId = await this.createNextRecurringTask(taak, nextDate);
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
                    const nextDateFormatted = new Date(this.calculateNextRecurringDate(taak.verschijndatum, taak.herhalingType)).toLocaleDateString('nl-NL');
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
                toast.error('Fout bij afwerken van taak. Probeer opnieuw.');
            }
            } catch (error) {
                console.error('Error completing planning task:', error);
                checkboxElement.checked = false;
                toast.error('Fout bij afwerken van taak. Probeer opnieuw.');
            }
        }, {
            operationId: 'complete-planning-task',
            showGlobal: true,
            button: checkboxElement?.closest('.task-checkbox'),
            message: 'Taak afwerken...'
        });
    }

    filterPlanningActies() {
        const taakFilter = document.getElementById('planningTaakFilter')?.value.toLowerCase() || '';
        const projectFilter = document.getElementById('planningProjectFilter')?.value || '';
        const contextFilter = document.getElementById('planningContextFilter')?.value || '';
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

        // Show loading indicator
        loading.show('Bulk actie uitvoeren...');

        try {
            let newDate;
            const today = new Date();
            
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

            // Process selected tasks
            const selectedIds = Array.from(this.geselecteerdeTaken);
            let successCount = 0;
            
            for (const taakId of selectedIds) {
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
            
            toast.success(`${successCount} taken bijgewerkt naar ${newDate}`);
            
            // Reset bulk mode and reload
            this.toggleBulkModus();
            this.laadHuidigeLijst();
            
        } finally {
            loading.hide();
        }
    }

    getBulkVerplaatsKnoppen() {
        // Use the same logic as individual task dropdown menus
        if (this.huidigeLijst === 'acties') {
            // For actions list: show dagens datum opties + uitgesteld opties
            return `
                <button onclick="window.bulkDateAction('vandaag')" class="bulk-action-btn">Vandaag</button>
                <button onclick="window.bulkDateAction('morgen')" class="bulk-action-btn">Morgen</button>
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

        // Show loading indicator
        loading.show('Taken uitstellen...');

        try {
            const selectedIds = Array.from(this.geselecteerdeTaken);
            let successCount = 0;
            
            for (const taakId of selectedIds) {
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
            
            toast.success(`${successCount} taken verplaatst naar ${lijstLabels[lijstNaam]}`);
            
            // Reset bulk mode and reload
            this.toggleBulkModus();
            this.laadHuidigeLijst();
            
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
            document.getElementById('loginEmail').focus();
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
                this.currentUser = data.user;
                this.isAuthenticated = true;
                this.updateUI();
                this.hideLoginModal();
                
                toast.success(`Welkom terug, ${data.user.naam}!`);
                
                // Load user-specific data
                if (app) {
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
                this.currentUser = data.user;
                this.isAuthenticated = true;
                
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
                }
            }
            
            this.updateUI();
        } catch (error) {
            console.error('Auth check error:', error);
            this.currentUser = null;
            this.isAuthenticated = false;
            this.updateUI();
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
            
        } else {
            // Unauthenticated state - show welcome message and login/register
            if (authButtons) authButtons.style.display = 'flex';
            if (userInfo) userInfo.style.display = 'none';
            if (userImportEmail) userImportEmail.style.display = 'none';
            
            // Hide app content, show welcome
            if (sidebarContent) sidebarContent.style.display = 'none';
            if (mainContent) mainContent.style.display = 'none';
            if (sidebarSearch) sidebarSearch.style.display = 'none';
            if (welcomeMessage) welcomeMessage.style.display = 'block';
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
                        importEmailLink.href = `mailto:${data.user.importEmail}?subject=Nieuwe taak`;
                        
                        // Ensure mailto link works correctly
                        importEmailLink.onclick = (e) => {
                            // Don't prevent default - let the browser handle the mailto link
                            console.log('Import email link clicked:', importEmailLink.href);
                        };
                        
                        // Add copy functionality
                        if (btnCopyImport) {
                            btnCopyImport.onclick = () => this.copyToClipboard(data.user.importEmail);
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

// Initialize app and authentication
const app = new Taakbeheer();
const auth = new AuthManager();
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
        // F12 is the same on all platforms - much simpler!
        const shortcutCombo = 'F12';
        
        // Update all shortcuts in help modal
        const shortcuts = this.modal.querySelectorAll('kbd');
        shortcuts.forEach(kbd => {
            if (kbd.textContent.includes('Ctrl+Shift+N')) {
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
            
            // Escape key to close any open modals
            if (e.key === 'Escape') {
                this.quickAddModal.hide();
                this.keyboardHelpModal.hide();
            }
        });
    }
}

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


