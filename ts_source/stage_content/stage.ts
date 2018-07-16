/// < reference file='../templates.ts' />

import { DEFAULT_MODEL_NAME, VERTEX_COMPONENTS_LENGTH } from '../globals'

import { StageTemplate } from '../templates'
import { TextureAtlas } from '../content-loading'

import StageActor from './stage-actor'

interface StageActorCollection extends Array<StageActor> {
	camera: StageActor;
}

export default class Stage
{
	public readonly name: string;
	public readonly setpieces: StageActor[];
	public readonly actors: StageActorCollection;
	public bakedVertices: number[];
	public bakedIndices: number[];
	public textureAtlas: TextureAtlas;

	/**
	 * @param {string} name
	 * @param {StageActor[]} actors
	 */
	constructor(name = '', setpieces: StageActor[] = [], actors: StageActor[], textureAtlas: TextureAtlas)
	{
		/** @type {string} */
		this.name = name;
		/** @type {{ [n: number]: StageActor} */
		this.setpieces = setpieces;
		/** @type {{ [n: number]: StageActor, camera: StageActor } */
		this.actors = actors as StageActorCollection;
		this.actors.camera = new StageActor('camera', DEFAULT_MODEL_NAME);
		this.textureAtlas = textureAtlas;

		/** @type { number[] } */
		this.bakedVertices = [];
		this.bakedIndices = [];
	}

	update(deltaTime: number, elapsedTime: number)
	{
		this.actors.forEach(actor => actor.update(deltaTime, elapsedTime));
	}

	/**
	 * Converts all setpiece actors into static vertex and index arrays,
	 * which can be retrieved from stage.vertices and stage.indices
	 */
	bakeSetpiece()
	{
		const stageVertices: number[] = [];
		const stageIndices: number[] = [];
		let lastIndex = 0;

		this.setpieces.forEach((actor: StageActor) => {
			// Bake actor vertices
			const actorVertices = actor.transformedVertices();
			stageVertices.push(...actorVertices);

			// Bake actor indices
			const setpieceIndices = actor.indices.map(value => value + lastIndex);
			lastIndex = actorVertices.length / VERTEX_COMPONENTS_LENGTH;
			stageIndices.push(...setpieceIndices);
		});
		this.bakedVertices = stageVertices;
		this.bakedIndices = stageIndices;
	}

	// TODO: Vertices need to be properly batched for individual texture mapping,
	//			 or, preferably, textures need to be atlassed
	/** @type {number[]} */
	get vertices()
	{
		return this.bakedVertices.slice(); // Return readonly copy
	}

	/** @type {number[]} */
	get indices()
	{
		return this.bakedIndices.slice(); // Return readonly copy
	}

	/** @type {number[][]} */
	get actorVertices()
	{
		return this.actors.map(v => v.vertices);
	}

	/** @type {number[][]} */
	get actorIndices()
	{
		return this.actors.map(actor => actor.indices);
	}
}
