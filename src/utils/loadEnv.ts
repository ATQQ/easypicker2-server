// 读取配置的环境变量
import dotenv from 'dotenv'

export default function loadEnv() {
  const baseDir = `${__dirname}/../../`
  dotenv.config()
  dotenv.config({ path: `${baseDir}.env.local` })
  if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: `${baseDir}.env.production.local` })
  }
}
