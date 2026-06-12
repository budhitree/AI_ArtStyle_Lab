# AI ArtStyle Lab 上线部署指南

## 📋 上线前检查清单

### 1. 环境配置
- [ ] 创建 `.env` 文件，配置火山引擎 API 密钥
- [ ] 设置正确的 `PORT` 环境变量
- [ ] 确认数据库初始化完成（`server/data/artstyle.db`）

### 2. 安全配置
- [ ] 修改默认管理员密码
- [ ] 配置 CORS 白名单（生产环境域名）
- [ ] 启用 HTTPS（使用 Let's Encrypt 免费证书）
- [ ] 设置文件上传大小限制

### 3. 性能优化
- [ ] 前端已执行 `npm run build` 构建
- [ ] 启用 Gzip/Brotli 压缩
- [ ] 配置静态资源缓存策略
- [ ] 数据库添加索引优化查询

### 4. 监控与日志
- [ ] 配置错误日志记录
- [ ] 设置应用监控（可选：Sentry/Prometheus）
- [ ] 配置日志轮转（避免日志文件过大）

---

## 🚀 部署方式选择

### 方式 A：Docker 部署（推荐）

```bash
# 1. 克隆项目到服务器
git clone <your-repo>
cd AI_ArtStyle_Lab

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入真实配置

# 3. 一键启动
docker-compose up -d

# 4. 查看运行状态
docker-compose ps
docker-compose logs -f
```

**访问地址**：`http://your-server-ip:3000`

---

### 方式 B：传统服务器部署

#### 1. 环境准备
```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
npm install -g pm2

# 安装 Nginx
sudo apt install nginx
```

#### 2. 项目部署
```bash
# 上传项目到服务器
scp -r ./* user@server:/var/www/ai-art-lab/

# SSH 登录服务器
ssh user@server

# 进入项目目录
cd /var/www/ai-art-lab

# 安装生产依赖
npm install --production

# 构建前端
npm run build
```

#### 3. 配置 PM2
```bash
pm2 start server.js --name ai-art-lab
pm2 save
pm2 startup  # 生成开机启动命令
```

#### 4. 配置 Nginx

```bash
sudo nano /etc/nginx/sites-available/ai-art-lab
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/ai-art-lab/dist;
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
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件目录
    location /uploads {
        alias /var/www/ai-art-lab/public/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/ai-art-lab /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

---

### 方式 C：云平台一键部署

#### Railway
1. 访问 [railway.app](https://railway.app)
2. 连接 GitHub 仓库
3. 添加环境变量（VOLC_API_KEY, VOLC_SEEDREAM_ENDPOINT）
4. 自动部署

#### Render
1. 访问 [render.com](https://render.com)
2. 创建 Web Service
3. 连接 GitHub 仓库
4. 配置 Build Command: `npm run build`
5. 配置 Start Command: `npm start`

---

## 🔒 HTTPS 配置（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 📊 数据库备份

```bash
# 备份数据库
cp server/data/artstyle.db server/data/artstyle.db.backup.$(date +%Y%m%d)

# 定时备份（添加到 crontab）
0 2 * * * cp /var/www/ai-art-lab/server/data/artstyle.db /backup/artstyle.db.$(date +\%Y\%m\%d)
```

---

## 🐛 故障排查

### 常见问题

**1. 端口被占用**
```bash
# 查看端口占用
lsof -i :3000
# 杀死进程
kill -9 <PID>
```

**2. 权限问题**
```bash
# 确保上传目录有写权限
chmod -R 755 /var/www/ai-art-lab/public/uploads
chown -R www-data:www-data /var/www/ai-art-lab/public/uploads
```

**3. 数据库锁定**
```bash
# 检查数据库文件权限
chmod 644 server/data/artstyle.db
```

**4. 查看 PM2 日志**
```bash
pm2 logs ai-art-lab
```

---

## 📈 性能优化建议

1. **启用 Gzip 压缩**（Nginx 配置）
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
```

2. **静态资源缓存**
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

3. **数据库优化**
```sql
-- 为常用查询添加索引
CREATE INDEX idx_artworks_artist ON artworks(artistId);
CREATE INDEX idx_artworks_uploaded ON artworks(uploadedAt);
CREATE INDEX idx_exhibitions_status ON exhibitions(status);
```

---

## 🎯 上线后验证

- [ ] 访问首页，确认画廊正常加载
- [ ] 测试用户登录/注册
- [ ] 测试作品上传功能
- [ ] 测试 AI 生成功能
- [ ] 测试展览创建功能
- [ ] 检查移动端适配
- [ ] 验证 HTTPS 正常工作

---

**祝部署顺利！** 🎉
