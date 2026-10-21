#!/usr/bin/env python3
"""Real model smoke: same local WAV -> Moonshine JSONL subprocess -> final text.
Only prints numeric/boolean assertions. Never uploads WAVs or transcripts.
"""
import argparse
import json
from pathlib import Path
import signal
import subprocess
import sys
import wave

PACKET=800


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--python",required=True)
    parser.add_argument("--script",required=True)
    parser.add_argument("--model",required=True)
    parser.add_argument("--wav",required=True)
    args=parser.parse_args()
    with wave.open(args.wav,"rb") as wav:
        if wav.getnchannels()!=1 or wav.getframerate()!=16000 or wav.getsampwidth()!=2:
            raise ValueError("Expected 16kHz mono PCM16")
        frames=wav.readframes(wav.getnframes())
    import array
    pcm=array.array("h")
    pcm.frombytes(frames)
    if sys.byteorder!="little":pcm.byteswap()
    child=subprocess.Popen([args.python,"-I",str(Path(args.script).resolve()),
                            "--model-dir",str(Path(args.model).resolve())],
                           stdin=subprocess.PIPE,stdout=subprocess.PIPE,
                           stderr=subprocess.DEVNULL,text=True,bufsize=1)
    def timeout(*_):
        raise TimeoutError("ASR subprocess timeout")
    signal.signal(signal.SIGALRM,timeout)
    signal.alarm(150)
    seen={"ready":0,"drained":0,"result":0,"finished":0}
    final=""
    def read_event():
        line=child.stdout.readline()
        if not line:raise RuntimeError("ASR subprocess exited without event")
        event=json.loads(line)
        kind=event.get("type")
        if kind not in seen:raise RuntimeError("ASR subprocess protocol failure")
        seen[kind]+=1
        if kind=="failure":raise RuntimeError("ASR subprocess reported failure")
        return event
    try:
        if read_event()["type"]!="ready":raise RuntimeError("ASR did not initialize")
        for start in range(0,len(pcm),PACKET):
            block=pcm[start:start+PACKET]
            message={"type":"pcm","samples":[v/32768.0 for v in block]}
            child.stdin.write(json.dumps(message)+"\n")
            child.stdin.flush()
            while True:
                event=read_event()
                if event["type"]=="drained":break
        child.stdin.write('{"type":"finish"}\n')
        child.stdin.flush()
        while True:
            event=read_event()
            if event["type"]=="result":final=event.get("finalText","")
            if event["type"]=="finished":break
        child.stdin.close()
        if child.wait(timeout=15)!=0:raise RuntimeError("ASR subprocess failed")
        if not final.strip():raise RuntimeError("Model produced no final speech")
        if seen["drained"]!=(len(pcm)+PACKET-1)//PACKET:
            raise RuntimeError("Missing drained event")
        if seen["result"]<1 or seen["finished"]!=1:
            raise RuntimeError("Missing final transcript events")
        print("Moonshine real-model PCM protocol PASS; packets="+str(seen["drained"])+
              "; results="+str(seen["result"]))
    finally:
        signal.alarm(0)
        if child.poll() is None:
            child.kill()
            child.wait(timeout=10)
    return 0


if __name__=="__main__":
    raise SystemExit(main())
