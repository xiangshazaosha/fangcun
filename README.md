# 方寸 FANGCUN｜互动演示制作 Skill

把做互动演示稿的经验变成可复用的制作方法：**理解内容 → 五项需求 → 首页提炼 → 风格与互动 → 浏览器验收 → 可选离线交付**。

核心入口：[SKILL.md](.agents/skills/fangcun/SKILL.md)。项目自动发现 `.agents/skills` 的环境可调用 `$fangcun`；其他环境直接让制作 agent 阅读入口。无需安装到全局 skill 目录。

## 怎么用

> 使用 $fangcun，根据这些资料制作一份互动演示稿。先根据内容建议首页文字，开工需求问题不要超过五个。

已提供资料不重复问。最多确认：内容与场景、Logo、风格、动态背景、首页文字与开场。首页会建议完整题名和粒子短词，再供选择保留粒子互动、简洁封面或直接进入内容。未选背景默认无动态背景，默认 Logo 为方寸，无额外模型。

## 已有能力

- 固定 1920×1080 舞台、逐项推进、键盘/点击/滚轮、控件事件隔离。
- 海洋风可运行启动包；透明玻璃风、双色风完整设计规范与代码参考（尚无预制全套启动包）。
- 可换词粒子：透视弯曲、点击散开、完整聚合后进入；实时海岸与三条锦鲤；稳定玻璃材质。
- 内容底稿、故事板、交互状态机、二维物理实验选型、减弱动效与本地离线交付方法。
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

## 检查与开发

```powershell
python scripts/check_project.py
python -m unittest discover -s tests -v
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

项目自有代码与品牌的开源许可尚未指定；不要将 GitHub 可见性当作版权许可。第三方许可证独立保留。发布步骤见 [GitHub 准备](docs/github-ready.md)。
