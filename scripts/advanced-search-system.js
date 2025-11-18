// Advanced Search and Filtering System
class AdvancedSearchSystem {
    constructor() {
        this.API_BASE = window.APP_CONFIG ? window.APP_CONFIG.getApiBase() : 'https://tmvbusinesssolutions.co.za/api';
        this.searchHistory = [];
        this.savedSearches = [];
        this.currentFilters = {};
        this.searchResults = [];
        this.init();
    }

    init() {
        this.loadSearchHistory();
        this.loadSavedSearches();
        this.setupAdvancedSearchUI();
        this.setupSearchEventListeners();
    }

    // Enhanced Job Search UI
    setupAdvancedSearchUI() {
        const searchContainer = this.createAdvancedSearchContainer();
        
        // Insert into jobs section
        const jobsSection = document.querySelector('.jobseeker-jobs-public-section') || 
                           document.querySelector('.jobseeker-jobs-container')?.parentElement;
        
        if (jobsSection) {
            jobsSection.insertAdjacentHTML('afterbegin', searchContainer);
            this.initializeSearchComponents();
        }
    }

    createAdvancedSearchContainer() {
        return `
            <div class="advanced-search-container">
                <div class="search-header">
                    <h3>🔍 Advanced Job Search</h3>
                    <button class="search-toggle-btn" onclick="advancedSearch.toggleSearchPanel()">
                        Advanced Filters
                    </button>
                </div>
                
                <!-- Quick Search Bar -->
                <div class="quick-search-bar">
                    <div class="search-input-group">
                        <input type="text" id="quickSearchInput" class="search-input" 
                               placeholder="Search jobs by title, company, keywords...">
                        <button class="search-btn" onclick="advancedSearch.performQuickSearch()">
                            🔍 Search
                        </button>
                    </div>
                    
                    <!-- Search Suggestions -->
                    <div class="search-suggestions" id="searchSuggestions" style="display: none;">
                        <!-- Auto-complete suggestions will appear here -->
                    </div>
                </div>

                <!-- Advanced Search Panel -->
                <div class="advanced-search-panel" id="advancedSearchPanel" style="display: none;">
                    <div class="search-filters-grid">
                        <!-- Location Filters -->
                        <div class="filter-group">
                            <label>📍 Location</label>
                            <div class="filter-options">
                                <select id="locationFilter" class="filter-select">
                                    <option value="">All Locations</option>
                                    <option value="johannesburg">Johannesburg</option>
                                    <option value="cape-town">Cape Town</option>
                                    <option value="durban">Durban</option>
                                    <option value="pretoria">Pretoria</option>
                                    <option value="port-elizabeth">Port Elizabeth</option>
                                    <option value="bloemfontein">Bloemfontein</option>
                                    <option value="remote">Remote</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                                <input type="range" id="radiusFilter" min="5" max="100" value="25" 
                                       class="radius-slider">
                                <span class="radius-display">Within <span id="radiusValue">25</span> km</span>
                            </div>
                        </div>

                        <!-- Industry/Department Filters -->
                        <div class="filter-group">
                            <label>🏢 Industry</label>
                            <div class="checkbox-group">
                                <label class="checkbox-item">
                                    <input type="checkbox" value="IT" class="industry-filter">
                                    <span>Information Technology</span>
                                </label>
                                <label class="checkbox-item">
                                    <input type="checkbox" value="Finance" class="industry-filter">
                                    <span>Finance & Banking</span>
                                </label>
                                <label class="checkbox-item">
                                    <input type="checkbox" value="Healthcare" class="industry-filter">
                                    <span>Healthcare</span>
                                </label>
                                <label class="checkbox-item">
                                    <input type="checkbox" value="Marketing" class="industry-filter">
                                    <span>Marketing & Sales</span>
                                </label>
                                <label class="checkbox-item">
                                    <input type="checkbox" value="Engineering" class="industry-filter">
                                    <span>Engineering</span>
                                </label>
                                <label class="checkbox-item">
                                    <input type="checkbox" value="Education" class="industry-filter">
                                    <span>Education</span>
                                </label>
                            </div>
                        </div>

                        <!-- Job Type Filters -->
                        <div class="filter-group">
                            <label>💼 Job Type</label>
                            <div class="checkbox-group">
                                <label class="checkbox-item">
                                    <input type="checkbox" value="Full-time" class="job-type-filter">
                                    <span>Full-time</span>
                                </label>
                                <label class="checkbox-item">
                                    <input type="checkbox" value="Part-time" class="job-type-filter">
                                    <span>Part-time</span>
                                </label>
                                <label class="checkbox-item">
                                    <input type="checkbox" value="Contract" class="job-type-filter">
                                    <span>Contract</span>
                                </label>
                                <label class="checkbox-item">
                                    <input type="checkbox" value="Internship" class="job-type-filter">
                                    <span>Internship</span>
                                </label>
                                <label class="checkbox-item">
                                    <input type="checkbox" value="Freelance" class="job-type-filter">
                                    <span>Freelance</span>
                                </label>
                            </div>
                        </div>

                        <!-- Experience Level -->
                        <div class="filter-group">
                            <label>📊 Experience Level</label>
                            <select id="experienceFilter" class="filter-select">
                                <option value="">All Experience Levels</option>
                                <option value="entry">Entry Level (0-2 years)</option>
                                <option value="mid">Mid Level (3-5 years)</option>
                                <option value="senior">Senior Level (6-10 years)</option>
                                <option value="executive">Executive (10+ years)</option>
                                <option value="internship">Internship/Graduate</option>
                            </select>
                        </div>

                        <!-- Salary Range -->
                        <div class="filter-group">
                            <label>💰 Salary Range (Monthly)</label>
                            <div class="salary-range">
                                <input type="number" id="salaryMin" placeholder="Min" class="salary-input">
                                <span>to</span>
                                <input type="number" id="salaryMax" placeholder="Max" class="salary-input">
                                <select id="salaryCurrency" class="currency-select">
                                    <option value="ZAR">ZAR</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                        </div>

                        <!-- Date Posted -->
                        <div class="filter-group">
                            <label>📅 Date Posted</label>
                            <select id="datePostedFilter" class="filter-select">
                                <option value="">Any time</option>
                                <option value="1">Last 24 hours</option>
                                <option value="3">Last 3 days</option>
                                <option value="7">Last week</option>
                                <option value="14">Last 2 weeks</option>
                                <option value="30">Last month</option>
                            </select>
                        </div>

                        <!-- Company Size -->
                        <div class="filter-group">
                            <label>🏭 Company Size</label>
                            <select id="companySizeFilter" class="filter-select">
                                <option value="">Any size</option>
                                <option value="startup">Startup (1-10 employees)</option>
                                <option value="small">Small (11-50 employees)</option>
                                <option value="medium">Medium (51-200 employees)</option>
                                <option value="large">Large (201-1000 employees)</option>
                                <option value="enterprise">Enterprise (1000+ employees)</option>
                            </select>
                        </div>

                        <!-- Skills -->
                        <div class="filter-group">
                            <label>🎯 Required Skills</label>
                            <div class="skills-filter">
                                <input type="text" id="skillsFilterInput" class="skills-input" 
                                       placeholder="Add skills (press Enter)">
                                <div class="selected-skills" id="selectedSkills">
                                    <!-- Selected skills will appear here as badges -->
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Search Actions -->
                    <div class="search-actions">
                        <button class="btn-search" onclick="advancedSearch.performAdvancedSearch()">
                            🔍 Search Jobs
                        </button>
                        <button class="btn-clear" onclick="advancedSearch.clearAllFilters()">
                            🗑️ Clear All
                        </button>
                        <button class="btn-save" onclick="advancedSearch.saveCurrentSearch()">
                            💾 Save Search
                        </button>
                    </div>
                </div>

                <!-- Search Results Summary -->
                <div class="search-results-summary" id="searchResultsSummary" style="display: none;">
                    <div class="results-info">
                        <span id="resultsCount">0 jobs found</span>
                        <div class="sort-options">
                            <label>Sort by:</label>
                            <select id="sortResults" onchange="advancedSearch.sortResults()">
                                <option value="relevance">Relevance</option>
                                <option value="date">Date Posted</option>
                                <option value="salary">Salary</option>
                                <option value="company">Company</option>
                                <option value="location">Location</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Active Filters Display -->
                    <div class="active-filters" id="activeFilters">
                        <!-- Active filter badges will appear here -->
                    </div>
                </div>

                <!-- Saved Searches -->
                <div class="saved-searches-section" id="savedSearchesSection" style="display: none;">
                    <h4>💾 Saved Searches</h4>
                    <div class="saved-searches-list" id="savedSearchesList">
                        <!-- Saved searches will appear here -->
                    </div>
                </div>
            </div>
        `;
    }

    initializeSearchComponents() {
        // Setup auto-complete for quick search
        this.setupAutoComplete();
        
        // Setup radius slider
        this.setupRadiusSlider();
        
        // Setup skills filter
        this.setupSkillsFilter();
        
        // Load saved searches if any
        this.displaySavedSearches();
    }

    setupSearchEventListeners() {
        // Quick search on Enter key
        document.getElementById('quickSearchInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performQuickSearch();
            }
        });

        // Auto-search on filter changes (debounced)
        this.setupAutoSearch();
    }

    setupAutoComplete() {
        const input = document.getElementById('quickSearchInput');
        if (!input) return;

        let debounceTimer;
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.showSearchSuggestions(e.target.value);
            }, 300);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.quick-search-bar')) {
                this.hideSuggestions();
            }
        });
    }

    showSearchSuggestions(query) {
        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }

        // Generate suggestions based on search history and common terms
        const suggestions = this.generateSuggestions(query);
        this.displaySuggestions(suggestions);
    }

    generateSuggestions(query) {
        const commonTerms = [
            'software developer', 'project manager', 'data analyst', 
            'marketing coordinator', 'sales representative', 'accountant',
            'graphic designer', 'human resources', 'customer service',
            'business analyst', 'web developer', 'content writer'
        ];

        const historySuggestions = this.searchHistory
            .filter(term => term.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 3);

        const termSuggestions = commonTerms
            .filter(term => term.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5);

        return [...new Set([...historySuggestions, ...termSuggestions])];
    }

    displaySuggestions(suggestions) {
        const container = document.getElementById('searchSuggestions');
        if (!container) return;

        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        container.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" onclick="advancedSearch.selectSuggestion('${suggestion}')">
                🔍 ${suggestion}
            </div>
        `).join('');

        container.style.display = 'block';
    }

    selectSuggestion(suggestion) {
        document.getElementById('quickSearchInput').value = suggestion;
        this.hideSuggestions();
        this.performQuickSearch();
    }

    hideSuggestions() {
        const container = document.getElementById('searchSuggestions');
        if (container) {
            container.style.display = 'none';
        }
    }

    setupRadiusSlider() {
        const slider = document.getElementById('radiusFilter');
        const display = document.getElementById('radiusValue');
        
        if (slider && display) {
            slider.addEventListener('input', (e) => {
                display.textContent = e.target.value;
            });
        }
    }

    setupSkillsFilter() {
        const input = document.getElementById('skillsFilterInput');
        if (!input) return;

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const skill = e.target.value.trim();
                if (skill) {
                    this.addSkillFilter(skill);
                    e.target.value = '';
                }
            }
        });
    }

    addSkillFilter(skill) {
        const container = document.getElementById('selectedSkills');
        if (!container) return;

        const skillBadge = document.createElement('div');
        skillBadge.className = 'skill-badge';
        skillBadge.innerHTML = `
            ${skill}
            <button onclick="this.parentElement.remove(); advancedSearch.updateFilters();">×</button>
        `;
        
        container.appendChild(skillBadge);
        this.updateFilters();
    }

    toggleSearchPanel() {
        const panel = document.getElementById('advancedSearchPanel');
        const btn = document.querySelector('.search-toggle-btn');
        
        if (panel && btn) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
            btn.textContent = isVisible ? 'Advanced Filters' : 'Hide Filters';
        }
    }

    performQuickSearch() {
        const query = document.getElementById('quickSearchInput')?.value?.trim();
        if (!query) return;

        // Add to search history
        this.addToSearchHistory(query);

        // Perform search
        this.currentFilters = { query };
        this.executeSearch();
    }

    performAdvancedSearch() {
        this.collectAllFilters();
        this.executeSearch();
    }

    collectAllFilters() {
        this.currentFilters = {
            query: document.getElementById('quickSearchInput')?.value?.trim() || '',
            location: document.getElementById('locationFilter')?.value || '',
            radius: document.getElementById('radiusFilter')?.value || '',
            experience: document.getElementById('experienceFilter')?.value || '',
            salaryMin: document.getElementById('salaryMin')?.value || '',
            salaryMax: document.getElementById('salaryMax')?.value || '',
            currency: document.getElementById('salaryCurrency')?.value || 'ZAR',
            datePosted: document.getElementById('datePostedFilter')?.value || '',
            companySize: document.getElementById('companySizeFilter')?.value || '',
            industries: Array.from(document.querySelectorAll('.industry-filter:checked')).map(cb => cb.value),
            jobTypes: Array.from(document.querySelectorAll('.job-type-filter:checked')).map(cb => cb.value),
            skills: Array.from(document.querySelectorAll('.skill-badge')).map(badge => badge.textContent.replace('×', '').trim())
        };
    }

    executeSearch() {
        this.showSearchProgress();
        
        // Build search API call
        const searchParams = new URLSearchParams();
        
        Object.entries(this.currentFilters).forEach(([key, value]) => {
            if (value && value.length > 0) {
                if (Array.isArray(value)) {
                    value.forEach(item => searchParams.append(key, item));
                } else {
                    searchParams.append(key, value);
                }
            }
        });

        fetch(`${this.API_BASE}/jobs/search?${searchParams.toString()}`, {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            this.hideSearchProgress();
            if (data.success) {
                this.searchResults = data.jobs;
                this.displaySearchResults(data.jobs);
                this.updateResultsSummary(data.jobs.length);
                this.displayActiveFilters();
            } else {
                this.showSearchError(data.message);
            }
        })
        .catch(error => {
            this.hideSearchProgress();
            this.showSearchError('Search failed. Please try again.');
            console.error('Search error:', error);
        });
    }

    displaySearchResults(jobs) {
        // Update the existing jobs container with search results
        const container = document.getElementById('jobsContainerPublic') || 
                         document.querySelector('.jobseeker-jobs-container');
        
        if (!container) return;

        if (jobs.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <h3>No jobs found</h3>
                    <p>Try adjusting your search criteria or browse all available jobs.</p>
                    <button onclick="advancedSearch.clearAllFilters()" class="btn-primary">
                        Clear Filters
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = jobs.map(job => this.createJobCard(job)).join('');
    }

    createJobCard(job) {
        return `
            <div class="job-card enhanced-card" data-job-id="${job.id}">
                <div class="job-header">
                    <h3 class="job-title">${job.title}</h3>
                    <div class="job-company">${job.company}</div>
                </div>
                
                <div class="job-details">
                    <div class="job-meta">
                        <span class="job-location">📍 ${job.location}</span>
                        <span class="job-type">💼 ${job.type}</span>
                        <span class="job-salary">💰 ${job.salary || 'Negotiable'}</span>
                        <span class="job-date">📅 ${this.formatDate(job.createdAt)}</span>
                    </div>
                    
                    <div class="job-description">
                        ${job.description.substring(0, 150)}...
                    </div>
                    
                    ${job.skills ? `
                        <div class="job-skills">
                            ${job.skills.split(',').slice(0, 5).map(skill => 
                                `<span class="skill-tag">${skill.trim()}</span>`
                            ).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="job-actions">
                    <button onclick="advancedSearch.viewJobDetails(${job.id})" class="btn-view">
                        View Details
                    </button>
                    <button onclick="advancedSearch.applyToJob(${job.id})" class="btn-apply">
                        Apply Now
                    </button>
                    <button onclick="advancedSearch.saveJob(${job.id})" class="btn-save-job">
                        💾 Save
                    </button>
                </div>
            </div>
        `;
    }

    updateResultsSummary(count) {
        const summary = document.getElementById('searchResultsSummary');
        const countElement = document.getElementById('resultsCount');
        
        if (summary && countElement) {
            countElement.textContent = `${count} job${count !== 1 ? 's' : ''} found`;
            summary.style.display = 'block';
        }
    }

    displayActiveFilters() {
        const container = document.getElementById('activeFilters');
        if (!container) return;

        const activeFilters = [];
        
        Object.entries(this.currentFilters).forEach(([key, value]) => {
            if (value && value.length > 0) {
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        activeFilters.push({ key, value: item });
                    });
                } else {
                    activeFilters.push({ key, value });
                }
            }
        });

        container.innerHTML = activeFilters.map(filter => `
            <div class="filter-badge">
                ${this.formatFilterLabel(filter.key)}: ${filter.value}
                <button onclick="advancedSearch.removeFilter('${filter.key}', '${filter.value}')">×</button>
            </div>
        `).join('');
    }

    formatFilterLabel(key) {
        const labels = {
            query: 'Search',
            location: 'Location',
            experience: 'Experience',
            salaryMin: 'Min Salary',
            salaryMax: 'Max Salary',
            datePosted: 'Date Posted',
            companySize: 'Company Size',
            industries: 'Industry',
            jobTypes: 'Job Type',
            skills: 'Skill'
        };
        return labels[key] || key;
    }

    // Additional utility methods
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    }

    addToSearchHistory(query) {
        this.searchHistory = this.searchHistory.filter(item => item !== query);
        this.searchHistory.unshift(query);
        this.searchHistory = this.searchHistory.slice(0, 10); // Keep last 10 searches
        localStorage.setItem('search_history', JSON.stringify(this.searchHistory));
    }

    loadSearchHistory() {
        this.searchHistory = JSON.parse(localStorage.getItem('search_history') || '[]');
    }

    clearAllFilters() {
        // Reset all form elements
        document.getElementById('quickSearchInput').value = '';
        document.getElementById('locationFilter').value = '';
        document.getElementById('experienceFilter').value = '';
        document.getElementById('salaryMin').value = '';
        document.getElementById('salaryMax').value = '';
        document.getElementById('datePostedFilter').value = '';
        document.getElementById('companySizeFilter').value = '';
        
        // Clear checkboxes
        document.querySelectorAll('.industry-filter, .job-type-filter').forEach(cb => cb.checked = false);
        
        // Clear skills
        document.getElementById('selectedSkills').innerHTML = '';
        
        // Clear current filters
        this.currentFilters = {};
        
        // Hide search results
        this.hideSearchResults();
    }

    showSearchProgress() {
        // Implementation for search loading state
    }

    hideSearchProgress() {
        // Implementation to hide search loading state
    }

    showSearchError(message) {
        // Implementation for error display
        console.error('Search error:', message);
    }

    hideSearchResults() {
        document.getElementById('searchResultsSummary').style.display = 'none';
    }
}

// Initialize advanced search system
const advancedSearch = new AdvancedSearchSystem();