/**
 * D2L Dark Mode — Player Mode
 *
 * Decides how an embedded frame (a foreign page inside an inverted
 * Brightspace page) shows itself, from facts that embedded.js collects.
 * Pure: no DOM, no chrome.*, so the answer depends only on the facts passed in.
 *
 * Modes:
 *  - wait:   settings not loaded yet; keep gate.js's optimistic class
 *  - off:    the parent says this frame isn't rendered inverted
 *  - page:   stay inverted like the page around it; counter-invert own media
 *  - player: a video fills the frame, so un-invert the whole frame
 *
 * Facts (undefined = not measured yet; the caller measures the one named in
 * `wait` and resolves again, so costly measurements only run when they matter):
 *  storageReady, inverted, videoDark, hint (the parent's "looks like a player"),
 *  graceOver (page loaded plus a beat for late players)
 *  verdict        'large' | 'small' | 'none': what this frame's videos say
 *  wrapsFrame     a child frame fills this one (a video site's embed page)
 *  readsLikePage  a page's worth of readable text is showing
 */

(function () {
  'use strict';

  function mode(m) {
    return { mode: m };
  }

  function need(fact) {
    return { wait: fact };
  }

  function resolve(f) {
    if (!f.storageReady) return mode('wait');
    if (!f.inverted) return mode('off');
    // Video dark mode wants the video inverted, which page mode already does
    if (f.videoDark) return mode('page');

    if (f.verdict === undefined) return need('verdict');
    if (f.verdict === 'large') return mode('player');
    if (f.verdict === 'small') return mode('page');

    // Only a frame around the player's own frame: let that frame pick its look now, not
    // both flip together when the grace ends (its video would show as a negative between)
    if (f.wrapsFrame === undefined) return need('wrapsFrame');
    if (f.wrapsFrame) return mode('page');

    // No video yet: players build theirs late, so keep the parent's hint until the
    // grace ends, unless the frame already reads like a page (an LTI launcher)
    if (!f.hint || f.graceOver) return mode('page');
    if (f.readsLikePage === undefined) return need('readsLikePage');
    return mode(f.readsLikePage ? 'page' : 'player');
  }

  self.D2LPlayerMode = { resolve: resolve };
})();
