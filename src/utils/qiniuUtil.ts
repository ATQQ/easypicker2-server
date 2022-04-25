/* eslint-disable */
import { qiniuConfig } from '@/config'
import { addErrorLog } from '@/db/logDb'
import { FWRequest } from 'flash-wolves'
import qiniu from 'qiniu'
import { getKeyInfo } from './stringUtil'
// [node-sdk文档地址](https://developer.qiniu.com/kodo/1289/nodejs#server-upload)
const privateBucketDomain = qiniuConfig.bucketDomain
// 12小时过期
const getDeadline = () => Math.floor(Date.now() / 1000) + 3600 * 12

const bucket = qiniuConfig.bucketName
const mac = new qiniu.auth.digest.Mac(qiniuConfig.accessKey, qiniuConfig.secretKey)
const { urlsafeBase64Encode } = qiniu.util

/**
 * 获取OSS上文件的下载链接（默认12h有效）
 * @param key 文件的key
 * @param expiredTime
 */
export function createDownloadUrl(key: string, expiredTime = getDeadline()): string {
  // 七牛云相关
  const config = new qiniu.conf.Config()
  // 鉴权的内容，请求的时候生成，避免过期
  const bucketManager = new qiniu.rs.BucketManager(mac, config)

  return bucketManager.privateDownloadUrl(privateBucketDomain, key, expiredTime)
}

export function getUploadToken(): string {
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: bucket,
    // returnBody: '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize),"bucket":"$(bucket)","name":"$(x:name)"}'
    returnBody: '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize)}',
  })
  return putPolicy.uploadToken(mac)
}

export function deleteFiles(prefix: string): void {
  const config = new qiniu.conf.Config()
  const bucketManager = new qiniu.rs.BucketManager(mac, config)
  bucketManager.listPrefix(bucket, {
    limit: 1000,
    prefix,
  }, (err, respBody) => {
    const files: any[] = respBody.items
    // 使用批量删除接口
    batchDeleteFiles(files.map((f) => f.key))
  })
}

export function batchDeleteFiles(keys: string[], req?: FWRequest) {
  const config = new qiniu.conf.Config()
  const delOptions = keys.map((k) => qiniu.rs.deleteOp(bucket, k))
  const bucketManager = new qiniu.rs.BucketManager(mac, config)
  bucketManager.batch(delOptions, (err, respBody, respInfo) => {
    if (err) {
      console.log(err)
      addErrorLog(req, `批量删除异常: ${err.message}`, err.stack)
      // throw err;
    } else {
      // 200 is success, 298 is part success
      if (parseInt(`${respInfo.statusCode / 100}`, 10) === 2) {
        respBody.forEach((item) => {
          if ((+item.code) !== 200) {
            if (req) {
              addErrorLog(req, `${item.code}\t${item.data.error}`, item)
            }
          }
        })
      } else {
        console.log(respInfo.deleteusCode)
        console.log(respBody)
        addErrorLog(req, `批量删除异常: ${respInfo.deleteusCode}`, respBody)
      }
    }
  })
}

export function deleteObjByKey(key: string, req?: FWRequest): void {
  const config = new qiniu.conf.Config()
  const bucketManager = new qiniu.rs.BucketManager(mac, config)
  bucketManager.delete(bucket, key, (err) => {
    if (err) {
      console.log('------删除失败 start-------')
      console.log(key)
      console.log(err)
      console.log('------删除失败 end-------')
      if (req) {
        addErrorLog(req, '删除失败:' + key + err?.message, err?.stack)
      }
    }
  })
}

export function judgeFileIsExist(key: string): Promise<boolean> {
  return new Promise((res) => {
    const config = new qiniu.conf.Config()
    const bucketManager = new qiniu.rs.BucketManager(mac, config)
    bucketManager.stat(bucket, key, (err, respBody, respInfo) => {
      if (respInfo?.statusCode) {
        res(respInfo.statusCode !== 612)
      } else {
        res(false)
      }
    })
  })
}

export function getFileCount(prefix: string): Promise<number> {
  let count = 0, marker = '';
  const ops: any = {
    limit: 1000,
    prefix,
  }
  return new Promise((res) => {
    const analyze = () => {
      const config = new qiniu.conf.Config()
      const bucketManager = new qiniu.rs.BucketManager(mac, config)
      if (ops) {
        ops.marker = marker
      }
      bucketManager.listPrefix(bucket, ops, (err, respBody) => {
        count += (respBody.items.length || 0)
        if (respBody.marker) {
          marker = respBody.marker
          analyze()
        } else {
          res(count)
        }
      })
    }
    analyze()
  })
}

export function getFileKeys(prefix: string): Promise<Qiniu.ItemInfo[]> {
  return new Promise((res) => {
    const config = new qiniu.conf.Config()
    const bucketManager = new qiniu.rs.BucketManager(mac, config)
    bucketManager.listPrefix(bucket, {
      prefix,
    }, (err, respBody) => {
      res(respBody.items)
    })
  })
}

export function makeZipByPrefixWithKeys(prefix: string, zipName: string, keys: string[] = []): Promise<string> {
  return new Promise((res) => {
    const config = new qiniu.conf.Config()
    const bucketManager = new qiniu.rs.BucketManager(mac, config)

    bucketManager.listPrefix(bucket, {
      // TODO:改进
      limit: 1000,
      prefix,
    }, (err, respBody) => {
      const files: any[] = respBody.items
      // 删除旧的压缩文件
      deleteFiles(`${prefix.slice(0, -1)}_package/`)
      const names = []
      // 上传内容,过滤掉数据库中不存在的
      const content = files.filter((file) => keys.includes(file.key)).map((file) => {
        // 拼接原始url
        // 链接加密并进行Base64编码，别名去除前缀目录。
        const keyInfo = getKeyInfo(file.key)
        const { name, ext } = keyInfo
        let { base } = keyInfo

        // 判断别名是否存在,存在则后缀+数字自增
        let i = 1
        while (names.includes(base)) {
          base = `${name}_${i}${ext}`
          i += 1
        }
        names.push(base)
        // 判断别名是否存在,存在则后缀+数字自增
        const safeUrl = `/url/${urlsafeBase64Encode(createDownloadUrl(file.key))}/alias/${urlsafeBase64Encode(base)}`
        return safeUrl
      }).join('\n')
      const config = new qiniu.conf.Config({ zone: qiniu.zone.Zone_z2 })
      const formUploader = new qiniu.form_up.FormUploader(config)
      const putExtra = new qiniu.form_up.PutExtra()
      const key = `${Date.now()}-${~~(Math.random() * 1000)}.txt`

      formUploader.put(getUploadToken(), key, content, putExtra, (respErr,
        respBody, respInfo) => {
        if (respErr) {
          throw respErr
        }
        if (respInfo.statusCode == 200) {
          const { key } = respBody
          // 执行压缩
          const zipKey = urlsafeBase64Encode(`${bucket}:${prefix.substring(0, prefix.length - 1)}_package/${zipName}.zip`)

          const fops = `mkzip/4/encoding/${urlsafeBase64Encode('gbk')}|saveas/${zipKey}`
          const operManager = new qiniu.fop.OperationManager(mac, config)
          const pipeline = '' // 使用公共队列
          // 下行。不知用处
          const options = { force: false }
          operManager.pfop(bucket, key, [fops], pipeline, options, (err, respBody, respInfo) => {
            if (err) {
              throw err
            }
            if (respInfo.statusCode == 200) {
              // 可直接通过statusUrl查询处理状态
              const statusUrl = `http://api.qiniu.com/status/get/prefop?id=${respBody.persistentId}`
              console.log(statusUrl)
              // 这里只返回任务id，转由客户端发请求查询
              res(respBody.persistentId)
            } else {
              console.log(respInfo.statusCode)
              console.log(respBody)
            }
          })
        } else {
          console.log(respInfo.statusCode)
          console.log(respBody)
        }
      })
    })
  })
}

export function makeZipWithKeys(keys: string[], zipName: string): Promise<string> {
  return new Promise((res) => {
    const names = []
    const content = keys.map((key) => {
      // 拼接原始url
      // 链接加密并进行Base64编码，别名去除前缀目录。
      const keyInfo = getKeyInfo(key)
      const { name, ext } = keyInfo
      let { base } = keyInfo

      // 判断别名是否存在,存在则后缀+数字自增
      let i = 1
      while (names.includes(base)) {
        base = `${name}_${i}${ext}`
        i += 1
      }
      // 处理特殊情况
      const specialCharsReplaceMap = [['•', '·']]
      specialCharsReplaceMap.forEach(([pre, post]) => {
        base = base.replace(new RegExp(pre, 'g'), post)
      })
      names.push(base)
      const safeUrl = `/url/${urlsafeBase64Encode(createDownloadUrl(key))}/alias/${urlsafeBase64Encode(base)}`
      return safeUrl
    }).join('\n')
    const config = new qiniu.conf.Config({ zone: qiniu.zone.Zone_z2 })
    const formUploader = new qiniu.form_up.FormUploader(config)
    const putExtra = new qiniu.form_up.PutExtra()
    const key = `${Date.now()}-${~~(Math.random() * 1000)}.txt`

    formUploader.put(getUploadToken(), key, content, putExtra, (respErr,
      respBody, respInfo) => {
      if (respErr) {
        throw respErr
      }
      if (respInfo.statusCode == 200) {
        const { key } = respBody
        // 执行压缩
        const zipKey = urlsafeBase64Encode(`${bucket}:` + 'easypicker2/' + `temp_package/${Date.now()}/${zipName}.zip`)

        const fops = `mkzip/4/encoding/${urlsafeBase64Encode('gbk')}|saveas/${zipKey}`
        const operManager = new qiniu.fop.OperationManager(mac, config)
        const pipeline = '' // 使用公共队列
        // 下行。不知用处
        const options = { force: false }
        operManager.pfop(bucket, key, [fops], pipeline, options, (err, respBody, respInfo) => {
          if (err) {
            throw err
          }
          if (respInfo.statusCode == 200) {
            // 可直接通过statusUrl查询处理状态
            const statusUrl = `http://api.qiniu.com/status/get/prefop?id=${respBody.persistentId}`
            console.log(statusUrl)
            // 这里只返回任务id，转由客户端发请求查询
            res(respBody.persistentId)
          } else {
            console.log(respInfo.statusCode)
            console.log(respBody)
          }
        })
      } else {
        console.log(respInfo.statusCode)
        console.log(respBody)
      }
    })
  })
}

export function checkFopTaskStatus(persistentId: string): Promise<{ code: number, key?: string, desc?: string, error?: string }> {
  const config = new qiniu.conf.Config()
  const operManager = new qiniu.fop.OperationManager(null, config)
  return new Promise((res) => {
    operManager.prefop(persistentId, (err, respBody, respInfo) => {
      if (err) {
        console.log(err)
        throw err
      }
      if (respInfo.statusCode == 200) {
        // 结构 ![图片](http://img.cdn.sugarat.top/mdImg/MTYxMjg0MTQyODQ1Mg==612841428452)
        const item = respBody.items[0]
        const { code, key, desc, error } = item
        res({ code, key, desc, error })
      } else {
        console.log(respInfo.statusCode)
        console.log(respBody)
      }
    })
  })
}
interface FileStat {
  code: number
  data: {
    md5?: string,
    error?: string
    hash?: string,
    mimeType?: string,
    putTime?: number,
    type?: number
  }
}
/**
 * 批量查询文件状态
 */
export function batchFileStatus(keys: string[]): Promise<FileStat[]> {
  return new Promise((resolve, reject) => {
    if (keys.length === 0) {
      return []
    }
    const statOperations = keys.map((k) => qiniu.rs.statOp(bucket, k))
    const config = new qiniu.conf.Config()
    const bucketManager = new qiniu.rs.BucketManager(mac, config)
    bucketManager.batch(statOperations, (err, respBody, respInfo) => {
      if (err) {
        reject(err)
      } else {
        // 200 is success, 298 is part success
        if (parseInt(`${respInfo.statusCode / 100}`) == 2) {
          resolve(respBody)
        } else {
          console.log(respInfo.statusCode)
          console.log(respBody)
        }
      }
    })
  })
}
