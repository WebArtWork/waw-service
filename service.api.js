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
				query: () => {
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
				ensure: async (req, res, next) => {
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
				}
			},
			{
				name: 'admin',
				ensure: waw.role('admin'),
				query: () => {
					return {};
				}
			},
			{
				ensure: waw.next,
				query: req => {
					return { domain: req.get('host') };
				}
			}
		],
		update: {
			query: (req) => {
				if (req.user.is.admin) {
					return {
						_id: req.body._id,
					};
				} else {
					return {
						moderators: req.user._id,
						_id: req.body._id,
					};
				}
			}
		},
		delete: {
			query: (req) => {
				if (req.user.is.admin) {
					return {
						_id: req.body._id,
					};
				} else {
					return {
						moderators: req.user._id,
						_id: req.body._id,
					};
				}
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
				if (!req.body.url) {
					req.body.url = null; 
				} else {
					while (await waw.Service.count({ url: req.body.url })) {
						const url = req.body.url.split("_");
						req.body.url =
							url[0] +
							"_" +
							(url.length > 1 ? Number(url[1]) + 1 : 1);
					}
				}
				next();
			},
			ensureDomain: async (req, res, next) => {
				req.body.domain = req.get('host');
				next();
			}
		}
	})

	const docs = await waw.Service.find({});
	for (const doc of docs) {
		if (!doc.domain) {
			doc.domain = waw.config.land;
			await doc.save();
		}
	}


	waw.serveServices = async (req, res) => {
		const query = {};
		if (req.params.tag_id) {
			query.tag = req.params.tag_id;
		}
		if (req.get('host') !== waw.config.land) {
			query.domain = req.get('host');
		}
		const services = await waw.Service.find(query).limit(10);

		res.send(
			waw.render(
				path.join(template, 'dist', 'services.html'),
				{
					...waw.config,
					groups: waw.tag_groups('service'),
					title: waw.config.serviceTitle || waw.config.title,
					description: waw.config.serviceDescription || waw.config.description,
					image: waw.config.serviceImage || waw.config.image,
					services,
					categories: await waw.tag_groups('service')
				},
				waw.translate(req)
			)
		)
	}

	waw.api({
		domain: waw.config.land,
		template: {
			path: template,
			prefix: "/template",
			pages: "service services",
		},
		page: {
			"/services": waw.serveServices,
			"/services/:tag_id": waw.serveServices,
			"/service/:_id": waw.serveService
		}
	});

	waw.serveService = async (req, res) => {
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

	waw.operatorServices = async (operator, fillJson) => {
		fillJson.services = await waw.services({
			domain: operator.domain
		});

		fillJson.servicesByTag = [];
		for (const service of fillJson.services) {
			if (!service.tag) continue;
			const tagObj = fillJson.servicesByTag.find(c => c.id.toString() === service.tag.toString());
			if (tagObj) {
				tagObj.services.push(service);
			} else {
				const tag = waw.getTag(service.tag);

				fillJson.servicesByTag.push({
					id: service.tag,
					category: tag.category,
					name: tag.name,
					description: tag.description,
					services: [service]
				})
			}
		}

		fillJson.servicesByCategory = [];
		for (const byTag of fillJson.servicesByTag) {
			const categoryObj = fillJson.servicesByCategory.find(c => c.id.toString() === byTag.category.toString());
			if (categoryObj) {
				categoryObj.tags.push(byTag);

				for (const service of byTag.services) {
					if (!categoryObj.services.find(s => s.id === service.id)) {
						categoryObj.services.push(service)
					}
				}
			} else {
				const category = waw.getCategory(byTag.category)
				if (category) {
					fillJson.servicesByCategory.push({
						id: byTag.category,
						name: category.name,
						description: category.description,
						services: byTag.services.slice(),
						tags: [byTag]
					})
				}
			}
		}
	}

	waw.operatorService = async (operator, fillJson, req) => {
		fillJson.service = await waw.service({
			domain: operator.domain,
			_id: req.params._id
		});

		fillJson.footer.service = fillJson.service;
	}

	waw.operatorTopServices = async (operator, fillJson) => {
		fillJson.topServices = await waw.services({
			domain: operator.domain
		}, 4);

		fillJson.footer.topServices = fillJson.topServices;
	}


	waw.storeServices = async (store, fillJson) => {
		fillJson.services = await waw.services({
			author: store.author
		});

		fillJson.servicesByTag = [];
		for (const service of fillJson.services) {
			if (!service.tag) continue;
			const tagObj = fillJson.servicesByTag.find(c => c.id.toString() === service.tag.toString());
			if (tagObj) {
				tagObj.services.push(service);
			} else {
				const tag = waw.getTag(service.tag);
				if (tag) {
					fillJson.servicesByTag.push({
						id: service.tag,
						category: tag.category,
						name: tag.name,
						description: tag.description,
						services: [service]
					})
				}
			}
		}

		fillJson.servicesByCategory = [];
		for (const byTag of fillJson.servicesByTag) {
			const categoryObj = fillJson.servicesByCategory.find(c => c.id.toString() === byTag.category.toString());
			if (categoryObj) {
				categoryObj.tags.push(byTag);

				for (const service of byTag.services) {
					if (!categoryObj.services.find(s => s.id === service.id)) {
						categoryObj.services.push(service)
					}
				}
			} else {
				const category = waw.getCategory(byTag.category);
				if (category) {
					fillJson.servicesByCategory.push({
						id: byTag.category,
						name: category.name,
						description: category.description,
						services: byTag.services.slice(),
						tags: [byTag]
					})
				}
			}
		}
	}

	waw.storeService = async (store, fillJson, req) => {
		fillJson.service = await waw.service({
			author: store.author,
			_id: req.params._id
		});

		fillJson.footer.service = fillJson.service;
	}

	waw.storeTopServices = async (store, fillJson) => {
		fillJson.topServices = await waw.services({
			author: store.author,
		}, 4);

		fillJson.footer.topServices = fillJson.topServices;
	}
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
		waw.store_landing.services = async (query) => {
			return await waw.services(query, 4);
		}
	}
}
