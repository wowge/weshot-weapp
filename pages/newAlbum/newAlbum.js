var qcloud = require('../../bower_components/wafer-client-sdk/index');
var app = getApp();

// show busy toast
var showBusy = text => wx.showToast({
  title: text,
    icon: 'loading',
    duration: 1000
});

// show success toast
var showSuccess = text => wx.showToast({
  title: text,
    icon:'success'
});

var loadPage = function (that) {
    var that = that;
    wx.showLoading({
        title: '稍等片刻',
    });
    app.getUserInfo(function (userInfo) {
        that.setData({
            userInfo: userInfo,
        });
        wx.hideLoading();
    });
};

Page({
    data: {
        userInfo: {},
        photos: [],
    },
    /**
     * Make login request when page onload
     */
    onLoad: function () {
        var that = this;
        loadPage(that);
    },

    /**
     * page onShow
     */
    onShow: function () {
        var that = this;
        loadPage(that);
    },

    /**
     * Choose photos by user
     */
    choosePhotos: function (e) {
        var that = this;
        wx.chooseImage({
            count: 10,
            sizeType: ['compressed'],
            success: res => {
              that.setData({
                  photos: that.data.photos.concat(res.tempFilePaths)
              });
              wx.setStorageSync('photos', that.data.photos);
          }
        });
    },


    /**
     * Go to editPhotos page
     */
    gotoEditPhotos: function (e) {
        var that = this;
        if (that.data.photos.length === 0){
            showBusy('请选择相片');
        }else {
            wx.navigateTo({
                url: '../editPhotos/editPhotos'
            });
        }
    },

    /**
     * Preview photo
     */
    previewPhoto: function (e) {
        wx.previewImage({
            urls: this.data.photos,
            current: e.currentTarget.id
        });
    },

    /**
     * Clear photos and relating feelings field
     */
    clearPhotos: function () {
        wx.removeStorageSync('photos');
        wx.removeStorageSync('feelings');
        wx.removeStorageSync('photosSize');
        this.setData({
            photos: [],
            feelings: [],
        });
    },

    authorizeUserInfo: function () {
        var that = this;
        wx.openSetting({
            success(res){
              res.authSetting = {
                  'scope.userInfo': true,
              };
                wx.showLoading({
                    title: '稍等片刻',
                });
                app.getUserInfo(function (userInfo) {
                    that.setData({
                        userInfo: userInfo,
                    });
                    wx.hideLoading();
                });
            },
        });
    },
});