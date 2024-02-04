const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const http_res = require('./http_res');
const bookmarkRouter = require('./controller/bookmark');
const port = 3000;

// 存储文件的配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/'); // 文件存储的目录
    },
    filename: function (req, file, cb) {
        // cb(null, Date.now() + '-' + file.originalname); // 重命名文件
        cb(null, "data.json"); // 重命名文件
    }
});
const upload = multer({ storage: storage });

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use((req, res, next) => {
    req.db = new sqlite3.Database('./database.db');
    next();
});

app.use('/bookmark', bookmarkRouter)

// 处理文件上传的路由
app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ message: 'File uploaded successfully!' });
});

app.get('/', (req, res) => {
    res.send(http_res.success("hello!"))
});

app.use((req, res, next) => {
    if (req.db) {
        req.db.close();
    }
    next();
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});