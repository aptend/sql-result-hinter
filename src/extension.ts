import * as vscode from 'vscode';
import { SqlResultProvider } from './sqlResultProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('SQL Result Hint extension is now active!');

    const sqlResultProvider = new SqlResultProvider();

    // 注册语言服务提供者
    const hoverProvider = vscode.languages.registerHoverProvider('sql', sqlResultProvider);
    const codeLensProvider = vscode.languages.registerCodeLensProvider('sql', sqlResultProvider);
    
    // 为 result 文件注册 codelens 提供者
    const resultCodeLensProvider = vscode.languages.registerCodeLensProvider('sql-result', sqlResultProvider);

    // 注册命令
    const goToResultCommand = vscode.commands.registerCommand('sqlResultHint.goToResult', (sqlResult) => {
        sqlResultProvider.goToResult(sqlResult);
    });
    
    const goToSqlCommand = vscode.commands.registerCommand('sqlResultHint.goToSql', (lineNumber, resultFilePath) => {
        sqlResultProvider.goToSql(resultFilePath, lineNumber);
    });

    context.subscriptions.push(hoverProvider, codeLensProvider, resultCodeLensProvider, goToResultCommand, goToSqlCommand);
}

export function deactivate() {
    console.log('SQL Result Hint extension is now deactivated!');
}
