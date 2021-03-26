import { Middleware } from '@/lib/server/types'

const interceptor: Middleware = async (req, res) => {
    const { options } = req.route
    console.log(`路由拦截:${req.method} - ${req.url}`)
    if (options) {
        console.log(`路由拦截配置:${JSON.stringify(options)}`)

    }
}
export default interceptor