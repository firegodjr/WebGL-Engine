
import { vec2, vec3, mat4, quat } from 'gl-matrix';

/** Stores data relating to the position, rotation and scale of an actor in a stage */
export default class Transform
{

	public translation: vec3;
	protected rotation: quat;
	protected scale: vec3;
	public modelMatrix: mat4;

	/**
	 * Stores data relating to the position, rotation and scale of an actor in a stage
	 * @param {vec3} translation (default: no translation)
	 * @param {quat} rotation (default: no rotation)
	 * @param {vec3} scale (default: 1x scale)
	 */
	constructor(translation: vec3 = vec3.create(), rotation: quat = quat.create(), scale: vec3 = vec3.fromValues(1, 1, 1))
	{
		this.translation = translation;
		this.rotation = rotation;
		this.scale = scale;
		this.modelMatrix = mat4.create();
	}

	/**
	 * Creates/updates the model matrix of this transform and returns it
	 */
	updateModelMatrix(): mat4
	{
		return mat4.fromRotationTranslationScale(this.modelMatrix, this.rotation, this.translation, this.scale);
	}


	get posX() { return this.translation[0]; }
	get posY() { return this.translation[1]; }
	get posZ() { return this.translation[2]; }

	set posX(value) { this.translation[0] = value; }
	set posY(value) { this.translation[1] = value; }
	set posZ(value) { this.translation[2] = value; }

	get rotationQuat() { return this.rotation }
	get rotationPitch() { return quat.getAxisAngle([1, 0, 0], this.rotation); }
	get rotationYaw() { return quat.getAxisAngle([0, 1, 0], this.rotation); }
	get rotationRoll() { return quat.getAxisAngle([0, 0, 1], this.rotation); }

	set rotationPitch(value: number) { quat.rotateX(this.rotation, quat.create(), value); }
	set rotationYaw(value: number) { quat.rotateY(this.rotation, quat.create(), value); }
	set rotationRoll(value: number) { quat.rotateZ(this.rotation, quat.create(), value); }

	get scaleX() { return this.scale[0]; }
	get scaleY() { return this.scale[1]; }
	get scaleZ() { return this.scale[2]; }

	set scaleX(value) { this.scale[0] = value; }
	set scaleY(value) { this.scale[1] = value; }
	set scaleZ(value) { this.scale[2] = value; }

	rotatePitch(value: number) { quat.rotateX(this.rotation, this.rotation, value); }
	rotateYaw(value: number) { quat.rotateY(this.rotation, this.rotation, value); }
	rotateRoll(value: number) { quat.rotateZ(this.rotation, this.rotation, value); }

	/**
	 * Creates a transform from position, rotation, and scale vectors
	 * @param position 
	 * @param rotation 
	 * @param scale 
	 */
	static fromRawValues(position: number[], rotation: number[], scale: number[]): Transform {
		if (position.length != 3) {
			throw new RangeError(`argument 'translation' not 3 elements long!`);
		}
		if (rotation.length != 3) {
			throw new RangeError(`argument 'rotation' not 3 elements long!`);
		}
		if (scale.length != 3) {
			throw new RangeError(`argument 'scale' not 3 elements long!`);
		}
		return new Transform(
			vec3.fromValues(position[0], position[1], position[2]),
			quat.fromEuler(quat.create(), rotation[0], rotation[1], rotation[2]),
			vec3.fromValues(scale[0], scale[1], scale[2])
		)
	}
}

/**
 * A specialized transform that handles rotation differently
 * to make an FPS control scheme easier
 */
export class FPSCameraTransform extends Transform
{
	protected rotationEuler: vec2 = vec2.create();

	constructor(translation: vec3 = vec3.create(), rotation: vec2 = vec2.create())
	{
		super(translation, quat.create(), vec3.fromValues(1, 1, 1));
		this.rotationEuler = rotation;
	}

	updateModelMatrix(): mat4
	{
		return mat4.fromRotationTranslationScale(this.modelMatrix, this.rotationQuat, this.translation, this.scale);
	}

	get rotationQuat() 
	{ 
		return quat.mul(
			quat.create(), 
			quat.setAxisAngle(quat.create(), vec3.fromValues(0, 1, 0), this.rotationEuler[1]), 
			quat.setAxisAngle(quat.create(), vec3.fromValues(1, 0, 0), this.rotationEuler[0])
		);
	}

	get rotationYawQuat()
	{
		return quat.setAxisAngle(quat.create(), [0, 1, 0], this.rotationEuler[1]);
	}

	get rotationPitch() { return this.rotationEuler[0]; }
	get rotationYaw() { return this.rotationEuler[1]; }
	get rotationRoll() { return 0; }

	set rotationPitch(value: number) { this.rotationEuler[0] = value; }
	set rotationYaw(value: number) { this.rotationEuler[1] = value; }
	set rotationRoll(value: number) { console.error("Attempted to set roll in an fps camera"); }

	rotatePitch(value: number) 
	{ 
		if(this.rotationEuler[0] + value > Math.PI / 2) 
		{
			this.rotationEuler[0] = Math.PI / 2 - .01;
		}
		else if(this.rotationEuler[0] + value < -Math.PI / 2)
		{
			this.rotationEuler[0] = -Math.PI / 2 + .01;
		}
		else this.rotationEuler[0] += value; 
	}

	rotateYaw(value: number) { this.rotationEuler[1] += value; }
	rotateRoll(value: number) { console.error("Attempted to set roll in an fps camera"); }
}