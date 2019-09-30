import { vec2, vec3, quat } from "gl-matrix"
import { FPSCameraTransform } from "./transform"
import Camera from "./camera"
import InputHandler from "../input"

export default class PlayerController
{
	private velocity: vec3 = vec3.create();
	private camera: Camera;
	private forwardPressed: boolean = false;
	private rightPressed: boolean = false;
	private leftPressed: boolean = false;
	private backPressed: boolean = false;
	private upPressed: boolean = false;
	private downPressed: boolean = false;

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
		vec3.add(this.velocity, this.velocity, this.getAcceleration(2));
		vec3.scale(this.velocity, this.velocity, 0.8);

		vec3.add(
			this.camera.transform.translation,
			this.camera.transform.translation,
			vec3.transformQuat(vec3.create(), this.velocity, this.camera.transform.rotationYawQuat)
		);
	}

	getAcceleration(deltaTime: number, friction: number = 1)
	{
		let acceleration = vec3.create();

		if(this.forwardPressed)
		{
			acceleration[2] -= 1;
		}
		if(this.backPressed)
		{
			acceleration[2] += 1;
		}
		if(this.leftPressed)
		{
			acceleration[0] -= 1;
		}
		if(this.rightPressed)
		{
			acceleration[0] += 1;
		}
		if(this.upPressed)
		{
			acceleration[1] += 1;
		}
		if(this.downPressed)
		{
			acceleration[1] -= 1;
		}

		vec3.normalize(acceleration, acceleration);
		return vec3.scale(vec3.create(), acceleration, deltaTime / 25);
	}

	beginMovement(e: KeyboardEvent)
	{
		switch(String.fromCharCode(e.keyCode))
		{
			case 'W':
				this.forwardPressed = true;
				break;
			case 'S':
				this.backPressed = true;
				break;
			case 'A':
				this.leftPressed = true;
				break;
			case 'D':
				this.rightPressed = true;
				break;
			case ' ':
				this.upPressed = true;
				break;
			case 'C':
				this.downPressed = true;
				break;
		}
	}

	endMovement(e: KeyboardEvent)
	{
		switch(String.fromCharCode(e.keyCode))
		{
			case 'W':
				this.forwardPressed = false;
				break;
			case 'S':
				this.backPressed = false;
				break;
			case 'A':
				this.leftPressed = false;
				break;
			case 'D':
				this.rightPressed = false;
				break;
			case ' ':
				this.upPressed = false;
				break;
			case 'C':
				this.downPressed = false;
				break;
		}
	}

	updateRotation(e: MouseEvent)
	{
		this.camera.transform.rotatePitch(-e.movementY / 300);
		this.camera.transform.rotateYaw(-e.movementX / 300);
	}
}