const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Create or connect to SQLite database
const dbPath = path.resolve(__dirname, 'toupiao.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Create tables sequentially using callbacks to ensure order
  db.serialize(() => {
    // Teams table
    db.run(`CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      order_number INTEGER NOT NULL
    )`);

    // Experts table
    db.run(`CREATE TABLE IF NOT EXISTS experts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      password TEXT DEFAULT NULL
    )`);

    // Check if password column exists in experts table, add it if it doesn't
    db.get("PRAGMA table_info(experts)", (err, rows) => {
      if (err) {
        console.error('Error checking experts table schema:', err);
        return;
      }
      
      // Check if the password column exists
      db.get("SELECT COUNT(*) as count FROM pragma_table_info('experts') WHERE name = 'password'", (err, row) => {
        if (err) {
          console.error('Error checking for password column:', err);
          return;
        }
        
        if (row.count === 0) {
          console.log('Password column missing from experts table. Adding it now...');
          db.run("ALTER TABLE experts ADD COLUMN password TEXT DEFAULT NULL", (err) => {
            if (err) {
              console.error('Error adding password column:', err);
              return;
            }
            console.log('Password column added successfully');
            
            // Now update all experts with their ID as password
            updateExpertPasswords();
          });
        } else {
          console.log('Password column exists in experts table');
          // Update passwords anyway to ensure they match IDs
          updateExpertPasswords();
        }
      });
    });

    // Categories table for scoring criteria
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )`);

    // Scores table
    db.run(`CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      expert_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      score REAL NOT NULL CHECK (score >= 0 AND score <= 10),
      FOREIGN KEY (team_id) REFERENCES teams (id),
      FOREIGN KEY (expert_id) REFERENCES experts (id),
      FOREIGN KEY (category_id) REFERENCES categories (id),
      UNIQUE(team_id, expert_id, category_id)
    )`);

    // Insert default scoring categories if they don't exist
    const defaultCategories = [
      '方案创新性', '技术先进性', '实用价值', '展示质量', '团队协作'
    ];
    
    const categoryStmt = db.prepare('INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)');
    defaultCategories.forEach((category, index) => {
      categoryStmt.run(index + 1, category);
    });
    categoryStmt.finalize();
    
    // Insert default values if tables are empty
    db.get("SELECT COUNT(*) as count FROM experts", (err, row) => {
      if (err) {
        console.error(err);
        return;
      }
      if (row.count === 0) {
        // Insert experts
        db.run(
          "INSERT INTO experts (name, password) VALUES (?, ?)",
          ["专家1", "1"],
          (err) => {
            if (err) console.error(err);
          }
        );
        db.run(
          "INSERT INTO experts (name, password) VALUES (?, ?)",
          ["专家2", "2"],
          (err) => {
            if (err) console.error(err);
          }
        );
      }
    });

    console.log('Database initialized successfully');
  });
}

// Helper function to update expert passwords to match their IDs
function updateExpertPasswords() {
  db.all("SELECT id FROM experts", [], (err, experts) => {
    if (err) {
      console.error('Error getting experts:', err);
      return;
    }
    
    console.log(`Updating passwords for ${experts.length} experts...`);
    experts.forEach(expert => {
      db.run("UPDATE experts SET password = ? WHERE id = ?", [expert.id.toString(), expert.id], (err) => {
        if (err) console.error(`Error updating expert ${expert.id} password:`, err);
        else console.log(`Updated password for expert ID ${expert.id}`);
      });
    });
  });
}

// API Routes
// Get all teams
app.get('/teams', (req, res) => {
  db.all('SELECT * FROM teams ORDER BY order_number', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add a new team
app.post('/teams', (req, res) => {
  const { name, order_number } = req.body;
  db.run('INSERT INTO teams (name, order_number) VALUES (?, ?)', 
    [name, order_number], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, name, order_number });
  });
});

// Get all experts
app.get('/experts', (req, res) => {
  db.all('SELECT id, name FROM experts', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add a new expert
app.post('/experts', (req, res) => {
  const { name, password } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '评委姓名不能为空' });
  }
  
  if (!password) {
    return res.status(400).json({ error: '评委密码不能为空' });
  }
  
  db.run('INSERT INTO experts (name, password) VALUES (?, ?)', 
    [name, password], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // 返回新创建的专家信息（不包含密码）
    res.json({ 
      id: this.lastID, 
      name,
      message: '评委添加成功'
    });
  });
});

// Get all categories
app.get('/categories', (req, res) => {
  db.all('SELECT * FROM categories', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add a new category
app.post('/categories', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: '评分项目名称不能为空' });
  }
  
  db.run('INSERT INTO categories (name) VALUES (?)', [name], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, name });
  });
});

// Update a category
app.put('/categories/:id', (req, res) => {
  const categoryId = req.params.id;
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '评分项目名称不能为空' });
  }
  
  db.run('UPDATE categories SET name = ? WHERE id = ?', [name, categoryId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: '未找到该评分项目' });
      return;
    }
    
    res.json({ id: parseInt(categoryId), name, message: '评分项目更新成功' });
  });
});

// Delete a category
app.delete('/categories/:id', (req, res) => {
  const categoryId = req.params.id;
  
  // 检查系统中是否还有其他评分项目
  db.get('SELECT COUNT(*) as count FROM categories', [], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (row.count <= 1) {
      res.status(400).json({ error: '系统至少需要保留一个评分项目' });
      return;
    }
    
    // 首先删除与该评分项目关联的所有评分
    db.run('DELETE FROM scores WHERE category_id = ?', [categoryId], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // 然后删除评分项目
      db.run('DELETE FROM categories WHERE id = ?', [categoryId], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        if (this.changes === 0) {
          res.status(404).json({ error: '未找到该评分项目' });
          return;
        }
        
        res.json({ success: true, message: '评分项目删除成功' });
      });
    });
  });
});

// Submit a score
app.post('/scores', (req, res) => {
  const { team_id, expert_id, category_id, score } = req.body;
  
  console.log('Score submission request:', req.body);
  
  // Validate inputs
  if (team_id === undefined || expert_id === undefined || category_id === undefined || score === undefined) {
    console.error('Score submission missing required fields:', req.body);
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Convert params to proper types
  const teamIdNum = parseInt(team_id);
  const expertIdNum = parseInt(expert_id);
  const categoryIdNum = parseInt(category_id);
  const scoreNum = parseFloat(score);
  
  // Validate types
  if (isNaN(teamIdNum) || isNaN(expertIdNum) || isNaN(categoryIdNum) || isNaN(scoreNum)) {
    console.error('Score submission invalid parameter types:', {
      team_id, expert_id, category_id, score,
      teamIdNum, expertIdNum, categoryIdNum, scoreNum
    });
    return res.status(400).json({ error: 'Invalid parameter types' });
  }
  
  // Validate score (must be between 0 and 10)
  if (scoreNum < 0 || scoreNum > 10) {
    console.error('Score out of range:', scoreNum);
    return res.status(400).json({ error: 'Score must be between 0 and 10' });
  }
  
  // Verify team exists
  db.get('SELECT id FROM teams WHERE id = ?', [teamIdNum], (err, team) => {
    if (err) {
      console.error('Database error checking team:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!team) {
      console.error('Team not found:', teamIdNum);
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Verify expert exists
    db.get('SELECT id FROM experts WHERE id = ?', [expertIdNum], (err, expert) => {
      if (err) {
        console.error('Database error checking expert:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (!expert) {
        console.error('Expert not found:', expertIdNum);
        return res.status(404).json({ error: 'Expert not found' });
      }
      
      // Verify category exists
      db.get('SELECT id FROM categories WHERE id = ?', [categoryIdNum], (err, category) => {
        if (err) {
          console.error('Database error checking category:', err);
          return res.status(500).json({ error: err.message });
        }
        
        if (!category) {
          console.error('Category not found:', categoryIdNum);
          return res.status(404).json({ error: 'Category not found' });
        }
        
        // All validations passed, insert or update the score
        console.log(`Saving score: team=${teamIdNum}, expert=${expertIdNum}, category=${categoryIdNum}, score=${scoreNum}`);
        
        db.run(`INSERT INTO scores (team_id, expert_id, category_id, score) 
          VALUES (?, ?, ?, ?)
          ON CONFLICT(team_id, expert_id, category_id) 
          DO UPDATE SET score = ?`, 
          [teamIdNum, expertIdNum, categoryIdNum, scoreNum, scoreNum], function(err) {
          if (err) {
            console.error('Database error saving score:', err);
            res.status(500).json({ error: err.message });
            return;
          }
          
          console.log(`Score saved successfully, row ID: ${this.lastID}`);
          res.json({ 
            id: this.lastID, 
            team_id: teamIdNum, 
            expert_id: expertIdNum, 
            category_id: categoryIdNum, 
            score: scoreNum 
          });
        });
      });
    });
  });
});

// Get scores for a team
app.get('/scores/:teamId', (req, res) => {
  const teamId = req.params.teamId;
  db.all(`SELECT s.*, e.name as expert_name, c.name as category_name
    FROM scores s
    JOIN experts e ON s.expert_id = e.id
    JOIN categories c ON s.category_id = c.id
    WHERE s.team_id = ?`, [teamId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get results - average scores for all teams
app.get('/results', (req, res) => {
  db.all(`SELECT t.id, t.name, c.id as category_id, c.name as category_name
    FROM teams t, categories c
    ORDER BY t.order_number, c.id`, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Group results by team
    const teams = {};
    rows.forEach(row => {
      if (!teams[row.id]) {
        teams[row.id] = {
          id: row.id,
          name: row.name,
          categories: {}
        };
      }
      teams[row.id].categories[row.category_id] = {
        id: row.category_id,
        name: row.category_name,
        scores: [],
        scoresWithExperts: [] // Initialize this array
      };
    });
    
    // Function to calculate adjusted average
    const calculateAdjustedAverage = (scores) => {
      // Remove zero scores
      const filteredScores = scores.filter(score => score > 0);
      
      if (filteredScores.length === 0) return 0;
      if (filteredScores.length === 1) return filteredScores[0];
      
      // Sort scores
      filteredScores.sort((a, b) => a - b);
      
      // Remove highest and lowest if we have enough scores
      if (filteredScores.length >= 3) {
        filteredScores.shift(); // Remove lowest
        filteredScores.pop();   // Remove highest
      }
      
      // Calculate average of remaining scores
      const sum = filteredScores.reduce((acc, score) => acc + score, 0);
      return sum / filteredScores.length;
    };
    
    // Get all scores and calculate averages
    const promises = Object.values(teams).map(team => {
      const teamPromises = Object.keys(team.categories).map(categoryId => {
        return new Promise((resolve, reject) => {
          db.all('SELECT score, expert_id FROM scores WHERE team_id = ? AND category_id = ?', 
            [team.id, categoryId], (err, scoreRows) => {
            if (err) {
              reject(err);
              return;
            }
            
            const scoresWithExperts = scoreRows.map(row => ({
              score: row.score,
              expert_id: parseInt(row.expert_id) // 确保expert_id是整数
            }));
            
            console.log(`Team ${team.id}, category ${categoryId} scores:`, JSON.stringify(scoresWithExperts));
            
            // 保存原始分数（包含评委ID）
            team.categories[categoryId].scoresWithExperts = scoresWithExperts;
            
            // 只提取分数用于计算平均值
            const scores = scoresWithExperts.map(item => item.score);
            team.categories[categoryId].scores = scores;
            team.categories[categoryId].average = calculateAdjustedAverage(scores);
            
            resolve();
          });
        });
      });
      
      return Promise.all(teamPromises).then(() => {
        // 计算总分：从平均值改为各项得分的求和
        const categoryAverages = Object.values(team.categories).map(cat => cat.average);
        // 总分就是所有分项的得分之和
        team.overall_score = categoryAverages.reduce((acc, avg) => acc + avg, 0);
        // 保留overall_average用于兼容性，等于总分
        team.overall_average = team.overall_score;
      });
    });
    
    Promise.all(promises)
      .then(() => {
        // 按总分排序（从高到低）
        const sortedTeams = Object.values(teams).sort((a, b) => b.overall_score - a.overall_score);
        
        // 检查数据是否包含scoresWithExperts
        for (const team of sortedTeams) {
          for (const categoryId in team.categories) {
            console.log(`Team ${team.id}, category ${categoryId} has ${team.categories[categoryId].scoresWithExperts.length} scores with experts`);
          }
        }
        
        res.json(sortedTeams);
      })
      .catch(error => {
        res.status(500).json({ error: error.message });
      });
  });
});

// Delete a team
app.delete('/teams/:id', (req, res) => {
  const teamId = req.params.id;
  
  // First delete all scores associated with the team
  db.run('DELETE FROM scores WHERE team_id = ?', [teamId], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Then delete the team
    db.run('DELETE FROM teams WHERE id = ?', [teamId], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }
      
      res.json({ success: true, message: 'Team deleted successfully' });
    });
  });
});

// Update an expert
app.put('/experts/:id', (req, res) => {
  const expertId = req.params.id;
  const { name, password } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '评委名称不能为空' });
  }
  
  let updateSql = 'UPDATE experts SET name = ?';
  let params = [name];
  
  // 如果提供了密码，同时更新密码
  if (password !== undefined) {
    updateSql += ', password = ?';
    params.push(password);
  }
  
  updateSql += ' WHERE id = ?';
  params.push(expertId);
  
  db.run(updateSql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: '未找到该专家' });
      return;
    }
    
    // 返回更新后的专家信息
    db.get('SELECT id, name FROM experts WHERE id = ?', [expertId], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({
        ...row,
        message: '专家信息更新成功'
      });
    });
  });
});

// Delete an expert
app.delete('/experts/:id', (req, res) => {
  const expertId = req.params.id;
  
  // 检查是否还有其他评委
  db.get('SELECT COUNT(*) as count FROM experts', [], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (row.count <= 1) {
      res.status(400).json({ error: '系统至少需要保留一个评委' });
      return;
    }
    
    // 首先删除与该评委关联的所有评分
    db.run('DELETE FROM scores WHERE expert_id = ?', [expertId], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // 然后删除评委
      db.run('DELETE FROM experts WHERE id = ?', [expertId], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        if (this.changes === 0) {
          res.status(404).json({ error: '未找到该评委' });
          return;
        }
        
        res.json({ success: true, message: '评委删除成功' });
      });
    });
  });
});

// Expert login
app.post('/api/login/expert', (req, res) => {
  console.log('Login request received:', req.body);
  const { name, password, username } = req.body;
  
  // Check if we're using ID-based login (from frontend) or name-based login
  if ((name === undefined && username === undefined) || !password) {
    console.error('Login failed: Missing credentials');
    return res.status(400).json({ 
      success: false, 
      message: '用户名和密码不能为空',
      details: { 
        name: name, 
        username: username, 
        passwordProvided: password !== undefined 
      }
    });
  }

  // If username is a number, treat it as an ID; otherwise use name
  const isIdLogin = username !== undefined && !isNaN(parseInt(username));
  
  let query, params;
  if (isIdLogin) {
    // Login with ID
    const expertId = parseInt(username);
    console.log(`Login attempt with expert ID: ${expertId}, password: ${password}`);
    query = 'SELECT id, name FROM experts WHERE id = ? AND password = ?';
    params = [expertId, password];
  } else {
    // Login with name
    const loginName = name || username;
    console.log(`Login attempt with name: ${loginName}`);
    query = 'SELECT id, name FROM experts WHERE name = ? AND password = ?';
    params = [loginName, password];
  }

  console.log(`Executing query: ${query} with params:`, params);
  
  // First check if the expert exists at all (regardless of password)
  const checkExpertQuery = isIdLogin ? 
    'SELECT id, name, password FROM experts WHERE id = ?' : 
    'SELECT id, name, password FROM experts WHERE name = ?';
  
  const checkExpertParams = isIdLogin ? [parseInt(username)] : [name || username];
  
  db.get(checkExpertQuery, checkExpertParams, (err, expert) => {
    if (err) {
      console.error('Database error during expert check:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
    
    if (!expert) {
      console.log('Login failed: Expert not found');
      return res.status(401).json({ success: false, message: '专家不存在' });
    }
    
    console.log('Expert found:', expert);
    
    // Now check with password
    db.get(query, params, (err, expertWithPassword) => {
      if (err) {
        console.error('Database error during login:', err);
        return res.status(500).json({ success: false, message: '服务器错误' });
      }
      
      if (!expertWithPassword) {
        console.log('Login failed: Password mismatch');
        return res.status(401).json({ success: false, message: '密码错误' });
      }
      
      console.log(`Login successful for expert ID: ${expertWithPassword.id}, name: ${expertWithPassword.name}`);
      return res.json({
        success: true,
        expert: {
          id: expertWithPassword.id,
          name: expertWithPassword.name
        }
      });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 