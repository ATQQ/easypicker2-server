import { codeMsg } from '.'

export const UserError = {
    mobile: {
        fault: codeMsg(20014, 'Mobile is not right'),
        exist: codeMsg(20012, 'Mobile already exist')
    },
    account: {
        exist: codeMsg(20013, 'Account already exist')
    },
    code: {
        fault: codeMsg(20020, 'Error code')
    }
}

export const childContentError = {
    notExist: codeMsg(20050, '无附加属性'),
    paramError: codeMsg(20051, '参数错误')
}
export const GlobalError = {
    unknown: codeMsg(500, 'UnKnown Error'),
    dbError: codeMsg(500, 'Database Error'),
    powerError: codeMsg(401, 'No Power'),
}

export const peopleError = {
    notExist: codeMsg(20030, '用户不在提交名单中')
}