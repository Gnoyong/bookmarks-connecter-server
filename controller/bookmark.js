const express = require('express');
const fs = require('fs');
const httpResponse = require('./http-response');
const bookmarkRouter = express.Router()

bookmarkRouter.post('/init', (req, res) => {
    fs.readFile('./uploads/data.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return;
        }
        let bookmarks = []
        try {
            // 将文件内容解析为 JSON 对象
            const jsonData = JSON.parse(data);
            // 执行深度优先遍历
            depthFirstTraversal(null, jsonData[0], (parent, node) => {
                bookmarks.push({
                    id: node.id,
                    parent_id: parent ? parent.id : 0,
                    url: node.url,
                    type: node.dateGroupModified ? 'folder' : 'bookmark',
                    name: node.title,
                    dateAdded: node.dateAdded
                })
            });
            // 开始事务
            req.db.serialize(() => {
                // 执行插入操作
                req.db.run('BEGIN TRANSACTION');

                // 使用预处理语句进行批量插入
                const stmt = req.db.prepare('INSERT INTO bookmarks (id, parent_id, name, url, type, user_id, date_added) VALUES (?, ?, ?, ?, ?, ?, ?)');
                bookmarks.forEach(data => {
                    stmt.run(data.id, data.parent_id, data.name, data.url, data.type, 1, data.dateAdded);
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
        } catch (err) {
            console.error('Error parsing JSON:', err);
        }
    });
    res.send(httpResponse.success())
})

bookmarkRouter.get('/', (req, res) => {
    req.db.all("SELECT * FROM bookmarks", [], (err, rows) => {
        res.send(httpResponse.success(rows))
    });
})

bookmarkRouter.post('/delete/*', (req, res) => {
    req.db.run('DELETE FROM bookmarks WHERE id = ? and user_id = 1', req.params[0], function (err) {
        if (err) {
            return console.log(err.message)
        }
        console.log('deleted', req.params[0])
    })
    res.send(httpResponse.success())
})

// api: add
bookmarkRouter.post('/', (req, res) => {
    let node = req.body
    let type = node.url ? 'bookmark' : 'folder'
    const stmt = req.db.prepare('INSERT INTO bookmarks (id, parent_id, name, url, type, user_id, date_added) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(node.id, node.parent_id, node.name, node.url, type, 1, node.date_added)
    stmt.finalize();
    res.send(httpResponse.success())
})

// api: update
bookmarkRouter.put('/', (req, res) => {
    let param = req.body
    if (!param.id) {
        res.send(httpResponse.faild("lost params"))
        return
    }

    let sql = 'UPDATE bookmarks SET '
    if (param.name) {
        sql += 'name = ?,'
    }
    if (param.url) {
        sql += 'url = ?,'
    }
    if (param.parent_id) {
        sql += 'parent_id = ?,'
    }
    sql = sql.substring(0, sql.length - 1)
    sql += ' WHERE id = ? and user_id = ?'
    let list = [param.name, param.url, param.parent_id, param.id, 1].filter(item => item)
    console.debug(sql, list);
    req.db.run(
        sql,
        list,
        function (err) {
            if (err) {
                return console.log('update data error: ', err.message)
            }
            console.log('update data: ', this)
        }
    )
    res.send(httpResponse.success())
})

// 深度优先遍历函数
depthFirstTraversal = (parent, node, callback) => {
    callback(parent, node)
    // 递归遍历子节点
    node.children && node.children.forEach(child => {
        depthFirstTraversal(node, child, callback);
    });

}

module.exports = bookmarkRouter; 