# Performance Optimization Guide

## 📋 Table of Contents

1. [Performance Overview](#performance-overview)
2. [Performance Metrics](#performance-metrics)
3. [Optimization Strategies](#optimization-strategies)
4. [Memory Management](#memory-management)
5. [CPU Optimization](#cpu-optimization)
6. [I/O Performance](#io-performance)
7. [Bundle Optimization](#bundle-optimization)
8. [Monitoring & Profiling](#monitoring--profiling)

## 🎯 Performance Overview

### Performance Philosophy

The Flutter Testing Keys Inspector extension is designed for optimal performance with minimal resource usage while providing rich functionality. Our performance strategy focuses on:

- **Lazy Loading**: Load components only when needed
- **Intelligent Caching**: Cache expensive operations with smart invalidation
- **Async Operations**: Non-blocking user interface
- **Resource Pooling**: Efficient resource management
- **Progressive Enhancement**: Core functionality first, advanced features on demand

### Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|--------------------|
| Extension Activation | < 2 seconds | < 5 seconds |
| Command Response Time | < 500ms | < 1 second |
| Memory Usage | < 50MB | < 100MB |
| CPU Usage (Idle) | < 1% | < 5% |
| CPU Usage (Active) | < 10% | < 25% |
| Bundle Size | < 2MB | < 5MB |
| Key Scanning (1000 keys) | < 1 second | < 3 seconds |

## 📊 Performance Metrics

### Key Performance Indicators

#### 1. Extension Lifecycle Metrics
```typescript
// Performance tracking in extension activation
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const startTime = performance.now();
    
    try {
        // Extension initialization
        await ExtensionCore.initialize(context);
        
        const activationTime = performance.now() - startTime;
        PerformanceMonitor.recordMetric('extension.activation', activationTime);
        
        if (activationTime > 2000) {
            console.warn(`Slow activation: ${activationTime}ms`);
        }
    } catch (error) {
        const activationTime = performance.now() - startTime;
        PerformanceMonitor.recordMetric('extension.activation.failed', activationTime);
        throw error;
    }
}
```

#### 2. Command Performance Tracking
```typescript
// BaseCommand with performance monitoring
export abstract class BaseCommand {
    protected async execute(): Promise<void> {
        const startTime = performance.now();
        const commandName = this.constructor.name;
        
        try {
            await this.executeImpl();
            
            const executionTime = performance.now() - startTime;
            PerformanceMonitor.recordMetric(`command.${commandName}`, executionTime);
            
            if (executionTime > 500) {
                console.warn(`Slow command ${commandName}: ${executionTime}ms`);
            }
        } catch (error) {
            const executionTime = performance.now() - startTime;
            PerformanceMonitor.recordMetric(`command.${commandName}.failed`, executionTime);
            throw error;
        }
    }
}
```

#### 3. Service Performance Metrics
```typescript
// Service-level performance tracking
export class KeyScanner {
    private performanceTracker = new PerformanceTracker('KeyScanner');
    
    public async scanWorkspace(): Promise<void> {
        return this.performanceTracker.track('scanWorkspace', async () => {
            // Scanning implementation
            const files = await this.getFilesToScan();
            const results = await Promise.all(
                files.map(file => this.scanFile(file))
            );
            
            PerformanceMonitor.recordMetric('keyScanner.filesScanned', files.length);
            PerformanceMonitor.recordMetric('keyScanner.keysFound', results.flat().length);
        });
    }
}
```

### Performance Monitoring Implementation

```typescript
export class PerformanceMonitor {
    private static metrics: Map<string, number[]> = new Map();
    private static memoryUsage: number[] = [];
    
    public static recordMetric(name: string, value: number): void {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        
        const values = this.metrics.get(name)!;
        values.push(value);
        
        // Keep only last 100 measurements
        if (values.length > 100) {
            values.shift();
        }
    }
    
    public static getAverageMetric(name: string): number {
        const values = this.metrics.get(name) || [];
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }
    
    public static recordMemoryUsage(): void {
        const usage = process.memoryUsage();
        this.memoryUsage.push(usage.heapUsed);
        
        // Keep only last 100 measurements
        if (this.memoryUsage.length > 100) {
            this.memoryUsage.shift();
        }
    }
    
    public static getPerformanceReport(): PerformanceReport {
        return {
            averageActivationTime: this.getAverageMetric('extension.activation'),
            averageCommandTime: this.getAverageMetric('command.average'),
            averageMemoryUsage: this.memoryUsage.reduce((a, b) => a + b, 0) / this.memoryUsage.length,
            totalMetrics: this.metrics.size,
            measurementCount: Array.from(this.metrics.values())
                .reduce((total, values) => total + values.length, 0)
        };
    }
}
```

## ⚡ Optimization Strategies

### 1. Lazy Loading Implementation

#### Service Lazy Loading
```typescript
export class ServiceManager {
    private static services: Map<string, any> = new Map();
    
    public static async getService<T>(
        serviceName: string, 
        factory: () => Promise<T>
    ): Promise<T> {
        if (!this.services.has(serviceName)) {
            console.log(`Initializing service: ${serviceName}`);
            const startTime = performance.now();
            
            const service = await factory();
            this.services.set(serviceName, service);
            
            const initTime = performance.now() - startTime;
            PerformanceMonitor.recordMetric(`service.${serviceName}.init`, initTime);
        }
        
        return this.services.get(serviceName);
    }
}

// Usage
const keyScanner = await ServiceManager.getService('keyScanner', async () => {
    return new KeyScanner();
});
```

#### Component Lazy Loading
```typescript
export class ProviderRegistry {
    private providers: Map<string, any> = new Map();
    
    public async getTreeProvider(): Promise<KeyTreeProvider> {
        return this.lazyLoad('treeProvider', async () => {
            const keyScanner = await ServiceManager.getService('keyScanner', 
                () => Promise.resolve(new KeyScanner()));
            return new KeyTreeProvider(keyScanner);
        });
    }
    
    private async lazyLoad<T>(name: string, factory: () => Promise<T>): Promise<T> {
        if (!this.providers.has(name)) {
            this.providers.set(name, await factory());
        }
        return this.providers.get(name);
    }
}
```

### 2. Intelligent Caching System

#### Multi-Level Cache Implementation
```typescript
export class CacheManager {
    private memoryCache: Map<string, CacheEntry> = new Map();
    private readonly maxCacheSize = 1000;
    private readonly defaultTTL = 300000; // 5 minutes
    
    public set<T>(key: string, value: T, ttl?: number): void {
        const entry: CacheEntry = {
            value,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL
        };
        
        this.memoryCache.set(key, entry);
        this.enforceMaxSize();
    }
    
    public get<T>(key: string): T | null {
        const entry = this.memoryCache.get(key);
        
        if (!entry) {
            return null;
        }
        
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.memoryCache.delete(key);
            return null;
        }
        
        return entry.value as T;
    }
    
    private enforceMaxSize(): void {
        if (this.memoryCache.size > this.maxCacheSize) {
            const oldestKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(oldestKey);
        }
    }
}

// Service-specific caching
export class KeyScanner {
    private cache = new CacheManager();
    
    public async scanFile(uri: vscode.Uri): Promise<TestingKey[]> {
        const cacheKey = `scanFile:${uri.fsPath}:${await this.getFileHash(uri)}`;
        
        // Check cache first
        const cached = this.cache.get<TestingKey[]>(cacheKey);
        if (cached) {
            PerformanceMonitor.recordMetric('keyScanner.cacheHit', 1);
            return cached;
        }
        
        // Scan file and cache result
        const result = await this.performFileScan(uri);
        this.cache.set(cacheKey, result, 600000); // 10 minutes
        PerformanceMonitor.recordMetric('keyScanner.cacheMiss', 1);
        
        return result;
    }
}
```

### 3. Batch Processing Optimization

#### Batch File Processing
```typescript
export class BatchProcessor {
    private readonly batchSize = 10;
    private readonly maxConcurrency = 5;
    
    public async processBatch<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>
    ): Promise<R[]> {
        const results: R[] = [];
        const semaphore = new Semaphore(this.maxConcurrency);
        
        for (let i = 0; i < items.length; i += this.batchSize) {
            const batch = items.slice(i, i + this.batchSize);
            
            const batchResults = await Promise.all(
                batch.map(async (item) => {
                    await semaphore.acquire();
                    try {
                        return await processor(item);
                    } finally {
                        semaphore.release();
                    }
                })
            );
            
            results.push(...batchResults);
            
            // Yield control to prevent blocking
            await new Promise(resolve => setImmediate(resolve));
        }
        
        return results;
    }
}

// Usage in KeyScanner
public async scanWorkspace(): Promise<void> {
    const files = await this.getFilesToScan();
    const batchProcessor = new BatchProcessor();
    
    const results = await batchProcessor.processBatch(
        files,
        (file) => this.scanFile(file)
    );
    
    this.processResults(results.flat());
}
```

### 4. Debouncing and Throttling

#### Event Debouncing
```typescript
export class EventDebouncer {
    private timers: Map<string, NodeJS.Timeout> = new Map();
    
    public debounce<T extends (...args: any[]) => any>(
        key: string,
        func: T,
        delay: number
    ): T {
        return ((...args: any[]) => {
            const existingTimer = this.timers.get(key);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }
            
            const timer = setTimeout(() => {
                func(...args);
                this.timers.delete(key);
            }, delay);
            
            this.timers.set(key, timer);
        }) as T;
    }
}

// Usage in file watching
export class EventHandlers {
    private debouncer = new EventDebouncer();
    
    public registerFileWatcher(): void {
        const debouncedScan = this.debouncer.debounce(
            'fileScan',
            (uri: vscode.Uri) => this.handleFileChange(uri),
            500 // 500ms delay
        );
        
        vscode.workspace.onDidSaveTextDocument((document) => {
            if (this.isDartFile(document.uri)) {
                debouncedScan(document.uri);
            }
        });
    }
}
```

## 🧠 Memory Management

### Memory Optimization Strategies

#### 1. Object Pooling
```typescript
export class ObjectPool<T> {
    private pool: T[] = [];
    private factory: () => T;
    private reset: (obj: T) => void;
    private maxPoolSize: number;
    
    constructor(factory: () => T, reset: (obj: T) => void, maxPoolSize = 100) {
        this.factory = factory;
        this.reset = reset;
        this.maxPoolSize = maxPoolSize;
    }
    
    public acquire(): T {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }
        return this.factory();
    }
    
    public release(obj: T): void {
        if (this.pool.length < this.maxPoolSize) {
            this.reset(obj);
            this.pool.push(obj);
        }
    }
}

// Usage for validation results
const validationResultPool = new ObjectPool<ValidationResult>(
    () => ({
        isValid: true,
        errors: [],
        warnings: [],
        info: [],
        timestamp: new Date()
    }),
    (result) => {
        result.isValid = true;
        result.errors.length = 0;
        result.warnings.length = 0;
        result.info.length = 0;
    }
);
```

#### 2. Weak References for Cache
```typescript
export class WeakCache<K extends object, V> {
    private cache = new WeakMap<K, V>();
    
    public set(key: K, value: V): void {
        this.cache.set(key, value);
    }
    
    public get(key: K): V | undefined {
        return this.cache.get(key);
    }
    
    public has(key: K): boolean {
        return this.cache.has(key);
    }
    
    // Automatically garbage collected when keys are no longer referenced
}

// Usage for document-based caching
export class DocumentCache {
    private cache = new WeakCache<vscode.TextDocument, ParsedContent>();
    
    public getParsedContent(document: vscode.TextDocument): ParsedContent {
        let content = this.cache.get(document);
        if (!content) {
            content = this.parseDocument(document);
            this.cache.set(document, content);
        }
        return content;
    }
}
```

#### 3. Memory Usage Monitoring
```typescript
export class MemoryMonitor {
    private static instance: MemoryMonitor;
    private monitoringInterval: NodeJS.Timeout | null = null;
    
    public static getInstance(): MemoryMonitor {
        if (!MemoryMonitor.instance) {
            MemoryMonitor.instance = new MemoryMonitor();
        }
        return MemoryMonitor.instance;
    }
    
    public startMonitoring(intervalMs = 30000): void {
        this.monitoringInterval = setInterval(() => {
            const usage = process.memoryUsage();
            
            PerformanceMonitor.recordMetric('memory.heapUsed', usage.heapUsed);
            PerformanceMonitor.recordMetric('memory.heapTotal', usage.heapTotal);
            PerformanceMonitor.recordMetric('memory.external', usage.external);
            
            // Alert if memory usage is high
            const heapUsedMB = usage.heapUsed / 1024 / 1024;
            if (heapUsedMB > 100) {
                console.warn(`High memory usage: ${heapUsedMB.toFixed(2)}MB`);
                this.triggerGarbageCollection();
            }
        }, intervalMs);
    }
    
    private triggerGarbageCollection(): void {
        if (global.gc) {
            global.gc();
            console.log('Garbage collection triggered');
        }
    }
    
    public stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }
}
```

## 🔄 CPU Optimization

### CPU-Intensive Task Optimization

#### 1. Worker Thread Implementation
```typescript
// worker.ts - CPU-intensive operations in worker thread
import { parentPort, workerData } from 'worker_threads';

interface WorkerMessage {
    type: 'parseFiles' | 'validateKeys';
    data: any;
}

parentPort?.on('message', async (message: WorkerMessage) => {
    try {
        let result;
        
        switch (message.type) {
            case 'parseFiles':
                result = await parseFilesInWorker(message.data);
                break;
            case 'validateKeys':
                result = await validateKeysInWorker(message.data);
                break;
            default:
                throw new Error(`Unknown message type: ${message.type}`);
        }
        
        parentPort?.postMessage({ success: true, result });
    } catch (error) {
        parentPort?.postMessage({ success: false, error: error.message });
    }
});

// Main thread worker manager
export class WorkerManager {
    private worker: Worker | null = null;
    
    public async executeInWorker<T>(type: string, data: any): Promise<T> {
        if (!this.worker) {
            const workerPath = path.join(__dirname, 'worker.js');
            this.worker = new Worker(workerPath);
        }
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Worker timeout'));
            }, 30000); // 30 second timeout
            
            this.worker!.once('message', (message) => {
                clearTimeout(timeout);
                
                if (message.success) {
                    resolve(message.result);
                } else {
                    reject(new Error(message.error));
                }
            });
            
            this.worker!.postMessage({ type, data });
        });
    }
    
    public dispose(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}
```

#### 2. Task Scheduling and Prioritization
```typescript
export class TaskScheduler {
    private highPriorityQueue: (() => Promise<void>)[] = [];
    private normalPriorityQueue: (() => Promise<void>)[] = [];
    private lowPriorityQueue: (() => Promise<void>)[] = [];
    private isProcessing = false;
    
    public scheduleHighPriority(task: () => Promise<void>): void {
        this.highPriorityQueue.push(task);
        this.processQueue();
    }
    
    public scheduleNormalPriority(task: () => Promise<void>): void {
        this.normalPriorityQueue.push(task);
        this.processQueue();
    }
    
    public scheduleLowPriority(task: () => Promise<void>): void {
        this.lowPriorityQueue.push(task);
        this.processQueue();
    }
    
    private async processQueue(): Promise<void> {
        if (this.isProcessing) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            while (this.hasTasksToProcess()) {
                const task = this.getNextTask();
                if (task) {
                    await task();
                    
                    // Yield control after each task
                    await new Promise(resolve => setImmediate(resolve));
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }
    
    private hasTasksToProcess(): boolean {
        return this.highPriorityQueue.length > 0 ||
               this.normalPriorityQueue.length > 0 ||
               this.lowPriorityQueue.length > 0;
    }
    
    private getNextTask(): (() => Promise<void>) | null {
        if (this.highPriorityQueue.length > 0) {
            return this.highPriorityQueue.shift()!;
        }
        if (this.normalPriorityQueue.length > 0) {
            return this.normalPriorityQueue.shift()!;
        }
        if (this.lowPriorityQueue.length > 0) {
            return this.lowPriorityQueue.shift()!;
        }
        return null;
    }
}
```

#### 3. CPU Usage Monitoring
```typescript
export class CPUMonitor {
    private lastCPUUsage: NodeJS.CpuUsage = process.cpuUsage();
    private lastMeasurement: number = Date.now();
    
    public getCPUUsage(): number {
        const currentUsage = process.cpuUsage(this.lastCPUUsage);
        const currentTime = Date.now();
        const timeDiff = currentTime - this.lastMeasurement;
        
        // Calculate CPU percentage
        const totalCPUTime = (currentUsage.user + currentUsage.system) / 1000; // Convert to ms
        const cpuPercent = (totalCPUTime / timeDiff) * 100;
        
        this.lastCPUUsage = process.cpuUsage();
        this.lastMeasurement = currentTime;
        
        return cpuPercent;
    }
}
```

## 💾 I/O Performance

### File System Optimization

#### 1. Parallel File Operations
```typescript
export class FileOperationOptimizer {
    private readonly maxConcurrentReads = 10;
    
    public async readFilesParallel(uris: vscode.Uri[]): Promise<string[]> {
        const semaphore = new Semaphore(this.maxConcurrentReads);
        
        const results = await Promise.all(
            uris.map(async (uri) => {
                await semaphore.acquire();
                try {
                    return await this.readFile(uri);
                } finally {
                    semaphore.release();
                }
            })
        );
        
        return results;
    }
    
    private async readFile(uri: vscode.Uri): Promise<string> {
        const startTime = performance.now();
        
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const content = document.getText();
            
            const readTime = performance.now() - startTime;
            PerformanceMonitor.recordMetric('fileOperation.read', readTime);
            
            return content;
        } catch (error) {
            const readTime = performance.now() - startTime;
            PerformanceMonitor.recordMetric('fileOperation.read.failed', readTime);
            throw error;
        }
    }
}
```

#### 2. Intelligent File Watching
```typescript
export class OptimizedFileWatcher {
    private watchers: Map<string, vscode.FileSystemWatcher> = new Map();
    private debouncer = new EventDebouncer();
    
    public watchDirectory(path: string, callback: (uri: vscode.Uri) => void): void {
        if (this.watchers.has(path)) {
            return; // Already watching
        }
        
        const pattern = new vscode.RelativePattern(path, '**/*.dart');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        const debouncedCallback = this.debouncer.debounce(
            `watch-${path}`,
            callback,
            200 // 200ms debounce
        );
        
        watcher.onDidChange(debouncedCallback);
        watcher.onDidCreate(debouncedCallback);
        watcher.onDidDelete((uri) => {
            // Handle deletions immediately
            callback(uri);
        });
        
        this.watchers.set(path, watcher);
    }
    
    public unwatchDirectory(path: string): void {
        const watcher = this.watchers.get(path);
        if (watcher) {
            watcher.dispose();
            this.watchers.delete(path);
        }
    }
    
    public dispose(): void {
        for (const watcher of this.watchers.values()) {
            watcher.dispose();
        }
        this.watchers.clear();
    }
}
```

## 📦 Bundle Optimization

### Webpack Optimization Configuration

```javascript
// webpack.config.js - Optimized for performance
const path = require('path');
const webpack = require('webpack');

module.exports = {
    target: 'node',
    mode: 'production',
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'out'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2'
    },
    externals: {
        vscode: 'commonjs vscode'
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true, // Faster compilation
                            compilerOptions: {
                                sourceMap: false // Disable source maps in production
                            }
                        }
                    }
                ]
            }
        ]
    },
    optimization: {
        minimize: true,
        usedExports: true,
        sideEffects: false,
        splitChunks: false // VS Code extensions should be single bundle
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        }),
        new webpack.optimize.AggressiveMergingPlugin(),
        new webpack.BannerPlugin({
            banner: '#!/usr/bin/env node',
            raw: true
        })
    ],
    devtool: 'nosources-source-map',
    performance: {
        hints: 'error',
        maxAssetSize: 2000000, // 2MB limit
        maxEntrypointSize: 2000000
    }
};
```

### Tree Shaking and Dead Code Elimination

```typescript
// Conditional imports for better tree shaking
export class FeatureManager {
    private static features: Map<string, () => Promise<any>> = new Map();
    
    public static registerFeature(name: string, loader: () => Promise<any>): void {
        this.features.set(name, loader);
    }
    
    public static async loadFeature(name: string): Promise<any> {
        const loader = this.features.get(name);
        if (!loader) {
            throw new Error(`Feature ${name} not found`);
        }
        
        return await loader();
    }
}

// Register features conditionally
if (process.env.NODE_ENV !== 'production') {
    FeatureManager.registerFeature('debug', () => import('./debug/debugTools'));
}

FeatureManager.registerFeature('advanced-validation', 
    () => import('./validation/advancedValidation'));
```

## 📈 Monitoring & Profiling

### Performance Profiling Tools

#### 1. Built-in Performance Profiler
```typescript
export class PerformanceProfiler {
    private profiles: Map<string, ProfileData> = new Map();
    
    public startProfile(name: string): void {
        this.profiles.set(name, {
            startTime: performance.now(),
            memoryStart: process.memoryUsage(),
            checkpoints: []
        });
    }
    
    public checkpoint(profileName: string, checkpointName: string): void {
        const profile = this.profiles.get(profileName);
        if (profile) {
            profile.checkpoints.push({
                name: checkpointName,
                time: performance.now() - profile.startTime,
                memory: process.memoryUsage()
            });
        }
    }
    
    public endProfile(name: string): ProfileResult {
        const profile = this.profiles.get(name);
        if (!profile) {
            throw new Error(`Profile ${name} not found`);
        }
        
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        
        const result: ProfileResult = {
            name,
            totalTime: endTime - profile.startTime,
            memoryDelta: endMemory.heapUsed - profile.memoryStart.heapUsed,
            checkpoints: profile.checkpoints
        };
        
        this.profiles.delete(name);
        return result;
    }
}

// Usage
const profiler = new PerformanceProfiler();
profiler.startProfile('keyScanning');
// ... operations ...
profiler.checkpoint('keyScanning', 'filesDiscovered');
// ... more operations ...
const result = profiler.endProfile('keyScanning');
console.log(`Key scanning took ${result.totalTime}ms and used ${result.memoryDelta} bytes`);
```

#### 2. Real-time Performance Dashboard
```typescript
export class PerformanceDashboard {
    private static instance: PerformanceDashboard;
    private statusBarItem: vscode.StatusBarItem;
    private updateInterval: NodeJS.Timeout | null = null;
    
    public static getInstance(): PerformanceDashboard {
        if (!PerformanceDashboard.instance) {
            PerformanceDashboard.instance = new PerformanceDashboard();
        }
        return PerformanceDashboard.instance;
    }
    
    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'flutter-testing-keys.showPerformanceDetails';
    }
    
    public startMonitoring(): void {
        this.updateInterval = setInterval(() => {
            this.updateStatusBar();
        }, 5000); // Update every 5 seconds
        
        this.statusBarItem.show();
    }
    
    private updateStatusBar(): void {
        const memoryUsage = process.memoryUsage();
        const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        
        const avgActivationTime = PerformanceMonitor.getAverageMetric('extension.activation');
        const avgCommandTime = PerformanceMonitor.getAverageMetric('command.average');
        
        this.statusBarItem.text = `$(pulse) ${memoryMB}MB | ${Math.round(avgCommandTime)}ms`;
        this.statusBarItem.tooltip = `Memory: ${memoryMB}MB\nAvg Activation: ${Math.round(avgActivationTime)}ms\nAvg Command: ${Math.round(avgCommandTime)}ms`;
    }
    
    public dispose(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.statusBarItem.dispose();
    }
}
```

### Performance Testing

#### 1. Automated Performance Tests
```typescript
describe('Performance Tests', () => {
    let performanceProfiler: PerformanceProfiler;
    
    beforeEach(() => {
        performanceProfiler = new PerformanceProfiler();
    });
    
    test('extension activation should be under 2 seconds', async () => {
        performanceProfiler.startProfile('activation');
        
        await simulateExtensionActivation();
        
        const result = performanceProfiler.endProfile('activation');
        expect(result.totalTime).toBeLessThan(2000);
    });
    
    test('key scanning should handle 1000 keys under 1 second', async () => {
        const keys = generateMockKeys(1000);
        
        performanceProfiler.startProfile('keyScanning');
        
        await keyScanner.processKeys(keys);
        
        const result = performanceProfiler.endProfile('keyScanning');
        expect(result.totalTime).toBeLessThan(1000);
    });
    
    test('memory usage should stay under 50MB', async () => {
        const initialMemory = process.memoryUsage().heapUsed;
        
        // Perform memory-intensive operations
        await performMemoryIntensiveOperations();
        
        // Force garbage collection
        if (global.gc) global.gc();
        
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
        
        expect(memoryIncrease).toBeLessThan(50);
    });
});
```

#### 2. Load Testing
```typescript
export class LoadTester {
    public static async testConcurrentCommands(commandCount: number): Promise<TestResult> {
        const startTime = performance.now();
        const commands: Promise<void>[] = [];
        
        for (let i = 0; i < commandCount; i++) {
            commands.push(this.executeTestCommand(`command-${i}`));
        }
        
        const results = await Promise.allSettled(commands);
        const endTime = performance.now();
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        return {
            totalTime: endTime - startTime,
            commandCount,
            successful,
            failed,
            successRate: (successful / commandCount) * 100
        };
    }
    
    private static async executeTestCommand(name: string): Promise<void> {
        // Simulate command execution
        const command = new ValidateCommand(mockValidationService);
        await command.execute();
    }
}
```

---

This comprehensive performance optimization guide ensures the Flutter Testing Keys Inspector extension delivers optimal performance while maintaining rich functionality and user experience.