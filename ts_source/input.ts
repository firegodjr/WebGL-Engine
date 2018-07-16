export default class InputHandler
{
	private canvas: HTMLCanvasElement;
	private onKeyPressHandlers: Function[] = [];
	private onKeyDownHandlers: Function[] = [];
	private onKeyUpHandlers: Function[] = [];
	private onMouseMoveHandlers: Function[] = [];
	private onMouseDownHandlers: Function[] = [];
	private onMouseUpHandlers: Function[] = [];
	private cursorLocked: boolean = false;

	constructor(canvas: HTMLCanvasElement)
	{
		this.canvas = canvas;

		// Set the canvas as the selected element, so it can take keyboard input
		canvas.tabIndex = 1000;
		canvas.focus();

		canvas.onkeypress = this.onKeyPress.bind(this);
		canvas.onkeydown = this.onKeyDown.bind(this);
		canvas.onkeyup = this.onKeyUp.bind(this);
		canvas.onmousemove = this.onMouseMove.bind(this);
		canvas.onmousedown = this.onMouseDown.bind(this);
		canvas.onmouseup = this.onMouseUp.bind(this);
	}

	public setCursorLock(locked: boolean)
	{
		locked ? this.canvas.requestPointerLock() : document.exitPointerLock();
		this.cursorLocked = locked;
	}

// #region handler registration

	public addToKeyPress(func: Function)
	{
		this.onKeyPressHandlers.push(func);
	}

	public addToKeyDown(func: Function)
	{
		this.onKeyDownHandlers.push(func);
	}

	public addToKeyUp(func: Function)
	{
		this.onKeyUpHandlers.push(func);
	}

	public addToMouseMove(func: Function)
	{
		this.onMouseMoveHandlers.push(func);
	}

	public addToMouseDown(func: Function)
	{
		this.onMouseDownHandlers.push(func);
	}

	public addToMouseUp(func: Function)
	{
		this.onMouseUpHandlers.push(func);
	}

	// #endregion handler registration

// #region events

	private onKeyPress(e: Event)
	{
		this.onKeyPressHandlers.forEach(handler => {
			handler(e);
		});
	}

	private onKeyDown(e: Event)
	{
		this.onKeyDownHandlers.forEach(handler => {
			handler(e);
		});
	}

	private onKeyUp(e: Event)
	{
		this.onKeyUpHandlers.forEach(handler => {
			handler(e);
		});
	}

	private onMouseMove(e: Event)
	{
		if(this.cursorLocked)
		{
			this.onMouseMoveHandlers.forEach(handler => {
				handler(e);
			});
		}
	}

	private onMouseDown(e: Event)
	{
		this.onMouseDownHandlers.forEach(handler => {
			handler(e);
		});
	}

	private onMouseUp(e: Event)
	{
		this.onMouseUpHandlers.forEach(handler => {
			handler(e);
		});
	}

	// #endregion events
}
