const util = require('../utils/util');
var uploadFilePromisified = util.wxPromisify(wx.uploadFile);
var requestPromisified = util.wxPromisify(wx.request);

// created by gpake
(function() {

var config = {
    qiniuRegion: '',
    qiniuImageURLPrefix: '',
    qiniuUploadToken: '',
    qiniuUploadTokenURL: '',
    qiniuUploadTokenFunction: null
}

module.exports = {
    init: init,
    upload: upload,
}

// 在整个程序生命周期中，只需要 init 一次即可
// 如果需要变更参数，再调用 init 即可
function init(options) {
    config = {
        qiniuRegion: '',
        qiniuImageURLPrefix: '',
        qiniuUploadToken: '',
        qiniuUploadTokenURL: '',
        qiniuUploadTokenFunction: null
    };
    updateConfigWithOptions(options);
}

function updateConfigWithOptions(options) {
    if (options.region) {
        config.qiniuRegion = options.region;
    } else {
        console.error('qiniu uploader need your bucket region');
    }
    if (options.uptoken) {
        config.qiniuUploadToken = options.uptoken;
    } else if (options.uptokenURL) {
        config.qiniuUploadTokenURL = options.uptokenURL;
    } else if(options.uptokenFunc) {
        config.qiniuUploadTokenFunction = options.uptokenFunc;
    }
    if (options.domain) {
        config.qiniuImageURLPrefix = options.domain;
    }
}

function upload(obj) {
    if (null == obj.filePath) {
        console.error('qiniu uploader need filePath to upload');
        return;
    }
    if (obj.options) {
        init(obj.options);
    }
    if (config.qiniuUploadToken) {
        doUpload(obj.filePath, obj.success, obj.fail, obj.options);
    } else if (config.qiniuUploadTokenURL) {
        requestPromisified({
            url: config.qiniuUploadTokenURL
        })
            .then(res => {
                var token = res.data.uptoken;
                config.qiniuUploadToken = token;
                doUpload(obj.filePath, obj.success, obj.fail, obj.options);
            })
            .catch(err => {
                console.log(err);
            });
    } else if (config.qiniuUploadTokenFunction) {
        config.qiniuUploadToken = config.qiniuUploadTokenFunction();
    } else {
        console.error('qiniu uploader need one of [uptoken, uptokenURL, uptokenFunc]');
        return;
    }
}

function doUpload(filePath, success, fail, options) {
    var url = uploadURLFromRegionCode(config.qiniuRegion);
    var fileName = filePath.split('//')[1];
    if (options && options.key) {
        fileName = options.key;
    }
    var formData = {
        'token': config.qiniuUploadToken,
        'key': fileName
    };
    uploadFilePromisified({
                url: url,
                filePath: filePath,
                name: 'file',
                formData: formData,
            })
        .then(res => {
            var dataString = res.data
            var dataObject = JSON.parse(dataString);
            //do something
            var imageUrl = config.qiniuImageURLPrefix + '/' + dataObject.key;
            dataObject.imageURL = imageUrl;
            //console.log(dataObject);
            if (success) {
                success(dataObject);
            }
        })
        .catch(err => {
            console.log(err);
        });
}

function getQiniuToken(callback) {
  wx.request({
    url: config.qiniuUploadTokenURL,
    success: function (res) {
      var token = res.data.uptoken;
      config.qiniuUploadToken = token;
      if (callback) {
          callback();
      }
    },
    fail: function (error) {
      console.log(error);
    }
  })
}

function uploadURLFromRegionCode(code) {
    var uploadURL = null;
    switch(code) {
        case 'ECN': uploadURL = 'https://upload.qbox.me'; break;
        case 'NCN': uploadURL = 'https://upload-z1.qbox.me'; break;
        case 'SCN': uploadURL = 'https://upload-z2.qbox.me'; break;
        case 'NA': uploadURL = 'https://upload-na0.qbox.me'; break;
        default: console.error('please make the region is with one of [ECN, SCN, NCN, NA]');
    }
    return uploadURL;
}

})();