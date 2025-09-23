# SQL Result Hint

一个 VS Code 扩展，为 SQL 文件提供结果提示功能。当你在 SQL 文件上悬停时，会显示对应的查询结果或错误信息。

## 功能

- 在 SQL 文件上悬停显示对应的结果信息
- 自动关联 `.sql` 和 `.result` 文件
- 快速跳转到对应的 SQL 文件或结果文件
- 显示 SQL 执行时的错误信息和行号
- 支持多种配置选项

## 安装

1. 打开 VS Code
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索 "SQL Result Hint"
4. 点击安装

## 使用方法

1. 创建 `.sql` 文件并编写 SQL 查询
2. 创建对应的 `.result` 文件，包含查询结果
3. 在 SQL 文件上悬停鼠标，即可看到结果提示
4. 右键点击文件，选择相应的导航命令

## 文件结构

```
project/
├── query.sql          # SQL 查询文件
├── query.result       # 对应的结果文件
└── ...
```

## 配置选项

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `sqlResultHint.enabled` | boolean | true | 启用 SQL 结果提示功能 |
| `sqlResultHint.showErrorHints` | boolean | true | 显示错误行提示 |
| `sqlResultHint.goToResultHints` | boolean | true | 显示结果提示 |

## 使用示例

### 基本用法

**query.sql**
```sql
SELECT id, name, email 
FROM users 
WHERE status = 'active'
LIMIT 10;
```

**query.result**
```
id | name     | email
---|----------|------------------
1  | John     | john@example.com
2  | Jane     | jane@example.com
3  | Bob      | bob@example.com
```

当你在 `query.sql` 文件上悬停时，会显示对应的结果表格。

### 错误提示

**error.sql**
```sql
SELECT * FROM non_existent_table;
```

**error.result**
```
ERROR: relation "non_existent_table" does not exist
LINE 1: SELECT * FROM non_existent_table;
                      ^
```

悬停时会显示错误信息和位置。

## 开发

### 环境要求

- Node.js >= 16.x
- VS Code >= 1.74.0
- TypeScript >= 4.9.4

### 本地开发

1. 克隆仓库
```bash
git clone https://github.com/aptend/sql-result-hint.git
cd sql-result-hint
```

2. 安装依赖
```bash
npm install
```

3. 编译项目
```bash
npm run compile
```

4. 在 VS Code 中按 F5 启动调试

### 构建

```bash
# 编译
npm run compile

# 打包
vsce package
```

## 更新日志

### v0.1.0
- 初始版本发布
- 基础悬停提示功能
- 文件关联功能
- 快速导航命令
- 基础配置选项

## 许可证

本项目采用 MIT 许可证。

## 支持

如果你遇到任何问题或有建议，请提交 Issue。
