/**
 * 内容组织器 - 确保知识点按多级标题组织
 */

/**
 * 保持多级标题结构的内容组织
 * @param {Array} sections - 章节数组
 * @param {Object} options - 配置选项
 * @returns {string} 组织好的内容
 */
function organizeContentWithHierarchy(sections, options = {}) {
  const {
    preserveHeadingLevels = true,
    maxHeadingLevel = 3,
    addSeparators = true
  } = options;
  
  let organizedContent = "";
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // 添加来源标记
    organizedContent += `<!-- 来源文件: ${section.fileName} -->\n\n`;
    
    // 处理标题层级
    let headingLevel = section.heading.level;
    if (preserveHeadingLevels) {
      // 保持原始层级，但限制最高级别
      headingLevel = Math.min(headingLevel, maxHeadingLevel);
    } else {
      // 标准化为H2级别
      headingLevel = 2;
    }
    
    const headingPrefix = "#".repeat(headingLevel);
    organizedContent += `${headingPrefix} ${section.heading.text}\n\n`;
    
    // 添加内容
    organizedContent += section.content + "\n\n";
    
    // 添加分隔线
    if (addSeparators && i < sections.length - 1) {
      organizedContent += "---\n\n";
    }
  }
  
  return organizedContent;
}

/**
 * 提取并组织知识点
 * @param {string} content - 原始内容
 * @returns {Object} 组织好的知识点结构
 */
function extractAndOrganizeKnowledgePoints(content) {
  const lines = content.split('\n');
  const knowledgeStructure = {
    mainTopics: [],
    subtopics: [],
    details: []
  };
  
  let currentTopic = null;
  let currentSubtopic = null;
  
  for (const line of lines) {
    // 匹配H1标题（主要主题）
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      currentTopic = {
        title: h1Match[1].trim(),
        content: ""
      };
      knowledgeStructure.mainTopics.push(currentTopic);
      currentSubtopic = null;
      continue;
    }
    
    // 匹配H2标题（子主题/知识点）
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      currentSubtopic = {
        title: h2Match[1].trim(),
        content: "",
        parent: currentTopic ? currentTopic.title : null
      };
      knowledgeStructure.subtopics.push(currentSubtopic);
      continue;
    }
    
    // 匹配H3标题（详细知识点）
    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      const detail = {
        title: h3Match[1].trim(),
        content: "",
        parent: currentSubtopic ? currentSubtopic.title : null
      };
      knowledgeStructure.details.push(detail);
      continue;
    }
    
    // 收集内容
    if (currentTopic && !h1Match && !h2Match && !h3Match) {
      if (line.trim()) {
        if (currentSubtopic) {
          currentSubtopic.content += line + "\n";
        } else {
          currentTopic.content += line + "\n";
        }
      }
    }
  }
  
  return knowledgeStructure;
}

/**
 * 生成知识结构树
 * @param {Object} knowledgeStructure - 知识结构
 * @returns {string} 树形结构文本
 */
function generateKnowledgeTree(knowledgeStructure) {
  let tree = "知识结构树：\n\n";
  
  for (const topic of knowledgeStructure.mainTopics) {
    tree += `├── ${topic.title}\n`;
    
    // 查找属于此主题的子主题
    const subtopics = knowledgeStructure.subtopics.filter(s => s.parent === topic.title);
    for (let i = 0; i < subtopics.length; i++) {
      const subtopic = subtopics[i];
      const isLast = i === subtopics.length - 1;
      const prefix = isLast ? "└── " : "├── ";
      
      tree += `│   ${prefix} ${subtopic.title}\n`;
      
      // 查找属于此子主题的详细知识点
      const details = knowledgeStructure.details.filter(d => d.parent === subtopic.title);
      for (let j = 0; j < details.length; j++) {
        const detail = details[j];
        const isLastDetail = j === details.length - 1;
        const detailPrefix = isLast ? "    " : "│   ";
        const detailMarker = isLastDetail ? "└── " : "├── ";
        
        tree += `${detailPrefix} ${detailMarker} ${detail.title}\n`;
      }
    }
  }
  
  return tree;
}

/**
 * 验证标题层级完整性
 * @param {string} content - 内容文本
 * @returns {Object} 验证结果
 */
function validateHeadingHierarchy(content) {
  const lines = content.split('\n');
  const errors = [];
  const warnings = [];
  
  let lastLevel = 0;
  let lineNumber = 0;
  
  for (const line of lines) {
    lineNumber++;
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      
      // 检查层级跳跃
      if (level > lastLevel + 1 && lastLevel > 0) {
        warnings.push(`第${lineNumber}行: 标题层级跳跃 (H${lastLevel} → H${level}) - "${text}"`);
      }
      
      lastLevel = level;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    headingCount: content.match(/^#{1,6}\s+/gm)?.length || 0
  };
}

/**
 * 优化标题层级
 * @param {string} content - 内容文本
 * @param {Object} options - 配置选项
 * @returns {string} 优化后的内容
 */
function optimizeHeadingHierarchy(content, options = {}) {
  const {
    normalize = true,
    minLevel = 1,
    maxLevel = 3
  } = options;
  
  const lines = content.split('\n');
  let result = [];
  let headingStack = [];
  
  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      let level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      
      if (normalize) {
        // 调整层级到指定范围
        level = Math.max(minLevel, Math.min(level, maxLevel));
        
        // 确保层级连续性
        if (headingStack.length > 0) {
          const lastLevel = headingStack[headingStack.length - 1];
          if (level > lastLevel + 1) {
            level = lastLevel + 1;
          }
        }
        
        headingStack.push(level);
        result.push(`${"#".repeat(level)} ${text}`);
      } else {
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

module.exports = {
  organizeContentWithHierarchy,
  extractAndOrganizeKnowledgePoints,
  generateKnowledgeTree,
  validateHeadingHierarchy,
  optimizeHeadingHierarchy
};