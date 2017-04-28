var mongoose = require('mongoose');

var Post = new mongoose.Schema({
    anum: Number,
    can_comment: Number,
    ditemid: Number,
    eventtime: String,
    event_timestamp: Number,
    itemid: Number,
    logtime: String,
    reply_count: Number,
    subject: String,
    url: String,
    cityName: String,
    countryName: String,
    props: {
        commentalter: Number,
        interface: String,
        langs: String,
        og_image: String,
        personifi_tags: String,
        picture_keyword: String,
        ratingbot_comment: String,
        revnum: Number,
        revtime: Number,
        spam_counter: Number,
        taglist: String,
        version: Number
    },
    location: {
        lat: Number,
        lng: Number
    }
});

mongoose.model('post', Post);