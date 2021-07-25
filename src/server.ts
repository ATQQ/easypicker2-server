// polyfill
import 'core-js/es/array'
// diy module 自建模块
import { Fw } from 'flash-wolves'

console.time('server-start')
// 从.env加载环境变量
import loadEnv from './utils/loadEnv'

loadEnv()

// 路径映射
import loadModuleAlias from './utils/moduleAlias'

loadModuleAlias()

// 配置文件
import { serverConfig } from './config'

// routes
import routes from './routes'

// interceptor
import {
  serverInterceptor, routeInterceptor, beforeRouteMatchInterceptor, beforeRuntimeErrorInterceptor,
} from './middleware'

const app = new Fw(serverInterceptor, {
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
