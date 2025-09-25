import * as fs from 'fs';

export interface SqlResult {
    lineNumber: number;
    sqlLength: number;
    sqlContent: string;
    type: 'result' | 'error' | 'empty';
    resultContent?: string;
    errorContent?: string;
    metadata: {
        resultLength?: number;
        errorLength?: number;
        headerLength?: number;
        rowLengths?: number[];
    };
}

export class ResultFileParser {
    /**
     * 解析 result 文件，返回 SQL 结果映射
     * @param filePath result 文件路径
     * @returns Map<行号, SqlResult>
     */
    async parseResultFile(filePath: string): Promise<Map<number, SqlResult>> {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Result file not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const resultsMap = new Map<number, SqlResult>();
        
        // 查找 SQL 结果
        const sqlRegex = /#SQL\[@(\d+),N(\d+)\](Result|Error)\[([^\]]*)\]/g;
        let match;
        
        while ((match = sqlRegex.exec(content)) !== null) {
            const lineNumber = parseInt(match[1]);
            const sqlLength = parseInt(match[2]);
            const type = match[3];
            const info = match[4];
            
            // 提取结果内容
            const sectionContent = this.extractSectionContent(content, match.index, sqlRegex);
            const { sqlContent, remainingContent } = this.extractSqlContent(sectionContent, sqlLength);
            
            if (type === 'Result') {
                const metadata = this.parseResultMetadata(info);
                const resultContent = remainingContent.trim();
                
                resultsMap.set(lineNumber, {
                    lineNumber,
                    sqlLength,
                    sqlContent,
                    type: resultContent ? 'result' : 'empty',
                    resultContent,
                    errorContent: undefined,
                    metadata
                });
            } else if (type === 'Error') {
                const metadata = this.parseErrorMetadata(info);
                const errorContent = remainingContent.trim();
                
                resultsMap.set(lineNumber, {
                    lineNumber,
                    sqlLength,
                    sqlContent,
                    type: 'error',
                    resultContent: undefined,
                    errorContent,
                    metadata
                });
            }
        }
        
        return resultsMap;
    }

    /**
     * 在 result 文件中查找指定 SQL 结果的行号
     * @param resultFilePath result 文件路径
     * @param sqlResult SQL 结果对象
     * @returns 行号（1-based），未找到返回 -1
     */
    findResultLineInFile(resultFilePath: string, sqlResult: SqlResult): number {
        try {
            const content = fs.readFileSync(resultFilePath, 'utf8');
            const lines = content.split('\n');
            
            // 查找对应的 SQL 结果标记
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const match = line.match(/#SQL\[@(\d+),N(\d+)\](Result|Error)\[/);
                if (match) {
                    const resultLineNumber = parseInt(match[1]);
                    if (resultLineNumber === sqlResult.lineNumber) {
                        return i + 1; // 返回 1-based 行号
                    }
                }
            }
            
            return -1;
        } catch (error) {
            console.error('Error finding result line:', error);
            return -1;
        }
    }

    /**
     * 解析 result 文件中的 SQL 结果标记，用于生成 codelens
     * @param content result 文件内容
     * @returns SQL 结果信息数组
     */
    parseSqlHeaders(content: string): Array<{ lineNumber: number; sqlLength: number; type: string; resultFileLineNumber: number }> {
        const headers: Array<{ lineNumber: number; sqlLength: number; type: string; resultFileLineNumber: number }> = [];
        const lines = content.split('\n');
        const sqlRegex = /#SQL\[@(\d+),N(\d+)\](Result|Error)\[([^\]]*)\]/;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(sqlRegex);
            if (match) {
                const lineNumber = parseInt(match[1]); // 测试文件中对应的 SQL 行号
                const sqlLength = parseInt(match[2]);
                const type = match[3];
                const resultFileLineNumber = i + 1; // result 文件中 SQL 标记所在的行号（1-based）
                
                headers.push({ lineNumber, sqlLength, type, resultFileLineNumber });
            }
        }
        
        return headers;
    }

    /**
     * 提取 SQL 结果段的内容
     * @param content 文件内容
     * @param startIndex 开始位置
     * @param regex 正则表达式
     * @returns 段内容
     */
    private extractSectionContent(content: string, startIndex: number, regex: RegExp): string {
        const nextMatch = regex.exec(content);
        const endIndex = nextMatch ? nextMatch.index : content.length;
        regex.lastIndex = nextMatch ? nextMatch.index : content.length;
        return content.substring(startIndex, endIndex);
    }

    /**
     * 从段内容中提取 SQL 内容和剩余内容
     * @param sectionContent 段内容
     * @param sqlLength SQL 长度
     * @returns SQL 内容和剩余内容
     */
    private extractSqlContent(sectionContent: string, sqlLength: number): { sqlContent: string; remainingContent: string } {
        const firstNewlineIndex = sectionContent.indexOf('\n');
        if (firstNewlineIndex === -1) {
            return { sqlContent: '', remainingContent: '' };
        }
        
        let content = sectionContent.substring(firstNewlineIndex + 1);
        content = this.trimLeadingEmptyLines(content);
        
        if (sqlLength > 0) {
            return {
                sqlContent: content.substring(0, sqlLength).trim(),
                remainingContent: content.substring(sqlLength+2 /*去除尾部分号和换行*/ )
            };
        }
        
        return { sqlContent: content.trim(), remainingContent: '' };
    }

    /**
     * 去除内容开头的空行
     * @param content 内容
     * @returns 处理后的内容
     */
    private trimLeadingEmptyLines(content: string): string {
        let startIndex = 0;
        while (startIndex < content.length && content[startIndex] === '\n') {
            startIndex++;
        }
        return content.substring(startIndex);
    }

    /**
     * 解析结果元数据
     * @param info 信息字符串
     * @returns 元数据对象
     */
    private parseResultMetadata(info: string): SqlResult['metadata'] {
        if (!info) {
            return {};
        }
        
        const parts = info.split(',').map(p => p.trim()).filter(p => p);
        if (parts.length === 0) {
            return {};
        }
        
        const headerLength = parseInt(parts[0]) || 0;
        const rowLengths = parts.slice(1).map(p => parseInt(p) || 0);
        const resultLength = 1 + rowLengths.length; // 1 for header + data rows
        
        return {
            resultLength: resultLength > 1 ? resultLength : undefined,
            headerLength: headerLength > 0 ? headerLength : undefined,
            rowLengths: rowLengths.length > 0 ? rowLengths : undefined
        };
    }

    /**
     * 解析错误元数据
     * @param info 信息字符串
     * @returns 元数据对象
     */
    private parseErrorMetadata(info: string): SqlResult['metadata'] {
        if (!info) {
            return {};
        }
        
        const parts = info.split(',').map(p => p.trim()).filter(p => p);
        if (parts.length === 0) {
            return {};
        }
        
        const errorLength = parseInt(parts[0]) || 0;
        
        return {
            errorLength: errorLength > 0 ? errorLength : undefined
        };
    }
}
