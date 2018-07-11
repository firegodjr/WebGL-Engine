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
