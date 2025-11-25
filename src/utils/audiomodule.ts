import { guard } from "../hooks/useLrc.js";
import { createPubSub } from "./pubsub.js";

interface IAudioRef extends React.RefObject<HTMLAudioElement> {
    readonly src: string;
    readonly duration: number;
    readonly paused: boolean;
    playbackRate: number;
    currentTime: number;
    volume: number;
    toggle: () => void;
    step: (
        ev: React.MouseEvent | React.KeyboardEvent | MouseEvent | KeyboardEvent,
        value: number,
        target?: number,
    ) => number;
}

export const audioRef: IAudioRef = {
    current: null,

    get src() {
        return this.current?.src ?? "";
    },

    get duration() {
        return this.current?.duration ?? 0;
    },

    get paused() {
        return this.current?.paused ?? true;
    },

    get playbackRate() {
        return this.current?.playbackRate ?? 1;
    },
    set playbackRate(rate: number) {
        if (this.current !== null) {
            this.current.playbackRate = rate;
        }
    },

    get currentTime() {
        return this.current?.currentTime ?? 0;
    },
    set currentTime(time: number) {
        if (this.current !== null && this.current.duration !== 0) {
            this.current.currentTime = time;
        }
    },

    get volume() {
        return this.current?.volume ?? 1;
    },
    set volume(vol: number) {
        if (this.current !== null) {
            this.current.volume = guard(vol, 0, 1);
            audioStatePubSub.pub({
                type: AudioActionType.volumeChange,
                payload: this.current.volume,
            });
        }
    },

    step(ev, value, target): number {
        if (target === undefined) {
            target = this.currentTime;
        }

        if (ev.altKey) {
            value *= 0.2;
        }
        if (ev.shiftKey) {
            value *= 0.5;
        }
        return (this.currentTime = guard(value + target, 0, this.duration));
    },

    toggle() {
        if (this.current?.duration) {
            void (this.current.paused ? this.current.play() : this.current.pause());
        }
    },
};

export interface LoopState {
    enabled: boolean;
    duration: number;
    startTime: number;
    endTime: number;
}

export const loopState: LoopState = {
    enabled: false,
    duration: 0.05,
    startTime: 0,
    endTime: 0,
};

export const setLoopRange = (startTime: number): void => {
    loopState.startTime = startTime;
    loopState.endTime = startTime + loopState.duration;
    console.log(
        `[Loop] Range set: start=${startTime.toFixed(3)}, end=${
            loopState.endTime.toFixed(3)
        }, duration=${loopState.duration}`,
    );
    audioStatePubSub.pub({
        type: AudioActionType.loopChange,
        payload: { ...loopState },
    });
};

export const setLoopDuration = (duration: number): void => {
    loopState.duration = guard(duration, 0.01, 0.25);
    loopState.endTime = loopState.startTime + loopState.duration;
    console.log(`[Loop] Duration changed to ${loopState.duration}s, new endTime: ${loopState.endTime}`);
    audioStatePubSub.pub({
        type: AudioActionType.loopChange,
        payload: { ...loopState },
    });
};

export const adjustLoopDuration = (delta: number): void => {
    setLoopDuration(loopState.duration + delta);
};

export const toggleLoop = (startTime?: number): void => {
    loopState.enabled = !loopState.enabled;
    console.log(`[Loop] Toggle: enabled=${loopState.enabled}, startTime=${startTime?.toFixed(3)}`);
    if (loopState.enabled && startTime !== undefined) {
        setLoopRange(startTime);
    }
    audioStatePubSub.pub({
        type: AudioActionType.loopChange,
        payload: { ...loopState },
    });
};

export const enum AudioActionType {
    pause,
    getDuration,
    rateChange,
    loopChange,
    volumeChange,
}

export type AudioState =
    | {
        type: AudioActionType.pause;
        payload: boolean;
    }
    | {
        type: AudioActionType.getDuration;
        payload: number;
    }
    | {
        type: AudioActionType.rateChange;
        payload: number;
    }
    | {
        type: AudioActionType.loopChange;
        payload: LoopState;
    }
    | {
        type: AudioActionType.volumeChange;
        payload: number;
    };

export const audioStatePubSub = createPubSub<AudioState>();
export const currentTimePubSub = createPubSub<number>();
