// types
import { Route } from 'flash-wolves'

// router
import user from './modules/user'
import publicRouter from './modules/public'
import categoryRouter from './modules/category'
import taskRouter from './modules/task'
import taskInfo from './modules/taskInfo'
import people from './modules/people'
import file from './modules/file'
import overview from './modules/super/overview'
import superUser from './modules/super/user'

// 这里注册路由
const routers = [user, publicRouter, categoryRouter,
  taskRouter, taskInfo, people, file, overview, superUser]

export default routers.reduce((pre: Route[], router) => pre.concat(router.getRoutes()), [])
