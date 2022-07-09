import { App } from 'flash-wolves'

// 配置文件
import { serverConfig } from './config'

// routes
import routes from './routes'
import controllers from './controllers'

// interceptor
import {
  serverInterceptor, routeInterceptor, beforeRouteMatchInterceptor, beforeRuntimeErrorInterceptor,
} from './middleware'
import { initUserConfig, patchTable } from './utils/patch'

console.time('server-start')

const app = new App(serverInterceptor, {
  beforeMathRoute: beforeRouteMatchInterceptor,
  beforeRunRoute: routeInterceptor,
  beforeReturnRuntimeError: beforeRuntimeErrorInterceptor,
})

// 注册路由
app.addRoutes(routes)
app.addController(controllers)

app.listen(serverConfig.port, serverConfig.hostname, async () => {
  console.log('-----', new Date().toLocaleString(), '-----')
  console.timeEnd('server-start')
  // 存储一些配置
  await initUserConfig()
  await patchTable()
})
