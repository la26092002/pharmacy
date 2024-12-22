const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        require: true
    },
    dataPdf: {
        type: String,
        require: true
    },
    actor: {
        type: Schema.Types.ObjectId,
        ref: 'actor'
    },
    date: {
        type: Date,
        default: Date.now
    },
});

module.exports = Product = mongoose.model('offre', ProductSchema);