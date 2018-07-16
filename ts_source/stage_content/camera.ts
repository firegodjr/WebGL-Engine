import { vec3, quat } from "gl-matrix"
import StageActor from "stage-actor"
import InputHandler from "../input"
import CameraTransform from "./transform"

export default class Camera
{
	public transform = new CameraTransform();

	constructor()
	{
		
	}

	update(deltaTime: number, elapsedTime: number) {}
}

export class CameraHandler
{
	private velocity: vec3 = vec3.create();
	private camera: Camera;

	constructor(camera: Camera, inputHandler: InputHandler)
	{
		this.camera = camera;
		this.camera.update = this.update.bind(this);
		inputHandler.addToKeyDown(this.beginMovement.bind(this));
		inputHandler.addToKeyUp(this.endMovement.bind(this));
		inputHandler.addToMouseMove(this.updateRotation.bind(this));
	}

	update(deltaTime: number, elapsedTime: number)
	{
		let normal: vec3 = vec3.normalize(vec3.create(), this.velocity);
		let rotatedNormal: vec3 = vec3.transformQuat(vec3.create(), normal, this.camera.transform.rotationQuat);

		vec3.add(
			this.camera.transform.translation,
			this.camera.transform.translation,
			vec3.scale(vec3.create(), rotatedNormal, deltaTime * 3)
		);
	}

	beginMovement(e: KeyboardEvent)
	{
		switch(String.fromCharCode(e.keyCode))
		{
			case 'W':
				this.velocity[2] = -1;
				break;
			case 'S':
				this.velocity[2] = 1;
				break;
			case 'A':
				this.velocity[0] = -1;
				break;
			case 'D':
				this.velocity[0] = 1;
				break;
		}
	}

	endMovement(e: KeyboardEvent)
	{
		switch(String.fromCharCode(e.keyCode))
		{
			case 'W':
				this.velocity[2] = 0;
				break;
			case 'S':
				this.velocity[2] = 0;
				break;
			case 'A':
				this.velocity[0] = 0;
				break;
			case 'D':
				this.velocity[0] = 0;
				break;
		}
	}

	updateRotation(e: MouseEvent)
	{
		this.camera.transform.rotateX(e.movementY / 300);
		this.camera.transform.rotateY(e.movementX / 300);
	}
}