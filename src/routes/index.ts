// types
import { Route } from '@/lib/server/types'

// router
import test from './modules/test'

// 这里注册路由
const routers = [test]

export default routers.reduce((pre: Route[], router) => {
    return pre.concat(router.getRoutes())
}, [])