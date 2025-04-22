#!/bin/bash

# 终端颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 打印带颜色的信息函数
print_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
  if ! command -v $1 &> /dev/null; then
    print_error "$1 命令未找到，请先安装。"
    exit 1
  fi
}

# 检查必要的命令
check_command node
check_command npm

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)
if [ $NODE_MAJOR -lt 14 ]; then
  print_error "Node.js 版本过低 ($NODE_VERSION)，请升级到 Node.js 14 或更高版本"
  exit 1
fi

print_info "检测到 Node.js 版本: $NODE_VERSION"

# 安装依赖
print_info "正在安装项目依赖..."
if npm install; then
  print_success "项目依赖安装成功"
else
  print_error "项目依赖安装失败"
  exit 1
fi

# 创建日志目录
mkdir -p logs

# 构建前端
print_info "正在构建前端应用..."
if npm run build; then
  print_success "前端应用构建成功，输出目录: dist/"
else
  print_error "前端应用构建失败"
  exit 1
fi

# 修改服务器配置使其能够提供静态文件
print_info "正在配置服务器提供静态文件..."
cat > server/serve-static.js << EOL
const express = require('express');
const path = require('path');

// 配置静态文件服务
function configureStaticServing(app) {
  // 静态文件目录设置为 dist 目录
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // 所有非 API 请求均返回 index.html
  app.get('*', (req, res, next) => {
    // 如果请求以 /api 开头，则交给其他路由处理
    if (req.path.startsWith('/api') || req.path === '/teams' || req.path === '/experts' || req.path === '/categories' || req.path === '/scores' || req.path === '/results') {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });

  console.log('Static file serving configured');
}

module.exports = configureStaticServing;
EOL

# 添加到主服务器文件
STATIC_IMPORT="const configureStaticServing = require('./serve-static');"
STATIC_CONFIG="configureStaticServing(app);"

# 检查是否已添加静态文件配置
if ! grep -q "configureStaticServing" server/index.js; then
  # 在引入模块之后添加静态服务配置
  sed -i "/const app = express();/i ${STATIC_IMPORT}" server/index.js
  # 在中间件设置之后添加静态文件配置
  sed -i "/app.use(cors());/a ${STATIC_CONFIG}" server/index.js
  print_success "服务器已配置为提供静态文件"
else
  print_warning "服务器已存在静态文件配置，跳过修改"
fi

# 启动生产环境服务器
print_info "正在启动生产环境服务器..."

# 检查服务器是否已在运行
if pgrep -f "node server/index.js" > /dev/null; then
  print_warning "服务器已在运行，正在重启..."
  pkill -f "node server/index.js"
  sleep 2
fi

# 启动服务器并记录日志
node server/index.js > logs/server.log 2>&1 &
SERVER_PID=$!

# 等待服务器启动
sleep 2
if ps -p $SERVER_PID > /dev/null; then
  print_success "服务器启动成功 (PID: $SERVER_PID)"
  echo $SERVER_PID > logs/server.pid
else
  print_error "服务器启动失败，请检查 logs/server.log 查看错误信息"
  exit 1
fi

# 注册清理函数
cleanup() {
  print_info "正在关闭服务器..."
  
  if [ -f logs/server.pid ]; then
    SERVER_PID=$(cat logs/server.pid)
    if ps -p $SERVER_PID > /dev/null; then
      kill $SERVER_PID
      print_success "服务器已关闭"
    fi
    rm logs/server.pid
  fi
  
  print_info "服务已停止"
  exit 0
}

# 捕获中断信号
trap cleanup SIGINT SIGTERM

# 显示访问地址
echo ""
print_info "应用已部署成功！"
echo -e "${GREEN}----------------------------------------${NC}"
echo -e "${GREEN}访问地址: http://localhost:3001${NC}"
echo -e "${GREEN}----------------------------------------${NC}"
print_info "日志文件位于 logs/server.log"
print_info "按 Ctrl+C 停止服务"
echo ""

# 保持脚本运行
wait 