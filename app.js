/**
 * The entry point of app
 */
var qcloud = require('./bower_components/wafer-client-sdk/index');
var config = require('./config');
var queue = require('./libs/wx-queue-request');
queue.queue();

const qiniuUploader = require('./libs/qiniuUploader');

// show fail popup
var showFail = (title, content) => {
    wx.hideToast();
    wx.showModal({
        title,
        content: JSON.stringify(content),
        showCancel: false
    });
};

App({
    globalData: {
        userInfo: null,
    },
    /**
     * Setting up login url when app on launch
     */
    onLaunch(){
        qcloud.setLoginUrl(config.loginUrl);
    },

    // 初始化七牛相关参数
    initQiniu: function() {
        var options = {
            region: '', // 七牛云地区码
            uptokenURL: 'https://weshot.wowge.org/api/uptoken',  //七牛云上传凭据获取地址
            // uptoken: 'xxxx',
            domain: config.qiniuDomain
        };
        qiniuUploader.init(options);
    },
    getUserInfo:function(cb){
        var that = this;
        if(this.globalData.userInfo){
            typeof cb == "function" && cb(this.globalData.userInfo);
        }else{
            //调用登录接口
            qcloud.login({
                success: result => {
                    qcloud.request({
                        url: config.checkUrl,

                        success(result) {
                            var userInfo = {};
                            userInfo.nickName = result.data.data.userInfo.nickName;
                            userInfo.avatarUrl = result.data.data.userInfo.avatarUrl;
                            userInfo.id = result.data.data.userInfo.openId;
                            that.globalData.userInfo = userInfo;
                            typeof cb == "function" && cb(that.globalData.userInfo);
                        },
                    });
                },

                fail: error => {
                    showFail('登录失败', error);
                },
            });
        }
    },
});