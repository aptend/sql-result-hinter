import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

// 复制解析逻辑到测试文件中，避免 vscode 依赖
interface SqlResult {
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

function parseResultFile(content: string): SqlResult[] {
    const results: SqlResult[] = [];
    
    // 使用正则表达式匹配所有 #SQL 标记
    const sqlRegex = /#SQL\[@(\d+),N(\d+)\](Result|Error)\[([^\]]*)\]/g;
    let match;
    
    while ((match = sqlRegex.exec(content)) !== null) {
        const lineNumber = parseInt(match[1]);
        const length = parseInt(match[2]);
        const type = match[3];
        const info = match[4];
        
        // 找到下一个 #SQL 标记的位置，或者到文件末尾
        const nextMatch = sqlRegex.exec(content);
        const sectionEnd = nextMatch ? nextMatch.index : content.length;
        sqlRegex.lastIndex = nextMatch ? nextMatch.index : content.length;
        
        // 提取当前段落的内容（从当前匹配开始到下一个匹配或文件末尾）
        const sectionContent = content.substring(match.index, sectionEnd);
        
        if (type === 'Result') {
            // 解析结果信息
            let headerLength = 0;
            let rowLengths: number[] = [];
            let totalResultLength = 0;
            
            if (info) {
                const parts = info.split(',').map(p => p.trim()).filter(p => p);
                if (parts.length > 0) {
                    headerLength = parseInt(parts[0]) || 0;
                    rowLengths = parts.slice(1).map(p => parseInt(p) || 0);
                    totalResultLength = 1 + rowLengths.length;
                }
            }
            
            // 提取 SQL 语句和结果内容
            const { sqlContent, resultContent } = extractSqlAndResult(sectionContent, totalResultLength);
            
            results.push({
                lineNumber,
                sqlLength: length,
                sqlContent,
                type: resultContent ? 'result' : 'empty',
                resultContent: resultContent || undefined,
                metadata: {
                    resultLength: totalResultLength > 1 ? totalResultLength : undefined,
                    headerLength: headerLength > 0 ? headerLength : undefined,
                    rowLengths: rowLengths.length > 0 ? rowLengths : undefined
                }
            });
            
        } else if (type === 'Error') {
            const errorLength = parseInt(info) || 0;
            
            // 提取 SQL 语句和错误内容
            const { sqlContent, errorContent } = extractSqlAndError(sectionContent, errorLength);
            
            results.push({
                lineNumber,
                sqlLength: length,
                sqlContent,
                type: errorContent ? 'error' : 'empty',
                errorContent: errorContent || undefined,
                metadata: {
                    errorLength: errorLength > 0 ? errorLength : undefined
                }
            });
        }
    }

    return results;
}

function extractSqlAndResult(sectionContent: string, totalResultLength: number): { sqlContent: string, resultContent: string } {
    // 找到第一个换行符后的内容
    const firstNewlineIndex = sectionContent.indexOf('\n');
    if (firstNewlineIndex === -1) {
        return { sqlContent: '', resultContent: '' };
    }
    
    let content = sectionContent.substring(firstNewlineIndex + 1);
    
    // 跳过开头的空行
    while (content.startsWith('\n')) {
        content = content.substring(1);
    }
    
    if (totalResultLength === 0) {
        // 没有结果内容，整个内容都是 SQL 语句
        return { sqlContent: content.trim(), resultContent: '' };
    }
    
    // 基于长度信息解析：SQL 语句长度在标记的 N 字段中
    // 从 #SQL[@lineNumber,Nlength] 中提取 length
    const headerMatch = sectionContent.match(/#SQL\[@\d+,N(\d+)\]/);
    const sqlLength = headerMatch ? parseInt(headerMatch[1]) : 0;
    
    let sqlContent = '';
    let resultContent = '';
    
    if (sqlLength > 0) {
        // 基于 SQL 长度提取 SQL 语句
        sqlContent = content.substring(0, sqlLength).trim();
        resultContent = content.substring(sqlLength).trim();
    } else {
        // 如果没有长度信息，尝试基于空行分隔符
        const emptyLineIndex = content.indexOf('\n\n');
        if (emptyLineIndex !== -1) {
            sqlContent = content.substring(0, emptyLineIndex).trim();
            resultContent = content.substring(emptyLineIndex + 2).trim();
        } else {
            // 没有空行分隔符，SQL 语句只有第一行
            const firstLineEnd = content.indexOf('\n');
            if (firstLineEnd !== -1) {
                sqlContent = content.substring(0, firstLineEnd).trim();
                resultContent = content.substring(firstLineEnd + 1).trim();
            } else {
                sqlContent = content.trim();
            }
        }
    }
    
    return { sqlContent, resultContent };
}

function extractSqlAndError(sectionContent: string, errorLength: number): { sqlContent: string, errorContent: string } {
    // 找到第一个换行符后的内容
    const firstNewlineIndex = sectionContent.indexOf('\n');
    if (firstNewlineIndex === -1) {
        return { sqlContent: '', errorContent: '' };
    }
    
    let content = sectionContent.substring(firstNewlineIndex + 1);
    
    // 跳过开头的空行
    while (content.startsWith('\n')) {
        content = content.substring(1);
    }
    
    if (errorLength === 0) {
        // 没有错误内容，整个内容都是 SQL 语句
        return { sqlContent: content.trim(), errorContent: '' };
    }
    
    // 基于长度信息解析：SQL 语句长度在标记的 N 字段中
    // 从 #SQL[@lineNumber,Nlength] 中提取 length
    const headerMatch = sectionContent.match(/#SQL\[@\d+,N(\d+)\]/);
    const sqlLength = headerMatch ? parseInt(headerMatch[1]) : 0;
    
    let sqlContent = '';
    let errorContent = '';
    
    if (sqlLength > 0) {
        // 基于 SQL 长度提取 SQL 语句
        sqlContent = content.substring(0, sqlLength).trim();
        errorContent = content.substring(sqlLength).trim();
    } else {
        // 如果没有长度信息，尝试基于空行分隔符
        const emptyLineIndex = content.indexOf('\n\n');
        if (emptyLineIndex !== -1) {
            sqlContent = content.substring(0, emptyLineIndex).trim();
            errorContent = content.substring(emptyLineIndex + 2).trim();
        } else {
            // 没有空行分隔符，SQL 语句只有第一行
            const firstLineEnd = content.indexOf('\n');
            if (firstLineEnd !== -1) {
                sqlContent = content.substring(0, firstLineEnd).trim();
                errorContent = content.substring(firstLineEnd + 1).trim();
            } else {
                sqlContent = content.trim();
            }
        }
    }
    
    return { sqlContent, errorContent };
}

describe('SQL Result Parser', () => {
    describe('parseResultFile', () => {
        it('should parse test_basic.result correctly', () => {
            const content = fs.readFileSync(path.join(__dirname, '../../cases/test_basic.result'), 'utf8');
            const results = parseResultFile(content);

            assert.strictEqual(results.length, 2);

            // Test first result
            const result1 = results[0];
            assert.strictEqual(result1.lineNumber, 2);
            assert.strictEqual(result1.type, 'result');
            assert.strictEqual(result1.sqlContent, 'SELECT 1 as test_value');
            assert.strictEqual(result1.resultContent, 'test_value\n1');
            assert.strictEqual(result1.metadata.resultLength, 2);
            assert.strictEqual(result1.metadata.headerLength, 10);
            assert.deepStrictEqual(result1.metadata.rowLengths, [1]);

            // Test second result
            const result2 = results[1];
            assert.strictEqual(result2.lineNumber, 5);
            assert.strictEqual(result2.type, 'result');
            assert.strictEqual(result2.sqlContent, 'SELECT \'Hello World\' as message');
            assert.strictEqual(result2.resultContent, 'message\nHello World');
            assert.strictEqual(result2.metadata.resultLength, 2);
            assert.strictEqual(result2.metadata.headerLength, 7);
            assert.deepStrictEqual(result2.metadata.rowLengths, [11]);
        });

        it('should parse test_advanced.result correctly', () => {
            const content = fs.readFileSync(path.join(__dirname, '../../cases/test_advanced.result'), 'utf8');
            const results = parseResultFile(content);

            assert.strictEqual(results.length, 3);

            // Test first result (CREATE TABLE)
            const result1 = results[0];
            assert.strictEqual(result1.lineNumber, 2);
            assert.strictEqual(result1.type, 'empty');
            assert.strictEqual(result1.sqlContent, 'CREATE TABLE test_table (\n    id INT PRIMARY KEY,\n    name VARCHAR(100)\n)');
            assert.strictEqual(result1.metadata.resultLength, undefined);

            // Test second result (INSERT)
            const result2 = results[1];
            assert.strictEqual(result2.lineNumber, 7);
            assert.strictEqual(result2.type, 'empty');
            assert.strictEqual(result2.sqlContent, 'INSERT INTO test_table VALUES (1, \'Alice\'), (2, \'Bob\')');
            assert.strictEqual(result2.metadata.resultLength, undefined);

            // Test third result (SELECT with results)
            const result3 = results[2];
            assert.strictEqual(result3.lineNumber, 9);
            assert.strictEqual(result3.type, 'result');
            assert.strictEqual(result3.sqlContent, 'SELECT * FROM test_table');
            assert.strictEqual(result3.resultContent, 'id  ¦  name\n1  ¦  Alice\n2  ¦  Bob');
            assert.strictEqual(result3.metadata.resultLength, 3);
            assert.strictEqual(result3.metadata.headerLength, 12);
            assert.deepStrictEqual(result3.metadata.rowLengths, [12, 10]);
        });

        it('should parse improved.result correctly', () => {
            const content = fs.readFileSync(path.join(__dirname, '../../cases/improved.result'), 'utf8');
            const results = parseResultFile(content);

            assert.strictEqual(results.length, 26);

            // Test first result (create database)
            const result1 = results[0];
            assert.strictEqual(result1.lineNumber, 1);
            assert.strictEqual(result1.type, 'empty');
            assert.strictEqual(result1.sqlContent, 'create database if not exists db');
            assert.strictEqual(result1.metadata.resultLength, undefined);

            // Test error result
            const errorResult = results[4];
            assert.strictEqual(errorResult.lineNumber, 9);
            assert.strictEqual(errorResult.type, 'error');
            assert.strictEqual(errorResult.sqlContent, 'insert into t values (1, 1), (1, 1), (2, 2)');
            assert.strictEqual(errorResult.errorContent, '1062 (HY000): Duplicate entry \'(1,1)\' for key \'(a,b)\'');
            assert.strictEqual(errorResult.metadata.errorLength, 53);

            // Test complex result with JSON
            const complexResult = results[5];
            assert.strictEqual(complexResult.lineNumber, 12);
            assert.strictEqual(complexResult.type, 'result');
            assert.strictEqual(complexResult.sqlContent, 'select mo_ctl(\'dn\', \'flush\', \'db.t\')');
            assert.strictEqual(complexResult.resultContent, 'mo_ctl(dn, flush, db.t)\n{\n  "method": "Flush",\n  "result": [\n    {\n      "returnStr": "OK"\n    }\n  ]\n}');
            assert.strictEqual(complexResult.metadata.resultLength, 2);
            assert.strictEqual(complexResult.metadata.headerLength, 23);
            assert.deepStrictEqual(complexResult.metadata.rowLengths, [79]);

            // Test multiline SQL
            const multilineResult = results[7];
            assert.strictEqual(multilineResult.lineNumber, 16);
            assert.strictEqual(multilineResult.type, 'result');
            assert.strictEqual(multilineResult.sqlContent, 'select \n    current_account_name(),\n    current_account_id()');
            assert.strictEqual(multilineResult.resultContent, 'current_account_name()  ¦  current_account_id()\nsys  ¦  0');
            assert.strictEqual(multilineResult.metadata.resultLength, 2);
            assert.strictEqual(multilineResult.metadata.headerLength, 48);
            assert.deepStrictEqual(multilineResult.metadata.rowLengths, [10]);
        });

        it('should handle empty result files', () => {
            const results = parseResultFile('');
            assert.strictEqual(results.length, 0);
        });

        it('should handle files with only comments', () => {
            const content = '# This is a comment\n# Another comment';
            const results = parseResultFile(content);
            assert.strictEqual(results.length, 0);
        });
    });

    describe('extractSqlAndResult', () => {
        it('should extract SQL and result content correctly', () => {
            const sectionContent = `#SQL[@2,N22]Result[10, 1]
SELECT 1 as test_value
test_value
1`;

            const { sqlContent, resultContent } = extractSqlAndResult(sectionContent, 2);
            
            assert.strictEqual(sqlContent, 'SELECT 1 as test_value');
            assert.strictEqual(resultContent, 'test_value\n1');
        });

        it('should handle SQL without results', () => {
            const sectionContent = `#SQL[@1,N32]Result[]
create database if not exists db`;

            const { sqlContent, resultContent } = extractSqlAndResult(sectionContent, 0);
            
            assert.strictEqual(sqlContent, 'create database if not exists db');
            assert.strictEqual(resultContent, '');
        });

        it('should handle multiline SQL with results', () => {
            const sectionContent = `#SQL[@16,N61]Result[48, 10]
select 
    current_account_name(),
    current_account_id()

current_account_name()  ¦  current_account_id()
sys  ¦  0`;

            const { sqlContent, resultContent } = extractSqlAndResult(sectionContent, 2);
            
            assert.strictEqual(sqlContent, 'select \n    current_account_name(),\n    current_account_id()');
            assert.strictEqual(resultContent, 'current_account_name()  ¦  current_account_id()\nsys  ¦  0');
        });
    });

    describe('extractSqlAndError', () => {
        it('should extract SQL and error content correctly', () => {
            const sectionContent = `#SQL[@9,N43]Error[53]
insert into t values (1, 1), (1, 1), (2, 2)
1062 (HY000): Duplicate entry '(1,1)' for key '(a,b)'`;

            const { sqlContent, errorContent } = extractSqlAndError(sectionContent, 53);
            
            assert.strictEqual(sqlContent, 'insert into t values (1, 1), (1, 1), (2, 2)');
            assert.strictEqual(errorContent, '1062 (HY000): Duplicate entry \'(1,1)\' for key \'(a,b)\'');
        });

        it('should handle SQL without errors', () => {
            const sectionContent = `#SQL[@1,N32]Error[]
create database if not exists db`;

            const { sqlContent, errorContent } = extractSqlAndError(sectionContent, 0);
            
            assert.strictEqual(sqlContent, 'create database if not exists db');
            assert.strictEqual(errorContent, '');
        });
    });
});
