/**
 * 增强版知识库整理主模块
 * 整合图片处理功能的完整解决方案
 */

const path = require('path');
const enhancedParser = require('./enhanced_parser');
const enhancedOrganizer = require('./enhanced_organizer');
const imageManager = require('./image_manager');
const classificationAlgorithm = require('./classification_algorithm');
const contentOrganizer = require('./content_organizer');

/**
 * 增强版知识库整理主函数
 * @param {Object} config - 配置对象
 * @param {Object} tools - 工具对象（read, write, bash, glob等）
 * @returns {Promise<Object>} 整理结果
 */
async function organizeKnowledgeBaseEnhanced(config, tools) {
  console.log("开始增强版知识库整理...");
  console.log(`源目录: ${config.sourceDir}`);
  console.log(`输出目录: ${config.outputDir}`);
  console.log(`图片保存目录: ${config.imageBaseDir || imageManager.imageManagerConfig.imageBaseDir}`);
  
  try {
    // 1. 查找所有 .md 文件
    const mdFiles = await findMarkdownFilesEnhanced(config.sourceDir, tools.glob, config.excludePatterns);
    console.log(`找到 ${mdFiles.length} 个Markdown文件`);
    
    if (mdFiles.length === 0) {
      console.warn("未找到任何Markdown文件，请检查源目录路径");
      return { success: false, error: "未找到Markdown文件" };
    }
    
    // 2. 读取并解析文件内容（增强版，提取图片信息）
    const fileContents = await enhancedParser.parseFilesEnhanced(mdFiles, tools, config);
    console.log(`解析了 ${fileContents.length} 个文件`);
    
    // 3. 主题识别（基于标题层级）
    const themes = identifyThemesByHeadingsEnhanced(fileContents, config);
    console.log(`识别出 ${themes.length} 个主题`);
    
    // 4. 自动分类主题
    const classifiedThemes = classificationAlgorithm.classifyThemes(themes, {
      autoClassify: config.autoClassify !== false
    });
    
    // 5. 处理图片（如果启用）
    let processedFiles = fileContents;
    let imageSummary = null;
    
    if (config.processImages !== false) {
      console.log("\n开始处理图片...");
      
      // 为每个文件准备命名信息
      const namingInfo = prepareNamingInfo(config, classifiedThemes);
      
      // 处理图片
      processedFiles = await enhancedParser.processImagesInParsedFiles(
        fileContents,
        namingInfo,
        tools
      );
      
      // 生成图片处理摘要
      imageSummary = enhancedParser.generateImageProcessingSummary(processedFiles);
      
      console.log(`图片处理完成: ${imageSummary.totalProcessed} 张成功, ${imageSummary.totalFailed} 张失败`);
    }
    
    // 6. 内容整合（按主题组织，包含已更新的图片路径）
    const organizedContent = await enhancedOrganizer.organizeContentByThemeEnhanced(
      classifiedThemes,
      processedFiles,
      config,
      prepareNamingInfo(config, classifiedThemes),
      tools
    );
    
    console.log(`整合了 ${organizedContent.categories.reduce((sum, cat) => sum + cat.themes.length, 0)} 个主题的内容`);
    
    // 7. 生成输出文件（增强版，包含图片信息）
    await enhancedOrganizer.generateOutputFilesEnhanced(
      organizedContent,
      config.outputDir,
      tools,
      imageSummary
    );
    
    // 8. 生成最终报告
    const finalReport = generateFinalReport(organizedContent, imageSummary, config);
    
    console.log("\n" + "=".repeat(70));
    console.log("增强版知识库整理完成！");
    console.log("=".repeat(70));
    
    return {
      success: true,
      organizedContent,
      imageSummary,
      finalReport,
      stats: {
        totalFiles: mdFiles.length,
        totalThemes: themes.length,
        totalCategories: Object.keys(classifiedThemes).length,
        totalImages: imageSummary ? imageSummary.totalImages : 0
      }
    };
    
  } catch (error) {
    console.error("整理过程中发生错误:", error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * 查找所有Markdown文件（增强版）
 */
async function findMarkdownFilesEnhanced(sourceDir, globTool, excludePatterns = []) {
  try {
    const mdFiles = await globTool({
      pattern: "**/*.md",
      path: sourceDir,
      ignore: ["**/node_modules/**", "**/.git/**", ...excludePatterns]
    });
    
    return mdFiles;
  } catch (error) {
    console.warn(`查找文件时出错: ${error.message}`);
    return [];
  }
}

/**
 * 基于标题层级识别主题（增强版）
 */
function identifyThemesByHeadingsEnhanced(parsedFiles, config) {
  const themes = new Map();
  
  for (const file of parsedFiles) {
    // 提取H1和H2标题作为潜在主题
    const mainHeadings = file.headings.filter(h => h.level <= 2);
    
    for (const heading of mainHeadings) {
      const themeName = normalizeThemeNameEnhanced(heading.text);
      
      if (!themeName || themeName.length < 2) {
        continue; // 跳过无效的主题名
      }
      
      if (!themes.has(themeName)) {
        themes.set(themeName, {
          name: themeName,
          files: [],
          headings: [],
          content: [],
          sourceFiles: new Set(),
          imageCount: 0 // 新增：图片统计
        });
      }
      
      const theme = themes.get(themeName);
      theme.files.push(file.filePath);
      theme.headings.push(heading);
      theme.sourceFiles.add(file.filePath);
      
      // 提取该标题下的内容
      const sectionContent = extractSectionContentEnhanced(file.content, heading);
      theme.content.push({
        sourceFile: file.filePath,
        heading: heading,
        content: sectionContent,
        fileName: file.fileName,
        imageRefs: file.imageRefs // 新增：传递图片引用
      });
      
      // 统计主题中的图片数量
      if (file.imageRefs && file.imageRefs.length > 0) {
        theme.imageCount += file.imageRefs.length;
      }
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
 * 规范化主题名（增强版）
 */
function normalizeThemeNameEnhanced(name) {
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
 * 提取章节内容（增强版）
 */
function extractSectionContentEnhanced(content, heading) {
  const lines = content.split('\n');
  let sectionContent = '';
  
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
 * 准备命名信息
 */
function prepareNamingInfo(config, classifiedThemes) {
  return {
    imageBaseDir: config.imageBaseDir || imageManager.imageManagerConfig.imageBaseDir,
    namingPattern: config.imageNamingPattern || imageManager.imageManagerConfig.namingPattern,
    outputDir: config.outputDir,
    // 默认分类信息，实际处理时会根据具体文件确定
    category: "general",
    theme: "未命名主题",
    knowledge: "未命名知识点"
  };
}

/**
 * 生成最终报告
 */
function generateFinalReport(organizedContent, imageSummary, config) {
  const report = {
    timestamp: new Date().toISOString(),
    config: {
      sourceDir: config.sourceDir,
      outputDir: config.outputDir,
      processImages: config.processImages !== false
    },
    summary: {
      categories: organizedContent.categories.length,
      themes: organizedContent.categories.reduce((sum, cat) => sum + cat.themes.length, 0),
      totalFiles: organizedContent.categories.reduce((sum, cat) => 
        sum + cat.themes.reduce((tSum, theme) => tSum + theme.fileCount, 0), 0
      )
    }
  };
  
  if (imageSummary) {
    report.imageProcessing = {
      totalImages: imageSummary.totalImages,
      processedImages: imageSummary.totalProcessed,
      failedImages: imageSummary.totalFailed,
      successRate: imageSummary.processingRate
    };
  }
  
  // 添加分类统计
  report.categories = organizedContent.categories.map(category => ({
    name: category.name,
    description: category.description,
    themeCount: category.themes.length,
    imageCount: category.themes.reduce((sum, theme) => sum + (theme.imageCount || 0), 0)
  }));
  
  return report;
}

/**
 * 默认配置
 */
const defaultConfig = {
  // 必需参数
  sourceDir: null,
  
  // 可选参数
  outputDir: null, // 默认：sourceDir + "_organized"
  themeRecognition: "heading",
  deduplicate: true,
  preserveCodeBlocks: true,
  keepOriginalFormatting: true,
  excludePatterns: [],
  autoClassify: true,
  
  // 图片处理配置
  processImages: true,
  imageBaseDir: "/home/zilo/kb/imgs",
  imageNamingPattern: "{category}-{theme}-{knowledge}-{index}",
  keepOriginalImages: false,
  supportedImageExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp']
};

/**
 * 合并配置
 */
function mergeConfig(userConfig) {
  return {
    ...defaultConfig,
    ...userConfig,
    // 确保输出目录有默认值
    outputDir: userConfig.outputDir || `${userConfig.sourceDir}_organized`
  };
}

/**
 * 导出API
 */
module.exports = {
  organizeKnowledgeBaseEnhanced,
  mergeConfig,
  defaultConfig,
  
  // 子模块
  enhancedParser,
  enhancedOrganizer,
  imageManager,
  classificationAlgorithm,
  contentOrganizer,
  
  // 工具函数
  findMarkdownFilesEnhanced,
  identifyThemesByHeadingsEnhanced,
  normalizeThemeNameEnhanced,
  extractSectionContentEnhanced,
  prepareNamingInfo,
  generateFinalReport
};