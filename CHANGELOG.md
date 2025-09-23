# 更新日志

所有重要的项目更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且此项目遵循 [语义化版本](https://semver.org/spec/v2.0.0.html)。

## [未发布]

### 计划中
- 支持更多数据库类型
- 添加语法高亮
- 支持自定义主题
- 添加单元测试

## [0.1.0] - 2024-01-XX

### 新增
- 🎉 初始版本发布
- 🔍 基础悬停提示功能
  - 在 SQL 文件上悬停显示对应的结果信息
  - 支持表格格式的结果显示
  - 支持错误信息的显示
- 🔗 文件关联功能
  - 自动关联 `.sql` 和 `.result` 文件
  - 基于文件名的智能匹配
- ⚡ 快速导航命令
  - `sqlResultHint.goToResult` - 跳转到结果文件
  - `sqlResultHint.goToSql` - 跳转到 SQL 文件
- ⚙️ 配置选项
  - `sqlResultHint.enabled` - 启用/禁用扩展
  - `sqlResultHint.showErrorHints` - 显示错误提示
  - `sqlResultHint.goToResultHints` - 显示结果提示
- 🎨 用户界面
  - 右键菜单集成
  - 命令面板支持
  - 图标和主题支持

### 技术细节
- 使用 TypeScript 开发
- 支持 VS Code 1.74.0+
- 优化的缓存机制
- 高性能文件解析

### 文档
- 完整的 README.md
- 使用示例和配置说明
- 开发指南

---

## 版本说明

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

## 符号说明

- ✨ 新功能
- 🐛 问题修复
- 💄 界面优化
- ⚡ 性能优化
- 🔧 配置变更
- 📝 文档更新
- 🎨 代码重构
- 🚀 发布相关
