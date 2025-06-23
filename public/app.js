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
                    console.log(`🔄 Restored last selected list: ${saved}`);
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
        await this.laadTellingen();
        
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

        // Bind herhaling popup events
        document.addEventListener('DOMContentLoaded', () => {
            this.bindHerhalingEvents();
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
        // If we're coming from contextenbeheer, restore normal structure
        if (this.huidigeLijst === 'contextenbeheer' && lijst !== 'contextenbeheer') {
            this.restoreNormalContainer();
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
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = titles[lijst] || lijst;
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

        for (const project of this.projecten) {
            const div = document.createElement('div');
            div.className = 'project-wrapper';
            div.dataset.id = project.id;
            
            const actiesInfo = await this.telActiesPerProject(project.id);
            
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

    async telActiesPerProject(projectId) {
        try {
            // Haal alle acties en afgewerkte taken op
            const [actiesResponse, afgewerkteResponse] = await Promise.all([
                fetch('/api/lijst/acties'),
                fetch('/api/lijst/afgewerkte-taken')
            ]);
            
            let openActies = 0;
            let afgewerkteActies = 0;
            
            if (actiesResponse.ok) {
                const acties = await actiesResponse.json();
                openActies = acties.filter(actie => actie.projectId === projectId).length;
            }
            
            if (afgewerkteResponse.ok) {
                const afgewerkteTaken = await afgewerkteResponse.json();
                afgewerkteActies = afgewerkteTaken.filter(taak => taak.projectId === projectId && taak.type === 'actie').length;
            }
            
            return { open: openActies, afgewerkt: afgewerkteActies };
        } catch (error) {
            console.error('Fout bij tellen acties per project:', error);
            return { open: 0, afgewerkt: 0 };
        }
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
            await this.laadTellingen();
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
        await this.laadTellingen();
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
                
                const recurringIndicator = actie.herhalingActief ? '<span class="recurring-indicator" title="Herhalende taak">🔄</span>' : '';
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
            await this.laadTellingen();
            
            // Herlaad het project om de nieuwe status te tonen, maar behoud de open staat
            const projectId = containerId.replace('taken-', '');
            await this.laadProjectActies(projectId);
            
            // Update alleen de project tellingen, niet de hele lijst (om open staat te behouden)
            await this.updateProjectTellingen();
            
            // Show confirmation for recurring task and refresh lists
            if (nextRecurringTaskId) {
                const nextDateFormatted = new Date(this.calculateNextRecurringDate(actie.verschijndatum, actie.herhalingType)).toLocaleDateString('nl-NL');
                
                // Refresh all lists to show the new recurring task
                console.log('🔄 Refreshing lists after recurring task creation...');
                await this.laadTellingen();
                
                // Refresh the current view if needed
                if (this.huidigeLijst === 'acties') {
                    await this.laadHuidigeLijst();
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
            await this.laadTellingen();
            
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
        const scrollContainer = document.querySelector('.acties-lijst, .taak-lijst, .main-content');
        const scrollPosition = scrollContainer?.scrollTop || 0;
        
        const result = callback();
        
        if (result && typeof result.then === 'function') {
            // If callback returns a promise
            return result.then((value) => {
                if (scrollContainer) {
                    setTimeout(() => {
                        scrollContainer.scrollTop = scrollPosition;
                    }, 50);
                }
                return value;
            });
        } else {
            // If callback is synchronous
            if (scrollContainer) {
                setTimeout(() => {
                    scrollContainer.scrollTop = scrollPosition;
                }, 50);
            }
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

    async laadHuidigeLijst() {
        // Ensure sidebar is always visible when loading any list
        this.ensureSidebarVisible();
        
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
                        // Apply date filter for actions list
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
                    aangemaakt: new Date().toISOString()
                };
                
                this.taken.push(nieuweTaak);
                await this.slaLijstOp();
                this.renderTaken();
                await this.laadTellingen();
                
                input.value = '';
                input.focus();
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
            const recurringIndicator = taak.herhalingActief ? ' <span class="recurring-indicator" title="Herhalende taak">🔄</span>' : '';
            
            // Build extra info line
            let extraInfo = [];
            if (projectNaam) extraInfo.push(`📁 ${projectNaam}`);
            if (contextNaam) extraInfo.push(`🏷️ ${contextNaam}`);
            if (datum) extraInfo.push(`📅 ${datum}`);
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
                    <button onclick="app.planTaakWrapper('${taak.id}')" class="plan-btn">Plan</button>
                    <button onclick="app.verwijderTaak('${taak.id}')">×</button>
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
            const recurringIndicator = taak.herhalingActief ? ' <span class="recurring-indicator" title="Herhalende taak">🔄</span>' : '';
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

        this.slaLijstOp();
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
        }, {
            operationId: 'verplaats-uitgestelde-taak',
            showGlobal: true,
            message: `Taak wordt verplaatst naar ${naarLijst}...`
        });
        
        // Update counts in background (non-blocking)
        this.laadTellingen();
        
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
        this.toonToekomstigeTaken = !this.toonToekomstigeTaken;
        this.saveToekomstToggle();
        // Re-render daily planning to apply the filter
        const container = document.querySelector('.main-content');
        if (container) {
            await this.renderDagelijksePlanning(container);
        }
    }

    renderActiesTable(container) {
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
            </div>
            <ul id="acties-lijst" class="taak-lijst"></ul>
        `;

        this.vulFilterDropdowns();
        this.renderActiesLijst();
        this.bindActiesEvents();
    }

    renderActiesLijst() {
        const lijst = document.getElementById('acties-lijst');
        if (!lijst) return;

        lijst.innerHTML = '';

        this.taken.forEach(taak => {
            const li = document.createElement('li');
            li.className = 'taak-item actie-item';
            
            const projectNaam = this.getProjectNaam(taak.projectId);
            const contextNaam = this.getContextNaam(taak.contextId);
            const datum = taak.verschijndatum ? new Date(taak.verschijndatum).toLocaleDateString('nl-NL') : '';
            const recurringIndicator = taak.herhalingActief ? ' <span class="recurring-indicator" title="Herhalende taak">🔄</span>' : '';
            
            // Datum status indicator
            const datumStatus = this.getTaakDatumStatus(taak.verschijndatum);
            let datumIndicator = '';
            let extraClass = '';
            
            if (datumStatus === 'verleden') {
                datumIndicator = '⚠️';
                extraClass = ' overdue';
            } else if (datumStatus === 'vandaag') {
                datumIndicator = '📅';
                extraClass = ' today';
            } else if (datumStatus === 'toekomst') {
                datumIndicator = '🔮';
                extraClass = ' future';
            }
            
            li.className += extraClass;
            
            // Build extra info line
            let extraInfo = [];
            if (projectNaam) extraInfo.push(`📁 ${projectNaam}`);
            if (contextNaam) extraInfo.push(`🏷️ ${contextNaam}`);
            if (datum) extraInfo.push(`${datumIndicator} ${datum}`);
            if (taak.duur) extraInfo.push(`⏱️ ${taak.duur} min`);
            
            const extraInfoHtml = extraInfo.length > 0 ? 
                `<div class="taak-extra-info">${extraInfo.join(' • ')}</div>` : '';
            
            li.innerHTML = `
                <div class="taak-checkbox">
                    <input type="checkbox" id="taak-${taak.id}" onchange="app.taakAfwerken('${taak.id}')">
                </div>
                <div class="taak-content">
                    <div class="taak-titel" onclick="app.bewerkActieWrapper('${taak.id}')" style="cursor: pointer;" title="${taak.opmerkingen ? this.escapeHtml(taak.opmerkingen) : 'Klik om te bewerken'}">${taak.tekst}${recurringIndicator}</div>
                    ${extraInfoHtml}
                </div>
                <div class="taak-acties">
                    <button onclick="app.verwijderTaak('${taak.id}')">×</button>
                </div>
            `;
            
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
            const recurringIndicator = taak.herhalingActief ? ' <span class="recurring-indicator" title="Herhalende taak">🔄</span>' : '';
            
            // Datum status indicator
            const datumStatus = this.getTaakDatumStatus(taak.verschijndatum);
            let datumIndicator = '';
            let rowClass = 'actie-row';
            
            if (datumStatus === 'verleden') {
                datumIndicator = '<span class="datum-indicator overtijd" title="Overtijd - vervaldatum gepasseerd">⚠️</span>';
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
            
            const recurringIndicator = taak.herhalingActief ? ' <span class="recurring-indicator" title="Herhalende taak">🔄</span>' : '';
            
            let acties = '';
            if (this.huidigeLijst === 'inbox') {
                acties = `
                    <div class="taak-acties">
                        <button onclick="app.planTaakWrapper('${taak.id}')" class="plan-btn">Plan</button>
                        <button onclick="app.verwijderTaak('${taak.id}')">×</button>
                    </div>
                `;
            } else if (this.huidigeLijst !== 'afgewerkte-taken') {
                acties = `
                    <div class="taak-acties">
                        <button onclick="app.verwijderTaak('${taak.id}')">×</button>
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
        const taak = this.taken.find(t => t.id === id);
        if (!taak) return;
        
        const isRecurring = taak.herhalingActief && taak.herhalingType;
        
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
                    const nextDate = this.calculateNextRecurringDate(taak.verschijndatum, taak.herhalingType);
                    if (nextDate) {
                        nextRecurringTaskId = await this.createNextRecurringTask(taak, nextDate);
                    }
                }
            }
            
            const success = await this.verplaatsTaakNaarAfgewerkt(taak);
            if (success) {
                // Remove from local array immediately for instant UI feedback
                this.taken = this.taken.filter(t => t.id !== id);
                
                // Fast UI update - just remove the element without full re-render
                const checkbox = document.querySelector(`input[onchange*="${id}"]`);
                const rowElement = checkbox?.closest('tr, li, .project-actie-item');
                if (rowElement) {
                    // Save scroll position before animation
                    const scrollContainer = document.querySelector('.acties-lijst, .taak-lijst, .main-content');
                    const scrollPosition = scrollContainer?.scrollTop || 0;
                    
                    rowElement.style.opacity = '0.5';
                    rowElement.style.transition = 'opacity 0.3s';
                    setTimeout(() => {
                        if (rowElement.parentNode) {
                            rowElement.parentNode.removeChild(rowElement);
                            
                            // Restore scroll position after element removal
                            if (scrollContainer) {
                                scrollContainer.scrollTop = scrollPosition;
                            }
                        }
                    }, 300);
                }
                
                // Background updates (don't await these for faster response)
                if (!nextRecurringTaskId) {
                    this.slaLijstOp().catch(console.error);
                }
                this.laadTellingen().catch(console.error);
                
                // Show success message
                if (isRecurring && nextRecurringTaskId) {
                    const nextDateFormatted = new Date(this.calculateNextRecurringDate(taak.verschijndatum, taak.herhalingType)).toLocaleDateString('nl-NL');
                    toast.success(`Taak afgewerkt! Volgende herhaling gepland voor ${nextDateFormatted}`);
                    
                    // For recurring tasks, refresh lists but preserve scroll position
                    setTimeout(() => {
                        this.laadTellingen();
                        if (this.huidigeLijst === 'acties') {
                            this.preserveScrollPosition(() => this.laadHuidigeLijst());
                        }
                    }, 500);
                } else {
                    toast.success('Taak afgewerkt!');
                }
            } else {
                // Rollback the afgewerkt timestamp
                delete taak.afgewerkt;
                toast.error('Fout bij afwerken van taak. Probeer opnieuw.');
            }
        }, {
            operationId: `complete-task-${id}`,
            showGlobal: true,
            message: 'Taak afwerken...'
        });
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

    async verwijderTaak(id) {
        const taak = this.taken.find(t => t.id === id);
        if (!taak) return;
        
        const bevestiging = await confirmModal.show('Taak Verwijderen', `Weet je zeker dat je "${taak.tekst}" wilt verwijderen?`);
        if (!bevestiging) return;
        
        await loading.withLoading(async () => {
            this.taken = this.taken.filter(taak => taak.id !== id);
            await this.slaLijstOp();
            this.renderTaken();
            await this.laadTellingen();
        }, {
            operationId: `delete-task-${id}`,
            showGlobal: true,
            message: 'Taak verwijderen...'
        });
    }

    async slaLijstOp() {
        try {
            console.log('Saving list:', this.huidigeLijst, 'with tasks:', this.taken);
            const response = await fetch(`/api/lijst/${this.huidigeLijst}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.taken)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Server error saving list:', errorData);
                toast.error(`Fout bij opslaan: ${errorData.error || 'Onbekende fout'}`);
                return false;
            }
            
            console.log('List saved successfully');
            return true;
        } catch (error) {
            console.error('Fout bij opslaan lijst:', error);
            toast.error(`Fout bij opslaan: ${error.message}`);
            return false;
        }
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
            button.textContent = isNewAction ? 'Maak actie' : 'Aanpassingen opslaan';
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
        }
    }

    sluitPopup() {
        document.getElementById('planningPopup').style.display = 'none';
        this.huidigeTaakId = null;
        this.resetPopupForm();
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
        
        return await loading.withLoading(async () => {
            if (this.huidigeLijst === 'acties') {
                // Bewerk bestaande actie
                const actie = this.taken.find(t => t.id === this.huidigeTaakId);
                if (actie) {
                    actie.tekst = taakNaam;
                    actie.projectId = projectId;
                    actie.verschijndatum = verschijndatum;
                    actie.contextId = contextId;
                    actie.duur = duur;
                    actie.opmerkingen = opmerkingen;
                    actie.herhalingType = herhalingType;
                    actie.herhalingActief = !!herhalingType;
                    
                    await this.slaLijstOp();
                    this.renderTaken();
                    await this.laadTellingen();
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
                    console.log('✅ Actie succesvol opgeslagen met herhaling:', herhalingType);
                    // Only remove from inbox AFTER successful save
                    this.verwijderTaakUitHuidigeLijst(this.huidigeTaakId);
                    await this.laadTellingen();
                    
                    // If we're currently viewing acties, refresh the list
                    if (this.huidigeLijst === 'acties') {
                        await this.laadHuidigeLijst();
                    }
                } else {
                    console.error('Fout bij opslaan actie:', response.status);
                    toast.error('Fout bij plannen van taak. Probeer opnieuw.');
                    return;
                }
            }
            
            this.sluitPopup();
        }, {
            operationId: 'save-action',
            button: maakActieBtn,
            message: 'Actie opslaan...'
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
        this.taken = this.taken.filter(t => t.id !== id);
        this.slaLijstOp();
        this.renderTaken();
        this.laadTellingen();
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

    // Recurring task calculation logic
    calculateNextRecurringDate(baseDate, herhalingType) {
        let date = new Date(baseDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for date comparison
        
        console.log('🔄 calculateNextRecurringDate:', { baseDate, herhalingType, today: today.toISOString().split('T')[0] });
        
        switch (herhalingType) {
            case 'dagelijks':
                date.setDate(date.getDate() + 1);
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
                        
                        if (!isNaN(interval) && !isNaN(targetDay) && targetDay >= 1 && targetDay <= 7) {
                            // Convert our day numbering (1-7) to JavaScript day numbering (0-6, Sunday=0)
                            const jsTargetDay = targetDay === 7 ? 0 : targetDay; // 7=Sunday becomes 0, others stay same
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
            console.log(`🔄 Date ${calculatedDate} is in past, calculating next occurrence...`);
            iterations++;
            
            // Recalculate from the current calculated date
            const nextCalculation = this.calculateNextRecurringDate(calculatedDate, herhalingType);
            if (!nextCalculation || nextCalculation === calculatedDate) {
                // Prevent infinite recursion or no progress
                console.log('⚠️ Could not calculate future date, breaking loop');
                break;
            }
            calculatedDate = nextCalculation;
        }
        
        if (iterations >= maxIterations) {
            console.error('❌ Max iterations reached in recurring date calculation');
            return null;
        }
        
        console.log(`✅ Final calculated date: ${calculatedDate} (after ${iterations} iterations)`);
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
            console.log('🔄 Creating next recurring task:', {
                originalTask: originalTask,
                nextDate: nextDate,
                targetList: originalTask.lijst
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
                console.log('✅ New recurring task created with ID:', result.taskId);
                
                // Debug: Check what was actually created
                setTimeout(async () => {
                    try {
                        const checkResponse = await fetch(`/api/taak/${result.taskId}`);
                        if (checkResponse.ok) {
                            const newTask = await checkResponse.json();
                            console.log('🔍 DEBUG: New recurring task in database:', newTask);
                        } else {
                            console.log('🔍 DEBUG: Failed to fetch task, status:', checkResponse.status);
                        }
                    } catch (error) {
                        console.log('Debug check of new task failed:', error);
                    }
                }, 2000);
                
                return result.taskId;
            } else {
                console.error('Failed to create recurring task:', response.status);
                return null;
            }
        } catch (error) {
            console.error('Error creating recurring task:', error);
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

    vulFilterDropdowns() {
        // Project filter vullen
        const projectFilter = document.getElementById('projectFilter');
        if (projectFilter) {
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
            this.contexten.forEach(context => {
                const option = document.createElement('option');
                option.value = context.id;
                option.textContent = context.naam;
                contextFilter.appendChild(option);
            });
        }
    }

    bindActiesEvents() {
        // Filter event listeners
        const taakFilter = document.getElementById('taakFilter');
        const projectFilter = document.getElementById('projectFilter');
        const contextFilter = document.getElementById('contextFilter');
        const datumFilter = document.getElementById('datumFilter');
        const toekomstToggle = document.getElementById('toonToekomstToggle');

        if (taakFilter) taakFilter.addEventListener('input', () => this.filterActies());
        if (projectFilter) projectFilter.addEventListener('change', () => this.filterActies());
        if (contextFilter) contextFilter.addEventListener('change', () => this.filterActies());
        if (datumFilter) datumFilter.addEventListener('change', () => this.filterActies());
        if (toekomstToggle) toekomstToggle.addEventListener('change', () => this.toggleToekomstigeTaken());

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
            
            // Set button text for editing existing action
            this.setActionButtonText(false);
            
            this.updateButtonState();
            document.getElementById('planningPopup').style.display = 'flex';
            document.getElementById('taakNaamInput').focus();
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

        document.querySelectorAll('.actie-row').forEach(row => {
            const actieId = row.dataset.id;
            const actie = this.taken.find(t => t.id === actieId);
            
            let tonen = true;
            
            // Taak tekst filter (contains search)
            if (taakFilter && !actie.tekst.toLowerCase().includes(taakFilter)) tonen = false;
            
            // Bestaande filters
            if (projectFilter && actie.projectId !== projectFilter) tonen = false;
            if (contextFilter && actie.contextId !== contextFilter) tonen = false;
            
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
            case 'global-search':
                this.showGlobalSearch();
                break;
            case 'contextenbeheer':
                this.showContextenBeheer();
                break;
            case 'csv-import':
                window.open('/csv-mapper.html', '_blank');
                break;
            case 'notion-import':
                window.open('/notion-import.html', '_blank');
                break;
            case 'wekelijkse-optimalisatie':
                this.showWekelijkseOptimalisatie();
                break;
            default:
                console.log('Unknown tool:', tool);
        }
    }

    showGlobalSearch() {
        // Update active list in sidebar - remove all actief classes
        document.querySelectorAll('.lijst-item').forEach(item => {
            item.classList.remove('actief');
        });

        // Highlight the global search tool item
        const globalSearchItem = document.querySelector('[data-tool="global-search"]');
        if (globalSearchItem) {
            globalSearchItem.classList.add('actief');
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
            pageTitle.textContent = 'Zoeken';
        }

        // Hide input container
        const inputContainer = document.getElementById('taak-input-container');
        if (inputContainer) {
            inputContainer.style.display = 'none';
        }

        // Set current list and save it
        this.huidigeLijst = 'global-search';
        this.saveCurrentList();

        // Show global search interface
        this.renderGlobalSearch();
    }

    async renderGlobalSearch() {
        // Find the container for global search
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
                    container = contentArea.querySelector('.taken-container, .contexten-beheer, .dagelijkse-planning-layout, .global-search');
                    if (!container) {
                        // Create a new container if none exists
                        container = document.createElement('div');
                        container.className = 'taken-container';
                        contentArea.appendChild(container);
                    }
                } else {
                    console.error('Could not find content area for global search');
                    return;
                }
            }
        }
        
        // Initialize search state
        this.searchResults = [];
        this.searchQuery = '';
        this.searchFilters = {
            status: 'all', // 'active', 'completed', 'all'
            lists: [], // empty = all lists
            project: '',
            context: '',
            dateFrom: '',
            dateTo: '',
            includeRecurring: true
        };
        
        // Ensure we have the latest project and context data
        await this.laadProjecten();
        await this.laadContexten();
        
        container.innerHTML = `
            <div class="global-search">
                <div class="search-header">
                    <h3>🔍 Zoeken in Alle Taken</h3>
                </div>
                
                <!-- Search Input Section -->
                <div class="search-input-section">
                    <div class="search-main">
                        <input type="text" id="globalSearchInput" placeholder="Zoek in alle taken..." class="search-input">
                        <button onclick="app.performGlobalSearch()" class="search-btn" id="searchBtn">
                            🔍 Zoeken
                        </button>
                    </div>
                    
                    <!-- Advanced Filters (collapsible) -->
                    <div class="search-filters" id="searchFilters" style="display: none;">
                        <div class="filters-row">
                            <div class="filter-group">
                                <label>Status:</label>
                                <select id="searchStatusFilter">
                                    <option value="all">Alle taken</option>
                                    <option value="active">Alleen actieve taken</option>
                                    <option value="completed">Alleen afgewerkte taken</option>
                                </select>
                            </div>
                            
                            <div class="filter-group">
                                <label>Project:</label>
                                <select id="searchProjectFilter">
                                    <option value="">Alle projecten</option>
                                    ${this.projecten.map(project => 
                                        `<option value="${project.id}">${project.naam}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            
                            <div class="filter-group">
                                <label>Context:</label>
                                <select id="searchContextFilter">
                                    <option value="">Alle contexten</option>
                                    ${this.contexten.map(context => 
                                        `<option value="${context.id}">${context.naam}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="filters-row">
                            <div class="filter-group">
                                <label>Van datum:</label>
                                <input type="date" id="searchDateFrom">
                            </div>
                            
                            <div class="filter-group">
                                <label>Tot datum:</label>
                                <input type="date" id="searchDateTo">
                            </div>
                            
                            <div class="filter-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="includeRecurring" checked>
                                    Herhalende taken
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <button onclick="app.toggleSearchFilters()" class="toggle-filters-btn" id="toggleFiltersBtn">
                        ⚙️ Geavanceerde filters
                    </button>
                </div>
                
                <!-- Search Results Section -->
                <div class="search-results-section" id="searchResultsSection" style="display: none;">
                    <div class="search-stats" id="searchStats"></div>
                    <div class="search-results" id="searchResults"></div>
                </div>
                
                <!-- Search History Section -->
                <div class="search-history-section" id="searchHistorySection">
                    <h4>🕒 Recente Zoekopdrachten</h4>
                    <div class="search-history" id="searchHistory">
                        <p class="no-history">Nog geen zoekopdrachten uitgevoerd.</p>
                    </div>
                </div>
            </div>
        `;
        
        // Bind events
        this.bindGlobalSearchEvents();
        
        // Load search history
        this.loadSearchHistory();
    }

    bindGlobalSearchEvents() {
        // Enter key in search input
        const searchInput = document.getElementById('globalSearchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performGlobalSearch();
                }
            });
        }
        
        // Filter change events
        const filterElements = [
            'searchStatusFilter', 'searchProjectFilter', 'searchContextFilter',
            'searchDateFrom', 'searchDateTo', 'includeRecurring'
        ];
        
        filterElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    // Auto-search if we already have results
                    if (this.searchResults.length > 0 || this.searchQuery) {
                        this.performGlobalSearch();
                    }
                });
            }
        });
    }

    toggleSearchFilters() {
        const filtersDiv = document.getElementById('searchFilters');
        const toggleBtn = document.getElementById('toggleFiltersBtn');
        
        if (filtersDiv.style.display === 'none') {
            filtersDiv.style.display = 'block';
            toggleBtn.textContent = '⚙️ Verberg filters';
        } else {
            filtersDiv.style.display = 'none';
            toggleBtn.textContent = '⚙️ Geavanceerde filters';
        }
    }

    async performGlobalSearch() {
        const searchInput = document.getElementById('globalSearchInput');
        const searchQuery = searchInput?.value.trim() || '';
        
        if (!searchQuery) {
            toast.warning('Voer een zoekterm in');
            return;
        }
        
        // Collect filter values
        const filters = {
            status: document.getElementById('searchStatusFilter')?.value || 'all',
            project: document.getElementById('searchProjectFilter')?.value || '',
            context: document.getElementById('searchContextFilter')?.value || '',
            dateFrom: document.getElementById('searchDateFrom')?.value || '',
            dateTo: document.getElementById('searchDateTo')?.value || '',
            includeRecurring: document.getElementById('includeRecurring')?.checked || false
        };
        
        return await loading.withLoading(async () => {
            try {
                // Build query parameters
                const params = new URLSearchParams({
                    query: searchQuery,
                    ...filters
                });
                
                const response = await fetch(`/api/search?${params.toString()}`);
                if (!response.ok) {
                    throw new Error(`Search failed: ${response.status}`);
                }
                
                const results = await response.json();
                
                // Store search state
                this.searchQuery = searchQuery;
                this.searchResults = results.tasks || [];
                this.searchFilters = filters;
                
                // Save to search history
                this.saveSearchToHistory(searchQuery, filters);
                
                // Display results
                this.displaySearchResults(results);
                
                toast.success(`${results.totalCount || 0} resultaten gevonden`);
                
            } catch (error) {
                console.error('Search error:', error);
                toast.error('Fout bij zoeken. Probeer opnieuw.');
            }
        }, {
            operationId: 'global-search',
            showGlobal: true,
            message: 'Zoeken...'
        });
    }

    displaySearchResults(results) {
        const resultsSection = document.getElementById('searchResultsSection');
        const statsDiv = document.getElementById('searchStats');
        const resultsDiv = document.getElementById('searchResults');
        const historySection = document.getElementById('searchHistorySection');
        
        if (!resultsSection || !statsDiv || !resultsDiv) return;
        
        // Show results section, hide history
        resultsSection.style.display = 'block';
        if (historySection) historySection.style.display = 'none';
        
        // Display stats
        const totalCount = results.totalCount || 0;
        const executionTime = results.executionTime || 0;
        const distribution = results.distribution || {};
        
        statsDiv.innerHTML = `
            <div class="search-stats-content">
                <span class="results-count">${totalCount} resultaten gevonden in ${executionTime}ms</span>
                ${Object.keys(distribution).length > 0 ? `
                    <span class="results-distribution">
                        Gevonden in: ${Object.entries(distribution)
                            .filter(([list, count]) => count > 0)
                            .map(([list, count]) => `${count} ${this.getListDisplayName(list)}`)
                            .join(', ')}
                    </span>
                ` : ''}
            </div>
        `;
        
        // Display results
        if (totalCount === 0) {
            resultsDiv.innerHTML = '<p class="no-results">Geen resultaten gevonden voor deze zoekopdracht.</p>';
            return;
        }
        
        // Render results in table format similar to actions list
        resultsDiv.innerHTML = `
            <div class="search-results-container">
                <table class="taken-table">
                    <thead>
                        <tr>
                            <th>Taak</th>
                            <th>Project</th>
                            <th>Context</th>
                            <th>Lijst</th>
                            <th>Datum</th>
                            <th>Status</th>
                            <th>Acties</th>
                        </tr>
                    </thead>
                    <tbody id="searchResultsTableBody">
                        ${this.renderSearchResultRows(results.tasks || [])}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderSearchResultRows(tasks) {
        return tasks.map(taak => {
            const projectNaam = this.getProjectNaam(taak.projectId);
            const contextNaam = this.getContextNaam(taak.contextId);
            const listDisplayName = this.getListDisplayName(taak.lijst);
            
            // Format date
            const datumString = taak.verschijndatum ? 
                new Date(taak.verschijndatum).toLocaleDateString('nl-NL') : '';
            
            // Status
            const isCompleted = taak.afgewerkt;
            const statusText = isCompleted ? 'Afgewerkt' : 'Actief';
            const statusClass = isCompleted ? 'status-completed' : 'status-active';
            
            // Recurring indicator
            const recurringIndicator = taak.herhalingActief ? ' <span class="recurring-indicator" title="Herhalende taak">🔄</span>' : '';
            
            return `
                <tr class="search-result-row ${isCompleted ? 'completed-task' : ''}">
                    <td class="task-name" onclick="app.openTaskFromSearch('${taak.id}')" title="Klik om te bewerken">
                        ${this.highlightSearchTerm(taak.tekst, this.searchQuery)}${recurringIndicator}
                    </td>
                    <td>${projectNaam}</td>
                    <td>${contextNaam}</td>
                    <td><span class="list-badge list-${taak.lijst}">${listDisplayName}</span></td>
                    <td>${datumString}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="search-result-actions">
                            <button onclick="app.openTaskFromSearch('${taak.id}')" class="action-btn edit-btn" title="Bewerken">✏️</button>
                            <button onclick="app.moveTaskFromSearch('${taak.id}')" class="action-btn move-btn" title="Verplaatsen">📂</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    highlightSearchTerm(text, searchTerm) {
        if (!searchTerm || !text) return this.escapeHtml(text);
        
        const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    getListDisplayName(listKey) {
        const listNames = {
            'inbox': 'Inbox',
            'acties': 'Acties',
            'opvolgen': 'Opvolgen',
            'uitgesteld-wekelijks': 'Uitgesteld (week)',
            'uitgesteld-maandelijks': 'Uitgesteld (maand)',
            'uitgesteld-3maandelijks': 'Uitgesteld (3 maand)',
            'uitgesteld-6maandelijks': 'Uitgesteld (6 maand)',
            'uitgesteld-jaarlijks': 'Uitgesteld (jaar)',
            'afgewerkte-taken': 'Afgewerkt'
        };
        return listNames[listKey] || listKey;
    }

    // Search history management
    saveSearchToHistory(query, filters) {
        const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        
        const searchEntry = {
            query,
            filters,
            timestamp: new Date().toISOString(),
            id: Date.now().toString()
        };
        
        // Remove existing identical search
        const filteredHistory = searchHistory.filter(entry => 
            entry.query !== query || JSON.stringify(entry.filters) !== JSON.stringify(filters)
        );
        
        // Add to beginning and limit to 10
        filteredHistory.unshift(searchEntry);
        const limitedHistory = filteredHistory.slice(0, 10);
        
        localStorage.setItem('searchHistory', JSON.stringify(limitedHistory));
        this.loadSearchHistory();
    }

    loadSearchHistory() {
        const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        const historyDiv = document.getElementById('searchHistory');
        
        if (!historyDiv) return;
        
        if (searchHistory.length === 0) {
            historyDiv.innerHTML = '<p class="no-history">Nog geen zoekopdrachten uitgevoerd.</p>';
            return;
        }
        
        historyDiv.innerHTML = searchHistory.map(entry => `
            <div class="search-history-item" onclick="app.repeatSearch('${entry.id}')">
                <div class="history-query">"${entry.query}"</div>
                <div class="history-meta">
                    ${new Date(entry.timestamp).toLocaleDateString('nl-NL')} om ${new Date(entry.timestamp).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'})}
                    ${this.getActiveFiltersText(entry.filters)}
                </div>
            </div>
        `).join('');
    }

    getActiveFiltersText(filters) {
        const activeFilters = [];
        if (filters.status && filters.status !== 'all') activeFilters.push(`Status: ${filters.status}`);
        if (filters.project) activeFilters.push('Project geselecteerd');
        if (filters.context) activeFilters.push('Context geselecteerd');
        if (filters.dateFrom || filters.dateTo) activeFilters.push('Datum filter');
        if (!filters.includeRecurring) activeFilters.push('Geen herhalende taken');
        
        return activeFilters.length > 0 ? ` (${activeFilters.join(', ')})` : '';
    }

    repeatSearch(searchId) {
        const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        const searchEntry = searchHistory.find(entry => entry.id === searchId);
        
        if (!searchEntry) return;
        
        // Fill in the search form
        const searchInput = document.getElementById('globalSearchInput');
        if (searchInput) searchInput.value = searchEntry.query;
        
        // Apply filters
        const filterMappings = {
            'searchStatusFilter': searchEntry.filters.status,
            'searchProjectFilter': searchEntry.filters.project,
            'searchContextFilter': searchEntry.filters.context,
            'searchDateFrom': searchEntry.filters.dateFrom,
            'searchDateTo': searchEntry.filters.dateTo,
            'includeRecurring': searchEntry.filters.includeRecurring
        };
        
        Object.entries(filterMappings).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value || '';
                }
            }
        });
        
        // Perform the search
        this.performGlobalSearch();
    }

    // Task actions from search results
    async openTaskFromSearch(taskId) {
        // Find the task in search results
        const task = this.searchResults.find(t => t.id === taskId);
        if (!task) {
            toast.error('Taak niet gevonden in zoekresultaten');
            return;
        }
        
        // For now, we'll use the existing planning popup
        // In the future, we might want a dedicated task edit modal
        
        // Switch to the appropriate list first
        this.huidigeOverzicht = task.lijst;
        await this.laadHuidigeLijst();
        
        // Then open the task for editing
        await this.planTaak(taskId);
    }

    async moveTaskFromSearch(taskId) {
        // TODO: Implement bulk move functionality
        toast.info('Verplaats functionaliteit komt binnenkort');
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

    restoreNormalContainer() {
        console.log('restoreNormalContainer: starting restoration...');
        
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
                console.log('restoreNormalContainer: detected daily planning layout, restoring main-content...');
                // Daily planning completely replaced main-content structure
                const header = mainContent.querySelector('.main-header');
                
                // Get the correct title for the current list
                const titles = {
                    'inbox': 'Inbox',
                    'acties': 'Acties',
                    'projecten': 'Projecten',
                    'opvolgen': 'Opvolgen',
                    'afgewerkte-taken': 'Afgewerkt',
                    'dagelijkse-planning': 'Dagelijkse Planning',
                    'global-search': 'Zoeken',
                    'contextenbeheer': 'Contexten Beheer',
                    'uitgesteld-wekelijks': 'Wekelijks',
                    'uitgesteld-maandelijks': 'Maandelijks',
                    'uitgesteld-3maandelijks': '3-maandelijks',
                    'uitgesteld-6maandelijks': '6-maandelijks',
                    'uitgesteld-jaarlijks': 'Jaarlijks'
                };
                const currentTitle = titles[this.huidigeLijst] || 'Inbox';
                
                let headerHTML;
                if (header) {
                    // Update existing header with correct title
                    const titleElement = header.querySelector('#page-title');
                    if (titleElement) {
                        titleElement.textContent = currentTitle;
                    }
                    headerHTML = header.outerHTML;
                } else {
                    // Create new header with correct title
                    headerHTML = `<header class="main-header"><h1 id="page-title">${currentTitle}</h1></header>`;
                }
                
                // Only show input container for inbox
                const inputContainerHTML = this.huidigeLijst === 'inbox' ? `
                    <div class="taak-input-container" id="taak-input-container">
                        <input type="text" id="taakInput" placeholder="Nieuwe taak..." autofocus>
                        <button id="toevoegBtn">Toevoegen</button>
                    </div>
                ` : '';
                
                mainContent.innerHTML = `
                    ${headerHTML}
                    <div class="content-area">
                        ${inputContainerHTML}
                        <div class="taken-container">
                            <ul id="takenLijst"></ul>
                        </div>
                    </div>
                `;
                console.log('restoreNormalContainer: main-content restored');
                return;
            }

            if (contentArea) {
                
                // Find any existing container that's not the input container
                const existingContainer = contentArea.querySelector('.taken-container, .contexten-beheer, .dagelijkse-planning-layout, .global-search');
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
                                    <button onclick="app.bewerkeContext('${context.id}')" class="edit-btn" title="Bewerken">✏️</button>
                                    <button onclick="app.verwijderContext('${context.id}')" class="delete-btn" title="Verwijderen">🗑️</button>
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
        // Default words - will be replaced with user preferences
        this.mindDumpWords = [
            'Familie', 'Werk', 'Gezondheid', 'Financiën', 'Huis',
            'Auto', 'Hobby', 'Vrienden', 'Projecten', 'Toekomst'
        ];
        
        // TODO: Load user preferences from database
        
        // Filter only enabled words
        this.activeMindDumpWords = this.mindDumpWords; // TODO: filter based on user settings
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
            // Add to inbox
            const currentWord = this.activeMindDumpWords[this.currentWordIndex];
            const taakText = `${text} (Mind dump: ${currentWord})`;
            
            // Create task in inbox
            await this.voegTaakToe(taakText, 'inbox');
            
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

    configureMindDump() {
        // TODO: Show configuration modal
        toast.info('Configuratie komt zo!');
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
                    <!-- Time settings - fixed small section -->
                    <div class="tijd-sectie">
                        <h3>⏰ Tijd</h3>
                        <div class="tijd-inputs">
                            <label>Van: <input type="number" id="startUur" min="0" max="23" value="${startUur}"></label>
                            <label>Tot: <input type="number" id="eindUur" min="1" max="24" value="${eindUur}"></label>
                        </div>
                    </div>
                    
                    <!-- Templates - fixed medium section -->
                    <div class="templates-sectie">
                        <h3>🔒 Geblokkeerd</h3>
                        <div class="template-items">
                            <div class="template-item" draggable="true" data-type="geblokkeerd" data-duur="30">🔒 30min</div>
                            <div class="template-item" draggable="true" data-type="geblokkeerd" data-duur="60">🔒 60min</div>
                            <div class="template-item" draggable="true" data-type="geblokkeerd" data-duur="90">🔒 90min</div>
                            <div class="template-item" draggable="true" data-type="geblokkeerd" data-duur="120">🔒 120min</div>
                        </div>
                        
                        <h3>☕ Pauzes</h3>
                        <div class="template-items">
                            <div class="template-item" draggable="true" data-type="pauze" data-duur="5">☕ 5min</div>
                            <div class="template-item" draggable="true" data-type="pauze" data-duur="10">☕ 10min</div>
                            <div class="template-item" draggable="true" data-type="pauze" data-duur="15">☕ 15min</div>
                        </div>
                    </div>
                    
                    <!-- Actions - flexible section that takes remaining space -->
                    <div class="acties-sectie">
                        <h3>📋 Acties</h3>
                        <div class="planning-acties-filters">
                            <input type="text" id="planningTaakFilter" placeholder="Zoek taak..." class="filter-input">
                            <select id="planningProjectFilter" class="filter-select">
                                <option value="">Alle projecten</option>
                            </select>
                            <select id="planningContextFilter" class="filter-select">
                                <option value="">Alle contexten</option>
                            </select>
                            <input type="number" id="planningDuurFilter" placeholder="Max duur (min)" class="filter-input-number" min="0" step="5">
                            <label class="planning-toekomst-toggle">
                                <input type="checkbox" id="planningToekomstToggle" ${this.toonToekomstigeTaken ? 'checked' : ''}>
                                Toon toekomstige taken
                            </label>
                        </div>
                        <div class="acties-container" id="planningActiesLijst">
                            ${this.renderActiesVoorPlanning(acties, ingeplandeActies)}
                        </div>
                    </div>
                </div>
                
                <!-- Right column: Day calendar -->
                <div class="dag-kalender">
                    <div class="kalender-header">
                        <h2>${new Date().toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
                        <div class="totaal-tijd">
                            <span id="totaalGeplandeTijd">Totaal: 0 min</span>
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
        this.updateTotaalTijd();
        
        // Populate filter dropdowns
        this.populatePlanningFilters();
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
                datumIndicator = '<span class="datum-indicator overtijd" title="Overtijd - vervaldatum gepasseerd">⚠️</span>';
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
                        ${totaalMinuten > 0 ? `<div class="uur-totaal-tijd">(${totaalMinuten} min${isOverboekt ? ' 🚨' : ''})</div>` : ''}
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
            'taak': '⚡',
            'geblokkeerd': '🔒',
            'pauze': '☕'
        }[planningItem.type] || '⚡';
        
        const naam = planningItem.naam || planningItem.actieTekst || 'Onbekend';
        
        // Add checkbox for tasks (but not for blocked time or breaks)
        const checkbox = planningItem.type === 'taak' && planningItem.actieId ? 
            `<input type="checkbox" class="task-checkbox" data-actie-id="${planningItem.actieId}" onclick="app.completePlanningTask('${planningItem.actieId}', this)">` : '';
        
        return `
            <div class="planning-item" 
                 data-planning-id="${planningItem.id}" 
                 data-type="${planningItem.type}"
                 data-uur="${planningItem.uur}"
                 data-duur="${planningItem.duurMinuten}"
                 draggable="true">
                ${checkbox}
                <span class="planning-icon">${typeIcon}</span>
                <span class="planning-naam">${naam}</span>
                <span class="planning-duur">${planningItem.duurMinuten}min</span>
                <button class="delete-planning" onclick="app.deletePlanningItem('${planningItem.id}')">×</button>
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
    }

    bindDragAndDropEvents() {
        // IMPORTANT: Track if events are being bound to prevent racing conditions
        if (this.bindingInProgress) {
            return;
        }
        
        this.bindingInProgress = true;
        
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
                dragImage.innerHTML = '<div style="color: white; font-size: 12px; text-align: center; line-height: 36px; font-weight: 500;">📋</div>';
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
                dragImage.innerHTML = '<div style="color: white; font-size: 12px; text-align: center; line-height: 36px; font-weight: 500;">📋</div>';
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
                dragImage.innerHTML = '<div style="color: white; font-size: 12px; text-align: center; line-height: 36px; font-weight: 500;">📋</div>';
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

    async handleDrop(data, uur) {
        return this.handleDropInternal(data, uur, null);
    }
    
    async handleDropInternal(data, uur, position) {
        const today = new Date().toISOString().split('T')[0];
        
        // Debug logging removed for production
        
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
            } else if (data.type === 'actie') {
                planningItem.actieId = data.actieId;
                
                // Use cached data first for speed (avoid API call)
                let actie = this.planningActies?.find(t => t.id === data.actieId) || 
                           this.taken.find(t => t.id === data.actieId);
                
                if (actie) {
                    const projectNaam = this.getProjectNaam(actie.projectId);
                    planningItem.naam = projectNaam !== 'Geen project' ? `${actie.tekst} (${projectNaam})` : actie.tekst;
                } else {
                    // Only fetch from API if not found in cache
                    console.log('🔍 Task not in cache, fetching from API...');
                    const actiesResponse = await fetch('/api/lijst/acties');
                    if (actiesResponse.ok) {
                        const acties = await actiesResponse.json();
                        actie = acties.find(t => t.id === data.actieId);
                        if (actie) {
                            const projectNaam = this.getProjectNaam(actie.projectId);
                            planningItem.naam = projectNaam !== 'Geen project' ? `${actie.tekst} (${projectNaam})` : actie.tekst;
                        } else {
                            planningItem.naam = 'Onbekende actie';
                        }
                    } else {
                        planningItem.naam = 'Onbekende actie';
                    }
                }
            }
            
            const response = await fetch('/api/dagelijkse-planning', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(planningItem)
            });
            
            if (response.ok) {
                // Fast local update instead of full refresh
                this.updatePlanningLocally(planningItem, await response.json());
                
                // Remove task from actions list if it was an action
                if (data.type === 'actie') {
                    this.removeActionFromList(data.actieId);
                }
                
                this.updateTotaalTijd(); // Update total time
                toast.success('Planning item toegevoegd!');
            } else {
                toast.error('Fout bij toevoegen planning item');
            }
        }, {
            operationId: position !== null ? 'add-planning-position' : 'add-planning',
            showGlobal: true, // Show loading indicator
            message: 'Item toevoegen...'
        });
    }

    async handleDropAtPosition(data, uur, position) {
        return this.handleDropInternal(data, uur, position);
    }
    
    updatePlanningLocally(planningItem, serverResponse) {
        // Update local planning data immediately for fast visual feedback
        if (!this.currentPlanningData) {
            this.currentPlanningData = [];
        }
        
        // Add the new planning item to local data
        const newItem = {
            ...planningItem,
            id: serverResponse.id || Math.random().toString(36), // Use server ID if available
            ...serverResponse // Merge any additional server data
        };
        
        this.currentPlanningData.push(newItem);
        
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
                    uurTotaalElement.textContent = `(${totaalMinuten} min${isOverboekt ? ' 🚨' : ''})`;
                } else {
                    // Add totaal tijd element if it doesn't exist
                    const newTotaalElement = document.createElement('div');
                    newTotaalElement.className = 'uur-totaal-tijd';
                    newTotaalElement.textContent = `(${totaalMinuten} min${isOverboekt ? ' 🚨' : ''})`;
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
        // Remove from local arrays
        if (this.planningActies) {
            this.planningActies = this.planningActies.filter(a => a.id !== actieId);
        }
        if (this.taken) {
            this.taken = this.taken.filter(a => a.id !== actieId);
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
                dragImage.innerHTML = '<div style="color: white; font-size: 12px; text-align: center; line-height: 36px; font-weight: 500;">📋</div>';
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
                this.updateReorderLocally(data, targetUur, targetPosition);
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
            showGlobal: false, // Make less intrusive
            message: 'Verplaatsen...'
        });
    }
    
    updateReorderLocally(data, targetUur, targetPosition) {
        if (!this.currentPlanningData) return;
        
        // Find and update the planning item
        const item = this.currentPlanningData.find(p => p.id === data.planningId);
        if (item) {
            const oldUur = item.uur;
            
            // Update the item properties
            item.uur = targetUur;
            if (targetPosition !== null) {
                item.positie = targetPosition;
            }
            
            // Update both affected hours
            this.updateSingleHourDisplay(oldUur);
            if (oldUur !== targetUur) {
                this.updateSingleHourDisplay(targetUur);
            }
        }
    }

    async deletePlanningItem(planningId) {
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

    async completePlanningTask(actieId, checkboxElement) {
        console.log('🎯 completePlanningTask called with actieId:', actieId);
        
        return await loading.withLoading(async () => {
            try {
                // Find the task in planning actions array first, then fall back to main tasks
                let taak = this.planningActies?.find(t => t.id === actieId) || this.taken.find(t => t.id === actieId);
                console.log('📋 Local task found:', taak ? 'Yes' : 'No');
            
            if (!taak) {
                console.log('🔍 Task not found locally, fetching from API...');
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
                console.error('❌ Task not found anywhere:', actieId);
                toast.error('Taak niet gevonden');
                checkboxElement.checked = false;
                return;
            }
            
            console.log('📝 Found task:', { id: taak.id, tekst: taak.tekst, afgewerkt: taak.afgewerkt, herhalingActief: taak.herhalingActief, herhalingType: taak.herhalingType });
            
            // Check if this is a recurring task
            const isRecurring = taak.herhalingActief && taak.herhalingType;
            console.log('🔄 Is recurring task:', isRecurring);
            
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
            console.log('✅ verplaatsTaakNaarAfgewerkt result:', success);
            if (success) {
                console.log('🎉 Task successfully marked as completed in database');
                
                // Remove task from both arrays if present
                console.log('🗑️ Removing task from local arrays...');
                this.taken = this.taken.filter(t => t.id !== actieId);
                if (this.planningActies) {
                    this.planningActies = this.planningActies.filter(t => t.id !== actieId);
                }
                console.log('📊 Arrays updated, current list type:', this.huidigeLijst);
                
                // Refresh the daily planning view to update both actions list and calendar
                if (this.huidigeLijst === 'dagelijkse-planning') {
                    console.log('🔄 Updating daily planning - both calendar and actions list...');
                    
                    // Update actions list with local data (for immediate feedback)
                    const actiesContainer = document.getElementById('planningActiesLijst');
                    if (actiesContainer) {
                        const today = new Date().toISOString().split('T')[0];
                        const ingeplandeResponse = await fetch(`/api/ingeplande-acties/${today}`);
                        const ingeplandeActies = ingeplandeResponse.ok ? await ingeplandeResponse.json() : [];
                        
                        // Use local planningActies array which has been updated
                        actiesContainer.innerHTML = this.renderActiesVoorPlanning(this.planningActies || this.taken, ingeplandeActies);
                        this.bindDragAndDropEvents();
                        console.log('✅ Actions list updated with local data');
                    }
                    
                    // Also refresh the calendar to remove completed tasks from planning items
                    console.log('🗓️ Refreshing calendar with updated planning data...');
                    const today = new Date().toISOString().split('T')[0];
                    console.log('📅 Fetching planning data for date:', today);
                    
                    const planningResponse = await fetch(`/api/dagelijkse-planning/${today}`);
                    console.log('📡 Planning API response status:', planningResponse.status);
                    
                    if (planningResponse.ok) {
                        const updatedPlanning = await planningResponse.json();
                        console.log('📋 Updated planning data received:', updatedPlanning.length, 'items');
                        console.log('🔍 Planning items for completed task:', updatedPlanning.filter(p => p.actieId === actieId));
                        
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
                            console.log('✅ Calendar updated with filtered planning data');
                        } else {
                            console.error('❌ Kalender container not found in DOM');
                        }
                    } else {
                        console.error('❌ Failed to fetch updated planning data:', planningResponse.status);
                    }
                } else {
                    console.log('🔄 Re-rendering normal view...');
                    // For other views, use normal renderTaken
                    await this.preservePlanningFilters(() => this.renderTaken());
                }
                this.updateTotaalTijd(); // Update total time
                await this.laadTellingen();
                console.log('📈 Tellingen updated');
                
                // Show success message with task name
                const projectNaam = this.getProjectNaam(taak.projectId);
                const taskDisplay = projectNaam !== 'Geen project' ? `${taak.tekst} (${projectNaam})` : taak.tekst;
                
                // Handle recurring tasks
                if (isRecurring && nextRecurringTaskId) {
                    const nextDateFormatted = new Date(this.calculateNextRecurringDate(taak.verschijndatum, taak.herhalingType)).toLocaleDateString('nl-NL');
                    toast.success(`${taskDisplay} afgerond! Volgende herhaling gepland voor ${nextDateFormatted}`);
                    
                    // Refresh all data to show the new recurring task
                    console.log('🔄 Refreshing all data after recurring task creation...');
                    await this.laadTellingen();
                    
                    // For daily planning, refresh the actions list to show the new task
                    if (this.huidigeLijst === 'dagelijkse-planning') {
                        console.log('📋 Refreshing actions list to show new recurring task...');
                        // Re-fetch actions from API to get the new recurring task
                        const actiesResponse = await fetch('/api/lijst/acties');
                        if (actiesResponse.ok) {
                            const refreshedActies = await actiesResponse.json();
                            this.planningActies = this.filterTakenOpDatum(refreshedActies, true);
                            console.log('✅ Planning actions refreshed with new recurring task');
                            
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
            // Extract minutes from labels like "10:00 (70 min ⚠️)"
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
            output.textContent += '\n✅ Copied to clipboard!';
        });
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
                        <a href="/changelog.html" target="_blank" class="changelog-link">📋 Bekijk wat er nieuw is</a>
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

// Initialize mobile sidebar after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app.initializeMobileSidebar();
});

// Global CSS debugger function
window.showCSSDebugger = function() {
    if (app && app.addCSSDebugger) {
        app.addCSSDebugger();
    }
};

// Load version number when page loads
document.addEventListener('DOMContentLoaded', loadVersionNumber);