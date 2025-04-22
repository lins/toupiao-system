import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = 'http://localhost:3001'

// 从本地存储加载专家ID
const loadExpertIdFromStorage = () => {
  const saved = localStorage.getItem('currentExpert')
  return saved ? JSON.parse(saved) : null
}

// 从本地存储加载管理员状态
const loadAdminStatusFromStorage = () => {
  return localStorage.getItem('isAdmin') === 'true'
}

// 管理员凭证
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
}

export const useStore = defineStore('main', {
  state: () => ({
    teams: [],
    experts: [],
    categories: [],
    currentTeam: null,
    currentExpert: loadExpertIdFromStorage(),
    scores: {},
    results: [],
    isAdmin: loadAdminStatusFromStorage()
  }),
  
  getters: {
    getTeamById: (state) => (id) => {
      return state.teams.find(team => team.id === parseInt(id))
    },
    
    getCategoryScores: (state) => (teamId, categoryId) => {
      if (!state.scores[teamId]) return []
      return state.experts.map(expert => {
        const scoreKey = `${teamId}-${expert.id}-${categoryId}`
        return {
          expertId: expert.id,
          expertName: expert.name,
          score: state.scores[scoreKey] || null
        }
      })
    },
    
    isLoggedIn: (state) => {
      return state.currentExpert !== null || state.isAdmin
    },
    
    currentExpertInfo: (state) => {
      if (!state.currentExpert) return null;
      
      // 如果currentExpert已经是一个有name属性的对象，直接返回
      if (typeof state.currentExpert === 'object' && state.currentExpert.name) {
        return state.currentExpert;
      }
      
      // 如果是ID，则查找对应的专家
      return state.experts.find(e => e.id === state.currentExpert);
    }
  },
  
  actions: {
    // Team actions
    async fetchTeams() {
      try {
        const response = await axios.get(`${API_URL}/teams`)
        this.teams = response.data
        return response.data
      } catch (error) {
        console.error('Error fetching teams:', error)
        throw error
      }
    },
    
    async addTeam(name, orderNumber) {
      // 检查是否是管理员
      if (!this.isAdmin) {
        throw new Error('只有管理员可以添加队伍')
      }
      
      try {
        const response = await axios.post(`${API_URL}/teams`, {
          name,
          order_number: orderNumber
        })
        this.teams.push(response.data)
        return response.data
      } catch (error) {
        console.error('Error adding team:', error)
        throw error
      }
    },
    
    async deleteTeam(teamId) {
      // 检查是否是管理员
      if (!this.isAdmin) {
        throw new Error('只有管理员可以删除队伍')
      }
      
      try {
        await axios.delete(`${API_URL}/teams/${teamId}`)
        
        // 更新本地状态
        this.teams = this.teams.filter(team => team.id !== parseInt(teamId))
        return true
      } catch (error) {
        console.error('Error deleting team:', error)
        throw error
      }
    },
    
    // Expert actions
    async fetchExperts() {
      try {
        const response = await axios.get(`${API_URL}/experts`)
        this.experts = response.data
        return response.data
      } catch (error) {
        console.error('Error fetching experts:', error)
        throw error
      }
    },
    
    async addExpert(name, password) {
      // 检查是否是管理员
      if (!this.isAdmin) {
        throw new Error('只有管理员可以添加评委')
      }
      
      try {
        const response = await axios.post(`${API_URL}/experts`, { name, password })
        this.experts.push(response.data)
        return response.data
      } catch (error) {
        console.error('Error adding expert:', error)
        throw error
      }
    },
    
    async updateExpert(expertId, name, password) {
      // 检查是否是管理员
      if (!this.isAdmin) {
        throw new Error('只有管理员可以修改评委信息')
      }
      
      try {
        // 创建更新的数据对象，如果密码为空则不更新密码
        const updateData = { name }
        if (password) {
          updateData.password = password
        }
        
        const response = await axios.put(`${API_URL}/experts/${expertId}`, updateData)
        
        // 更新本地状态
        const index = this.experts.findIndex(e => e.id === parseInt(expertId))
        if (index !== -1) {
          this.experts[index].name = name
        }
        
        return response.data
      } catch (error) {
        console.error('Error updating expert:', error)
        throw error
      }
    },
    
    async deleteExpert(expertId) {
      // 检查是否是管理员
      if (!this.isAdmin) {
        throw new Error('只有管理员可以删除评委')
      }
      
      // 不允许删除所有评委
      if (this.experts.length <= 1) {
        throw new Error('系统至少需要保留一个评委')
      }
      
      try {
        await axios.delete(`${API_URL}/experts/${expertId}`)
        
        // 更新本地状态
        this.experts = this.experts.filter(e => e.id !== parseInt(expertId))
        
        // 如果删除的是当前登录的评委，则注销登录
        if (this.currentExpert && this.currentExpert.id === parseInt(expertId)) {
          this.setCurrentExpert(null)
        }
        
        return true
      } catch (error) {
        console.error('Error deleting expert:', error)
        throw error
      }
    },
    
    setCurrentExpert(expert) {
      this.currentExpert = expert
      // 保存到本地存储以实现持久化登录
      if (expert === null) {
        localStorage.removeItem('currentExpert')
      } else {
        localStorage.setItem('currentExpert', JSON.stringify(expert))
      }
    },
    
    // Login and logout
    async expertLogin(expertId, password) {
      try {
        const response = await axios.post(`${API_URL}/api/login/expert`, {
          username: expertId,
          password
        })
        
        if (response.data.success) {
          this.setCurrentExpert(response.data.expert)
          return response.data.expert
        } else {
          throw new Error(response.data.message || '登录失败')
        }
      } catch (error) {
        console.error('Expert login failed:', error)
        throw error
      }
    },
    
    logout() {
      this.setCurrentExpert(null)
      if (this.isAdmin) {
        this.adminLogout()
      }
    },
    
    // 管理员登录
    async adminLogin(username, password) {
      // 验证管理员凭证
      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        this.isAdmin = true
        localStorage.setItem('isAdmin', 'true')
        return true
      } else {
        throw new Error('管理员用户名或密码错误')
      }
    },
    
    // 管理员退出登录
    adminLogout() {
      this.isAdmin = false
      localStorage.removeItem('isAdmin')
    },
    
    // Category actions
    async fetchCategories() {
      try {
        const response = await axios.get(`${API_URL}/categories`)
        this.categories = response.data
        return response.data
      } catch (error) {
        console.error('Error fetching categories:', error)
        throw error
      }
    },
    
    async addCategory(name) {
      // 检查是否是管理员
      if (!this.isAdmin) {
        throw new Error('只有管理员可以添加评分项目')
      }
      
      try {
        const response = await axios.post(`${API_URL}/categories`, { name })
        this.categories.push(response.data)
        return response.data
      } catch (error) {
        console.error('Error adding category:', error)
        throw error
      }
    },
    
    async updateCategory(categoryId, name) {
      // 检查是否是管理员
      if (!this.isAdmin) {
        throw new Error('只有管理员可以修改评分项目')
      }
      
      try {
        const response = await axios.put(`${API_URL}/categories/${categoryId}`, { name })
        // 更新本地状态
        const index = this.categories.findIndex(c => c.id === parseInt(categoryId))
        if (index !== -1) {
          this.categories[index].name = name
        }
        return response.data
      } catch (error) {
        console.error('Error updating category:', error)
        throw error
      }
    },
    
    async deleteCategory(categoryId) {
      // 检查是否是管理员
      if (!this.isAdmin) {
        throw new Error('只有管理员可以删除评分项目')
      }
      
      // 不允许删除所有评分项目
      if (this.categories.length <= 1) {
        throw new Error('系统至少需要保留一个评分项目')
      }
      
      try {
        await axios.delete(`${API_URL}/categories/${categoryId}`)
        // 更新本地状态
        this.categories = this.categories.filter(c => c.id !== parseInt(categoryId))
        return true
      } catch (error) {
        console.error('Error deleting category:', error)
        throw error
      }
    },
    
    // Score actions
    async fetchScoresForTeam(teamId) {
      try {
        const response = await axios.get(`${API_URL}/scores/${teamId}`)
        
        // Organize scores by expert-category
        response.data.forEach(score => {
          const key = `${teamId}-${score.expert_id}-${score.category_id}`
          this.scores[key] = score.score
        })
        
        return response.data
      } catch (error) {
        console.error(`Error fetching scores for team ${teamId}:`, error)
        throw error
      }
    },
    
    async submitScore(teamId, expertId, categoryId, score) {
      try {
        await axios.post(`${API_URL}/scores`, {
          team_id: parseInt(teamId),
          expert_id: parseInt(expertId),
          category_id: parseInt(categoryId),
          score: parseFloat(score)
        })
        
        // Update local state
        const key = `${teamId}-${expertId}-${categoryId}`
        this.scores[key] = score
      } catch (error) {
        console.error('Error submitting score:', error)
        throw error
      }
    },
    
    // Results actions
    async fetchResults() {
      try {
        const response = await axios.get(`${API_URL}/results`)
        this.results = response.data
        return response.data
      } catch (error) {
        console.error('Error fetching results:', error)
        throw error
      }
    }
  }
}) 