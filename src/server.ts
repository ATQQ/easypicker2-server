console.time('server-start')

// 读取配置的环境变量
import dotenv from 'dotenv'

dotenv.config()

// 编译后的绝对路径映射插件
// import 'module-alias/register'
import moduleAlias from 'module-alias'

moduleAlias.addAliases({
  '@': __dirname,
})

// 配置文件
import { serverConfig } from '@/config'

// diy module 自建模块
import FW from './lib/server'

// routes
import routes from './routes'

// interceptor
import {
  serverInterceptor, routeInterceptor, beforeRouteMatchInterceptor, beforeRuntimeErrorInterceptor,
} from './middleware'

const app = new FW(serverInterceptor, {
  beforeMathRoute: beforeRouteMatchInterceptor,
  beforeRunRoute: routeInterceptor,
  beforeReturnRuntimeError: beforeRuntimeErrorInterceptor,
})

// 注册路由
app.addRoutes(routes)

app.listen(serverConfig.port, serverConfig.hostname, () => {
  console.log('-----', new Date().toLocaleString(), '-----')
  if (process.env.NODE_ENV === 'development') {
    // 写入测试用逻辑
  }
  console.timeEnd('server-start')
  console.log('server start success', `http://${serverConfig.hostname}:${serverConfig.port}`)
})

module.exports = app
