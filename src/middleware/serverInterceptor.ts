import { Middleware } from '@/lib/server/types'

const interceptor: Middleware = (req) => {
    console.log(`全局拦截:${req.method} - ${req.url}`)
}
export default interceptor