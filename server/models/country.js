var mongoose = require('mongoose');

var Country = new mongoose.Schema({
    id: Number,
    name: String,
    nameLower: String
});

mongoose.model('country', Country);