export default class PortfolioMetricsController {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.chartColors = [
            '#4F46E5', '#10B981', '#F59E0B', '#EF4444',
            '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
        ];
    }

    // Initialize portfolio metrics dashboard
    async initializeDashboard(containerId = 'portfolio-metrics') {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Create dashboard structure
        container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="text-lg font-semibold mb-4">Portfolio Performance</h3>
          <div id="performance-chart" class="h-64"></div>
        </div>
        
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="text-lg font-semibold mb-4">Sector Allocation</h3>
          <div id="sector-allocation-chart" class="h-64"></div>
        </div>
        
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="text-lg font-semibold mb-4">Top Performers</h3>
          <div id="top-performers-chart" class="h-64"></div>
        </div>
        
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="text-lg font-semibold mb-4">Portfolio History</h3>
          <div id="portfolio-history-chart" class="h-64"></div>
        </div>
      </div>
    `;

        // Initialize charts
        this.createPerformanceChart();
        this.createSectorAllocationChart();
        this.createTopPerformersChart();
        this.createPortfolioHistoryChart();

        // Set up update interval
        this.updateInterval = setInterval(() => this.updateCharts(), 5000);
    }

    // Clean up resources when component is no longer needed
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Update all charts with latest data
    updateCharts() {
        this.createPerformanceChart();
        this.createSectorAllocationChart();
        this.createTopPerformersChart();
        this.createPortfolioHistoryChart();
    }

    // Calculate portfolio analytics data
    calculateAnalytics() {
        const portfolio = this.userProfile.portfolio;
        const holdings = portfolio.holdingsMap;
        const initialInvestment = portfolio.initialBalance;
        const currentHoldings = Object.values(holdings).map(holding => ({
            symbol: holding.stock.symbol,
            name: holding.stock.companyName,
            sector: holding.stock.sector,
            quantity: holding.quantity,
            avgPrice: holding.avgPrice,
            currentPrice: holding.stock.marketPrice,
            value: holding.quantity * holding.stock.marketPrice,
            profitLoss: (holding.stock.marketPrice - holding.avgPrice) * holding.quantity,
            percentChange: ((holding.stock.marketPrice - holding.avgPrice) / holding.avgPrice) * 100
        }));

        // Calculate totals
        const totalValue = currentHoldings.reduce((sum, holding) => sum + holding.value, 0);
        const totalProfitLoss = currentHoldings.reduce((sum, holding) => sum + holding.profitLoss, 0);
        const totalPercentChange = (totalValue / (totalValue - totalProfitLoss) - 1) * 100;

        // Group by sector
        const sectorData = {};
        currentHoldings.forEach(holding => {
            if (!sectorData[holding.sector]) {
                sectorData[holding.sector] = 0;
            }
            sectorData[holding.sector] += holding.value;
        });

        // Convert to array format for charts
        const sectorAllocation = Object.entries(sectorData).map(([sector, value]) => ({
            sector,
            value,
            percentage: (value / totalValue) * 100
        })).sort((a, b) => b.value - a.value);

        return {
            totalValue,
            totalProfitLoss,
            totalPercentChange,
            availableCash: portfolio.balance,
            totalAssets: portfolio.totalAssetsValue,
            initialInvestment,
            holdings: currentHoldings,
            sectorAllocation
        };
    }

    // Create portfolio performance chart
    createPerformanceChart() {
        const analytics = this.calculateAnalytics();
        const container = document.getElementById('performance-chart');
        if (!container) return;

        // Calculate data points
        const data = [
            { name: 'Initial Investment', value: analytics.initialInvestment },
            { name: 'Current Value', value: analytics.totalAssets }
        ];

        // Create bar chart using React (for production, use a charting library like Chart.js or Recharts)
        // This is a placeholder that would be implemented with a proper chart library
        container.innerHTML = `
      <div class="flex justify-center items-end h-full p-4">
        ${data.map((item, index) => {
            const height = `${(item.value / Math.max(...data.map(d => d.value)) * 100)}%`;
            const color = item.name === 'Initial Investment' ? 'bg-blue-500' :
                (analytics.totalProfitLoss >= 0 ? 'bg-green-500' : 'bg-red-500');

            return `
            <div class="flex flex-col items-center mx-4 w-24">
              <div class="${color} w-full rounded-t" style="height: ${height}">
                <div class="text-white text-center p-2">$${item.value.toFixed(2)}</div>
              </div>
              <div class="text-sm mt-2 text-center">${item.name}</div>
            </div>
          `;
        }).join('')}
      </div>
      
      <div class="text-center mt-4">
        <span class="font-bold ${analytics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}">
          ${analytics.totalProfitLoss >= 0 ? '+' : ''}$${analytics.totalProfitLoss.toFixed(2)} 
          (${analytics.totalPercentChange >= 0 ? '+' : ''}${analytics.totalPercentChange.toFixed(2)}%)
        </span>
      </div>
    `;
    }

    // Create sector allocation chart
    createSectorAllocationChart() {
        const analytics = this.calculateAnalytics();
        const container = document.getElementById('sector-allocation-chart');
        if (!container) return;

        if (analytics.sectorAllocation.length === 0) {
            container.innerHTML = '<div class="flex h-full items-center justify-center text-gray-500">No holdings to display</div>';
            return;
        }

        // Create pie chart visualization
        // This is a simplified placeholder - in production use a real chart library
        const total = analytics.sectorAllocation.reduce((sum, item) => sum + item.value, 0);

        let cumulativePercentage = 0;
        const pieSegments = analytics.sectorAllocation.map((item, index) => {
            const percentage = item.value / total * 100;
            const startAngle = cumulativePercentage * 3.6; // 3.6 = 360 / 100
            cumulativePercentage += percentage;
            const endAngle = cumulativePercentage * 3.6;

            return {
                sector: item.sector,
                percentage: percentage,
                startAngle: startAngle,
                endAngle: endAngle,
                color: this.chartColors[index % this.chartColors.length]
            };
        });

        // Create an SVG pie chart
        container.innerHTML = `
      <div class="flex flex-row items-center">
        <div class="w-1/2">
          <svg viewBox="0 0 100 100" class="w-full">
            <circle cx="50" cy="50" r="45" fill="#f3f4f6" />
            ${pieSegments.map(segment => {
            const startX = 50 + 45 * Math.cos((segment.startAngle - 90) * (Math.PI / 180));
            const startY = 50 + 45 * Math.sin((segment.startAngle - 90) * (Math.PI / 180));
            const endX = 50 + 45 * Math.cos((segment.endAngle - 90) * (Math.PI / 180));
            const endY = 50 + 45 * Math.sin((segment.endAngle - 90) * (Math.PI / 180));

            const largeArcFlag = segment.endAngle - segment.startAngle > 180 ? 1 : 0;

            return `<path d="M 50 50 L ${startX} ${startY} A 45 45 0 ${largeArcFlag} 1 ${endX} ${endY} Z" fill="${segment.color}" />`;
        }).join('')}
          </svg>
        </div>
        
        <div class="w-1/2 space-y-1 text-sm">
          ${pieSegments.map(segment => `
            <div class="flex items-center">
              <div class="w-3 h-3 mr-2" style="background-color: ${segment.color}"></div>
              <div>${segment.sector} (${segment.percentage.toFixed(1)}%)</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    }

    // Create top performers chart
    createTopPerformersChart() {
        const analytics = this.calculateAnalytics();
        const container = document.getElementById('top-performers-chart');
        if (!container) return;

        if (analytics.holdings.length === 0) {
            container.innerHTML = '<div class="flex h-full items-center justify-center text-gray-500">No holdings to display</div>';
            return;
        }

        // Sort holdings by percentage change
        const sortedHoldings = [...analytics.holdings].sort((a, b) => b.percentChange - a.percentChange);

        // Create a horizontal bar chart for top/bottom performers
        container.innerHTML = `
      <div class="space-y-3 h-full overflow-y-auto p-1">
        ${sortedHoldings.map((holding, index) => {
            const barWidth = Math.abs(holding.percentChange) > 100 ? 100 : Math.abs(holding.percentChange);
            const barColor = holding.percentChange >= 0 ? 'bg-green-500' : 'bg-red-500';

            return `
            <div class="flex items-center text-sm">
              <div class="w-20 truncate mr-2" title="${holding.name}">${holding.symbol}</div>
              <div class="flex-grow h-6 bg-gray-200 rounded">
                <div class="${barColor} h-full rounded" style="width: ${barWidth}%"></div>
              </div>
              <div class="w-20 text-right ${holding.percentChange >= 0 ? 'text-green-600' : 'text-red-600'}">
                ${holding.percentChange >= 0 ? '+' : ''}${holding.percentChange.toFixed(2)}%
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    }

    // Create portfolio history chart
    createPortfolioHistoryChart() {
        const container = document.getElementById('portfolio-history-chart');
        if (!container) return;

        // Get transaction history
        const transactions = this.userProfile.portfolio.transactionHistory;
        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<div class="flex h-full items-center justify-center text-gray-500">No transaction history</div>';
            return;
        }

        // Generate historical portfolio value data
        // In a real implementation, this would use actual historical price data
        const initialBalance = this.userProfile.portfolio.initialBalance;

        // Sort transactions by date
        const sortedTransactions = [...transactions].sort((a, b) =>
            new Date(a.timestamp) - new Date(b.timestamp)
        );

        // Generate data points - simplified for this example
        // In production, more accurate historical values would be calculated
        let balance = initialBalance;
        const historyData = [{
            date: new Date(sortedTransactions[0]?.timestamp || Date.now() - 30*24*60*60*1000),
            value: initialBalance
        }];

        sortedTransactions.forEach(txn => {
            const amount = txn.pricePaid * txn.quantity;

            if (txn.transactionType === 'BUY') {
                balance -= amount;
            } else {
                balance += amount;
            }

            // Add random market movement to simulate price changes
            const randomFactor = 1 + (Math.random() * 0.04 - 0.02); // -2% to +2%
            balance *= randomFactor;

            historyData.push({
                date: new Date(txn.timestamp),
                value: balance
            });
        });

        // Add current value
        historyData.push({
            date: new Date(),
            value: this.userProfile.portfolio.totalAssetsValue
        });

        // Create a line chart
        // This is a simplified placeholder - in production use a real chart library
        const maxValue = Math.max(...historyData.map(d => d.value));
        const minValue = Math.min(...historyData.map(d => d.value));
        const range = maxValue - minValue;

        const points = historyData.map((point, index) => {
            const x = (index / (historyData.length - 1)) * 100;
            const y = 100 - ((point.value - minValue) / range) * 90; // Leave 10% margin
            return `${x},${y}`;
        }).join(' ');

        container.innerHTML = `
      <svg viewBox="0 0 100 100" class="w-full h-full">
        <!-- Grid lines -->
        <line x1="0" y1="10" x2="100" y2="10" stroke="#e5e7eb" stroke-width="0.2" />
        <line x1="0" y1="36.6" x2="100" y2="36.6" stroke="#e5e7eb" stroke-width="0.2" />
        <line x1="0" y1="63.3" x2="100" y2="63.3" stroke="#e5e7eb" stroke-width="0.2" />
        <line x1="0" y1="90" x2="100" y2="90" stroke="#e5e7eb" stroke-width="0.2" />
        
        <!-- Y-axis labels -->
        <text x="2" y="13" font-size="3" fill="#6b7280">${maxValue.toFixed(0)}</text>
        <text x="2" y="39.6" font-size="3" fill="#6b7280">${(maxValue - range/3).toFixed(0)}</text>
        <text x="2" y="66.3" font-size="3" fill="#6b7280">${(minValue + range/3).toFixed(0)}</text>
        <text x="2" y="93" font-size="3" fill="#6b7280">${minValue.toFixed(0)}</text>
        
        <!-- Line -->
        <polyline points="${points}" fill="none" stroke="#4f46e5" stroke-width="0.5" />
        
        <!-- Area under the line -->
        <polygon points="0,100 ${points} 100,100" fill="url(#gradient)" opacity="0.3" />
        
        <!-- Gradient definition -->
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#4f46e5" stop-opacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
    `;
    }
}