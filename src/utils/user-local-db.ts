import fs, { existsSync } from 'fs'
import path from 'path'
import { UserConfig, UserConfigType } from '@/db/model/config'

const JSONDbFile = path.join(process.cwd(), 'user-config.json')

export default class LocalUserDB {
  private static data = []

  static async initUserConfig() {
    if (!existsSync(JSONDbFile)) {
      await fs.promises.writeFile(JSONDbFile, '[]', 'utf-8')
      this.data = []
      return
    }
    try {
      this.data = JSON.parse(await fs.promises.readFile(JSONDbFile, 'utf-8'))
    } catch (error) {
      this.data = []
      console.log('❌ user-config.json 配置文件解析失败, 已重置为默认配置')
      await fs.promises.writeFile(JSONDbFile, '[]', 'utf-8')
    }
  }

  static updateCfg() {
    return fs.promises.writeFile(
      JSONDbFile,
      JSON.stringify(this.data, null, 2),
      'utf-8'
    )
  }

  static addUserConfigData(data: Partial<UserConfig>) {
    this.data.push(data)
  }

  static findUserConfig(query: Partial<UserConfig>) {
    return this.data.filter((item) =>
      Object.keys(query).every((key) => item[key] === query[key])
    )
  }

  static updateUserConfig(
    query: Partial<UserConfig>,
    data: Partial<UserConfig>
  ) {
    const index = this.data.findIndex((item) =>
      Object.keys(query).every((key) => item[key] === query[key])
    )
    if (index > -1) {
      this.data[index] = { ...this.data[index], ...data }
      this.updateCfg()
    }
  }

  static getUserConfigByType(type: UserConfigType): Record<string, any> {
    return this.findUserConfig({ type }).reduce((prev, curr) => {
      prev[curr.key] = curr.value
      return prev
    }, {})
  }
}
