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

var showBusy = text => wx.showToast({
    title: text,
    icon: 'loading',
    duration: 1000
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
    photos: [],

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
     * set music
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
        wx.showLoading({
            title: '正在读取中，稍等',
        });

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
        that.photos = that.data.photos;
        that.feelings = wx.getStorageSync('feelings') || [];

        wx.hideLoading();
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
        var photosPath = [];
        for (let j = 0, len = photos.length; j < len; j++){
          photosPath[j] = photos[j].split('//')[1];
        }

        wx.showLoading({
            title: '正在上传',
        });

        app.initQiniu();
        qcloudPromisified({
          url: 'https://weshot.wowge.org/album/new',
          data: {
            albumName: that.data.albumName,
            memory: that.data.memory,
            photos: photosPath,
            feelings: that.data.feelings,
            music: that.data.music,
            createOn: Date.now(),
          },
          method: 'POST'
        })
        .then(() => {
          let flag = 0, count =0;
          for (let i = 0, len = photos.length; i < len; i++){
            count++;
            qiniuUploadPromisified({
                filePath: photos[i],
            })
              .then(res => {
                wx.showToast({
                  title: '第' + (i + 1) + '张完成上传',
                  icon: 'loading',
                  duration: 20000
                })
                flag++;
                if (flag === count) {
                  wx.hideLoading();
                  wx.switchTab({
                    url: '../albums/albums'
                  });
                }
              })
          }
        })
        .catch(err => {
          //console.log(err);
        })
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
    },

    /**
     * Photo item operation
     */
    upPhoto: function (e) {
        let i = e.currentTarget.dataset.id;
        if(i == 0){
            showBusy('已经到顶了！');
            return;
        }
        let prePhoto = this.data.photos[i - 1];
        let preFeeling = this.data.feelings[i - 1];
        let prePhotoSize = this.photosSize[i - 1];
        this.photos = this.data.photos;
        this.photos[i - 1] = this.photos[i];
        this.photos[i] = prePhoto;
        this.feelings[i - 1] = this.feelings[i];
        this.feelings[i] = preFeeling;
        this.photosSize[i - 1] = this.photosSize[i];
        this.photosSize[i] = prePhotoSize;

        this.setData({
            photos: this.photos
        });
        wx.setStorageSync('photos', this.data.photos);
        this.setData({
            feelings: this.feelings
        });
        wx.setStorageSync('feelings', this.data.feelings);
        this.setData({
            photosSize: this.photosSize
        });
        wx.setStorageSync('photosSize', this.data.photosSize);
    },

    downPhoto: function (e) {
        let i = e.currentTarget.dataset.id;
        if(i == this.data.photos.length - 1){
            showBusy('已经到底了！');
            return;
        }
        let curPhoto = this.data.photos[i];
        let curFeeling = this.data.feelings[i];
        let curPhotoSize = this.photosSize[i];
        this.photos = this.data.photos;
        this.photos[i] = this.photos[i + 1];
        this.photos[i + 1] = curPhoto;
        this.feelings[i] = this.feelings[i + 1];
        this.feelings[i + 1] = curFeeling;
        this.photosSize[i] = this.photosSize[i + 1];
        this.photosSize[i + 1] = curPhotoSize;

        this.setData({
            photos: this.photos
        });
        wx.setStorageSync('photos', this.data.photos);
        this.setData({
            feelings: this.feelings
        });
        wx.setStorageSync('feelings', this.data.feelings);
        this.setData({
            photosSize: this.photosSize
        });
        wx.setStorageSync('photosSize', this.data.photosSize);
    },

    replacePhoto: function (e) {
        let i = e.currentTarget.dataset.id;
        var that = this;
        wx.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            success: res => {
                that.photos[i] = res.tempFilePaths[0];
                that.setData({
                    photos: that.photos
                });
                wx.setStorageSync('photos', that.data.photos);

                wx.getImageInfo({
                    src: that.photos[i],
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
        });
    },

    deletePhoto: function (e) {
        let i = e.currentTarget.dataset.id;
        var that = this;
        wx.showModal({
            title: '确定删除相片 ' + (i + 1) + ' 吗？',
            content: '确定删除相片 ' + (i + 1) + '"' + (that.feelings[i] || '') + '"' + ' 吗？',
            confirmText: '确定',
            confirmColor: '#ff0000',
            cancelColor: '#3CC51F',
            success: res => {
                if (res.confirm){
                    that.photos.splice(i, 1);
                    that.photosSize.splice(i, 1);
                    that.feelings.splice(i, 1);

                    this.setData({
                        photos: this.photos
                    });
                    wx.setStorageSync('photos', this.data.photos);
                    this.setData({
                        feelings: this.feelings
                    });
                    wx.setStorageSync('feelings', this.data.feelings);
                    this.setData({
                        photosSize: this.photosSize
                    });
                    wx.setStorageSync('photosSize', this.data.photosSize);
                }else if (res.cancel){
                    return;
                }
            }
        });
    },

    choosePhotos: function (e) {
        var that = this;
        wx.chooseImage({
            count: 10,
            sizeType: ['compressed'],
            success: res => {
                let prePhotosLen = that.data.photos.length;
                that.photos = that.photos.concat(res.tempFilePaths);
                that.setData({
                    photos: that.photos
                });
                wx.setStorageSync('photos', that.photos);

                for (let i = prePhotosLen, len = that.data.photos.length; i < len; i++){
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
                            wx.setStorageSync('photosSize', that.photosSize);
                        },
                    });
                }
            }
        });
    },
});