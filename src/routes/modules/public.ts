import Router from '@/lib/Router'
import { rMobilePhone } from '@/utils/regExp'
import { UserError } from '@/constants/errorMsg'
import { randomNumStr } from '@/utils/randUtil'
import storageUtil from '@/utils/storageUtil'
const router = new Router('public')

router.get('code', (req, res) => {
    const { phone } = req.query
    // 手机号不正确,直接返回
    if (!rMobilePhone.test(phone)) {
        res.failWithError(UserError.mobile.fault)
        return
    }
    const code = randomNumStr(4)
    // TODO:存入redis
    // TODO:发送验证码
    console.log(code)
    storageUtil.setItem(phone, code, 120)
    res.success()
})

export default router
