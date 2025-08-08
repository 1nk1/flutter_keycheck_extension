const path = require('path');

module.exports = {
    mode: 'development',
    entry: './src/webview/widgetPreview.js',
    output: {
        filename: 'widgetPreview.js',
        path: path.resolve(__dirname, 'out', 'webview'),
        clean: true
    },
    resolve: {
        extensions: ['.js'],
    },
    externals: {
        vscode: 'commonjs vscode'
    },
    devtool: 'source-map'
};