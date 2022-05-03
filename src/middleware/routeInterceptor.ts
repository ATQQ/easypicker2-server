import { Middleware } from 'flash-wolves'
import { publicError } from '@/constants/errorMsg'
import { addBehavior } from '@/db/logDb'
import { USER_POWER } from '@/db/model/user'
import { getUserInfo } from '@/utils/userUtil'

const interceptor: Middleware = async (req, res) => {
  const { options } = req.route
  if (!options) return
  // console.log(`路由拦截:${req.method} - ${req.url}`)
  const { needLogin, userPower } = options
  if (needLogin && (!req.headers.token || !(await getUserInfo(req)))) {
    addBehavior(req, {
      module: 'interceptor',
      msg: `非法操作,未登录 path:${req.url}`,
      data: {
        url: req.url,
      },
    })
    res.failWithError(publicError.request.notLogin)
    return
  }

  if (userPower === USER_POWER.SUPER) {
    const user = await getUserInfo(req)
    if (user.power !== userPower) {
      addBehavior(req, {
        module: 'interceptor',
        msg: `非法操作,权限不足 path:${req.url} `,
        data: {
          url: req.url,
        },
      })
      res.failWithError(publicError.request.notLogin)
    }
  }
}
export default interceptor
