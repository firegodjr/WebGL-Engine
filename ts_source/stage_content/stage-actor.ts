
import { DEFAULT_MODEL_NAME, modelStore } from '../globals'
import { safeFetch } from '../utils'

import Transform from './transform'
import Stage from './stage';

/** An entity that exists in worldspace */
export default class StageActor
{
	public readonly name: string;
	public readonly modelName: string;
	public transform: Transform;
	public textureRange: [number, number, number, number];

	constructor(name: string, modelName: string, textureRange?: StageActor['textureRange'])
	{
		this.name = name;
		this.modelName = modelName;
		this.transform = new Transform();
		this.textureRange = textureRange || [0, 0, 1, 1]
	}

	init(deltaTime: number, elapsedTime: number) { }

	update(deltaTime: number, elapsedTime: number)
	{
		this.transform.rotateY(deltaTime);
	}

	onDestroy(deltaTime: number, elapsedTime: number) { }

	/** Returns the vertices of this actor's model */
	get vertices()
	{
		if (modelStore[this.modelName] === undefined)
		{
			throw new Error(`Attempted to get vertices of non-loaded model '${this.modelName}'.`);
		}
		return modelStore[this.modelName].atlasTexcoordVertices(this.textureRange);
	}

	get indices()
	{
		if (modelStore[this.modelName] === undefined)
		{
			throw new Error(`Attempted to get indices of non-loaded model '${this.modelName}'.`);
		}
		return modelStore[this.modelName].indices;
	}

	/**
	 * Gets the vertices of this model, offset by the actor's model matrix
	 */
	transformedVertices()
	{
		if (modelStore[this.modelName] === undefined)
		{
			throw new Error(`Attempted to get vertices of non-loaded model '${this.modelName}'.`);
		}
		return modelStore[this.modelName].transformedVertices(this.transform.updateModelMatrix(), this.textureRange);
	}
	
	/* unused
	static createFromManifest(stringManifest = '')
	{
		const manifest = JSON.parse(stringManifest);
		const Actor = new StageActor(manifest.name, manifest.modelName);
		safeFetch(manifest.script).then(v => eval(v));

		return Actor;
	}*/
}