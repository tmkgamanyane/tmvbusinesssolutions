// Dashboard Analytics System
class DashboardAnalytics {
    constructor() {
        this.API_BASE = window.APP_CONFIG ? window.APP_CONFIG.getApiBase() : 'https://tmvbusinesssolutions.co.za/api';
        this.charts = {};
        this.refreshInterval = null;
        this.updateFrequency = 30000; // 30 seconds
        this.init();
    }

    init() {
        this.detectUserRole();
        this.createAnalyticsContainer();
        this.loadAnalyticsData();
        this.setupAutoRefresh();
    }

    detectUserRole() {
        // Detect current user role from URL, session, or context
        const path = window.location.pathname;
        if (path.includes('employer') || path.includes('management')) {
            this.userRole = 'employer';
        } else if (path.includes('admin')) {
            this.userRole = 'admin';
        } else {
            this.userRole = 'jobseeker';
        }
    }

    createAnalyticsContainer() {
        const container = this.createAnalyticsHTML();
        
        // Insert analytics into appropriate dashboard section
        const dashboardContent = document.querySelector('.jobseeker-dashboard-content') ||
                                document.querySelector('.employer-dashboard-content') ||
                                document.querySelector('.management-dashboard-content') ||
                                document.querySelector('.dashboard-content');
        
        if (dashboardContent) {
            dashboardContent.insertAdjacentHTML('afterbegin', container);
            this.initializeCharts();
        }
    }

    createAnalyticsHTML() {
        if (this.userRole === 'jobseeker') {
            return this.createJobseekerAnalytics();
        } else if (this.userRole === 'employer') {
            return this.createEmployerAnalytics();
        } else if (this.userRole === 'admin') {
            return this.createAdminAnalytics();
        }
        return '';
    }

    createJobseekerAnalytics() {
        return `
            <div class="analytics-dashboard jobseeker-analytics">
                <div class="analytics-header">
                    <h3>📊 Your Career Analytics</h3>
                    <div class="analytics-refresh">
                        <button onclick="dashboardAnalytics.refreshAnalytics()" class="btn-refresh">
                            🔄 Refresh
                        </button>
                        <span class="last-updated" id="lastUpdated">Updated: Never</span>
                    </div>
                </div>

                <!-- Quick Stats Cards -->
                <div class="stats-cards-grid">
                    <div class="stat-card applications">
                        <div class="stat-icon">📋</div>
                        <div class="stat-content">
                            <div class="stat-number" id="totalApplications">0</div>
                            <div class="stat-label">Total Applications</div>
                            <div class="stat-change" id="applicationsChange">—</div>
                        </div>
                    </div>

                    <div class="stat-card interviews">
                        <div class="stat-icon">🤝</div>
                        <div class="stat-content">
                            <div class="stat-number" id="totalInterviews">0</div>
                            <div class="stat-label">Interviews Scheduled</div>
                            <div class="stat-change" id="interviewsChange">—</div>
                        </div>
                    </div>

                    <div class="stat-card success-rate">
                        <div class="stat-icon">⭐</div>
                        <div class="stat-content">
                            <div class="stat-number" id="successRate">0%</div>
                            <div class="stat-label">Interview Rate</div>
                            <div class="stat-change" id="successRateChange">—</div>
                        </div>
                    </div>

                    <div class="stat-card profile-views">
                        <div class="stat-icon">👀</div>
                        <div class="stat-content">
                            <div class="stat-number" id="profileViews">0</div>
                            <div class="stat-label">Profile Views</div>
                            <div class="stat-change" id="profileViewsChange">—</div>
                        </div>
                    </div>
                </div>

                <!-- Charts Section -->
                <div class="analytics-charts">
                    <div class="chart-container">
                        <div class="chart-header">
                            <h4>Application Status Breakdown</h4>
                            <div class="chart-filters">
                                <select id="applicationPeriodFilter" onchange="dashboardAnalytics.updateCharts()">
                                    <option value="30">Last 30 days</option>
                                    <option value="90">Last 3 months</option>
                                    <option value="365">Last year</option>
                                    <option value="all">All time</option>
                                </select>
                            </div>
                        </div>
                        <div class="chart-canvas">
                            <canvas id="applicationStatusChart" width="400" height="300"></canvas>
                        </div>
                    </div>

                    <div class="chart-container">
                        <div class="chart-header">
                            <h4>Application Activity Timeline</h4>
                        </div>
                        <div class="chart-canvas">
                            <canvas id="applicationTimelineChart" width="400" height="300"></canvas>
                        </div>
                    </div>

                    <div class="chart-container">
                        <div class="chart-header">
                            <h4>Industry Application Distribution</h4>
                        </div>
                        <div class="chart-canvas">
                            <canvas id="industryDistributionChart" width="400" height="300"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Insights Section -->
                <div class="analytics-insights">
                    <h4>💡 Personalized Insights</h4>
                    <div class="insights-list" id="jobseekerInsights">
                        <!-- Insights will be loaded here -->
                    </div>
                </div>

                <!-- Recommendations -->
                <div class="analytics-recommendations">
                    <h4>🎯 Recommendations for You</h4>
                    <div class="recommendations-list" id="jobseekerRecommendations">
                        <!-- Recommendations will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    createEmployerAnalytics() {
        return `
            <div class="analytics-dashboard employer-analytics">
                <div class="analytics-header">
                    <h3>📊 Recruitment Analytics</h3>
                    <div class="analytics-controls">
                        <select id="analyticsTimeframe" onchange="dashboardAnalytics.updateTimeframe()">
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 3 months</option>
                            <option value="365">Last year</option>
                        </select>
                        <button onclick="dashboardAnalytics.exportReport()" class="btn-export">
                            📄 Export Report
                        </button>
                        <button onclick="dashboardAnalytics.refreshAnalytics()" class="btn-refresh">
                            🔄 Refresh
                        </button>
                    </div>
                </div>

                <!-- KPI Cards -->
                <div class="stats-cards-grid employer-stats">
                    <div class="stat-card job-posts">
                        <div class="stat-icon">📝</div>
                        <div class="stat-content">
                            <div class="stat-number" id="totalJobPosts">0</div>
                            <div class="stat-label">Active Job Posts</div>
                            <div class="stat-trend" id="jobPostsTrend">—</div>
                        </div>
                    </div>

                    <div class="stat-card applications-received">
                        <div class="stat-icon">📨</div>
                        <div class="stat-content">
                            <div class="stat-number" id="totalApplicationsReceived">0</div>
                            <div class="stat-label">Applications Received</div>
                            <div class="stat-trend" id="applicationsReceivedTrend">—</div>
                        </div>
                    </div>

                    <div class="stat-card shortlisted">
                        <div class="stat-icon">⭐</div>
                        <div class="stat-content">
                            <div class="stat-number" id="totalShortlisted">0</div>
                            <div class="stat-label">Candidates Shortlisted</div>
                            <div class="stat-trend" id="shortlistedTrend">—</div>
                        </div>
                    </div>

                    <div class="stat-card hired">
                        <div class="stat-icon">🎉</div>
                        <div class="stat-content">
                            <div class="stat-number" id="totalHired">0</div>
                            <div class="stat-label">Candidates Hired</div>
                            <div class="stat-trend" id="hiredTrend">—</div>
                        </div>
                    </div>

                    <div class="stat-card time-to-hire">
                        <div class="stat-icon">⏱️</div>
                        <div class="stat-content">
                            <div class="stat-number" id="avgTimeToHire">0</div>
                            <div class="stat-label">Avg. Time to Hire (days)</div>
                            <div class="stat-trend" id="timeToHireTrend">—</div>
                        </div>
                    </div>

                    <div class="stat-card cost-per-hire">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-number" id="avgCostPerHire">R0</div>
                            <div class="stat-label">Avg. Cost per Hire</div>
                            <div class="stat-trend" id="costPerHireTrend">—</div>
                        </div>
                    </div>
                </div>

                <!-- Detailed Charts -->
                <div class="analytics-charts employer-charts">
                    <div class="chart-container large">
                        <div class="chart-header">
                            <h4>Recruitment Funnel Analysis</h4>
                        </div>
                        <div class="chart-canvas">
                            <canvas id="recruitmentFunnelChart" width="800" height="400"></canvas>
                        </div>
                    </div>

                    <div class="chart-container">
                        <div class="chart-header">
                            <h4>Applications per Job Post</h4>
                        </div>
                        <div class="chart-canvas">
                            <canvas id="applicationsPerJobChart" width="400" height="300"></canvas>
                        </div>
                    </div>

                    <div class="chart-container">
                        <div class="chart-header">
                            <h4>Candidate Source Analysis</h4>
                        </div>
                        <div class="chart-canvas">
                            <canvas id="candidateSourceChart" width="400" height="300"></canvas>
                        </div>
                    </div>

                    <div class="chart-container">
                        <div class="chart-header">
                            <h4>Monthly Hiring Trends</h4>
                        </div>
                        <div class="chart-canvas">
                            <canvas id="hiringTrendsChart" width="400" height="300"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Performance Insights -->
                <div class="analytics-insights employer-insights">
                    <h4>📈 Performance Insights</h4>
                    <div class="insights-grid">
                        <div class="insight-card">
                            <h5>Top Performing Job Posts</h5>
                            <div class="insight-content" id="topJobPosts">
                                <!-- Top job posts will be loaded here -->
                            </div>
                        </div>

                        <div class="insight-card">
                            <h5>Application Quality Score</h5>
                            <div class="insight-content" id="qualityScore">
                                <!-- Quality metrics will be loaded here -->
                            </div>
                        </div>

                        <div class="insight-card">
                            <h5>Recruitment Bottlenecks</h5>
                            <div class="insight-content" id="bottlenecks">
                                <!-- Bottleneck analysis will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createAdminAnalytics() {
        return `
            <div class="analytics-dashboard admin-analytics">
                <div class="analytics-header">
                    <h3>📊 System Analytics</h3>
                    <div class="analytics-controls">
                        <select id="adminTimeframe" onchange="dashboardAnalytics.updateTimeframe()">
                            <option value="1">Today</option>
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 3 months</option>
                        </select>
                        <button onclick="dashboardAnalytics.generateSystemReport()" class="btn-report">
                            📊 System Report
                        </button>
                    </div>
                </div>

                <!-- System Overview -->
                <div class="stats-cards-grid admin-stats">
                    <div class="stat-card total-users">
                        <div class="stat-icon">👥</div>
                        <div class="stat-content">
                            <div class="stat-number" id="totalUsers">0</div>
                            <div class="stat-label">Total Users</div>
                            <div class="stat-breakdown" id="userBreakdown">—</div>
                        </div>
                    </div>

                    <div class="stat-card active-sessions">
                        <div class="stat-icon">🟢</div>
                        <div class="stat-content">
                            <div class="stat-number" id="activeSessions">0</div>
                            <div class="stat-label">Active Sessions</div>
                            <div class="stat-breakdown" id="sessionsBreakdown">—</div>
                        </div>
                    </div>

                    <div class="stat-card system-health">
                        <div class="stat-icon">💚</div>
                        <div class="stat-content">
                            <div class="stat-number" id="systemHealth">100%</div>
                            <div class="stat-label">System Health</div>
                            <div class="stat-breakdown" id="healthBreakdown">—</div>
                        </div>
                    </div>

                    <div class="stat-card revenue">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-number" id="totalRevenue">R0</div>
                            <div class="stat-label">Revenue (MTD)</div>
                            <div class="stat-breakdown" id="revenueBreakdown">—</div>
                        </div>
                    </div>
                </div>

                <!-- System Charts -->
                <div class="analytics-charts admin-charts">
                    <div class="chart-container large">
                        <div class="chart-header">
                            <h4>Platform Usage Overview</h4>
                        </div>
                        <div class="chart-canvas">
                            <canvas id="platformUsageChart" width="800" height="400"></canvas>
                        </div>
                    </div>

                    <div class="chart-container">
                        <div class="chart-header">
                            <h4>User Registration Trends</h4>
                        </div>
                        <div class="chart-canvas">
                            <canvas id="userRegistrationChart" width="400" height="300"></canvas>
                        </div>
                    </div>

                    <div class="chart-container">
                        <div class="chart-header">
                            <h4>Feature Usage Statistics</h4>
                        </div>
                        <div class="chart-canvas">
                            <canvas id="featureUsageChart" width="400" height="300"></canvas>
                        </div>
                    </div>
                </div>

                <!-- System Health Monitoring -->
                <div class="system-monitoring">
                    <h4>🔧 System Monitoring</h4>
                    <div class="monitoring-grid">
                        <div class="monitoring-card">
                            <h5>Server Performance</h5>
                            <div class="performance-metrics" id="serverMetrics">
                                <!-- Server metrics will be loaded here -->
                            </div>
                        </div>

                        <div class="monitoring-card">
                            <h5>Database Performance</h5>
                            <div class="performance-metrics" id="databaseMetrics">
                                <!-- Database metrics will be loaded here -->
                            </div>
                        </div>

                        <div class="monitoring-card">
                            <h5>Error Logs</h5>
                            <div class="error-logs" id="errorLogs">
                                <!-- Error logs will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadAnalyticsData() {
        try {
            const endpoint = this.getAnalyticsEndpoint();
            const response = await fetch(`${this.API_BASE}${endpoint}`, {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();
            
            if (data.success) {
                this.updateAnalyticsDisplay(data);
                this.updateLastRefreshTime();
            } else {
                this.showAnalyticsError(data.message);
            }
        } catch (error) {
            this.showAnalyticsError('Failed to load analytics data');
            console.error('Analytics error:', error);
        }
    }

    getAnalyticsEndpoint() {
        switch (this.userRole) {
            case 'jobseeker':
                return '/jobseeker/analytics';
            case 'employer':
                return '/employer/analytics';
            case 'admin':
                return '/admin/analytics';
            default:
                return '/analytics/public';
        }
    }

    updateAnalyticsDisplay(data) {
        if (this.userRole === 'jobseeker') {
            this.updateJobseekerDisplay(data);
        } else if (this.userRole === 'employer') {
            this.updateEmployerDisplay(data);
        } else if (this.userRole === 'admin') {
            this.updateAdminDisplay(data);
        }
    }

    updateJobseekerDisplay(data) {
        // Update stat cards
        this.updateElement('totalApplications', data.totalApplications || 0);
        this.updateElement('totalInterviews', data.totalInterviews || 0);
        this.updateElement('successRate', `${data.successRate || 0}%`);
        this.updateElement('profileViews', data.profileViews || 0);

        // Update charts
        this.createApplicationStatusChart(data.applicationStatus);
        this.createApplicationTimelineChart(data.applicationTimeline);
        this.createIndustryDistributionChart(data.industryDistribution);

        // Update insights
        this.updateJobseekerInsights(data.insights);
        this.updateJobseekerRecommendations(data.recommendations);
    }

    updateEmployerDisplay(data) {
        // Update KPI cards
        this.updateElement('totalJobPosts', data.totalJobPosts || 0);
        this.updateElement('totalApplicationsReceived', data.totalApplicationsReceived || 0);
        this.updateElement('totalShortlisted', data.totalShortlisted || 0);
        this.updateElement('totalHired', data.totalHired || 0);
        this.updateElement('avgTimeToHire', data.avgTimeToHire || 0);
        this.updateElement('avgCostPerHire', `R${data.avgCostPerHire || 0}`);

        // Update charts
        this.createRecruitmentFunnelChart(data.recruitmentFunnel);
        this.createApplicationsPerJobChart(data.applicationsPerJob);
        this.createCandidateSourceChart(data.candidateSource);
        this.createHiringTrendsChart(data.hiringTrends);

        // Update insights
        this.updateEmployerInsights(data);
    }

    updateAdminDisplay(data) {
        // Update system stats
        this.updateElement('totalUsers', data.totalUsers || 0);
        this.updateElement('activeSessions', data.activeSessions || 0);
        this.updateElement('systemHealth', `${data.systemHealth || 100}%`);
        this.updateElement('totalRevenue', `R${data.totalRevenue || 0}`);

        // Update charts
        this.createPlatformUsageChart(data.platformUsage);
        this.createUserRegistrationChart(data.userRegistration);
        this.createFeatureUsageChart(data.featureUsage);

        // Update monitoring
        this.updateSystemMonitoring(data.monitoring);
    }

    // Chart creation methods (using Chart.js)
    createApplicationStatusChart(data) {
        const ctx = document.getElementById('applicationStatusChart');
        if (!ctx || !data) return;

        if (this.charts.applicationStatus) {
            this.charts.applicationStatus.destroy();
        }

        this.charts.applicationStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: [
                        '#007bff', '#28a745', '#ffc107', 
                        '#dc3545', '#17a2b8', '#6c757d'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Utility methods
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateLastRefreshTime() {
        const element = document.getElementById('lastUpdated');
        if (element) {
            element.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
        }
    }

    setupAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.loadAnalyticsData();
        }, this.updateFrequency);
    }

    refreshAnalytics() {
        this.loadAnalyticsData();
    }

    showAnalyticsError(message) {
        console.error('Analytics error:', message);
        // Show user-friendly error message
    }

    // Initialize charts library if not already loaded
    initializeCharts() {
        if (typeof Chart === 'undefined') {
            this.loadChartJS();
        }
    }

    loadChartJS() {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => {
            console.log('Chart.js loaded successfully');
        };
        document.head.appendChild(script);
    }

    // Cleanup
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
    }
}

// Initialize dashboard analytics
const dashboardAnalytics = new DashboardAnalytics();