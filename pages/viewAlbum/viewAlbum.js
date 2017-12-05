const util = require('../../utils/util');
var qcloud = require('../../bower_components/wafer-client-sdk/index');
var app = getApp();

var qcloudPromisified = util.wxPromisify(qcloud.request);
var requestPromisified = util.wxPromisify(wx.request);
var showModalPromisified = util.wxPromisify(wx.showModal);
var saveImageToPhotosAlbumPromisified = util.wxPromisify(wx.saveImageToPhotosAlbum);

var showFail = (title, content) => {
    wx.showModal({
        title,
        content: JSON.stringify(content),
        showCancel: false
    });
};

var loadPage = (that, option) => {
    wx.showLoading({
        title: '正在读取中，稍等',
    });

    var that = that;
    var option = option;
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
                return requestPromisified({
                  url: 'https://weshot.wowge.org/api/get/song/qq',
                  data: {
                    id: that.music.id
                  }
                });
            })
            .then(res => {
              that.music.src = res.data.url;

              return qcloudPromisified({
                url: 'https://weshot.wowge.org/usr',
                data: {
                  id: that.userInfo.open_id
                }
              });
            })
            .then(res => {
              that.userInfo.nickName = res.data.nickName;
              that.userInfo.avatarUrl = res.data.avatarUrl;
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

              that.audioCtx = wx.createAudioContext("myAudio");
              that.audioCtx.play();
            })
            .then(() => {
                let flag = 0;
                let count = 0;
                for (let i = 0, len = that.photoNum; i < len; i++){
                    count++;
                    requestPromisified({
                        url: 'https://weshot.wowge.org/api/downloadUrl',
                        data: {
                            key: that.photos[i],
                        }
                    })
                        .then(res => {
                            that.photos[i] = res.data.downloadUrl;
                            that.setData({
                                photos: that.photos
                            });
                          flag++;
                          if (flag === count) {
                            wx.hideLoading();
                            that.setData({
                              loaded: true
                            })
                          }
                        })
                }
            })
            .catch(err => {
                //console.log(err);
                showFail('读取失败！', err);
            });
    });
};

Page({
    data: {
        loaded: false,
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
        style: ['幻灯片', '图文'],
        styleIndex: 0,
        styleChecked: [true, false],
        playing: true,
        me: {},
        interval: 6000,
        intervalText: '稍快'
    },
    photosSize: [],
    albumId: '',

    onLoad: function (option) {
        var that = this;
        that.option = option;
        loadPage(that, that.option);
    },

    /**
     * page onReady
     */
    onReady: function () {

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
        });
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
        if (e.detail.value <= 4000){
            this.setData({
                intervalText: '快'
            });
        }else if (e.detail.value <= 6000){
            this.setData({
                intervalText: '稍快'
            });
        }else if (e.detail.value <= 8000){
            this.setData({
                intervalText: '稍慢'
            });
        }else if (e.detail.value <= 10000){
            this.setData({
                intervalText: '慢'
            });
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
            title: this.data.albumName,
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
                            //console.log(err);
                        });
                }
            })
            .catch(err => {
                //console.log(err);
            })
            .finally(res => {
                wx.hideLoading();
            });
    }
});