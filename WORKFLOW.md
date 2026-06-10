# Longxiang Website 工作流程

本项目以本机项目为主要开发位置，以 GitHub 为唯一备份中心，服务器只负责运行和部署。

## 固定位置

- 本机项目：`D:\Projects\longxiang-website`
- 服务器项目：`/home/ubuntu/longxiang-website`
- 服务器别名：`longxiang`
- 主分支：`main`

## 每次打开 PowerShell 后先执行

```powershell
cd D:\Projects\longxiang-website
git status
git pull origin main
git branch --show-current
```

`git branch --show-current` 必须显示：

```text
main
```

如果 `git status` 不是干净的，不要继续修改。先查看已有改动：

```powershell
git status
git diff --stat
```

确认这些改动是什么，再决定提交、暂存或放弃。

## 标准开发流程

1. 进入项目目录：

```powershell
cd D:\Projects\longxiang-website
```

2. 开工前同步：

```powershell
git status
git pull origin main
```

3. 修改代码。

4. 修改后检查：

```powershell
git status
git diff --stat
```

5. 提交：

```powershell
git add .
git commit -m "简短描述本次修改"
```

6. 推送到 GitHub：

```powershell
git push origin main
```

7. 部署到服务器：

```powershell
ssh longxiang "cd /home/ubuntu/longxiang-website && git pull origin main"
```

## 服务器紧急修改流程

原则上不要在服务器直接改代码。服务器只负责运行和部署。

如果必须在服务器临时修改，修完后立刻执行：

```bash
cd /home/ubuntu/longxiang-website
git status
git add .
git commit -m "描述服务器临时修改"
git push origin main
```

然后本机马上同步：

```powershell
cd D:\Projects\longxiang-website
git pull origin main
```

## 启动本机项目

```powershell
cd D:\Projects\longxiang-website
npm start
```

默认访问：

```text
http://127.0.0.1:3000/
```

如果端口被占用：

```powershell
$env:PORT=3300
npm start
```

访问：

```text
http://127.0.0.1:3300/
```

## 禁止事项

- 不要本机和服务器同时改同一个项目。
- 不要服务器 `commit` 后不 `push`。
- 不要本机 `commit` 后不 `push`。
- 不要在有未提交改动时直接 `git pull`。
- 不要把 `node_modules/`、`.agents/`、`backups/`、`.env` 提交进 Git。

## 简单原则

常规开发：

```text
本机修改 -> commit -> push GitHub -> 服务器 pull
```

服务器紧急修复：

```text
服务器修改 -> commit -> push GitHub -> 本机 pull
```

不要两边同时独立修改。
