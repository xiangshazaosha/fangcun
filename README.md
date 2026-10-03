# 方寸 FANGCUN｜互动演示制作 Skill

**非商业源码公开（Source-available），不是标准开源。** 自有代码、Skill、模板及其修改/衍生版本仅许可非商业使用；未经另行书面授权，**不得用于商业用途**，包括收费产品、付费制稿/培训/咨询及企业经营用途。完整条款见 [LICENSE](LICENSE)，边界和示例见 [许可说明](docs/licensing.md)。第三方组件依原许可证，不随本项目改为非商业许可。

把做互动演示稿的经验变成可复用的制作方法：**理解内容 → 五项需求 → 首页提炼 → 风格与互动 → 浏览器验收 → 可选离线交付**。

核心入口：[SKILL.md](.agents/skills/fangcun/SKILL.md)。项目自动发现 `.agents/skills` 的环境可调用 `$fangcun`；其他环境直接让制作 agent 阅读入口。无需安装到全局 skill 目录。

**这是制作用户演示稿的 skill 项目，不是一份送给 skill 作者的 PPT。** 五项需求是今后接到制作任务时，agent 向那位制作用户了解的内容；维护本项目不执行这份问卷，不自动打开测试样稿。

## 怎么用

> 使用 $fangcun，根据这些资料制作一份互动演示稿。先根据内容建议首页文字，开工需求问题不要超过五个。

已提供资料不重复问。最多确认：内容与场景、Logo、风格、动态背景、首页文字与开场。**Logo、背景与粒子开场必须主动询问**，用户已明确选择才免问，不能用默认值替代询问。Logo 可保留方寸、更换或不放；更换可以只给文字，由 agent 设计字标，不必上传图片。首页建议完整题名及 2–3 个粒子短词并允许自定义，在同一项选择保留粒子互动、简洁封面或直接进入内容。问过未答记 pending，不暗当作已确认。无额外模型。

## 已有能力

- 固定 1920×1080 舞台、逐项推进、键盘/点击/滚轮、控件事件隔离。
- 海洋风可运行启动包；透明玻璃风、双色风完整设计规范与代码参考（尚无预制全套启动包）。
- 可换词粒子：透视弯曲、点击散开、完整聚合后进入；实时海岸与三条锦鲤；稳定玻璃材质。
- 内容底稿、故事板、交互状态机、二维物理实验选型、减弱动效与本地离线交付方法。
- 从整套内容挑选游戏位置，必须有实质选择、后果反馈和重玩；含可复用判断挑战模块，不用切换按钮冒充全部互动。
- 需求预算、截图 QA、品牌去耦、依赖闭包、风格提炼与成品归档经验。

## 启动一个独立新稿

Python 3.10+，从仓库根运行：

```powershell
python .agents/skills/fangcun/scripts/new_deck.py --style ocean --output decks/my-topic --title "我的主题" --particle-text "探索" --homepage particles
python decks/my-topic/serve.py
```

默认不会加载背景或船模。`--homepage cover` 是简洁封面，`--homepage none` 直接正文。修改新稿 `deck.json` 后运行该目录的 `build_deck.py`。页码深链是零起点 `?page=0`。操作与目录说明由启动器生成在新稿 README 中。

自有视频/Logo：用 `--config` 指向完整 JSON，资源相对该 JSON 所在目录；`background=video` 必须有 video 和 poster。输出会复制所需文件，脱离原工作目录运行。

实时海洋明确选用时加 `--background ocean`。旧默认海浪和船模是可选私有素材，本机保留在 `.private-assets/`，**不会进入 GitHub 仓库**；明确选择海浪用 `--background waves`，船模用 `--model carrier`。新克隆若无这些资源会清楚报缺失而不是生成坏包。用户可提供获授权资源替换，见 [资源说明](docs/assets-and-rights.md)。

## 内置游鱼动态背景（单独资源，不是 PPT）

海岸、沙滩、三条锦鲤，移动鼠标产生轻波，点击产生强波；现有资源无钓竿/捕鱼玩法。代码与纹理完整保存在 skill 里，可供制作用户选择，见 [背景目录](.agents/skills/fangcun/references/backgrounds.md)。

独立导出（无封面、正文或翻页）：

```powershell
python .agents/skills/fangcun/scripts/export_background.py --background koi-ocean --output backgrounds/koi-ocean
python backgrounds/koi-ocean/serve.py
```

导出目录有入口、源代码、图片、Three.js、指针、许可证和启动脚本，不依赖原项目或互联网；导出是生成副本，唯一维护源仍在 skill。原始动态海浪也可用 `--background waves` 导出，需本机有私有素材。自有背景在接到用户制作任务后替换，不强迫沿用内置资源。

## 检查与开发

```powershell
python scripts/check_project.py
python -m unittest discover -s tests -v
node tests/test_judgement_game.cjs
```

浏览器 QA 需要 Node 与 Playwright（仅开发依赖）：

```powershell
npm ci
npx playwright install chromium
npm run qa -- --deck decks/my-topic
```

此测试自行启动绑定 127.0.0.1 的服务，拦截外部 origin，生成 `.qa/` 截图与报告；还须人工看截图和按 skill 检查最复杂业务交互。播放不需要 Node/npm/互联网。

## 仓库结构

```text
.agents/skills/fangcun/   主 skill、按需参考、启动器、可运行风格资产
docs/                    资源边界、经验来源、GitHub 准备
scripts/                 项目检查与浏览器 QA
tests/                   默认值、首页、资源、路径与生成器回归
decks/                   用户制作目录（Git 忽略）
.private-assets/         本机可选媒体（Git 忽略）
```

项目采用自定义「方寸非商业源码公开许可 1.0」，不采用 MIT/GPL 等标准开源许可，也不承诺“违反即固定赔偿”。第三方许可证独立保留，品牌不另授商标许可。发布步骤见 [GitHub 准备](docs/github-ready.md)。
