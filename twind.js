// tailwind js
class CustomSelect {
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
    }

    init() {
        // Clear previous selectedCustomerId on page load
        localStorage.removeItem('selectedCustomerId');

        // Hide the original select element so only the custom UI shows
        this.selectElement.style.display = 'none';

        // Create trigger
        this.trigger = document.createElement('div');
        this.trigger.className = 'custom-select-trigger';
        this.setTriggerText();
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

        // Populate options
        this.populateOptions();

        // Add event listeners
        this.addEventListeners();

        // Watch for changes to the original select's options
        this.watchSelectChanges();
    }

    setTriggerText() {

        // make trigger text line-clamp 1
        this.trigger.style.whiteSpace = 'nowrap';
        this.trigger.style.overflow = 'hidden';
        this.trigger.style.textOverflow = 'ellipsis';

        const selectedValue = this.selectElement.value || this.selectElement.options[0].value;
        const selectedOption = Array.from(this.selectElement.options).find(option => option.value === selectedValue);
        this.trigger.textContent = selectedOption ? selectedOption.text : '';

        // set title attribute for full text on hover
        this.trigger.title = "Selected: " + this.trigger.textContent;
    }

    populateOptions() {
        this.optionsContainer.innerHTML = '';
        const selectedValue = this.selectElement.value || this.selectElement.options[0].value;
        Array.from(this.selectElement.options).forEach((option) => {
            // Skip options that are hidden (filtered out)
            if (option.style.display === 'none' || option.disabled) {
                return;
            }

            // Support headers: if option has data-header or class 'header', render as header
            if (option.dataset && option.dataset.header !== undefined) {
                const headerDiv = document.createElement('div');
                headerDiv.className = 'custom-select-header';
                headerDiv.textContent = option.text;
                this.optionsContainer.appendChild(headerDiv);
            } else if (option.classList && option.classList.contains('header')) {
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
                        optionElement.dataset[key] = value;
                    }
                }

                // Highlight selected option
                if (option.value === selectedValue) {
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

        // set title attribute for full text on hover
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
            attributes: false,
            characterData: false,
        });
    }

    syncOptions() {
        const wasOpen = this.dropdown.style.display === 'block';
        this.populateOptions();
        this.setTriggerText();
        if (wasOpen) {
            this.dropdown.style.display = 'block';
            this.searchInput.value = '';
            this.filterOptions('');
        }
    }

    /**
     * Scans the page for all <select> elements with more than 10 <option>
     * tags and converts them into CustomSelect instances, regardless of
     * whether they already have a .custom-select wrapper parent.
     */
    static autoInit(minOptions = 10) {
        const instances = [];
        document.querySelectorAll('select').forEach((select) => {
            // Skip ones already converted
            if (select.dataset.customSelectInitialized) return;

            const optionCount = select.querySelectorAll('option').length;
            if (optionCount > minOptions) {
                select.dataset.customSelectInitialized = 'true';
                instances.push(new CustomSelect(select));
            }
        });
        return instances;
    }
}

// Example usage: run after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    CustomSelect.autoInit();
});

// Initialize custom selects
document.querySelectorAll('.custom-select').forEach(select => {
    const originalSelect = select.querySelector('select');
    new CustomSelect(originalSelect);
});

function initializeCustomSelects(minOptions = 10) {
    console.log(`Initializing custom selects with more than ${minOptions} options...`);
    // Original behavior: init any select already wrapped in .custom-select
    document.querySelectorAll('.custom-select').forEach(select => {
        const originalSelect = select.querySelector('select');
        if (originalSelect && !select.querySelector('.custom-select-trigger')) {
            new CustomSelect(originalSelect);
        }
    });

    // New behavior: find any <select> on the page (wrapped or not) with
    // more than `minOptions` options, and initialize it if not already done
    document.querySelectorAll('select').forEach(originalSelect => {
        const optionCount = originalSelect.querySelectorAll('option').length;
        if (optionCount <= minOptions) return;

        const wrapper = originalSelect.closest('.custom-select');

        // Already initialized (has a trigger built) -> skip
        if (wrapper && wrapper.querySelector('.custom-select-trigger')) return;

        new CustomSelect(originalSelect);
    });
}