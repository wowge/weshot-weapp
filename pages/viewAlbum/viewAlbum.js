const util = require('../../utils/util');
var qcloud = require('../../bower_components/wafer-client-sdk/index');
const qiniuUploader = require('../../libs/qiniuUploader');
var app = getApp();

var qcloudPromisified = util.wxPromisify(qcloud.request);
var requestPromisified = util.wxPromisify(wx.request);
var downloadPromisified = util.wxPromisify(wx.downloadFile);
var getImageInfoPromisified = util.wxPromisify(wx.getImageInfo);
var showModalPromisified = util.wxPromisify(wx.showModal);
var saveImageToPhotosAlbumPromisified = util.wxPromisify(wx.saveImageToPhotosAlbum);

var showFail = (title, content) => {
    wx.showModal({
        title,
        content: JSON.stringify(content),
        showCancel: false
    });
};

Page({
    data: {
        albumId: '',
        photos: [],
        albumName: '',
        memory: '',
        feelings: [],
        music: {},
        feeling: '',
        reviews: [],
        autoplay: true,
        randomColor: '',
        userInfo: {},
        photoIndex: 0,
        photoNum: 0,
        photosSize: [],
        swiperHeight: 720,
        style: ['幻灯片', '图文', '照片墙'],
        styleIndex: 0,
        styleChecked: [true, false, false],
        playing: true,
        me: {},
        interval: 3000,
        intervalText: '中'
    },
    photosSize: [],
    albumId: '',

    onLoad: function (option) {
        wx.showLoading({
            title: '正在读取中，稍等',
        });

        var that = this;
        that.albumId = option.id;

        app.getUserInfo(function (userInfo) {
            that.setData({
                me: userInfo,
            });

            qcloudPromisified({
                login: true,
                url: 'https://weshot.wowge.org/albumDetail',
                data: {
                    id: option.id,
                }
            })
                .then(res => {
                    that.photos = res.data.photos;
                    that.albumName = res.data.albumName;
                    that.memory = res.data.memory;
                    that.feelings = res.data.feelings;
                    that.music = res.data.music;
                    that.userInfo = res.data.userInfo;
                    that.createOn = util.formatTime(new Date(res.data.createOn));
                    that.photoNum = that.photos ? that.photos.length : 0;
                })
                .then(() => {
                    for (let i = 0, len = that.photoNum; i < len; i++){
                        requestPromisified({
                            url: 'https://weshot.wowge.org/api/downloadUrl',
                            data: {
                                key: that.photos[i],
                            }
                        })
                            .then(res => {
                                var url = res.data.downloadUrl;
                                return downloadPromisified({
                                    url: url
                                });
                            })
                            .then(res => {
                                that.photos[i] = res.tempFilePath;
                                that.setData({
                                    photos: that.photos
                                });
                                return getImageInfoPromisified({
                                    src: that.photos[i]
                                });
                            })
                            .then(res => {
                                that.photosSize[i] = {
                                    width: res.width,
                                    height: res.height,
                                };
                                that.setData({
                                    photosSize: that.photosSize,
                                });
                            })
                            .catch(err => {
                                console.log(err);
                            });
                    }
                })
                .then(() => {
                    return requestPromisified({
                        url: 'https://weshot.wowge.org/api/get/song/qq',
                        data: {
                            id: that.music.id
                        }
                    });
                })
                .then(res => {
                    that.music.src = res.data.url;
                    that.setData({
                        albumId: that.albumId,
                        albumName: that.albumName || '',
                        memory: that.memory || '',
                        feelings: that.feelings || [],
                        music: that.music,
                        userInfo: that.userInfo,
                        createOn: that.createOn,
                        feeling: that.feelings[0] || '',
                        photoNum: that.photoNum,
                    });
                })
                .catch(err => {
                    console.log(err);
                    showFail('读取失败！', err);
                })
                .finally(res => {
                    wx.hideLoading();
                });
        });
    },

    /**
     * page onReady
     */
    onReady: function () {
        var that = this;
        that.audioCtx = wx.createAudioContext("myAudio");
        setTimeout(function () {
            that.audioCtx.play();
        }, 3000);
    },

    onHide: function () {
        if (this.data.playing === true){
            this.audioCtx.pause();
            this.setData({
                playing: false,
            });
        }
    },

    onShow: function () {
        if (this.data.playing === false){
            this.audioCtx.play();
            this.setData({
                playing: true,
            });
        }
    },
    /**
     * Play/pause the music by tapping the audio control
     */
    controlMusic: function () {
        if (this.data.playing === true){
            this.audioCtx.pause();
            this.setData({
                playing: false,
            });
        }else {
            this.audioCtx.play();
            this.setData({
                playing: true,
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
     * Change the feeling field when photo is changed
     */
    photoChanged: function (e) {
        let index = e.detail.current;
        this.setData({
            feeling: this.data.feelings[index] || '',
            photoIndex: index,
            swiperHeight: this.data.photosSize[index].width > this.data.photosSize[index].height ? 720*this.data.photosSize[index].height/this.data.photosSize[index].width : 720,
        });
        this.getRandomColor();
    },

    bindPickerChange: function (e) {
        var styleIndex = e.detail.value;
        var styleChecked = [];
        this.setData({
            styleIndex: styleIndex,
        });
        for (let i = 0, len = this.data.style.length; i < len; i++){
            if (this.data.styleIndex == i){
                styleChecked[i] = true;
            }else {
                styleChecked[i] = false;
            }
        }
        this.setData({
            styleChecked: styleChecked,
        })
    },

    /**
     * Set the font color of slide mode
     */
    getRandomColor: function(){
        const rgb = [];
        for (let i = 0 ; i < 3; ++i) {
            let color = Math.floor(Math.random() * 256).toString(16);
            color = color.length === 1 ? '0' + color : color;
            rgb.push(color);
        }
        let randomColor = '#' + rgb.join('');
        this.setData({
            randomColor: randomColor,
        });
    },

    /**
     * Set the slide mode's interval time
     * @param e
     */
    intervalChange: function (e) {
        this.setData({
            interval: e.detail.value
        });
        switch (this.data.interval){
            case 1000:
                this.setData({
                    intervalText: '极快'
                });
                break;
            case 2000:
                this.setData({
                    intervalText: '快'
                });
                break;
            case 3000:
                this.setData({
                    intervalText: '中'
                });
                break;
            case 4000:
                this.setData({
                    intervalText: '慢'
                });
                break;
            case 5000:
                this.setData({
                    intervalText: '极慢'
                });
                break;
        }
    },

    authorizeUserInfo: function () {
        var that = this;
        wx.openSetting({
            success(res){
                res.authSetting = {
                    'scope.userInfo': true,
                };
                wx.reLaunch({
                    url: '/pages/viewAlbum/viewAlbum?id=' + that.albumId
                })
            },
        });
    },

    onShareAppMessage: function (res) {
        return {
            title: this.data.albumName + '  ' +this.data.userInfo.nickName + '的小相册',
            path: '/pages/viewAlbum/viewAlbum?id=' + this.data.albumId
        };
    },

    saveAll: function (e) {
        var that = this;
        showModalPromisified({
            title: '保存到系统相册',
            content: '确定保存《' + e.target.dataset.name + '》的所有相片到系统相册吗？'
        })
            .then(res => {
                if (res.confirm) {
                    wx.showLoading({
                        title: '正在保存',
                    });
                }else if (res.cancel){
                    throw {msg: 'break'};
                }
            })
            .then(() => {
                for (let i = 0, len = that.data.photos.length; i < len; i++){
                    saveImageToPhotosAlbumPromisified({
                        filePath: that.data.photos[i]
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
    }
});