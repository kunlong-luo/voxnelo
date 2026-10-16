/* global AudioWorkletProcessor, registerProcessor */
/* Electron-only microphone capture. AudioContext runs at 16 kHz mono.
 * Device DSP (NS/AEC/AGC) is requested by getUserMedia, not emulated here.
 * No network access, no file writes, no playback audio output.
 */
class VoxneloPcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer=new Float32Array(1600);
    this.length=0;
  }
  process(inputs) {
    const mono=inputs[0]?.[0];
    if(mono){
      for(let i=0;i<mono.length;i++){
        this.buffer[this.length++]=mono[i];
        if(this.length===1600){
          this.port.postMessage(this.buffer,[this.buffer.buffer]);
          this.buffer=new Float32Array(1600);
          this.length=0;
        }
      }
    }
    return true;
  }
}
registerProcessor('voxnelo-pcm-16k',VoxneloPcmProcessor);
