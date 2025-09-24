# SQL Result Hint

一个 VS Code 扩展，为 SQL 文件提供结果提示功能。当你在 SQL 文件上悬停时，会显示对应的查询结果或错误信息。

## ✨ 功能

- 🔍 在 SQL 文件上悬停显示对应的结果信息
- 🔗 自动关联 `.sql` 和 `.result` 文件
- ⚡ 快速跳转到对应的 SQL 文件或结果文件
- 🎯 显示 SQL 执行时的错误信息和行号

## 📦 安装

1. 打开 VS Code
2. 按 `Ctrl+Shift+P` 打开扩展面板
3. 搜索 "Install from VSIX"
4. 选择 `sql-result-hint-0.1.0.vsix` 文件并点击安装

## 🚀 使用方法

1. 📝 创建 `.sql` 文件并编写 SQL 查询
2. 🔧 使用 `mo-tester` 创建对应的 `.result` 文件，包含查询结果
3. 🖱️ 在 SQL 文件上悬停鼠标，即可看到结果提示

## 📁 文件结构

```
project/
├── query.sql          # SQL 查询文件
├── query.result       # 对应的结果文件
└── ...
```

## 💡 使用示例

### 基本用法

**query.sql**
```sql
select 
    current_account_name(),
    current_account_id()
;
```

**query.result**
```
#SQL[@16,N61]Result[48, 10]
select 
    current_account_name(),
    current_account_id()

current_account_name()  ¦  current_account_id()
sys  ¦  0
```

当你在 `query.sql` 文件上悬停时，会显示对应的结果表格。


## 🛠️ 开发

### 环境要求

- 📦 Node.js >= 16.x
- 🔧 VS Code >= 1.74.0
- 📝 TypeScript >= 4.9.4

### 本地开发

1. 📥 克隆仓库
```bash
git clone https://github.com/aptend/sql-result-hint.git
cd sql-result-hint
```

2. 📦 安装依赖
```bash
npm install
```

3. 🔨 编译项目
```bash
npm run compile
```

4. 🚀 在 VS Code 中按 F5 启动调试

### 构建

```bash
# 编译
npm run compile

# 打包
vsce package
```

## 📄 许可证

本项目采用 MIT 许可证。

## 💬 支持

如果你遇到任何问题或有建议，请提交 Issue。
