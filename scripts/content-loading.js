const stageStore = [];
const actorStore = [];

/**
 * Retrives a file from the web server. Rejects on non-Response.ok, and returns a promise to the body.
 * If asJson = true, then the function will return a Promise to a function.
 * @param {string} filepath
 * @returns {Promise<string> | Promise<object>}
 */
async function safeFetch(filepath, asJson = false)
{
	const resp = await fetch(filepath);
	if (!resp.ok)
	{
		throw new Error(`Unsuccessful fetch of resource '${filepath}'`);
	}
	if (asJson)
	{
		return resp.json();
	}
	return resp.text();
}
/**
 * Builds an actor object from actor parameters in a stage manifest
 * @param {number} index
 */
function getConfiguredActor(actorParams)
{
	const template = actorStore[actorParams.actorID];
	const actor = new StageActor(template.name, template.modelNames);
	actor.transform.translation = vec3.fromValues(...actorParams.position);
	[actor.transform.rotationX,	actor.transform.rotationY, actor.transform.rotationZ] = actorParams.rotation;
	actor.transform.scale = vec3.fromValues(...actorParams.scale);
	actor.textureRange = template.textureRange;

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
async function loadTextureAtlas(urls)
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
					offsets[images[index.ref].src.split('/').reverse()[0]] = [
						xOffset / canvas.width,
						yOffset / canvas.height,
						(xOffset + currSize) / canvas.width,
						(yOffset + currSize) / canvas.height
					];

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
	let currentPower = 1;
	/** @type {ImageBitmap} */
	const canvas = document.createElement('canvas');
	// TODO canvas.style.display = 'none';
	document.body.appendChild(canvas);

	await Promise.all(urls.map((url) => {
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
	const ctx = canvas.getContext('2d');

	tileImageSquare(canvas, ctx, offsets, 0, 0, loadedImgs[0].naturalWidth, loadedImgs, { ref: 0 });

	const indexedOffsets = [];
	urls.forEach((url) => {
		indexedOffsets.push(offsets[url]);
	});

	return {
		atlas: await createImageBitmap(ctx.getImageData(0, 0, canvas.width, canvas.height)),
		offsets: indexedOffsets
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

	// eslint-disable-next-line prefer-arrow-callback
	const actors = await Promise.all(manifest.preload.map(async function preloadMap(url, ind, arr) {
		const actorManifest = await safeFetch(`content/${url}`, true);
		actorStore.push(actorManifest);
	}));

	// Create a texture atlas for the stage's actors
	const urls = actorStore.map(a => a.texture);
	const atlas = await loadTextureAtlas(urls);
	stage.textureAtlas = atlas.atlas;

	// Record the new texture coordinate ranges
	actorStore.forEach((actor, i) => {
		actor.textureRange = atlas.offsets[i];
	});

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

	return stage;
}

/**
 * Load all stage objects from manifest.json into memory
 */
async function loadContent(callback)
{
	modelStore["default"] = new OBJModel("default", [], [], [], []);
	try
	{
		const MANIFEST_PATH = "content/manifest.json";
		const manifest = await safeFetch(MANIFEST_PATH, true);
		// Stick all in same Promise.all so that network connections can run concurrently
		await Promise.all([
			...(manifest.stages.map(async function getStages(stage)
			{
				const manif = await safeFetch(`content/${stage.url}`, true);
				stageStore.push(manif);
			})),
			...(['models/barrel_ornate.obj', 'models/cube.obj'
			].map(async function loadObjs(modelPath)
			{
				const modelText = await safeFetch(modelPath);
				loadOBJToModelStore(modelPath, modelText);
			}))
		]);
		currentStage = await buildStage(0);
	}
	catch (e)
	{
		console.error('Error loading content!');
		throw e;
	}
}
