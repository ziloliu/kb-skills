/**
 * 测试优化后的知识库整理功能
 */

const { classifyThemes } = require('./classification_algorithm');
const { organizeContentByThemeOptimized, generateThemeFileOptimized } = require('./file_generator');
const { organizeContentWithHierarchy, validateHeadingHierarchy } = require('./content_organizer');

/**
 * 测试分类识别功能
 */
function testClassification() {
  console.log('=== 测试分类识别功能 ===');
  
  const mockThemes = [
    {
      name: 'STM32开发环境搭建',
      content: [
        { content: 'STM32开发环境配置指南，包含ARM工具链安装。' },
        { content: 'VSCode配置和插件安装。' }
      ]
    },
    {
      name: 'Python基础语法',
      content: [
        { content: 'Python变量、数据类型和基本语法。' }
      ]
    },
    {
      name: 'Linux常用命令',
      content: [
        { content: 'ls, cd, cp, mv等常用命令。' }
      ]
    },
    {
      name: '学习笔记模板',
      content: [
        { content: '通用的学习笔记模板格式。' }
      ]
    }
  ];
  
  const config = {
    autoClassify: true
  };
  
  const result = classifyThemes(mockThemes, config);
  
  console.log('分类结果:');
  for (const category in result) {
    console.log(`  ${category}: ${result[category].themes.length}个主题`);
    result[category].themes.forEach(theme => {
      console.log(`    - ${theme.name}`);
    });
  }
  
  // 验证分类结果
  const expectedCategories = ['technology', 'programming', 'system', 'general'];
  let allPassed = true;
  
  for (const category of expectedCategories) {
    if (result[category] && result[category].themes.length > 0) {
      console.log(`✓ ${category} 分类正确`);
    } else {
      console.log(`✗ ${category} 分类缺失或为空`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

/**
 * 测试多级标题组织功能
 */
function testHeadingHierarchy() {
  console.log('\n=== 测试多级标题组织功能 ===');
  
  const testContent = `# 主标题

## 子标题1

### 详细内容1.1

这是详细内容。

## 子标题2

### 详细内容2.1

这是另一个详细内容。

### 详细内容2.2

更多内容。`;
  
  const validation = validateHeadingHierarchy(testContent);
  
  console.log('标题层级验证结果:');
  console.log(`  是否有效: ${validation.isValid ? '✓' : '✗'}`);
  console.log(`  标题数量: ${validation.headingCount}`);
  
  if (validation.errors.length > 0) {
    console.log('  错误:');
    validation.errors.forEach(error => console.log(`    ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    console.log('  警告:');
    validation.warnings.forEach(warning => console.log(`    ${warning}`));
  }
  
  // 测试内容组织
  const mockSections = [
    {
      fileName: 'test1.md',
      heading: { level: 2, text: '开发环境' },
      content: '### 硬件要求\n\n1. 开发板\n2. 调试器'
    },
    {
      fileName: 'test2.md',
      heading: { level: 3, text: '软件配置' },
      content: '需要安装以下软件...'
    }
  ];
  
  const organized = organizeContentWithHierarchy(mockSections, {
    preserveHeadingLevels: true,
    maxHeadingLevel: 3
  });
  
  console.log('\n内容组织结果:');
  console.log(organized.substring(0, 200) + '...');
  
  return validation.isValid;
}

/**
 * 测试主题文件生成功能
 */
function testThemeFileGeneration() {
  console.log('\n=== 测试主题文件生成功能 ===');
  
  const mockTheme = {
    name: 'STM32开发环境搭建',
    content: `## 开发环境

### 硬件要求

1. STM32开发板
2. ST-Link调试器

### 软件要求

- Ubuntu系统
- ARM工具链`,
    sourceFiles: ['file1.md', 'file2.md'],
    sectionCount: 2,
    fileCount: 2
  };
  
  const mockCategory = {
    name: 'technology',
    description: '嵌入式开发与技术工具'
  };
  
  const generatedContent = generateThemeFileOptimized(mockTheme, mockCategory);
  
  console.log('生成的主题文件内容预览:');
  console.log(generatedContent.substring(0, 300) + '...');
  
  // 验证生成内容包含关键部分
  const checks = [
    { check: generatedContent.includes('# STM32开发环境搭建'), description: '包含主题标题' },
    { check: generatedContent.includes('**分类**: 嵌入式开发与技术工具'), description: '包含分类信息' },
    { check: generatedContent.includes('## 概述'), description: '包含概述部分' },
    { check: generatedContent.includes('## 文档信息'), description: '包含文档信息' },
    { check: generatedContent.includes('开发环境'), description: '包含主要内容' }
  ];
  
  let allPassed = true;
  checks.forEach(({ check, description }) => {
    if (check) {
      console.log(`✓ ${description}`);
    } else {
      console.log(`✗ ${description}`);
      allPassed = false;
    }
  });
  
  return allPassed;
}

/**
 * 测试内容整合功能
 */
function testContentIntegration() {
  console.log('\n=== 测试内容整合功能 ===');
  
  const mockClassifiedThemes = {
    technology: {
      name: 'technology',
      description: '技术类',
      themes: [
        {
          name: '测试主题',
          content: [
            {
              sourceFile: 'test1.md',
              fileName: 'test1.md',
              heading: { level: 2, text: '第一部分' },
              content: '这是第一部分内容。'
            },
            {
              sourceFile: 'test2.md',
              fileName: 'test2.md',
              heading: { level: 3, text: '第二部分' },
              content: '这是第二部分内容。'
            }
          ],
          sourceFiles: new Set(['test1.md', 'test2.md'])
        }
      ]
    }
  };
  
  const config = {
    deduplicate: false
  };
  
  const organized = organizeContentByThemeOptimized(mockClassifiedThemes, [], config);
  
  console.log('内容整合结果:');
  console.log(`  分类数量: ${organized.categories.length}`);
  
  if (organized.categories.length > 0) {
    const category = organized.categories[0];
    console.log(`  分类名称: ${category.name}`);
    console.log(`  主题数量: ${category.themes.length}`);
    
    if (category.themes.length > 0) {
      const theme = category.themes[0];
      console.log(`  主题名称: ${theme.name}`);
      console.log(`  章节数: ${theme.sectionCount}`);
      console.log(`  源文件数: ${theme.fileCount}`);
      
      // 检查内容是否包含多级标题
      const hasH2 = theme.content.includes('## 第一部分');
      const hasH3 = theme.content.includes('### 第二部分');
      
      console.log(`  包含H2标题: ${hasH2 ? '✓' : '✗'}`);
      console.log(`  包含H3标题: ${hasH3 ? '✓' : '✗'}`);
      
      return hasH2 && hasH3;
    }
  }
  
  return false;
}

/**
 * 运行所有测试
 */
function runAllTests() {
  console.log('开始测试优化后的知识库整理功能\n');
  
  const tests = [
    { name: '分类识别', test: testClassification },
    { name: '标题层级', test: testHeadingHierarchy },
    { name: '主题文件生成', test: testThemeFileGeneration },
    { name: '内容整合', test: testContentIntegration }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(({ name, test }) => {
    try {
      const result = test();
      if (result) {
        console.log(`\n${name}测试: ✓ 通过\n`);
        passed++;
      } else {
        console.log(`\n${name}测试: ✗ 失败\n`);
        failed++;
      }
    } catch (error) {
      console.log(`\n${name}测试: ✗ 错误 - ${error.message}\n`);
      failed++;
    }
  });
  
  console.log('=== 测试总结 ===');
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);
  console.log(`总计: ${tests.length}`);
  
  return failed === 0;
}

// 运行测试
if (require.main === module) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}

module.exports = {
  testClassification,
  testHeadingHierarchy,
  testThemeFileGeneration,
  testContentIntegration,
  runAllTests
};