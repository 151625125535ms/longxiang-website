# 域名与 HTTPS 上线运维记录

记录日期：2026-06-18  
项目：河南龙翔电气股份有限公司官网  
正式入口：`https://www.lxenelectric.com/`

## 当前结论

- 域名已经接入 Cloudflare。
- AWS Lightsail 已绑定静态 IPv4：`52.220.70.4`。
- 主域名规范为 `https://www.lxenelectric.com/`。
- `lxenelectric.com` 会 301 跳转到 `www.lxenelectric.com`。
- HTTP 会跳转到 HTTPS。
- 源站 Nginx 已安装 Let's Encrypt 证书。
- Cloudflare SSL/TLS 模式为 `Full (strict)`。
- 证书自动续期 dry-run 已通过。
- 本机 SSH 别名 `longxiang` 已更新到新静态 IP。

## Cloudflare DNS

当前 DNS 记录：

```text
lxenelectric.com      A       52.220.70.4          Proxied
www.lxenelectric.com  CNAME   lxenelectric.com     Proxied
```

建议保持两条记录都为 Proxied，继续让 Cloudflare 提供 HTTPS 边缘证书、HTTP/2、HTTP/3 和基础防护。

## Cloudflare SSL/TLS

当前建议配置：

```text
SSL/TLS mode: Full (strict)
Always Use HTTPS: enabled
Minimum TLS Version: TLS 1.2
TLS 1.3: enabled
Automatic HTTPS Rewrites: enabled
```

不要切换到 `Flexible`。源站已经有有效证书，使用 `Flexible` 会降低安全性，并可能造成跳转或协议判断异常。

## AWS / SSH

服务器：

```text
Provider: AWS Lightsail
Instance: Ubuntu-1
Public IPv4: 52.220.70.4
SSH alias: longxiang
Project path: /home/ubuntu/longxiang-website
```

本机 SSH 配置应包含：

```sshconfig
Host longxiang
    HostName 52.220.70.4
    User ubuntu
    IdentityFile C:\Users\hnlxd\.ssh\LightsailDefaultKey-ap-southeast-1.pem
    IdentitiesOnly yes
    ServerAliveInterval 30
```

## Nginx 规则

当前 Nginx 行为：

```text
http://lxenelectric.com/*        -> 301 -> https://www.lxenelectric.com/*
http://www.lxenelectric.com/*    -> 301 -> https://www.lxenelectric.com/*
https://lxenelectric.com/*       -> 301 -> https://www.lxenelectric.com/*
https://www.lxenelectric.com/*   -> proxy_pass http://127.0.0.1:3000
```

核心配置点：

```nginx
server_name lxenelectric.com www.lxenelectric.com;
return 301 https://www.lxenelectric.com$request_uri;

server_name lxenelectric.com;
ssl_certificate /etc/letsencrypt/live/lxenelectric.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/lxenelectric.com/privkey.pem;
return 301 https://www.lxenelectric.com$request_uri;

server_name www.lxenelectric.com;
ssl_certificate /etc/letsencrypt/live/lxenelectric.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/lxenelectric.com/privkey.pem;
proxy_pass http://127.0.0.1:3000;
```

修改 Nginx 后必须执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 证书

证书信息：

```text
Certificate Name: lxenelectric.com
Identifiers: lxenelectric.com, www.lxenelectric.com
Certificate Path: /etc/letsencrypt/live/lxenelectric.com/fullchain.pem
Private Key Path: /etc/letsencrypt/live/lxenelectric.com/privkey.pem
Expiry Date: 2026-09-16 10:12:17+00:00
```

续期验证命令：

```bash
sudo certbot renew --dry-run --non-interactive --no-random-sleep-on-renew
```

2026-06-18 验证结果：

```text
Congratulations, all simulated renewals succeeded:
/etc/letsencrypt/live/lxenelectric.com/fullchain.pem (success)
```

自动续期 timer：

```bash
systemctl status snap.certbot.renew.timer --no-pager
```

## 应用进程

线上应用由 PM2 管理：

```text
name: longxiang-website
mode: cluster
status: online
port behind Nginx: 127.0.0.1:3000
```

常用检查命令：

```bash
ssh longxiang
cd /home/ubuntu/longxiang-website
pm2 list
pm2 logs longxiang-website --lines 80
```

## 验证命令

公网入口：

```powershell
curl.exe -I -L https://www.lxenelectric.com/
curl.exe -I -L https://lxenelectric.com/
curl.exe -I -L http://www.lxenelectric.com/
```

后台接口缓存检查：

```powershell
curl.exe -sS -D - -o NUL https://www.lxenelectric.com/api/admin/dashboard
```

预期结果：

```text
HTTP/1.1 401 Unauthorized
Cache-Control: no-store
cf-cache-status: DYNAMIC
```

源站直连检查：

```powershell
curl.exe -kI --resolve www.lxenelectric.com:443:52.220.70.4 https://www.lxenelectric.com/
```

预期结果：

```text
HTTP/1.1 200 OK
Server: nginx
```

服务器检查：

```bash
ssh longxiang "sudo nginx -t; systemctl is-active nginx; pm2 list --no-color"
```

## 回滚与排障

如果 Cloudflare 配置导致异常：

1. 确认 DNS 仍指向 `52.220.70.4`。
2. 确认 SSL/TLS 仍为 `Full (strict)`。
3. 临时关闭新加的 Cloudflare 规则，不要改为 `Flexible`。
4. 检查 `https://www.lxenelectric.com/` 是否仍返回 200。

如果源站异常：

```bash
ssh longxiang
sudo nginx -t
sudo systemctl status nginx --no-pager
pm2 list
pm2 logs longxiang-website --lines 120
```

如果证书异常：

```bash
sudo certbot certificates
sudo certbot renew --dry-run --non-interactive --no-random-sleep-on-renew
```

如果代码异常，遵循项目 Git 规范：

```bash
cd /home/ubuntu/longxiang-website
git status
git pull origin main
pm2 reload longxiang-website
```

生产服务器只允许从 GitHub 拉取代码，不直接编辑项目代码文件。

## 后续可选优化

- 在 Cloudflare 新增 Redirect Rule，让 `http://lxenelectric.com/*` 直接跳到 `https://www.lxenelectric.com/*`，减少一次跳转。
- 观察一段时间 CSP Report-Only 日志，再决定是否切换为强制 CSP。
- 后续做 SEO 时，统一更新 `sitemap.xml`、`robots.txt`、canonical、hreflang 和 Open Graph URL。
