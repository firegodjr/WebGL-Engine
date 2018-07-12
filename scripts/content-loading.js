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

/**
 * Builds a stage object from a loaded stage manifest
 * @param {number} index
 */
async function buildStage(index)
{
	const manifest = stageStore[index];
	const stage = new Stage(manifest.name);

	// Load all stage prerequisites
	Promise.all(manifest.preload.map((url) => {
		return safeFetch(`content/${url}`).then((actor) => { 
			const actorManifest = JSON.parse(actor); 
			actorStore[actorManifest.name] = actorManifest; 
		});
	})).then(() => {
		// Load all setpieces
		manifest.setpieces.forEach((actorParams) => {
			stage.setpieces.push(getConfiguredActor(actorParams));
		});

		// Load all actors
		manifest.actors.forEach((actorParams) => {
			stage.actors.push(getConfiguredActor(actorParams));
		});
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
	return safeFetch(MANIFEST_PATH)
	.then((v) => {
		manifest = JSON.parse(v);
		return Promise.all(manifest.stages.map((stage) => {
			return safeFetch(`content/${stage.url}`)
			.then((stageManifest) => {
				stageStore.push(JSON.parse(stageManifest));
			});
		}))
	})
	.then(() => { return buildStage(0); })
	.then(stage => currentStage = stage);
}
