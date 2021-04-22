import { publicError } from '@/constants/errorMsg'
import { Middleware } from '@/lib/server/types'
import { getUserInfo } from '@/utils/userUtil'

const interceptor: Middleware = async (req, res) => {
  const { options } = req.route
  if (!options) return
  console.log(`路由拦截:${req.method} - ${req.url}`)
  const { needLogin } = options
  if (needLogin && (!req.headers.token || !(await getUserInfo(req)))) {
    res.failWithError(publicError.request.notLogin)
  }
}
export default interceptor
