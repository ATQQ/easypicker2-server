import crypto from 'crypto'
import { ObjectId } from 'mongodb'
import path from 'path'
/**
 * 加密字符串(md5+base64)
 * @param str 待加密的字符串
 */
export function encryption(str: string): string {
  return crypto.createHash('md5').update(str).digest('base64')
}

export function lowCamel2Underscore(word: string): string {
  const letters = word.split('')
  return letters.reduce((pre, letter) => pre + (/[A-Z]/.test(letter) ? `_${letter.toLowerCase()}` : letter), '')
}

export function getUniqueKey() {
  return new ObjectId().toHexString()
}

export function getKeyInfo(key: string) {
  const { name, base, ext } = path.parse(key)
  return {
    name, base, ext,
  }
}
