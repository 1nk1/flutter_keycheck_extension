// WebView Widget Preview Interface
(function() {
    'use strict';

    const vscode = acquireVsCodeApi();
    
    let currentState = {
        keyUsages: [
            { keyName: 'loginButton', widget: 'ElevatedButton', file: 'main.dart', line: 34, isSelected: true, widgetType: 'ElevatedButton' },
            { keyName: 'loginButton', widget: 'Widget', file: 'widget_test.dart', line: 15, isSelected: false, widgetType: 'Widget' },
            { keyName: 'submitButton', widget: 'ElevatedButton', file: 'main.dart', line: 54, isSelected: false, widgetType: 'ElevatedButton' },
            { keyName: 'emailField', widget: 'TextField', file: 'main.dart', line: 28, isSelected: false, widgetType: 'TextField' },
            { keyName: 'passwordField', widget: 'TextField', file: 'main.dart', line: 31, isSelected: false, widgetType: 'TextField' },
        ],
        canvasZoom: 100,
        showGrid: true,
        showWireframe: false
    };

    function getWidgetIcon(widgetType) {
        const icons = {
            'ElevatedButton': '🔘',
            'TextField': '📝',
            'Card': '🗃️',
            'Container': '📦',
            'Widget': '🧩'
        };
        return icons[widgetType] || '🧩';
    }

    function getSelectedUsage() {
        return currentState.keyUsages.find(usage => usage.isSelected);
    }

    function selectUsage(index) {
        currentState.keyUsages = currentState.keyUsages.map((usage, i) => ({
            ...usage,
            isSelected: i === index
        }));
        render();
    }

    function navigateToCode(usage) {
        vscode.postMessage({
            command: 'navigateToKey',
            file: usage.file,
            line: usage.line,
            keyName: usage.keyName
        });
    }

    function renderWidgetInCanvas() {
        const selectedUsage = getSelectedUsage();
        if (!selectedUsage) return '<div class="empty-state">Select a key usage to see preview</div>';

        const widgetType = selectedUsage.widgetType;
        const keyName = selectedUsage.keyName;
        const displayName = keyName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const zoomTransform = `transform: scale(${currentState.canvasZoom / 100}); transform-origin: center;`;
        const wireframeClass = currentState.showWireframe ? 'wireframe' : '';

        switch (widgetType) {
            case 'ElevatedButton':
                return `
                    <div class="widget-container">
                        <div class="widget-highlight animate-pulse"></div>
                        <button class="elevated-button ${wireframeClass}" style="${zoomTransform}">
                            ${displayName}
                        </button>
                        <div class="widget-label">${keyName}</div>
                        <div class="widget-info">${selectedUsage.file}:${selectedUsage.line}</div>
                    </div>
                `;

            case 'TextField':
                return `
                    <div class="widget-container">
                        <div class="widget-highlight animate-pulse green"></div>
                        <div class="textfield-container ${wireframeClass}" style="${zoomTransform}">
                            <label class="textfield-label">${displayName}</label>
                            <input type="text" placeholder="Enter ${displayName.toLowerCase()}..." class="textfield-input" readonly>
                        </div>
                        <div class="widget-label green">${keyName}</div>
                        <div class="widget-info">${selectedUsage.file}:${selectedUsage.line}</div>
                    </div>
                `;

            case 'Card':
                return `
                    <div class="widget-container">
                        <div class="widget-highlight animate-pulse orange"></div>
                        <div class="card-widget ${wireframeClass}" style="${zoomTransform}">
                            <h3 class="card-title">${displayName}</h3>
                            <p class="card-content">Card content goes here...</p>
                            <div class="card-dots">
                                <div class="dot blue"></div>
                                <div class="dot green"></div>
                                <div class="dot yellow"></div>
                            </div>
                        </div>
                        <div class="widget-label orange">${keyName}</div>
                        <div class="widget-info">${selectedUsage.file}:${selectedUsage.line}</div>
                    </div>
                `;

            default:
                return `
                    <div class="widget-container">
                        <div class="widget-highlight animate-pulse gray"></div>
                        <div class="generic-widget ${wireframeClass}" style="${zoomTransform}">
                            <div class="generic-icon">${getWidgetIcon(widgetType)}</div>
                            <div class="generic-type">${widgetType}</div>
                            <div class="generic-name">${displayName}</div>
                        </div>
                        <div class="widget-label gray">${keyName}</div>
                        <div class="widget-info">${selectedUsage.file}:${selectedUsage.line}</div>
                    </div>
                `;
        }
    }

    function render() {
        const selectedUsage = getSelectedUsage();
        
        const usagesList = currentState.keyUsages.map((usage, index) => `
            <div class="usage-item ${usage.isSelected ? 'selected' : ''}" onclick="selectUsage(${index})">
                <div class="usage-header">
                    <div class="usage-icon">${getWidgetIcon(usage.widgetType)}</div>
                    <div class="usage-details">
                        <div class="usage-key">${usage.keyName}</div>
                        <div class="usage-meta">${usage.widget} • ${usage.file}:${usage.line}</div>
                        <div class="usage-display">${usage.keyName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                    </div>
                </div>
                ${usage.isSelected ? `
                    <div class="usage-actions">
                        <button class="navigate-btn" onclick="event.stopPropagation(); navigateToCode(currentState.keyUsages[${index}])">
                            Navigate to Code
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');

        const gridStyle = currentState.showGrid ? 
            'background-image: radial-gradient(circle, #ccc 1px, transparent 1px); background-size: 20px 20px; background-color: #f9f9f9;' : '';

        document.body.innerHTML = `
            <div class="widget-preview-app">
                <!-- Left Panel -->
                <div class="left-panel">
                    <!-- Header -->
                    <div class="panel-header">
                        <h1>Testing Keys Inspector</h1>
                        <p>Visual Flutter Widget Preview</p>
                    </div>

                    <!-- Search -->
                    <div class="search-section">
                        <input type="text" placeholder="Search keys..." class="search-input">
                    </div>

                    <!-- Usage List -->
                    <div class="usage-list">
                        <div class="section-title">Key Usages (${currentState.keyUsages.length})</div>
                        ${usagesList}
                    </div>

                    <!-- Controls -->
                    <div class="controls-section">
                        <div class="zoom-control">
                            <label>Zoom: ${currentState.canvasZoom}%</label>
                            <input type="range" min="50" max="200" value="${currentState.canvasZoom}" 
                                   oninput="currentState.canvasZoom = parseInt(this.value); render();">
                        </div>
                        <div class="button-group">
                            <button class="control-btn ${currentState.showGrid ? 'active' : ''}" 
                                    onclick="currentState.showGrid = !currentState.showGrid; render();">
                                Grid
                            </button>
                            <button class="control-btn ${currentState.showWireframe ? 'active wireframe-btn' : ''}" 
                                    onclick="currentState.showWireframe = !currentState.showWireframe; render();">
                                Wireframe
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Canvas Area -->
                <div class="canvas-area">
                    <!-- Canvas Header -->
                    <div class="canvas-header">
                        <div class="canvas-title">
                            ${selectedUsage ? `
                                <div class="canvas-info">
                                    <div class="canvas-icon">${getWidgetIcon(selectedUsage.widgetType)}</div>
                                    <div>
                                        <div class="canvas-key">${selectedUsage.keyName} - ${selectedUsage.widget}</div>
                                        <div class="canvas-file">${selectedUsage.file}:${selectedUsage.line}</div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="live-indicator">
                            <div class="live-dot"></div>
                            <span>Live Preview</span>
                        </div>
                    </div>

                    <!-- Canvas -->
                    <div class="canvas" style="${gridStyle}">
                        <div class="canvas-content">
                            ${selectedUsage ? renderWidgetInCanvas() : `
                                <div class="empty-canvas">
                                    <div class="empty-icon">🎨</div>
                                    <div class="empty-title">Select a Key Usage</div>
                                    <div class="empty-subtitle">Choose a key from the left panel to see its widget preview</div>
                                </div>
                            `}
                        </div>

                        ${selectedUsage ? `
                            <div class="canvas-overlay">
                                <div class="overlay-item"><strong>Widget:</strong> ${selectedUsage.widget}</div>
                                <div class="overlay-item"><strong>Key:</strong> ${selectedUsage.keyName}</div>
                                <div class="overlay-item"><strong>File:</strong> ${selectedUsage.file}</div>
                                <div class="overlay-item"><strong>Line:</strong> ${selectedUsage.line}</div>
                                <div class="overlay-item"><strong>Zoom:</strong> ${currentState.canvasZoom}%</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Message handler
    window.addEventListener('message', event => {
        const message = event.data;
        console.log('WebView received message:', message);
        
        switch (message.command) {
            case 'updateKeys':
                console.log('Updating keys with real data:', message.keyUsages);
                currentState.keyUsages = message.keyUsages || [];
                // Выбираем первый ключ по умолчанию
                if (currentState.keyUsages.length > 0) {
                    currentState.keyUsages[0].isSelected = true;
                }
                render();
                break;
            case 'updateKeyUsages':
                currentState.keyUsages = message.usages;
                render();
                break;
            case 'selectUsage':
                selectUsage(message.index);
                break;
        }
    });

    // Global functions for HTML onclick handlers
    window.selectUsage = selectUsage;
    window.navigateToCode = navigateToCode;
    window.currentState = currentState;

    // Initial render
    render();

})();