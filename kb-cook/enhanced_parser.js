/**
 * 增强版文件解析器 - 支持图片信息提取
 */

const path = require('path');
const imageManager = require('./image_manager');

/**
 * 增强版文件解析
 * @param {Array} filePaths - 文件路径数组
 * @param {Object} tools - 工具对象（read, write, bash等）
 * @param {Object} config - 配置对象
 * @returns {Promise<Array>} 解析后的文件内容数组
 */
async function parseFilesEnhanced(filePaths, tools, config = {}) {
  const { read } = tools;
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
      
      // 提取图片引用（新增功能）
      const imageRefs = imageManager.extractImageReferences(content, filePath);
      
      fileContents.push({
        filePath,
        content,
        headings,
        codeBlocks,
        metadata,
        imageRefs, // 新增：图片引用信息
        fileName: path.basename(filePath),
        hasImages: imageRefs.length > 0 // 新增：是否有图片
      });
      
      if (imageRefs.length > 0) {
        console.log(`文件 ${path.basename(filePath)} 包含 ${imageRefs.length} 张图片`);
      }
      
    } catch (error) {
      console.warn(`无法读取文件 ${filePath}:`, error.message);
    }
  }
  
  return fileContents;
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
 * 处理文件中的图片（在内容整合前）
 * @param {Array} parsedFiles - 解析后的文件数组
 * @param {Object} namingInfo - 命名信息
 * @param {Object} tools - 工具对象
 * @returns {Promise<Array>} 处理后的文件数组
 */
async function processImagesInParsedFiles(parsedFiles, namingInfo, tools) {
  const processedFiles = [];
  
  for (const file of parsedFiles) {
    if (file.imageRefs.length === 0) {
      processedFiles.push(file);
      continue;
    }
    
    try {
      // 处理图片
      const imageResult = await imageManager.processImagesInFile(
        file.filePath,
        file.content,
        namingInfo
      );
      
      // 更新文件内容
      const processedFile = {
        ...file,
        content: imageResult.updatedContent,
        imageProcessingResult: imageResult
      };
      
      processedFiles.push(processedFile);
      
      // 输出处理结果
      if (imageResult.processedCount > 0) {
        console.log(`  处理图片: ${imageResult.processedCount} 张成功, ${imageResult.failedCount} 张失败`);
      }
      
    } catch (error) {
      console.error(`处理文件 ${file.fileName} 中的图片时出错:`, error);
      processedFiles.push(file); // 出错时保留原始文件
    }
  }
  
  return processedFiles;
}

/**
 * 生成图片处理摘要
 * @param {Array} parsedFiles - 解析后的文件数组
 * @returns {Object} 图片处理摘要
 */
function generateImageProcessingSummary(parsedFiles) {
  let totalFiles = parsedFiles.length;
  let filesWithImages = 0;
  let totalImages = 0;
  let totalProcessed = 0;
  let totalFailed = 0;
  
  for (const file of parsedFiles) {
    if (file.imageRefs && file.imageRefs.length > 0) {
      filesWithImages++;
      totalImages += file.imageRefs.length;
    }
    
    if (file.imageProcessingResult) {
      totalProcessed += file.imageProcessingResult.processedCount;
      totalFailed += file.imageProcessingResult.failedCount;
    }
  }
  
  return {
    totalFiles,
    filesWithImages,
    totalImages,
    totalProcessed,
    totalFailed,
    processingRate: totalImages > 0 ? (totalProcessed / totalImages) * 100 : 0
  };
}

module.exports = {
  parseFilesEnhanced,
  extractHeadings,
  extractCodeBlocks,
  extractMetadata,
  processImagesInParsedFiles,
  generateImageProcessingSummary
};