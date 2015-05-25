var cheerio = require('cheerio');
var request = require('request');
var urlm = require('url');
var _ = require('underscore');
var http = require('http');
var async = require('async');

function scrape(body, callback){
  var $ = cheerio.load(body);
  var res = {};
  res.coupons = [];
  $('.coupon-list.clearfix > li').each(function(){
    var $coupon = $(this);
    var coupon = {};
    coupon.url = $coupon.find('>a').attr('href');
    coupon.couponPrice = parseFloat($coupon.find('.coupon-price > em').text().trim().replace(/^\$/, ''));
    coupon.couponPriceText = $coupon.find('.coupon-price').text().trim();
    coupon.couponOrderPrice = parseFloat($coupon.find('.coupon-order-price > em').text().trim().replace(/^\$/, ''));
    coupon.couponOrderPriceText = $coupon.find('.coupon-order-price').text().trim();
    res.coupons.push(coupon);
  });

  var $form = $('form[name="paginationForm"]');
  res.url = $form.attr('action');
  res._csrf_token_ = $form.find('input[name="_csrf_token_"]').eq(0).val();
  res._csrf_token_1 = $form.find('input[name="_csrf_token_"]').eq(1).val();
  res.pages = $('.page-number').text().trim();
  var match = res.pages.match(/ (\d+)$/);
  if (match){
    res.pages = parseInt(match[1], 10);
  }
  callback(res);
}

function printCoupons(coupons){
    console.log('-------------------------------');
    _.each(coupons, function(coupon){
        if (true){
            console.log(coupon);
        }
    });
}

var url = 'http://coupon.aliexpress.com/proengine/sellerCouponList.htm';
var j = request.jar();
request({url: url, jar: j}, function(err, response, body) {
  if(err) { console.log(err); return; }
  scrape(body, function(json){
    printCoupons(json.coupons);
    var post_options = {
        hostname: 'coupon.aliexpress.com',
        port    : '80',
        path    : json.url,
        method  : 'POST',
        jar: j,
        gzip: true,
        headers : {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip,deflate',
            'Accept-Language': 'en-US,en;q=0.8',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/38.0.2125.111 Chrome/38.0.2125.111 Safari/537.36'
        }
    };     
    var page = 2;
    var pages = json.pages;
    var token = json._csrf_token_;
    var token1 = json._csrf_token_1;
    async.whilst(
        function () { return page <= pages; },
        function (callback) {
            var data = {
                'page': String(page),
                '_csrf_token_': token
            };
            body = body.replace('_csrf_token_1', '_csrf_token_');
            console.log('Page:', page, ':', pages);
            post_options.qs = data;
            post_options.url = url;
            request.post(post_options, function(err, res, body) {
                if(err) {
                    return console.error(err);
                }
                console.log("page: " + page);
                scrape(body, function(js){
                    token = js._csrf_token_;
                    token1 = js._csrf_token_1;
                    printCoupons(js.coupons);
                });                    
                page++;
                setTimeout(callback, 1000);
            });
        },
        function (err) {
            console.log('all');
        }
    );   
  });
});

