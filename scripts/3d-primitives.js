function Transform(position, rotation, scale)
{
    this.position = position || vec3.create();
    this.rotation = rotation || vec3.create();
    this.scale = scale || vec3.create();
}

function Cube(position, rotation, scale)
{
    this.transform = new Transform(position, rotation, scale);
}