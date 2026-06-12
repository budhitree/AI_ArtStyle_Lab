# 多阶段构建
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN npm install

# 复制源代码
COPY . .

# 构建前端
RUN npm run build

# 生产阶段
FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 只安装生产依赖
RUN npm install --production

# 从构建阶段复制构建好的文件和后端代码
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.js ./
COPY --from=builder /app/.env.example ./.env.example

# 创建上传目录
RUN mkdir -p /app/public/uploads

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]
