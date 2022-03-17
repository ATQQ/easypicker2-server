// polyfill
import 'core-js/es/array'
// 路径映射
// import './utils/moduleAlias'
// diy module 自建模块
import { App } from 'flash-wolves'
// 从.env加载环境变量
import './utils/loadEnv'

// 配置文件
import { serverConfig } from './config'

// routes
import routes from './routes'
import controllers from './controllers'

// interceptor
import {
  serverInterceptor, routeInterceptor, beforeRouteMatchInterceptor, beforeRuntimeErrorInterceptor,
} from './middleware'

console.time('server-start')

const app = new App(serverInterceptor, {
  beforeMathRoute: beforeRouteMatchInterceptor,
  beforeRunRoute: routeInterceptor,
  beforeReturnRuntimeError: beforeRuntimeErrorInterceptor,
})

// 注册路由
app.addRoutes(routes)
app.addController(controllers)

app.listen(serverConfig.port, serverConfig.hostname, () => {
  console.log('-----', new Date().toLocaleString(), '-----')
  console.timeEnd('server-start')
})

module.exports = app
