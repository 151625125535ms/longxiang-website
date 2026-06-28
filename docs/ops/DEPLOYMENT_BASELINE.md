# 部署基线

## 目的

这份清单用于保证生产部署可复现、可回滚。生产服务器不得直接编辑文件，GitHub `main` 是唯一代码源。

## 本地预检

每次部署前先在本地执行：

```powershell
git status --short
npm audit --omit=dev
node scripts/test-acceptance.js
```

如果修改了前端 JavaScript，还需要对变更文件执行 `node --check`。

如果修改了页面视觉效果，还需要通过浏览器、截图或 Playwright 做页面验证。

## GitHub 同步

只精确暂存本次允许提交的文件：

```powershell
git add <changed-files>
git commit -m "<中文提交说明>"
git push origin main
```

禁止执行 `git push longxiang`。

## 生产服务器拉取

```bash
ssh longxiang
cd /home/ubuntu/longxiang-website
git pull --ff-only origin main
```

如果 `package.json` 或 `package-lock.json` 发生变化：

```bash
npm install --omit=dev
pm2 restart longxiang-website
```

如果依赖没有变化，只在运行时代码受影响时重启对应服务。

## 健康检查

```bash
pm2 status longxiang-website
curl -I https://www.lxenelectric.com/
curl -I https://www.lxenelectric.com/sitemap.xml
```

预期结果：

- PM2 状态为 `online`。
- 网站返回 `200` 或预期的重定向状态。
- sitemap 返回 `200`。

## 回滚

优先通过本地创建新的 revert 提交回滚：

```powershell
git revert <commit>
git push origin main
```

然后在生产服务器拉取：

```bash
cd /home/ubuntu/longxiang-website
git pull --ff-only origin main
pm2 restart longxiang-website
```
