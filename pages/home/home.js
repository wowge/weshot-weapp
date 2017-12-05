var util = require('../../utils/util');
var config = require('../../config')
var app = getApp();

var requestPromisified = util.wxPromisify(wx.request);
var loadPage = (that) => {
    wx.showLoading({
        title: '正在读取，稍等',
    });
    var that = that;

    requestPromisified({
        url: 'https://weshot.wowge.org/playlist?catagory=faq'
    })
        .then(res => {
            var faq = res.data[0].lists;

            that.setData({
                faq: faq
            });
            return requestPromisified({
                url: 'https://weshot.wowge.org/playlist?catagory=qiniuFiles'
            });
        })
        .then(res => {
            var files = res.data[0].lists;
            that.setData({
                files: files
            });
            app.getUserInfo(function (userInfo) {
              that.setData({
                nickName: userInfo.nickName,
                password: userInfo.id
              })
            })
        })
        .catch(err => {
            //console.log(err);
        })
        .finally(res => {
            wx.hideLoading();
        });
};

var showSuccess = text => wx.showToast({
  title: text,
  icon:'success'
});

Page({
    data: {
      webUrl: config.webUrl,
      nickName: '',
      password: ''
    },

    onLoad: function () {
        var that = this;
        loadPage(that);
    },

    onPullDownRefresh: function () {
      var that = this;
      loadPage(that);
      wx.stopPullDownRefresh();
    },

    onShow: function () {
    },

    onShareAppMessage: function (res) {
        return {
            title: '似水流年小相册',
            path: '/pages/home/home'
        };
    },

    setClipboard: function (e) {
      wx.setClipboardData({
        data: e.currentTarget.dataset.content,
        success: function (res) {
          showSuccess('已复制到剪贴板');
        }
      });
    }
});