export default class Attribute {

    /**
     * The parent MiniGL controller.
     *
     * @type {MiniGL}
     * @private
     */
    gl;

    type;

    buffer;

    normalized = false;

    /**
     * @param {MiniGL} minigl
     * @param {object} properties
     */
    constructor(minigl, properties = {}) {

        // Add additional properties.
        Object.assign(this, properties);

        // Set required properties.
        this.gl = minigl;
        this.type = this.gl.getContext().FLOAT;
        this.buffer = this.gl.getContext().createBuffer();

        this.update();
    }

    update() {
        if (this.values) {
            const context = this.gl.getContext();
            context.bindBuffer(this.target, this.buffer);
            context.bufferData(this.target, this.values, context.STATIC_DRAW);
        }
    }

    attach(e, t) {
        const context = this.gl.getContext();
        const n = context.getAttribLocation(t, e);

        if (this.target === context.ARRAY_BUFFER) {
            context.enableVertexAttribArray(n);
            context.vertexAttribPointer(n, this.size, this.type, this.normalized, 0, 0);
        }

        return n;
    }

    use(e) {
        const context = this.gl.getContext();
        context.bindBuffer(this.target, this.buffer);
        if (this.target === context.ARRAY_BUFFER) {
            context.enableVertexAttribArray(e);
            context.vertexAttribPointer(e, this.size, this.type, this.normalized, 0, 0);
        }
    }

}
