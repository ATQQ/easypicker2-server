import { codeMsg } from '.'

export const UserError = {
  mobile: {
    fault: codeMsg(1006, 'Mobile is not right'),
    exist: codeMsg(1002, 'Mobile already exist'),
    noExist: codeMsg(1008, 'Mobile not exist'),
  },
  account: {
    exist: codeMsg(1001, 'Account already exist'),
    notExist: codeMsg(1005, 'Account not exist'),
    fault: codeMsg(1007, 'Account is fault'),
    freeze: codeMsg(1009, 'Account is freeze'),
    ban: codeMsg(1010, 'Account is ban'),
  },
  code: {
    fault: codeMsg(1003, 'Error code'),
  },
  pwd: {
    fault: codeMsg(1004, 'error pwd'),
  },
}

export const CategoryError = {
  exist: codeMsg(2001, 'category already exist'),
}

export const publicError = {
  file: {
    notSupport: codeMsg(3001, 'file type is not support'),
    notExist: codeMsg(3003, 'file not exist'),
  },
  request: {
    errorParams: codeMsg(3002, 'error request params'),
    notLogin: codeMsg(3004, 'user not login'),
  },
}

export const taskError = {
  noExist: codeMsg(4001, 'task not exist'),
}
