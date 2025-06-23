import * as path from 'path';
import * as vscode from 'vscode';
import { KeyCategory, KeyStatistics, TestingKey } from '../models/testingKey';
import { DartParser } from '../utils/dartParser';
import { FileUtils } from '../utils/fileUtils';

export class KeyScanner {
    private keys: TestingKey[] = [];
    private lastScanTime: number = 0;
    private readonly CACHE_DURATION = 30000; // 30 seconds

    /**
     * Scan all keys in the Flutter project
     */
    async scanAllKeys(forceRefresh: boolean = false): Promise<TestingKey[]> {
        const now = Date.now();

        // Return cached results if still fresh
        if (!forceRefresh && (now - this.lastScanTime) < this.CACHE_DURATION && this.keys.length > 0) {
            return this.keys;
        }

        const workspaceRoot = FileUtils.getWorkspaceRoot();
        if (!workspaceRoot) {
            return [];
        }

        // Check if it's a Flutter project
        if (!FileUtils.isFlutterProject(workspaceRoot)) {
            return [];
        }

        try {
            // Scan key constants
            const constantsKeys = await this.scanKeyConstants(workspaceRoot);

            // Scan key usage
            const usageMap = await this.scanKeyUsage(workspaceRoot);

            // Merge and validate
            this.keys = this.mergeKeysWithUsage(constantsKeys, usageMap);
            this.lastScanTime = now;

            return this.keys;
        } catch (error) {
            console.error('Error scanning keys:', error);
            vscode.window.showErrorMessage(`Failed to scan keys: ${error}`);
            return [];
        }
    }

    /**
     * Scan KeyConstants file for defined keys
     */
    private async scanKeyConstants(rootPath: string): Promise<TestingKey[]> {
        const config = vscode.workspace.getConfiguration('flutterTestingKeys');
        const keyConstantsPath = config.get<string>('keyConstantsPath', 'lib/constants/key_constants.dart');
        const fullPath = path.join(rootPath, keyConstantsPath);

        if (!FileUtils.fileExists(fullPath)) {
            // Try to find key constants file automatically
            const dartFiles = await FileUtils.findDartFiles(rootPath);
            const constantsFile = dartFiles.find(file => DartParser.isKeyConstantsFile(file));

            if (constantsFile) {
                return DartParser.parseKeyConstants(constantsFile);
            }

            return [];
        }

        return DartParser.parseKeyConstants(fullPath);
    }

    /**
     * Scan all Dart files for key usage
     */
    private async scanKeyUsage(rootPath: string): Promise<Map<string, {count: number, files: string[]}>> {
        const dartFiles = await FileUtils.findDartFiles(rootPath, ['generated', '.g.dart']);
        const usageMap = new Map<string, {count: number, files: string[]}>();

        for (const file of dartFiles) {
            const fileUsage = DartParser.findKeyUsage(file);

            for (const [keyName, count] of fileUsage.entries()) {
                if (!usageMap.has(keyName)) {
                    usageMap.set(keyName, { count: 0, files: [] });
                }

                const usage = usageMap.get(keyName)!;
                usage.count += count;
                if (!usage.files.includes(file)) {
                    usage.files.push(file);
                }
            }
        }

        return usageMap;
    }

    /**
     * Merge defined keys with usage information
     */
    private mergeKeysWithUsage(
        definedKeys: TestingKey[],
        usageMap: Map<string, {count: number, files: string[]}>
    ): TestingKey[] {
        return definedKeys.map(key => {
            const usage = usageMap.get(key.name);

            return {
                ...key,
                isUsed: !!usage && usage.count > 0,
                usageCount: usage?.count || 0,
                usageFiles: usage?.files || []
            };
        });
    }

    /**
     * Get key statistics
     */
    getKeyStatistics(): KeyStatistics {
        const totalKeys = this.keys.length;
        const usedKeys = this.keys.filter(key => key.isUsed).length;
        const unusedKeys = totalKeys - usedKeys;

        // Count by category
        const categoryCounts = this.keys.reduce((acc, key) => {
            acc[key.category] = (acc[key.category] || 0) + 1;
            return acc;
        }, {} as Record<KeyCategory, number>);

        // Most used keys (top 10)
        const mostUsedKeys = this.keys
            .filter(key => key.isUsed)
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, 10);

        // Unused keys
        const unusedKeysList = this.keys.filter(key => !key.isUsed);

        return {
            totalKeys,
            usedKeys,
            unusedKeys,
            categoryCounts,
            mostUsedKeys,
            unusedKeysList
        };
    }

    /**
     * Find keys by category
     */
    getKeysByCategory(category: KeyCategory): TestingKey[] {
        return this.keys.filter(key => key.category === category);
    }

    /**
     * Search keys by name or value
     */
    searchKeys(query: string): TestingKey[] {
        const lowerQuery = query.toLowerCase();
        return this.keys.filter(key =>
            key.name.toLowerCase().includes(lowerQuery) ||
            key.value.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get unused keys
     */
    getUnusedKeys(): TestingKey[] {
        return this.keys.filter(key => !key.isUsed);
    }

    /**
     * Get most used keys
     */
    getMostUsedKeys(limit: number = 10): TestingKey[] {
        return this.keys
            .filter(key => key.isUsed)
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, limit);
    }

    /**
     * Find key by name
     */
    findKeyByName(name: string): TestingKey | undefined {
        return this.keys.find(key => key.name === name);
    }

    /**
     * Check if key exists
     */
    keyExists(name: string): boolean {
        return this.keys.some(key => key.name === name);
    }

    /**
     * Get all categories with key counts
     */
    getCategories(): Array<{category: KeyCategory, count: number}> {
        const categoryCounts = this.keys.reduce((acc, key) => {
            acc[key.category] = (acc[key.category] || 0) + 1;
            return acc;
        }, {} as Record<KeyCategory, number>);

        return Object.entries(categoryCounts).map(([category, count]) => ({
            category: category as KeyCategory,
            count
        }));
    }

    /**
     * Clear cache and force refresh on next scan
     */
    clearCache(): void {
        this.keys = [];
        this.lastScanTime = 0;
    }

    /**
     * Get cached keys without scanning
     */
    getCachedKeys(): TestingKey[] {
        return this.keys;
    }

    /**
     * Add a new key to the cache (used when adding keys via UI)
     */
    addKeyToCache(key: TestingKey): void {
        this.keys.push(key);
    }

    /**
     * Remove key from cache
     */
    removeKeyFromCache(keyName: string): void {
        this.keys = this.keys.filter(key => key.name !== keyName);
    }

    /**
     * Update key in cache
     */
    updateKeyInCache(updatedKey: TestingKey): void {
        const index = this.keys.findIndex(key => key.name === updatedKey.name);
        if (index !== -1) {
            this.keys[index] = updatedKey;
        }
    }
}
