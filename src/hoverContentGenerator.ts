import * as vscode from 'vscode';
import { SqlResult } from './resultFileParser';

export class HoverContentGenerator {
    /**
     * 创建悬停内容
     * @param sqlResult SQL 结果对象
     * @param config VS Code 配置
     * @returns MarkdownString 或 undefined
     */
    createHoverContent(sqlResult: SqlResult, config: vscode.WorkspaceConfiguration): vscode.MarkdownString | undefined {
        const markdown = new vscode.MarkdownString();
        let hasContent = false;

        markdown.supportHtml = true;
        markdown.isTrusted = true;

        // 显示结果或错误内容
        if (config.get('goToResultHints', true)) {
            if (sqlResult.type === 'result' && sqlResult.resultContent) {
                // 解析表格数据并生成 Markdown 表格
                const cellData = this.extractCellData(sqlResult.resultContent, sqlResult.metadata);
                if (cellData.length > 0) {
                    const tableMarkdown = this.generateTableMarkdownFromCellData(cellData);
                    markdown.appendMarkdown(tableMarkdown);
                    hasContent = true;
                } else {
                    markdown.appendMarkdown(`\n预期结果:\n`);
                    markdown.appendCodeblock(sqlResult.resultContent, 'text');
                    hasContent = true;
                }
            } else if (sqlResult.type === 'error' && sqlResult.errorContent) {
                markdown.appendMarkdown(`\n预期错误:\n`);
                markdown.appendCodeblock(sqlResult.errorContent, 'text');
                hasContent = true;
            } else if (sqlResult.type === 'empty') {
                markdown.appendMarkdown(`\n预期结果: 空\n`);
                hasContent = true;
            }
        }

        return hasContent ? markdown : undefined;
    }

    /**
     * 从结果内容中提取单元格数据，形成二维数组结构
     * @param resultContent 结果内容
     * @param metadata 元数据
     * @returns 二维字符串数组，类似 Vec<Vec<string>>
     */
    extractCellData(resultContent: string, metadata: SqlResult['metadata']): string[][] {
        if (!resultContent || !resultContent.trim()) {
            return [];
        }

        const cellData: string[][] = [];
        
        // 使用 metadata 中的长度信息来分割每行
        if (metadata.headerLength && metadata.rowLengths) {
            const buffer = Buffer.from(resultContent, 'utf8');
            const allLengths = [metadata.headerLength, ...metadata.rowLengths];
            let currentBytePos = 0;
            
            for (const byteLength of allLengths) {
                if (currentBytePos + byteLength <= buffer.length) {
                    // 根据字节长度提取内容
                    const lineBytes = buffer.subarray(currentBytePos, currentBytePos + byteLength);
                    const line = lineBytes.toString('utf8');
                    
                    if (line) {
                        // 使用 ¦ 分割每行
                        const cells = line.split('  ¦  ');
                        if (cells.length > 0) {
                            cellData.push(cells);
                        }
                    }
                    // 移动到下一行
                    currentBytePos += byteLength;
                    if (currentBytePos < buffer.length && buffer[currentBytePos] === 0x0A/*\n*/) {
                        currentBytePos++;
                    }
                }
            }
        }

        return cellData;
    }

    /**
     * 从单元格数据生成 HTML 表格
     * @param cellData 单元格数据
     * @returns HTML 表格字符串
     */
    public generateTableMarkdownFromCellData(cellData: string[][]): string {
        if (cellData.length === 0) {
            return '*无数据*';
        }
        
        const headers = cellData[0] || [];
        const rows = cellData.slice(1);
        
        if (headers.length === 0) {
            return '*无数据*';
        }
        
        let html = '';
        
        // 生成简洁的 HTML 表格
        html += '<table border="1" cellpadding="8" cellspacing="0">\n';
        html += '<thead>\n';
        html += '<tr>\n';
        headers.forEach(header => {
            html += `<th bgcolor="#f0f0f0">${this.escapeHtml(header)}</th>\n`;
        });
        html += '</tr>\n';
        html += '</thead>\n';
        html += '<tbody>\n';
        
        rows.forEach(row => {
            html += '<tr>\n';
            row.forEach(cell => {
                if (cell.includes('\n')) {
                    // 多行内容使用 <pre> 标签，禁止自动换行
                    const escaped = this.escapeHtml(cell);
                    html += `<td><pre style="white-space: pre; overflow-x: auto;">${escaped}</pre></td>\n`;
                } else {
                    // 单行内容直接显示
                    html += `<td>${this.escapeHtml(cell)}</td>\n`;
                }
            });
            html += '</tr>\n';
        });
        
        html += '</tbody>\n';
        html += '</table>';
        
        return html;
    }

    /**
     * 转义 HTML 特殊字符
     * @param text 文本
     * @returns 转义后的文本
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, '<br>');
    }

    /**
     * 转义 Markdown 特殊字符
     * @param text 文本
     * @returns 转义后的文本
     */
    private escapeMarkdown(text: string): string {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/\|/g, '\\|')
            .replace(/\*/g, '\\*')
            .replace(/_/g, '\\_')
            .replace(/`/g, '\\`')
            .replace(/#/g, '\\#')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

}
