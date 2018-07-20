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
		this.velocity[2] += this.getMomentum(deltaTime, this.backPressed, this.forwardPressed, this.velocity[2]);
		this.velocity[1] += this.getMomentum(deltaTime, this.upPressed, this.downPressed, this.velocity[1]);
		this.velocity[0] += this.getMomentum(deltaTime, this.rightPressed, this.leftPressed, this.velocity[0]);

		vec3.add(
			this.camera.transform.translation,
			this.camera.transform.translation,
			vec3.transformQuat(vec3.create(), this.velocity, this.camera.transform.rotationYawQuat)
		);
	}

	getMomentum(deltaTime: number, forward: boolean, back: boolean, velocity: number, friction: number = 1)
	{
		let number = 0;

		if(forward)
		{
			if(velocity < 1)
			{
				number = 2 / (Math.abs(velocity) * friction + 1);
			}
		}
		else if(back)
		{
			if(velocity > -1)
			{
				number = -2 / (Math.abs(velocity) * friction + 1);
			}
		}
		else
		{
			number = -2 * velocity * 5 * friction;
		}
		return number * deltaTime;
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