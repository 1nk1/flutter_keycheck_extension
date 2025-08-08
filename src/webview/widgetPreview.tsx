import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';

// VS Code API types
declare const acquireVsCodeApi: () => any;

interface VSCodeAPI {
    postMessage(message: any): void;
    setState(state: any): void;
    getState(): any;
}

interface KeyUsageItem {
    keyName: string;
    widget: string;
    file: string;
    line: number;
    isSelected: boolean;
    widgetType: 'ElevatedButton' | 'TextField' | 'Card' | 'Container' | 'Widget';
}

interface WidgetPreviewData {
    type: string;
    properties: Record<string, any>;
    children?: WidgetPreviewData[];
    keyName?: string;
}

const WidgetPreviewApp: React.FC = () => {
    const [vscodeApi] = useState<VSCodeAPI>(() => acquireVsCodeApi());
    const [keyUsages, setKeyUsages] = useState<KeyUsageItem[]>([
        { keyName: 'loginButton', widget: 'ElevatedButton', file: 'main.dart', line: 34, isSelected: true, widgetType: 'ElevatedButton' },
        { keyName: 'loginButton', widget: 'Widget', file: 'widget_test.dart', line: 15, isSelected: false, widgetType: 'Widget' },
        { keyName: 'submitButton', widget: 'ElevatedButton', file: 'main.dart', line: 54, isSelected: false, widgetType: 'ElevatedButton' },
        { keyName: 'emailField', widget: 'TextField', file: 'main.dart', line: 28, isSelected: false, widgetType: 'TextField' },
        { keyName: 'passwordField', widget: 'TextField', file: 'main.dart', line: 31, isSelected: false, widgetType: 'TextField' },
    ]);
    const [canvasZoom, setCanvasZoom] = useState(100);
    const [showGrid, setShowGrid] = useState(true);
    const [showWireframe, setShowWireframe] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);

    const selectedUsage = keyUsages.find(usage => usage.isSelected);

    useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'updateKeyUsages':
                    setKeyUsages(message.usages);
                    break;
                case 'selectUsage':
                    handleUsageSelect(message.index);
                    break;
            }
        };

        window.addEventListener('message', messageHandler);
        return () => window.removeEventListener('message', messageHandler);
    }, []);

    const handleUsageSelect = (index: number) => {
        setKeyUsages(prev => prev.map((usage, i) => ({
            ...usage,
            isSelected: i === index
        })));
    };

    const navigateToCode = (usage: KeyUsageItem) => {
        vscodeApi.postMessage({
            command: 'navigateToKey',
            file: usage.file,
            line: usage.line,
            keyName: usage.keyName
        });
    };

    const getWidgetIcon = (widgetType: string) => {
        switch (widgetType) {
            case 'ElevatedButton': return '🔘';
            case 'TextField': return '📝';
            case 'Card': return '🗃️';
            case 'Container': return '📦';
            default: return '🧩';
        }
    };

    const renderWidgetInCanvas = () => {
        if (!selectedUsage) return null;

        const widget = selectedUsage.widgetType;
        const keyName = selectedUsage.keyName;
        const displayName = keyName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

        switch (widget) {
            case 'ElevatedButton':
                return (
                    <div className="relative">
                        {/* Widget highlight border */}
                        <div className="absolute -inset-2 border-2 border-blue-500 rounded-lg animate-pulse opacity-50"></div>
                        
                        {/* Actual widget */}
                        <button 
                            className={`px-8 py-4 bg-blue-600 text-white rounded-lg shadow-lg font-medium text-lg transition-all duration-200 hover:bg-blue-700 hover:shadow-xl ${showWireframe ? 'border-2 border-red-400 bg-transparent text-red-400' : ''}`}
                            style={{
                                transform: `scale(${canvasZoom / 100})`,
                                transformOrigin: 'center'
                            }}
                        >
                            {displayName}
                        </button>
                        
                        {/* Key label */}
                        <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Key: {keyName}
                        </div>
                        
                        {/* Widget info */}
                        <div className="absolute -bottom-8 left-0 text-xs text-gray-600 dark:text-gray-400">
                            {selectedUsage.file}:{selectedUsage.line}
                        </div>
                    </div>
                );

            case 'TextField':
                return (
                    <div className="relative">
                        <div className="absolute -inset-2 border-2 border-green-500 rounded-lg animate-pulse opacity-50"></div>
                        
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {displayName}
                            </label>
                            <input
                                type="text"
                                placeholder={`Enter ${displayName.toLowerCase()}...`}
                                className={`w-80 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${showWireframe ? 'border-2 border-red-400 bg-transparent' : 'bg-white'}`}
                                style={{
                                    transform: `scale(${canvasZoom / 100})`,
                                    transformOrigin: 'top left'
                                }}
                                readOnly
                            />
                        </div>
                        
                        <div className="absolute -top-8 left-0 bg-green-600 text-white text-xs px-2 py-1 rounded">
                            Key: {keyName}
                        </div>
                        
                        <div className="absolute -bottom-8 left-0 text-xs text-gray-600 dark:text-gray-400">
                            {selectedUsage.file}:{selectedUsage.line}
                        </div>
                    </div>
                );

            case 'Card':
                return (
                    <div className="relative">
                        <div className="absolute -inset-2 border-2 border-orange-500 rounded-lg animate-pulse opacity-50"></div>
                        
                        <div 
                            className={`w-80 bg-white rounded-xl shadow-lg p-6 ${showWireframe ? 'border-2 border-red-400 bg-transparent' : ''}`}
                            style={{
                                transform: `scale(${canvasZoom / 100})`,
                                transformOrigin: 'top left'
                            }}
                        >
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
                                <p className="text-gray-600">Card content goes here...</p>
                                <div className="flex space-x-2">
                                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="absolute -top-8 left-0 bg-orange-600 text-white text-xs px-2 py-1 rounded">
                            Key: {keyName}
                        </div>
                        
                        <div className="absolute -bottom-8 left-0 text-xs text-gray-600 dark:text-gray-400">
                            {selectedUsage.file}:{selectedUsage.line}
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="relative">
                        <div className="absolute -inset-2 border-2 border-gray-500 rounded-lg animate-pulse opacity-50"></div>
                        
                        <div 
                            className={`w-64 h-32 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center text-gray-600 ${showWireframe ? 'border-red-400 text-red-400' : ''}`}
                            style={{
                                transform: `scale(${canvasZoom / 100})`,
                                transformOrigin: 'top left'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-2xl mb-2">{getWidgetIcon(widget)}</div>
                                <div className="text-sm font-medium">{widget}</div>
                                <div className="text-xs text-gray-500">{displayName}</div>
                            </div>
                        </div>
                        
                        <div className="absolute -top-8 left-0 bg-gray-600 text-white text-xs px-2 py-1 rounded">
                            Key: {keyName}
                        </div>
                        
                        <div className="absolute -bottom-8 left-0 text-xs text-gray-600 dark:text-gray-400">
                            {selectedUsage.file}:{selectedUsage.line}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Left Panel */}
            <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h1 className="text-lg font-semibold">Testing Keys Inspector</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Visual Flutter Widget Preview</p>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <input
                        type="text"
                        placeholder="Search keys..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Key Usages List */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-2">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-2">
                            Key Usages ({keyUsages.length})
                        </div>
                        
                        {keyUsages.map((usage, index) => (
                            <div
                                key={index}
                                onClick={() => handleUsageSelect(index)}
                                className={`p-3 mb-2 rounded-lg cursor-pointer transition-all duration-150 ${
                                    usage.isSelected
                                        ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700'
                                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-transparent'
                                }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="text-2xl">{getWidgetIcon(usage.widgetType)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">
                                            {usage.keyName}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                            {usage.widget} • {usage.file}:{usage.line}
                                        </div>
                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                            {usage.keyName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        </div>
                                    </div>
                                </div>
                                
                                {usage.isSelected && (
                                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigateToCode(usage);
                                            }}
                                            className="w-full px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                        >
                                            Navigate to Code
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Controls */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    <div>
                        <label className="block text-xs font-medium mb-2">Zoom: {canvasZoom}%</label>
                        <input
                            type="range"
                            min="50"
                            max="200"
                            value={canvasZoom}
                            onChange={(e) => setCanvasZoom(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                    
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setShowGrid(!showGrid)}
                            className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                                showGrid
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setShowWireframe(!showWireframe)}
                            className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                                showWireframe
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                        >
                            Wireframe
                        </button>
                    </div>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Canvas Header */}
                <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            {selectedUsage && (
                                <div className="flex items-center space-x-3">
                                    <div className="text-2xl">{getWidgetIcon(selectedUsage.widgetType)}</div>
                                    <div>
                                        <div className="font-semibold">
                                            {selectedUsage.keyName} - {selectedUsage.widget}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {selectedUsage.file}:{selectedUsage.line}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Live Preview</span>
                        </div>
                    </div>
                </div>

                {/* Canvas */}
                <div 
                    ref={canvasRef}
                    className="flex-1 relative overflow-auto"
                    style={{
                        backgroundImage: showGrid 
                            ? 'radial-gradient(circle, #ccc 1px, transparent 1px)' 
                            : 'none',
                        backgroundSize: showGrid ? '20px 20px' : 'auto',
                        backgroundColor: showGrid ? '#f9f9f9' : 'transparent'
                    }}
                >
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                        {selectedUsage ? (
                            <div className="relative">
                                {renderWidgetInCanvas()}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                <div className="text-6xl mb-4">🎨</div>
                                <div className="text-lg font-medium mb-2">Select a Key Usage</div>
                                <div className="text-sm">Choose a key from the left panel to see its widget preview</div>
                            </div>
                        )}
                    </div>

                    {/* Canvas Info Overlay */}
                    {selectedUsage && (
                        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700">
                            <div className="text-xs space-y-1">
                                <div><strong>Widget:</strong> {selectedUsage.widget}</div>
                                <div><strong>Key:</strong> {selectedUsage.keyName}</div>
                                <div><strong>File:</strong> {selectedUsage.file}</div>
                                <div><strong>Line:</strong> {selectedUsage.line}</div>
                                <div><strong>Zoom:</strong> {canvasZoom}%</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Initialize React App
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<WidgetPreviewApp />);