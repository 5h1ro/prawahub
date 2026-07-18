// Browser side of a native audio call: streams the microphone as 16 kHz PCM to
// the WAHA server over a WebRTC data channel and plays the peer audio it returns.

const SAMPLE_RATE = 16000;
const PCM_CHANNEL_LABEL = "pcm";
const CAPTURE_WORKLET_URL = "/dashboard/worklets/capture-processor.js";
const PLAYBACK_WORKLET_URL = "/dashboard/worklets/playback-processor.js";

function float32ToInt16LE(pcm: Float32Array): ArrayBuffer {
    const view = new DataView(new ArrayBuffer(pcm.length * 2));
    for (let i = 0; i < pcm.length; i += 1) {
        let s = pcm[i];
        if (Number.isNaN(s)) s = 0;
        else if (s > 1) s = 1;
        else if (s < -1) s = -1;
        view.setInt16(i * 2, s < 0 ? Math.round(s * 32768) : Math.round(s * 32767), true);
    }
    return view.buffer;
}

function int16LEToFloat32(buf: ArrayBuffer): Float32Array {
    const view = new DataView(buf);
    const n = Math.floor(buf.byteLength / 2);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) out[i] = view.getInt16(i * 2, true) / 32768;
    return out;
}

function safeClose(release: () => void): void {
    try {
        release();
    } catch {
        // resource already released
    }
}

export interface CallAudio {
    remoteStream: MediaStream;
    close: () => void;
}

/**
 * Open the browser audio path for a call.
 * @param exchangeSdp Sends the SDP offer to the server and returns the answer.
 */
export async function openCallAudio(
    exchangeSdp: (sdpOffer: string) => Promise<string>,
): Promise<CallAudio> {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
        const insecure = typeof window !== "undefined" && !window.isSecureContext;
        throw new Error(
            insecure
                ? "Microphone blocked: the dashboard is served over insecure HTTP. " +
                  "Open it via HTTPS or http://localhost:3000 to use audio calls."
                : "Microphone API (navigator.mediaDevices) is not available in this browser.",
        );
    }

    const micStream = await navigator.mediaDevices.getUserMedia({audio: true, video: false});

    const pc = new RTCPeerConnection({iceServers: []});
    const dc = pc.createDataChannel(PCM_CHANNEL_LABEL, {ordered: true});
    dc.binaryType = "arraybuffer";

    const ctx = new AudioContext({sampleRate: SAMPLE_RATE});
    await ctx.audioWorklet.addModule(CAPTURE_WORKLET_URL);
    await ctx.audioWorklet.addModule(PLAYBACK_WORKLET_URL);
    await ctx.resume();

    // Uplink: mic -> capture worklet -> data channel
    const micSource = ctx.createMediaStreamSource(micStream);
    const captureNode = new AudioWorkletNode(ctx, "capture-processor");
    captureNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
        if (dc.readyState === "open") {
            dc.send(float32ToInt16LE(e.data));
        }
    };
    micSource.connect(captureNode);
    captureNode.connect(ctx.destination);

    // Downlink: data channel -> playback worklet -> speaker (via MediaStream)
    const playbackNode = new AudioWorkletNode(ctx, "playback-processor");
    const streamDest = ctx.createMediaStreamDestination();
    playbackNode.connect(streamDest);
    dc.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        playbackNode.port.postMessage(int16LEToFloat32(e.data));
    };

    // Offer / answer with full ICE gathering (non-trickle)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") {
            resolve();
            return;
        }
        pc.addEventListener("icegatheringstatechange", () => {
            if (pc.iceGatheringState === "complete") resolve();
        });
    });

    const sdpAnswer = await exchangeSdp(pc.localDescription!.sdp);
    await pc.setRemoteDescription({type: "answer", sdp: sdpAnswer});

    return {
        remoteStream: streamDest.stream,
        close: () => {
            safeClose(() => ctx.close());
            safeClose(() => micStream.getTracks().forEach((t) => t.stop()));
            safeClose(() => pc.close());
        },
    };
}
