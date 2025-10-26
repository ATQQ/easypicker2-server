import 'reflect-metadata'
import { App } from 'flash-wolves'

// 配置文件
import { serverConfig } from './config'

// routes
import routes from './routes'
import controllers from './controllers'

// interceptor
import {
  beforeRouteMatchInterceptor,
  beforeRuntimeErrorInterceptor,
  routeInterceptor,
  serverInterceptor,
} from './middleware'
import {
  initUserConfig,
  patchTable,
  readyServerDepService,
} from './utils/patch'
import LocalUserDB from './utils/user-local-db'

console.time('server-start')

const app = new App(serverInterceptor, {
  beforeMathRoute: beforeRouteMatchInterceptor,
  beforeRunRoute: routeInterceptor,
  beforeReturnRuntimeError: beforeRuntimeErrorInterceptor,
})

app.get('/health', (req, res) => {
  res.statusCode = 200
  res.end('ok')
})
// 注册路由
app.addRoutes(routes)
app.addController(controllers)

app.listen(serverConfig.port, serverConfig.hostname, async () => {
  console.log('-----', new Date().toLocaleString(), '-----')
  console.timeEnd('server-start')
  // 存储一些配置
  await LocalUserDB.initUserConfig()
  await initUserConfig()
  try {
    await readyServerDepService()
  }
  catch (err) {
    console.log('❌ readyServerDepService', err?.message)
  }
  try {
    await patchTable()
    console.log('😄😄 mysql patch success')
  }
  catch (err) {
    console.log('😭😭 mysql 还未正常配置，请检查数据库是否配置正确或版本不匹配')
  }
})
