const util = require('../../utils/util');
var Promise = require('../../libs/es6-promise.min');
var qcloud = require('../../bower_components/wafer-client-sdk/index');
const qiniuUploader = require('../../libs/qiniuUploader');
var app = getApp();

var qcloudPromisified = util.wxPromisify(qcloud.request);
var qiniuUploadPromisified = util.wxPromisify(qiniuUploader.upload);

var showFail = (title, content) => {
    wx.showModal({
        title,
        content: JSON.stringify(content),
        showCancel: false
    });
};

var showSuccess = text => wx.showToast({
    title: text,
    icon:'success'
});

Page({
    data: {
        photos: [],
        albumName: '',
        memory: '',
        feelings: [],
        music: {
            id: '001VfvsJ21xFqb',
            poster: 'http://y.gtimg.cn/music/photo_new/T002R300x300M000003rsKF44GyaSk.jpg?max_age=2592000',
            name: '此时此刻',
            authors: '许巍',
            src: 'http://ws.stream.qqmusic.qq.com/M500001VfvsJ21xFqb.mp3?guid=ffffffff82def4af4b12b3cd9337d5e7&uin=346897220&vkey=6292F51E1E384E06DCBDC9AB7C49FD713D632D313AC4858BACB8DDD29067D3C601481D36E62053BF8DFEAF74C0A5CCFADD6471160CAF3E6A&fromtag=46'
        },
        photosSize: [],
        photoNum: 0,
    },
    feelings: [],
    photosSize: [],

    /**
     * page onReady
     */
    onReady: function (e) {
        this.audioCtx = wx.createAudioContext("myAudio");
        this.musicPlay = false;
    },

    /**
     * Pause the music when page onHide
     */
    onHide: function () {
        if (this.musicPlay === true){
            this.audioCtx.pause();
            this.musicPlay = false;
        }
    },

    /**
     * restart the music when page onShow
     */
    onShow: function () {
        this.setData({
            music: wx.getStorageSync('music') || this.data.music,
        });
    },
    /**
     * Get photos array when page onload
     */
    onLoad: function (option) {
        var that = this;
        let photoNum;
        that.setData({
            photos: wx.getStorageSync('photos'),
            albumName: wx.getStorageSync('albumName') || '',
            memory: wx.getStorageSync('memory') || '',
            feelings: wx.getStorageSync('feelings') || [],
        });
        if (!wx.getStorageSync('music')){
            wx.setStorageSync('music', this.data.music);
        }
        that.feelings = wx.getStorageSync('feelings') || [];

        photoNum = that.data.photos.length;
        for (let i = 0, len = photoNum; i < len; i++){
             wx.getImageInfo({
               src: that.data.photos[i],
                success: function (res) {
                    that.photosSize[i] = {
                        width: res.width,
                        height: res.height,
                    };
                    that.setData({
                        photosSize: that.photosSize,
                    });
                    wx.setStorageSync('photosSize', that.data.photosSize);
                },
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
     * set album name
     */
    setAlbumName: function (e) {
        wx.setStorageSync('albumName', e.detail.value);
        this.setData({
            albumName: e.detail.value
        });
    },

    /**
     * set memory field
     */
    setMemory: function (e) {
        wx.setStorageSync('memory', e.detail.value);
        this.setData({
            memory: e.detail.value
        });
    },

    /**
     * set feelings field
     */
    setFeelings: function (e) {
        this.feelings[e.target.dataset.index] = e.detail.value;
        this.setData({
            feelings: this.feelings
        });
        wx.setStorageSync('feelings', this.data.feelings);
    },

    /**
     * Go to chooseMusic page
     */
    chooseMusic: function (e) {
        wx.navigateTo({
            url: '../chooseMusic/chooseMusic'
        });
    },

    /**
     * Clear albumName, memory, feelings fields
     */
    clearText: function () {
        wx.removeStorageSync('albumName');
        wx.removeStorageSync('memory');
        wx.removeStorageSync('feelings');
        this.setData({
            albumName: '',
            memory: '',
            feelings: [],
        });
        this.feelings = [];
    },

    /**
     * Upload album to server and navigate to viewAlbum page
     */
    uploadAlbum: function () {
        var that = this;
        var photos = that.data.photos;
        var albumId = '';

        wx.showLoading({
            title: '正在上传',
        });

        app.initQiniu();
        new Promise(function (resolve) {
            resolve();
        })
            .then(() => {
                for (let i = 0, len = photos.length; i < len; i++){
                    qiniuUploadPromisified({
                        filePath: photos[i],
                    })
                        .catch(err => {
                            console.log(err);
                        });
                }
            })
            .then(() => {
                for (let j = 0, len = photos.length; j < len; j++){
                    photos[j] = photos[j].split('//')[1];
                }
                return qcloudPromisified({
                    url: 'https://weshot.wowge.org/album/new',
                    data: {
                        albumName: that.data.albumName,
                        memory: that.data.memory,
                        photos: photos,
                        feelings: that.data.feelings,
                        music: that.data.music,
                        createOn: Date.now(),
                    },
                    method: 'POST'
                })
            })
            .then(res => {
                albumId = res.data._id;
            })
            .catch(err => {
                console.log(err);
            })
            .finally(res => {
                wx.removeStorageSync('photos');
                wx.removeStorageSync('feelings');
                wx.removeStorageSync('albumName');
                wx.removeStorageSync('memory');
                wx.removeStorageSync('music');
                wx.removeStorageSync('photosSize');
                wx.hideLoading();
                wx.switchTab({
                    url: '../albums/albums'
                });
            });
    },

    /**
     * Navigate back to newAlbum page
     */
    navigateBack: function () {
        wx.navigateBack();
    },

    /**
     * Play/pause the music by tapping the audio control
     */
    controlMusic: function () {
        if (this.musicPlay === true){
            this.audioCtx.pause();
            this.musicPlay = false;
        }else {
            this.audioCtx.play();
            this.musicPlay = true;
        }
    }
});