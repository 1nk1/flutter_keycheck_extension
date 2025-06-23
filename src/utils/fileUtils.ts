import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class FileUtils {
    /**
     * Recursively find all Dart files in a directory
     */
    static async findDartFiles(rootPath: string, excludePatterns: string[] = []): Promise<string[]> {
        const files: string[] = [];
        const libPath = path.join(rootPath, 'lib');
        const testPath = path.join(rootPath, 'test');

        if (fs.existsSync(libPath)) {
            await this.walkDirectory(libPath, files, '.dart', excludePatterns);
        }

        if (fs.existsSync(testPath)) {
            await this.walkDirectory(testPath, files, '.dart', excludePatterns);
        }

        return files;
    }

    /**
     * Walk directory recursively and collect files with specific extension
     */
    private static async walkDirectory(
        dir: string,
        files: string[],
        extension: string,
        excludePatterns: string[] = []
    ): Promise<void> {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            // Skip excluded patterns
            if (excludePatterns.some(pattern => fullPath.includes(pattern))) {
                continue;
            }

            if (stat.isDirectory()) {
                await this.walkDirectory(fullPath, files, extension, excludePatterns);
            } else if (item.endsWith(extension)) {
                files.push(fullPath);
            }
        }
    }

    /**
     * Read file content safely
     */
    static readFileContent(filePath: string): string | null {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Check if file exists
     */
    static fileExists(filePath: string): boolean {
        try {
            return fs.existsSync(filePath);
        } catch {
            return false;
        }
    }

    /**
     * Get line number from text position
     */
    static getLineNumber(content: string, position: number): number {
        return content.substring(0, position).split('\n').length;
    }

    /**
     * Get column number from text position
     */
    static getColumnNumber(content: string, position: number): number {
        const lines = content.substring(0, position).split('\n');
        return lines[lines.length - 1].length;
    }

    /**
     * Get workspace root path
     */
    static getWorkspaceRoot(): string | null {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        return workspaceFolders ? workspaceFolders[0].uri.fsPath : null;
    }

    /**
     * Get relative path from workspace root
     */
    static getRelativePath(absolutePath: string): string {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            return absolutePath;
        }
        return path.relative(workspaceRoot, absolutePath);
    }

    /**
     * Create directory if it doesn't exist
     */
    static ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Write content to file
     */
    static writeFile(filePath: string, content: string): boolean {
        try {
            this.ensureDirectoryExists(path.dirname(filePath));
            fs.writeFileSync(filePath, content, 'utf8');
            return true;
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    /**
     * Check if path is a Flutter project
     */
    static isFlutterProject(rootPath: string): boolean {
        const pubspecPath = path.join(rootPath, 'pubspec.yaml');
        if (!this.fileExists(pubspecPath)) {
            return false;
        }

        const pubspecContent = this.readFileContent(pubspecPath);
        return pubspecContent?.includes('flutter:') || false;
    }

    /**
     * Get context around a specific line
     */
    static getContextAroundLine(content: string, lineNumber: number, contextLines: number = 2): string {
        const lines = content.split('\n');
        const startLine = Math.max(0, lineNumber - contextLines - 1);
        const endLine = Math.min(lines.length, lineNumber + contextLines);

        return lines.slice(startLine, endLine).join('\n');
    }
}
