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

# 启动后端服务
start_backend() {
  print_info "正在启动后端服务器..."
  
  # 检查后端是否已在运行
  if pgrep -f "node server/index.js" > /dev/null; then
    print_warning "后端服务已在运行，正在重启..."
    pkill -f "node server/index.js"
    sleep 2
  fi
  
  # 启动后端并记录日志
  node server/index.js > logs/backend.log 2>&1 &
  BACKEND_PID=$!
  
  # 等待服务启动
  sleep 2
  if ps -p $BACKEND_PID > /dev/null; then
    print_success "后端服务启动成功 (PID: $BACKEND_PID)"
    echo $BACKEND_PID > logs/backend.pid
  else
    print_error "后端服务启动失败，请检查 logs/backend.log 查看错误信息"
    exit 1
  fi
}

# 启动前端服务
start_frontend() {
  print_info "正在启动前端开发服务器..."
  
  # 检查前端是否已在运行
  if pgrep -f "vite" > /dev/null; then
    print_warning "前端服务已在运行，正在重启..."
    pkill -f "vite"
    sleep 2
  fi
  
  # 使用 npm run dev 启动前端
  npm run dev > logs/frontend.log 2>&1 &
  FRONTEND_PID=$!
  
  # 等待服务启动
  sleep 5
  if ps -p $FRONTEND_PID > /dev/null; then
    print_success "前端服务启动成功 (PID: $FRONTEND_PID)"
    echo $FRONTEND_PID > logs/frontend.pid
  else
    print_error "前端服务启动失败，请检查 logs/frontend.log 查看错误信息"
    exit 1
  fi
}

# 注册清理函数
cleanup() {
  print_info "正在关闭服务..."
  
  if [ -f logs/backend.pid ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null; then
      kill $BACKEND_PID
      print_success "后端服务已关闭"
    fi
    rm logs/backend.pid
  fi
  
  if [ -f logs/frontend.pid ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null; then
      kill $FRONTEND_PID
      print_success "前端服务已关闭"
    fi
    rm logs/frontend.pid
  fi
  
  print_info "所有服务已关闭"
  exit 0
}

# 捕获中断信号
trap cleanup SIGINT SIGTERM

# 启动服务
start_backend
start_frontend

# 显示访问地址
echo ""
print_info "服务已启动成功！"
echo -e "${GREEN}----------------------------------------${NC}"
echo -e "${GREEN}前端服务: http://localhost:5173${NC}"
echo -e "${GREEN}后端API: http://localhost:3001${NC}"
echo -e "${GREEN}----------------------------------------${NC}"
print_info "日志文件位于 logs/ 目录"
print_info "按 Ctrl+C 停止所有服务"
echo ""

# 保持脚本运行
wait 