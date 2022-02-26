import { Middleware } from 'flash-wolves'
import formidable from 'formidable'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
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
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
  }
  // 跨域允许的header类型
  res.setHeader('Access-Control-Allow-Headers', '*')
  // 允许跨域携带cookie
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  // 允许的方法
  res.setHeader('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS')
  // 设置响应头
  res.setHeader('Content-Type', 'application/json;charset=utf-8')
  // 对预检请求放行
  if (method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  // 处理文件上传
  if (req.url === '/public/upload') {
    const form = formidable({ multiples: true, uploadDir: uploadFileDir, keepExtensions: true })
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
      res.end(JSON.stringify({ code: 500, msg: error }))
    }
  }

  // 设置响应的content-encoding
  // TODO: 需借助第三方库实现请求响应结果的压缩压缩
  // res.setHeader('content-encoding', 'gzip')
}
export default interceptor
