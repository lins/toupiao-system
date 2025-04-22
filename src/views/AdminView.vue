<template>
  <div class="admin-view">
    <h1 class="page-title">系统管理</h1>
    
    <!-- 未登录或非管理员状态 -->
    <div v-if="!isAdmin" class="unauthorized-container">
      <el-result
        icon="warning"
        title="访问受限"
        sub-title="只有管理员可以访问此页面"
      >
        <template #extra>
          <el-button type="primary" @click="goToLogin">去登录</el-button>
        </template>
      </el-result>
    </div>
    
    <!-- 管理员内容 -->
    <template v-else>
      <div class="card">
        <div class="card-title-with-actions">
          <h2 class="card-title">参赛队伍管理</h2>
          <el-tag type="success">管理员模式</el-tag>
        </div>
        
        <div class="add-team-form mb-4">
          <h3 class="form-subtitle">添加参赛队伍</h3>
          <el-form :model="newTeam" label-width="120px" label-position="left">
            <el-form-item label="队伍名称">
              <el-input v-model="newTeam.name" placeholder="输入参赛队伍名称" />
            </el-form-item>
            <el-form-item label="参赛顺序">
              <el-input-number 
                v-model="newTeam.order_number" 
                :min="1" 
                :max="100"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="addTeam" :loading="isAdding">
                添加队伍
              </el-button>
            </el-form-item>
          </el-form>
        </div>
        
        <div class="team-list mt-4">
          <h3 class="form-subtitle">队伍列表</h3>
          
          <div v-if="isLoading" class="text-center py-4">
            <el-skeleton :rows="5" animated />
          </div>
          
          <el-alert
            v-else-if="!teams.length"
            type="info"
            title="暂无参赛队伍"
            description="请添加参赛队伍"
            :closable="false"
          />
          
          <el-table
            v-else
            :data="sortedTeams"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="name" label="队伍名称" />
            <el-table-column prop="order_number" label="参赛顺序" width="120" />
            <el-table-column label="操作" width="150">
              <template #default="scope">
                <el-button
                  type="danger"
                  size="small"
                  @click="confirmDeleteTeam(scope.row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      
      <!-- 评分项目管理 -->
      <div class="card mt-4">
        <div class="card-title-with-actions">
          <h2 class="card-title">评分项目管理</h2>
          <el-button 
            type="primary" 
            size="small" 
            @click="addCategoryDialogVisible = true"
            :icon="Plus"
          >
            添加评分项目
          </el-button>
        </div>
        
        <div v-if="isLoading" class="text-center py-4">
          <el-skeleton :rows="5" animated />
        </div>
        
        <el-alert
          v-else-if="!categories.length"
          type="info"
          title="暂无评分项目"
          description="请添加评分项目"
          :closable="false"
        />
        
        <el-table
          v-else
          :data="categories"
          border
          stripe
          style="width: 100%"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="评分项目名称" />
          <el-table-column label="操作" width="250">
            <template #default="scope">
              <el-button
                type="primary"
                size="small"
                @click="editCategory(scope.row)"
                :icon="Edit"
              >
                编辑
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="confirmDeleteCategory(scope.row)"
                :icon="Delete"
                :disabled="categories.length <= 1"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <!-- 评委管理 -->
      <div class="card mt-4">
        <div class="card-title-with-actions">
          <h2 class="card-title">评委管理</h2>
          <el-button 
            type="primary" 
            size="small" 
            @click="addExpertDialogVisible = true"
            :icon="Plus"
          >
            添加评委
          </el-button>
        </div>
        
        <div v-if="isLoading" class="text-center py-4">
          <el-skeleton :rows="5" animated />
        </div>
        
        <el-alert
          v-else-if="!experts.length"
          type="info"
          title="暂无评委"
          description="请添加评委"
          :closable="false"
        />
        
        <el-table
          v-else
          :data="experts"
          border
          stripe
          style="width: 100%"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="评委姓名" />
          <el-table-column label="操作" width="250">
            <template #default="scope">
              <el-button
                type="primary"
                size="small"
                @click="editExpert(scope.row)"
                :icon="Edit"
              >
                编辑
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="confirmDeleteExpert(scope.row)"
                :icon="Delete"
                :disabled="experts.length <= 1"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div class="card mt-4">
        <h2 class="card-title">系统信息</h2>
        
        <div class="system-info">
          <p><strong>评分项目:</strong> {{ categories.length ? categories.map(c => c.name).join(', ') : '正在加载...' }}</p>
          <p><strong>评委人数:</strong> {{ experts.length ? experts.length : '正在加载...' }} 人</p>
          <p><strong>参赛队伍:</strong> {{ teams.length ? teams.length : '正在加载...' }} 支</p>
        </div>
      </div>
    </template>
    
    <!-- 删除队伍确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="30%"
    >
      <p>您确定要删除队伍 "{{ teamToDelete?.name }}" 吗？</p>
      <p class="warning-text">此操作将永久删除该队伍及其所有评分数据，无法恢复！</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="deleteTeam" :loading="isDeleting">
            确认删除
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 添加评分项目对话框 -->
    <el-dialog
      v-model="addCategoryDialogVisible"
      title="添加评分项目"
      width="40%"
      top="10vh"
      :close-on-click-modal="false"
      :show-close="true"
      destroy-on-close
      @close="resetCategoryForm"
    >
      <div class="category-edit-container">
        <el-form 
          :model="categoryForm" 
          :rules="categoryRules" 
          ref="categoryFormRef"
          label-width="100px"
          class="category-form"
        >
          <el-form-item label="项目名称" prop="name" class="form-item-input">
            <el-input 
              v-model="categoryForm.name" 
              placeholder="请输入评分项目名称"
              maxlength="20"
              show-word-limit
            >
              <template #prefix>
                <el-icon><EditPen /></el-icon>
              </template>
            </el-input>
            <div class="form-item-hint">简短、明确的评分项目名称，建议2-10个字</div>
          </el-form-item>
          
          <el-divider>
            <el-icon><InfoFilled /></el-icon>
            <span class="divider-text">操作提示</span>
          </el-divider>
          
          <div class="category-help-text">
            <p><el-icon><Document /></el-icon> 添加的评分项目将立即在所有评分页面中生效</p>
            <p><el-icon><Warning /></el-icon> 请确保评分项目名称简洁明确，便于评委理解</p>
          </div>
        </el-form>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addCategoryDialogVisible = false" plain>
            取消
          </el-button>
          <el-button type="primary" @click="addCategory" :loading="isCategorySaving">
            <el-icon v-if="!isCategorySaving"><Plus /></el-icon>
            <span>确认添加</span>
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 编辑评分项目对话框 -->
    <el-dialog
      v-model="editCategoryDialogVisible"
      title="编辑评分项目"
      width="40%"
      top="10vh"
      :close-on-click-modal="false"
      :show-close="true"
      destroy-on-close
    >
      <div class="category-edit-container">
        <el-form 
          :model="categoryForm" 
          :rules="categoryRules" 
          ref="editCategoryFormRef"
          label-width="100px"
          class="category-form"
        >
          <el-form-item label="项目ID" class="form-item-readonly">
            <el-input v-model="categoryForm.id" disabled />
            <div class="form-item-hint">系统自动生成，不可修改</div>
          </el-form-item>
          
          <el-form-item label="项目名称" prop="name" class="form-item-input">
            <el-input 
              v-model="categoryForm.name" 
              placeholder="请输入评分项目名称"
              maxlength="20"
              show-word-limit
            >
              <template #prefix>
                <el-icon><EditPen /></el-icon>
              </template>
            </el-input>
            <div class="form-item-hint">简短、明确的评分项目名称，建议2-10个字</div>
          </el-form-item>
          
          <el-divider>
            <el-icon><InfoFilled /></el-icon>
            <span class="divider-text">操作提示</span>
          </el-divider>
          
          <div class="category-help-text">
            <p><el-icon><Warning /></el-icon> 修改评分项目名称不会影响已有的评分数据</p>
            <p><el-icon><Document /></el-icon> 评分项目将在所有评分页面中显示</p>
          </div>
        </el-form>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editCategoryDialogVisible = false" plain>
            取消
          </el-button>
          <el-button type="primary" @click="updateCategory" :loading="isCategorySaving">
            <el-icon v-if="!isCategorySaving"><Check /></el-icon>
            <span>确认修改</span>
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 删除评分项目确认对话框 -->
    <el-dialog
      v-model="deleteCategoryDialogVisible"
      title="确认删除"
      width="30%"
    >
      <p>您确定要删除评分项目 "{{ categoryToDelete?.name }}" 吗？</p>
      <p class="warning-text">此操作将永久删除该评分项目及其相关的所有评分数据，无法恢复！</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteCategoryDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="deleteCategory" :loading="isDeleting">
            确认删除
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加评委对话框 -->
    <el-dialog
      v-model="addExpertDialogVisible"
      title="添加评委"
      width="40%"
      top="10vh"
      :close-on-click-modal="false"
      :show-close="true"
      destroy-on-close
      @close="resetExpertForm"
    >
      <div class="expert-edit-container">
        <el-form 
          :model="expertForm" 
          :rules="expertRules" 
          ref="expertFormRef"
          label-width="100px"
          class="expert-form"
        >
          <el-form-item label="评委姓名" prop="name" class="form-item-input">
            <el-input 
              v-model="expertForm.name" 
              placeholder="请输入评委姓名"
              maxlength="20"
              show-word-limit
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
            <div class="form-item-hint">评委的真实姓名或系统显示姓名</div>
          </el-form-item>
          
          <el-form-item label="登录密码" prop="password" class="form-item-input">
            <el-input 
              v-model="expertForm.password" 
              placeholder="请输入登录密码"
              maxlength="20"
              show-password
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
            <div class="form-item-hint">评委登录系统时使用的密码，建议使用评委ID或简单易记的密码</div>
          </el-form-item>
          
          <el-divider>
            <el-icon><InfoFilled /></el-icon>
            <span class="divider-text">操作提示</span>
          </el-divider>
          
          <div class="expert-help-text">
            <p><el-icon><Document /></el-icon> 添加的评委将可以登录系统并为参赛队伍评分</p>
            <p><el-icon><Warning /></el-icon> 请将评委姓名和密码告知相应的评委</p>
          </div>
        </el-form>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addExpertDialogVisible = false" plain>
            取消
          </el-button>
          <el-button type="primary" @click="addExpert" :loading="isExpertSaving">
            <el-icon v-if="!isExpertSaving"><Plus /></el-icon>
            <span>确认添加</span>
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 编辑评委对话框 -->
    <el-dialog
      v-model="editExpertDialogVisible"
      title="编辑评委"
      width="40%"
      top="10vh"
      :close-on-click-modal="false"
      :show-close="true"
      destroy-on-close
    >
      <div class="expert-edit-container">
        <el-form 
          :model="expertForm" 
          :rules="expertRules" 
          ref="editExpertFormRef"
          label-width="100px"
          class="expert-form"
        >
          <el-form-item label="评委ID" class="form-item-readonly">
            <el-input v-model="expertForm.id" disabled />
            <div class="form-item-hint">系统自动生成，不可修改</div>
          </el-form-item>
          
          <el-form-item label="评委姓名" prop="name" class="form-item-input">
            <el-input 
              v-model="expertForm.name" 
              placeholder="请输入评委姓名"
              maxlength="20"
              show-word-limit
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
            <div class="form-item-hint">评委的真实姓名或系统显示姓名</div>
          </el-form-item>
          
          <el-form-item label="登录密码" prop="password" class="form-item-input">
            <el-input 
              v-model="expertForm.password" 
              placeholder="请输入新密码（留空表示不修改）"
              maxlength="20"
              show-password
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
            <div class="form-item-hint">如果不需要修改密码，请留空</div>
          </el-form-item>
          
          <el-divider>
            <el-icon><InfoFilled /></el-icon>
            <span class="divider-text">操作提示</span>
          </el-divider>
          
          <div class="expert-help-text">
            <p><el-icon><Document /></el-icon> 修改评委信息不会影响已有的评分数据</p>
            <p><el-icon><Warning /></el-icon> 如果修改了密码，请及时通知评委</p>
          </div>
        </el-form>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editExpertDialogVisible = false" plain>
            取消
          </el-button>
          <el-button type="primary" @click="updateExpert" :loading="isExpertSaving">
            <el-icon v-if="!isExpertSaving"><Check /></el-icon>
            <span>确认修改</span>
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 删除评委确认对话框 -->
    <el-dialog
      v-model="deleteExpertDialogVisible"
      title="确认删除"
      width="30%"
    >
      <p>您确定要删除评委 "{{ expertToDelete?.name }}" 吗？</p>
      <p class="warning-text">此操作将永久删除该评委及其所有评分数据，无法恢复！</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteExpertDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="deleteExpert" :loading="isDeleting">
            确认删除
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, Plus, EditPen, InfoFilled, Warning, Document, Check, User, Lock } from '@element-plus/icons-vue'

const store = useStore()
const router = useRouter()

// Reactive state
const isLoading = ref(true)
const isAdding = ref(false)
const isDeleting = ref(false)
const isCategorySaving = ref(false)
const deleteDialogVisible = ref(false)
const teamToDelete = ref(null)
const newTeam = ref({
  name: '',
  order_number: 1
})

// 评分项目管理
const addCategoryDialogVisible = ref(false)
const editCategoryDialogVisible = ref(false)
const deleteCategoryDialogVisible = ref(false)
const categoryToDelete = ref(null)
const categoryForm = reactive({
  id: null,
  name: ''
})
const categoryFormRef = ref(null)
const editCategoryFormRef = ref(null)
const categoryRules = {
  name: [
    { required: true, message: '请输入评分项目名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ]
}

// 评委管理
const addExpertDialogVisible = ref(false)
const editExpertDialogVisible = ref(false)
const deleteExpertDialogVisible = ref(false)
const expertToDelete = ref(null)
const expertForm = reactive({
  id: null,
  name: '',
  password: ''
})
const expertFormRef = ref(null)
const editExpertFormRef = ref(null)
const expertRules = {
  name: [
    { required: true, message: '请输入评委姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

// Get data from store
const teams = computed(() => store.teams)
const experts = computed(() => store.experts)
const categories = computed(() => store.categories)
const isAdmin = computed(() => store.isAdmin)

// Sorted teams by order number
const sortedTeams = computed(() => {
  return [...teams.value].sort((a, b) => a.order_number - b.order_number)
})

// Add a new team
const addTeam = async () => {
  // Validate form
  if (!newTeam.value.name) {
    ElMessage.warning('请输入队伍名称')
    return
  }
  
  isAdding.value = true
  
  try {
    await store.addTeam(newTeam.value.name, newTeam.value.order_number)
    ElMessage.success('队伍添加成功!')
    
    // Reset form
    newTeam.value.name = ''
    
    // Set next order number (max + 1)
    if (teams.value.length > 0) {
      const maxOrder = Math.max(...teams.value.map(t => t.order_number))
      newTeam.value.order_number = maxOrder + 1
    } else {
      newTeam.value.order_number = 1
    }
  } catch (error) {
    console.error('Error adding team:', error)
    ElMessage.error(error.message || '添加队伍失败')
  } finally {
    isAdding.value = false
  }
}

// 打开删除确认对话框
const confirmDeleteTeam = (team) => {
  teamToDelete.value = team
  deleteDialogVisible.value = true
}

// 删除队伍
const deleteTeam = async () => {
  if (!teamToDelete.value) return
  
  isDeleting.value = true
  
  try {
    await store.deleteTeam(teamToDelete.value.id)
    ElMessage.success('队伍删除成功!')
    deleteDialogVisible.value = false
    teamToDelete.value = null
  } catch (error) {
    console.error('Error deleting team:', error)
    ElMessage.error(error.message || '删除队伍失败')
  } finally {
    isDeleting.value = false
  }
}

// 跳转到登录页面
const goToLogin = () => {
  router.push('/')
}

// 添加评分项目
const addCategory = async () => {
  if (!categoryFormRef.value) return
  
  await categoryFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    isCategorySaving.value = true
    
    try {
      await store.addCategory(categoryForm.name)
      ElMessage.success('评分项目添加成功!')
      addCategoryDialogVisible.value = false
      resetCategoryForm()
    } catch (error) {
      console.error('Error adding category:', error)
      ElMessage.error(error.message || '添加评分项目失败')
    } finally {
      isCategorySaving.value = false
    }
  })
}

// 编辑评分项目
const editCategory = (category) => {
  categoryForm.id = category.id
  categoryForm.name = category.name
  editCategoryDialogVisible.value = true
}

// 更新评分项目
const updateCategory = async () => {
  if (!editCategoryFormRef.value) return
  
  await editCategoryFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    isCategorySaving.value = true
    
    try {
      await store.updateCategory(categoryForm.id, categoryForm.name)
      ElMessage.success('评分项目更新成功!')
      editCategoryDialogVisible.value = false
    } catch (error) {
      console.error('Error updating category:', error)
      ElMessage.error(error.message || '更新评分项目失败')
    } finally {
      isCategorySaving.value = false
    }
  })
}

// 打开删除评分项目确认对话框
const confirmDeleteCategory = (category) => {
  // 不允许删除全部评分项目
  if (categories.value.length <= 1) {
    ElMessage.warning('系统至少需要保留一个评分项目')
    return
  }
  
  categoryToDelete.value = category
  deleteCategoryDialogVisible.value = true
}

// 删除评分项目
const deleteCategory = async () => {
  if (!categoryToDelete.value) return
  
  isDeleting.value = true
  
  try {
    await store.deleteCategory(categoryToDelete.value.id)
    ElMessage.success('评分项目删除成功!')
    deleteCategoryDialogVisible.value = false
    categoryToDelete.value = null
  } catch (error) {
    console.error('Error deleting category:', error)
    ElMessage.error(error.message || '删除评分项目失败')
  } finally {
    isDeleting.value = false
  }
}

// 重置评分项目表单
const resetCategoryForm = () => {
  categoryForm.id = null
  categoryForm.name = ''
  if (categoryFormRef.value) {
    categoryFormRef.value.resetFields()
  }
}

// 添加评委
const addExpert = async () => {
  if (!expertFormRef.value) return
  
  await expertFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    isExpertSaving.value = true
    
    try {
      await store.addExpert(expertForm.name, expertForm.password)
      ElMessage.success('评委添加成功!')
      addExpertDialogVisible.value = false
      resetExpertForm()
    } catch (error) {
      console.error('Error adding expert:', error)
      ElMessage.error(error.message || '添加评委失败')
    } finally {
      isExpertSaving.value = false
    }
  })
}

// 编辑评委
const editExpert = (expert) => {
  expertForm.id = expert.id
  expertForm.name = expert.name
  editExpertDialogVisible.value = true
}

// 更新评委
const updateExpert = async () => {
  if (!editExpertFormRef.value) return
  
  await editExpertFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    isExpertSaving.value = true
    
    try {
      await store.updateExpert(expertForm.id, expertForm.name, expertForm.password)
      ElMessage.success('评委更新成功!')
      editExpertDialogVisible.value = false
    } catch (error) {
      console.error('Error updating expert:', error)
      ElMessage.error(error.message || '更新评委失败')
    } finally {
      isExpertSaving.value = false
    }
  })
}

// 打开删除评委确认对话框
const confirmDeleteExpert = (expert) => {
  // 不允许删除全部评委
  if (experts.value.length <= 1) {
    ElMessage.warning('系统至少需要保留一个评委')
    return
  }
  
  expertToDelete.value = expert
  deleteExpertDialogVisible.value = true
}

// 删除评委
const deleteExpert = async () => {
  if (!expertToDelete.value) return
  
  isDeleting.value = true
  
  try {
    await store.deleteExpert(expertToDelete.value.id)
    ElMessage.success('评委删除成功!')
    deleteExpertDialogVisible.value = false
    expertToDelete.value = null
  } catch (error) {
    console.error('Error deleting expert:', error)
    ElMessage.error(error.message || '删除评委失败')
  } finally {
    isDeleting.value = false
  }
}

// 重置评委表单
const resetExpertForm = () => {
  expertForm.id = null
  expertForm.name = ''
  expertForm.password = ''
  if (expertFormRef.value) {
    expertFormRef.value.resetFields()
  }
}

// Fetch data on component mount
onMounted(async () => {
  // 检查是否是管理员
  if (!isAdmin.value) {
    return
  }
  
  try {
    await Promise.all([
      store.fetchTeams(),
      store.fetchExperts(),
      store.fetchCategories()
    ])
    
    // Set next order number for new team
    if (teams.value.length > 0) {
      const maxOrder = Math.max(...teams.value.map(t => t.order_number))
      newTeam.value.order_number = maxOrder + 1
    }
  } catch (error) {
    console.error('Error loading data:', error)
    ElMessage.error('加载数据失败')
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.page-title {
  margin-bottom: 1.5rem;
  color: var(--primary-color);
  font-weight: 600;
  border-left: 4px solid var(--primary-color);
  padding-left: 12px;
}

.card-title-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.card-title {
  font-weight: 600;
  color: var(--primary-color);
  margin: 0;
}

.form-subtitle {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--text-color);
}

.add-team-form {
  background-color: var(--primary-light);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.system-info {
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  line-height: 1.8;
}

.py-4 {
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.unauthorized-container {
  margin-top: 2rem;
  text-align: center;
}

.warning-text {
  color: var(--danger-color);
  margin-top: 10px;
  font-weight: 500;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.mt-4 {
  margin-top: 1rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.category-edit-container {
  padding: 1rem;
}

.category-form {
  margin: 0 auto;
  max-width: 90%;
}

.form-item-readonly {
  margin-bottom: 1.2rem;
  opacity: 0.7;
}

.form-item-input {
  margin-bottom: 1.5rem;
}

.form-item-hint {
  font-size: 0.8rem;
  color: var(--info-color);
  margin-top: 4px;
  padding-left: 2px;
}

.divider-text {
  font-size: 0.85rem;
  color: var(--info-color);
  margin-left: 6px;
}

.category-help-text {
  margin: 1rem auto;
  padding: 12px 16px;
  background-color: var(--primary-light);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.9rem;
  line-height: 1.8;
}

.category-help-text p {
  margin: 6px 0;
  display: flex;
  align-items: center;
}

.category-help-text .el-icon {
  margin-right: 8px;
  color: var(--primary-color);
}

/* 改进表格样式 */
:deep(.el-table) {
  --el-table-header-bg-color: var(--primary-light);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

:deep(.el-table th) {
  font-weight: 600;
  color: var(--primary-color);
}

:deep(.el-table__row:hover) {
  background-color: var(--primary-light) !important;
}

.card {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin-bottom: 20px;
  transition: transform 0.3s, box-shadow 0.3s;
}

.card:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
}

.expert-edit-container {
  padding: 1rem;
}

.expert-form {
  margin: 0 auto;
  max-width: 90%;
}

.expert-help-text {
  margin: 1rem auto;
  padding: 12px 16px;
  background-color: var(--primary-light);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.9rem;
  line-height: 1.8;
}

.expert-help-text p {
  margin: 6px 0;
  display: flex;
  align-items: center;
}

.expert-help-text .el-icon {
  margin-right: 8px;
  color: var(--primary-color);
}
</style> 