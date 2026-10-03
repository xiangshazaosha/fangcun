# GitHub 发布准备

当前阶段只初始化本地 Git 与首次提交，不创建远程仓库、不推送。

上传前确定 **归属账号/组织、仓库名、public/private**；默认建议私有 `fangcun`。无需向 agent 提供 token。自有代码尚未指定开源许可，不默认套 MIT。

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

若已有仓库，用确认的 URL 设置 origin 再推送 main；不能覆盖不相关 remote，不能强推。public 必须用户明确选择且完成资源复核后再用。保存实际远程结果，不把“命令准备好”报告成“已上传”。
