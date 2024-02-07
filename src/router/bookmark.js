const express = require('express');
const dbFactory = require('../utils/database-factory')
const fs = require('fs');
const httpResponse = require('../utils/http-response');
const bookmarkRouter = express.Router()
const crypto = require('crypto');
const { nextTick } = require('process');

bookmarkRouter.post('/init', (req, res, next) => {
    initialize((err) => {
        if (err) {
            next(err)
        } else {
            res.send(httpResponse.success())
        }
    })
})

// 深度优先遍历函数
depthFirstTraversal = (parent, node, callback) => {
    callback(parent, node)
    node.children && node.children.forEach(child => {
        depthFirstTraversal(node, child, callback);
    });
}

function computeSHA256(data) {
    return crypto.createHash('md5').update(data).digest('hex');
}

function traverseAndComputeHash(node) {
    if (!node) return 0; // Base case: return 0 for null node
    if (node.children) {
        for (const child of node.children) {
            traverseAndComputeHash(child); // Recursively compute hash for children
        }
    }
    node.hash = computeSHA256(`${node.title}${node.url}${node.parent_id}`);
    if (node.dateGroupModified) {
        for (const child of node.children) {
            node.hash += child.hash
        }
        node.hash = computeSHA256(node.hash)
    }
}

const initialize = async (callback) => {
    const db = dbFactory.get()
    const item = await fs.readFileSync('./uploads/data.json', 'utf8');
    let bookmarks = []
    // 将文件内容解析为 JSON 对象
    const jsonData = JSON.parse(item);
    // traverseAndComputeHash(jsonData[0])
    // 执行深度优先遍历
    depthFirstTraversal(null, jsonData[0], (parent, node) => {
        let type
        if (node.dateGroupModified || node.id == 0) {
            type = 'folder'
        } else {
            type = 'bookmark'
        }
        bookmarks.push({
            id: node.id,
            parent_id: parent ? parent.id : 0,
            url: node.url,
            type: type,
            name: node.title,
            dateAdded: node.dateAdded,
            hash: node.hash,
            dateModified: node.dateAdded
        })
    });
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare('INSERT INTO bookmarks (chrome_id, parent_id, name, url, type, user_id, date_added, hash, date_modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        bookmarks.forEach((item) => {
            stmt.run(item.id, item.parent_id, item.name, item.url, item.type, 1, item.dateAdded, item.hash, item.dateModified, (err) => {
                if (err) {
                    console.log(err);
                }
            });
        })
        stmt.finalize()
        db.run('COMMIT', function (err) {
            if (err) {
                console.log(err);
                callback(err)
            } else {
                callback()
            }
        });
    })
}

bookmarkRouter.get('/', (req, res) => {
    db = dbFactory.get()
    db.all("SELECT * FROM bookmarks", [], (err, rows) => {
        res.send(httpResponse.success(rows))
    });
})

bookmarkRouter.post('/delete/*', (req, res) => {
    db = dbFactory.get()
    db.run(`UPDATE bookmarks SET deleted = 1, date_modified = ${Date.now()} WHERE chrome_id = ? and user_id = 1`, req.params[0], function (err) {
        if (err) {
            return console.log(err.message)
        }
        console.log('deleted', req.params[0])
    })
    res.send(httpResponse.success())
})

// api: add
bookmarkRouter.post('/', (req, res, next) => {
    db = dbFactory.get()
    let node = req.body
    if (!node.id) {
        next(new Error("缺少必要参数"))
    }
    let type = node.url ? 'bookmark' : 'folder'
    const stmt = db.prepare('INSERT INTO bookmarks (chrome_id, parent_id, name, url, type, user_id, date_added, date_modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(node.id, node.parent_id, node.name, node.url, type, 1, node.date_added, node.date_modified)
    stmt.finalize();
    res.send(httpResponse.success())
})

// api: update
bookmarkRouter.put('/', (req, res) => {
    db = dbFactory.get()
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
    if (param.parentId) {
        sql += 'parent_id = ?,'
    }
    if (param.dateModified) {
        sql += 'date_modified = ?,'
    }
    sql = sql.substring(0, sql.length - 1)
    sql += ' WHERE chrome_id = ? and user_id = ?'
    let list = [param.name, param.url, param.parentId, param.dateModified, param.id, 1].filter(item => item)
    console.debug(sql, list);
    db.run(
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

// api: update chrome id
bookmarkRouter.put('/*/chromeId', (req, res, next) => {
    const id = req.params[0]
    let chromeId = req.body.chromeId
    if (!id || !chromeId) {
        next("缺少必要参数")
    }
    db = dbFactory.get()
    db.run(
        'UPDATE bookmarks SET chrome_id = ? WHERE id = ? and user_id = ?',
        [chromeId, id, 1],
        function (err) {
            if (err) {
                next(err)
            } else {
                res.send(httpResponse.success())
            }
        }
    )
})


module.exports = bookmarkRouter; 