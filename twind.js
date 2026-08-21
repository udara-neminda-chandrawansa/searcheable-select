class CustomSelect {
    // Store instances globally so reinitialize can update them
    static instances = [];

    constructor(selectElement) {
        this.selectElement = selectElement;
        this.customSelect = selectElement.closest('.custom-select');

        // If there's no existing .custom-select wrapper, create one dynamically
        if (!this.customSelect) {
            this.customSelect = document.createElement('div');
            this.customSelect.className = 'custom-select';
            selectElement.parentNode.insertBefore(this.customSelect, selectElement);
            this.customSelect.appendChild(selectElement);
        }

        this.init();
        
        // Track this instance
        CustomSelect.instances.push(this);
    }

    init() {
        // Hide the original select element so only the custom UI shows
        this.selectElement.style.display = 'none';

        // Prevent duplicate triggers if init is called multiple times
        if (!this.customSelect.querySelector('.custom-select-trigger')) {
            // Create trigger
            this.trigger = document.createElement('div');
            this.trigger.className = 'custom-select-trigger';
            this.customSelect.appendChild(this.trigger);

            // Create dropdown
            this.dropdown = document.createElement('div');
            this.dropdown.className = 'custom-select-dropdown';
            this.customSelect.appendChild(this.dropdown);

            // Create search input
            this.searchInput = document.createElement('input');
            this.searchInput.type = 'text';
            this.searchInput.className = 'custom-select-search';
            this.searchInput.placeholder = 'Search...';
            this.dropdown.appendChild(this.searchInput);

            // Create options container
            this.optionsContainer = document.createElement('div');
            this.optionsContainer.className = 'custom-select-options';
            this.dropdown.appendChild(this.optionsContainer);

            // Add event listeners
            this.addEventListeners();

            // Watch for changes to the original select's options
            this.watchSelectChanges();
        }

        // Set text and populate options based on current DOM state
        this.setTriggerText();
        this.populateOptions();
    }

    setTriggerText() {
        // make trigger text line-clamp 1
        this.trigger.style.whiteSpace = 'nowrap';
        this.trigger.style.overflow = 'hidden';
        this.trigger.style.textOverflow = 'ellipsis';

        // FIX: Just use .value. The browser automatically resolves 
        // <select value="x"> and <option selected="selected"> into .value
        const selectedValue = this.selectElement.value;
        const selectedOption = Array.from(this.selectElement.options).find(option => option.value === selectedValue);
        
        this.trigger.textContent = selectedOption ? selectedOption.text : '';
        this.trigger.title = selectedOption ? "Selected: " + selectedOption.text : "";
    }

    populateOptions() {
        this.optionsContainer.innerHTML = '';
        
        // FIX: Read native .value directly (resolves both 'value' attr and 'selected' attr)
        const selectedValue = this.selectElement.value; 

        Array.from(this.selectElement.options).forEach((option) => {
            // Skip options that are hidden (filtered out)
            if (option.style.display === 'none' || option.disabled) {
                return;
            }

            // Support headers
            const isHeader = (option.dataset && option.dataset.header !== undefined) || 
                             (option.classList && option.classList.contains('header'));
                             
            if (isHeader) {
                const headerDiv = document.createElement('div');
                headerDiv.className = 'custom-select-header';
                headerDiv.textContent = option.text;
                this.optionsContainer.appendChild(headerDiv);
            } else if (option.value) {
                const optionElement = document.createElement('div');
                optionElement.className = 'custom-select-option';
                optionElement.textContent = option.text;
                optionElement.dataset.value = option.value;

                // Copy all data attributes from original option to custom option
                if (option.dataset) {
                    for (const [key, value] of Object.entries(option.dataset)) {
                        if (key !== 'header') optionElement.dataset[key] = value;
                    }
                }

                // FIX: Highlight selected option using native value OR native selected property
                if (option.value === selectedValue || option.selected) {
                    optionElement.classList.add('selected');
                }
                
                optionElement.addEventListener('click', () => {
                    this.selectOption(optionElement);
                });
                
                this.optionsContainer.appendChild(optionElement);
            }
        });
    }

    addEventListeners() {
        // Toggle dropdown
        this.trigger.addEventListener('click', () => {
            this.dropdown.style.display =
                this.dropdown.style.display === 'block' ? 'none' : 'block';
            this.searchInput.value = '';
            this.filterOptions('');
            this.searchInput.focus();
        });

        // Search functionality
        this.searchInput.addEventListener('input', (e) => {
            this.filterOptions(e.target.value.toLowerCase());
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.customSelect.contains(e.target)) {
                this.dropdown.style.display = 'none';
            }
        });
    }

    filterOptions(searchTerm) {
        const options = this.optionsContainer.querySelectorAll('.custom-select-option');
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            option.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    }

    selectOption(optionElement) {
        // Remove selected class from all options
        this.optionsContainer.querySelectorAll('.custom-select-option')
            .forEach(opt => opt.classList.remove('selected'));

        // Add selected class to clicked option
        optionElement.classList.add('selected');

        // Update trigger text
        this.trigger.textContent = optionElement.textContent;
        this.trigger.title = "Selected: " + optionElement.textContent;

        // Update original select element
        const valueToSet = optionElement.dataset.value;
        this.selectElement.value = valueToSet;

        // Store selected value in localStorage ONLY for customer dropdown
        if (this.selectElement.id === 'customer' || this.selectElement.name === 'customer') {
            localStorage.setItem('selectedCustomerId', valueToSet);
        }

        // Dispatch change event on original select element
        const event = new Event('change', { bubbles: true });
        this.selectElement.dispatchEvent(event);

        // Hide dropdown
        this.dropdown.style.display = 'none';
    }

    watchSelectChanges() {
        const observer = new MutationObserver(() => {
            this.syncOptions();
        });
        observer.observe(this.selectElement, {
            childList: true,
            subtree: true,
            attributes: true, // Watch attributes so if JS changes 'selected', it updates
            characterData: false,
        });
    }

    syncOptions() {
        const wasOpen = this.dropdown.style.display === 'block';
        
        // Re-reads the select's current value and rebuilds the custom UI
        this.populateOptions();
        this.setTriggerText();
        
        if (wasOpen) {
            this.dropdown.style.display = 'block';
            this.searchInput.value = '';
            this.filterOptions('');
        }
    }

    /**
     * REINITIALIZE METHOD
     * 1. Updates all existing custom selects to reflect any HTML changes (like added selected tags).
     * 2. Scans the DOM for any NEW selects that meet the criteria and initializes them.
     */
    static reinitialize(minOptions = 10) {
        // 1. Sync existing instances
        CustomSelect.instances.forEach(instance => {
            // Check if the select was removed from the DOM entirely
            if (!document.body.contains(instance.selectElement)) {
                instance.customSelect.remove();
                return;
            }
            instance.syncOptions();
        });

        // 2. Find and initialize NEW selects with > minOptions
        document.querySelectorAll('select').forEach(select => {
            if (select.dataset.customSelectInitialized) return;

            const optionCount = select.querySelectorAll('option').length;
            if (optionCount > minOptions) {
                select.dataset.customSelectInitialized = 'true';
                new CustomSelect(select);
            }
        });

        // 3. Find and initialize explicitly wrapped .custom-select elements
        document.querySelectorAll('.custom-select').forEach(wrapper => {
            const originalSelect = wrapper.querySelector('select');
            if (originalSelect && !originalSelect.dataset.customSelectInitialized) {
                originalSelect.dataset.customSelectInitialized = 'true';
                new CustomSelect(originalSelect);
            }
        });
    }
}

// Clean DOM Ready initialization
document.addEventListener('DOMContentLoaded', () => {
    CustomSelect.reinitialize();
});