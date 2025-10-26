# 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm --no-fund --no-audit

# 复制package文件
COPY package.json pnpm-lock.yaml ./

# 设置npm镜像源并安装依赖
RUN pnpm config set registry https://registry.npmmirror.com/ && \
    pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# 生产阶段
FROM node:18-alpine AS production

# 设置工作目录
WORKDIR /app

# 安装生产环境需要的工具
# RUN npm install -g pm2 --no-fund --no-audit

# 复制package文件
COPY package.json pnpm-lock.yaml ./

# 设置npm镜像源并只安装生产依赖
RUN npm install -g pnpm --no-fund --no-audit && \
    pnpm config set registry https://registry.npmmirror.com/ && \
    pnpm install --prod --frozen-lockfile && \
    npm uninstall -g pnpm && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/cache/apk/*

# 从构建阶段复制构建结果
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.docker.env ./.env

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "dist/index.js"]