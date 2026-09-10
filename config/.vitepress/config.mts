import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/myBlog/',
  srcDir: '../docs',

  // 自动用 git commit 时间作为「最后更新时间」显示在每篇文章底部
  // 文档：https://vitepress.dev/reference/site-config#lastupdated
  lastUpdated: true,

  title: 'My blog',
  description: '一个记录技术、思考与生活的小站。',

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config

    // ================= 顶部导航栏（含下拉）=================
    nav: [
      { text: '🏠 首页', link: '/' },
      { text: '前端',    link: '/frontend/' },
      { text: '后端',    link: '/backend/' },
      { text: 'Linux',   link: '/linux/' },
      { text: '算法',    link: '/algorithm/' },
      { text: '中间件',  link: '/middleware/' },
      {
        text: '数据库',
        items: [
          { text: '数据库总览',   link: '/database/' },
          { text: 'MySQL 专题',  link: '/database/mysql/' },
          { text: 'Redis 专题',  link: '/database/redis/' },
        ],
      },
      { text: '设计模式', link: '/design-mode/' },
      {
        text: '笔记',
        items: [
          { text: '笔记总览',       link: '/notes/' },
          { text: 'Markdown 教程',  link: '/notes/markdown-tutorial/' },
          { text: '互动组件',       link: '/notes/learning-components/' },
        ],
      },
    ],

    // ================= 左侧侧边栏：按目录分组 =================
    sidebar: {
      '/algorithm/': [
        {
          text: 'JavaScript 算法沙盒',
          items: [
            { text: '总览与运行边界', link: '/algorithm/' },
            { text: '两数之和：从双循环到哈希表', link: '/algorithm/two-sum' },
            { text: '二分查找：让搜索区间持续减半', link: '/algorithm/binary-search' },
          ],
        },
      ],
      '/linux/': [
        {
          text: 'Linux 从入门到高级',
          items: [
            { text: '学习路线与实验环境', link: '/linux/' },
            { text: '入门：命令行与文件', link: '/linux/basics' },
            { text: '进阶：系统管理', link: '/linux/administration' },
            { text: '实战：Shell 自动化', link: '/linux/automation' },
            { text: '高级：性能与故障排查', link: '/linux/advanced' },
          ],
        },
      ],
      // ----- 前端 -----
      '/frontend/': [
        {
          text: '前端开发笔记',
          items: [
            { text: '📘 前端总览',         link: '/frontend/' },
            { text: '前端入门',            link: '/frontend/getting-started' },
            { text: 'Vue 基础',            link: '/frontend/vue-basics' },
            { text: '工程化实践',          link: '/frontend/tooling' },
            { text: '纯前端算法沙盒实战',  link: '/frontend/algorithm-sandbox' },
          ],
        },
      ],

      // ----- 后端 -----
      '/backend/': [
        {
          text: '后端开发笔记',
          items: [
            { text: '📘 后端总览',         link: '/backend/' },
            { text: 'Node.js 入门',       link: '/backend/nodejs-basics' },
            { text: 'RESTful API 设计',   link: '/backend/restful-api' },
            { text: '鉴权与会话',         link: '/backend/auth' },
          ],
        },
      ],

      // ----- 中间件 -----
      '/middleware/': [
        {
          text: '中间件笔记',
          items: [
            { text: '📘 中间件总览',       link: '/middleware/' },
            { text: 'Nginx 反向代理',     link: '/middleware/nginx' },
            { text: 'Express/Koa 中间件', link: '/middleware/express-koa' },
            { text: '消息队列基础',       link: '/middleware/mq' },
          ],
        },
      ],

      // ----- 数据库（父目录总览）-----
      '/database/': [
        {
          text: '数据库',
          items: [
            { text: '🗄️ 数据库总览',    link: '/database/' },
            { text: 'MySQL 专题',        link: '/database/mysql/' },
            { text: 'Redis 专题',        link: '/database/redis/' },
          ],
        },
      ],

      // ----- MySQL（子目录自己的 sidebar）-----
      '/database/mysql/': [
        {
          text: '🗄️ 数据库总览',
          items: [
            { text: '← 返回数据库总览',  link: '/database/' },
            { text: 'MySQL 专题入口',    link: '/database/mysql/' },
          ],
        },
        {
          text: 'MySQL 专题',
          items: [
            { text: '索引底层原理',      link: '/database/mysql/indexing' },
            { text: '事务 ACID 与 MVCC', link: '/database/mysql/transaction' },
            { text: 'SQL 优化与慢查询',  link: '/database/mysql/optimize' },
          ],
        },
      ],

      // ----- Redis（子目录自己的 sidebar）-----
      '/database/redis/': [
        {
          text: '🗄️ 数据库总览',
          items: [
            { text: '← 返回数据库总览',  link: '/database/' },
            { text: 'Redis 专题入口',    link: '/database/redis/' },
          ],
        },
        {
          text: 'Redis 专题',
          items: [
            { text: '数据类型与场景',    link: '/database/redis/data-types' },
            { text: 'RDB vs AOF',        link: '/database/redis/persistence' },
            { text: '穿透 / 击穿 / 雪崩', link: '/database/redis/cache-problems' },
          ],
        },
      ],

      // ----- 设计模式 -----
      '/design-mode/': [
        {
          text: '设计模式',
          items: [
            { text: '📘 设计模式总览',   link: '/design-mode/' },
            { text: '单例模式',          link: '/design-mode/singleton' },
            { text: '工厂模式',          link: '/design-mode/factory' },
            { text: '观察者模式',        link: '/design-mode/observer' },
          ],
        },
      ],

      // ----- 笔记（父目录）-----
      '/notes/': [
        {
          text: '笔记合集',
          items: [
            { text: '📝 笔记总览',       link: '/notes/' },
            { text: 'Markdown 教程',     link: '/notes/markdown-tutorial/' },
            { text: '互动组件',          link: '/notes/learning-components/' },
          ],
        },
      ],

      // ----- 互动组件（子目录）-----
      '/notes/learning-components/': [
        {
          text: '📝 笔记总览',
          items: [
            { text: '← 返回笔记总览',    link: '/notes/' },
            { text: '组件总览',          link: '/notes/learning-components/' },
          ],
        },
        {
          text: '互动组件',
          items: [
            { text: 'Tabs',       link: '/notes/learning-components/tabs' },
            { text: 'Slider',     link: '/notes/learning-components/slider' },
            { text: 'Counter',    link: '/notes/learning-components/counter' },
            { text: 'Steps',      link: '/notes/learning-components/steps' },
            { text: 'FlipCard',   link: '/notes/learning-components/flip-card' },
            { text: 'Quiz',       link: '/notes/learning-components/quiz' },
            { text: 'Popover',    link: '/notes/learning-components/popover' },
            // components:end（new-component.mjs 在此前插入新组件链接）
          ],
        },
      ],

      // ----- Markdown 教程（子目录）-----
      '/notes/markdown-tutorial/': [
        {
          text: '📝 笔记总览',
          items: [
            { text: '← 返回笔记总览',    link: '/notes/' },
            { text: '教程总览',          link: '/notes/markdown-tutorial/' },
          ],
        },
        {
          text: 'Markdown + VitePress 教程',
          items: [
            { text: '第 1 章 · 基础语法',         link: '/notes/markdown-tutorial/1-basics' },
            { text: '第 2 章 · 高级语法',         link: '/notes/markdown-tutorial/2-advanced' },
            { text: '第 3 章 · VitePress 专属',   link: '/notes/markdown-tutorial/3-vitepress' },
          ],
        },
      ],

      // ================= 兜底：首页 / 根目录下 md（markdown-examples 等）=================
      '/': [
        {
          text: '其他示例',
          items: [
            { text: 'Markdown 语法扩展', link: '/markdown-examples' },
            { text: 'API 示例',          link: '/api-examples' },
          ],
        },
      ],
    },

    // 大纲展开到第 2、3 级标题
    outline: [2, 3],

    // 「最后更新」文案中文化 + 时间格式（带时分秒 + ISO 时区）
    lastUpdated: {
      text: '📝 最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium',
      },
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/tuhardy/myBlog' },
    ],

    footer: {
      message: '明日复明日，明日何其多。',
      copyright: `Copyright© ${new Date().getFullYear()} My Blog`,
    },
  },
})
