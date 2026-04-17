/**
 * STM32知识库整理示例实现
 * 基于优化后的 kb-cook 技能
 * 参考模板：/home/zilo/kb/cooking/stm32/STM32开发环境搭建.md
 */

// 配置参数
const config = {
  // 必需参数
  sourceDir: "/home/zilo/kb/raw",
  
  // 可选参数
  outputDir: "/home/zilo/kb/cooking/stm32_optimized",
  themeRecognition: "heading", // 基于标题识别主题
  deduplicate: true, // 去重
  preserveCodeBlocks: true, // 保留完整代码块
  keepOriginalFormatting: true, // 保持原始格式
  excludePatterns: [], // 不排除任何文件
};

/**
 * 主函数：整理STM32知识库
 */
async function organizeSTM32KnowledgeBase() {
  console.log("开始整理STM32知识库...");
  console.log(`源目录: ${config.sourceDir}`);
  console.log(`输出目录: ${config.outputDir}`);
  
  try {
    // 1. 查找所有 .md 文件
    const mdFiles = await findMarkdownFiles(config.sourceDir);
    console.log(`找到 ${mdFiles.length} 个Markdown文件`);
    
    // 2. 读取并解析文件内容
    const fileContents = await parseFiles(mdFiles);
    console.log(`解析了 ${fileContents.length} 个文件`);
    
    // 3. 主题识别（基于标题层级）
    const themes = identifyThemesByHeadings(fileContents, config);
    console.log(`识别出 ${themes.length} 个主题`);
    
    // 4. 内容整合（按主题组织）
    const organizedContent = organizeContentByTheme(themes, fileContents, config);
    console.log(`整合了 ${organizedContent.themes.length} 个主题的内容`);
    
    // 5. 生成输出文件
    await generateOutputFiles(organizedContent.themes, config.outputDir);
    console.log(`生成 ${organizedContent.themes.length} 个输出文件`);
    
    console.log("STM32知识库整理完成！");
    return organizedContent;
  } catch (error) {
    console.error("整理过程中发生错误:", error);
    throw error;
  }
}

/**
 * 查找所有Markdown文件
 */
async function findMarkdownFiles(sourceDir) {
  // 使用glob工具查找所有.md文件
  const mdFiles = await glob({
    pattern: "**/*.md",
    path: sourceDir,
    ignore: ["**/node_modules/**", "**/.git/**", ...config.excludePatterns]
  });
  
  // 过滤出与STM32相关的文件
  const stm32Files = mdFiles.filter(file => 
    file.toLowerCase().includes('stm32') || 
    file.toLowerCase().includes('arm') ||
    file.toLowerCase().includes('嵌入式')
  );
  
  return stm32Files.length > 0 ? stm32Files : mdFiles;
}

/**
 * 解析文件内容
 */
async function parseFiles(filePaths) {
  const fileContents = [];
  
  for (const filePath of filePaths) {
    try {
      const content = await read({ filePath });
      
      // 提取标题
      const headings = extractHeadings(content);
      
      // 提取代码块
      const codeBlocks = extractCodeBlocks(content);
      
      // 提取元数据
      const metadata = extractMetadata(content);
      
      fileContents.push({
        filePath,
        content,
        headings,
        codeBlocks,
        metadata,
        fileName: path.basename(filePath)
      });
    } catch (error) {
      console.warn(`无法读取文件 ${filePath}:`, error.message);
    }
  }
  
  return fileContents;
}

/**
 * 基于标题层级识别主题
 */
function identifyThemesByHeadings(parsedFiles, config) {
  const themes = new Map();
  
  for (const file of parsedFiles) {
    // 提取H1和H2标题作为潜在主题
    const mainHeadings = file.headings.filter(h => h.level <= 2);
    
    for (const heading of mainHeadings) {
      const themeName = normalizeThemeName(heading.text);
      
      if (!themeName || themeName.length < 2) {
        continue; // 跳过无效的主题名
      }
      
      if (!themes.has(themeName)) {
        themes.set(themeName, {
          name: themeName,
          files: [],
          headings: [],
          content: [],
          sourceFiles: new Set()
        });
      }
      
      const theme = themes.get(themeName);
      theme.files.push(file.filePath);
      theme.headings.push(heading);
      theme.sourceFiles.add(file.filePath);
      
      // 提取该标题下的内容
      const sectionContent = extractSectionContent(file.content, heading);
      theme.content.push({
        sourceFile: file.filePath,
        heading: heading,
        content: sectionContent,
        fileName: file.fileName
      });
    }
  }
  
  // 转换为数组并过滤过小的主题
  const themeArray = Array.from(themes.values())
    .filter(theme => theme.content.length > 0)
    .map(theme => ({
      ...theme,
      sourceFiles: Array.from(theme.sourceFiles)
    }));
  
  // 按主题名排序
  themeArray.sort((a, b) => a.name.localeCompare(b.name));
  
  return themeArray;
}

/**
 * 规范化主题名
 */
function normalizeThemeName(name) {
  if (!name) return '';
  
  // 移除特殊字符和数字
  let normalized = name.trim()
    .replace(/[#*`]/g, '') // 移除Markdown标记
    .replace(/^\d+[\.\s]*/, '') // 移除开头的数字和点
    .replace(/[\-\_]+/g, ' ') // 将连字符和下划线替换为空格
    .trim();
  
  // 提取中文部分（如果有）
  const chineseMatch = normalized.match(/[\u4e00-\u9fff]+/g);
  if (chineseMatch && chineseMatch.length > 0) {
    normalized = chineseMatch.join(' ');
  }
  
  return normalized;
}

/**
 * 提取标题
 */
function extractHeadings(content) {
  const headings = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 匹配Markdown标题
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      
      headings.push({
        level,
        text,
        lineNumber: i + 1,
        line: line
      });
    }
  }
  
  return headings;
}

/**
 * 提取代码块
 */
function extractCodeBlocks(content) {
  const codeBlocks = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let currentBlock = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检测代码块开始
    const codeBlockStart = line.match(/^```(\w*)/);
    if (codeBlockStart && !inCodeBlock) {
      inCodeBlock = true;
      currentBlock = {
        language: codeBlockStart[1] || '',
        content: '',
        startLine: i + 1
      };
      continue;
    }
    
    // 检测代码块结束
    if (line.trim() === '```' && inCodeBlock) {
      inCodeBlock = false;
      currentBlock.endLine = i + 1;
      codeBlocks.push(currentBlock);
      currentBlock = null;
      continue;
    }
    
    // 收集代码块内容
    if (inCodeBlock && currentBlock) {
      currentBlock.content += line + '\n';
    }
  }
  
  return codeBlocks;
}

/**
 * 提取章节内容
 */
function extractSectionContent(content, heading) {
  const lines = content.split('\n');
  let sectionContent = '';
  let inSection = false;
  let currentLevel = 0;
  
  for (let i = heading.lineNumber - 1; i < lines.length; i++) {
    const line = lines[i];
    
    // 检查是否遇到更高级别的标题（结束当前章节）
    if (i > heading.lineNumber - 1) {
      const headingMatch = line.match(/^(#{1,6})\s+/);
      if (headingMatch) {
        const newLevel = headingMatch[1].length;
        if (newLevel <= heading.level) {
          break; // 遇到同级或更高级标题，结束章节
        }
      }
    }
    
    sectionContent += line + '\n';
  }
  
  return sectionContent.trim();
}

/**
 * 按主题整合内容
 */
function organizeContentByTheme(themes, files, config) {
  const organizedThemes = [];
  
  for (const theme of themes) {
    // 合并同一主题下的所有内容
    let mergedContent = "";
    const seenSections = new Set();
    
    // 按源文件排序，确保一致性
    theme.content.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile));
    
    for (const section of theme.content) {
      // 去重处理（可选）
      if (config.deduplicate) {
        const contentHash = hashContent(section.content);
        if (seenSections.has(contentHash)) {
          continue;
        }
        seenSections.add(contentHash);
      }
      
      // 添加来源标记（注释形式，不显示在渲染中）
      mergedContent += `<!-- 来源文件: ${section.fileName} -->\n\n`;
      
      // 添加标题（使用原始标题文本）
      mergedContent += `## ${section.heading.text}\n\n`;
      
      // 添加内容（保持原始格式）
      mergedContent += section.content + "\n\n";
      
      // 添加分隔线（如果不是最后一个章节）
      if (section !== theme.content[theme.content.length - 1]) {
        mergedContent += "---\n\n";
      }
    }
    
    organizedThemes.push({
      name: theme.name,
      content: mergedContent,
      sourceFiles: theme.sourceFiles,
      sectionCount: theme.content.length,
      fileCount: theme.sourceFiles.length
    });
  }
  
  return { themes: organizedThemes };
}

/**
 * 简单的内容哈希函数
 */
function hashContent(content) {
  // 移除空白字符和注释后计算简单哈希
  const normalized = content
    .replace(/\s+/g, ' ')
    .replace(/<!--.*?-->/g, '')
    .trim();
  
  // 使用简单的字符串哈希
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return hash.toString(36);
}

/**
 * 提取元数据
 */
function extractMetadata(content) {
  const metadata = {};
  const lines = content.split('\n');
  
  // 尝试提取YAML frontmatter
  if (lines[0] === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') break;
      
      const match = lines[i].match(/^(\w+):\s*(.+)$/);
      if (match) {
        metadata[match[1]] = match[2].trim();
      }
    }
  }
  
  return metadata;
}

/**
 * 生成主题文件
 */
function generateThemeFile(theme, options) {
  let content = "";
  
  // 1. 添加概述部分
  content += `## 概述\n\n`;
  content += `本文档整合了 **${theme.name}** 的相关内容，包含以下关键部分：\n\n`;
  
  // 提取子标题作为要点
  const subHeadings = extractSubHeadingsFromContent(theme.content);
  if (subHeadings.length > 0) {
    for (const heading of subHeadings) {
      content += `- **${heading}**\n`;
    }
  } else {
    // 如果没有子标题，使用默认要点
    content += `- 基础概念与原理\n`;
    content += `- 实践操作指南\n`;
    content += `- 常见问题与解决方案\n`;
  }
  
  content += `\n---\n\n`;
  
  // 2. 添加主要内容
  content += theme.content;
  
  // 3. 添加参考资料部分
  if (theme.sourceFiles.length > 1) {
    content += `\n---\n\n`;
    content += `## 参考资料\n\n`;
    content += `本文档整合自以下源文件：\n\n`;
    
    const uniqueFiles = [...new Set(theme.sourceFiles.map(f => path.basename(f)))];
    for (const fileName of uniqueFiles) {
      content += `- ${fileName}\n`;
    }
  }
  
  // 4. 添加元信息
  content += `\n---\n\n`;
  content += `**生成信息**\n\n`;
  content += `- **生成时间**: ${new Date().toLocaleString('zh-CN')}\n`;
  content += `- **源文件数**: ${theme.fileCount}\n`;
  content += `- **章节数**: ${theme.sectionCount}\n`;
  content += `- **主题**: ${theme.name}\n`;
  
  return content;
}

/**
 * 从内容中提取子标题
 */
function extractSubHeadingsFromContent(content) {
  const subHeadings = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      const headingText = headingMatch[1].trim();
      // 跳过"概述"和"参考资料"
      if (!headingText.includes('概述') && !headingText.includes('参考资料')) {
        subHeadings.push(headingText);
      }
    }
  }
  
  return subHeadings.slice(0, 10); // 最多返回10个子标题
}

/**
 * 生成输出文件
 */
async function generateOutputFiles(themes, outputDir) {
  // 确保输出目录存在
  await ensureDirectory(outputDir);
  
  for (const theme of themes) {
    // 生成安全的文件名
    const safeFileName = sanitizeFileName(theme.name) + ".md";
    const filePath = path.join(outputDir, safeFileName);
    
    // 生成文件内容
    const content = generateThemeFile(theme, {
      template: "practical",
      keepOriginalFormatting: true
    });
    
    // 写入文件
    await write({ filePath, content });
    console.log(`生成文件: ${safeFileName}`);
  }
}

/**
 * 确保目录存在
 */
async function ensureDirectory(dirPath) {
  try {
    await bash({ command: `mkdir -p "${dirPath}"`, description: "创建输出目录" });
  } catch (error) {
    console.warn(`无法创建目录 ${dirPath}:`, error.message);
  }
}

/**
 * 生成安全的文件名
 */
function sanitizeFileName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '_') // 替换非法字符
    .replace(/\s+/g, '_') // 替换空格为下划线
    .replace(/_+/g, '_') // 合并多个下划线
    .replace(/^_+|_+$/g, '') // 移除首尾下划线
    .substring(0, 100); // 限制长度
}

// 工具函数占位符（实际使用时需要替换为相应的工具调用）
async function glob(options) {
  // 实际实现中使用 glob 工具
  return [];
}

async function read(options) {
  // 实际实现中使用 read 工具
  return "";
}

async function write(options) {
  // 实际实现中使用 write 工具
}

async function bash(options) {
  // 实际实现中使用 bash 工具
}

const path = {
  basename: (filePath) => filePath.split('/').pop(),
  join: (...parts) => parts.join('/')
};

// 执行示例
if (require.main === module) {
  organizeSTM32KnowledgeBase()
    .then(() => {
      console.log("示例执行完成");
      console.log(`输出目录: ${config.outputDir}`);
      console.log("请检查生成的文件是否符合预期");
    })
    .catch(error => {
      console.error("示例执行失败:", error);
      process.exit(1);
    });
}

module.exports = {
  organizeSTM32KnowledgeBase,
  config
};