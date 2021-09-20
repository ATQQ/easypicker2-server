export enum ActionType {
    /**
     * 点赞
     */
    PRAISE
}
export interface Action {
    id: string
    userId: string
    thingId: string
    type: ActionType
    date: Date
}
