# 上线收口检查表

记录日期：2026-06-18  
正式域名：`https://www.lxenelectric.com/`  
代码版本：以 `main` 当前 HEAD 为准，本地、GitHub、服务器需保持一致。

## 已完成并验证

### 3000 端口没有公网开放

应用已改为只监听本机回环地址：

```text
127.0.0.1:3000
```

服务器防火墙已启用持久规则，拒绝非 loopback 接口访问 3000：

```text
longxiang-firewall.service: enabled / active
-A INPUT ! -i lo -p tcp -m tcp --dport 3000 -j REJECT --reject-with tcp-reset
```

Nginx 仍通过 `127.0.0.1:3000` 反向代理，不影响正式站访问。

### GitHub、本地、服务器代码一致

当前一致版本：

```text
430aed7
```

本地 `main`、GitHub `origin/main`、服务器 `/home/ubuntu/longxiang-website` 均已同步到该版本。

### 数据库与上传资源备份

备份脚本：

```text
scripts/backup-longxiang.sh
```

定时任务：

```cron
17 18 * * * cd /home/ubuntu/longxiang-website && ./scripts/backup-longxiang.sh >> logs/backup-longxiang.log 2>&1
```

说明：服务器使用 UTC 时间，该任务约等于北京时间每天 `02:17` 执行。

已手动验证生成备份包：

```text
/var/backups/longxiang/daily-20260618-124739.tar.gz
```

备份包内容已验证包含：

```text
data/longxiang.db
uploads/
```

### 基础监控

监控脚本：

```text
scripts/ops-health-check.sh
```

定时任务：

```cron
*/15 * * * * cd /home/ubuntu/longxiang-website && ./scripts/ops-health-check.sh >> logs/ops-health.log 2>&1
```

监控项：

- 网站是否可访问：`https://www.lxenelectric.com/`
- 本机 Node health：`http://127.0.0.1:3000/api/health`
- TLS 证书是否将在 21 天内过期
- 磁盘使用率是否低于 85%
- PM2 进程 `longxiang-website` 是否在线

手动运行结果：

```text
OK: website reachable
OK: local node health endpoint reachable
OK: public TLS certificate valid for more than 21 days
OK: disk usage 12% below 85%
OK: PM2 process online
```

### robots.txt 与 sitemap.xml 正式域名

线上已验证：

```text
https://www.lxenelectric.com/robots.txt
https://www.lxenelectric.com/sitemap.xml
```

`robots.txt` 当前 Sitemap：

```text
Sitemap: https://www.lxenelectric.com/sitemap.xml
```

`sitemap.xml` 中 URL 已替换为：

```text
https://www.lxenelectric.com/
```

## 账号控制台项

### AWS Lightsail 服务器快照

当前状态：已确认。

确认来源：AWS Lightsail 控制台截图。

确认页面：

```text
Lightsail -> Ubuntu-1 -> 快照 / Snapshots -> 自动快照
```

确认结果：

- 自动快照已开启
- 每日快照时间为 GMT+8 22:00
- Lightsail 将保留最近七个自动快照
- 截图时尚未生成第一份每日快照，等待下一个计划时间自动创建

### Cloudflare WAF 基础规则

当前状态：已确认。

确认来源：Cloudflare 控制台截图。

确认页面：

```text
Cloudflare -> lxenelectric.com -> Security -> WAF -> Managed rules
```

确认结果：

- `Cloudflare managed ruleset` 显示为 `Always active`
- 覆盖标签包括 `Web application exploits`、`DDoS attacks`、`Bot traffic`、`API abuse`

## 完成结论

上线收口目标已完成。后续只需要在第一次自动快照计划时间后，回到 Lightsail 快照页面确认每日快照列表开始出现即可。
