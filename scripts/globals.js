const CLEAR_COLOR = [0.3, 0.3, 0.9, 1.0];
const DEFAULT_MODEL_NAME = 'default';
const ATTRIB_POS_LENGTH = 3;
const ATTRIB_TEXCOORD_LENGTH = 2;
const ATTRIB_NORMAL_LENGTH = 3;
const VERTEX_COMPONENTS_LENGTH = ATTRIB_POS_LENGTH + ATTRIB_TEXCOORD_LENGTH + ATTRIB_NORMAL_LENGTH;
/** @type {{ [s: string]: OBJModel }  */
const stageUrlStore = { default: [] };
const modelStore = { default: [] };
let modelsLoaded = false;
let preloadDone = false;
let actorsDone = false;
let setpiecesDone = false;
