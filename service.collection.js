module.exports = function(waw) {
	const Schema = waw.mongoose.Schema({
		thumb: String,
		thumbs: [String],
		name: String,
		url: { type: String, sparse: true, trim: true, unique: true },
		short: String,
		description: String,
		data: {},
		tag: {
			type: waw.mongoose.Schema.Types.ObjectId,
			ref: 'Tag'
		},
		author: {
			type: waw.mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		moderators: [
			{
				type: waw.mongoose.Schema.Types.ObjectId,
				sparse: true,
				ref: 'User'
			}
		]
	});

	Schema.methods.create = function (obj, user, waw) {
		this.author = user._id;

		this.moderators = [user._id];

		this.tag = obj.tag;

		this.thumb = obj.thumb;

		this.url = obj.url;

		this.thumbs = obj.thumbs;

		this.name = obj.name;

		this.description = obj.description;

		this.short = obj.short;

		this.data = obj.data;
	}

	return waw.Service = waw.mongoose.model('Service', Schema);
}
