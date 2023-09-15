const path = require('path');
const template = path.join(process.cwd(), 'template');

module.exports = async waw => {
	waw.services = async (query, limit) => {
		if (limit) {
			return await waw.Service.find(query).limit(limit);
		} else {
			return await waw.Service.find(query);
		}
	}

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
			}
		],
		fetch: {
			ensure: waw.next,
			query: req => {
				return {
					_id: req.body._id
				}
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
						...seo,
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

			const service = await waw.Service.findOne({
				_id: req.params._id
			});

			res.send(
				waw.render(
					path.join(template, 'dist', 'service.html'),
					{
						...seo,
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
	await waw.wait(100);
        if (waw.store_landing) {
        waw.store_landing.services = async (query)=>{
         return await waw.services(query, 4);
    }
}
};
