import * as vscode from 'vscode';
import * as path from 'path';
import { TestingKey } from '../models/testingKey';

export class WidgetPreviewPanel {
    public static currentPanel: WidgetPreviewPanel | undefined;
    public static readonly viewType = 'flutterWidgetPreview';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, keys?: TestingKey[]) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (WidgetPreviewPanel.currentPanel) {
            WidgetPreviewPanel.currentPanel._panel.reveal(column);
            if (keys) {
                WidgetPreviewPanel.currentPanel.updateWithKeys(keys);
            }
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            WidgetPreviewPanel.viewType,
            'Flutter Widget Preview',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out', 'webview')
                ]
            }
        );

        WidgetPreviewPanel.currentPanel = new WidgetPreviewPanel(panel, extensionUri);
        
        if (keys) {
            WidgetPreviewPanel.currentPanel.updateWithKeys(keys);
        }
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        WidgetPreviewPanel.currentPanel = new WidgetPreviewPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this._update();
                }
            },
            null,
            this._disposables
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'navigateToKey':
                        this.navigateToKey(message.location);
                        return;
                    case 'requestPreview':
                        this.handlePreviewRequest(message.keyName);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public updatePreview(key: TestingKey) {
        this._panel.webview.postMessage({
            command: 'updatePreview',
            key: key
        });
    }

    public updateWithKeys(keys: TestingKey[]) {
        // Преобразуем TestingKey в формат для WebView
        const keyUsages = keys.map(key => ({
            keyName: key.name,
            widget: this.guessWidgetType(key.name, key.category),
            file: key.filePath.split('/').pop() || 'unknown.dart',
            line: key.line,
            isSelected: false,
            widgetType: this.guessWidgetType(key.name, key.category)
        }));

        console.log(`Sending ${keyUsages.length} real keys to WebView:`, keyUsages);

        this._panel.webview.postMessage({
            command: 'updateKeys',
            keyUsages: keyUsages
        });
    }

    private guessWidgetType(keyName: string, category: any): string {
        // Угадываем тип виджета по имени ключа и категории
        const name = keyName.toLowerCase();
        
        if (name.includes('button') || name.includes('btn')) {
            return 'ElevatedButton';
        } else if (name.includes('field') || name.includes('input') || name.includes('text')) {
            return 'TextField';
        } else if (name.includes('card')) {
            return 'Card';
        } else if (name.includes('dialog') || name.includes('modal')) {
            return 'Dialog';
        } else if (name.includes('list') || name.includes('item')) {
            return 'ListView';
        } else {
            return 'Widget';
        }
    }

    private async navigateToKey(location: vscode.Location) {
        const document = await vscode.workspace.openTextDocument(location.uri);
        const editor = await vscode.window.showTextDocument(document);
        editor.selection = new vscode.Selection(location.range.start, location.range.end);
        editor.revealRange(location.range);
    }

    private async handlePreviewRequest(keyName: string) {
        // Here you would fetch the actual widget data
        // For now, we'll send mock data
        this._panel.webview.postMessage({
            command: 'previewData',
            keyName: keyName,
            widgetData: this.generateMockWidgetData(keyName)
        });
    }

    private generateMockWidgetData(keyName: string) {
        // Mock widget data - in real implementation, this would come from Dart devtools
        return {
            type: 'ElevatedButton',
            properties: {
                style: 'elevated',
                color: '#2196F3',
                textColor: '#FFFFFF',
                borderRadius: 8,
                elevation: 2
            },
            children: [
                {
                    type: 'Text',
                    properties: {
                        text: keyName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                        fontSize: 16,
                        fontWeight: 'normal'
                    }
                }
            ]
        };
    }

    public dispose() {
        WidgetPreviewPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Flutter Widget Preview';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Path to local script and css files
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'widgetPreview.js');
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
        
        const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
        const stylesResetUri = webview.asWebviewUri(styleResetPath);
        
        const styleWidgetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'widgetPreview.css');
        const stylesWidgetUri = webview.asWebviewUri(styleWidgetPath);

        // Get the nonce
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${stylesResetUri}" rel="stylesheet">
                <link href="${stylesWidgetUri}" rel="stylesheet">
                <title>Flutter Widget Preview</title>
            </head>
            <body>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}