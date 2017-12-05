var util = require('../../utils/util');

var requestPromisified = util.wxPromisify(wx.request);

var showFail = (title, content) => {
    wx.showModal({
        title,
        content: JSON.stringify(content),
        showCancel: false
    });
};

Page({
    data: {
        inputVal: '',
        inputShowed: false,
        radioChecked: false,
        musicArray: [],
        style: [],
        styleId:[],
        styleIndex: 0,
        styleChecked: [],
    },
    resultInfo: [],
    musicChecked: {},

    onLoad: function () {
        var that = this, style = [], styleId = [], styleChecked = [];
        requestPromisified({
            url: 'https://weshot.wowge.org/playlist?catagory=playlistRecommend'
        })
            .then(res => {
                var lists = res.data[0].lists;
                style[0] = '请选择';
                styleId[0] = '0';
                styleChecked[0] = true;
                for (let i = 0, len = lists.length; i < len; i++){
                    style[i+1] = lists[i].name;
                    styleId[i+1] = lists[i].id;
                    styleChecked[i+1] = false;
                }
                that.setData({
                    style: style,
                    styleId: styleId,
                    styleChecked: styleChecked
                });
            })
            .catch(err => {
                //console.log(err);
            });
    },
    /**
     * Search music, make a request to music-api and get response
     */
    searchMusic: function (e) {
        var that = this;
        that.setData({
            radioChecked: false,
            musicArray: [],
            resultInfo: [],
            styleIndex: 0
        });
        requestPromisified({
            url: 'https://weshot.wowge.org/api/search/song/qq',
            data: {
                key: that.data.inputVal,
                limit: 30,
            }
        })
            .then(res => {
                that.resultInfo = res.data.songList.map(function (item) {
                    let authors = item
                        .artists
                        .map(function (x) {
                            return x.name;
                        })
                        .join();
                    return {
                        poster: item.album.coverSmall,
                        name: item.name,
                        authors: authors,
                        id: item.id.toString()
                    };
                });
            })
            .then(() => {
                for (let i = 0, len = that.resultInfo.length; i < len; i++){
                    requestPromisified({
                        url: 'https://weshot.wowge.org/api/get/song/qq',
                        data: {
                            id: that.resultInfo[i].id
                        }
                    })
                        .then(res => {
                            that.resultInfo[i].src = res.data.url;
                            that.setData({
                                musicArray: that.resultInfo
                            });
                    });
                }
            })
            .catch(err => {
                //console.log(err);
            });
    },

    /**
     * radioChange event-handler for music list radio-group
     */
    radioChange: function (e) {
        if (this.audioCtx){
            this.audioCtx.pause();
        }
        var musicArray = this.data.musicArray;
        for (let i = 0, len = musicArray.length; i < len; i++){
            musicArray[i].checked = musicArray[i].id == e.detail.value;
        }
        this.setData({
            musicArray: musicArray,
            radioChecked: true
        });
        for (let i = 0, len = musicArray.length; i < len; i++){
            if (musicArray[i].checked){
                this.musicChecked = musicArray[i];
                this.audioCtx = wx.createAudioContext(this.musicChecked.id.toString());
                this.audioCtx.play();
            }
        }
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
            inputVal: ""
        });
    },
    inputTyping: function (e) {
        this.setData({
            inputVal: e.detail.value
        });
    },

    navigateBackConfirm: function () {
        wx.setStorageSync('music', this.musicChecked);
        wx.navigateBack();
    },

    /**
     * Choose playlists
     */
    bindPickerChange: function (e) {
        wx.showLoading({
            title: '正在读取，稍等',
        });
        var that = this;
        var styleIndex = e.detail.value;
        var styleChecked = [];
        that.setData({
            styleIndex: styleIndex,
        });
        for (let i = 0, len = that.data.style.length; i < len; i++){
            if (that.data.styleIndex == i){
                styleChecked[i] = true;
            }else {
                styleChecked[i] = false;
            }
        }
        that.setData({
            styleChecked: styleChecked,
        });

        that.setData({
            radioChecked: false,
            musicArray: [],
            resultInfo: [],
        });
        if (that.data.styleIndex == 0){
            wx.hideLoading();
        }else {
            requestPromisified({
                url: 'https://weshot.wowge.org/api/get/album/qq',
                data: {
                    id: that.data.styleId[that.data.styleIndex]
                }
            })
                .then(res => {
                    if (!res.data.songList){
                        wx.hideLoading();
                        showFail('读取失败！', '请重试');
                        throw {msg: 'no list found'};
                    }
                    that.resultInfo = res.data.songList.map(function (item) {
                        let authors = item
                            .artists
                            .map(function (x) {
                                return x.name;
                            })
                            .join();
                        return {
                            poster: item.album.coverSmall,
                            name: item.name,
                            authors: authors,
                            id: item.id.toString()
                        };
                    });
                })
                .then(() => {
                    for (let i = 0, len = that.resultInfo.length; i < len; i++){
                        requestPromisified({
                            url: 'https://weshot.wowge.org/api/get/song/qq',
                            data: {
                                id: that.resultInfo[i].id
                            }
                        })
                            .then(res => {
                                that.resultInfo[i].src = res.data.url;
                                that.setData({
                                    musicArray: that.resultInfo
                                });
                            })
                            .catch(err => {
                                //console.log(err);
                            });
                    }
                })
                .catch(err => {
                    //console.log(err);
                    showFail('读取失败！', '请重试');
                })
                .finally(res => {
                    wx.hideLoading();
                });
        }
    },

});