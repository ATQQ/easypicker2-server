create table category (
    id int auto_increment comment '主键自增' primary key,
    name varchar(256) not null comment '分类名称',
    user_id int not null comment '所属用户',
    k varchar(128) not null comment '分类唯一标识'
) comment '任务分类';