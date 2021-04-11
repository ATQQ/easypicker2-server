import { query } from '@/lib/dbConnect/mysql'
import { deleteTableByModel, insertTableByModelMany, selectTableByModel } from '@/utils/sqlUtil'
import { getUniqueKey } from '@/utils/stringUtil'
import { OkPacket } from 'mysql'
import { People } from './model/people'

export function selectPeople(options: People, columns: string[] = ['name']) {
    const { sql, params } = selectTableByModel('people', {
        data: options,
        columns
    })

    return query<People[]>(sql, ...params)
}

export function insertPeople(people: People[], defaultData: People = {}) {
    people.forEach(p => {
        Object.assign(p, defaultData, p)
    })
    const { sql, params } = insertTableByModelMany('people', people)
    return query<OkPacket>(sql, ...params)
}

export function deletePeople(people: People) {
    const { sql, params } = deleteTableByModel('people', people)
    return query<OkPacket>(sql, ...params)
}