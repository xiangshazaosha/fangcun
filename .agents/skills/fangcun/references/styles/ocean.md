# 海洋风

原最终成品提炼的独立风格，区别于早期透明玻璃与双色风；当前完整规范与模块不依赖旧成品目录。青蓝/潟湖绿、浅色章节、稳定透明玻璃、粒子序章和可选主体舞台。[代码 C29—C33]

## 视觉规则

- 固定 1920×1080，整体等比缩放。[代码 C01]
- 画布 `#DCEBEF`；主字 `#103747`；弱字 `#4F6E78`；青蓝 `#08A8C1 / #087F99 / #7ADCEB`；辅助绿 `#25C8A0 / #9AE8C9`。不是旧单位身份色。[代码 C29]
- 深水区域用浅字，局部改善对比，不给整幅海洋追加重蒙版。
- 玻璃低透明白约 .035、8px 模糊、135% 饱和、细白边与柔阴影。进场只改变 opacity/transform，不能动画 backdrop-filter。[代码 C30]
- 标题 58–68px，章节约 54px，卡片 30–32px，正文约 25px；过长拆页。品牌和标题独立安全带。[代码 C29]

## 页面与行为

| 类型 | 语法 |
|---|---|
| prologue | 可换词粒子，鼠标透视弯曲，点击散开重组后进入；支持跳过 |
| cover | 左侧完整题名，右下进入按钮；水面只互动 |
| chapter | 大章节号/章节名、右侧目标；明确选择时加载主体 |
| cards/process | 玻璃网格、逐项显示、当前高亮、结论 |
| closing | 左结论、右局部海洋斜分隔，正文不挤进右景 |

普通内容页水面点击起波**同时推进**，不要 return 截断；控件和模型事件优先。隐藏 iframe 停止绘制；模型保留 alpha 命中、邻近图预取、逐帧缓动，不加悬停抬起。[代码 C30—C32]

## 独立选项

风格不等于媒体选择。背景、模型默认 none；选择海洋风不自动选海浪、鱼群或船。

- `--background ocean`：明确要实时海岸/3 条锦鲤时启用，非旧 MP4。悬停轻波、点击强波，岸线内起波，速度耦合甩尾及波前避让保留。
- `--background waves`：明确要旧默认动态海浪，读取本机私有可选视频/poster，输出为 video；资源不进入 Git。
- `background=video`：完整 config 的相对路径 video/poster，自有素材复制进独立目录。
- `--model carrier`：明确选择且本机私有素材完整才启用，缺失可见报错。不要为无关选题默认用船。[代码 C35]
- 粒子 1–12 字符，推荐中文关键词而非品牌缩写；完整题名放封面。主体磁流、向外连续减密与慢微移保留，不同步呼吸、不整字放大。[代码 C33、C37]

## 启动

从仓库根：

```powershell
python .agents/skills/fangcun/scripts/new_deck.py --style ocean --output decks/my-topic --title "本次主题" --particle-text "探索" --homepage particles
```

默认无背景/无模型；用户明确要实时海洋才加 `--background ocean`。目标存在就拒绝覆盖。修改独立目录 deck.json 后运行 build_deck.py，再 serve.py。[代码 C35、C38]

来源与适配指纹：[../provenance.json](../provenance.json)；分类：[registry.json](registry.json)；资源限制：运行包 ASSETS.md 与仓库 docs/assets-and-rights.md。可运行不代表任意公开商用许可。
