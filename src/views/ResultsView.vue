<template>
  <div class="results-view">
    <h1 class="page-title">评分结果</h1>
    
    <div class="card">
      <div class="card-title-with-actions">
        <h2 class="card-title">成绩排名</h2>
        <el-button type="primary" @click="refreshResults">
          <el-icon><Refresh /></el-icon> 刷新数据
        </el-button>
      </div>
      
      <div v-if="isLoading" class="text-center py-4">
        <el-skeleton :rows="5" animated />
      </div>
      
      <div v-else-if="results.length === 0" class="empty-state">
        <el-empty description="暂无评分数据" />
      </div>
      
      <div v-else>
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>队伍名称</th>
                <th v-for="category in categories" :key="category.id">
                  {{ category.name }}
                </th>
                <th>总分</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(team, index) in results" :key="team.id">
                <td>{{ index + 1 }}</td>
                <td>{{ team.name }}</td>
                <td v-for="category in categories" :key="category.id">
                  {{ formatScore(team.categories[category.id]?.average) }}
                </td>
                <td class="overall-score">{{ formatScore(team.overall_score || team.overall_average) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="score-details mt-4">
          <el-collapse accordion>
            <el-collapse-item 
              v-for="team in results" 
              :key="team.id" 
              :title="`${team.name} 详细评分`"
              :name="team.id"
            >
              <div class="score-details-content">
                <div v-for="category in categories" :key="category.id" class="category-score-details">
                  <h4>{{ category.name }}</h4>
                  <div class="score-distribution">
                    <el-table :data="getScoresForCategory(team, category.id)" stripe border>
                      <el-table-column prop="expertName" label="评委" width="120" />
                      <el-table-column prop="score" label="分数">
                        <template #default="scope">
                          <span :class="getScoreClass(scope.row.score)">
                            {{ formatScore(scope.row.score) }}
                          </span>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                  
                  <div class="score-calculation">
                    <p><strong>计算方法:</strong></p>
                    <ul>
                      <li>原始分数: {{ getOriginalScores(team, category.id).join(', ') }}</li>
                      <li v-if="hasZeroScore(team, category.id)">
                        0分不计入平均分
                      </li>
                      <li v-if="getFilteredScores(team, category.id).length >= 3">
                        去掉最高分 {{ getHighestScore(team, category.id) }} 和最低分 {{ getLowestScore(team, category.id) }}
                      </li>
                      <li>
                        项目得分: {{ formatScore(team.categories[category.id]?.average) }}
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div class="total-score-explanation">
                  <h4>总分计算说明</h4>
                  <p>总分 = 所有评分项目得分的总和</p>
                  <div class="score-detail">
                    <div v-for="category in categories" :key="category.id" class="score-item">
                      <span class="score-name">{{ category.name }}:</span> 
                      <span class="score-value">{{ formatScore(team.categories[category.id]?.average) }}</span>
                    </div>
                    <div class="score-total">
                      <span class="score-name">总分:</span>
                      <span class="score-value highlight">{{ formatScore(team.overall_score || team.overall_average) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from '@/store'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

const store = useStore()
const isLoading = ref(true)

// Get data from store
const results = computed(() => store.results)
const categories = computed(() => store.categories)

// Format score to 1 decimal place
const formatScore = (score) => {
  if (score === undefined || score === null) return '-'
  return score.toFixed(1)
}

// Get score CSS class based on score value
const getScoreClass = (score) => {
  if (score === 0) return 'score-zero'
  if (score < 4) return 'score-low'
  if (score < 7) return 'score-medium'
  return 'score-high'
}

// Get all scores for a category
const getScoresForCategory = (team, categoryId) => {
  if (!team || !team.categories[categoryId]) return []
  
  // 优先使用包含评委ID的scores数据
  const scoresWithExperts = team.categories[categoryId].scoresWithExperts || []
  const experts = store.experts
  
  if (scoresWithExperts.length > 0) {
    // 使用带有评委ID的数据
    return scoresWithExperts.map(item => {
      // 确保将评委ID转换为整数进行比较
      const expertId = parseInt(item.expert_id)
      const expert = experts.find(e => e.id === expertId)
      return {
        expertId: expertId,
        expertName: expert ? expert.name : `评委${expertId}`,
        score: item.score
      }
    })
  } else {
    // 兼容旧数据
    const categoryScores = team.categories[categoryId].scores || []
    return categoryScores.map((score, index) => {
      const expertId = index + 1
      const expert = experts.find(e => e.id === expertId)
      return {
        expertId: expertId,
        expertName: expert ? expert.name : `评委${expertId}`,
        score: score
      }
    })
  }
}

// Get original scores (before filtering)
const getOriginalScores = (team, categoryId) => {
  if (!team || !team.categories[categoryId]) return []
  return team.categories[categoryId].scores.map(s => formatScore(s))
}

// Check if a category has zero scores
const hasZeroScore = (team, categoryId) => {
  if (!team || !team.categories[categoryId]) return false
  return team.categories[categoryId].scores.some(s => s === 0)
}

// Get filtered scores (no zeros)
const getFilteredScores = (team, categoryId) => {
  if (!team || !team.categories[categoryId]) return []
  return team.categories[categoryId].scores.filter(s => s > 0)
}

// Get highest score for a category
const getHighestScore = (team, categoryId) => {
  const scores = getFilteredScores(team, categoryId)
  if (!scores.length) return '-'
  return formatScore(Math.max(...scores))
}

// Get lowest score for a category
const getLowestScore = (team, categoryId) => {
  const scores = getFilteredScores(team, categoryId)
  if (!scores.length) return '-'
  return formatScore(Math.min(...scores))
}

// Fetch results and teams
const fetchData = async () => {
  isLoading.value = true
  try {
    await Promise.all([
      store.fetchCategories(),
      store.fetchExperts(),
      store.fetchResults()
    ])
  } catch (error) {
    console.error('Error fetching results:', error)
    ElMessage.error('加载结果数据失败')
  } finally {
    isLoading.value = false
  }
}

// Refresh results
const refreshResults = async () => {
  await fetchData()
  ElMessage.success('数据已刷新')
}

// On component mount
onMounted(async () => {
  await fetchData()
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

.card {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin-bottom: 20px;
}

.card-title-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.card-title-with-actions .card-title {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
  font-weight: 600;
  color: var(--primary-color);
}

.overall-score {
  font-weight: bold;
  color: var(--primary-color);
}

.empty-state {
  padding: 2rem 0;
  text-align: center;
}

.score-details {
  margin-top: 2rem;
}

.score-details-content {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .score-details-content {
    grid-template-columns: repeat(2, 1fr);
  }
}

.category-score-details {
  background-color: var(--primary-light);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.category-score-details h4 {
  margin-bottom: 1rem;
  color: var(--primary-color);
  font-weight: 600;
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: 6px;
}

.score-distribution {
  margin-bottom: 1rem;
}

.score-calculation {
  font-size: 0.9rem;
  color: var(--info-color);
  background-color: rgba(255, 255, 255, 0.7);
  padding: 10px;
  border-radius: 6px;
}

.score-calculation ul {
  margin-left: 1.5rem;
  margin-top: 0.5rem;
}

.score-zero {
  color: var(--danger-color);
  font-weight: bold;
}

.score-low {
  color: var(--warning-color);
}

.score-medium {
  color: var(--info-color);
}

.score-high {
  color: var(--success-color);
  font-weight: bold;
}

.total-score-explanation {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  grid-column: 1 / -1;
  margin-top: 1.5rem;
}

.total-score-explanation h4 {
  margin-bottom: 0.5rem;
  color: var(--primary-color);
  font-weight: 600;
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: 6px;
}

.score-detail {
  margin-top: 1rem;
  background-color: var(--primary-light);
  padding: 1rem;
  border-radius: 8px;
}

.score-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.score-total {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  margin-top: 0.5rem;
  border-top: 2px solid var(--primary-color);
  font-weight: bold;
}

.score-name {
  color: var(--text-color);
}

.score-value {
  color: var(--info-color);
}

.score-value.highlight {
  color: var(--primary-color);
  font-size: 1.1em;
}

.mt-4 {
  margin-top: 1.5rem;
}

/* 美化表格样式 */
.custom-table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.custom-table th {
  background-color: var(--primary-light);
  color: var(--primary-color);
  font-weight: 600;
  padding: 12px 15px;
  text-align: left;
}

.custom-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #f0f0f0;
}

.custom-table tbody tr:nth-child(even) {
  background-color: #fafafa;
}

.custom-table tbody tr:hover {
  background-color: var(--primary-light);
}

/* 美化折叠面板 */
:deep(.el-collapse) {
  border: none;
}

:deep(.el-collapse-item__header) {
  background-color: var(--primary-light);
  font-weight: 600;
  color: var(--primary-color);
  border-radius: 6px;
  padding: 0 15px;
  margin-bottom: 10px;
}

:deep(.el-collapse-item__content) {
  padding: 15px;
  background-color: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
</style> 