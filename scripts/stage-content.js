/** Stores data relating to the position, rotation and scale of an actor in a stage */
class Transform
{
	/**
	 * Stores data relating to the position, rotation and scale of an actor in a stage
	 * @param {vec3} translation (default: no translation)
	 * @param {quat} rotation (default: no rotation)
	 * @param {vec3} scale (default: 1x scale)
	 */
	constructor(translation = vec3.create(), rotation = quat.create(), scale = vec3.fromValues(1, 1, 1))
	{
		this.translation = translation;
		this.rotation = rotation;
		this.scale = scale;
		this._modelMatrix = mat4.create();
	}

	/** @type {number[]} */
	get modelMatrix()
	{
		return this._modelMatrix;
	}
	set modelMatrix(value)
	{
		this._modelMatrix = value;
	}

	initModelMatrix()
	{
		mat4.fromRotationTranslationScale(this._modelMatrix, this.rotation, this.translation, this.scale);
		return this._modelMatrix;
	}


	/** @type {number} */ get posX() { return this.translation[0]; }
	/** @type {number} */ get posY() { return this.translation[1]; }
	/** @type {number} */ get posZ() { return this.translation[2]; }

	/** @type {number} */ set posX(value) { this.translation[0] = value; return this; }
	/** @type {number} */ set posY(value) { this.translation[1] = value; return this; }
	/** @type {number} */ set posZ(value) { this.translation[2] = value; return this; }

	/** @type {number} */ set rotationX(value) { quat.rotateX(this.rotation, quat.create(), value); return this; }
	/** @type {number} */ set rotationY(value) { quat.rotateY(this.rotation, quat.create(), value); return this; }
	/** @type {number} */ set rotationZ(value) { quat.rotateZ(this.rotation, quat.create(), value); return this; }

	/** @type {number} */ get scaleX() { return this.scale[0]; }
	/** @type {number} */ get scaleY() { return this.scale[1]; }
	/** @type {number} */ get scaleZ() { return this.scale[2]; }

	/** @type {number} */ set scaleX(value) { this.scale[0] = value; return this; }
	/** @type {number} */ set scaleY(value) { this.scale[1] = value; return this; }
	/** @type {number} */ set scaleZ(value) { this.scale[2] = value; return this; }

	rotateX(value) { quat.rotateX(this.rotation, this.rotation, value); return this; }
	rotateY(value) { quat.rotateY(this.rotation, this.rotation, value); return this; }
	rotateZ(value) { quat.rotateZ(this.rotation, this.rotation, value); return this; }
}

/** An entity that exists in worldspace */
class StageActor
{
	static createFromManifest(stringManifest = '')
	{
		const manifest = JSON.parse(stringManifest);
		const Actor = new StageActor(manifest.name, manifest.modelName);
		safeFetch(manifest.script).then(v => eval(v));

		return Actor;
	}
	/**
	 * @param {string} name
	 * @param {string} modelName
	 */
	constructor(name = '', modelName = DEFAULT_MODEL_NAME)
	{
		this.name = name;
		this.modelName = modelName;
		this.transform = new Transform();
		this.textureRange = [1, 1, 0, 0];
	}

	init(deltaTime, elapsedTime) { }

	update(deltaTime, elapsedTime)
	{
		this.transform.rotateY(deltaTime);
	}

	onDestroy(deltaTime, elapsedTime) { }

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
			console.error(`Attempted to get indices of non-loaded model '${this.modelName}'.`);
			return [];
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
		return modelStore[this.modelName].transformedVertices(this.transform.initModelMatrix(), this.textureRange);
	}
}

class Stage
{
	/**
	 * @param {string} name
	 * @param {StageActor[]} actors
	 */
	constructor(name = '', setpieces = [], actors = [])
	{
		/** @type {string} */
		this.name = name;
		/** @type {{ [n: number]: StageActor} */
		this.setpieces = setpieces;
		/** @type {{ [n: number]: StageActor, camera: StageActor } */
		this.actors = actors;
		this.actors.camera = new StageActor('camera', DEFAULT_MODEL_NAME);
		this.textureAtlas = null;

		/** @type { number[] } */
		this.bakedVertices = [];
		this.bakedIndices = [];
	}

	update(deltaTime, elapsedTime)
	{
		this.actors.forEach(actor => actor.update(deltaTime, elapsedTime));
	}

	/**
	 * Converts all setpiece actors into static vertex and index arrays,
	 * which can be retrieved from stage.vertices and stage.indices
	 */
	bakeSetpiece()
	{
		const stageVertices = [];
		const stageIndices = [];
		let lastIndex = 0;

		this.setpieces.forEach((/** @type {StageActor} */ actor) => {
			// Bake actor vertices
			const actorVertices = actor.transformedVertices(null, actor.textureRange);
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
		return this.bakedVertices;
	}

	/** @type {number[]} */
	get indices()
	{
		return this.bakedIndices;
	}

	/** @type {number[][]} */
	get actorVertices()
	{
		const actorVertices = [];
		this.actors.forEach((actor) => {
			actorVertices.push(actor.vertices);
		});
		return actorVertices;
	}
	/** @type {number[][]} */
	get actorIndices()
	{
		const actorIndices = [];
		this.actors.forEach((actor) => {
			actorIndices.push(actor.indices);
		});
		return actorIndices;
	}
}

class OBJModel
{
	constructor(name = '', positions = [], texCoords = [], normals = [], indices = [])
	{
		this.name = name;
		this.positions = positions;
		this.texCoords = texCoords;
		this.normals = normals;
		this._indices = indices;
	}

	/**
	 * Returns the vertices of this model, optionally transformed by the given model matrix
	 * @param {mat4} modelMatrix
	 * @returns {number[]}
	 */
	transformedVertices(modelMatrix = mat4.create(), textureRange = [0, 0, 1, 1])
	{
		function offsetTexCoords(texCoords, range)
		{
			const X = (range[2] - range[0]) * texCoords[0] + range[0];
			const Y = (range[3] - range[1]) * texCoords[1] + range[1];

			return [X, Y];
		}

		const vertices = [];

		for (let i = 0; i < this.positions.length; ++i)
		{
			const transformedPosition = vec3.create();
			vec3.transformMat4(transformedPosition, this.positions[i], modelMatrix);
			vertices.push(
				...transformedPosition,
				...offsetTexCoords(this.texCoords[i], textureRange),
				...this.normals[i]
			);
		}

		return vertices;
	}

	atlasTexcoordVertices(textureRange)
	{
		return this.transformedVertices(undefined, textureRange);
	}

	/** Returns the vertices of this model. */
	get vertices() { return this.transformedVertices(); }

	get indices() { return this._indices; }
}
