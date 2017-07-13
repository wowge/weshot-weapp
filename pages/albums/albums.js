var qcloud = require('../../bower_components/wafer-client-sdk/index');
const util = require('../../utils/util');
var app = getApp();

var qcloudPromisified = util.wxPromisify(qcloud.request);
var requestPromisified = util.wxPromisify(wx.request);

var loadPage = (that) => {
    wx.showLoading({
        title: '稍等片刻',
    });
    var that = that;

    // clear albums array when page refreshed.
    that.albums = [];

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
                if (res.data && res.data.albums) {
                    if (res.data.albums.length == 0) {
                        wx.hideLoading();
                        throw {msg: 'no album found'};
                    }
                    that.setData({
                        userInfo: res.data,
                        albumSum: res.data.albums.length
                    });
                }
            })
            .then(() => {
                for (let i = 0, len = that.data.userInfo.albums.length; i < len; i++){
                    qcloudPromisified({
                        url: 'https://weshot.wowge.org/albumBrief',
                        data: {
                            id: that.data.userInfo.albums[i],
                        }
                    })
                        .then(res => {
                            let albumId = res.data._id;
                            let cover = res.data.photos[0];
                            let albumName = res.data.albumName;
                            let createOn = util.formatTime(new Date(res.data.createOn));
                            let album = {
                                albumId: albumId,
                                //cover: cover,
                                albumName: albumName || '',
                                createOn: createOn,
                            };
                            that.albums[i] = album;

                            return requestPromisified({
                                url: 'https://weshot.wowge.org/api/downloadUrl',
                                data: {
                                    key: cover,
                                }
                            });
                        })
                        .then(res => {
                            let cover = res.data.downloadUrl;
                            that.cover[i] = cover;
                            that.setData({
                                albumsShowed: that.albums
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
        albumSum: 0,
        coverShowed: [],
        coverBool: [],
        albumsShowed: []
    },
    albums: [],
    albumsShowed: [],
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

    onPullDownRefresh: function () {
        var that = this;
        loadPage(that);
        that.setData({
            coverBool: []
        });
        that.coverFilter = that.cover;
        wx.stopPullDownRefresh();
    },

    deleteAlbum: function (e) {
        var that = this;
        wx.showModal({
          title: '确定删除相册吗？',
          content: '确定删除相册《' + e.target.dataset.name + '》吗？',
          confirmText: '确定删除',
          confirmColor: '#ff0000',
          cancelColor: '#3CC51F',
          success: res=>{
            if (res.confirm) {
                wx.showLoading({
                    title: '正在删除',
                });

                qcloudPromisified({
                    url: 'https://weshot.wowge.org/album',
                    method: 'DELETE',
                    data: {
                        id: e.target.id,
                    }
                })
                    .then(res => {
                        if (res.statusCode == 404){
                            wx.hideLoading();
                            wx.showToast({
                                title: '删除失败！',
                                icon: 'loading',
                                duration: 2000
                            });
                            throw {msg: 'fail'};
                        }
                        wx.showToast({
                            title: '《' + e.target.dataset.name + '》已经删除',
                            icon: 'success',
                            duration: 2000
                        });
                        wx.reLaunch({
                            url: '../albums/albums',
                        });
                    })
                    .catch(err => {
                        console.log(err);
                        wx.showToast({
                            title: '删除失败！',
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
            albumsShowed: this.albums,
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
                albumsShowed: this.albums,
                coverBool: []
            });
            this.coverShowed = [];
            this.coverBool = [];
            this.coverFilter = this.cover;
        }
        else {
            this.setData({
                albumsShowed: [],
                coverBool: []
            });
            this.coverShowed = [];
            this.coverBool = [];
            this.albumsShowed = [];
            this.coverFilter = [];
            for (let i = 0, len = this.albums.length; i < len; i++){
                if (this.albums[i].albumName.includes(this.data.inputVal.trim()) || this.albums[i].createOn.includes(this.data.inputVal.trim())){
                    this.albumsShowed.push(this.albums[i]);
                    this.setData({
                        albumsShowed: this.albumsShowed
                    });
                    this.coverFilter.push(this.cover[i]);
                }
            }
        }
    },
});
