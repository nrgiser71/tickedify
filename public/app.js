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
        this.init();
    }

    init() {
        this.bindEvents();
        this.zetVandaagDatum();
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
                                  'uitgesteld-6maandelijks', 'uitgesteld-jaarlijks', 'opvolgen'];
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
        // Sidebar navigatie
        document.querySelectorAll('.lijst-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const lijst = e.currentTarget.dataset.lijst;
                if (lijst) {
                    this.navigeerNaarLijst(lijst);
                }
            });
        });

        // Dropdown functionaliteit
        document.getElementById('uitgesteld-dropdown').addEventListener('click', () => {
            this.toggleDropdown();
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

        // Weekday checkboxes
        document.querySelectorAll('.weekdag-checkboxes input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
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
        // Update actieve lijst in sidebar
        document.querySelectorAll('.lijst-item').forEach(item => {
            item.classList.remove('actief');
        });
        document.querySelector(`[data-lijst="${lijst}"]`).classList.add('actief');

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
        document.getElementById('page-title').textContent = titles[lijst] || lijst;

        // Update input visibility (alleen inbox heeft input)
        const inputContainer = document.getElementById('taak-input-container');
        if (lijst === 'inbox') {
            inputContainer.style.display = 'flex';
        } else {
            inputContainer.style.display = 'none';
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

    async laadHuidigeLijst() {
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
                        this.taken = await response.json();
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
        }
    }

    async renderTaken() {
        const container = document.getElementById('takenLijst');
        
        if (this.huidigeLijst === 'acties') {
            this.renderActiesTable(container);
        } else if (this.huidigeLijst === 'dagelijkse-planning') {
            await this.renderDagelijksePlanning(container);
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
        container.innerHTML = '';

        this.taken.forEach(taak => {
            const li = document.createElement('li');
            li.className = 'taak-item uitgesteld-item';
            
            // Bouw dropdown opties dynamisch (exclusief huidige lijst)
            const dropdownOpties = this.getVerplaatsOpties(taak.id);
            const recurringIndicator = taak.herhalingActief ? ' <span class="recurring-indicator" title="Herhalende taak">🔄</span>' : '';
            
            // Determine if checkbox should be checked (for completed tasks)
            const isCompleted = taak.afgewerkt;
            const checkboxChecked = isCompleted ? 'checked' : '';
            
            li.innerHTML = `
                <div class="taak-checkbox">
                    <input type="checkbox" id="taak-${taak.id}" ${checkboxChecked} onchange="app.taakAfwerken('${taak.id}')">
                </div>
                <div class="taak-content">
                    <div class="taak-titel">${taak.tekst}${recurringIndicator}</div>
                </div>
                <div class="taak-acties">
                    <div class="verplaats-dropdown">
                        <button class="verplaats-btn-uitgesteld" onclick="app.toggleVerplaatsDropdownUitgesteld('${taak.id}')" title="Verplaats taak">↗️</button>
                        <div class="verplaats-menu" id="verplaats-uitgesteld-${taak.id}" style="display: none;">
                            ${dropdownOpties}
                        </div>
                    </div>
                    <button onclick="app.verwijderTaak('${taak.id}')" class="verwijder-btn" title="Verwijder taak">×</button>
                </div>
            `;
            container.appendChild(li);
        });

        // Bind click-outside event voor dropdowns
        this.bindUitgesteldDropdownEvents();
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
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
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

        await this.verplaatsTaakNaarLijst(taak, naarLijst);
        
        // Verwijder uit huidige lijst
        this.taken = this.taken.filter(t => t.id !== id);
        await this.slaLijstOp();
        
        // Update UI
        await this.renderTaken();
        await this.laadTellingen();
        
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

    renderActiesTable(container) {
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
            <div class="acties-table-container">
                <table class="acties-table">
                    <thead>
                        <tr>
                            <th>✓</th>
                            <th class="sortable" data-sort="tekst">Taak</th>
                            <th class="sortable" data-sort="project">Project</th>
                            <th class="sortable" data-sort="context">Context</th>
                            <th class="sortable" data-sort="verschijndatum">Datum</th>
                            <th class="sortable" data-sort="duur">Duur</th>
                            <th>Acties</th>
                        </tr>
                    </thead>
                    <tbody id="acties-tbody">
                    </tbody>
                </table>
            </div>
        `;

        this.vulFilterDropdowns();
        this.renderActiesRows();
        this.bindActiesEvents();
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
            const datum = new Date(taak.verschijndatum).toLocaleDateString('nl-NL');
            const recurringIndicator = taak.herhalingActief ? ' <span class="recurring-indicator" title="Herhalende taak">🔄</span>' : '';
            
            tr.innerHTML = `
                <td title="Taak afwerken">
                    <input type="checkbox" onchange="app.taakAfwerken('${taak.id}')">
                </td>
                <td class="taak-naam-cell" onclick="app.bewerkActieWrapper('${taak.id}')" title="${this.escapeHtml(taak.tekst)}${taak.opmerkingen ? '\n\nOpmerkingen:\n' + this.escapeHtml(taak.opmerkingen) : ''}">${taak.tekst}${recurringIndicator}</td>
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
        console.log('🐛 DEBUG: taakAfwerken called with ID:', id);
        const taak = this.taken.find(t => t.id === id);
        console.log('🐛 DEBUG: Found task:', taak);
        if (taak) {
            console.log('🐛 DEBUG: herhalingActief:', taak.herhalingActief);
            console.log('🐛 DEBUG: herhalingType:', taak.herhalingType);
            console.log('🐛 DEBUG: Check condition:', taak.herhalingActief && taak.herhalingType);
            
            taak.afgewerkt = new Date().toISOString();
            
            // Check if this is a recurring task and create next instance
            let nextRecurringTaskId = null;
            if (taak.herhalingActief && taak.herhalingType) {
                console.log('🐛 DEBUG: Entering recurring task logic');
                if (taak.herhalingType.startsWith('event-')) {
                    console.log('🐛 DEBUG: Event-based recurrence detected');
                    // Handle event-based recurrence - ask for next event date
                    const nextEventDate = await this.askForNextEventDate(taak);
                    if (nextEventDate) {
                        const nextTaskDate = this.calculateEventBasedDate(nextEventDate, taak.herhalingType);
                        if (nextTaskDate) {
                            nextRecurringTaskId = await this.createNextRecurringTask(taak, nextTaskDate);
                        }
                    }
                } else {
                    console.log('🐛 DEBUG: Regular recurrence detected, calculating next date');
                    console.log('🐛 DEBUG: verschijndatum:', taak.verschijndatum);
                    console.log('🐛 DEBUG: herhalingType:', taak.herhalingType);
                    const nextDate = this.calculateNextRecurringDate(taak.verschijndatum, taak.herhalingType);
                    console.log('🐛 DEBUG: calculated nextDate:', nextDate);
                    if (nextDate) {
                        console.log('🐛 DEBUG: About to create recurring task');
                        nextRecurringTaskId = await this.createNextRecurringTask(taak, nextDate);
                        console.log('🐛 DEBUG: createNextRecurringTask returned:', nextRecurringTaskId);
                    } else {
                        console.log('🐛 DEBUG: No next date calculated - recurring task NOT created');
                    }
                }
            }
            
            const success = await this.verplaatsTaakNaarAfgewerkt(taak);
            if (success) {
                this.taken = this.taken.filter(t => t.id !== id);
                
                // Only save list if no recurring task was created (to avoid overwriting)
                if (!nextRecurringTaskId) {
                    await this.slaLijstOp();
                }
                
                this.renderTaken();
                await this.laadTellingen();
                
                // Show confirmation for recurring task and refresh lists
                if (nextRecurringTaskId) {
                    const nextDateFormatted = new Date(this.calculateNextRecurringDate(taak.verschijndatum, taak.herhalingType)).toLocaleDateString('nl-NL');
                    
                    // Refresh all lists to show the new recurring task
                    console.log('🔄 Refreshing lists after recurring task creation...');
                    await this.laadTellingen();
                    
                    // If we're on the acties list, refresh it to show the new task
                    if (this.huidigeLijst === 'acties') {
                        await this.laadHuidigeLijst();
                    }
                    
                    setTimeout(() => {
                        toast.success(`Taak afgewerkt! Volgende herhaling gepland voor ${nextDateFormatted}`);
                    }, 100);
                }
            } else {
                // Rollback the afgewerkt timestamp
                delete taak.afgewerkt;
                toast.error('Fout bij afwerken van taak. Probeer opnieuw.');
            }
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

    zetVandaagDatum() {
        const datumField = document.getElementById('verschijndatum');
        if (datumField) {
            const vandaag = new Date().toISOString().split('T')[0];
            datumField.value = vandaag;
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

        await this.verplaatsTaakNaarLijst(taak, naarLijst);
        this.verwijderTaakUitHuidigeLijst(this.huidigeTaakId);
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
        const date = new Date(baseDate);
        
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
        
        return date.toISOString().split('T')[0];
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

        if (taakFilter) taakFilter.addEventListener('input', () => this.filterActies());
        if (projectFilter) projectFilter.addEventListener('change', () => this.filterActies());
        if (contextFilter) contextFilter.addEventListener('change', () => this.filterActies());
        if (datumFilter) datumFilter.addEventListener('change', () => this.filterActies());

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
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
    }

    async verplaatsActie(id, naarLijst) {
        const actie = this.taken.find(t => t.id === id);
        if (!actie) return;

        await this.verplaatsTaakNaarLijst(actie, naarLijst);
        this.taken = this.taken.filter(t => t.id !== id);
        await this.slaLijstOp();
        this.renderTaken();
        await this.laadTellingen();
        
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

    toggleDropdown() {
        const content = document.getElementById('uitgesteld-content');
        const arrow = document.querySelector('.dropdown-arrow');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            arrow.classList.add('rotated');
        } else {
            content.style.display = 'none';
            arrow.classList.remove('rotated');
        }
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
        const today = new Date().toISOString().split('T')[0];
        
        // Laad acties lijst voor filtering en drag & drop
        const actiesResponse = await fetch('/api/lijst/acties');
        const acties = actiesResponse.ok ? await actiesResponse.json() : [];
        
        // Store actions for filtering (make available to filter functions)
        this.planningActies = acties;
        
        // Laad dagelijkse planning voor vandaag
        const planningResponse = await fetch(`/api/dagelijkse-planning/${today}`);
        const planning = planningResponse.ok ? await planningResponse.json() : [];
        
        // Laad ingeplande acties voor indicator
        const ingeplandeResponse = await fetch(`/api/ingeplande-acties/${today}`);
        const ingeplandeActies = ingeplandeResponse.ok ? await ingeplandeResponse.json() : [];
        
        // Get saved time range preference
        const startUur = parseInt(localStorage.getItem('dagplanning-start-uur') || '8');
        const eindUur = parseInt(localStorage.getItem('dagplanning-eind-uur') || '18');
        
        container.innerHTML = `
            <div class="dagelijkse-planning-layout">
                <!-- Left column: Templates and Actions -->
                <div class="planning-sidebar">
                    <!-- Time range settings -->
                    <div class="tijd-instellingen">
                        <h3>Tijd Instellingen</h3>
                        <div class="tijd-inputs">
                            <label>Van: <input type="number" id="startUur" min="0" max="23" value="${startUur}"></label>
                            <label>Tot: <input type="number" id="eindUur" min="1" max="24" value="${eindUur}"></label>
                        </div>
                    </div>
                    
                    <!-- Templates -->
                    <div class="templates-sectie">
                        <h3>🔒 Geblokkeerde tijd</h3>
                        <div class="template-items">
                            <div class="template-item" draggable="true" data-type="geblokkeerd" data-duur="30">🔒 30 min</div>
                            <div class="template-item" draggable="true" data-type="geblokkeerd" data-duur="60">🔒 60 min</div>
                            <div class="template-item" draggable="true" data-type="geblokkeerd" data-duur="90">🔒 90 min</div>
                            <div class="template-item" draggable="true" data-type="geblokkeerd" data-duur="120">🔒 120 min</div>
                        </div>
                        
                        <h3>☕ Pauzes</h3>
                        <div class="template-items">
                            <div class="template-item" draggable="true" data-type="pauze" data-duur="5">5 min</div>
                            <div class="template-item" draggable="true" data-type="pauze" data-duur="10">10 min</div>
                            <div class="template-item" draggable="true" data-type="pauze" data-duur="15">15 min</div>
                        </div>
                    </div>
                    
                    <!-- Actions list -->
                    <div class="acties-sectie">
                        <h3>📋 Acties (deze week)</h3>
                        <div class="acties-filters">
                            <div class="filter-groep">
                                <label>Taak:</label>
                                <input type="text" id="planningTaakFilter" placeholder="Zoek...">
                            </div>
                            <div class="filter-groep">
                                <label>Project:</label>
                                <select id="planningProjectFilter">
                                    <option value="">Alle projecten</option>
                                </select>
                            </div>
                            <div class="filter-groep">
                                <label>Context:</label>
                                <select id="planningContextFilter">
                                    <option value="">Alle contexten</option>
                                </select>
                            </div>
                            <div class="filter-groep">
                                <label>Datum:</label>
                                <input type="date" id="planningDatumFilter">
                            </div>
                        </div>
                        <div class="acties-lijst" id="planningActiesLijst">
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
    }

    renderActiesVoorPlanning(acties, ingeplandeActies) {
        return acties.filter(actie => !ingeplandeActies.includes(actie.id)).map(actie => {
            const projectNaam = this.getProjectNaam(actie.projectId);
            const contextNaam = this.getContextNaam(actie.contextId);
            
            // Format date for display
            const datumString = actie.verschijndatum ? 
                new Date(actie.verschijndatum).toLocaleDateString('nl-NL') : 'Geen datum';
            
            return `
                <div class="planning-actie-item" draggable="true" data-actie-id="${actie.id}" data-duur="${actie.duur || 60}">
                    <div class="actie-tekst">${actie.tekst}</div>
                    <div class="actie-details">
                        ${projectNaam ? `<span class="project">${projectNaam}</span>` : ''}
                        ${contextNaam ? `<span class="context">${contextNaam}</span>` : ''}
                        <span class="datum">${datumString}</span>
                        <span class="duur">${actie.duur || 60}min</span>
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
        
        if (taakFilter) taakFilter.addEventListener('input', () => this.filterPlanningActies());
        if (projectFilter) projectFilter.addEventListener('change', () => this.filterPlanningActies());
        if (contextFilter) contextFilter.addEventListener('change', () => this.filterPlanningActies());
        if (datumFilter) datumFilter.addEventListener('change', () => this.filterPlanningActies());
        
        // Populate filter dropdowns
        this.populatePlanningFilters();
    }

    bindDragAndDropEvents() {
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
        
        // Action drag start (from actions list)
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
    }

    async handleDrop(data, uur) {
        const today = new Date().toISOString().split('T')[0];
        
        return await loading.withLoading(async () => {
            const planningItem = {
                datum: today,
                uur: uur,
                type: data.type === 'template' ? data.planningType : 'taak',
                duurMinuten: data.duurMinuten
            };
            
            if (data.type === 'template') {
                planningItem.naam = data.planningType === 'geblokkeerd' ? 'Geblokkeerd' : 'Pauze';
            } else if (data.type === 'actie') {
                planningItem.actieId = data.actieId;
                
                // Get fresh data from actions API to ensure we have the latest info
                const actiesResponse = await fetch('/api/lijst/acties');
                if (actiesResponse.ok) {
                    const acties = await actiesResponse.json();
                    const actie = acties.find(t => t.id === data.actieId);
                    if (actie) {
                        const projectNaam = this.getProjectNaam(actie.projectId);
                        planningItem.naam = projectNaam !== 'Geen project' ? `${actie.tekst} (${projectNaam})` : actie.tekst;
                    } else {
                        planningItem.naam = 'Onbekende actie';
                    }
                } else {
                    // Fallback to cached data
                    const actie = this.taken.find(t => t.id === data.actieId);
                    if (actie) {
                        const projectNaam = this.getProjectNaam(actie.projectId);
                        planningItem.naam = projectNaam !== 'Geen project' ? `${actie.tekst} (${projectNaam})` : actie.tekst;
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
                await this.renderTaken(); // Refresh the view
                this.updateTotaalTijd(); // Update total time
                toast.success('Planning item toegevoegd!');
            } else {
                toast.error('Fout bij toevoegen planning item');
            }
        }, {
            operationId: 'add-planning',
            showGlobal: true,
            message: 'Item toevoegen...'
        });
    }

    async handleDropAtPosition(data, uur, position) {
        const today = new Date().toISOString().split('T')[0];
        
        return await loading.withLoading(async () => {
            const planningItem = {
                datum: today,
                uur: uur,
                positie: position,
                type: data.type === 'template' ? data.planningType : 'taak',
                duurMinuten: data.duurMinuten
            };
            
            if (data.type === 'template') {
                planningItem.naam = data.planningType === 'geblokkeerd' ? 'Geblokkeerd' : 'Pauze';
            } else if (data.type === 'actie') {
                planningItem.actieId = data.actieId;
                
                // Get fresh data from actions API to ensure we have the latest info
                const actiesResponse = await fetch('/api/lijst/acties');
                if (actiesResponse.ok) {
                    const acties = await actiesResponse.json();
                    const actie = acties.find(t => t.id === data.actieId);
                    if (actie) {
                        const projectNaam = this.getProjectNaam(actie.projectId);
                        planningItem.naam = projectNaam !== 'Geen project' ? `${actie.tekst} (${projectNaam})` : actie.tekst;
                    } else {
                        planningItem.naam = 'Onbekende actie';
                    }
                } else {
                    // Fallback to cached data
                    const actie = this.taken.find(t => t.id === data.actieId);
                    if (actie) {
                        const projectNaam = this.getProjectNaam(actie.projectId);
                        planningItem.naam = projectNaam !== 'Geen project' ? `${actie.tekst} (${projectNaam})` : actie.tekst;
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
                await this.renderTaken(); // Refresh the view
                this.updateTotaalTijd(); // Update total time
                toast.success('Planning item toegevoegd!');
            } else {
                toast.error('Fout bij toevoegen planning item');
            }
        }, {
            operationId: 'add-planning-position',
            showGlobal: true,
            message: 'Item toevoegen op positie...'
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
                await this.renderTaken(); // Refresh the view
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
            showGlobal: true,
            message: 'Item verplaatsen...'
        });
    }

    async deletePlanningItem(planningId) {
        try {
            const response = await fetch(`/api/dagelijkse-planning/${planningId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                await this.renderTaken(); // Refresh the view
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

    async completePlanningTask(actieId, checkboxElement) {
        try {
            // Find the task in our tasks array
            const taak = this.taken.find(t => t.id === actieId);
            if (!taak) {
                toast.error('Taak niet gevonden');
                checkboxElement.checked = false;
                return;
            }
            
            // Mark task as completed using existing completion workflow
            const success = await this.verplaatsTaakNaarAfgewerkt(taak);
            if (success) {
                // Remove task from our local array 
                this.taken = this.taken.filter(t => t.id !== actieId);
                
                // Refresh the daily planning view to update the actions list
                await this.renderTaken();
                this.updateTotaalTijd(); // Update total time
                await this.laadTellingen();
                
                // Show success message with task name
                const projectNaam = this.getProjectNaam(taak.projectId);
                const taskDisplay = projectNaam !== 'Geen project' ? `${taak.tekst} (${projectNaam})` : taak.tekst;
                
                // Handle recurring tasks
                if (taak.herhalingActief && taak.herhalingType) {
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
    }

    filterPlanningActies() {
        const taakFilter = document.getElementById('planningTaakFilter')?.value.toLowerCase() || '';
        const projectFilter = document.getElementById('planningProjectFilter')?.value || '';
        const contextFilter = document.getElementById('planningContextFilter')?.value || '';
        const datumFilter = document.getElementById('planningDatumFilter')?.value || '';

        document.querySelectorAll('.planning-actie-item').forEach(item => {
            const actieId = item.dataset.actieId;
            // Use planningActies instead of this.taken for daily planning context
            const actie = this.planningActies?.find(t => t.id === actieId);
            
            if (!actie) return;
            
            let tonen = true;
            
            if (taakFilter && !actie.tekst.toLowerCase().includes(taakFilter)) tonen = false;
            if (projectFilter && actie.projectId !== projectFilter) tonen = false;
            if (contextFilter && actie.contextId !== contextFilter) tonen = false;
            
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

    updateUI() {
        const authButtons = document.getElementById('auth-buttons');
        const userInfo = document.getElementById('user-info');
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        
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
            
            // Show app content, hide welcome
            if (sidebarContent) sidebarContent.style.display = 'block';
            if (mainContent) mainContent.style.display = 'block';
            if (sidebarSearch) sidebarSearch.style.display = 'block';
            if (welcomeMessage) welcomeMessage.style.display = 'none';
            
        } else {
            // Unauthenticated state - show welcome message and login/register
            if (authButtons) authButtons.style.display = 'flex';
            if (userInfo) userInfo.style.display = 'none';
            
            // Hide app content, show welcome
            if (sidebarContent) sidebarContent.style.display = 'none';
            if (mainContent) mainContent.style.display = 'none';
            if (sidebarSearch) sidebarSearch.style.display = 'none';
            if (welcomeMessage) welcomeMessage.style.display = 'block';
        }
    }

    getCurrentUserId() {
        return this.isAuthenticated && this.currentUser ? this.currentUser.id : null;
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }
}

// Load version number on page load
async function loadVersionNumber() {
    try {
        const response = await fetch('/api/version');
        const data = await response.json();
        const versionElement = document.getElementById('version-number');
        if (versionElement && data.version) {
            versionElement.textContent = `v${data.version}`;
        }
    } catch (error) {
        console.log('Could not load version number:', error);
        // Keep the hardcoded version if API fails
    }
}

// Initialize app and authentication
const app = new Taakbeheer();
const auth = new AuthManager();

// Load version number when page loads
document.addEventListener('DOMContentLoaded', loadVersionNumber);