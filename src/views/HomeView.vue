<template>
  <div class="login-container">
    <el-tabs v-model="activeTab" type="card" class="login-tabs">
      <el-tab-pane label="评委登录" name="expert">
        <el-card class="login-card">
          <template #header>
            <div class="card-header">
              <h2>评委登录</h2>
            </div>
          </template>
          
          <div v-if="isExpertLoggedIn" class="logged-in-content">
            <el-result
              icon="success"
              title="登录成功"
              :sub-title="`欢迎您，${getExpertName(currentExpert)}`"
            >
              <template #extra>
                <div class="action-buttons">
                  <el-button type="primary" @click="goToTeamList">
                    开始评分
                    <el-icon class="el-icon--right"><ArrowRight /></el-icon>
                  </el-button>
                  <el-button @click="logout">退出登录</el-button>
                </div>
              </template>
            </el-result>
          </div>
          
          <div v-else class="login-form-container">
            <el-form
              :model="expertLoginForm"
              :rules="expertLoginRules"
              ref="expertLoginFormRef"
              label-position="top"
              @submit.prevent="handleExpertLogin"
            >
              <el-form-item label="评委ID" prop="expertId">
                <el-select
                  v-model="expertLoginForm.expertId"
                  placeholder="请选择您的评委ID"
                  class="login-input"
                >
                  <el-option
                    v-for="expert in experts"
                    :key="expert.id"
                    :label="`${expert.id}号评委: ${expert.name}`"
                    :value="expert.id"
                  />
                </el-select>
              </el-form-item>
              
              <el-form-item label="密码" prop="password">
                <el-input
                  v-model="expertLoginForm.password"
                  type="password"
                  placeholder="请输入密码"
                  class="login-input"
                  show-password
                />
                <div class="password-hint">
                  <small>提示: 默认密码为评委ID，如：专家1的密码为"1"</small>
                </div>
              </el-form-item>
              
              <el-form-item>
                <el-button
                  type="primary"
                  native-type="submit"
                  class="login-button"
                  :loading="isExpertLoading"
                >
                  登录
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-card>
      </el-tab-pane>
      
      <el-tab-pane label="管理员登录" name="admin">
        <el-card class="login-card">
          <template #header>
            <div class="card-header">
              <h2>管理员登录</h2>
            </div>
          </template>
          
          <div v-if="isAdmin" class="logged-in-content">
            <el-result
              icon="success"
              title="管理员登录成功"
              sub-title="您现在可以管理参赛队伍"
            >
              <template #extra>
                <div class="action-buttons">
                  <el-button type="primary" @click="goToAdmin">
                    管理队伍
                    <el-icon class="el-icon--right"><Setting /></el-icon>
                  </el-button>
                  <el-button @click="adminLogout">退出登录</el-button>
                </div>
              </template>
            </el-result>
          </div>
          
          <div v-else class="login-form-container">
            <el-form
              :model="adminLoginForm"
              :rules="adminLoginRules"
              ref="adminLoginFormRef"
              label-position="top"
              @submit.prevent="handleAdminLogin"
            >
              <el-form-item label="用户名" prop="username">
                <el-input
                  v-model="adminLoginForm.username"
                  placeholder="请输入管理员用户名"
                  class="login-input"
                />
              </el-form-item>
              
              <el-form-item label="密码" prop="password">
                <el-input
                  v-model="adminLoginForm.password"
                  type="password"
                  placeholder="请输入管理员密码"
                  class="login-input"
                  show-password
                />
                <div class="password-hint">
                  <small>提示: 默认用户名和密码为admin/admin123</small>
                </div>
              </el-form-item>
              
              <el-form-item>
                <el-button
                  type="primary"
                  native-type="submit"
                  class="login-button"
                  :loading="isAdminLoading"
                >
                  登录
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
    
    <el-dialog
      v-model="showTeamDialog"
      title="选择参赛队伍"
      width="80%"
      :before-close="handleCloseDialog"
    >
      <div v-if="!teams.length" class="empty-teams">
        <el-empty description="暂无参赛队伍" :image-size="200" />
      </div>
      
      <div v-else class="teams-grid">
        <el-card
          v-for="team in teams"
          :key="team.id"
          class="team-card"
          shadow="hover"
        >
          <template #header>
            <div class="team-header">
              <span class="team-name">{{ team.name }}</span>
              <el-tag size="small" type="info" effect="plain">
                顺序: {{ team.order_number }}
              </el-tag>
            </div>
          </template>
          
          <div class="team-actions">
            <el-button
              type="primary"
              @click="goToScoring(team.id)"
              class="score-button"
              :icon="Edit"
            >
              进行评分
            </el-button>
          </div>
        </el-card>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store'
import { ElMessage } from 'element-plus'
import { Edit, ArrowRight, Setting } from '@element-plus/icons-vue'

const store = useStore()
const router = useRouter()
const expertLoginFormRef = ref(null)
const adminLoginFormRef = ref(null)
const isExpertLoading = ref(false)
const isAdminLoading = ref(false)
const showTeamDialog = ref(false)
const activeTab = ref('expert')

// 评委登录表单数据
const expertLoginForm = reactive({
  expertId: '',
  password: ''
})

// 管理员登录表单数据
const adminLoginForm = reactive({
  username: '',
  password: ''
})

// 登录表单验证规则
const expertLoginRules = {
  expertId: [
    { required: true, message: '请选择评委ID', trigger: 'change' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

// 管理员登录表单验证规则
const adminLoginRules = {
  username: [
    { required: true, message: '请输入管理员用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入管理员密码', trigger: 'blur' }
  ]
}

// 从store获取数据
const teams = computed(() => store.teams)
const experts = computed(() => store.experts)
const currentExpert = computed(() => store.currentExpert)
const isExpertLoggedIn = computed(() => store.currentExpert !== null)
const isAdmin = computed(() => store.isAdmin)
const isLoggedIn = computed(() => store.isLoggedIn)

// Fetch teams and experts on component mount
onMounted(async () => {
  try {
    await Promise.all([
      store.fetchTeams(),
      store.fetchExperts()
    ])
  } catch (error) {
    console.error('Failed to load initial data:', error)
    ElMessage.error('加载数据失败，请刷新页面重试')
  }
})

// 评委登录处理函数
const handleExpertLogin = async () => {
  if (!expertLoginFormRef.value) return
  
  await expertLoginFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    isExpertLoading.value = true
    
    try {
      // Make sure the password is a string in case the user entered a number
      const expertId = expertLoginForm.expertId;
      const password = expertLoginForm.password.toString();
      
      console.log(`Attempting login with ID: ${expertId}, password: ${password}`);
      await store.expertLogin(expertId, password);
      ElMessage.success('登录成功')
      
      // 重置表单
      expertLoginForm.expertId = ''
      expertLoginForm.password = ''
    } catch (error) {
      console.error('Login failed:', error)
      ElMessage.error(error.message || '登录失败，请检查评委ID和密码')
    } finally {
      isExpertLoading.value = false
    }
  })
}

// 管理员登录处理函数
const handleAdminLogin = async () => {
  if (!adminLoginFormRef.value) return
  
  await adminLoginFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    isAdminLoading.value = true
    
    try {
      await store.adminLogin(adminLoginForm.username, adminLoginForm.password)
      ElMessage.success('管理员登录成功')
      
      // 重置表单
      adminLoginForm.username = ''
      adminLoginForm.password = ''
    } catch (error) {
      console.error('Admin login failed:', error)
      ElMessage.error(error.message || '管理员登录失败，请检查用户名和密码')
    } finally {
      isAdminLoading.value = false
    }
  })
}

// 获取评委姓名
const getExpertName = (expert) => {
  if (!expert) return '未知评委';
  
  // 如果expert是一个对象且有name属性，直接返回name
  if (typeof expert === 'object' && expert.name) {
    return expert.name;
  }
  
  // 如果expert是ID（数字），查找对应的专家
  const expertObj = experts.value.find(e => e.id === expert);
  return expertObj ? expertObj.name : `${expert}号评委`;
}

// 前往队伍列表
const goToTeamList = () => {
  showTeamDialog.value = true
}

// 前往管理页面
const goToAdmin = () => {
  router.push('/admin')
}

// 评分处理函数
const goToScoring = (teamId) => {
  showTeamDialog.value = false
  router.push({ name: 'scoring', params: { teamId } })
}

// 关闭对话框
const handleCloseDialog = () => {
  showTeamDialog.value = false
}

// 退出登录
const logout = () => {
  store.setCurrentExpert(null)
  ElMessage.info('已退出登录')
}

// 管理员退出登录
const adminLogout = () => {
  store.adminLogout()
  ElMessage.info('管理员已退出登录')
}
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  min-height: 70vh;
}

.login-tabs {
  width: 100%;
  max-width: 500px;
}

.login-card {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  color: var(--primary-color);
  font-size: 1.5rem;
}

.login-form-container {
  padding: 10px 0;
}

.login-input,
.login-button {
  width: 100%;
}

.password-hint {
  margin-top: 5px;
  color: var(--info-color);
}

.logged-in-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.team-card {
  transition: transform 0.3s;
}

.team-card:hover {
  transform: translateY(-5px);
}

.team-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.team-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--primary-color);
}

.team-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.score-button {
  width: 100%;
}

.empty-teams {
  padding: 30px 0;
  text-align: center;
}
</style> 