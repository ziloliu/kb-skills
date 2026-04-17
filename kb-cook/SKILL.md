---
name: kb-cook
description: 知识库整理技能 - 将碎片化.md笔记按主题切分、知识点划分、去重重组，支持图片处理。重命名为kb-cook以简化使用。
license: MIT
compatibility: opencode
metadata:
  category: productivity
  audience: researchers, writers, students, knowledge workers
  tags: ["knowledge-management", "markdown", "organization", "thematic-analysis", "image-processing"]
---

## What I do

我是一个智能知识库整理技能，专门处理个人知识库中的碎片化笔记。我的核心功能包括：

- **主题识别与切分**：基于标题层级识别多个.md文件中的主题
- **内容整合**：将同一主题下的内容整合到一个文件中
- **保持原文**：不过度精简，保留原始内容的完整性和细节
- **结构化重组**：按主题组织内容，保持清晰的层次结构
- **文件生成**：为每个主题生成独立的、结构化的.md文件
- **图片处理**：自动识别、重命名和保存Markdown中的图片，保持图片在文档中的位置

**特别优化**：基于 `/home/zilo/kb/cooking/stm32/STM32开发环境搭建.md` 示例文件的结构和用户习惯进行优化，生成更符合实际使用需求的笔记。

**新增图片处理功能**：
1. 自动识别Markdown文件中的图片引用
2. 将图片保存到本地指定目录 (`/home/zilo/kb/imgs`)
3. 按照分类-主题-知识点-编号重新命名图片
4. 更新Markdown中的图片路径，保持文档完整性

## When to use me

使用此技能的场景：

- 你有多个分散的.md笔记文件需要整理
- 你的知识库内容重复、碎片化，需要系统化组织
- 你想要将笔记按主题重新分类，形成完整的知识体系
- 你需要保持原文内容，不过度精简
- 你想要生成类似示例文件的结构化笔记
- **你的笔记中包含图片，需要统一管理和重命名**

如果输入目录或文件列表不明确，请先询问澄清。

## How to use me

### 基本使用步骤

1. **确认源目录路径**：包含多个.md笔记文件的目录
2. **确认输出目录**：生成整理后文件的目录
3. **配置处理参数**：主题识别方式、是否去重、图片处理选项等（可选）
4. **执行整理流程**：自动完成主题识别、内容整合、图片处理和重组
5. **查看结果**：在输出目录中查看按主题组织的.md文件，在图片目录查看重命名的图片

### 完整工作流示例（支持图片处理）

```typescript
// 配置参数（增强版，支持图片处理）
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
  
  // 图片处理配置（新增）
  processImages: true, // 是否处理图片
  imageBaseDir: "/home/zilo/kb/imgs", // 图片保存目录
  imageNamingPattern: "{category}-{theme}-{knowledge}-{index}", // 图片命名模式
  keepOriginalImages: false // 是否保留原始图片
};

// 1. 查找所有 .md 文件
const mdFiles = await glob({
  pattern: "**/*.md",
  path: config.sourceDir,
  ignore: ["**/node_modules/**", "**/.git/**", ...config.excludePatterns]
});

// 2. 读取并解析文件内容（增强版，提取图片信息）
const fileContents = [];
for (const filePath of mdFiles) {
  const content = await read({ filePath });
  const parsed = {
    filePath,
    content,
    headings: extractHeadings(content),
    codeBlocks: extractCodeBlocks(content),
    metadata: extractMetadata(content),
    imageRefs: extractImageReferences(content, filePath), // 新增：提取图片引用
    hasImages: false // 新增：是否有图片
  };
  parsed.hasImages = parsed.imageRefs.length > 0;
  fileContents.push(parsed);
}

// 3. 主题识别（基于标题层级）
const themes = identifyThemesByHeadings(fileContents, {
  method: config.themeRecognition
});

// 4. 处理图片（如果启用）
if (config.processImages) {
  console.log("开始处理图片...");
  
  for (const file of fileContents) {
    if (file.hasImages) {
      // 为每个文件生成命名信息
      const namingInfo = {
        category: determineCategory(file, themes),
        theme: determineTheme(file, themes),
        knowledge: extractKnowledgePoint(file),
        outputDir: config.outputDir
      };
      
      // 处理图片
      const imageResult = await processImagesInFile(
        file.filePath,
        file.content,
        namingInfo
      );
      
      // 更新文件内容（图片路径已更新）
      file.content = imageResult.updatedContent;
      file.imageProcessingResult = imageResult;
      
      console.log(`  文件 ${path.basename(file.filePath)}: 处理了 ${imageResult.processedCount} 张图片`);
    }
  }
  
  console.log("图片处理完成");
}

// 5. 内容整合（按主题组织，包含已更新的图片路径）
const organizedContent = organizeContentByTheme(themes, fileContents, {
  deduplicate: config.deduplicate,
  preserveCodeBlocks: config.preserveCodeBlocks,
  includeImageStats: config.processImages // 新增：包含图片统计
});

// 6. 生成输出文件（增强版，包含图片信息）
const outputDir = config.outputDir || `${config.sourceDir}_organized`;
await ensureDirectory(outputDir);

// 为每个主题生成文件
for (const theme of organizedContent.themes) {
  const fileName = sanitizeFileName(theme.name) + ".md";
  const filePath = path.join(outputDir, fileName);
  
  // 生成文件内容（增强版模板，包含图片信息）
  const content = generateThemeFile(theme, {
    template: "practical",
    keepOriginalFormatting: config.keepOriginalFormatting,
    includeImageInfo: config.processImages && theme.imageCount > 0 // 新增：包含图片信息
  });
  
  await write({ filePath, content });
}
```

## 新增功能详解

### 图片处理功能

#### 1. 图片识别
- 自动识别Markdown中的图片语法：`![alt](url "title")`
- 支持本地图片和网络图片（仅处理本地图片）
- 支持的图片格式：`.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.bmp`

#### 2. 图片保存与重命名
- 图片保存目录：`/home/zilo/kb/imgs`
- 目录结构：`{分类}/{主题}/`
- 命名模式：`{分类}-{主题}-{知识点}-{编号}.{扩展名}`
- 示例：`technology-STM32开发环境-ARM工具链-001.png`

#### 3. 路径更新
- 自动更新Markdown文件中的图片路径
- 保持图片在文档中的原始位置
- 生成相对路径，确保文档可移植性

#### 4. 统计与报告
- 统计每个文件的图片数量
- 记录处理成功和失败的图片
- 生成处理报告

### 配置选项（新增）

| 选项 | 描述 | 类型 | 默认值 | 示例 |
|------|------|------|--------|------|
| `processImages` | 是否处理图片 | boolean | `true` | `false` |
| `imageBaseDir` | 图片保存目录 | string | `/home/zilo/kb/imgs` | `/path/to/images` |
| `imageNamingPattern` | 图片命名模式 | string | `"{category}-{theme}-{knowledge}-{index}"` | `"{theme}-{index}"` |
| `keepOriginalImages` | 是否保留原始图片 | boolean | `false` | `true` |
| `supportedImageExtensions` | 支持的图片格式 | array | `['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp']` | `['.png', '.jpg']` |

## 输出结构

### 文件输出结构
```
organized-knowledge/
├── technology/
│   ├── STM32开发环境搭建.md       # 主题1：STM32开发环境
│   ├── ARM工具链配置.md           # 主题2：ARM工具链
│   └── VSCode配置指南.md          # 主题3：VSCode配置
└── programming/
    └── Python基础教程.md          # 主题4：Python基础
```

### 图片输出结构
```
/home/zilo/kb/imgs/
├── technology/
│   ├── STM32开发环境/
│   │   ├── technology-STM32开发环境-ARM工具链-001.png
│   │   ├── technology-STM32开发环境-ST-Link配置-002.jpg
│   │   └── technology-STM32开发环境-VSCode配置-003.png
│   └── ARM工具链/
│       └── technology-ARM工具链-交叉编译-001.png
└── programming/
    └── Python基础/
        ├── programming-Python基础-数据类型-001.png
        └── programming-Python基础-控制流-002.png
```

### 输出文件示例（包含图片信息）

```markdown
# STM32开发环境搭建

**分类**: 嵌入式开发与技术工具 (technology)

## 概述

本文档整合了 **STM32开发环境搭建** 的相关内容：

- **源文件数**: 4
- **章节数**: 12
- **图片数量**: 5 张
- **已处理图片**: 5 张

包含以下关键知识点：

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

![STM32开发板](technology-STM32开发环境-硬件要求-001.jpg "STM32F103开发板")

### 软件要求

- Ubuntu 18.04/20.04/22.04/24.04
- **项目生成**：STM32CubeMX

---

## ARM工具链

### 安装ARM交叉编译工具链

```bash
# 更新包列表
sudo apt update
sudo apt install gcc-arm-none-eabi
```

**工具链架构**:

![ARM工具链架构](technology-STM32开发环境-ARM工具链-002.png "ARM工具链组件")

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
- **章节数**: 12
- **图片总数**: 5
- **已处理图片**: 5
- **图片保存位置**: /home/zilo/kb/imgs/technology/STM32开发环境/
- **分类**: 嵌入式开发与技术工具
- **主题**: STM32开发环境搭建
```

## 错误处理

技能包含完善的错误处理机制：

- **文件读取错误**：跳过无法读取的文件并记录日志
- **解析错误**：尝试恢复解析，标记问题内容
- **输出目录冲突**：自动重命名或询问用户
- **内存限制**：分批处理大型文件集
- **图片处理错误**：
  - 图片文件不存在：跳过并记录警告
  - 图片复制失败：保留原始路径并记录错误
  - 网络图片：跳过处理并记录信息

## 性能优化

- 使用流式处理处理大型文件
- 并行处理多个文件
- 缓存中间结果避免重复计算
- 增量更新支持
- 图片处理优化：批量复制，避免重复操作

## 使用示例：STM32环境配置整理（包含图片）

以下是如何使用本技能整理包含图片的STM32环境配置文件的示例：

```typescript
// 配置STM32环境配置整理（包含图片处理）
const stm32Config = {
  sourceDir: "/home/zilo/kb/raw",
  outputDir: "/home/zilo/kb/cooking/stm32_with_images",
  themeRecognition: "heading",
  deduplicate: true,
  preserveCodeBlocks: true,
  keepOriginalFormatting: true,
  excludePatterns: [],
  
  // 图片处理配置
  processImages: true,
  imageBaseDir: "/home/zilo/kb/imgs",
  imageNamingPattern: "{category}-{theme}-{knowledge}-{index}",
  keepOriginalImages: false
};

// 执行整理（包含图片处理）
await organizeKnowledgeBaseWithImages(stm32Config);

// 结果将生成：
// 1. 整理后的Markdown文件：/home/zilo/kb/cooking/stm32_with_images/
// 2. 重命名的图片文件：/home/zilo/kb/imgs/technology/STM32开发环境/
```

---

**使用提示**：
1. 首次使用时建议先用小规模文件测试，调整参数后再处理完整知识库
2. 基于示例文件优化的模板更适合技术文档和教程类内容的整理
3. 图片处理功能会修改原始文件中的图片路径，建议先备份重要文件
4. 如果笔记中包含网络图片，这些图片不会被下载和处理，但会在报告中标记