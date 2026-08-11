# 恐龙教养故事网站

专为 4-6 岁儿童设计的教养故事网站，以拟人化恐龙为主角，涵盖礼貌、习惯、分享三大主题共 15 篇故事。每篇故事配有多段水彩风格插图 + AI 语音朗读，支持字号/语速调节和已读完标记。

## 运行环境要求

### 前端运行（必需）

| 环境 | 版本 | 说明 |
| :--- | :--- | :--- |
| Node.js | >= 18 | Vite 6 要求 |
| npm | >= 9 | 随 Node 安装 |

### TTS 音频生成（可选，仅在重新生成音频时需要）

| 环境 | 版本 | 说明 |
| :--- | :--- | :--- |
| Python | 3.10+ | 推荐 3.10.11 |
| pip | 最新版 | 安装依赖用 |
| virtualenv | - | 创建虚拟环境 |

> 音频文件已预生成并包含在仓库中（`public/audio/`），正常使用无需 Python 环境。

## 启动方式

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式（局域网可访问）

```bash
npm run dev
```

- 本机访问：http://localhost:5173/
- 局域网访问：http://<本机IP>:5173/（手机连同一 WiFi 即可访问）

### 3. 生产构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

### 4. 预览生产构建

```bash
npm run preview
```

### 5. TTS 音频重新生成（可选）

```bash
# 创建虚拟环境
virtualenv F:\venvs\tts_env
# 激活
F:\venvs\tts_env\Scripts\activate
# 安装依赖
pip install -r tts_gen/requirements.txt
# 设置 HuggingFace 镜像（国内必需）
set HF_ENDPOINT=https://hf-mirror.com
# 生成音频
python tts_gen/generate_audio.py
```

## 目录结构

```
3.Children story/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions 自动部署到 Pages
├── public/
│   ├── audio/                      # 62 个 TTS 音频文件（WAV，按故事分目录）
│   │   ├── manner-001/
│   │   │   ├── manner-001-1.wav
│   │   │   └── ...
│   │   ├── habit-001/
│   │   └── share-001/
│   └── stories/                    # 62 张故事插图（JPG，1152x864，4:3）
│       ├── manner-001-1.jpg
│       └── ...
├── src/
│   ├── assets/
│   │   └── main.css                # 全局样式
│   ├── data/
│   │   └── stories.js              # 15 篇故事数据（文本/图片/音频路径）
│   ├── router/
│   │   └── index.js                # Vue Router 配置（Hash 路由）
│   ├── utils/
│   │   ├── storage.js              # localStorage 持久化（字号/语速/已读完列表）
│   │   └── useSpeech.js            # 音频播放逻辑（new Audio + 段落高亮）
│   ├── views/
│   │   ├── HomeView.vue            # 首页（折叠分类 + 故事卡片 + 已读完徽章）
│   │   └── StoryView.vue           # 故事详情页（上图下文 + 播放控制 + 字号/语速切换）
│   ├── App.vue                     # 根组件
│   └── main.js                     # 应用入口
├── tests/
│   ├── test_storage.js             # storage.js 逻辑层单测（24 项）
│   ├── check_assets.js             # 资源完整性核对（图片/音频一一对应）
│   ├── test_stories_logic.js       # stories.js 辅助函数 + 分类导航逻辑测试
│   └── audit_mobile_compat.js      # 移动端浏览器兼容性代码审计
├── tts_gen/
│   ├── generate_audio.py           # Kokoro TTS 音频生成脚本
│   └── requirements.txt            # Python 依赖
├── .gitignore
├── index.html                      # HTML 入口
├── package.json
├── vite.config.js                  # Vite 配置（dev base '/' / production base '/dinosaur-story/'）
├── PROJECT_MEMORY.md               # 项目记忆文档（开发历程/技术决策/状态记录）
└── README.md
```

## 部署

### 方案 A：局域网部署

运行 `npm run dev`，手机连接同一 WiFi，访问 `http://<电脑IP>:5173/`。

### 方案 B：GitHub Pages

仓库地址：https://github.com/dlxxc/dinosaur-story
在线访问：https://dlxxc.github.io/dinosaur-story/

推送到 `master` 分支后，GitHub Actions 自动构建并部署。

## 技术栈

- **前端框架**：Vue 3 + Vue Router 4
- **构建工具**：Vite 6
- **TTS 引擎**：Kokoro 82M（音色 zf_xiaoyi，温柔女声）
- **音频格式**：WAV 24kHz
- **插图风格**：儿童绘本水彩风，4:3 横版
