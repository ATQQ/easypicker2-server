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

export function sendMessage(phone, code, time = 2) {
    const args = [code, `${time}`]
    const params = {
        'PhoneNumberSet': [
            `+86${phone}`
        ],
        'TemplateParamSet': args,
        'TemplateID': txConfig.templateId,
        'SmsSdkAppid': txConfig.smsSdkAppid,
        'Sign': '粥里有勺糖'
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
        }
    )
}