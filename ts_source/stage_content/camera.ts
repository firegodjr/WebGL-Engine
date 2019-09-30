import { vec2, vec3, quat } from "gl-matrix"
import StageActor from "stage-actor"
import InputHandler from "../input"
import { FPSCameraTransform } from "./transform"

export default class Camera
{
	public transform: FPSCameraTransform;

	constructor(translation: vec3 = vec3.create(), rotation: vec2 = vec2.create())
	{
		this.transform = new FPSCameraTransform(translation, rotation);
	}

	update(deltaTime: number, elapsedTime: number) {}
}