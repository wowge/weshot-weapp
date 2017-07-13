var qcloud = require('../../bower_components/wafer-client-sdk/index');
const util = require('../../utils/util');
var app = getApp();

var qcloudPromisified = util.wxPromisify(qcloud.request);
var requestPromisified = util.wxPromisify(wx.request);

var loadPage = function (that) {
    wx.showLoading({
        title: '稍等片刻',
    });
    var that = that;

    // clear history array when page refreshed.
    that.history = [];


    app.getUserInfo(function (userInfo) {
        qcloudPromisified({
            login: true,
            url: 'https://weshot.wowge.org/usr',
            data: {
                id: userInfo.id,
            }
        })
            .then(res => {
                if (res.statusCode == 404){
                    wx.hideLoading();
                    throw {msg: 'no usr found'};
                }
                if (res.data && res.data.history){
                    if (res.data.history.length == 0){
                        wx.hideLoading();
                        throw {msg: 'no history found'};
                    }
                    that.setData({
                        userInfo: res.data,
                        historySum: res.data.history.length
                    });
                }
            })
            .then(() => {
                for (let i = 0, len = that.data.userInfo.history.length; i < len; i++){
                    that.historyId[i] = that.data.userInfo.history[i];
                    that.coverBool[i] = false;
                    qcloudPromisified({
                        url: 'https://weshot.wowge.org/albumBrief',
                        data: {
                            id: that.data.userInfo.history[i],
                        }
                    })
                        .then(res => {
                            let albumId = res.data._id || that.historyId[i];
                            let cover = res.data.photos ? res.data.photos[0] : '';
                            let albumName = res.data.albumName || '';
                            let createOn = res.data.createOn ? util.formatTime(new Date(res.data.createOn)) : '';
                            let authorNickName = res.data.userInfo ? res.data.userInfo.nickName : '';
                            let authorAvatarUrl = res.data.userInfo ? res.data.userInfo.avatarUrl : '';

                            let historyItem = {
                                albumId: albumId,
                                //cover: cover,
                                albumName: albumName,
                                createOn: createOn,
                                authorNickName: authorNickName,
                                authorAvatarUrl: authorAvatarUrl
                            };
                            that.history[i] = historyItem;

                            return requestPromisified({
                                url: 'https://weshot.wowge.org/api/downloadUrl',
                                data: {
                                    key: cover,
                                }
                            });
                        })
                        .then(res => {
                            let cover = cover == '' ? '' : res.data.downloadUrl;
                            that.cover[i] = cover;
                            that.setData({
                                historyShowed: that.history,
                            });
                        })
                        .catch(err => {
                            console.log(err);
                        });
                }
            })
            .catch(err => {
                console.log(err);
            })
            .finally(res => {
                wx.hideLoading();
            });
    });
};
Page({
    data: {
        userInfo: {},
        historyShowed: [],
        coverShowed: [],
        coverBool: [],
        historySum: 0
    },
    history: [],
    historyShowed: [],
    historyId: [],
    cover: [],
    coverFilter: [],
    coverBool: [],
    coverShowed: [],

    onLoad: function () {
        var that = this;
        loadPage(that);
        that.coverFilter = that.cover;
    },

    onShow: function () {
    },

    deleteHistory: function (e) {
        var that = this;
        wx.showModal({
            title: '确定清除记录吗？',
            content: '确定清除记录《' + e.target.dataset.name + '》吗？',
            confirmText: '确定清除',
            confirmColor: '#ff0000',
            cancelColor: '#3CC51F',
            success: res=>{
                if (res.confirm) {
                    wx.showLoading({
                        title: '正在清除',
                    });
                    qcloudPromisified({
                        url: 'https://weshot.wowge.org/history',
                        method: 'DELETE',
                        data: {
                            id: e.target.id,
                        }
                    })
                        .then(res => {
                            if (res.statusCode == 404){
                                wx.hideLoading();
                                wx.showToast({
                                    title: '清除失败！',
                                    icon: 'loading',
                                    duration: 2000
                                });
                                throw {msg: 'fail'};
                            }
                            wx.showToast({
                                title: '已经清除',
                                icon: 'success',
                                duration: 2000
                            });
                            wx.reLaunch({
                                url: '../history/history',
                            });
                        })
                        .catch(err => {
                            console.log(err);
                            wx.showToast({
                                title: '清除失败！',
                                icon: 'loading',
                                duration: 2000
                            });
                        })
                        .finally(res => {
                            wx.hideLoading();
                        });
                }else if (res.cancel){
                    return;
                }
            },
        });
    },

    showCover: function (e) {
        let index = e.currentTarget.dataset.index;
        this.coverBool[index] = true;
        this.coverShowed[index] = this.coverFilter[index];
        this.setData({
            coverShowed: this.coverShowed,
            coverBool: this.coverBool
        });
    },
    
    openAlbum: function (e) {
        let id = e.currentTarget.dataset.id;
        wx.navigateTo({
          url: '../viewAlbum/viewAlbum?id=' + id
        });
    },

    /**
     * Functions about searchbox control
     */
    showInput: function () {
        this.setData({
            inputShowed: true
        });
    },
    hideInput: function () {
        this.setData({
            inputShowed: false
        });
    },
    clearInput: function () {
        this.setData({
            inputVal: "",
            historyShowed: this.history,
            coverBool: []
        });
        this.coverShowed = [];
        this.coverBool = [];
        this.coverFilter = this.cover;
    },
    inputTyping: function (e) {
        this.setData({
            inputVal: e.detail.value
        });
        if (this.data.inputVal.trim() == ''){
            this.setData({
                historyShowed: this.history,
                coverBool: []
            });
            this.coverShowed = [];
            this.coverBool = [];
            this.coverFilter = this.cover;
        }else {
            this.setData({
                historyShowed: [],
                coverBool: []
            });
            this.historyShowed = [];
            this.coverBool = [];
            this.albumsShowed = [];
            this.coverFilter = [];
            for (let i = 0, len = this.history.length; i < len; i++){
                if (this.history[i].albumName.includes(this.data.inputVal.trim()) || this.history[i].createOn.includes(this.data.inputVal.trim()) || this.history[i].authorNickName.includes(this.data.inputVal.trim())){
                    this.historyShowed.push(this.history[i]);
                    this.setData({
                        historyShowed: this.historyShowed
                    });
                    this.coverFilter.push(this.cover[i]);
                }
            }
        }
    },
});
