
import { vec3 } from 'gl-matrix'

import { actorStore, stageStore } from './globals'

import { ManifestTemplate, StageTemplate, SerializedActor,ObjectTemplate } from './templates'
import { safeFetch, loadOBJToModelStore } from './utils'

import Transform from './stage_content/transform'
import Stage from './stage_content/stage'
import StageActor from './stage_content/stage-actor';

export interface TextureAtlas {
	atlas: ImageBitmap;
	offsets: [number, number, number, number][];
}

/**
 * Builds an actor object from actor parameters in a stage manifest
 * @param {number} index
 */
function getConfiguredActor(actorParams: ObjectTemplate)
{
	const template = actorStore[actorParams.actorID];
	const actor = new StageActor(template.name, template.modelName, template.textureRange);
	actor.transform = Transform.fromRawValues(actorParams.position, actorParams.rotation, actorParams.scale)

	return actor;
}

function loadedImageElement(src: string): Promise<HTMLImageElement>
{
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.src = `textures/${src}`;
		image.onload = () => resolve(image);
	});
}

function sortImageSizes(a: HTMLImageElement, b: HTMLImageElement): number
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
/*
function getImagePixelRGBA(imageData: ImageData, x: number, y: number): number[]
{
	const offset = x + y * imageData.width;
	return imageData.data.slice(offset, 4);
}
*/

/**
 * Generates a texture atlas from the given image urls
 */
async function loadTextureAtlas(urls: string[]): Promise<TextureAtlas>
{
	interface OffsetDictionary {
		[name: string]: [number, number, number, number];
	}

	function tileImageSquare(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, offsets: OffsetDictionary, xOffset: number, yOffset: number, currSize: number, images: HTMLImageElement[], index: { ref: number })
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

	const offsets: OffsetDictionary = {};
	let currentPower = 1;
	/** @type {ImageBitmap} */
	const canvas = document.createElement('canvas');
	// TODO canvas.style.display = 'none';
	document.body.appendChild(canvas);

	const loadedImgs: HTMLImageElement[] = await Promise.all(urls.map((url) => loadedImageElement(url)));

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

	if (ctx === null)
		throw new TypeError('WebGL 2D context cannot be null!');

	tileImageSquare(canvas, ctx, offsets, 0, 0, loadedImgs[0].naturalWidth, loadedImgs, { ref: 0 });

	const indexedOffsets: TextureAtlas['offsets'] = new Array(urls.length);
	urls.forEach((url, ind) => {
		indexedOffsets[ind] = offsets[url];
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
export async function buildStage(index: number): Promise<Stage>
{
	const stageManifest = stageStore[index];
	//const stage_name = stageManifest.name;
	const stage_name = 'lmao';

	// eslint-disable-next-line prefer-arrow-callback
	await Promise.all(stageManifest.preload.map(async function preloadActor(url, ind, arr) {
		const actorTempl = await safeFetch<SerializedActor>(`content/${url}`, true);
		actorStore.push(actorTempl);
	}));

	// Create a texture atlas for the stage's actors
	const urls = actorStore.map(a => a.texture);
	const atlas = await loadTextureAtlas(urls);
	const stage_textureAtlas = atlas;

	// Record the new texture coordinate ranges
	actorStore.forEach((actor, i) => {
		actor.textureRange = atlas.offsets[i];
	});

	// Load all setpieces
	const stage_setpieces = stageManifest.setpieces.map(params => getConfiguredActor(params));

	// Load all actors
	const stage_actors = stageManifest.actors.map(params => getConfiguredActor(params));

	const stage = new Stage(stage_name, stage_setpieces, stage_actors, stage_textureAtlas)
	// Bake the actors
	stage.bakeSetpiece();

	return stage;
}

/**
 * Load all stage objects from manifest.json into memory
 */
export async function loadContent(): Promise<Stage>
{
	try
	{
		const MANIFEST_PATH = "content/manifest.json";
		const manifest = await safeFetch<ManifestTemplate>(MANIFEST_PATH, true);
		// Stick all in same Promise.all so that network connections can run concurrently
		await Promise.all([
			...(manifest.stages.map(async function getStages(stage)
			{
				const manif = await safeFetch<StageTemplate>(`content/${stage.url}`, true);
				stageStore.push(manif);
			})),
			...(['models/barrel_ornate.obj', 'models/cube.obj'
			].map(async function loadObjs(modelPath)
			{
				const modelText = await safeFetch(modelPath);
				loadOBJToModelStore(modelPath, modelText);
			}))
		]);
		return buildStage(0);
	}
	catch (e)
	{
		console.error('Error loading content!');
		throw e;
	}
}
