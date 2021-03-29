create table people (
    id int auto_increment comment '主键' primary key,
    task_id int not null comment '关联任务id',
    user_id int not null comment '所属用户id',
    name varchar(128) null comment '人员姓名',
    status tinyint default 0 not null comment '是否提交',
    submit_date timestamp default CURRENT_TIMESTAMP not null comment '最后提交时间',
    submit_count int default 0 not null
) comment '任务关联人员表';