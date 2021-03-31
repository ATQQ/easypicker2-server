import { query } from '@/lib/dbConnect/mysql'
import { deleteTableByModel, insertTableByModel, selectTableByModel } from '@/utils/sqlUtil'
import { getUniqueKey } from '@/utils/stringUtil'
import { OkPacket } from 'mysql'
import { Category } from './model/category'

export function selectCategory(options: Category) {
    const { sql, params } = selectTableByModel('category', {
        data: options
    })
    return query<Category[]>(sql, ...params)
}

export function insertCategory(category: Category) {
    Object.assign(category, {
        k: getUniqueKey()
    })
    const { sql, params } = insertTableByModel('category', category)
    return query<OkPacket>(sql, ...params)
}

export function deleteCategory(category: Category) {
    const { sql, params } = deleteTableByModel('category', category)
    return query<OkPacket>(sql, ...params)
}