# 安装和部署指南

## 系统要求

- Node.js v14+
- npm 或 yarn 包管理器

## 安装步骤

1. 克隆或下载项目

```bash
git clone <repository-url>
cd toupiao-system
```

2. 安装依赖

```bash
npm install
# 或者
yarn
```

3. 配置系统

前端配置位于 `vite.config.js` 文件中，可以根据需要调整端口号和代理设置。
后端配置位于 `server/index.js` 文件中，可以根据需要调整端口号和数据库设置。

## 运行开发环境

1. 启动后端服务器

```bash
npm run server
# 或者
yarn server
```

2. 在另一个终端窗口中启动前端开发服务器

```bash
npm run dev
# 或者
yarn dev
```

## 生产环境部署

1. 构建前端应用

```bash
npm run build
# 或者
yarn build
```

2. 启动后端服务器

```bash
npm run server
# 或者
yarn server
```

3. 配置 Nginx 或其他 Web 服务器

下面是一个基本的 Nginx 配置示例，将前端静态文件和后端 API 路由到正确的位置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 静态文件目录
    root /path/to/toupiao-system/dist;
    index index.html;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 数据库管理

SQLite 数据库文件位于 `server/toupiao.db`。该文件将在首次运行服务器时自动创建。

如果需要备份数据，只需复制该文件即可。恢复数据时，替换该文件并重启服务器。

## 常见问题

1. **端口冲突**: 如果遇到端口冲突，可以在 `vite.config.js` 和 `server/index.js` 中修改端口号。

2. **数据库访问错误**: 确保 `server` 目录有写入权限，因为 SQLite 数据库文件需要在该目录中创建和更新。

3. **依赖安装失败**: 尝试使用 `npm cache clean --force` 清除 npm 缓存，然后重新安装依赖。 