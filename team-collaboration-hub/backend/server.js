const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

// 模拟数据库 - 存储用户、项目、任务
let users = [];
let projects = [];
let tasks = [];
let currentProjectId = 1;
let currentTaskId = 1;

// JWT密钥
const JWT_SECRET = 'team-collaboration-secret-2025';

// 用户注册
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({ message: '所有字段都是必填的' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: '密码至少需要6位' });
    }

    // 检查用户是否存在
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: '该邮箱已被注册' });
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建用户
    const user = {
      id: users.length + 1,
      username,
      email,
      password: hashedPassword,
      createdAt: new Date()
    };
    
    users.push(user);
    
    // 为新用户创建默认项目
    const defaultProject = {
      id: currentProjectId++,
      name: '我的第一个项目',
      description: '欢迎使用团队协作中心！这是您的默认项目。',
      userId: user.id,
      createdAt: new Date()
    };
    projects.push(defaultProject);
    
    // 创建默认任务
    const defaultTasks = [
      {
        id: currentTaskId++,
        title: '探索系统功能',
        description: '了解如何使用团队协作中心',
        status: 'todo',
        assignee: user.username,
        priority: 'medium',
        projectId: defaultProject.id,
        createdAt: new Date()
      },
      {
        id: currentTaskId++,
        title: '创建第一个任务',
        description: '尝试添加您自己的任务',
        status: 'inprogress',
        assignee: user.username,
        priority: 'high',
        projectId: defaultProject.id,
        createdAt: new Date()
      }
    ];
    defaultTasks.forEach(task => tasks.push(task));
    
    // 生成token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    
    res.status(201).json({
      message: '注册成功！',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: '服务器错误，请稍后重试' });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: '邮箱和密码是必填的' });
    }
    
    // 查找用户
    const user = users.find(user => user.email === email);
    if (!user) {
      return res.status(400).json({ message: '用户不存在' });
    }
    
    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: '密码错误' });
    }
    
    // 生成token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    
    res.json({
      message: '登录成功！',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误，请稍后重试' });
  }
});

// 中间件：验证JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: '访问被拒绝，需要登录' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '令牌无效' });
    }
    req.user = user;
    next();
  });
};

// 获取用户的项目
app.get('/api/projects', authenticateToken, (req, res) => {
  const userProjects = projects.filter(project => project.userId === req.user.userId);
  res.json(userProjects);
});

// 创建新项目
app.post('/api/projects', authenticateToken, (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: '项目名称是必填的' });
  }
  
  const project = {
    id: currentProjectId++,
    name,
    description: description || '',
    userId: req.user.userId,
    createdAt: new Date()
  };
  
  projects.push(project);
  res.status(201).json(project);
});

// 获取项目的任务
app.get('/api/projects/:projectId/tasks', authenticateToken, (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const projectTasks = tasks.filter(task => task.projectId === projectId);
  res.json(projectTasks);
});

// 创建新任务
app.post('/api/projects/:projectId/tasks', authenticateToken, (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const { title, description, priority } = req.body;
  
  if (!title) {
    return res.status(400).json({ message: '任务标题是必填的' });
  }
  
  // 获取用户信息
  const user = users.find(u => u.id === req.user.userId);
  
  const task = {
    id: currentTaskId++,
    projectId,
    title,
    description: description || '',
    assignee: user.username,
    priority: priority || 'medium',
    status: 'todo',
    createdAt: new Date()
  };
  
  tasks.push(task);
  res.status(201).json(task);
});

// 更新任务状态
app.put('/api/tasks/:taskId', authenticateToken, (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const { status } = req.body;
  
  const validStatuses = ['todo', 'inprogress', 'done'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: '无效的任务状态' });
  }
  
  const task = tasks.find(t => t.id === taskId);
  if (!task) {
    return res.status(404).json({ message: '任务未找到' });
  }
  
  // 检查用户是否有权限修改这个任务
  const project = projects.find(p => p.id === task.projectId);
  if (!project || project.userId !== req.user.userId) {
    return res.status(403).json({ message: '无权修改此任务' });
  }
  
  task.status = status;
  task.updatedAt = new Date();
  
  res.json(task);
});

// 删除任务
app.delete('/api/tasks/:taskId', authenticateToken, (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  
  if (taskIndex === -1) {
    return res.status(404).json({ message: '任务未找到' });
  }
  
  const task = tasks[taskIndex];
  const project = projects.find(p => p.id === task.projectId);
  
  // 检查用户权限
  if (!project || project.userId !== req.user.userId) {
    return res.status(403).json({ message: '无权删除此任务' });
  }
  
  tasks.splice(taskIndex, 1);
  res.json({ message: '任务删除成功' });
});

// 测试接口
app.get('/api/test', (req, res) => {
  res.json({ 
    message: '后端服务器运行成功！', 
    timestamp: new Date(),
    usersCount: users.length,
    projectsCount: projects.length,
    tasksCount: tasks.length
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({ 
    message: '团队协作中心后端服务器',
    version: '1.0',
    endpoints: {
      test: 'GET /api/test',
      register: 'POST /api/register',
      login: 'POST /api/login', 
      projects: 'GET /api/projects',
      createProject: 'POST /api/projects',
      tasks: 'GET /api/projects/:id/tasks',
      createTask: 'POST /api/projects/:id/tasks',
      updateTask: 'PUT /api/tasks/:id'
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 测试接口: http://localhost:${PORT}/api/test`);
  console.log(`🏠 首页: http://localhost:${PORT}/`);
});