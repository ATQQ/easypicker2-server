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

export const UserConfigLabels = {
  tx: {
    secretId: 'SecretId',
    secretKey: 'SecretKey',
    templateId: '短信模板ID',
    smsSdkAppid: '短信应用appid',
    signName: '短信签名',
  },
  mysql: {
    host: '主机地址',
    port: '端口号',
    database: '数据库名',
    user: '用户名',
    password: '密码',
  },
  qiniu: {
    accessKey: 'AccessKey',
    secretKey: 'SecretKey',
    bucketName: '存储空间名',
    bucketDomain: '绑定的域名',
    imageCoverStyle: '图片封面压缩样式',
    imagePreviewStyle: '图片预览压缩样式',
    bucketZone: '存储空间区域',
  },
}
