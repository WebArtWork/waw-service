module.exports = function(waw) {
	const Schema = waw.mongoose.Schema({
		top: {
			type: Boolean,
			default: false
		},
		enabled: {
			type: Boolean,
			default: false
		},
		thumb: String,
		thumbs: [String],
		name: String,
		url: { type: String, sparse: true, trim: true, unique: true },
		short: String,
		description: String,
		domain: String,
		isTemplate: Boolean,
 		template: {
			type: waw.mongoose.Schema.Types.ObjectId,
			ref: "Product",
		},
		data: {},
		tag: {
			type: waw.mongoose.Schema.Types.ObjectId,
			ref: 'Tag'
		},
		tags: [{
			type: waw.mongoose.Schema.Types.ObjectId,
			ref: 'Tag'
		}],
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
		this.tags = obj.tags;
		this.top = obj.top;
		this.enabled = obj.enabled;
		this.domain = obj.domain;
		this.thumb = obj.thumb;
		this.url = obj.url;
		this.thumbs = obj.thumbs;
		this.name = obj.name;
		this.description = obj.description;
		this.short = obj.short;
		this.data = obj.data;
		this.isTemplate = obj.isTemplate;
		this.template = obj.template;
	}

	return waw.Service = waw.mongoose.model('Service', Schema);
}
