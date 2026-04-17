/**
 * 文件生成器 - 支持分类文件夹结构
 */

const path = require('path');

/**
 * 生成输出文件（支持分类文件夹结构）
 * @param {Object} organizedContent - 组织好的内容
 * @param {string} outputDir - 输出目录
 * @param {Object} tools - 工具对象（read, write, bash等）
 */
async function generateOutputFilesOptimized(organizedContent, outputDir, tools) {
  const { write, bash } = tools;
  
  // 确保输出目录存在
  await ensureDirectory(outputDir, bash);
  
  for (const category of organizedContent.categories) {
    // 创建分类目录
    const categoryDir = path.join(outputDir, category.name);
    await ensureDirectory(categoryDir, bash);
    
    console.log(`创建分类目录: ${category.name} (${category.description})`);
    
    // 为每个主题生成文件
    for (const theme of category.themes) {
      // 生成安全的文件名
      const safeFileName = sanitizeFileName(theme.name) + ".md";
      const filePath = path.join(categoryDir, safeFileName);
      
      // 生成文件内容（优化版模板）
      const content = generateThemeFileOptimized(theme, category);
      
      // 写入文件
      await write({ filePath, content });
      console.log(`  生成主题文件: ${safeFileName}`);
    }
  }
}

/**
 * 生成主题文件（优化版模板）
 * @param {Object} theme - 主题对象
 * @param {Object} category - 分类对象
 * @returns {string} 文件内容
 */
function generateThemeFileOptimized(theme, category) {
  let content = "";
  
  // 1. 添加分类和主题信息
  content += `# ${theme.name}\n\n`;
  content += `**分类**: ${category.description} (${category.name})\n\n`;
  
  // 2. 添加概述部分
  content += `## 概述\n\n`;
  content += `本文档整合了 **${theme.name}** 的相关内容，包含以下关键知识点：\n\n`;
  
  // 提取知识点（基于标题）
  const knowledgePoints = extractKnowledgePoints(theme.content);
  if (knowledgePoints.length > 0) {
    for (const point of knowledgePoints) {
      content += `- **${point}**\n`;
    }
  } else {
    content += `- 基础概念与原理\n`;
    content += `- 实践操作指南\n`;
    content += `- 常见问题与解决方案\n`;
  }
  
  content += `\n---\n\n`;
  
  // 3. 添加主要内容（保持多级标题结构）
  content += theme.content;
  
  // 4. 添加参考资料部分
  if (theme.sourceFiles.length > 1) {
    content += `\n---\n\n`;
    content += `## 参考资料\n\n`;
    content += `本文档整合自以下源文件：\n\n`;
    
    const uniqueFiles = [...new Set(theme.sourceFiles.map(f => path.basename(f)))];
    for (const fileName of uniqueFiles) {
      content += `- ${fileName}\n`;
    }
  }
  
  // 5. 添加元信息
  content += `\n---\n\n`;
  content += `## 文档信息\n\n`;
  content += `- **生成时间**: ${new Date().toLocaleString('zh-CN')}\n`;
  content += `- **源文件数**: ${theme.fileCount}\n`;
  content += `- **知识点数**: ${theme.sectionCount}\n`;
  content += `- **分类**: ${category.description}\n`;
  content += `- **主题**: ${theme.name}\n`;
  
  return content;
}

/**
 * 按主题整合内容（优化版，支持多级标题）
 * @param {Object} classifiedThemes - 分类后的主题
 * @param {Array} files - 文件数组
 * @param {Object} config - 配置对象
 * @returns {Object} 组织好的内容
 */
function organizeContentByThemeOptimized(classifiedThemes, files, config) {
  const organized = {
    categories: []
  };
  
  for (const category in classifiedThemes) {
    const categoryData = classifiedThemes[category];
    const organizedThemes = [];
    
    for (const theme of categoryData.themes) {
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
        
        // 添加标题（保持原始标题层级）
        const headingLevel = Math.min(section.heading.level, 3); // 限制最高到H3
        const headingPrefix = "#".repeat(headingLevel);
        mergedContent += `${headingPrefix} ${section.heading.text}\n\n`;
        
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
    
    organized.categories.push({
      name: categoryData.name,
      description: categoryData.description,
      themes: organizedThemes
    });
  }
  
  return organized;
}

/**
 * 确保目录存在
 * @param {string} dirPath - 目录路径
 * @param {Function} bash - bash工具函数
 */
async function ensureDirectory(dirPath, bash) {
  try {
    await bash({ command: `mkdir -p "${dirPath}"`, description: "创建输出目录" });
  } catch (error) {
    console.warn(`无法创建目录 ${dirPath}:`, error.message);
  }
}

/**
 * 生成安全的文件名
 * @param {string} name - 原始文件名
 * @returns {string} 安全的文件名
 */
function sanitizeFileName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '_') // 替换非法字符
    .replace(/\s+/g, '_') // 替换空格为下划线
    .replace(/_+/g, '_') // 合并多个下划线
    .replace(/^_+|_+$/g, '') // 移除首尾下划线
    .substring(0, 100); // 限制长度
}

/**
 * 提取知识点（基于标题）
 * @param {string} content - 内容文本
 * @returns {Array} 知识点数组
 */
function extractKnowledgePoints(content) {
  const points = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    // 匹配H2和H3标题作为知识点
    const headingMatch = line.match(/^#{2,3}\s+(.+)$/);
    if (headingMatch) {
      const headingText = headingMatch[1].trim();
      // 跳过"概述"和"参考资料"
      if (!headingText.includes('概述') && !headingText.includes('参考资料') && !headingText.includes('文档信息')) {
        points.push(headingText);
      }
    }
  }
  
  return points.slice(0, 10); // 最多返回10个知识点
}

/**
 * 简单的内容哈希函数
 * @param {string} content - 内容文本
 * @returns {string} 哈希值
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

module.exports = {
  generateOutputFilesOptimized,
  generateThemeFileOptimized,
  organizeContentByThemeOptimized,
  ensureDirectory,
  sanitizeFileName,
  extractKnowledgePoints,
  hashContent
};