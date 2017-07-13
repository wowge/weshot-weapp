var showSuccess = text => wx.showToast({
    title: text,
    icon:'success'
});

Page({
    onLoad: function () {
        wx.showLoading({
            title: '正在读取，稍等',
        });
        var that = this;

        wx.request({
            url: 'https://weshot.wowge.org/playlist?catagory=qiniuFiles',
            success: (res) => {
                var files = res.data[0].lists;

                that.setData({
                    files: files
                });
                wx.hideLoading();
            },
            fail: (res) => {
                wx.hideLoading();
            }
        });
    },

    previewPhoto_qrcode: function (e) {
        wx.previewImage({
            urls: [this.data.files[3].id],
        });
    },

    previewPhoto_weshot: function (e) {
        wx.previewImage({
            urls: [this.data.files[4].id],
        });
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