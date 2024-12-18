class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = new Float32Array(0);
    }

    process(inputs, outputs) {
        const output = outputs[0];
        const channel = output[0];

        if (this.buffer.length >= channel.length) {
            channel.set(this.buffer.subarray(0, channel.length));
            this.buffer = this.buffer.subarray(channel.length);
        } else {
            channel.set(this.buffer);
            channel.fill(0, this.buffer.length);
            this.buffer = new Float32Array(0);
        }

        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
