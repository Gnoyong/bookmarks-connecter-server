const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const bookmarkRouter = require('./src/router/bookmark');
const port = 3000;
const httpResponse = require('./src/utils/http-response');
process.on('uncaughtException', err => {
    console.error('有一个未捕获的错误', err)
    process.exit(1) //强制性的（根据 Node.js 文档）
})
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
/* app.use((req, res, next) => {
    req.db = new sqlite3.Database('./database.db');
    next();
}); */
// 处理文件上传的路由
app.post('/upload', upload.single('file'), (req, res) => {
    res.send(httpResponse.success());
});
app.get('/', (req, res) => {
    res.send(httpResponse.success())
});
app.use('/bookmark', bookmarkRouter)
/* app.use((req, res, next) => {
    if (req.db) {
        req.db.close();
    }
    next();
}); */

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.send(httpResponse.faild());
})


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});