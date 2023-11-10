const path = require('path');
const template = path.join(process.cwd(), 'template');

module.exports = async waw => {
	waw.services = async (query = {}, limit, count = false) => {
		let exe = count ? waw.Service.countDocuments(query) : waw.Service.find(query);
		if (limit) {
			exe = exe.limit(limit);
		}
		return await exe;
	};

	waw.service = async (query) => {
		return await waw.Service.findOne(query);
	}

	waw.crud('service', {
		get: [
			{
				ensure: waw.next
			},
			{
				name: 'public',
				ensure: waw.next,
				query: ()=>{
					return {};
				}
			},
			{
				name: 'tilities',
				ensure: waw.next,
				query: () => {
					return {
						isTemplate: true
					};
				}
			},
			{
				name: 'links',
				ensure: async (req, res, next)=>{
					if (req.user) {
						req.utilities_ids = (await waw.Service.find({
							moderators: req.user._id,
							isTemplate: true
						}).select('_id')).map(p => p.id);

						next();
					} else {
						res.json([]);
					}
				},
				query: (req) => {
					return {
						template: {
							$in: req.utilities_ids
						}
					};
				},
				{
				name: 'admin',
				ensure: waw.role('admin'),
				query: () => {
					return {};
				}
			},
		],
		update: {
			name: 'admin',
			ensure: waw.role('admin'),
			query: (req) => {
				return { _id: req.body._id };
			}
		},
		delete: {
			name: 'admin',
			ensure: waw.role('admin'),
			query: (req) => {
				return { _id: req.body._id };
			}
		},
		fetch: {
			ensure: waw.next,
			query: req => {
				return {
					_id: req.body._id
				}
			}
		},
		create: {
			ensure: async (req, res, next) => {
				if (req.body.name) {
					req.body.url = req.body.name
						.toLowerCase()
						.replace(/[^a-z0-9]/g, "");
				}
				if(req.body.url) {
				while (await waw.Service.count({ url: req.body.url })) {
					const url = req.body.url.split("_");
					req.body.url =
						url[0] +
						"_" +
						(url.length > 1 ? Number(url[1]) + 1 : 1);
				}
			}
				next();
			}
		}
	})
	const seo = {
		title: waw.config.name,
		description: waw.config.description,
		image: 'https://body.webart.work/template/img/logo.png'
	};

	waw.build(template, 'services');
	waw.build(template, 'service');
	waw.serve_services = {};
	waw.serve_service = {};
	const services = async (req, res) => {
		if (typeof waw.serve_services[req.get("host")] === "function") {
			waw.serve_services[req.get("host")](req, res);
		} else {
			const services = await waw.services(
				req.params.tag_id ?
					{ tag: req.params.tag_id } :
					{}
			);
			res.send(
				waw.render(
					path.join(template, 'dist', 'services.html'),
					{
						...waw.config,
						groups: waw.tag_groups('service'),
						title: waw.config.serviceTitle|| waw.config.title,
                                                description: waw.config.serviceDescription || waw.config.description,
                                                image: waw.config.serviceImage|| waw.config.image,
						services,
						categories: await waw.tag_groups('service')
					},
					waw.translate(req)
				)
			)
		}
	}
	waw.app.get('/services', services);
	waw.app.get('/services/:tag_id', services);
	waw.app.get('/service/:_id', async (req, res) => {
		if (typeof waw.serve_service[req.get("host")] === "function") {
			waw.serve_service[req.get("host")](req, res);
		} else {

			const service = await waw.Service.findOne(
			waw.mongoose.Types.ObjectId.isValid(req.params._id)
				? { _id: req.params._id }
				: { url: req.params._id }
			);

			res.send(
				waw.render(
					path.join(template, 'dist', 'service.html'),
					{
						...waw.config,
						...{
							service,
							categories: await waw.tag_groups('service')
						}
					},
					waw.translate(req)
				)
			)
		}
	});

	const save_file = (doc) => {
		if (doc.thumb) {
			waw.save_file(doc.thumb);
		}

		if (doc.thumbs) {
			for (const thumb of doc.thumbs) {
				waw.save_file(thumb);
			}
		}
	}

	waw.on('service_create', save_file);
	waw.on('service_update', save_file);
	waw.on('service_delete', (doc) => {
		if (doc.thumb) {
			waw.delete_file(doc.thumb);
		}

		if (doc.thumbs) {
			for (const thumb of doc.thumbs) {
				waw.delete_file(thumb);
			}
		}
	});
	await waw.wait(2000);
        if (waw.store_landing) {
        waw.store_landing.services = async (query)=>{
         return await waw.services(query, 4);
    }
}
};
