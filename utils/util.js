var Promise = require('../libs/es6-promise.min');
Promise.prototype.finally = function (callback) {
    let p = this.constructor;
    return this.then(
        res => p.resolve(callback()).then(() => res),
        err => p.resolve(callback()).then(() => {throw err})
    );
};

/**
 * Format Date obj to string 'yyyy-mm-dd'
 * @param date
 * @returns {string}
 */
function formatTime(date) {
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();

  var hour = date.getHours();
  var minute = date.getMinutes();
  var second = date.getSeconds();

  //return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':');
  return [year, month, day].map(formatNumber).join('-');
}

function formatNumber(n) {
  n = n.toString();
  return n[1] ? n : '0' + n;
}

/**
 * Promisify the wx.fn()
 * @param fn
 * @returns {Function}
 */
function wxPromisify(fn) {
    return function (obj = {}) {
        return new Promise((resolve, reject) => {
          obj.success = function (res) {
              resolve(res);
          };
          obj.fail = function (err) {
              reject(err);
          };
          fn(obj);
        });
    };
}

module.exports = {
  formatTime: formatTime,
    wxPromisify: wxPromisify
};
