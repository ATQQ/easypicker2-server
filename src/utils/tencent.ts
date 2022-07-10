import * as tencentcloud from 'tencentcloud-sdk-nodejs'
import { txConfig } from '@/config'
// [文档地址](https://cloud.tencent.com/document/product/382/43197)

const SmsClient = tencentcloud.sms.v20190711.Client

const clientConfig = {
  credential: {
    secretId: txConfig.secretId,
    secretKey: txConfig.secretKey,
  },
  region: '',
  profile: {
    httpProfile: {
      endpoint: 'sms.tencentcloudapi.com',
    },
  },
}

const client = new SmsClient(clientConfig)

export function getTxServiceStatus() {
  const args = ['1234', `${2}`]
  const params = {
    PhoneNumberSet: [
      '+861234',
    ],
    TemplateParamSet: args,
    TemplateID: txConfig.templateId,
    SmsSdkAppid: txConfig.smsSdkAppid,
    Sign: txConfig.signName,
  }
  return new Promise<ServiceStatus>((resolve) => {
    client.SendSms(params).then(
      () => {
        resolve({
          type: 'tx',
          status: true,
        })
      },
      (err) => {
        resolve({
          type: 'tx',
          status: false,
          errMsg: err.message,
        })
      },
    )
  })
}

export function sendMessage(phone, code, time = 2) {
  const args = [code, `${time}`]
  const params = {
    PhoneNumberSet: [
      `+86${phone}`,
    ],
    TemplateParamSet: args,
    TemplateID: txConfig.templateId,
    SmsSdkAppid: txConfig.smsSdkAppid,
    Sign: txConfig.signName,
  }
  console.log('---------send request-------')
  console.log(params)
  client.SendSms(params).then(
    (data) => {
      console.log('---------request response-------')
      console.log(data)
    },
    (err) => {
      console.error('error', err)
    },
  )
}
