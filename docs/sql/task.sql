create table task (
    id int auto_increment comment '主键' primary key,
    user_id int not null comment '所属用户id',
    category_key varchar(128) not null comment '关联分类key',
    name varchar(256) not null comment '任务名称',
    k varchar(128) not null comment '任务唯一标识'
) comment '任务表';