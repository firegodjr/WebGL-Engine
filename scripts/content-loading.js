const stageStore = [];
const actorStore = { default: [] };

/**
 * Retrives a file from the web server. Rejects on non-Response.ok, and returns a promise to the body.
 * @param {string} filepath
 * @returns {Promise<string>}
 */
async function safeFetch(filepath)
{
	return fetch(filepath)
		.then((resp) => {
			if (!resp.ok)
			{
				throw new Error(`Unsuccessful fetch of resource '${filepath}'`);
			}
			return resp.text();
		});
}
/**
 * Builds an actor object from actor parameters in a stage manifest
 * @param {number} index
 */
function getConfiguredActor(actorParams)
{
	const template = actorStore[actorParams.name];
	const actor = new StageActor(template.name, template.modelName);
	actor.transform.translation = vec3.fromValues(...actorParams.position);
	[actor.transform.rotationX,	actor.transform.rotationY, actor.transform.rotationZ] = actorParams.rotation;
	actor.transform.scale = vec3.fromValues(...actorParams.scale);

	return actor;
}

async function promiseImage(image, src)
{
	return new Promise((resolve, reject) => {
		image.onload = resolve;
		image.src = `textures/${src}`;
	});
}

function sortImageSizes(a, b)
{
	if (a.naturalHeight > b.naturalHeight)
	{
		return -1;
	}

	if (a.naturalHeight < b.naturalHeight)
	{
		return 1;
	}

	return 0;
}

/**
 * Returns the RGBA values of the pixel
 * @param {ImageData} imageData
 * @param {number} x
 * @param {number} y
 * @returns {number[]}
 */
function getImagePixelRGBA(imageData, x, y)
{
	const offset = x + y * imageData.width;
	return imageData.data.slice(offset, 4);
}

/**
 * Generates a texture atlas from the given image urls
 * @param {WebGLRenderingContext} gl
 * @param {string[]} urls
 * @returns {ImageBitmap}
 */
async function loadTextureAtlas(gl, urls)
{
	function tileImageSquare(canvas, ctx, offsets, xOffset, yOffset, currSize, images, index)
	{
		let xProgress = 0;
		let yProgress = 0;

		for (let j = 0; j < 4; ++j, ++index.ref)
		{
			if (index.ref < images.length)
			{
				if (images[index.ref].naturalWidth === currSize)
				{
					ctx.drawImage(images[index.ref], xOffset + xProgress, yOffset + yProgress);
					offsets.push([
						xOffset / canvas.width,
						yOffset / canvas.height,
						(xOffset + currSize) / canvas.width,
						(yOffset + currSize) / canvas.height
					]);

					xProgress += currSize;

					if (xProgress >= currSize * 2)
					{
						xProgress = 0;
						yProgress += currSize;
					}
				}
				else // if images[i].naturalWidth != currSize
				{
					tileImageSquare(canvas, ctx, offsets, xOffset + xProgress, yOffset + yProgress, currSize / 2, images, index);
				}
			}
			else return; // if i >= images.length
		}
	}

	const loadedImgs = [];
	const offsets = [];
	let currentPower = 9;
	/** @type {ImageBitmap} */
	const canvas = document.createElement('canvas');
	// TODO canvas.style.display = "none";
	document.body.appendChild(canvas);

	await Promise.all(urls.map((url, i) => {
		const image = new Image();
		loadedImgs.push(image);
		return promiseImage(image, url);
	}));

	loadedImgs.sort(sortImageSizes);

	let pixelSum = 0;
	loadedImgs.forEach((img) => { pixelSum += img.naturalWidth * img.naturalHeight; });

	// Find the optimal power of 2 to use
	while (2 ** currentPower < Math.sqrt(pixelSum))
	{
		++currentPower;
	}

	canvas.width = 2 ** currentPower;
	canvas.height = canvas.width;
	const ctx = canvas.getContext("2d");

	tileImageSquare(canvas, ctx, offsets, 0, 0, loadedImgs[0].naturalWidth, loadedImgs, { ref: 0 });

	return {
		atlas: await createImageBitmap(ctx.getImageData(0, 0, canvas.width, canvas.height)),
		offsets
	};
}


/**
 * Builds a stage object from a loaded stage manifest
 * @param {number} index
 */
async function buildStage(index)
{
	const manifest = stageStore[index];
	const stage = new Stage(manifest.name);

	// Load all stage prerequisites
	Promise.all(manifest.preload.map(url => safeFetch(`content/${url}`)
		.then((actor) => {
			const actorManifest = JSON.parse(actor);
			actorStore[actorManifest.name] = actorManifest;
		})))
		.then(() => {
			// Load all setpieces
			manifest.setpieces.forEach((actorParams) => {
				stage.setpieces.push(getConfiguredActor(actorParams));
			});

			// Load all actors
			manifest.actors.forEach((actorParams) => {
				stage.actors.push(getConfiguredActor(actorParams));
			});

			// Bake the actors
			stage.bakeSetpiece();
		});

	return stage;
}

/**
 * Load all stage objects from manifest.json into memory
 */
async function loadContent(callback)
{
	const MANIFEST_PATH = "content/manifest.json";
	let manifest = {};
	return safeFetch(MANIFEST_PATH).then((v) => {
		manifest = JSON.parse(v);
		return Promise.all(manifest.stages.map((stage) => {
			return safeFetch(`content/${stage.url}`).then((stageManifest) => {
				stageStore.push(JSON.parse(stageManifest));
			});
		}));
	}).then(() => Promise.all(
		['models/barrel_ornate.obj', 'models/cube.obj'] // TODO: load this array dynamically
			.map(name => safeFetch(name).then(v => loadOBJToModelStore(name, v)))
	))
		.then(() => buildStage(0))
		.then((stage) => { currentStage = stage; });
}
