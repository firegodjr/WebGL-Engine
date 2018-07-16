
import { vec2, vec3, mat4 } from 'gl-matrix'

type NumberTuple = [number, number];
type NumberTriple = [number, number, number];
type NumberQuad = [number, number, number, number];

interface OBJModelDummy {
	name?: string;
	positions: vec3[];
	texCoords: vec2[];
	normals: vec3[];
	indices: number[];
}

export default class OBJModel
{
	public readonly name: string;
	public readonly positions: vec3[];
	public readonly texCoords: vec2[];
	public readonly normals: vec3[];
	public readonly indices: number[];
	
	constructor(name: string, positions: vec3[], texCoords: vec2[], normals: vec3[], indices: number[])
	{
		this.name = name;
		this.positions = positions;
		this.texCoords = texCoords;
		this.normals = normals;
		this.indices = indices;
	}

	/**
	 * Returns the vertices of this model, optionally transformed by the given model matrix
	 * @param {mat4} modelMatrix
	 * @returns {number[]}
	 */
	transformedVertices(modelMatrix: mat4 = mat4.create(), textureRange?: NumberQuad): number[]
	{
		function offsetTexCoords(texCoord: vec2, range: NumberQuad)
		{
			const X = (range[2] - range[0]) * texCoord[0] + range[0];
			const Y = (range[3] - range[1]) * texCoord[1] + range[1];

			return [X, Y];
		}

		const vertices: number[] = [];

		for (let i = 0; i < this.positions.length; ++i)
		{
			const transformedPosition = vec3.create();
			vec3.transformMat4(transformedPosition, this.positions[i], modelMatrix);
			vertices.push(
				...transformedPosition,
				...offsetTexCoords(this.texCoords[i], textureRange || [0, 0, 1, 1]),
				...this.normals[i]
			);
		}

		return vertices;
	}

	atlasTexcoordVertices(textureRange?: NumberQuad): number[]
	{
		return this.transformedVertices(undefined, textureRange);
	}
	normalizeIndices(): void {
		const baseIndex = this.indices[0];
		for (let i = 0; i < this.indices.length; ++i)
		{
			this.indices[i] -= baseIndex;
		}
	}

	/** Returns the vertices of this model. */
	get vertices() { return this.transformedVertices(); }

	static fromDummy(dummy: OBJModelDummy): OBJModel {
		(['name', 'positions', 'texCoords', 'normals', 'indices'] as Array<keyof OBJModelDummy>).forEach((name) => {
			if ((dummy[name]) === undefined)
				throw new Error(`Cannot construct OBJModel without defined ${name}!`);
		})
		let v = dummy as Required<OBJModelDummy>;
		return new OBJModel(v.name, v.positions, v.texCoords, v.normals, v.indices);
	}

	static fromFile(filename: string, raw: string): OBJModel[] {
		// const DEFAULT_POSITION = [0, 0, 0];
		const DEFAULT_TEXCOORD: [number, number] = [0, 0];
		const DEFAULT_NORMAL: [number, number, number] = [0, 1, 0];
		const indexDict: { [name: string]: number } = {};
		let combinedIndex = -1;
		let nextIndex = -1;
		const positions: vec3[] = [];
		const texCoords: vec2[] = [];
		const normals: vec3[] = [];
		let currObj: OBJModelDummy = {
			positions: [],
			texCoords: [],
			normals: [],
			indices: []
		};

		const objs: OBJModel[] = [];

		const lines = raw.split('\n');
		for (let i = 0; i < lines.length; ++i)
		{
			const tokens = lines[i].split(' ');
			const trimmed = lines[i];

			if (trimmed.length !== 0 && !trimmed.startsWith('#'))
			{
				switch (tokens[0])
				{
					case 'o': { // Name
						// Create a new OBJModel object and set currObj as a reference to it
						if (currObj.name !== undefined)
						{
							objs.push(OBJModel.fromDummy(currObj));
						}
						currObj = {
							name: tokens.slice(1).join(' ').trim(),
							positions: [],
							texCoords: [],
							normals: [],
							indices: []
						};
						break;
					}
					case 'v': { // Vertex Position
						const pos: number[] = [];
						tokens.slice(1).forEach((value, ind) => {
							if (ind > 2) throw new RangeError('Cannot have more than 3 values for a vertex position!');
							pos.push(parseFloat(value.trim()));
						});
						positions.push(vec3.fromValues(pos[0], pos[1], pos[2]));
						break;
					}
					case 'vn': { // Vertex Normal
						const n: number[] = [];
						tokens.slice(1).forEach((value, ind) => {
							if (ind > 2) throw new RangeError('Cannot have more than 3 values for a vertex normal!');
							n.push(parseFloat(value.trim()));
						});
						normals.push(vec3.fromValues(n[0], n[1], n[2]));
						break;
					}
					case 'vt': { // Vertex Texture Coords
						const coords: number[] = [];
						tokens.slice(1).forEach((value, ind) => {
							if (ind > 1) throw new RangeError('Cannot have more than 2 values for a vertex texture coordinate!');
							coords.push(parseFloat(value.trim()));
						});
						texCoords.push(vec2.fromValues(coords[0], coords[1]));
						break;
					}
					case 'f': { // Face
						const faceVertices = tokens.slice(1);
						if (faceVertices.length === 3)
						{
							// Convert the tokens to floats
							/* eslint-disable-next-line no-loop-func */
							faceVertices.forEach((attribString) => {
								// Parse the indices
								const attribs: number[] = attribString
									.trim()
									.split('/')
									.map(v => parseInt(v, 10) - 1); // Subtract 1 because WebGL indices are 0-based while objs are 1-based

								// For each set of indexed attributes, retrieve their original values and assign each unique set an index.
								// If we've already indexed this set of attributes
								if (attribString in indexDict)
								{
									combinedIndex = indexDict[attribString]; // Get the existing index
								}
								else // Otherwise we need to index it
								{
									nextIndex++;
									indexDict[attribString] = nextIndex;
									combinedIndex = nextIndex;
									currObj.positions.push(positions[attribs[0]]);
									currObj.texCoords.push(Number.isNaN(attribs[1]) ? vec2.fromValues(...DEFAULT_TEXCOORD) : texCoords[attribs[1]]);
									currObj.normals.push(Number.isNaN(attribs[2]) ? vec3.fromValues(...DEFAULT_NORMAL) : normals[attribs[2]]);
								}
								currObj.indices.push(combinedIndex); // Add this index to the index array
							});
						}
						else
						{
							console.warn(`[.obj parse] ${filename}:${i}: can't load non-triangular faces (${trimmed})`);
							// TODO: Triangulate faces automatically
						}
						break;
					}
					default: {
						console.warn(`[.obj parse] ${filename}:${i}: unknown element token '${tokens[0]}'`);
						break;
					}
				}
			}
		}

		objs.push(OBJModel.fromDummy(currObj));
		objs.forEach(v => v.normalizeIndices());
		return objs;
	}
}
