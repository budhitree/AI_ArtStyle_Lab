# 阿里云部署详细步骤

## 📋 第一步：购买阿里云服务器

### 1. 选择产品
访问 [阿里云 ECS 购买页](https://www.aliyun.com/product/ecs)

**推荐配置（个人项目）：**
| 配置 | 推荐 |
|------|------|
| 地域 | 离你最近的（如华北 2-北京） |
| 实例 | 经济型 e 系列 或 共享型 n4 |
| CPU/内存 | 2 核 2GB 或 2 核 4GB |
| 系统盘 | 40GB ESSD |
| 操作系统 | **Ubuntu 22.04 LTS**（推荐） |
| 网络 | 按固定带宽 1-3Mbps |

### 2. 安全组配置（重要！）
在阿里云控制台 → 实例 → 安全组 → 配置规则：

| 端口范围 | 授权对象 | 用途 |
|----------|----------|------|
| 22/22 | 0.0.0.0/0 | SSH 登录 |
| 80/80 | 0.0.0.0/0 | HTTP |
| 443/443 | 0.0.0.0/0 | HTTPS |

---

## 🔌 第二步：连接服务器

### Windows 用户（PowerShell）
```bash
ssh root@你的服务器公网 IP
```

### 或使用阿里云 Workbench
控制台 → 实例 → 远程连接 → Workbench

---

## ⚙️ 第三步：服务器环境配置

**登录服务器后，依次执行以下命令：**

### 1. 更新系统
```bash
apt update && apt upgrade -y
```

### 2. 安装 Node.js 20
```bash
# 安装 NodeSource 源
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# 安装 Node.js
apt install -y nodejs

# 验证安装
node -v
npm -v
```

### 3. 安装 Git
```bash
apt install -y git
git --version
```

### 4. 安装 PM2（进程管理）
```bash
npm install -g pm2
pm2 -v
```

### 5. 安装 Nginx
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 6. 验证 Nginx
浏览器访问 `http://你的服务器 IP`，看到 "Welcome to nginx!" 表示成功

---

## 📦 第四步：部署项目

### 方式 A：使用 Git（推荐）

#### 1. 在本地初始化 Git 仓库（如果还没有）
```bash
# 在本地项目目录执行
git init
git add .
git commit -m "Initial commit"
```

#### 2. 创建 GitHub/Gitee 仓库并推送
```bash
# 关联远程仓库（以 GitHub 为例）
git remote add origin https://github.com/你的用户名/AI_ArtStyle_Lab.git
git push -u origin main
```

#### 3. 在服务器上克隆项目
```bash
# 登录服务器后执行
cd /var/www
git clone https://github.com/你的用户名/AI_ArtStyle_Lab.git
cd AI_ArtStyle_Lab
```

### 方式 B：使用 SCP 上传

#### 在本地 PowerShell 执行：
```bash
# 创建远程目录
ssh root@你的服务器 IP "mkdir -p /var/www/AI_ArtStyle_Lab"

# 上传项目（排除 node_modules）
scp -r * root@你的服务器 IP:/var/www/AI_ArtStyle_Lab/
```

### 方式 C：使用 Xftp/WinSCP
1. 下载 [Xftp](https://www.xshell.com/zh/xftp/) 或 [WinSCP](https://winscp.net/)
2. 连接服务器（IP、用户名 root、密码）
3. 拖拽项目文件到 `/var/www/AI_ArtStyle_Lab`

---

## 🔧 第五步：项目配置与启动

### 1. 安装依赖
```bash
cd /var/www/AI_ArtStyle_Lab
npm install --production
```

### 2. 配置环境变量
```bash
cp .env.example .env
nano .env
```

编辑 `.env` 文件：
```env
VOLC_API_KEY=你的火山引擎 API 密钥
VOLC_SEEDREAM_ENDPOINT=你的端点 ID
PORT=3000
```

按 `Ctrl+O` 保存，`Ctrl+X` 退出

### 3. 构建前端
```bash
npm run build
```

### 4. 初始化数据库
```bash
node server/utils/init-db.js
```

### 5. 创建上传目录
```bash
mkdir -p public/uploads
chmod -R 755 public/uploads
```

### 6. 使用 PM2 启动应用
```bash
pm2 start server.js --name ai-art-lab
pm2 save
pm2 startup
```

> 最后一条命令会输出一行 `sudo env ...`，复制并执行它，这样服务器重启后会自动启动应用

---

## 🌐 第六步：配置 Nginx 反向代理

### 1. 创建 Nginx 配置文件
```bash
nano /etc/nginx/sites-available/ai-art-lab
```

### 2. 填入以下配置
```nginx
server {
    listen 80;
    server_name _;  # 如果有域名，改为你的域名

    # 前端静态文件（Vite 构建的 dist 目录）
    location / {
        root /var/www/AI_ArtStyle_Lab/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件目录
    location /uploads {
        alias /var/www/AI_ArtStyle_Lab/public/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 日志
    access_log /var/log/nginx/ai-art-lab-access.log;
    error_log /var/log/nginx/ai-art-lab-error.log;
}
```

### 3. 启用配置
```bash
# 创建软链接
ln -s /etc/nginx/sites-available/ai-art-lab /etc/nginx/sites-enabled/

# 删除默认配置（避免冲突）
rm -f /etc/nginx/sites-enabled/default

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

---

## 🔒 第七步：配置 HTTPS（免费证书）

### 方式 A：使用 Certbot（推荐）

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 获取证书（如果有域名）
certbot --nginx -d your-domain.com

# 自动续期测试
certbot renew --dry-run
```

### 方式 B：使用阿里云免费 SSL 证书

1. 访问 [阿里云 SSL 证书](https://www.aliyun.com/product/cas)
2. 申请免费 DV SSL 证书（有效期 1 年）
3. 下载 Nginx 格式的证书文件
4. 上传到服务器：
```bash
mkdir -p /etc/nginx/ssl
# 使用 Xftp 上传 cert.pem 和 key.pem 到 /etc/nginx/ssl/
```

5. 更新 Nginx 配置：
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... 其他配置同上
}

# HTTP 自动跳转 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 🗄️ 第八步：数据库备份配置

```bash
# 创建备份目录
mkdir -p /var/backup/ai-art-lab

# 创建备份脚本
nano /usr/local/bin/backup-artstyle.sh
```

脚本内容：
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /var/www/AI_ArtStyle_Lab/server/data/artstyle.db /var/backup/ai-art-lab/artstyle_$DATE.db
# 删除 7 天前的备份
find /var/backup/ai-art-lab -name "artstyle_*.db" -mtime +7 -delete
```

```bash
# 添加执行权限
chmod +x /usr/local/bin/backup-artstyle.sh

# 添加定时任务（每天凌晨 2 点备份）
crontab -e
```

添加：
```
0 2 * * * /usr/local/bin/backup-artstyle.sh
```

---

## ✅ 第九步：验证部署

### 检查清单
- [ ] 访问 `http://你的服务器 IP`，看到首页
- [ ] 测试用户登录/注册
- [ ] 测试作品上传
- [ ] 测试 AI 生成功能
- [ ] 检查 PM2 状态：`pm2 status`
- [ ] 查看日志：`pm2 logs ai-art-lab`

### 常用命令
```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs ai-art-lab

# 重启应用
pm2 restart ai-art-lab

# 查看 Nginx 状态
systemctl status nginx

# 查看磁盘空间
df -h

# 查看内存使用
free -h
```

---

## 🐛 常见问题排查

### 1. 页面无法访问
```bash
# 检查 Nginx 状态
systemctl status nginx

# 检查安全组端口
# 阿里云控制台 → 安全组 → 确认 80/443 端口已开放
```

### 2. API 请求失败
```bash
# 检查后端是否运行
pm2 status

# 查看后端日志
pm2 logs ai-art-lab
```

### 3. 图片无法上传
```bash
# 检查目录权限
chmod -R 755 /var/www/AI_ArtStyle_Lab/public/uploads
chown -R www-data:www-data /var/www/AI_ArtStyle_Lab/public/uploads
```

### 4. 数据库锁定
```bash
# 检查数据库文件权限
chmod 644 /var/www/AI_ArtStyle_Lab/server/data/artstyle.db
```

---

## 💰 费用预估

| 项目 | 配置 | 价格 |
|------|------|------|
| ECS 实例 | 2 核 2GB 1Mbps | ~¥60/月 |
| 带宽 | 按使用量 | ~¥20/月 |
| 域名（可选） | .com | ~¥60/年 |
| SSL 证书 | 阿里云免费 | ¥0 |
| **总计** | | **~¥80-100/月** |

---

## 🎯 下一步

1. **域名备案**（如果使用国内服务器且要绑定域名）
   - 访问 [阿里云备案系统](https://beian.aliyun.com)
   - 按指引完成 ICP 备案（约 10-20 个工作日）

2. **监控与告警**
   - 配置阿里云云监控
   - 设置 CPU、内存、磁盘告警

3. **性能优化**
   - 开启 Nginx Gzip 压缩
   - 配置 Redis 缓存（可选）

---

**部署完成后，你的应用将可通过 `http://你的服务器 IP` 访问！** 🎉
