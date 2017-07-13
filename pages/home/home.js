var util = require('../../utils/util');

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
        })
        .catch(err => {
            console.log(err);
        })
        .finally(res => {
            wx.hideLoading();
        });
};

Page({
    data: {
    },

    onLoad: function () {
        var that = this;
        loadPage(that);
    },

    onShow: function () {
    },

    onShareAppMessage: function (res) {
        return {
            title: '似水流年小相册',
            path: '/pages/home/home'
        };
    }
});