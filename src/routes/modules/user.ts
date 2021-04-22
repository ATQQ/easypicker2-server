import { UserError } from '@/constants/errorMsg'
import { User, USER_POWER, USER_STATUS } from '@/db/model/user'
import { expiredRedisKey, getRedisVal, setRedisValue } from '@/db/redisDb'
import { insertUser, selectUserByAccount, selectUserByPhone, updateUser } from '@/db/userDb'
import Router from '@/lib/Router'
import { rAccount, rMobilePhone, rPassword } from '@/utils/regExp'
import { encryption } from '@/utils/stringUtil'
import tokenUtil from '@/utils/tokenUtil'
import { getUserInfo } from '@/utils/userUtil'

const router = new Router('user')

/**
 * 注册
 */
router.post('register', async (req, res) => {
    const { account, pwd, bindPhone, phone, code } = req.body
    if (!rAccount.test(account)) {
        res.failWithError(UserError.account.fault)
        return
    }
    // 检查账号是否存在
    let [user] = await selectUserByAccount(account)

    // 存在返回错误
    if (user) {
        res.failWithError(UserError.account.exist)
        return
    }

    // 绑定手机
    if (bindPhone) {
        if (!rMobilePhone.test(phone)) {
            res.failWithError(UserError.mobile.fault)
            return
        }
        const rightCode = await getRedisVal(`code-${phone}`)
        if (!code || code !== rightCode) {
            res.failWithError(UserError.code.fault)
            return
        }
        // 检查手机号是否存在
        ([user] = await selectUserByPhone(phone))

        // 存在返回错误
        if (user) {
            res.failWithError(UserError.mobile.exist)
            return
        }
        // 过期验证码
        expiredRedisKey(phone)
    }

    // 不存在则加入
    insertUser({
        password: encryption(pwd),
        account,
        ...(bindPhone ? { phone } : {})
    }).then(() => {
        res.success()
    })
})

/**
 * 登录
 */
router.post('login', async (req, res) => {
    const { account = '', pwd = '' } = req.body
    // const isAccount = rAccount.test(account)
    // 兼容旧平台数据不校验账号格式
    const isAccount = true
    const isPhone = rMobilePhone.test(account)
    // 帐号不正确
    if (!isAccount) {
        res.failWithError(UserError.account.fault)
        return
    }
    // 密码不正确
    if (!rPassword.test(pwd)) {
        res.failWithError(UserError.pwd.fault)
        return
    }
    let user: User
    if (isAccount) {
        ([user] = await selectUserByAccount(account))
    }
    // 手机号不正确
    if (!user && !isPhone) {
        res.failWithError(UserError.mobile.fault)
        return
    }
    if (!user && isPhone) {
        ([user] = await selectUserByPhone(account))
    }
    if (!user) {
        res.failWithError(isPhone ? UserError.mobile.fault : UserError.account.fault)
        return
    }
    if (user.password !== encryption(pwd)) {
        res.failWithError(UserError.pwd.fault)
        return
    }
    // TODO:状态判断
    if (user.status === USER_STATUS.BAN) {

    }
    if (user.status === USER_STATUS.FREEZE) {

    }
    // TODO:权限判断
    // TODO:更新最后登录信息
    const token = tokenUtil.createToken(user)
    res.success({
        token
    })
})

/**
 * 验证码登录
 */
router.post('login/code', async (req, res) => {
    const { code, phone } = req.body
    const v = await getRedisVal(`code-${phone}`)
    if (code !== v) {
        res.failWithError(UserError.code.fault)
        return
    }
    const [user] = await selectUserByPhone(phone)

    if (!user) {
        res.failWithError(UserError.mobile.fault)
        return
    }
    // TODO:权限判断
    // TODO:更新最后登录信息
    const token = tokenUtil.createToken(user)
    expiredRedisKey(`code-${phone}`)
    res.success({
        token
    })
})

/**
 * 重置密码
 */
router.put('password', async (req, res) => {
    const { code, phone, pwd } = req.body
    const v = await getRedisVal(`code-${phone}`)
    if (code !== v) {
        res.failWithError(UserError.code.fault)
        return
    }
    const [user] = await selectUserByPhone(phone)

    if (!user) {
        res.failWithError(UserError.mobile.noExist)
        return
    }
    if (!rPassword.test(pwd)) {
        res.failWithError(UserError.pwd.fault)
        return
    }
    await updateUser({
        password: encryption(pwd)
    }, {
        id: user.id
    })
    expiredRedisKey(`code-${phone}`)
    const token = tokenUtil.createToken(user)
    res.success({
        token
    })
})

/**
 * 判断是否超级管理员
 */
router.get('power/super', async (req, res) => {
    const user = await getUserInfo(req)
    res.success(user.power === USER_POWER.SUPER)
}, {
    needLogin: true,
})
export default router