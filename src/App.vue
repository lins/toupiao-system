<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from './store'
import { ArrowDown } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const store = useStore()

// Calculate active route for navigation highlighting
const activeRoute = computed(() => {
  const path = route.path
  if (path.startsWith('/scoring')) return '/'
  return path
})

// Get login state from store
const isLoggedIn = computed(() => store.isLoggedIn)
const currentExpert = computed(() => store.currentExpertInfo)

// Logout function
const handleLogout = () => {
  store.logout()
  router.push('/')
}
</script>

<template>
  <el-config-provider>
    <div class="app">
      <header>
        <nav>
          <div class="nav-container">
            <el-menu mode="horizontal" router :default-active="activeRoute" class="nav-menu">
              <el-menu-item index="/">首页</el-menu-item>
              <el-menu-item index="/results">结果展示</el-menu-item>
              <el-menu-item index="/admin">管理</el-menu-item>
            </el-menu>
            
            <div v-if="isLoggedIn" class="user-info">
              <el-dropdown @command="handleLogout" trigger="click">
                <span class="user-dropdown-link">
                  <span class="user-name">{{ currentExpert?.name || '评委' }}</span>
                  <el-icon>
                    <arrow-down />
                  </el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </nav>
        <h1 class="app-title">创新大赛评分系统</h1>
      </header>
      
      <main>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
      
      <footer>
        <p>© {{ new Date().getFullYear() }} 评分系统</p>
      </footer>
    </div>
  </el-config-provider>
</template>

<style>
/* Global styles */
:root {
  --primary-color: #409eff;
  --primary-light: #ecf5ff;
  --text-color: #333;
  --border-color: #dcdfe6;
  --success-color: #67c23a;
  --warning-color: #e6a23c;
  --danger-color: #f56c6c;
  --info-color: #909399;
  --font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', SimSun, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  font-family: var(--font-family);
  color: var(--text-color);
  line-height: 1.6;
  min-height: 100vh;
  background-color: #f5f7fa;
}

/* App layout */
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

header {
  background-color: white;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}

nav {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  background-image: linear-gradient(to right, #f8f9fa, #ffffff);
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  max-width: 1200px;
  margin: 0 auto;
  height: 60px;
}

.nav-menu {
  flex: 1;
  border-bottom: none !important;
  background: transparent !important;
}

.nav-menu .el-menu-item {
  font-size: 15px;
  font-weight: 500;
  height: 60px;
  line-height: 60px;
  padding: 0 20px;
  transition: all 0.3s ease;
}

.nav-menu .el-menu-item:hover,
.nav-menu .el-menu-item.is-active {
  background-color: rgba(64, 158, 255, 0.1) !important;
  color: var(--primary-color) !important;
  border-bottom: 2px solid var(--primary-color) !important;
}

.user-info {
  margin-left: 20px;
  padding: 0 15px;
  height: 40px;
  display: flex;
  align-items: center;
  border-radius: 20px;
  background-color: var(--primary-light);
  transition: all 0.3s ease;
}

.user-info:hover {
  background-color: rgba(64, 158, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-dropdown-link {
  display: flex;
  align-items: center;
  color: var(--primary-color);
  font-weight: 500;
  cursor: pointer;
  padding: 0 5px;
}

.user-dropdown-link .el-icon {
  margin-left: 5px;
  font-size: 12px;
  transition: transform 0.3s;
}

.user-info:hover .user-dropdown-link .el-icon {
  transform: rotate(180deg);
}

.app-title {
  text-align: center;
  margin: 0.8rem 0;
  color: var(--primary-color);
  font-size: 1.8rem;
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.05);
}

main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

footer {
  padding: 1rem;
  text-align: center;
  background-color: white;
  color: var(--info-color);
  box-shadow: 0 -2px 12px 0 rgba(0, 0, 0, 0.05);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  main {
    padding: 1rem;
  }
  
  .nav-container {
    flex-direction: column;
    padding: 0 10px;
    height: auto;
  }
  
  .nav-menu {
    width: 100%;
  }
  
  .nav-menu .el-menu-item {
    padding: 0 10px;
    font-size: 14px;
  }
  
  .user-info {
    margin: 10px 0;
    align-self: flex-end;
  }
  
  .app-title {
    font-size: 1.5rem;
    margin: 0.5rem 0;
  }
}

/* 添加用户名样式 */
.user-name {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  vertical-align: middle;
}

/* 为下拉菜单添加自定义样式 */
:deep(.el-dropdown-menu) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.el-dropdown-menu__item:hover) {
  background-color: var(--primary-light);
  color: var(--primary-color);
}

:deep(.el-dropdown-menu__item) {
  padding: 10px 20px;
  line-height: 1.5;
  font-size: 14px;
}

/* Transition animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
