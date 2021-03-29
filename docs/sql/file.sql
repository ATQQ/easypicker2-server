-- auto-generated definition
create table files (
    id int auto_increment primary key,
    task_id int not null comment '所属任务',
    task_name varchar(256) not null comment '提交时的任务名称',
    category_id int not null comment '所属分类',
    category_name varchar(256) not null comment '提交时所属分类名称',
    user_id int not null comment '所属用户',
    user_account varchar(32) not null comment '所属用户账号',
    name varchar(1024) not null comment '文件名',
    info varchar(1024) not null comment '提交填写的信息',
    hash varchar(512) not null comment '文件hash',
    date timestamp default CURRENT_TIMESTAMP not null comment '上传日期',
    size int not null comment '文件大小'
) comment '用户提交的问题';