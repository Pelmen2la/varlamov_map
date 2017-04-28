var liveJournal = require('livejournal'),
    mongoose = require('mongoose'),
    request = require('request'),
    geocoder = require('geocoder'),
    fs = require('fs'),
    path = require('path'),
    dateFormat = require('dateformat'),
    fastCsv = require('fast-csv'),
    webshot = require('webshot'),
    jimp = require('jimp'),
    Post = mongoose.model('post'),
    Country = mongoose.model('country'),
    City = mongoose.model('city');

function copyPostsFromLivejournal(limit, beforedate) {
    getPostsFromLivejournal(beforedate, function(posts) {
        posts.forEach(function(post) {
            Post.findOne({itemid: post.itemid}, function(err, data) {
                if(data) {
                    return;
                };
                var tags = post.props.taglist ? post.props.taglist.toLocaleLowerCase().split(',') : [],
                    findCondition = {nameLower: {$in: tags}};
                if(tags.length) {
                    Country.findOne(findCondition).exec(function(err, country) {
                        City.findOne(findCondition, function(err, city) {
                            if(city || country) {
                                post.cityName = city ? city.get('name') : '';
                                post.countryName = country ? country.get('name') : '';
                                if(city && !country) {
                                    Country.findOne({id: city.get('countryId')}, function(err, data) {
                                        post.countryName = data.get('name');
                                        (new Post(post)).save();
                                    });
                                } else {
                                    (new Post(post)).save();
                                }
                            }
                        });
                    });
                }
            });
        });
        if(posts.length) {
            Post.count({}, function(err, count) {
                if(limit > count) {
                    copyPostsFromLivejournal(limit, posts[posts.length - 1].eventtime);
                }
            });
        }
    });
};

function refreshPostProps(beforedate) {
    getPostsFromLivejournal(beforedate, function(posts) {
        posts.forEach(function(p) {
            Post.findOne({ itemid: p.itemid }, function(err, post) {
                if(post) {
                    ['anum', 'can_comment', 'ditemid', 'eventtime', 'event_timestamp', 'itemid', 'logtime',
                            'reply_count', 'subject', 'url', 'cityName', 'countryName', 'props'].forEach(function(propName) {
                        post.set(propName, p[propName]);
                    });
                    post.save();
                }
            });
        });
        if(posts.length) {
            refreshPostProps(posts[posts.length - 1].eventtime);
        } else {
            return;
        }
    });
};

function getPostsFromLivejournal(beforedate, callback) {
    beforedate = beforedate || dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss');
    liveJournal.xmlrpc.getevents({
        journal: 'zyalt',
        auth_method: 'noauth',
        selecttype: 'lastn',
        howmany: 50,
        beforedate: beforedate
    }, function(err, val) {
        callback(!err && val ? val['events'] : []);
    });
};

function setPostsLocation(callback) {
    var locationCache = {};
    Post.find({}, function(err, data) {
        data.forEach(function(post) {
            var city = post.get('cityName'),
                address = post.get('countryName') + (city ? (' ' + city) : ''),
                setPostLocation = function(post, location) {
                    post.set('location', location);
                    post.save();
                };
            if(!post.get('location') || !post.get('location').lat || !post.get('location').lng) {
                if(locationCache[address]) {
                    setPostLocation(post, locationCache[address]);
                } else {
                    geocoder.geocode(address, function(err, data) {
                        var location = data && !data.error_message && data.results.length && data.results[0].geometry.location;
                        if(location) {
                            setPostLocation(post, location);
                            locationCache[address] = location;
                        }
                    });
                }
            }
        });
        callback();
    })
};

function generateCountriesAndCitiesFromCsv(callback) {
    var countriesCash = {};
    Country.remove({}, function() {
        City.remove({}, function() {
            fs.createReadStream(global.appRoot + '/server/data/countries.csv')
                .pipe(fastCsv())
                .on("data", function(data) {
                    var countryId = parseInt(data[0]),
                        countryName = data[2].replace(/"/g, '');
                    if(!isNaN(countryId)) {
                        (new Country({
                            id: countryId,
                            name: countryName,
                            nameLower: countryName.toLowerCase()
                        })).save();
                        countriesCash[countryId] = countryName;
                    }
                })
                .on("end", function() {
                    fs.createReadStream(global.appRoot + '/server/data/cities.csv')
                        .pipe(fastCsv())
                        .on("data", function(data) {
                            var countryId = parseInt(data[1]),
                                countryName = countriesCash[countryId],
                                cityId = parseInt(data[0]),
                                cityName = data[3].replace(/"/g, '');
                            if(!isNaN(cityId)) {
                                (new City({
                                    countryId: countryId,
                                    countryName: countryName,
                                    countryNameLower: countryName.toLocaleLowerCase(),
                                    id: cityId,
                                    name: cityName,
                                    nameLower: cityName.toLowerCase()
                                })).save();
                            }
                            ;
                        })
                        .on("end", function() {
                            callback();
                        });
                });
        });
    });
};

function getAddressLocation(address, callback) {
    request({
            method: 'GET',
            uri: 'http://maps.google.com/maps/api/geocode/json?address=' + address
        },
        function(err, response, body) {
            var data = JSON.parse(body).results[0];
            callback(!err && data ? data.geometry.location : {});
        }
    );
};

function createPostsPreviewImages(offset) {
    Post.find({}, null, {limit: 10, skip: offset}, function(err, posts) {
        posts.forEach(createPostPreviewImage);
    });
};

function createPostPreviewImage(post) {
    var dirPath = path.join(global.appRoot, '/static/images/posts_preview/'),
        imageName = post.get('itemid') + '.jpg',
        imagePath = path.join(dirPath, imageName),
        smallImagePath = path.join(dirPath, 'small', imageName);

    if(!fs.existsSync(smallImagePath)) {
        webshot(post.get('url'), imagePath, {streamType: 'jpg', shotOffset: {top: 450}}, function() {
            jimp.read(imagePath, function(err, image) {
                image.resize(256, 192).quality(60).write(smallImagePath);
            });
        });
    }
};


module.exports = {
    copyPostsFromLivejournal: copyPostsFromLivejournal,
    refreshPostProps: refreshPostProps,
    setPostsLocation: setPostsLocation,
    createPostsPreviewImages: createPostsPreviewImages,
    createPostPreviewImage: createPostPreviewImage,
    generateCountriesAndCitiesFromCsv: generateCountriesAndCitiesFromCsv
};