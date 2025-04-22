<template>
  <div class="scoring-view">
    <el-page-header @back="goBack" title="返回队伍列表">
      <template #content>
        <span class="page-title" v-if="team">{{ team.name }} - 评分</span>
      </template>
    </el-page-header>
    
    <div class="card mt-4" v-if="team && currentExpert">
      <h2 class="card-title">评分表</h2>
      <p class="expert-info mb-4">评委: {{ getExpertName(currentExpert) }}</p>

      <div v-if="isLoading" class="text-center py-4">
        <el-skeleton :rows="5" animated />
      </div>
      
      <el-form v-else label-position="top">
        <div class="categories-grid">
          <div v-for="category in categories" :key="category.id" class="category-item">
            <el-form-item :label="category.name">
              <div class="score-input-container">
                <el-input-number
                  v-model="scores[category.id]"
                  :min="0"
                  :max="10"
                  :step="0.5"
                  :precision="1"
                  controls-position="right"
                  class="score-input"
                />
                <div class="score-description">
                  <small>{{ getScoreDescription(scores[category.id]) }}</small>
                </div>
              </div>
            </el-form-item>
          </div>
        </div>
        
        <div class="actions mt-4">
          <el-button type="primary" @click="submitScores" :loading="isSaving">
            提交评分
          </el-button>
          <el-button @click="goBack">取消</el-button>
        </div>
      </el-form>
    </div>
    
    <div v-else-if="!currentExpert" class="card mt-4">
      <el-alert
        type="warning"
        title="请先选择评委身份"
        description="请返回首页选择您的评委身份后再进行评分"
        :closable="false"
      />
      <div class="mt-4">
        <el-button type="primary" @click="goHome">返回首页</el-button>
      </div>
    </div>
    
    <div v-else-if="!team" class="card mt-4">
      <el-alert
        type="error"
        title="未找到队伍信息"
        description="无法找到该队伍，请返回队伍列表页面"
        :closable="false"
      />
      <div class="mt-4">
        <el-button type="primary" @click="goBack">返回</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '@/store'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const store = useStore()

// Reactive state
const scores = ref({})
const isLoading = ref(true)
const isSaving = ref(false)

// Team ID from route params
const teamId = computed(() => route.params.teamId)

// Get data from store
const team = computed(() => store.getTeamById(teamId.value))
const categories = computed(() => store.categories)
const currentExpert = computed(() => store.currentExpert)
const experts = computed(() => store.experts)
const isLoggedIn = computed(() => store.isLoggedIn)

// Check login state
onMounted(() => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再进行评分')
    router.push('/')
    return
  }
})

// Helper function to get expert name
const getExpertName = (expert) => {
  if (!expert) return '未知评委';
  
  // If expert is already the name, return it
  if (typeof expert === 'string') return expert;
  
  // If expert is an object with name property, return the name
  if (typeof expert === 'object' && expert.name) return expert.name;
  
  // If expert is a number or has an id property, find the expert by ID
  const expertId = typeof expert === 'object' ? expert.id : expert;
  const expertObj = experts.value.find(e => e.id === expertId);
  return expertObj ? expertObj.name : `${expertId}号评委`;
}

// Get score description based on value
const getScoreDescription = (score) => {
  if (score === undefined || score === null) return '未评分'
  if (score === 0) return '不及格 (0分)'
  if (score <= 3) return '较差 (1-3分)'
  if (score <= 6) return '一般 (4-6分)'
  if (score <= 8) return '良好 (7-8分)'
  return '优秀 (9-10分)'
}

// Navigate back to team list
const goBack = () => {
  router.push('/')
}

// Navigate to home
const goHome = () => {
  router.push('/')
}

// Load existing scores for this team/expert
const loadExistingScores = async () => {
  if (!teamId.value || !currentExpert.value) return
  
  isLoading.value = true
  try {
    await store.fetchScoresForTeam(teamId.value)
    
    // Get expert ID in a consistent format
    const expertId = typeof currentExpert.value === 'object' 
      ? currentExpert.value.id 
      : currentExpert.value;
    
    console.log(`Loading scores for team: ${teamId.value}, expert ID: ${expertId}`);
    
    // Initialize scores from store
    categories.value.forEach(category => {
      const scoreKey = `${teamId.value}-${expertId}-${category.id}`
      scores.value[category.id] = store.scores[scoreKey] || null
    })
  } catch (error) {
    console.error('Error loading scores:', error)
    ElMessage.error('加载评分数据失败')
  } finally {
    isLoading.value = false
  }
}

// Submit scores for all categories
const submitScores = async () => {
  // Check if all categories have scores
  const hasAllScores = categories.value.every(cat => 
    scores.value[cat.id] !== undefined && scores.value[cat.id] !== null
  )
  
  if (!hasAllScores) {
    ElMessage.warning('请为所有评分项目填写分数')
    return
  }
  
  if (!currentExpert.value || !currentExpert.value.id) {
    ElMessage.error('评委信息无效，请重新登录')
    return
  }
  
  isSaving.value = true
  
  try {
    console.log(`Submitting scores for team: ${teamId.value}, expert: ${JSON.stringify(currentExpert.value)}`)
    
    // Submit each category score
    const promises = categories.value.map(category => {
      const expertId = typeof currentExpert.value === 'object' 
        ? currentExpert.value.id 
        : currentExpert.value;
      
      console.log(`Submitting score for category ${category.id}: ${scores.value[category.id]}, expert ID: ${expertId}`);
      
      return store.submitScore(
        teamId.value, 
        expertId, 
        category.id, 
        scores.value[category.id]
      );
    });
    
    await Promise.all(promises)
    ElMessage.success('评分提交成功!')
    
    // Navigate back to team list
    router.push('/')
  } catch (error) {
    console.error('Error submitting scores:', error)
    ElMessage.error('评分提交失败，请重试')
  } finally {
    isSaving.value = false
  }
}

// Fetch data on component mount
onMounted(async () => {
  if (!isLoggedIn.value) return
  
  try {
    // Load all required data
    await Promise.all([
      store.fetchTeams(),
      store.fetchExperts(),
      store.fetchCategories()
    ])
    
    // Then load existing scores
    await loadExistingScores()
  } catch (error) {
    console.error('Failed to load initial data:', error)
    ElMessage.error('加载数据失败，请刷新页面重试')
    isLoading.value = false
  }
})

// Update scores when team or expert changes
watch([() => teamId.value, () => currentExpert.value], async () => {
  if (teamId.value && currentExpert.value) {
    await loadExistingScores()
  }
})
</script>

<style scoped>
.page-title {
  font-size: 1.2rem;
  font-weight: 600;
}

.expert-info {
  font-weight: 600;
  color: var(--primary-color);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.5rem;
}

@media (min-width: 640px) {
  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .categories-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.category-item {
  background-color: var(--primary-light);
  border-radius: 8px;
  padding: 1rem;
}

.score-input-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.score-input {
  width: 100%;
}

.score-description {
  color: var(--info-color);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.py-4 {
  padding-top: 1rem;
  padding-bottom: 1rem;
}
</style> 