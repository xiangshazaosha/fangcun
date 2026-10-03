# 可选动态背景资源

背景是未来制作用户演示时的一项需求，不是固定品牌外观。Logo、风格、开场文字与背景各自独立。用户未选择时仍为 none；使用已有稿件优先问是否沿用或换自己的素材。[代码 C04、C30、C40]

## 资源目录

| id | 用户能理解的名字 | 可执行源 | 是否随仓库 |
|---|---|---|---|
| koi-ocean | 锦鲤海洋：海岸、沙滩、三条游鱼，鼠标波纹 | `assets/styles/ocean/media/ocean/` | 是，包含图片、JS/CSS、同包 Three.js/指针 |
| waves | 默认动态海浪：循环视频 | 仓库根 `.private-assets/waves/` | 本机有；公开再分发权未确认，Git 排除 |
| user-video | 用户自己的背景视频 | 用户上传后复制进本次目录，并抽取 poster | 不预置，不提交用户素材 |
| none | 不要动态背景 | 无 | 默认 |

用户已确认本项目中“钓鱼动态背景”指这份 **三条锦鲤海洋**；在相同上下文直接映射 `koi-ocean`，不再重复询问。它不是钓竿捕鱼场景，不能声称已有捕鱼玩法或偷偷改原场景。

## 单独交付背景

唯一导出器 `scripts/export_background.py`，目标目录必须不存在。只复制该背景依赖闭包，不带 deck.json、演示封面、内容卡片或翻页脚本。输出 README、serve.py、启动脚本、来源 hash 清单与许可证。[代码 C40]

```powershell
python .agents/skills/fangcun/scripts/export_background.py --background koi-ocean --output backgrounds/koi-ocean
```

执行输出目录 serve.py，默认绑定 127.0.0.1/空闲端口。独立入口是 index.html；场景源码保留原相对目录，入口 iframe 带 `logo=0&interactive=1`，不显示旧品牌。`--background waves` 对本机私有视频做同样的独立交付，不改变 Git 发布边界。

## 放进用户演示

- 已有海洋启动包用 `background=ocean`，用户选锦鲤海洋时显式写入；不因选海洋风自动启用。
- 嵌入其他风格时用同源 iframe，正文控件和导航由宿主管理。背景可接收 pause/resume/hover/ripple，隐藏时暂停。不可将 iframe 当成正文页。[代码 C30、C31]
- 双色风一般不适合全屏动态自然背景；在原风格/背景问题内说明冲突，推荐不使用或限制为独立媒体窗口。
- 导出副本不长期手改；修改唯一背景源后重新导出到新版本目录。模型、Logo 和粒子开场不随背景强制添加。

## 验证

通过独立服务阻断外部 origin，检查三条鱼、悬停轻波/点击强波、不同视口与减弱动效；输出路径、指针及纹理无 404，控制台无错误。视频检查真实解码及 poster。用户仅请求 background 时返回背景入口/目录，不自动打开测试 PPT。[代码 C18、C40]
