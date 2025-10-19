const express = require('express');
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static('../frontend'));

// 内存数据存储
let projects = [{ id: 1, name: '示例项目' }];
let tasks = [{ id: 1, title: '示例任务', projectId: 1, status: 'todo' }];

// API路由
app.get('/api/projects', (req, res) => {
    res.json(projects);
});

app.post('/api/projects', (req, res) => {
    const project = { id: Date.now(), name: req.body.name };
    projects.push(project);
    res.json(project);
});

app.get('/api/projects/:id/tasks', (req, res) => {
    const projectTasks = tasks.filter(task => task.projectId == req.params.id);
    res.json(projectTasks);
});

app.post('/api/projects/:id/tasks', (req, res) => {
    const task = {
        id: Date.now(),
        title: req.body.title,
        projectId: parseInt(req.params.id),
        status: 'todo'
    };
    tasks.push(task);
    res.json(task);
});

app.put('/api/tasks/:id', (req, res) => {
    const task = tasks.find(t => t.id == req.params.id);
    if (task) task.status = req.body.status;
    res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
    tasks = tasks.filter(t => t.id != req.params.id);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});