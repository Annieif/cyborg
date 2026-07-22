# 使用 Node.js 20 LTS 作为基础镜像
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci --legacy-peer-deps

# 复制源码
COPY tsconfig.json ./
COPY src/ ./src/

# 构建
RUN npm run build

# === 前端构建 ===
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# === 生产镜像 ===
FROM node:20-alpine

WORKDIR /app

# 创建非 root 用户
RUN addgroup -g 1001 -S cyborg && \
    adduser -u 1001 -S cyborg -G cyborg

# 复制后端产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 复制前端产物
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 创建日志和经验记忆目录
RUN mkdir -p logs experience && chown -R cyborg:cyborg /app

# 复制配置文件
COPY .env.example .env.example

USER cyborg

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "dist/index.js"]