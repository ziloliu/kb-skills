/**
 * 分类识别算法
 * 基于关键词和内容特征自动分类主题
 */

// 分类规则配置
const classificationRules = {
  // 技术类
  "technology": {
    keywords: ["STM32", "ARM", "嵌入式", "单片机", "微控制器", "开发环境", "工具链", "编译器", "调试器", "VSCode", "IDE", "插件", "配置", "安装", "部署"],
    description: "嵌入式开发与技术工具"
  },
  // 编程类
  "programming": {
    keywords: ["Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "算法", "数据结构", "设计模式", "框架", "库", "API", "SDK"],
    description: "编程语言与开发技术"
  },
  // 系统类
  "system": {
    keywords: ["Linux", "Ubuntu", "Windows", "macOS", "服务器", "运维", "网络", "安全", "权限", "用户", "进程", "服务", "配置"],
    description: "操作系统与系统管理"
  },
  // 前端类
  "frontend": {
    keywords: ["React", "Vue", "Angular", "HTML", "CSS", "JavaScript", "TypeScript", "组件", "UI", "UX", "响应式", "移动端", "浏览器", "DOM"],
    description: "前端开发与界面设计"
  },
  // 后端类
  "backend": {
    keywords: ["Node.js", "Express", "Django", "Flask", "Spring", "数据库", "MySQL", "PostgreSQL", "MongoDB", "Redis", "API", "微服务", "容器", "Docker"],
    description: "后端开发与服务器技术"
  },
  // 数据类
  "data": {
    keywords: ["数据分析", "数据科学", "机器学习", "人工智能", "统计", "可视化", "图表", "报表", "Excel", "SQL", "Pandas", "NumPy", "TensorFlow"],
    description: "数据分析与机器学习"
  },
  // 项目管理类
  "project": {
    keywords: ["项目管理", "敏捷", "Scrum", "看板", "文档", "需求", "测试", "部署", "版本控制", "Git", "CI/CD", "自动化"],
    description: "项目管理与开发流程"
  },
  // 默认分类
  "general": {
    keywords: [],
    description: "通用知识与笔记"
  }
};

/**
 * 自动分类主题
 * @param {Array} themes - 主题数组
 * @param {Object} config - 配置对象
 * @returns {Object} 分类后的主题
 */
function classifyThemes(themes, config = { autoClassify: true }) {
  if (!config.autoClassify) {
    return { "general": themes };
  }
  
  const classified = {};
  
  // 初始化分类
  for (const category in classificationRules) {
    classified[category] = {
      name: category,
      description: classificationRules[category].description,
      themes: []
    };
  }
  
  // 分类每个主题
  for (const theme of themes) {
    let bestCategory = "general";
    let bestScore = 0;
    
    // 计算每个分类的匹配分数
    for (const category in classificationRules) {
      const rules = classificationRules[category];
      let score = 0;
      
      // 关键词匹配
      for (const keyword of rules.keywords) {
        if (theme.name.toLowerCase().includes(keyword.toLowerCase())) {
          score += 3; // 主题名匹配权重更高
        }
        
        // 检查内容中的关键词
        for (const section of theme.content) {
          if (section.content.toLowerCase().includes(keyword.toLowerCase())) {
            score += 1;
          }
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }
    
    // 将主题添加到最佳分类
    classified[bestCategory].themes.push(theme);
  }
  
  // 过滤掉没有主题的分类
  const result = {};
  for (const category in classified) {
    if (classified[category].themes.length > 0) {
      result[category] = classified[category];
    }
  }
  
  return result;
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
 * 生成分类目录结构
 * @param {Object} classifiedThemes - 分类后的主题
 * @param {string} outputDir - 输出目录
 * @returns {Object} 目录结构
 */
function generateCategoryStructure(classifiedThemes, outputDir) {
  const structure = {
    baseDir: outputDir,
    categories: []
  };
  
  for (const category in classifiedThemes) {
    const categoryData = classifiedThemes[category];
    const categoryDir = `${outputDir}/${category}`;
    
    structure.categories.push({
      name: category,
      description: categoryData.description,
      directory: categoryDir,
      themeCount: categoryData.themes.length,
      themes: categoryData.themes.map(theme => ({
        name: theme.name,
        fileName: `${sanitizeFileName(theme.name)}.md`,
        filePath: `${categoryDir}/${sanitizeFileName(theme.name)}.md`
      }))
    });
  }
  
  return structure;
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

module.exports = {
  classificationRules,
  classifyThemes,
  extractKnowledgePoints,
  generateCategoryStructure,
  sanitizeFileName
};