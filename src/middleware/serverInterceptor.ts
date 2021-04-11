import { Middleware } from '@/lib/server/types'
import formidable from 'formidable'
import path from 'path'

const interceptor: Middleware = async (req, res) => {
    // 处理文件上传
    if (req.url === '/public/upload') {
        const form = formidable({ multiples: true, uploadDir: path.resolve(__dirname, '../upload'), keepExtensions: true })
        const p = new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) {
                    reject(String(err))
                    // res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' })
                    // res.end(String(err))
                    return
                }
                res.writeHead(200, { 'Content-Type': 'application/json' })
                files.file.name = path.parse(files.file.path).base
                files.file.path = undefined
                res.end(JSON.stringify({ code: 0, data: files.file, msg: 'ok' }, null, 2))
                resolve('ok')
            })
        })
        try {
            await p
        } catch (error) {
            res.end(JSON.stringify({code:500,msg:error}))
        }
    }
}
export default interceptor