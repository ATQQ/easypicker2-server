export interface CodeMsg {
    code: number
    msg: string
}
export function codeMsg(code: number, msg: string): CodeMsg {
  return {
    code,
    msg,
  }
}

export const uploadFileDir = `${process.cwd()}/upload`
