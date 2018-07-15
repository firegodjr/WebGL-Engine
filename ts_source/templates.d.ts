
export interface ObjectTemplate {
	name: string;
	actorID: number;
	position: number[];
	rotation: number[];
	scale: number[];
}
export interface SetpieceTemplate extends ObjectTemplate {
	actorID: 1
}
export interface ActorTemplate extends ObjectTemplate {
	actorID: 0
}
export interface StageTemplate {
	/** A list of relative URIs to actors/resources to preload */
	preload: string[];
	setpieces: SetpieceTemplate[];
	actors: ActorTemplate[];
}
export interface ManifestTemplate {
	stages: { url: string }[]
}

// Can't think of a better name for this >:
export interface SerializedActor {
	name: string;
	modelName: string;
	texture: string;
	textureRange: [number, number, number, number];
	script: string;
}