# 上线收口检查表

记录日期：2026-06-18  
正式域名：`https://www.lxenelectric.com/`  
最新代码版本：`430aed7`

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

## 待账号控制台确认

### AWS Lightsail 服务器快照

当前状态：待确认。

原因：服务器没有 AWS CLI、没有可用 AWS 环境凭据，也未确认到可用 IAM 实例角色，因此无法通过命令行读取 Lightsail 自动快照设置。

需要用户在 AWS Lightsail 控制台确认：

```text
Lightsail -> Ubuntu-1 -> 快照 / Snapshots -> 自动快照
```

确认目标：

- 自动快照已开启
- 快照对象为当前实例 `Ubuntu-1`
- 快照时间和保留策略可接受

### Cloudflare WAF 基础规则

当前状态：待确认。

原因：当前环境没有 Cloudflare API Token，无法通过 API 读取 WAF managed ruleset 状态。

需要用户在 Cloudflare 控制台确认：

```text
Cloudflare -> lxenelectric.com -> Security -> WAF -> Managed rules
```

确认目标：

- `Cloudflare Managed Ruleset` 为启用状态
- HTTP DDoS / Network-layer DDoS 保持启用
- 不开启会误伤正常访问的严格挑战规则

## 后续完成标准

收到 AWS Lightsail 自动快照截图和 Cloudflare WAF Managed rules 截图后，逐项确认无误，即可将本次上线收口目标标记为完成。
