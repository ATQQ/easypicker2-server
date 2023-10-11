// types
import { Route } from 'flash-wolves'

// router
import people from './modules/people'
import file from './modules/file'

// 这里注册路由
const routers = [people, file]

export default routers.reduce(
  (pre: Route[], router) => pre.concat(router.getRoutes()),
  []
)
