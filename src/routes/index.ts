// types
import { Route } from 'flash-wolves'

// router
import categoryRouter from './modules/category'
import taskRouter from './modules/task'
import taskInfo from './modules/taskInfo'
import people from './modules/people'
import file from './modules/file'

// 这里注册路由
const routers = [categoryRouter, taskRouter, taskInfo, people, file]

export default routers.reduce(
  (pre: Route[], router) => pre.concat(router.getRoutes()),
  []
)
