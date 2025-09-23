import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ResultFileParser, SqlResult } from './resultFileParser';
import { HoverContentGenerator } from './hoverContentGenerator';

export class SqlResultProvider {
    // 缓存结构：文件路径 -> 行号 -> SqlResult
    // 使用嵌套 Map 实现 O(1) 时间复杂度的行号查找
    private sqlResultsCache: Map<string, Map<number, SqlResult>> = new Map();
    
    // 缓存最大大小，防止内存泄漏
    private readonly MAX_CACHE_SIZE = 100;
    
    // 结果文件解析器
    private readonly resultParser: ResultFileParser;
    
    // 悬停内容生成器
    private readonly hoverGenerator: HoverContentGenerator;
    
    constructor() {
        this.resultParser = new ResultFileParser();
        this.hoverGenerator = new HoverContentGenerator();
    }

    async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Hover | undefined> {
        const config = vscode.workspace.getConfiguration('sqlResultHint');
        if (!config.get('enabled', true)) {
            return undefined;
        }

        const lineNumber = position.line + 1; // VSCode 使用 0-based，result 文件使用 1-based
        const sqlResult = await this.getSqlResultAtLine(document, lineNumber);
        
        if (!sqlResult) {
            return undefined;
        }

        const hoverContent = this.hoverGenerator.createHoverContent(sqlResult, config);
        if (!hoverContent) {
            return undefined;
        }

        return new vscode.Hover(hoverContent);
    }

    async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
        const config = vscode.workspace.getConfiguration('sqlResultHint');
        if (!config.get('enabled', true)) {
            return [];
        }

        try {
            const filePath = document.uri.fsPath;
            
            // 判断是 SQL 文件还是 result 文件
            if (filePath.endsWith('.result')) {
                return this.provideResultFileCodeLenses(document, token);
            } else {
                return this.provideSqlFileCodeLenses(document, token);
            }
        } catch (error) {
            console.error('Error providing code lenses:', error);
            return [];
        }
    }

    private async provideSqlFileCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
        const filePath = document.uri.fsPath;
        const resultFilePath = this.getResultFilePath(filePath);
        
        if (!fs.existsSync(resultFilePath)) {
            return [];
        }

        const resultsMap = await this.loadSqlResultsMap(document);
        if (!resultsMap) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        
        for (const [lineNumber, sqlResult] of resultsMap) {
            // 对于无结果，不需要显示 codelens
            if (sqlResult.type === 'empty') {
                continue;
            }

            const range = new vscode.Range(
                lineNumber - 1, 0,
                lineNumber - 1, document.lineAt(lineNumber - 1).text.length
            );

            const command: vscode.Command = {
                title: this.getCodeLensTitle(sqlResult),
                command: 'sqlResultHint.goToResult',
                arguments: [sqlResult]
            };

            codeLenses.push(new vscode.CodeLens(range, command));
        }

        return codeLenses;
    }

    private async provideResultFileCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const content = document.getText();
        
        // 使用解析器查找 SQL 结果标记
        const headers = this.resultParser.parseSqlHeaders(content);
        
        for (const header of headers) {
            if (header.type === 'Result') {
                const range = new vscode.Range(
                    header.resultFileLineNumber - 1, 0,
                    header.resultFileLineNumber - 1, document.lineAt(header.resultFileLineNumber - 1).text.length
                );

                const command: vscode.Command = {
                    title: `🔗 跳转到第 ${header.lineNumber} 行`,
                    command: 'sqlResultHint.goToSql',
                    arguments: [header.lineNumber, document.uri.fsPath]
                };

                codeLenses.push(new vscode.CodeLens(range, command));
            }
        }

        return codeLenses;
    }

    private getCodeLensTitle(sqlResult: SqlResult): string {
        switch (sqlResult.type) {
            case 'result':
                return '📊 查看结果';
            case 'error':
                return '❌ 查看错误';
            default:
                return '';
        }
    }

    private getResultFilePath(sqlFilePath: string): string {
        const ext = path.extname(sqlFilePath);
        const baseName = path.basename(sqlFilePath, ext);
        const dir = path.dirname(sqlFilePath);
        return path.join(dir, `${baseName}.result`);
    }

    private async loadSqlResultsMap(document: vscode.TextDocument): Promise<Map<number, SqlResult> | undefined> {
        const filePath = document.uri.fsPath;
        
        // 检查缓存
        if (this.sqlResultsCache.has(filePath)) {
            return this.sqlResultsCache.get(filePath);
        }

        const resultFilePath = this.getResultFilePath(filePath);
        if (!fs.existsSync(resultFilePath)) {
            return undefined;
        }

        try {
            const resultsMap = await this.resultParser.parseResultFile(resultFilePath);
            
            // 缓存结果
            this.sqlResultsCache.set(filePath, resultsMap);
            
            // 清理缓存
            this.cleanupCache();
            
            return resultsMap;
        } catch (error) {
            console.error('Error loading SQL results:', error);
            return undefined;
        }
    }


    private async getSqlResultAtLine(document: vscode.TextDocument, lineNumber: number): Promise<SqlResult | undefined> {
        const resultsMap = await this.loadSqlResultsMap(document);
        if (!resultsMap) {
            return undefined;
        }
        
        return resultsMap.get(lineNumber);
    }


    private findExistingEditor(filePath: string): vscode.TextEditor | undefined {
        return vscode.window.visibleTextEditors.find(editor => 
            editor.document.uri.fsPath === filePath
        );
    }

    async goToResult(sqlResult: SqlResult): Promise<void> {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showErrorMessage('没有活动的编辑器');
                return;
            }

            const sqlFilePath = activeEditor.document.uri.fsPath;
            const resultFilePath = this.getResultFilePath(sqlFilePath);
            
            if (!fs.existsSync(resultFilePath)) {
                vscode.window.showErrorMessage(`结果文件不存在: ${resultFilePath}`);
                return;
            }

            // 查找结果行
            const resultLineNumber = this.resultParser.findResultLineInFile(resultFilePath, sqlResult);
            if (resultLineNumber === -1) {
                vscode.window.showErrorMessage('未找到对应的结果行');
                return;
            }

            // 检查是否已经打开了该文件
            const existingEditor = this.findExistingEditor(resultFilePath);
            if (existingEditor) {
                // 复用已打开的编辑器
                await vscode.window.showTextDocument(existingEditor.document, {
                    viewColumn: existingEditor.viewColumn,
                    preserveFocus: false
                });
                
                // 跳转到指定行
                const position = new vscode.Position(resultLineNumber - 1, 0);
                existingEditor.selection = new vscode.Selection(position, position);
                existingEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            } else {
                // 打开新文件
                const doc = await vscode.workspace.openTextDocument(resultFilePath);
                const editor = await vscode.window.showTextDocument(doc);
                
                // 跳转到指定行
                const position = new vscode.Position(resultLineNumber - 1, 0);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            }
        } catch (error) {
            console.error('Error showing result:', error);
            vscode.window.showErrorMessage(`显示结果时出错: ${error}`);
        }
    }

    async goToSql(resultFilePath: string, lineNumber: number): Promise<void> {
        try {
            // 从 result 文件路径推导出 SQL 文件路径
            const sqlFilePath = resultFilePath.replace('.result', '.sql');
            
            if (!fs.existsSync(sqlFilePath)) {
                vscode.window.showErrorMessage(`SQL 文件不存在: ${sqlFilePath}`);
                return;
            }

            // 检查是否已经打开了该文件
            const existingEditor = this.findExistingEditor(sqlFilePath);
            if (existingEditor) {
                // 复用已打开的编辑器
                await vscode.window.showTextDocument(existingEditor.document, {
                    viewColumn: existingEditor.viewColumn,
                    preserveFocus: false
                });
                
                // 跳转到指定行
                const position = new vscode.Position(lineNumber - 1, 0);
                existingEditor.selection = new vscode.Selection(position, position);
                existingEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            } else {
                // 打开新文件
                const doc = await vscode.workspace.openTextDocument(sqlFilePath);
                const editor = await vscode.window.showTextDocument(doc);
                
                // 跳转到指定行
                const position = new vscode.Position(lineNumber - 1, 0);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            }
        } catch (error) {
            console.error('Error going to SQL:', error);
            vscode.window.showErrorMessage(`跳转到 SQL 文件时出错: ${error}`);
        }
    }


    private cleanupCache(): void {
        if (this.sqlResultsCache.size > this.MAX_CACHE_SIZE) {
            // 删除最旧的缓存项（简单的 FIFO 策略）
            const firstKey = this.sqlResultsCache.keys().next().value;
            if (firstKey) {
                this.sqlResultsCache.delete(firstKey);
            }
        }
    }
}
