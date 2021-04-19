import Router from '@/lib/Router'
import { rMobilePhone } from '@/utils/regExp'
import { UserError } from '@/constants/errorMsg'
import { randomNumStr } from '@/utils/randUtil'
import { setRedisValue } from '@/db/redisDb'
const router = new Router('public')

router.get('code', (req, res) => {
    const { phone } = req.query
    // 手机号不正确,直接返回
    if (!rMobilePhone.test(phone)) {
        res.failWithError(UserError.mobile.fault)
        return
    }
    const code = randomNumStr(4)
    // TODO:发送验证码
    console.log(code)
    setRedisValue(`code-${phone}`, code, 120)
    res.success()
})

export default router
