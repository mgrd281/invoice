// Shopify Grid View Enhancement
// Add this script to enhance existing Shopify invoice interface

(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGridView);
    } else {
        initGridView();
    }

    function initGridView() {
        // Add CSS styles
        addGridStyles();
        
        // Add view toggle button
        addViewToggle();
        
        // Initialize functionality
        setupGridToggle();
    }

    function addGridStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Grid View Toggle Button */
            .view-toggle {
                display: flex;
                background: #ffffff;
                border: 1px solid #e1e5e9;
                border-radius: 6px;
                overflow: hidden;
                margin-left: 12px;
            }

            .view-toggle button {
                padding: 8px 12px;
                border: none;
                background: transparent;
                color: #6b7280;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .view-toggle button:hover {
                background: #f3f4f6;
                color: #374151;
            }

            .view-toggle button.active {
                background: #2563eb;
                color: white;
            }

            /* Grid View Styles */
            .invoices-grid-container {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 16px;
                margin-top: 20px;
            }

            .invoice-grid-card {
                background: white;
                border: 1px solid #e1e5e9;
                border-radius: 8px;
                padding: 16px;
                transition: all 0.2s ease;
                cursor: pointer;
            }

            .invoice-grid-card:hover {
                border-color: #2563eb;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                transform: translateY(-1px);
            }

            .invoice-grid-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .invoice-grid-number {
                font-weight: 600;
                color: #111827;
                font-size: 16px;
            }

            .invoice-grid-status {
                padding: 4px 8px;
                background: #dcfce7;
                color: #166534;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }

            .invoice-grid-customer {
                color: #6b7280;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .invoice-grid-details {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .invoice-grid-date {
                color: #9ca3af;
                font-size: 13px;
            }

            .invoice-grid-amount {
                font-weight: 700;
                color: #059669;
                font-size: 18px;
            }

            .invoice-grid-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }

            .invoice-grid-btn {
                padding: 6px 12px;
                border: 1px solid #e1e5e9;
                background: white;
                color: #6b7280;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .invoice-grid-btn:hover {
                background: #f3f4f6;
                color: #374151;
            }

            /* Hide original table in grid mode */
            .grid-mode .invoice-table-container {
                display: none;
            }

            .grid-mode .invoices-grid-container {
                display: grid;
            }

            .list-mode .invoices-grid-container {
                display: none;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .invoices-grid-container {
                    grid-template-columns: 1fr;
                    gap: 12px;
                }
                
                .view-toggle {
                    margin-left: 0;
                    margin-top: 8px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function addViewToggle() {
        // Find the actions area (next to "0 zu Rechnungen" button)
        const actionsArea = document.querySelector('.Polaris-Button--primary')?.parentElement;
        
        if (actionsArea) {
            const toggleContainer = document.createElement('div');
            toggleContainer.className = 'view-toggle';
            toggleContainer.innerHTML = `
                <button class="view-list active" data-view="list">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                    </svg>
                    Liste
                </button>
                <button class="view-grid" data-view="grid">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z"/>
                    </svg>
                    Raster
                </button>
            `;
            
            actionsArea.appendChild(toggleContainer);
        }
    }

    function setupGridToggle() {
        // Create grid container
        createGridContainer();
        
        // Setup toggle functionality
        const toggleButtons = document.querySelectorAll('.view-toggle button');
        toggleButtons.forEach(button => {
            button.addEventListener('click', handleViewToggle);
        });
        
        // Initial state
        document.body.classList.add('list-mode');
    }

    function handleViewToggle(e) {
        const view = e.currentTarget.dataset.view;
        
        // Update button states
        document.querySelectorAll('.view-toggle button').forEach(btn => {
            btn.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        
        // Update body class
        document.body.classList.remove('list-mode', 'grid-mode');
        document.body.classList.add(`${view}-mode`);
        
        if (view === 'grid') {
            updateGridView();
        }
    }

    function createGridContainer() {
        // Find the main content area
        const mainContent = document.querySelector('[data-polaris-scrollable]') || 
                           document.querySelector('.Polaris-Page__Content') ||
                           document.querySelector('main');
        
        if (mainContent) {
            const gridContainer = document.createElement('div');
            gridContainer.className = 'invoices-grid-container';
            gridContainer.style.display = 'none';
            
            // Insert after the existing table
            const existingTable = document.querySelector('table') || 
                                 document.querySelector('.Polaris-DataTable');
            
            if (existingTable) {
                existingTable.parentNode.insertBefore(gridContainer, existingTable.nextSibling);
                
                // Wrap existing table for easier hiding
                const tableWrapper = document.createElement('div');
                tableWrapper.className = 'invoice-table-container';
                existingTable.parentNode.insertBefore(tableWrapper, existingTable);
                tableWrapper.appendChild(existingTable);
            }
        }
    }

    function updateGridView() {
        const gridContainer = document.querySelector('.invoices-grid-container');
        if (!gridContainer) return;
        
        // Clear existing grid items
        gridContainer.innerHTML = '';
        
        // Extract data from existing table rows
        const tableRows = document.querySelectorAll('tbody tr');
        
        tableRows.forEach(row => {
            const invoiceData = extractInvoiceData(row);
            if (invoiceData) {
                const gridCard = createGridCard(invoiceData);
                gridContainer.appendChild(gridCard);
            }
        });
    }

    function extractInvoiceData(row) {
        try {
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return null;
            
            // Extract invoice number (from checkbox or first cell)
            const numberCell = cells[0];
            const numberText = numberCell.textContent.trim();
            const invoiceNumber = numberText.match(/#\d+/) ? numberText.match(/#\d+/)[0] : numberText;
            
            // Extract customer info
            const customerInfo = row.querySelector('[data-testid="customer-info"]') || cells[1];
            const customerText = customerInfo ? customerInfo.textContent.trim() : 'Unbekannt';
            
            // Extract amount
            const amountCell = cells[cells.length - 2] || cells[cells.length - 1];
            const amountText = amountCell.textContent.trim();
            
            // Extract status
            const statusElement = row.querySelector('.Polaris-Badge') || 
                                 row.querySelector('[class*="status"]');
            const status = statusElement ? statusElement.textContent.trim() : 'Bezahlt';
            
            // Extract date (try to find date-like text)
            const dateText = Array.from(cells).find(cell => {
                const text = cell.textContent.trim();
                return text.match(/\d{1,2}\.\d{1,2}\.\d{4}/) || text.includes('2024') || text.includes('2025');
            })?.textContent.trim() || 'Heute';
            
            return {
                number: invoiceNumber,
                customer: customerText,
                amount: amountText,
                status: status,
                date: dateText,
                row: row
            };
        } catch (error) {
            console.warn('Error extracting invoice data:', error);
            return null;
        }
    }

    function createGridCard(data) {
        const card = document.createElement('div');
        card.className = 'invoice-grid-card';
        
        card.innerHTML = `
            <div class="invoice-grid-header">
                <div class="invoice-grid-number">${data.number}</div>
                <div class="invoice-grid-status">${data.status}</div>
            </div>
            <div class="invoice-grid-customer">${data.customer}</div>
            <div class="invoice-grid-details">
                <div class="invoice-grid-date">${data.date}</div>
                <div class="invoice-grid-amount">${data.amount}</div>
            </div>
            <div class="invoice-grid-actions">
                <button class="invoice-grid-btn">Anzeigen</button>
                <button class="invoice-grid-btn">Download</button>
            </div>
        `;
        
        // Add click handler to match original row behavior
        card.addEventListener('click', () => {
            if (data.row) {
                const checkbox = data.row.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.click();
                }
            }
        });
        
        return card;
    }

    // Auto-refresh grid when data changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && 
                document.body.classList.contains('grid-mode')) {
                setTimeout(updateGridView, 100);
            }
        });
    });
    
    // Start observing
    const tableContainer = document.querySelector('tbody');
    if (tableContainer) {
        observer.observe(tableContainer, { childList: true, subtree: true });
    }

})();
