/**
 * 图片管理器 - 处理Markdown文件中的图片
 * 功能：
 * 1. 识别Markdown中的图片引用
 * 2. 将图片保存到本地指定目录
 * 3. 按照分类-主题-知识点-编号重新命名
 * 4. 更新Markdown中的图片路径
 */

const path = require('path');
const fs = require('fs').promises;

/**
 * 图片管理器配置
 */
const imageManagerConfig = {
  // 图片保存目录
  imageBaseDir: "/home/zilo/kb/imgs",
  
  // 支持的图片格式
  supportedImageExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'],
  
  // 命名模式
  namingPattern: "{category}-{theme}-{knowledge}-{index}",
  
  // 是否保留原始图片
  keepOriginalImages: false
};

/**
 * 从Markdown内容中提取图片引用
 * @param {string} content - Markdown内容
 * @param {string} sourceFilePath - 源文件路径（用于解析相对路径）
 * @returns {Array} 图片引用数组
 */
function extractImageReferences(content, sourceFilePath) {
  const imageRefs = [];
  const lines = content.split('\n');
  const sourceDir = path.dirname(sourceFilePath);
  
  // 正则表达式匹配Markdown图片语法：![alt](url "title")
  const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    
    while ((match = imageRegex.exec(line)) !== null) {
      const altText = match[1] || '';
      const imageUrl = match[2];
      const title = match[3] || '';
      
      // 解析图片路径
      const imageInfo = parseImagePath(imageUrl, sourceDir);
      
      imageRefs.push({
        lineNumber: i + 1,
        line: line,
        alt: altText,
        originalUrl: imageUrl,
        title: title,
        absolutePath: imageInfo.absolutePath,
        relativePath: imageInfo.relativePath,
        filename: imageInfo.filename,
        extension: imageInfo.extension,
        isLocal: imageInfo.isLocal,
        isWeb: imageInfo.isWeb
      });
    }
  }
  
  return imageRefs;
}

/**
 * 解析图片路径
 * @param {string} imageUrl - 图片URL
 * @param {string} sourceDir - 源文件所在目录
 * @returns {Object} 图片路径信息
 */
function parseImagePath(imageUrl, sourceDir) {
  const result = {
    originalUrl: imageUrl,
    absolutePath: '',
    relativePath: imageUrl,
    filename: '',
    extension: '',
    isLocal: false,
    isWeb: false
  };
  
  // 检查是否为网络图片
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    result.isWeb = true;
    result.filename = path.basename(imageUrl);
    result.extension = path.extname(imageUrl).toLowerCase();
    return result;
  }
  
  // 检查是否为本地图片
  result.isLocal = true;
  
  // 解析相对路径
  let absolutePath;
  if (path.isAbsolute(imageUrl)) {
    absolutePath = imageUrl;
  } else {
    absolutePath = path.resolve(sourceDir, imageUrl);
  }
  
  result.absolutePath = absolutePath;
  result.filename = path.basename(imageUrl);
  result.extension = path.extname(imageUrl).toLowerCase();
  
  return result;
}

/**
 * 生成新的图片文件名
 * @param {Object} namingInfo - 命名信息
 * @param {string} originalExtension - 原始图片扩展名
 * @param {number} index - 图片索引
 * @returns {string} 新文件名
 */
function generateNewImageName(namingInfo, originalExtension, index) {
  const { category, theme, knowledge, sourceFileName } = namingInfo;
  
  // 优先使用源文件名作为图片命名的基础
  let baseName = '未命名';
  
  if (sourceFileName) {
    // 移除文件扩展名
    baseName = path.basename(sourceFileName, path.extname(sourceFileName));
  } else if (knowledge && knowledge !== '未命名知识点') {
    baseName = knowledge;
  } else if (theme && theme !== '未命名主题') {
    baseName = theme;
  }
  
  // 清理名称中的非法字符
  const cleanBaseName = sanitizeForFilename(baseName);
  const cleanKnowledge = sanitizeForFilename(knowledge || '知识点');
  
  // 生成新文件名：源文件名-知识点-编号
  const newName = `${cleanBaseName}-${cleanKnowledge}-${index.toString().padStart(3, '0')}`;
  
  return newName + originalExtension;
}

/**
 * 为文件名清理字符串
 * @param {string} str - 原始字符串
 * @returns {string} 清理后的字符串
 */
function sanitizeForFilename(str) {
  return str
    .replace(/[<>:"/\\|?*]/g, '_') // 替换非法字符
    .replace(/\s+/g, '_') // 替换空格为下划线
    .replace(/[^\w\u4e00-\u9fff_-]/g, '') // 只保留字母、数字、中文、下划线和连字符
    .replace(/_+/g, '_') // 合并多个下划线
    .replace(/^_+|_+$/g, '') // 移除首尾下划线
    .substring(0, 50); // 限制长度
}

/**
 * 复制图片到新位置
 * @param {Object} imageRef - 图片引用信息
 * @param {Object} namingInfo - 命名信息
 * @param {number} index - 图片索引
 * @returns {Promise<Object>} 处理结果
 */
async function copyImageToNewLocation(imageRef, namingInfo, index) {
  const result = {
    success: false,
    originalPath: imageRef.absolutePath,
    newPath: '',
    newUrl: '',
    error: null
  };
  
  try {
    // 检查是否为本地图片
    if (!imageRef.isLocal) {
      result.error = '不支持网络图片，跳过处理';
      return result;
    }
    
    // 检查图片文件是否存在
    try {
      await fs.access(imageRef.absolutePath);
    } catch (error) {
      result.error = `图片文件不存在: ${imageRef.absolutePath}`;
      return result;
    }
    
    // 生成新文件名
    const newFilename = generateNewImageName(namingInfo, imageRef.extension, index);
    
    // 创建目标目录结构 - 使用源文件所在文件夹的名称
    let folderName = '未分类';
    
    if (namingInfo.sourceFolderName) {
      folderName = namingInfo.sourceFolderName;
    } else if (namingInfo.theme && namingInfo.theme !== '未命名主题') {
      folderName = namingInfo.theme;
    }
    
    // 清理文件夹名称
    const cleanFolderName = sanitizeForFilename(folderName);
    
    const targetDir = path.join(
      imageManagerConfig.imageBaseDir,
      cleanFolderName
    );
    
    await fs.mkdir(targetDir, { recursive: true });
    
    // 目标文件路径
    const targetPath = path.join(targetDir, newFilename);
    
    // 复制图片文件
    await fs.copyFile(imageRef.absolutePath, targetPath);
    
    // 生成相对路径 - 相对于输出目录中的Markdown文件位置
    // 图片保存在 /home/zilo/kb/imgs/文件夹名/
    // Markdown文件保存在输出目录中，所以需要计算相对路径
    let relativePath;
    
    if (namingInfo.outputDir) {
      // 计算从输出目录到图片的相对路径
      relativePath = path.relative(namingInfo.outputDir, targetPath);
      
      // 确保路径使用正斜杠（Markdown标准）
      relativePath = relativePath.replace(/\\/g, '/');
      
      // 如果路径不在同一目录下，添加 ../
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
    } else {
      // 如果没有输出目录，使用绝对路径
      relativePath = targetPath;
    }
    
    result.success = true;
    result.newPath = targetPath;
    result.newUrl = relativePath;
    
  } catch (error) {
    result.error = error.message;
  }
  
  return result;
}

/**
 * 更新Markdown内容中的图片路径
 * @param {string} content - 原始Markdown内容
 * @param {Array} imageUpdates - 图片更新信息数组
 * @returns {string} 更新后的Markdown内容
 */
function updateImagePathsInContent(content, imageUpdates) {
  const lines = content.split('\n');
  
  for (const update of imageUpdates) {
    if (update.lineNumber <= lines.length && update.success) {
      const lineIndex = update.lineNumber - 1;
      const originalLine = lines[lineIndex];
      
      // 获取图片引用信息
      const imageRef = update.imageRef;
      const originalUrl = imageRef.originalUrl;
      const newUrl = update.newUrl;
      
      // 调试信息
      console.log(`  更新图片路径: ${originalUrl} -> ${newUrl}`);
      
      // 方法1：使用正则表达式替换Markdown图片语法中的URL部分
      // 匹配模式：![alt](url "title") 或 ![alt](url)
      const markdownImageRegex = /(!\[.*?\])\(([^)\s]+)(?:\s+"([^"]+)")?\)/;
      const match = originalLine.match(markdownImageRegex);
      
      if (match) {
        // 找到匹配的图片语法
        const altText = match[1]; // ![alt]
        const currentUrl = match[2]; // url
        const title = match[3]; // "title"（可选）
        
        // 检查当前URL是否与原始URL匹配（考虑相对路径解析）
        if (currentUrl === originalUrl || 
            currentUrl.includes(originalUrl) || 
            originalUrl.includes(currentUrl)) {
          
          // 构建新的图片语法
          let newImageSyntax = `${altText}(${newUrl}`;
          if (title) {
            newImageSyntax += ` "${title}"`;
          }
          newImageSyntax += ')';
          
          // 替换整行
          const updatedLine = originalLine.replace(markdownImageRegex, newImageSyntax);
          lines[lineIndex] = updatedLine;
          
          console.log(`    成功更新: ${originalLine} -> ${updatedLine}`);
        } else {
          console.warn(`    URL不匹配: 当前URL=${currentUrl}, 原始URL=${originalUrl}`);
        }
      } else {
        // 方法2：检查是否为 [Pasted ~X lines] 格式的图片引用
        // 这种格式常见于某些笔记软件粘贴的图片
        const pastedImageRegex = /^(\s*)(\[Pasted\s+~\d+\s+lines\])(\s*)$/;
        const pastedMatch = originalLine.match(pastedImageRegex);
        
        if (pastedMatch) {
          console.log(`    检测到 [Pasted ~X lines] 格式的图片引用: ${originalLine}`);
          
          // 替换为标准的Markdown图片语法
          const altText = `图片 ${update.imageRef.filename || 'image'}`;
          const newImageSyntax = `${pastedMatch[1]}![${altText}](${newUrl})${pastedMatch[3]}`;
          
          // 替换整行
          lines[lineIndex] = newImageSyntax;
          
          console.log(`    成功替换 [Pasted] 格式: ${originalLine} -> ${newImageSyntax}`);
        } else {
          // 检查是否为包含 [Pasted ~X lines] 的行（非整行匹配）
          const containsPastedRegex = /(\[Pasted\s+~\d+\s+lines\])/;
          const containsPastedMatch = originalLine.match(containsPastedRegex);
          
          if (containsPastedMatch) {
            console.log(`    检测到包含 [Pasted ~X lines] 的行: ${originalLine}`);
            
            // 替换为标准的Markdown图片语法
            const altText = `图片 ${update.imageRef.filename || 'image'}`;
            const newImageSyntax = `![${altText}](${newUrl})`;
            
            // 只替换 [Pasted ~X lines] 部分
            const updatedLine = originalLine.replace(containsPastedRegex, newImageSyntax);
            lines[lineIndex] = updatedLine;
            
            console.log(`    成功替换包含的 [Pasted] 格式: ${originalLine} -> ${updatedLine}`);
          } else {
            // 方法3：如果正则匹配失败，使用字符串替换（回退方案）
            console.warn(`    无法解析Markdown图片语法，使用字符串替换: ${originalLine}`);
            
            // 转义特殊字符用于正则表达式
            const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const urlRegex = new RegExp(escapedUrl, 'g');
            
            if (urlRegex.test(originalLine)) {
              const updatedLine = originalLine.replace(urlRegex, newUrl);
              lines[lineIndex] = updatedLine;
              console.log(`    字符串替换成功: ${updatedLine}`);
            } else {
              console.error(`    无法找到URL进行替换: ${originalUrl}`);
            }
          }
        }
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * 处理单个文件中的图片
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 * @param {Object} namingInfo - 命名信息
 * @returns {Promise<Object>} 处理结果
 */
async function processImagesInFile(filePath, content, namingInfo) {
  const result = {
    filePath,
    imageCount: 0,
    processedCount: 0,
    failedCount: 0,
    updatedContent: content,
    imageUpdates: []
  };
  
  // 提取图片引用
  const imageRefs = extractImageReferences(content, filePath);
  result.imageCount = imageRefs.length;
  
  if (imageRefs.length === 0) {
    return result;
  }
  
  // 处理每张图片
  for (let i = 0; i < imageRefs.length; i++) {
    const imageRef = imageRefs[i];
    
    try {
      // 复制图片到新位置
      const copyResult = await copyImageToNewLocation(imageRef, namingInfo, i + 1);
      
      const updateInfo = {
        imageRef,
        success: copyResult.success,
        newUrl: copyResult.newUrl,
        newPath: copyResult.newPath,
        error: copyResult.error,
        lineNumber: imageRef.lineNumber
      };
      
      result.imageUpdates.push(updateInfo);
      
      if (copyResult.success) {
        result.processedCount++;
      } else {
        result.failedCount++;
        console.warn(`图片处理失败: ${copyResult.error}`);
      }
    } catch (error) {
      result.failedCount++;
      console.error(`处理图片时发生错误:`, error);
    }
  }
  
  // 更新Markdown内容中的图片路径
  if (result.processedCount > 0) {
    result.updatedContent = updateImagePathsInContent(content, result.imageUpdates);
  }
  
  return result;
}

/**
 * 批量处理多个文件中的图片
 * @param {Array} files - 文件数组
 * @param {Object} namingInfo - 命名信息
 * @returns {Promise<Array>} 处理结果数组
 */
async function processImagesInFiles(files, namingInfo) {
  const results = [];
  
  for (const file of files) {
    const result = await processImagesInFile(file.filePath, file.content, namingInfo);
    results.push(result);
  }
  
  return results;
}

/**
 * 生成图片处理报告
 * @param {Array} results - 处理结果数组
 * @returns {string} 报告文本
 */
function generateImageProcessingReport(results) {
  let report = "图片处理报告\n";
  report += "=".repeat(50) + "\n\n";
  
  let totalImages = 0;
  let totalProcessed = 0;
  let totalFailed = 0;
  let totalFiles = results.length;
  
  for (const result of results) {
    totalImages += result.imageCount;
    totalProcessed += result.processedCount;
    totalFailed += result.failedCount;
    
    report += `文件: ${path.basename(result.filePath)}\n`;
    report += `  图片总数: ${result.imageCount}\n`;
    report += `  成功处理: ${result.processedCount}\n`;
    report += `  处理失败: ${result.failedCount}\n`;
    
    if (result.failedCount > 0) {
      for (const update of result.imageUpdates) {
        if (!update.success) {
          report += `    - ${update.error}\n`;
        }
      }
    }
    
    report += "\n";
  }
  
  report += "汇总统计:\n";
  report += `  处理文件数: ${totalFiles}\n`;
  report += `  图片总数: ${totalImages}\n`;
  report += `  成功处理: ${totalProcessed}\n`;
  report += `  处理失败: ${totalFailed}\n`;
  report += `  成功率: ${totalImages > 0 ? ((totalProcessed / totalImages) * 100).toFixed(1) : 0}%\n`;
  
  return report;
}

module.exports = {
  imageManagerConfig,
  extractImageReferences,
  parseImagePath,
  generateNewImageName,
  sanitizeForFilename,
  copyImageToNewLocation,
  updateImagePathsInContent,
  processImagesInFile,
  processImagesInFiles,
  generateImageProcessingReport
};