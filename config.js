/**
 * 小程序配置文件
 */

var host = "";  //服务器地址

var config = {

    // 下面的地址配合云端 Server 工作
    host,

    // 登录地址，用于建立会话
    loginUrl: `https://${host}/login`,
    checkUrl: `https://${host}/user`,
    qiniuDomain: ``,  //七牛云存储空间域名
    webUrl: `https://${host}`
};

module.exports = config;
