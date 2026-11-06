export function createStereoCrossmix(
  context: AudioContext,
  source: AudioNode,
  initialMix = 0.25,
) {
  const splitter = context.createChannelSplitter(2)
  const merger = context.createChannelMerger(2)

  const leftToLeft = context.createGain()
  const rightToLeft = context.createGain()
  const leftToRight = context.createGain()
  const rightToRight = context.createGain()

  source.connect(splitter)

  splitter.connect(leftToLeft, 0)
  splitter.connect(leftToRight, 0)
  splitter.connect(rightToLeft, 1)
  splitter.connect(rightToRight, 1)

  leftToLeft.connect(merger, 0, 0)
  rightToLeft.connect(merger, 0, 0)
  leftToRight.connect(merger, 0, 1)
  rightToRight.connect(merger, 0, 1)

  function _setMix(mix: number, smoothing = 0.02) {
    mix = Math.max(0, Math.min(0.5, mix))

    const direct = 1 - mix
    const now = context.currentTime

    leftToLeft.gain.setTargetAtTime(direct, now, smoothing)
    rightToRight.gain.setTargetAtTime(direct, now, smoothing)

    rightToLeft.gain.setTargetAtTime(mix, now, smoothing)
    leftToRight.gain.setTargetAtTime(mix, now, smoothing)
  }

  _setMix(initialMix)

  return {
    output: merger,
    setMix: _setMix,
  }
}
