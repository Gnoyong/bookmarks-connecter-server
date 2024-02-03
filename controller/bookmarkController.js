const http_res = require('./http_res');
const Controller = require('./controller')

class BookmarkController extends Controller {
    constructor(app) {
        super(app);
        app.post('/bookmark/init', this.init)
        app.get('/bookmark/query', this.query)
    }

    init(req, res) {
        fs.readFile('./uploads/Bookmarks.json', 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                return;
            }
            let bookmarks = []
            try {
                // 将文件内容解析为 JSON 对象
                const jsonData = JSON.parse(data);
                // 执行深度优先遍历
                depthFirstTraversal(null, jsonData.roots.bookmark_bar, (parent, node) => {
                    bookmarks.push({
                        id: node.id,
                        parent_id: parent ? parent.id : 0,
                        url: node.url,
                        type: node.type,
                        name: node.name
                    })
                });
            } catch (err) {
                console.error('Error parsing JSON:', err);
            }
            // 开始事务
            req.db.serialize(() => {
                // 执行插入操作
                req.db.run('BEGIN TRANSACTION');

                // 使用预处理语句进行批量插入
                const stmt = req.db.prepare('INSERT INTO bookmarks (id, parent_id, name, url, type) VALUES (?, ?, ?, ?, ?)');
                bookmarks.forEach(data => {
                    stmt.run(data.id, data.parent_id, data.name, data.url, data.type);
                });

                // 提交事务
                req.db.run('COMMIT', (err) => {
                    if (err) {
                        console.debug('Error committing transaction:', err);
                    } else {
                        console.debug('Batch insert completed successfully.');
                    }
                });

                // 结束预处理语句
                stmt.finalize();
            });
        });
        res.send(http_res.success())
    }

    query(req, res) {
        req.db.all("SELECT * FROM bookmarks", [], (err, rows) => {
            const tree = [];
            const itemMap = {};

            // 将每个项按照其 id 存储在一个对象中，方便后续通过 id 查找
            rows.forEach(item => {
                itemMap[item.id] = { ...item, children: [] };
            });

            // 将每个项连接到其父节点的 children 数组中
            rows.forEach(item => {
                if (item.parent_id !== null && itemMap[item.parent_id]) {
                    itemMap[item.parent_id].children.push(itemMap[item.id]);
                } else {
                    tree.push(itemMap[item.id]);
                }
            });
            res.send({ "meesage": "ok", "data": tree })
        });
    }

    // 深度优先遍历函数
    depthFirstTraversal(parent, node, callback) {
        callback(parent, node)
        // 递归遍历子节点
        node.children && node.children.forEach(child => {
            depthFirstTraversal(node, child, callback);
        });

    }
}

module.exports = BookmarkController; 