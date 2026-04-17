---
name: kb-cook
description: 知识库整理技能优化版 - 支持分类文件夹结构和多级标题组织。重命名为kb-cook以简化使用。
license: MIT
compatibility: opencode
metadata:
  category: productivity
  audience: researchers, writers, students, knowledge workers
  tags: ["knowledge-management", "markdown", "organization", "thematic-analysis", "classification", "hierarchy"]
---

## What I do

我是一个智能知识库整理技能，专门处理个人知识库中的碎片化笔记。我的核心功能包括：

- **主题识别与切分**：基于标题层级识别多个.md文件中的主题
- **自动分类**：基于关键词和内容特征自动将主题分类到相应文件夹
- **内容整合**：将同一主题下的内容整合到一个文件中
- **多级标题组织**：保持原始标题层级，确保知识点按多级标题组织
- **结构化重组**：按分类和主题组织内容，保持清晰的层次结构
- **文件生成**：为每个主题生成独立的、结构化的.md文件，按分类组织在文件夹中

**优化特性**：支持分类文件夹结构和多级标题组织，生成更符合知识管理需求的结构化笔记。

## When to use me

使用此技能的场景：

- 你有多个分散的.md笔记文件需要整理
- 你的知识库内容重复、碎片化，需要系统化组织
- 你想要将笔记按主题重新分类，形成完整的知识体系
- 你需要按技术领域或主题分类组织笔记
- 你需要保持原文内容，不过度精简
- 你想要生成结构清晰、按分类组织的笔记

如果输入目录或文件列表不明确，请先询问澄清。

## How to use me

### 基本使用步骤

1. **确认源目录路径**：包含多个.md笔记文件的目录
2. **确认输出目录**：生成整理后文件的目录
3. **配置处理参数**：主题识别方式、是否去重、是否自动分类等（可选）
4. **执行整理流程**：自动完成主题识别、内容整合、分类和重组
5. **查看结果**：在输出目录中查看按分类组织的.md文件

### 完整工作流示例

```typescript
// 配置参数
const config = {
  // 必需参数
  sourceDir: "/path/to/your/knowledge-base",
  
  // 可选参数
  outputDir: "/path/to/output/organized-knowledge", // 默认：sourceDir + "_organized"
  themeRecognition: "heading", // 主题识别方式："heading"（基于标题）或 "content"（基于内容）
  deduplicate: true, // 是否去重
  preserveCodeBlocks: true, // 是否保留完整代码块
  keepOriginalFormatting: true, // 是否保持原始格式
  excludePatterns: ["draft/*", "temp/*"], // 排除文件模式
};

// 1. 查找所有 .md 文件
const mdFiles = await glob({
  pattern: "**/*.md",
  path: config.sourceDir,
  ignore: ["**/node_modules/**", "**/.git/**", ...config.excludePatterns]
});

// 2. 读取并解析文件内容
const fileContents = [];
for (const filePath of mdFiles) {
  const content = await read({ filePath });
  const parsed = {
    filePath,
    content,
    headings: extractHeadings(content),
    codeBlocks: extractCodeBlocks(content),
    metadata: extractMetadata(content)
  };
  fileContents.push(parsed);
}

// 3. 主题识别（基于标题层级）
const themes = identifyThemesByHeadings(fileContents, {
  method: config.themeRecognition
});

// 4. 内容整合（按主题组织）
const organizedContent = organizeContentByTheme(themes, fileContents, {
  deduplicate: config.deduplicate,
  preserveCodeBlocks: config.preserveCodeBlocks
});

// 5. 生成输出文件
const outputDir = config.outputDir || `${config.sourceDir}_organized`;
await ensureDirectory(outputDir);

// 为每个主题生成文件
for (const theme of organizedContent.themes) {
  const fileName = sanitizeFileName(theme.name) + ".md";
  const filePath = path.join(outputDir, fileName);
  const content = generateThemeFile(theme, {
    template: "practical", // 使用实用模板
    keepOriginalFormatting: config.keepOriginalFormatting
  });
  await write({ filePath, content });
}
```

## 核心算法详解

### 1. 基于标题的主题识别算法

```typescript
/**
 * 基于标题层级识别主题
 */
function identifyThemesByHeadings(parsedFiles, options) {
  const themes = new Map();
  
  for (const file of parsedFiles) {
    // 提取H1和H2标题作为潜在主题
    const mainHeadings = file.headings.filter(h => h.level <= 2);
    
    for (const heading of mainHeadings) {
      const themeName = heading.text.trim();
      
      if (!themes.has(themeName)) {
        themes.set(themeName, {
          name: themeName,
          files: [],
          headings: [],
          content: []
        });
      }
      
      const theme = themes.get(themeName);
      theme.files.push(file.filePath);
      theme.headings.push(heading);
      
      // 提取该标题下的内容
      const sectionContent = extractSectionContent(file.content, heading);
      theme.content.push({
        sourceFile: file.filePath,
        heading: heading,
        content: sectionContent
      });
    }
  }
  
  // 转换为数组并过滤过小的主题
  return Array.from(themes.values())
    .filter(theme => theme.content.length > 0);
}
```

### 2. 内容整合算法

```typescript
/**
 * 按主题整合内容
 */
function organizeContentByTheme(themes, files, options) {
  const organizedThemes = [];
  
  for (const theme of themes) {
    // 合并同一主题下的所有内容
    let mergedContent = "";
    const seenSections = new Set();
    
    for (const section of theme.content) {
      // 去重处理（可选）
      const contentHash = hashContent(section.content);
      if (options.deduplicate && seenSections.has(contentHash)) {
        continue;
      }
      seenSections.add(contentHash);
      
      // 添加来源标记
      mergedContent += `<!-- 来源: ${section.sourceFile} -->\n\n`;
      
      // 添加标题
      mergedContent += `## ${section.heading.text}\n\n`;
      
      // 添加内容（保持原始格式）
      mergedContent += section.content + "\n\n";
    }
    
    organizedThemes.push({
      name: theme.name,
      content: mergedContent,
      sourceFiles: theme.files,
      sectionCount: theme.content.length
    });
  }
  
  return { themes: organizedThemes };
}
```

### 3. 文件生成模板（基于示例文件优化）

```typescript
/**
 * 生成主题文件的模板（基于STM32示例优化）
 */
function generateThemeFile(theme, options) {
  let content = "";
  
  // 1. 添加概述部分（如果主题名适合）
  if (isSuitableForOverview(theme.name)) {
    content += `## 概述\n\n`;
    content += `本文档整合了${theme.name}的相关内容，包含以下关键部分：\n\n`;
    
    // 自动生成要点列表（基于子标题）
    const subHeadings = extractSubHeadings(theme.content);
    for (const heading of subHeadings) {
      content += `- **${heading}**\n`;
    }
    content += `\n---\n\n`;
  }
  
  // 2. 添加主要内容
  content += theme.content;
  
  // 3. 添加参考资料部分（如果有多源文件）
  if (theme.sourceFiles.length > 1) {
    content += `\n---\n\n`;
    content += `## 参考资料\n\n`;
    content += `本文档整合自以下源文件：\n\n`;
    for (const file of theme.sourceFiles) {
      const fileName = path.basename(file);
      content += `- [${fileName}](${file})\n`;
    }
  }
  
  // 4. 添加元信息
  content += `\n---\n\n`;
  content += `**生成时间**: ${new Date().toLocaleString('zh-CN')}  \n`;
  content += `**源文件数**: ${theme.sourceFiles.length}  \n`;
  content += `**章节数**: ${theme.sectionCount}\n`;
  
  return content;
}
```

## Configuration Options

| 选项 | 描述 | 类型 | 默认值 | 示例 |
|------|------|------|--------|------|
| `sourceDir` | 源文件目录（必需） | string | - | `/home/zilo/kb/raw` |
| `outputDir` | 输出目录 | string | `sourceDir + "_organized"` | `/home/zilo/kb/cooking` |
| `themeRecognition` | 主题识别方式 | string | `"heading"` | `"heading"` 或 `"content"` |
| `deduplicate` | 是否去重 | boolean | `true` | `false` |
| `preserveCodeBlocks` | 是否保留完整代码块 | boolean | `true` | `false` |
| `keepOriginalFormatting` | 是否保持原始格式 | boolean | `true` | `false` |
| `excludePatterns` | 排除文件模式 | array | `[]` | `["draft/*", "temp/*"]` |
| `outputTemplate` | 输出模板 | string | `"practical"` | `"practical"` 或 `"minimal"` |

## 输出文件结构（优化版）

整理后的知识库将具有以下分类文件夹结构：

```
organized-knowledge/
├── technology/                    # 技术类
│   ├── STM32开发环境搭建.md       # 主题1：STM32开发环境
│   ├── ARM工具链配置.md           # 主题2：ARM工具链
│   └── VSCode配置指南.md          # 主题3：VSCode配置
├── programming/                   # 编程类
│   ├── Python基础语法.md          # 主题1：Python基础
│   ├── JavaScript异步编程.md      # 主题2：JS异步
│   └── 数据结构与算法.md          # 主题3：数据结构
├── system/                        # 系统类
│   ├── Linux常用命令.md           # 主题1：Linux命令
│   └── Ubuntu系统配置.md          # 主题2：Ubuntu配置
└── general/                       # 通用类
    └── 学习笔记模板.md            # 主题1：笔记模板
```

### 输出文件示例结构（优化版）

基于分类和多级标题组织的优化结构：

```markdown
# STM32开发环境搭建

**分类**: 嵌入式开发与技术工具 (technology)

## 概述

本文档整合了 **STM32开发环境搭建** 的相关内容，包含以下关键知识点：

- **开发环境要求**
- **ARM工具链安装**
- **ST-Link配置**
- **STM32CubeMX安装**
- **VSCode与EIDE插件配置**

---

## 开发环境

### 硬件要求

1. STM32F103ZET6开发板
2. ST-Link V2/V3调试器
...

### 软件要求

- Ubuntu 18.04/20.04/22.04/24.04
- **项目生成**：STM32CubeMX
...

---

## ARM工具链

### 安装ARM交叉编译工具链

```bash
# 更新包列表
sudo apt update
...
```

**代码解释**:
- `sudo apt update`: 更新软件包列表，确保获取最新版本
...

---

## 参考资料

本文档整合自以下源文件：

- Ubuntu_STM32F103ZET6_开发环境配置指南.md
- ARM工具链与ST-Link配置指南.md
- STM32CubeMX_安装笔记.md
- VSCode与EIDE插件配置.md

---

## 文档信息

- **生成时间**: 2025-01-15 14:30:00
- **源文件数**: 4
- **知识点数**: 12
- **分类**: 嵌入式开发与技术工具
- **主题**: STM32开发环境搭建
```

## 优化特性

### 1. 分类文件夹结构
- 自动识别主题内容并分类
- 按分类创建文件夹组织文件
- 支持自定义分类规则

### 2. 多级标题组织
- 保持原始标题层级结构
- 限制标题层级确保可读性
- 自动生成知识结构树

### 3. 智能内容整合
- 基于关键词自动分类
- 保持内容完整性和格式
- 支持去重和内容合并

### 4. 元信息管理
- 记录分类和主题信息
- 添加文档生成统计信息
- 便于知识管理和检索

## 使用示例：STM32环境配置整理

以下是如何使用本技能整理STM32环境配置文件的示例：

```typescript
// 配置STM32环境配置整理
const stm32Config = {
  sourceDir: "/home/zilo/kb/raw",
  outputDir: "/home/zilo/kb/cooking/optimized",
  themeRecognition: "heading",
  deduplicate: true,
  preserveCodeBlocks: true,
  keepOriginalFormatting: true,
  autoClassify: true,
  excludePatterns: []
};

// 执行整理
await organizeKnowledgeBaseOptimized(stm32Config);

// 结果将生成类似以下文件结构：
// /home/zilo/kb/cooking/optimized/technology/STM32开发环境搭建.md
// /home/zilo/kb/cooking/optimized/technology/ARM工具链配置.md
// /home/zilo/kb/cooking/optimized/technology/VSCode配置指南.md
```

## 高级功能

### 1. 自定义分类规则
支持自定义分类关键词和描述，适应不同知识领域。

### 2. 标题层级优化
自动优化标题层级，确保结构清晰。

### 3. 增量更新
支持只处理新增或修改的文件，提高处理效率。

### 4. 内容验证
验证标题层级完整性和内容结构。

## 错误处理

技能包含完善的错误处理机制：

- **文件读取错误**：跳过无法读取的文件并记录日志
- **解析错误**：尝试恢复解析，标记问题内容
- **输出目录冲突**：自动重命名或询问用户
- **内存限制**：分批处理大型文件集

## 性能优化

- 使用流式处理处理大型文件
- 并行处理多个文件
- 缓存中间结果避免重复计算
- 增量更新支持

---

**使用提示**：首次使用时建议先用小规模文件测试，调整参数后再处理完整知识库。基于示例文件优化的模板更适合技术文档和教程类内容的整理。