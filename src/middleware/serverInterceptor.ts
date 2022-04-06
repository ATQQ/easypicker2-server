import { Middleware } from 'flash-wolves'
import formidable from 'formidable'
import { existsSync, mkdirSync } from 'fs'
import { uploadFileDir } from '@/constants'

// 允许跨域访问的源
const allowOrigins = ['http://localhost:8080', 'https://ep2.sugarat.top', 'https://ep2.dev.sugarat.top']

if (!existsSync(uploadFileDir)) {
  mkdirSync(uploadFileDir)
}

const interceptor: Middleware = async (req, res) => {
  // 开启CORS
  const { method } = req
  if (allowOrigins.includes(req.headers.origin)) {
    // 允许跨域
    // TODO:初始化实例的时候配置
  }
  // 设置响应头
  res.setHeader('Content-Type', 'application/json;charset=utf-8')
  // 对预检请求放行
  if (method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  // 处理文件上传
  // 单独抽离文件上传API
  if (req.url === '/public/upload') {
    const form = formidable({ multiples: true, uploadDir: uploadFileDir, keepExtensions: true })
    const p = new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(err)
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        const data = {
          name: files.file.newFilename,
          size: files.file.size,
          type: files.file.mimetype,
        }
        res.end(JSON.stringify({ code: 0, data, msg: 'ok' }, null, 2))
        resolve('ok')
      })
    })
    try {
      await p
    } catch (error) {
      res.end(JSON.stringify({ code: 500, msg: error }))
    }
  }
}
export default interceptor
