
import { StageTemplate, ActorTemplate, SerializedActor } from './templates'
import OBJModel from './stage_content/objmodel'

export const CLEAR_COLOR: [number, number, number, number] = [0.3, 0.3, 0.9, 1.0];
export const DEFAULT_MODEL_NAME = 'default';
export const ATTRIB_POS_LENGTH = 3;
export const ATTRIB_TEXCOORD_LENGTH = 2;
export const ATTRIB_NORMAL_LENGTH = 3;
export const VERTEX_COMPONENTS_LENGTH = ATTRIB_POS_LENGTH + ATTRIB_TEXCOORD_LENGTH + ATTRIB_NORMAL_LENGTH;
export const stageUrlStore: { [s: string]: OBJModel } = { };
export const modelStore: { [s: string]: OBJModel } = { };

// Must be object because primitives are passed by value (reassignment won't be possible across multiple imports of this module)
export const loadState = {
	models: false,
	preload: false,
	actors: false,
	setpieces: false
}

export const stageStore: StageTemplate[] = [];
export const actorStore: SerializedActor[] = [];
