// One shared <audio> element. Android Chrome lets it play after the first tap
// (starting a session), and it keeps working offline because files are precached.
let el: HTMLAudioElement | null = null;
let token = 0;

export function play(src: string): Promise<void> {
  el ??= new Audio();
  const my = ++token;
  el.pause();
  el.src = src;
  return new Promise((resolve) => {
    const done = () => { if (my === token) resolve(); };
    el!.onended = done;
    el!.onerror = done; // a missing clip shouldn't block the session
    el!.play().catch(done);
  });
}

export async function playSeq(srcs: string[], gapMs = 350) {
  for (const s of srcs) {
    await play(s);
    await new Promise((r) => setTimeout(r, gapMs));
  }
}

export function stop() {
  token++;
  el?.pause();
}
