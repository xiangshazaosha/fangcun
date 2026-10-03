# GitHub 发布与边界

当前远程是 [xiangshazaosha/fangcun](https://github.com/xiangshazaosha/fangcun)，主分支 `main`。GitHub 用户名已由 `zjgxkj` 改为 `xiangshazaosha`；原有本地提交已推送。用户随后要求公开，并明确“不得用于商业用途”。

本项目自有部分采用根 [LICENSE](../LICENSE) 的自定义非商业源码公开许可；称为 **Source-available**，不是标准开源。不默认套 MIT/GPL，不用它覆盖第三方组件的原许可。许可边界见 [许可说明](licensing.md)。未来其他仓库上传前仍需确定归属、仓库名和可见性；不要向 agent 提供 token。

从仓库根检查：

```powershell
python scripts/check_project.py
python -m unittest discover -s tests -v
git status --short
git ls-files
```

确认清单不含 `.private-assets`、decks、成品、凭据、node_modules；公开前进一步复核生成媒体与品牌权利。`.gitignore` 不会自动清理已经被跟踪的文件，检查脚本同时检查 Git 跟踪清单。

用户明确确认目标后才执行（OWNER 换成确认的归属）：

```powershell
gh repo create OWNER/fangcun --private --source . --remote origin --push
```

若已有仓库，用确认的 URL 设置 origin 再推送 main；不能覆盖不相关 remote，不能强推。当前仓库由 private 改 public 前，必须先将 LICENSE 和相应说明提交、推送，通过边界检查后再执行。保存实际远程可见性及 main 提交结果，不把“命令准备好”报告成“已上传”。
