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
            Post.find({'location.lat': {$exists: true}}, function(err, data) {
                data = data.map(function(post) {
                    post = post.toObject();
                    return {
                        id: post.itemid,
                        location: post.location,
                        url: post.url,
                        subject: post.subject.replace(/"/g, ''),
                        cityName: post.cityName,
                        countryName: post.countryName,
                        imageUrl: post.props.og_image,
                        tags: post.props.taglist,
                        dateString: post.eventtime.split(' ')[0]
                    }
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

    app.get('/copy_posts_from_livejournal/:limit', function(req, res) {
        dataHelper.copyPostsFromLivejournal(parseInt(req.params.limit));
        res.send('processing');
    });

    app.get('/refresh_posts_properties/', function(req, res) {
        dataHelper.refreshPostProps();
        res.send('processing');
    });

        app.get('/set_posts_location/', function(req, res) {
        dataHelper.setPostsLocation(function(err, data) {
            res.send('processing');
        });
    });

    app.get('/create_posts_preview_images/:offset', function(req, res) {
        dataHelper.createPostsPreviewImages(parseInt(req.params.offset));
        res.send('processing');
    });

    app.get('/static/images/posts_preview/small/:id.jpg', function(req, res) {
        var getImagePath = function(name) {
                return '/static/images/posts_preview/small/' + name + '.jpg';
            },
            id = req.params.id,
            imgPath = getImagePath(id),
            isImageExists = fs.existsSync(imgPath);
        res.writeHead(200, {'Content-Type': 'image/jpg'});
        imgPath = isImageExists ? imgPath : getImagePath('default');
        res.end(fs.readFileSync(path.join(global.appRoot, imgPath)), 'binary');
        Post.findOne({ itemid: id }, function(err, post) {
            !err && dataHelper.createPostPreviewImage(post);
        });
    });

    app.get('/remove_posts/', function(req, res) {
        Post.remove({}, function() {
            res.send('done');
        });
    });
};