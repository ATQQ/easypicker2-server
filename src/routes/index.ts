// types
import { Route } from '@/lib/server/types'

// router
import user from './modules/user'
import publicRouter from './modules/public'
import categoryRouter from './modules/category'
import taskRouter from './modules/task'
import taskInfo from './modules/taskInfo'

// 这里注册路由
const routers = [user, publicRouter, categoryRouter, taskRouter, taskInfo]

export default routers.reduce((pre: Route[], router) => {
    return pre.concat(router.getRoutes())
}, [])