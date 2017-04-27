var mongoose = require('mongoose'),
    fs = require('fs'),
    path = require('path'),
    Country = mongoose.model('country'),
    City = mongoose.model('city'),
    dataHelper = require('../server/dataHelper'),
    dateFormat = require('dateformat'),
    request = require('request'),
    geocoder = require('geocoder'),
    Post = mongoose.model('post');


module.exports = function(app) {
    app.get('/', function(req, res) {
        fs.readFile(path.join(global.appRoot, '/static/index.html'), 'utf8', function(err, indexPageHtml) {
            Post.find({ 'location.lat': { $exists: true } }, ['url', 'location', 'eventtime', 'subject', 'cityName', 'countryName', 'props'], {}, function(err, data) {
                data = data.map(function(post) {
                    post.set('subject', post.get('subject').replace(/"/g, ''));
                    return post.toObject();
                });
                indexPageHtml = indexPageHtml.replace('{{postsData}}', JSON.stringify(data));
                res.send(indexPageHtml);
            });
        });
    });

    app.get('/get_posts/', function(req, res) {
        Post.find({}, function(err, data) {
            res.json(data);
        });
    });

    app.get('/generate_countries_and_cities/', function(req, res) {
        dataHelper.generateCountriesAndCitiesFromCsv(function(err, data) {
            res.send('done');
        });
    });

    app.get('/get_countries/', function(req, res) {
        Country.find({}, function(err, data) {
            res.json(data);
        });
    });

    app.get('/get_cities/', function(req, res) {
        City.find({}, function(err, data) {
            res.json(data);
        });
    });

    app.get('/generate_posts_from_livejournal/', function(req, res) {
        var now = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss');
        dataHelper.getPostsFromLivejournal(now, function(err, data) {
            res.json(data);
        });
    });

    app.get('/set_posts_location/', function(req, res) {
        dataHelper.setPostsLocation(function(err, data) {
            res.send('done');
        });
    });

    app.get('/get_posts/', function(req, res) {
        Post.find({}, function(err, data) {
            res.json(data);
        });
    });

    app.get('/remove_posts/', function(req, res) {
        Post.remove({}, function() {
            res.send('done');
        });
    });
};